import jp from 'jsonpath';
import * as ts from 'typescript';
import {z} from 'zod';
import type {CodeGenerator, SchemaBuilder} from '../interfaces/code-generator.js';
import type {MethodSchemaType, OpenApiSpecType, ReferenceType} from '../types/openapi.js';
import type {GeneratorOptions} from '../types/generator-options.js';
import {MethodSchema, Reference, SchemaProperties} from '../types/openapi.js';
import {TypeScriptImportBuilderService} from './import-builder.service.js';
import {TypeScriptTypeBuilderService} from './type-builder.service.js';
import {
  type NamingConvention,
  type OperationDetails,
  type OperationNameTransformer,
  transformNamingConvention,
} from '../utils/naming-convention.js';

export class TypeScriptCodeGeneratorService implements CodeGenerator, SchemaBuilder {
  private readonly typeBuilder = new TypeScriptTypeBuilderService();
  private readonly importBuilder = new TypeScriptImportBuilderService();
  private readonly printer = ts.createPrinter({newLine: ts.NewLineKind.LineFeed});
  private readonly namingConvention: NamingConvention | undefined;
  private readonly operationNameTransformer: OperationNameTransformer | undefined;

  // Track circular dependencies for z.lazy() wrapping
  private circularSchemas = new Set<string>();
  private currentSchemaName: string | null = null;

  constructor(options: GeneratorOptions = {}) {
    this.namingConvention = options.namingConvention;
    this.operationNameTransformer = options.operationNameTransformer;
  }

  private readonly ZodAST = z.object({
    type: z.enum(['string', 'number', 'boolean', 'object', 'array', 'unknown', 'record']),
    args: z.array(z.unknown()).optional(),
  });

  generate(spec: OpenApiSpecType): string {
    const file = ts.createSourceFile('generated.ts', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    const nodes = this.buildAST(spec);
    return this.printer.printList(ts.ListFormat.MultiLine, ts.factory.createNodeArray(nodes), file);
  }

  buildSchema(schema: unknown, required = true): ts.CallExpression | ts.Identifier {
    const safeCategorySchema = SchemaProperties.safeParse(schema);
    if (safeCategorySchema.success) {
      const safeCategory = safeCategorySchema.data;

      if (safeCategory['anyOf'] && Array.isArray(safeCategory['anyOf']) && safeCategory['anyOf'].length > 0) {
        return this.handleLogicalOperator('anyOf', safeCategory['anyOf'], required);
      }

      if (safeCategory['oneOf'] && Array.isArray(safeCategory['oneOf']) && safeCategory['oneOf'].length > 0) {
        return this.handleLogicalOperator('oneOf', safeCategory['oneOf'], required);
      }

      if (safeCategory['allOf'] && Array.isArray(safeCategory['allOf']) && safeCategory['allOf'].length > 0) {
        return this.handleLogicalOperator('allOf', safeCategory['allOf'], required);
      }

      if (safeCategory['not']) {
        return this.handleLogicalOperator('not', [safeCategory['not']], required);
      }

      return this.buildProperty(safeCategory, required);
    }

    throw safeCategorySchema.error;
  }

  private buildAST(openapi: OpenApiSpecType): ts.Statement[] {
    const imports = this.importBuilder.buildImports();
    const schemas = this.buildSchemas(openapi);
    const schemaTypeAliases = this.buildSchemaTypeAliases(schemas);
    const serverConfig = this.buildServerConfiguration(openapi);
    const clientClass = this.buildClientClass(openapi, schemas);

    return [
      this.createComment('Imports'),
      ...imports,
      this.createComment('Components schemas'),
      ...Object.values(schemas),
      ...schemaTypeAliases,
      ...serverConfig,
      this.createComment('Client class'),
      clientClass,
    ];
  }

  private buildSchemas(openapi: OpenApiSpecType): Record<string, ts.VariableStatement> {
    const schemasEntries = Object.entries(openapi.components?.schemas ?? {});
    const schemasMap = Object.fromEntries(schemasEntries);

    // Detect circular dependencies before building schemas
    this.circularSchemas = this.detectCircularDependencies(schemasMap);

    const sortedSchemaNames = this.topologicalSort(schemasMap);

    return sortedSchemaNames.reduce<Record<string, ts.VariableStatement>>((schemaRegistered, name) => {
      const schema = openapi.components?.schemas?.[name];
      if (!schema) return schemaRegistered;

      // Set context for current schema being built
      this.currentSchemaName = name;

      const schemaExpression = this.buildSchema(schema);

      // Clear context
      this.currentSchemaName = null;

      const variableStatement = ts.factory.createVariableStatement(
        [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              ts.factory.createIdentifier(this.typeBuilder.sanitizeIdentifier(name)),
              undefined,
              undefined,
              schemaExpression,
            ),
          ],
          ts.NodeFlags.Const,
        ),
      );

      return {
        ...schemaRegistered,
        [name]: variableStatement,
      };
    }, {});
  }

  private buildSchemaTypeAliases(schemas: Record<string, ts.VariableStatement>): ts.TypeAliasDeclaration[] {
    return Object.keys(schemas).map((name) => {
      const sanitizedName = this.typeBuilder.sanitizeIdentifier(name);
      return ts.factory.createTypeAliasDeclaration(
        [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createIdentifier(sanitizedName),
        undefined,
        ts.factory.createTypeReferenceNode(
          ts.factory.createQualifiedName(ts.factory.createIdentifier('z'), ts.factory.createIdentifier('infer')),
          [ts.factory.createTypeQueryNode(ts.factory.createIdentifier(sanitizedName), undefined)],
        ),
      );
    });
  }

  private buildClientClass(
    openapi: OpenApiSpecType,
    schemas: Record<string, ts.VariableStatement>,
  ): ts.ClassDeclaration {
    const clientName = this.generateClientName(openapi.info.title);
    const methods = this.buildClientMethods(openapi, schemas);

    return ts.factory.createClassDeclaration(
      [ts.factory.createToken(ts.SyntaxKind.ExportKeyword), ts.factory.createToken(ts.SyntaxKind.DefaultKeyword)],
      ts.factory.createIdentifier(clientName),
      undefined,
      undefined,
      [
        this.typeBuilder.createProperty('#baseUrl', 'string', true),
        this.buildConstructor(openapi),
        this.buildGetBaseRequestOptionsMethod(),
        this.buildHandleResponseMethod(),
        this.buildHttpRequestMethod(),
        ...methods,
      ],
    );
  }

  private buildConstructor(openapi: OpenApiSpecType): ts.ConstructorDeclaration {
    const hasServers = openapi.servers && openapi.servers.length > 0;

    if (hasServers) {
      // Options-based constructor
      return ts.factory.createConstructorDeclaration(
        undefined,
        [
          ts.factory.createParameterDeclaration(
            undefined,
            undefined,
            ts.factory.createIdentifier('options'),
            undefined,
            ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('ClientOptions'), undefined),
            undefined,
          ),
        ],
        ts.factory.createBlock(
          [
            ts.factory.createVariableStatement(
              undefined,
              ts.factory.createVariableDeclarationList(
                [
                  ts.factory.createVariableDeclaration(
                    ts.factory.createIdentifier('resolvedUrl'),
                    undefined,
                    undefined,
                    ts.factory.createConditionalExpression(
                      ts.factory.createBinaryExpression(
                        ts.factory.createPropertyAccessExpression(
                          ts.factory.createIdentifier('options'),
                          ts.factory.createIdentifier('baseUrl'),
                        ),
                        ts.factory.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
                        ts.factory.createNull(),
                      ),
                      ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                      ts.factory.createPropertyAccessExpression(
                        ts.factory.createIdentifier('options'),
                        ts.factory.createIdentifier('baseUrl'),
                      ),
                      ts.factory.createToken(ts.SyntaxKind.ColonToken),
                      ts.factory.createCallExpression(ts.factory.createIdentifier('resolveServerUrl'), undefined, [
                        ts.factory.createPropertyAccessExpression(
                          ts.factory.createIdentifier('options'),
                          ts.factory.createIdentifier('serverIndex'),
                        ),
                        ts.factory.createPropertyAccessExpression(
                          ts.factory.createIdentifier('options'),
                          ts.factory.createIdentifier('serverVariables'),
                        ),
                      ]),
                    ),
                  ),
                ],
                ts.NodeFlags.Const,
              ),
            ),
            ts.factory.createExpressionStatement(
              ts.factory.createBinaryExpression(
                ts.factory.createPropertyAccessExpression(
                  ts.factory.createThis(),
                  ts.factory.createPrivateIdentifier('#baseUrl'),
                ),
                ts.factory.createToken(ts.SyntaxKind.EqualsToken),
                ts.factory.createIdentifier('resolvedUrl'),
              ),
            ),
          ],
          true,
        ),
      );
    } else {
      // Fallback: simple baseUrl parameter
      return ts.factory.createConstructorDeclaration(
        undefined,
        [
          this.typeBuilder.createParameter('baseUrl', 'string', ts.factory.createStringLiteral('/', true)),
          this.typeBuilder.createParameter('_', 'unknown', undefined, true),
        ],
        ts.factory.createBlock(
          [
            ts.factory.createExpressionStatement(
              ts.factory.createBinaryExpression(
                ts.factory.createPropertyAccessExpression(
                  ts.factory.createThis(),
                  ts.factory.createPrivateIdentifier('#baseUrl'),
                ),
                ts.factory.createToken(ts.SyntaxKind.EqualsToken),
                ts.factory.createIdentifier('baseUrl'),
              ),
            ),
          ],
          true,
        ),
      );
    }
  }

  private buildGetBaseRequestOptionsMethod(): ts.MethodDeclaration {
    return ts.factory.createMethodDeclaration(
      [ts.factory.createToken(ts.SyntaxKind.ProtectedKeyword)],
      undefined,
      ts.factory.createIdentifier('getBaseRequestOptions'),
      undefined,
      undefined,
      [],
      ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Partial'), [
        ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Omit'), [
          ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('RequestInit'), undefined),
          ts.factory.createUnionTypeNode([
            ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral('method', true)),
            ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral('body', true)),
          ]),
        ]),
      ]),
      ts.factory.createBlock(
        [ts.factory.createReturnStatement(ts.factory.createObjectLiteralExpression([], false))],
        true,
      ),
    );
  }

  private buildHandleResponseMethod(): ts.MethodDeclaration {
    return ts.factory.createMethodDeclaration(
      [ts.factory.createToken(ts.SyntaxKind.ProtectedKeyword), ts.factory.createToken(ts.SyntaxKind.AsyncKeyword)],
      undefined,
      ts.factory.createIdentifier('handleResponse'),
      undefined,
      [this.typeBuilder.createGenericType('T')],
      [
        this.typeBuilder.createParameter('response', 'Response'),
        this.typeBuilder.createParameter('method', 'string'),
        this.typeBuilder.createParameter('path', 'string'),
        this.typeBuilder.createParameter(
          'options',
          '{params?: Record<string, string | number | boolean>; data?: unknown; contentType?: string; headers?: Record<string, string>}',
        ),
      ],
      ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Promise'), [
        ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Response'), undefined),
      ]),
      ts.factory.createBlock([ts.factory.createReturnStatement(ts.factory.createIdentifier('response'))], true),
    );
  }

  private buildHttpRequestMethod(): ts.MethodDeclaration {
    return ts.factory.createMethodDeclaration(
      [ts.factory.createToken(ts.SyntaxKind.ProtectedKeyword), ts.factory.createToken(ts.SyntaxKind.AsyncKeyword)],
      undefined,
      ts.factory.createIdentifier('makeRequest'),
      undefined,
      [this.typeBuilder.createGenericType('T')],
      [
        this.typeBuilder.createParameter('method', 'string'),
        this.typeBuilder.createParameter('path', 'string'),
        this.typeBuilder.createParameter(
          'options',
          '{params?: Record<string, string | number | boolean>; data?: unknown; contentType?: string; headers?: Record<string, string>}',
          ts.factory.createObjectLiteralExpression([], false),
          false,
        ),
      ],
      ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Promise'), [
        ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T'), undefined),
      ]),
      ts.factory.createBlock(
        [
          // Build URL with query parameters
          ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
              [
                ts.factory.createVariableDeclaration(
                  ts.factory.createIdentifier('baseUrl'),
                  undefined,
                  undefined,
                  ts.factory.createTemplateExpression(ts.factory.createTemplateHead('', ''), [
                    ts.factory.createTemplateSpan(
                      ts.factory.createPropertyAccessExpression(
                        ts.factory.createThis(),
                        ts.factory.createPrivateIdentifier('#baseUrl'),
                      ),
                      ts.factory.createTemplateMiddle('', ''),
                    ),
                    ts.factory.createTemplateSpan(
                      ts.factory.createIdentifier('path'),
                      ts.factory.createTemplateTail('', ''),
                    ),
                  ]),
                ),
              ],
              ts.NodeFlags.Const,
            ),
          ),
          ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
              [
                ts.factory.createVariableDeclaration(
                  ts.factory.createIdentifier('url'),
                  undefined,
                  undefined,
                  ts.factory.createConditionalExpression(
                    ts.factory.createBinaryExpression(
                      ts.factory.createPropertyAccessExpression(
                        ts.factory.createIdentifier('options'),
                        ts.factory.createIdentifier('params'),
                      ),
                      ts.factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
                      ts.factory.createBinaryExpression(
                        ts.factory.createPropertyAccessExpression(
                          ts.factory.createCallExpression(
                            ts.factory.createPropertyAccessExpression(
                              ts.factory.createIdentifier('Object'),
                              ts.factory.createIdentifier('keys'),
                            ),
                            undefined,
                            [
                              ts.factory.createPropertyAccessExpression(
                                ts.factory.createIdentifier('options'),
                                ts.factory.createIdentifier('params'),
                              ),
                            ],
                          ),
                          ts.factory.createIdentifier('length'),
                        ),
                        ts.factory.createToken(ts.SyntaxKind.GreaterThanToken),
                        ts.factory.createNumericLiteral('0'),
                      ),
                    ),
                    undefined,
                    (() => {
                      const urlObj = ts.factory.createNewExpression(ts.factory.createIdentifier('URL'), undefined, [
                        ts.factory.createIdentifier('baseUrl'),
                      ]);
                      const forEachCall = ts.factory.createCallExpression(
                        ts.factory.createPropertyAccessExpression(
                          ts.factory.createCallExpression(
                            ts.factory.createPropertyAccessExpression(
                              ts.factory.createIdentifier('Object'),
                              ts.factory.createIdentifier('entries'),
                            ),
                            undefined,
                            [
                              ts.factory.createPropertyAccessExpression(
                                ts.factory.createIdentifier('options'),
                                ts.factory.createIdentifier('params'),
                              ),
                            ],
                          ),
                          ts.factory.createIdentifier('forEach'),
                        ),
                        undefined,
                        [
                          ts.factory.createArrowFunction(
                            undefined,
                            undefined,
                            [
                              ts.factory.createParameterDeclaration(
                                undefined,
                                undefined,
                                ts.factory.createArrayBindingPattern([
                                  ts.factory.createBindingElement(
                                    undefined,
                                    undefined,
                                    ts.factory.createIdentifier('key'),
                                    undefined,
                                  ),
                                  ts.factory.createBindingElement(
                                    undefined,
                                    undefined,
                                    ts.factory.createIdentifier('value'),
                                    undefined,
                                  ),
                                ]),
                                undefined,
                                undefined,
                              ),
                            ],
                            undefined,
                            ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                            ts.factory.createBlock(
                              [
                                ts.factory.createExpressionStatement(
                                  ts.factory.createCallExpression(
                                    ts.factory.createPropertyAccessExpression(
                                      ts.factory.createPropertyAccessExpression(
                                        urlObj,
                                        ts.factory.createIdentifier('searchParams'),
                                      ),
                                      ts.factory.createIdentifier('set'),
                                    ),
                                    undefined,
                                    [
                                      ts.factory.createIdentifier('key'),
                                      ts.factory.createCallExpression(
                                        ts.factory.createIdentifier('String'),
                                        undefined,
                                        [ts.factory.createIdentifier('value')],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                              false,
                            ),
                          ),
                        ],
                      );
                      // Use IIFE to execute forEach and return URL string
                      return ts.factory.createCallExpression(
                        ts.factory.createParenthesizedExpression(
                          ts.factory.createArrowFunction(
                            undefined,
                            undefined,
                            [],
                            undefined,
                            ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                            ts.factory.createBlock(
                              [
                                ts.factory.createExpressionStatement(forEachCall),
                                ts.factory.createReturnStatement(
                                  ts.factory.createCallExpression(
                                    ts.factory.createPropertyAccessExpression(
                                      urlObj,
                                      ts.factory.createIdentifier('toString'),
                                    ),
                                    undefined,
                                    [],
                                  ),
                                ),
                              ],
                              false,
                            ),
                          ),
                        ),
                        undefined,
                        [],
                      );
                    })(),
                    undefined,
                    ts.factory.createCallExpression(
                      ts.factory.createPropertyAccessExpression(
                        ts.factory.createNewExpression(ts.factory.createIdentifier('URL'), undefined, [
                          ts.factory.createIdentifier('baseUrl'),
                        ]),
                        ts.factory.createIdentifier('toString'),
                      ),
                      undefined,
                      [],
                    ),
                  ),
                ),
              ],
              ts.NodeFlags.Const,
            ),
          ),
          // Get base request options (headers, signal, credentials, etc.)
          ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
              [
                ts.factory.createVariableDeclaration(
                  ts.factory.createIdentifier('baseOptions'),
                  undefined,
                  undefined,
                  ts.factory.createCallExpression(
                    ts.factory.createPropertyAccessExpression(
                      ts.factory.createThis(),
                      ts.factory.createIdentifier('getBaseRequestOptions'),
                    ),
                    undefined,
                    [],
                  ),
                ),
              ],
              ts.NodeFlags.Const,
            ),
          ),
          // Build Content-Type header
          ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
              [
                ts.factory.createVariableDeclaration(
                  ts.factory.createIdentifier('contentType'),
                  undefined,
                  undefined,
                  ts.factory.createConditionalExpression(
                    ts.factory.createBinaryExpression(
                      ts.factory.createPropertyAccessExpression(
                        ts.factory.createIdentifier('options'),
                        ts.factory.createIdentifier('contentType'),
                      ),
                      ts.factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
                      ts.factory.createStringLiteral('application/x-www-form-urlencoded', true),
                    ),
                    undefined,
                    ts.factory.createStringLiteral('application/x-www-form-urlencoded', true),
                    undefined,
                    ts.factory.createStringLiteral('application/json', true),
                  ),
                ),
              ],
              ts.NodeFlags.Const,
            ),
          ),
          // Merge headers: base headers, Content-Type, and request-specific headers
          ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
              [
                ts.factory.createVariableDeclaration(
                  ts.factory.createIdentifier('baseHeaders'),
                  undefined,
                  undefined,
                  ts.factory.createConditionalExpression(
                    ts.factory.createBinaryExpression(
                      ts.factory.createPropertyAccessExpression(
                        ts.factory.createIdentifier('baseOptions'),
                        ts.factory.createIdentifier('headers'),
                      ),
                      ts.factory.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
                      ts.factory.createIdentifier('undefined'),
                    ),
                    undefined,
                    ts.factory.createPropertyAccessExpression(
                      ts.factory.createIdentifier('baseOptions'),
                      ts.factory.createIdentifier('headers'),
                    ),
                    undefined,
                    ts.factory.createObjectLiteralExpression([], false),
                  ),
                ),
              ],
              ts.NodeFlags.Const,
            ),
          ),
          ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
              [
                ts.factory.createVariableDeclaration(
                  ts.factory.createIdentifier('headers'),
                  undefined,
                  undefined,
                  ts.factory.createCallExpression(
                    ts.factory.createPropertyAccessExpression(
                      ts.factory.createIdentifier('Object'),
                      ts.factory.createIdentifier('assign'),
                    ),
                    undefined,
                    [
                      ts.factory.createObjectLiteralExpression([], false),
                      ts.factory.createIdentifier('baseHeaders'),
                      ts.factory.createObjectLiteralExpression(
                        [
                          ts.factory.createPropertyAssignment(
                            ts.factory.createStringLiteral('Content-Type', true),
                            ts.factory.createIdentifier('contentType'),
                          ),
                        ],
                        false,
                      ),
                      ts.factory.createConditionalExpression(
                        ts.factory.createBinaryExpression(
                          ts.factory.createPropertyAccessExpression(
                            ts.factory.createIdentifier('options'),
                            ts.factory.createIdentifier('headers'),
                          ),
                          ts.factory.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
                          ts.factory.createIdentifier('undefined'),
                        ),
                        undefined,
                        ts.factory.createPropertyAccessExpression(
                          ts.factory.createIdentifier('options'),
                          ts.factory.createIdentifier('headers'),
                        ),
                        undefined,
                        ts.factory.createObjectLiteralExpression([], false),
                      ),
                    ],
                  ),
                ),
              ],
              ts.NodeFlags.Const,
            ),
          ),
          // Build body with form-urlencoded support
          ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
              [
                ts.factory.createVariableDeclaration(
                  ts.factory.createIdentifier('body'),
                  undefined,
                  undefined,
                  ts.factory.createConditionalExpression(
                    ts.factory.createBinaryExpression(
                      ts.factory.createPropertyAccessExpression(
                        ts.factory.createIdentifier('options'),
                        ts.factory.createIdentifier('data'),
                      ),
                      ts.factory.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
                      ts.factory.createIdentifier('undefined'),
                    ),
                    undefined,
                    ts.factory.createConditionalExpression(
                      ts.factory.createBinaryExpression(
                        ts.factory.createPropertyAccessExpression(
                          ts.factory.createIdentifier('options'),
                          ts.factory.createIdentifier('contentType'),
                        ),
                        ts.factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
                        ts.factory.createStringLiteral('application/x-www-form-urlencoded', true),
                      ),
                      undefined,
                      // Form-urlencoded: convert object to URLSearchParams
                      ts.factory.createCallExpression(
                        ts.factory.createParenthesizedExpression(
                          ts.factory.createArrowFunction(
                            undefined,
                            undefined,
                            [],
                            undefined,
                            ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                            ts.factory.createBlock(
                              [
                                ts.factory.createVariableStatement(
                                  undefined,
                                  ts.factory.createVariableDeclarationList(
                                    [
                                      ts.factory.createVariableDeclaration(
                                        ts.factory.createIdentifier('params'),
                                        undefined,
                                        undefined,
                                        ts.factory.createNewExpression(
                                          ts.factory.createIdentifier('URLSearchParams'),
                                          undefined,
                                          [],
                                        ),
                                      ),
                                    ],
                                    ts.NodeFlags.Const,
                                  ),
                                ),
                                ts.factory.createExpressionStatement(
                                  ts.factory.createCallExpression(
                                    ts.factory.createPropertyAccessExpression(
                                      ts.factory.createCallExpression(
                                        ts.factory.createPropertyAccessExpression(
                                          ts.factory.createIdentifier('Object'),
                                          ts.factory.createIdentifier('entries'),
                                        ),
                                        undefined,
                                        [
                                          ts.factory.createPropertyAccessExpression(
                                            ts.factory.createIdentifier('options'),
                                            ts.factory.createIdentifier('data'),
                                          ),
                                        ],
                                      ),
                                      ts.factory.createIdentifier('forEach'),
                                    ),
                                    undefined,
                                    [
                                      ts.factory.createArrowFunction(
                                        undefined,
                                        undefined,
                                        [
                                          ts.factory.createParameterDeclaration(
                                            undefined,
                                            undefined,
                                            ts.factory.createArrayBindingPattern([
                                              ts.factory.createBindingElement(
                                                undefined,
                                                undefined,
                                                ts.factory.createIdentifier('key'),
                                                undefined,
                                              ),
                                              ts.factory.createBindingElement(
                                                undefined,
                                                undefined,
                                                ts.factory.createIdentifier('value'),
                                                undefined,
                                              ),
                                            ]),
                                            undefined,
                                            undefined,
                                          ),
                                        ],
                                        undefined,
                                        ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                                        ts.factory.createBlock(
                                          [
                                            ts.factory.createExpressionStatement(
                                              ts.factory.createCallExpression(
                                                ts.factory.createPropertyAccessExpression(
                                                  ts.factory.createIdentifier('params'),
                                                  ts.factory.createIdentifier('set'),
                                                ),
                                                undefined,
                                                [
                                                  ts.factory.createIdentifier('key'),
                                                  ts.factory.createCallExpression(
                                                    ts.factory.createIdentifier('String'),
                                                    undefined,
                                                    [ts.factory.createIdentifier('value')],
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ],
                                          false,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                ts.factory.createReturnStatement(
                                  ts.factory.createCallExpression(
                                    ts.factory.createPropertyAccessExpression(
                                      ts.factory.createIdentifier('params'),
                                      ts.factory.createIdentifier('toString'),
                                    ),
                                    undefined,
                                    [],
                                  ),
                                ),
                              ],
                              false,
                            ),
                          ),
                        ),
                        undefined,
                        [],
                      ),
                      undefined,
                      // JSON: stringify the data
                      ts.factory.createCallExpression(
                        ts.factory.createPropertyAccessExpression(
                          ts.factory.createIdentifier('JSON'),
                          ts.factory.createIdentifier('stringify'),
                        ),
                        undefined,
                        [
                          ts.factory.createPropertyAccessExpression(
                            ts.factory.createIdentifier('options'),
                            ts.factory.createIdentifier('data'),
                          ),
                        ],
                      ),
                    ),
                    undefined,
                    ts.factory.createNull(),
                  ),
                ),
              ],
              ts.NodeFlags.Const,
            ),
          ),
          // Make fetch request: merge base options with method, headers, and body
          ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
              [
                ts.factory.createVariableDeclaration(
                  ts.factory.createIdentifier('rawResponse'),
                  undefined,
                  undefined,
                  ts.factory.createAwaitExpression(
                    ts.factory.createCallExpression(ts.factory.createIdentifier('fetch'), undefined, [
                      ts.factory.createIdentifier('url'),
                      ts.factory.createCallExpression(
                        ts.factory.createPropertyAccessExpression(
                          ts.factory.createIdentifier('Object'),
                          ts.factory.createIdentifier('assign'),
                        ),
                        undefined,
                        [
                          ts.factory.createObjectLiteralExpression([], false),
                          ts.factory.createIdentifier('baseOptions'),
                          ts.factory.createObjectLiteralExpression(
                            [
                              ts.factory.createShorthandPropertyAssignment(
                                ts.factory.createIdentifier('method'),
                                undefined,
                              ),
                              ts.factory.createPropertyAssignment(
                                ts.factory.createIdentifier('headers'),
                                ts.factory.createIdentifier('headers'),
                              ),
                              ts.factory.createPropertyAssignment(
                                ts.factory.createIdentifier('body'),
                                ts.factory.createIdentifier('body'),
                              ),
                            ],
                            false,
                          ),
                        ],
                      ),
                    ]),
                  ),
                ),
              ],
              ts.NodeFlags.Const,
            ),
          ),
          // Handle response through hook (allows subclasses to intercept and modify response)
          ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
              [
                ts.factory.createVariableDeclaration(
                  ts.factory.createIdentifier('response'),
                  undefined,
                  undefined,
                  ts.factory.createAwaitExpression(
                    ts.factory.createCallExpression(
                      ts.factory.createPropertyAccessExpression(
                        ts.factory.createThis(),
                        ts.factory.createIdentifier('handleResponse'),
                      ),
                      [ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T'), undefined)],
                      [
                        ts.factory.createIdentifier('rawResponse'),
                        ts.factory.createIdentifier('method'),
                        ts.factory.createIdentifier('path'),
                        ts.factory.createIdentifier('options'),
                      ],
                    ),
                  ),
                ),
              ],
              ts.NodeFlags.Const,
            ),
          ),
          // Check response status
          ts.factory.createIfStatement(
            ts.factory.createPrefixUnaryExpression(
              ts.SyntaxKind.ExclamationToken,
              ts.factory.createPropertyAccessExpression(
                ts.factory.createIdentifier('response'),
                ts.factory.createIdentifier('ok'),
              ),
            ),
            ts.factory.createThrowStatement(
              ts.factory.createNewExpression(ts.factory.createIdentifier('Error'), undefined, [
                ts.factory.createTemplateExpression(ts.factory.createTemplateHead('HTTP ', 'HTTP '), [
                  ts.factory.createTemplateSpan(
                    ts.factory.createPropertyAccessExpression(
                      ts.factory.createIdentifier('response'),
                      ts.factory.createIdentifier('status'),
                    ),
                    ts.factory.createTemplateMiddle(': ', ': '),
                  ),
                  ts.factory.createTemplateSpan(
                    ts.factory.createPropertyAccessExpression(
                      ts.factory.createIdentifier('response'),
                      ts.factory.createIdentifier('statusText'),
                    ),
                    ts.factory.createTemplateTail('', ''),
                  ),
                ]),
              ]),
            ),
            undefined,
          ),
          // Return parsed JSON
          ts.factory.createReturnStatement(
            ts.factory.createAwaitExpression(
              ts.factory.createCallExpression(
                ts.factory.createPropertyAccessExpression(
                  ts.factory.createIdentifier('response'),
                  ts.factory.createIdentifier('json'),
                ),
                undefined,
                [],
              ),
            ),
          ),
        ],
        true,
      ),
    );
  }

  private buildClientMethods(
    openapi: OpenApiSpecType,
    schemas: Record<string, ts.VariableStatement>,
  ): ts.MethodDeclaration[] {
    // Track operation IDs to detect duplicates
    const operationIdMap = new Map<string, {method: string; path: string}[]>();

    // First pass: collect all operation IDs and their methods/paths
    Object.entries(openapi.paths).forEach(([path, pathItem]) => {
      Object.entries(pathItem)
        .filter(([method]) => ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method))
        .forEach(([method, methodSchema]) => {
          const safeMethodSchema = MethodSchema.parse(methodSchema);
          if (safeMethodSchema.operationId) {
            const operationId = safeMethodSchema.operationId;
            const existing = operationIdMap.get(operationId);
            if (existing) {
              existing.push({method, path});
            } else {
              operationIdMap.set(operationId, [{method, path}]);
            }
          }
        });
    });

    // Second pass: build methods, appending method name for HEAD/OPTIONS or when duplicates exist
    return Object.entries(openapi.paths).reduce<ts.MethodDeclaration[]>((endpoints, [path, pathItem]) => {
      const methods = Object.entries(pathItem)
        .filter(([method]) => ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method))
        .map(([method, methodSchema]) => {
          const safeMethodSchema = MethodSchema.parse(methodSchema);

          if (!safeMethodSchema.operationId) {
            return null;
          }

          const operationId = safeMethodSchema.operationId;
          const methodLower = method.toLowerCase();

          // Check if this operationId is used by multiple methods
          const operations = operationIdMap.get(operationId);
          const hasDuplicates = operations !== undefined && operations.length > 1;

          // For HEAD/OPTIONS or when duplicates exist, we need to ensure uniqueness
          // We'll handle this in transformOperationName by appending the method
          // But we need to mark it here so transformOperationName knows to append
          if (hasDuplicates || methodLower === 'head' || methodLower === 'options') {
            // Temporarily modify the operationId to include method for uniqueness
            // This will be handled in transformOperationName
            const modifiedSchema = {
              ...safeMethodSchema,
              operationId: `${operationId}_${methodLower}`,
            };
            return this.buildEndpointMethod(method, path, modifiedSchema, schemas);
          }

          return this.buildEndpointMethod(method, path, safeMethodSchema, schemas);
        })
        .filter((method): method is ts.MethodDeclaration => method !== null);

      return [...endpoints, ...methods];
    }, []);
  }

  /**
   * Transforms operation ID according to the configured naming convention or transformer
   * Ensures the result is a valid TypeScript identifier
   * For HEAD and OPTIONS methods, appends the method name to ensure uniqueness when same operationId is used
   */
  private transformOperationName(operationId: string, method: string, path: string, schema: MethodSchemaType): string {
    let transformed: string;

    // Custom transformer takes precedence
    if (this.operationNameTransformer) {
      const details: OperationDetails = {
        operationId,
        method,
        path,
        ...(schema.tags !== undefined && {tags: schema.tags}),
        ...(schema.summary !== undefined && {summary: schema.summary}),
        ...(schema.description !== undefined && {description: schema.description}),
      };
      transformed = this.operationNameTransformer(details);
    } else if (this.namingConvention) {
      // Apply naming convention if specified
      transformed = transformNamingConvention(operationId, this.namingConvention);
    } else {
      // Return original operationId if no transformation is configured
      transformed = operationId;
    }

    // For HEAD and OPTIONS methods, append method name to ensure uniqueness
    // This prevents duplicate method names when GET and HEAD share the same operationId
    const methodLower = method.toLowerCase();
    if (methodLower === 'head' || methodLower === 'options') {
      // Only append if not already present to avoid double-appending
      if (!transformed.toLowerCase().endsWith(`_${methodLower}`)) {
        transformed = `${transformed}_${methodLower}`;
      }
    }

    // Sanitize to ensure valid TypeScript identifier (handles edge cases from custom transformers)
    return this.typeBuilder.sanitizeIdentifier(transformed);
  }

  private buildEndpointMethod(
    method: string,
    path: string,
    schema: MethodSchemaType,
    schemas: Record<string, ts.VariableStatement>,
  ): ts.MethodDeclaration {
    const {parameters, pathParams, queryParams, hasRequestBody, contentType} = this.buildMethodParameters(
      schema,
      schemas,
    );
    const responseType = this.getResponseType(schema, schemas);
    const responseSchema = this.getResponseSchema(schema, schemas);

    const statements: ts.Statement[] = [];

    // Build path with parameter substitution
    const pathExpression = this.buildPathExpression(path, pathParams);

    // Build query parameters object
    const queryParamsExpression: ts.Expression | undefined =
      queryParams.length > 0
        ? ts.factory.createObjectLiteralExpression(
            queryParams.map((param) => {
              const paramName = this.typeBuilder.sanitizeIdentifier(param.name);
              return ts.factory.createPropertyAssignment(
                ts.factory.createStringLiteral(param.name, true),
                ts.factory.createIdentifier(paramName),
              );
            }),
            false,
          )
        : undefined;

    // Build request body
    const requestBodyExpression: ts.Expression | undefined = hasRequestBody
      ? ts.factory.createIdentifier('body')
      : undefined;

    // Build options object for makeRequest
    const optionsProps: ts.ObjectLiteralElementLike[] = [];
    if (queryParamsExpression) {
      optionsProps.push(
        ts.factory.createPropertyAssignment(ts.factory.createIdentifier('params'), queryParamsExpression),
      );
    }
    if (requestBodyExpression) {
      optionsProps.push(
        ts.factory.createPropertyAssignment(ts.factory.createIdentifier('data'), requestBodyExpression),
      );
    }
    // Add content type if it's form-urlencoded
    if (hasRequestBody && contentType === 'application/x-www-form-urlencoded') {
      optionsProps.push(
        ts.factory.createPropertyAssignment(
          ts.factory.createIdentifier('contentType'),
          ts.factory.createStringLiteral('application/x-www-form-urlencoded', true),
        ),
      );
    }

    const optionsExpression = ts.factory.createObjectLiteralExpression(optionsProps, false);

    // Call makeRequest
    const makeRequestCall = ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(ts.factory.createThis(), ts.factory.createIdentifier('makeRequest')),
      undefined,
      [ts.factory.createStringLiteral(method.toUpperCase(), true), pathExpression, optionsExpression],
    );

    // Add Zod validation if we have a response schema
    if (responseSchema) {
      const validateCall = ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(responseSchema, ts.factory.createIdentifier('parse')),
        undefined,
        [ts.factory.createAwaitExpression(makeRequestCall)],
      );

      statements.push(ts.factory.createReturnStatement(validateCall));
    } else {
      statements.push(ts.factory.createReturnStatement(ts.factory.createAwaitExpression(makeRequestCall)));
    }

    const transformedOperationId = this.transformOperationName(String(schema.operationId), method, path, schema);

    const methodDeclaration = ts.factory.createMethodDeclaration(
      [ts.factory.createToken(ts.SyntaxKind.AsyncKeyword)],
      undefined,
      ts.factory.createIdentifier(transformedOperationId),
      undefined,
      undefined,
      parameters,
      responseType,
      ts.factory.createBlock(statements, true),
    );

    // Add JSDoc comment if summary or description exists
    const jsdocComment = this.buildJSDocComment(schema.summary, schema.description, schema, responseType);

    if (jsdocComment) {
      // addSyntheticLeadingComment expects the comment content without delimiters
      // and will wrap it in /** */ for JSDoc-style comments
      ts.addSyntheticLeadingComment(
        methodDeclaration,
        ts.SyntaxKind.MultiLineCommentTrivia,
        `*\n${jsdocComment}\n `,
        true,
      );
    }

    return methodDeclaration;
  }

  private buildPathExpression(path: string, pathParams: {name: string; type: string}[]): ts.Expression {
    // Replace {param} with ${param} for template literal
    const pathParamNames = new Set(pathParams.map((p) => p.name));
    const pathParamRegex = /\{([^}]+)\}/g;
    const matches: {index: number; length: number; name: string}[] = [];

    // Find all path parameters
    for (const match of path.matchAll(pathParamRegex)) {
      const paramName = match[1];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (paramName && pathParamNames.has(paramName) && match.index !== undefined) {
        matches.push({
          index: match.index,
          length: match[0].length,
          name: paramName,
        });
      }
    }

    if (matches.length === 0) {
      // No path parameters, return as string literal
      return ts.factory.createStringLiteral(path, true);
    }

    // Build template expression
    const templateSpans: ts.TemplateSpan[] = [];
    let lastIndex = 0;

    for (const [index, m] of matches.entries()) {
      const before = path.substring(lastIndex, m.index);
      const sanitizedName = this.typeBuilder.sanitizeIdentifier(m.name);
      const isLast = index === matches.length - 1;
      const after = isLast ? path.substring(m.index + m.length) : '';

      if (isLast) {
        templateSpans.push(
          ts.factory.createTemplateSpan(
            ts.factory.createIdentifier(sanitizedName),
            ts.factory.createTemplateTail(after, after),
          ),
        );
      } else {
        templateSpans.push(
          ts.factory.createTemplateSpan(
            ts.factory.createIdentifier(sanitizedName),
            ts.factory.createTemplateMiddle(before, before),
          ),
        );
      }

      lastIndex = m.index + m.length;
    }

    const firstMatch = matches[0];
    if (!firstMatch) {
      return ts.factory.createStringLiteral(path, true);
    }
    const head = path.substring(0, firstMatch.index);
    return ts.factory.createTemplateExpression(ts.factory.createTemplateHead(head, head), templateSpans);
  }

  private buildMethodParameters(
    schema: MethodSchemaType,
    schemas: Record<string, ts.VariableStatement>,
  ): {
    parameters: ts.ParameterDeclaration[];
    pathParams: {name: string; type: string}[];
    queryParams: {name: string; type: string; required: boolean}[];
    hasRequestBody: boolean;
    contentType: string;
  } {
    const parameters: ts.ParameterDeclaration[] = [];
    const pathParams: {name: string; type: string}[] = [];
    const queryParams: {name: string; type: string; required: boolean}[] = [];

    // Extract path and query parameters
    if (schema.parameters) {
      for (const param of schema.parameters) {
        const paramName = this.typeBuilder.sanitizeIdentifier(param.name);
        const paramType = this.getParameterType(param.schema);

        if (param.in === 'path') {
          pathParams.push({name: param.name, type: paramType});
          parameters.push(this.typeBuilder.createParameter(paramName, paramType, undefined, false));
        } else if (param.in === 'query') {
          // Improve type inference for query parameters
          const queryParamType =
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            typeof param.schema === 'object' && param.schema !== null
              ? (() => {
                  const paramSchema = param.schema as {type?: string; items?: unknown; enum?: unknown[]};
                  // eslint-disable-next-line @typescript-eslint/dot-notation
                  if (paramSchema['type'] === 'array' && paramSchema['items']) {
                    // eslint-disable-next-line @typescript-eslint/dot-notation
                    const itemSchema = paramSchema['items'] as {type?: string};
                    // eslint-disable-next-line @typescript-eslint/dot-notation
                    if (itemSchema['type'] === 'string') {
                      return 'string[]' as const;
                    }
                    // eslint-disable-next-line @typescript-eslint/dot-notation
                    if (itemSchema['type'] === 'number' || itemSchema['type'] === 'integer') {
                      return 'number[]' as const;
                    }
                  }
                  return paramType;
                })()
              : paramType;
          queryParams.push({name: param.name, type: queryParamType, required: param.required ?? false});
          parameters.push(this.typeBuilder.createParameter(paramName, queryParamType, undefined, !param.required));
        }
      }
    }

    // Add request body parameter if present
    // Check for both application/json and application/x-www-form-urlencoded
    const jsonContent = schema.requestBody?.content?.['application/json'];
    const formContent = schema.requestBody?.content?.['application/x-www-form-urlencoded'];
    const hasRequestBody = !!(jsonContent ?? formContent);

    if (hasRequestBody) {
      const requestBodyContent = jsonContent ?? formContent;
      const requestBodySchema = requestBodyContent?.schema;
      const bodyType =
        typeof requestBodySchema === 'object' && requestBodySchema !== null
          ? (() => {
              const schemaObj = requestBodySchema as Record<string, unknown>;
              const ref = schemaObj['$ref'];

              if (ref && typeof ref === 'string' && ref.startsWith('#/components/schemas/')) {
                const refName = ref.split('/').pop() ?? 'unknown';
                return this.typeBuilder.sanitizeIdentifier(refName);
              }
              // Fallback to getSchemaTypeName for non-ref schemas
              return this.getSchemaTypeName(requestBodySchema, schemas);
            })()
          : 'unknown';

      parameters.push(this.typeBuilder.createParameter('body', bodyType, undefined, !schema.requestBody?.required));
    }

    // Determine content type for request body
    const contentType =
      hasRequestBody && schema.requestBody?.content?.['application/x-www-form-urlencoded']
        ? 'application/x-www-form-urlencoded'
        : 'application/json';

    return {parameters, pathParams, queryParams, hasRequestBody, contentType};
  }

  private getParameterType(schema: unknown): string {
    if (!schema || typeof schema !== 'object') {
      return 'string';
    }

    const schemaObj = schema as {
      type?: string;
      format?: string;
      $ref?: string;
      enum?: unknown[];
      items?: unknown;
    };

    if (schemaObj.$ref) {
      const refName = schemaObj.$ref.split('/').pop() ?? 'unknown';
      return this.typeBuilder.sanitizeIdentifier(refName);
    }

    if (schemaObj.type === 'array' && schemaObj.items) {
      const itemType = this.getParameterType(schemaObj.items);
      return `${itemType}[]`;
    }

    switch (schemaObj.type) {
      case 'integer':
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        return 'unknown[]';
      case 'object':
        return 'Record<string, unknown>';
      case 'string':
        // If it has enum values, we could generate a union type, but for simplicity, keep as string
        // The Zod schema will handle the validation
        return 'string';
      default:
        return 'string';
    }
  }

  private getSchemaTypeName(schema: unknown, _schemas: Record<string, ts.VariableStatement>): string {
    if (typeof schema !== 'object' || schema === null) {
      return 'unknown';
    }

    const schemaObj = schema as {$ref?: string; type?: string; items?: unknown};

    // Check for $ref using both dot notation and bracket notation
    // eslint-disable-next-line @typescript-eslint/dot-notation
    const ref = schemaObj['$ref'];
    if (ref && typeof ref === 'string') {
      const refName = ref.split('/').pop() ?? 'unknown';
      return this.typeBuilder.sanitizeIdentifier(refName);
    }

    if (schemaObj.type === 'array' && schemaObj.items) {
      const itemType = this.getSchemaTypeName(schemaObj.items, _schemas);
      return `${itemType}[]`;
    }

    switch (schemaObj.type) {
      case 'integer':
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'string':
        return 'string';
      case 'object':
        return 'Record<string, unknown>';
      default:
        return 'unknown';
    }
  }

  private getResponseSchema(
    schema: MethodSchemaType,
    _schemas: Record<string, ts.VariableStatement>,
  ): ts.Identifier | undefined {
    // Try to find a 200 response first, then 201, then default
    const response200 = schema.responses?.['200'];
    const response201 = schema.responses?.['201'];
    const responseDefault = schema.responses?.['default'];

    const response = response200 ?? response201 ?? responseDefault;
    if (!response?.content?.['application/json']?.schema) {
      return undefined;
    }

    const responseSchema = response.content['application/json'].schema;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (responseSchema !== null && typeof responseSchema === 'object' && '$ref' in responseSchema) {
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const ref = (responseSchema as {$ref: string})['$ref'];
      if (typeof ref === 'string') {
        const refName = ref.split('/').pop() ?? 'unknown';
        return ts.factory.createIdentifier(this.typeBuilder.sanitizeIdentifier(refName));
      }
    }

    // For inline schemas, we'd need to generate a schema, but for now return undefined
    // This could be enhanced to generate inline schemas
    return undefined;
  }

  private getResponseType(
    schema: MethodSchemaType,
    schemas: Record<string, ts.VariableStatement>,
  ): ts.TypeNode | undefined {
    // Try to find a 200 response first, then 201, then default
    const response200 = schema.responses?.['200'];
    const response201 = schema.responses?.['201'];
    const responseDefault = schema.responses?.['default'];

    const response = response200 ?? response201 ?? responseDefault;
    if (!response?.content?.['application/json']?.schema) {
      return ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Promise'), [
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
      ]);
    }

    const responseSchema = response.content['application/json'].schema;
    const typeName = this.getSchemaTypeName(responseSchema, schemas);

    // Handle array types like "Pet[]"
    if (typeName.endsWith('[]')) {
      const itemTypeName = typeName.slice(0, -2);
      const sanitizedItemTypeName = this.typeBuilder.sanitizeIdentifier(itemTypeName);

      // Check if the item type is a custom schema (we have a type alias for it)
      if (schemas[sanitizedItemTypeName]) {
        // Use the type alias directly (it already uses z.infer)
        return ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Promise'), [
          ts.factory.createArrayTypeNode(
            ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(sanitizedItemTypeName), undefined),
          ),
        ]);
      }
      // If it's a primitive array, use the type name as-is
      return ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Promise'), [
        ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(typeName), undefined),
      ]);
    }

    const sanitizedTypeName = this.typeBuilder.sanitizeIdentifier(typeName);

    // Check if it's a custom schema type (we have a type alias for it)
    if (schemas[sanitizedTypeName]) {
      // Use the type name directly (we have a type alias that already uses z.infer)
      return ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Promise'), [
        ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(sanitizedTypeName), undefined),
      ]);
    }

    // For primitive types and Record types, use the type name directly
    return ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Promise'), [
      ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(typeName), undefined),
    ]);
  }

  private buildServerConfiguration(openapi: OpenApiSpecType): ts.Statement[] {
    const servers = openapi.servers;

    if (!servers || servers.length === 0) {
      return [];
    }

    const statements: ts.Statement[] = [];

    // Build server configuration array
    const serverConfigElements = servers.map((server) => {
      const properties: ts.PropertyAssignment[] = [
        ts.factory.createPropertyAssignment('url', ts.factory.createStringLiteral(server.url, true)),
      ];

      if (server.description) {
        properties.push(
          ts.factory.createPropertyAssignment('description', ts.factory.createStringLiteral(server.description, true)),
        );
      }

      if (server.variables && Object.keys(server.variables).length > 0) {
        const variableProperties = Object.entries(server.variables).map(([varName, varDef]) => {
          const varProps: ts.PropertyAssignment[] = [
            ts.factory.createPropertyAssignment('default', ts.factory.createStringLiteral(varDef.default, true)),
          ];

          if (varDef.enum && varDef.enum.length > 0) {
            varProps.push(
              ts.factory.createPropertyAssignment(
                'enum',
                ts.factory.createArrayLiteralExpression(
                  varDef.enum.map((val) => ts.factory.createStringLiteral(val, true)),
                  false,
                ),
              ),
            );
          }

          if (varDef.description) {
            varProps.push(
              ts.factory.createPropertyAssignment(
                'description',
                ts.factory.createStringLiteral(varDef.description, true),
              ),
            );
          }

          return ts.factory.createPropertyAssignment(varName, ts.factory.createObjectLiteralExpression(varProps, true));
        });

        properties.push(
          ts.factory.createPropertyAssignment(
            'variables',
            ts.factory.createObjectLiteralExpression(variableProperties, true),
          ),
        );
      }

      return ts.factory.createObjectLiteralExpression(properties, true);
    });

    // Export server configuration
    statements.push(
      ts.factory.createVariableStatement(
        [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              ts.factory.createIdentifier('serverConfigurations'),
              undefined,
              undefined,
              ts.factory.createArrayLiteralExpression(serverConfigElements, false),
            ),
          ],
          ts.NodeFlags.Const,
        ),
      ),
    );

    // Export default base URL (first server with default variables)
    const firstServer = servers[0];
    const defaultBaseUrl = firstServer ? this.resolveServerUrl(firstServer, {}) : '/';
    statements.push(
      ts.factory.createVariableStatement(
        [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              ts.factory.createIdentifier('defaultBaseUrl'),
              undefined,
              undefined,
              ts.factory.createStringLiteral(defaultBaseUrl, true),
            ),
          ],
          ts.NodeFlags.Const,
        ),
      ),
    );

    // Build ClientOptions type
    const optionProperties: ts.PropertySignature[] = [
      ts.factory.createPropertySignature(
        undefined,
        ts.factory.createIdentifier('baseUrl'),
        ts.factory.createToken(ts.SyntaxKind.QuestionToken),
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
      ),
      ts.factory.createPropertySignature(
        undefined,
        ts.factory.createIdentifier('serverIndex'),
        ts.factory.createToken(ts.SyntaxKind.QuestionToken),
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
      ),
      ts.factory.createPropertySignature(
        undefined,
        ts.factory.createIdentifier('serverVariables'),
        ts.factory.createToken(ts.SyntaxKind.QuestionToken),
        ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Record'), [
          ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
          ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        ]),
      ),
    ];

    statements.push(
      ts.factory.createTypeAliasDeclaration(
        [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createIdentifier('ClientOptions'),
        undefined,
        ts.factory.createTypeLiteralNode(optionProperties),
      ),
    );

    // Build resolveServerUrl helper function
    statements.push(this.buildResolveServerUrlFunction(servers));

    return statements;
  }

  private resolveServerUrl(
    server: {
      url: string;
      variables?:
        | Record<string, {default: string; enum?: string[] | undefined; description?: string | undefined}>
        | undefined;
    },
    variables: Record<string, string>,
  ): string {
    let url = server.url;

    if (server.variables) {
      for (const [varName, varDef] of Object.entries(server.variables)) {
        const value = variables[varName] ?? varDef.default;
        url = url.replace(`{${varName}}`, value);
      }
    }

    return url;
  }

  private buildResolveServerUrlFunction(
    servers: {
      url: string;
      description?: string | undefined;
      variables?:
        | Record<string, {default: string; enum?: string[] | undefined; description?: string | undefined}>
        | undefined;
    }[],
  ): ts.FunctionDeclaration {
    // Build server configs array inline
    const serverConfigElements = servers.map((server) => {
      const properties: ts.PropertyAssignment[] = [
        ts.factory.createPropertyAssignment('url', ts.factory.createStringLiteral(server.url, true)),
      ];

      if (server.variables && Object.keys(server.variables).length > 0) {
        const variableProperties = Object.entries(server.variables).map(([varName, varDef]) => {
          const varProps: ts.PropertyAssignment[] = [
            ts.factory.createPropertyAssignment('default', ts.factory.createStringLiteral(varDef.default, true)),
          ];

          if (varDef.enum && varDef.enum.length > 0) {
            varProps.push(
              ts.factory.createPropertyAssignment(
                'enum',
                ts.factory.createArrayLiteralExpression(
                  varDef.enum.map((val) => ts.factory.createStringLiteral(val, true)),
                  false,
                ),
              ),
            );
          }

          return ts.factory.createPropertyAssignment(varName, ts.factory.createObjectLiteralExpression(varProps, true));
        });

        properties.push(
          ts.factory.createPropertyAssignment(
            'variables',
            ts.factory.createObjectLiteralExpression(variableProperties, true),
          ),
        );
      }

      return ts.factory.createObjectLiteralExpression(properties, true);
    });

    // Build function body - simplified version
    const idx = ts.factory.createIdentifier('idx');
    const configs = ts.factory.createIdentifier('configs');
    const config = ts.factory.createIdentifier('config');
    const url = ts.factory.createIdentifier('url');
    const key = ts.factory.createIdentifier('key');
    const value = ts.factory.createIdentifier('value');

    const bodyStatements: ts.Statement[] = [
      // const configs = [...]
      ts.factory.createVariableStatement(
        undefined,
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              configs,
              undefined,
              undefined,
              ts.factory.createArrayLiteralExpression(serverConfigElements, false),
            ),
          ],
          ts.NodeFlags.Const,
        ),
      ),
      // const idx = serverIndex ?? 0
      ts.factory.createVariableStatement(
        undefined,
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              idx,
              undefined,
              undefined,
              ts.factory.createBinaryExpression(
                ts.factory.createIdentifier('serverIndex'),
                ts.factory.createToken(ts.SyntaxKind.QuestionQuestionToken),
                ts.factory.createNumericLiteral('0'),
              ),
            ),
          ],
          ts.NodeFlags.Const,
        ),
      ),
      // if (idx < configs.length) { ... }
      ts.factory.createIfStatement(
        ts.factory.createBinaryExpression(
          idx,
          ts.factory.createToken(ts.SyntaxKind.LessThanToken),
          ts.factory.createPropertyAccessExpression(configs, ts.factory.createIdentifier('length')),
        ),
        ts.factory.createBlock(
          [
            // const config = configs[idx]
            ts.factory.createVariableStatement(
              undefined,
              ts.factory.createVariableDeclarationList(
                [
                  ts.factory.createVariableDeclaration(
                    config,
                    undefined,
                    undefined,
                    ts.factory.createElementAccessExpression(configs, idx),
                  ),
                ],
                ts.NodeFlags.Const,
              ),
            ),
            // let url = config.url
            ts.factory.createVariableStatement(
              undefined,
              ts.factory.createVariableDeclarationList(
                [
                  ts.factory.createVariableDeclaration(
                    url,
                    undefined,
                    undefined,
                    ts.factory.createPropertyAccessExpression(config, ts.factory.createIdentifier('url')),
                  ),
                ],
                ts.NodeFlags.Let,
              ),
            ),
            // if (config.variables && serverVariables) { ... }
            ts.factory.createIfStatement(
              ts.factory.createLogicalAnd(
                ts.factory.createPropertyAccessExpression(config, ts.factory.createIdentifier('variables')),
                ts.factory.createIdentifier('serverVariables'),
              ),
              ts.factory.createBlock(
                [
                  // for (const [key, value] of Object.entries(serverVariables)) { url = url.replace(...) }
                  ts.factory.createForOfStatement(
                    undefined,
                    ts.factory.createVariableDeclarationList(
                      [
                        ts.factory.createVariableDeclaration(
                          ts.factory.createArrayBindingPattern([
                            ts.factory.createBindingElement(undefined, undefined, key),
                            ts.factory.createBindingElement(undefined, undefined, value),
                          ]),
                          undefined,
                          undefined,
                        ),
                      ],
                      ts.NodeFlags.Const,
                    ),
                    ts.factory.createCallExpression(
                      ts.factory.createPropertyAccessExpression(
                        ts.factory.createIdentifier('Object'),
                        ts.factory.createIdentifier('entries'),
                      ),
                      undefined,
                      [ts.factory.createIdentifier('serverVariables')],
                    ),
                    ts.factory.createBlock(
                      [
                        ts.factory.createExpressionStatement(
                          ts.factory.createBinaryExpression(
                            url,
                            ts.factory.createToken(ts.SyntaxKind.EqualsToken),
                            ts.factory.createCallExpression(
                              ts.factory.createPropertyAccessExpression(url, ts.factory.createIdentifier('replace')),
                              undefined,
                              [
                                ts.factory.createNewExpression(ts.factory.createIdentifier('RegExp'), undefined, [
                                  ts.factory.createBinaryExpression(
                                    ts.factory.createBinaryExpression(
                                      ts.factory.createStringLiteral('\\{'),
                                      ts.factory.createToken(ts.SyntaxKind.PlusToken),
                                      key,
                                    ),
                                    ts.factory.createToken(ts.SyntaxKind.PlusToken),
                                    ts.factory.createStringLiteral('\\}'),
                                  ),
                                  ts.factory.createStringLiteral('g'),
                                ]),
                                value,
                              ],
                            ),
                          ),
                        ),
                      ],
                      true,
                    ),
                  ),
                ],
                true,
              ),
            ),
            // return url
            ts.factory.createReturnStatement(url),
          ],
          true,
        ),
      ),
      // return default (first server with defaults)
      ts.factory.createReturnStatement(
        ts.factory.createStringLiteral(servers[0] ? this.resolveServerUrl(servers[0], {}) : '/', true),
      ),
    ];

    return ts.factory.createFunctionDeclaration(
      undefined,
      undefined,
      ts.factory.createIdentifier('resolveServerUrl'),
      undefined,
      [
        ts.factory.createParameterDeclaration(
          undefined,
          undefined,
          ts.factory.createIdentifier('serverIndex'),
          ts.factory.createToken(ts.SyntaxKind.QuestionToken),
          ts.factory.createUnionTypeNode([
            ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
            ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
          ]),
          undefined,
        ),
        ts.factory.createParameterDeclaration(
          undefined,
          undefined,
          ts.factory.createIdentifier('serverVariables'),
          ts.factory.createToken(ts.SyntaxKind.QuestionToken),
          ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Record'), [
            ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
            ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
          ]),
          ts.factory.createObjectLiteralExpression([], false),
        ),
      ],
      ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
      ts.factory.createBlock(bodyStatements, true),
    );
  }

  private generateClientName(title: string): string {
    return title
      .split(/[^a-zA-Z0-9]/g)
      .map((word) => this.typeBuilder.toPascalCase(word))
      .join('');
  }

  private createComment(text: string): ts.Statement {
    const commentNode = ts.factory.createIdentifier('\n');
    ts.addSyntheticTrailingComment(commentNode, ts.SyntaxKind.SingleLineCommentTrivia, ` ${text}`, true);
    return ts.factory.createExpressionStatement(commentNode);
  }

  /**
   * Builds a JSDoc comment string from operation metadata
   */
  private buildJSDocComment(
    summary: string | undefined,
    description: string | undefined,
    schema: MethodSchemaType,
    responseType: ts.TypeNode | undefined,
  ): string {
    const lines: string[] = [];

    // Add summary or description as the main comment
    if (summary) {
      lines.push(` * ${summary}`);
    } else if (description) {
      // Use first line of description as summary if no summary exists
      const firstLine = description.split('\n')[0]?.trim();
      if (firstLine) {
        lines.push(` * ${firstLine}`);
      }
    }

    // Add full description if it exists and is different from summary
    if (description && description !== summary) {
      const descLines = description.split('\n');
      if (descLines.length > 1 || descLines[0] !== summary) {
        if (lines.length > 0) {
          lines.push(' *');
        }
        descLines.forEach((line) => {
          lines.push(` * ${line.trim() || ''}`);
        });
      }
    }

    // Add @param tags for each parameter
    if (schema.parameters && schema.parameters.length > 0) {
      if (lines.length > 0) {
        lines.push(' *');
      }
      for (const param of schema.parameters) {
        const paramName = this.typeBuilder.sanitizeIdentifier(param.name);
        const paramDesc = param.description ? ` ${param.description}` : '';
        lines.push(` * @param ${paramName}${paramDesc}`);
      }
    }

    // Add @param tag for request body if present
    if (schema.requestBody) {
      const bodyDesc = schema.requestBody.description ? ` ${schema.requestBody.description}` : '';
      lines.push(` * @param body${bodyDesc}`);
    }

    // Add @returns tag if we have a response type
    if (responseType) {
      // Extract the inner type from Promise<T> for JSDoc
      let returnTypeText: string;
      if (
        ts.isTypeReferenceNode(responseType) &&
        ts.isIdentifier(responseType.typeName) &&
        responseType.typeName.text === 'Promise' &&
        responseType.typeArguments &&
        responseType.typeArguments.length > 0 &&
        responseType.typeArguments[0]
      ) {
        // Extract the inner type from Promise<T>
        const innerType = responseType.typeArguments[0];
        returnTypeText = this.printer.printNode(
          ts.EmitHint.Unspecified,
          innerType,
          ts.createSourceFile('', '', ts.ScriptTarget.Latest),
        );
      } else {
        returnTypeText = this.printer.printNode(
          ts.EmitHint.Unspecified,
          responseType,
          ts.createSourceFile('', '', ts.ScriptTarget.Latest),
        );
      }
      lines.push(` * @returns {${returnTypeText}}`);
    }

    // Build the complete JSDoc comment (without delimiters, as addSyntheticLeadingComment adds them)
    if (lines.length === 0) {
      return '';
    }

    return lines.join('\n');
  }

  private buildZodAST(input: (string | z.infer<typeof this.ZodAST>)[]): ts.CallExpression {
    const [initial, ...rest] = input;

    const safeInitial = this.ZodAST.safeParse(initial);

    const initialExpression = !safeInitial.success
      ? ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(
            ts.factory.createIdentifier('z'),
            ts.factory.createIdentifier(this.ZodAST.shape.type.parse(initial)),
          ),
          undefined,
          [],
        )
      : ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(
            ts.factory.createIdentifier('z'),
            ts.factory.createIdentifier(safeInitial.data.type),
          ),
          undefined,
          (safeInitial.data.args ?? []) as ts.Expression[],
        );

    return rest.reduce((expression, exp: unknown) => {
      const safeExp = this.ZodAST.safeParse(exp);
      return !safeExp.success
        ? ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
              expression,
              ts.factory.createIdentifier(typeof exp === 'string' ? exp : String(exp)),
            ),
            undefined,
            [],
          )
        : ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(expression, ts.factory.createIdentifier(safeExp.data.type)),
            undefined,
            (safeExp.data.args ?? []) as ts.Expression[],
          );
    }, initialExpression);
  }

  private buildProperty(property: unknown, required = false): ts.CallExpression | ts.Identifier {
    const safeProperty = SchemaProperties.safeParse(property);

    if (!safeProperty.success) {
      return this.buildZodAST(['unknown']);
    }

    const prop = safeProperty.data;

    if (this.isReference(prop)) {
      const refSchema = this.buildFromReference(prop);
      return required
        ? refSchema
        : ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(refSchema, ts.factory.createIdentifier('optional')),
            undefined,
            [],
          );
    }

    if (prop['anyOf'] && Array.isArray(prop['anyOf']) && prop['anyOf'].length > 0) {
      return this.handleLogicalOperator('anyOf', prop['anyOf'], required);
    }

    if (prop['oneOf'] && Array.isArray(prop['oneOf']) && prop['oneOf'].length > 0) {
      return this.handleLogicalOperator('oneOf', prop['oneOf'], required);
    }

    if (prop['allOf'] && Array.isArray(prop['allOf']) && prop['allOf'].length > 0) {
      return this.handleLogicalOperator('allOf', prop['allOf'], required);
    }

    if (prop['not']) {
      return this.handleLogicalOperator('not', [prop['not']], required);
    }

    // Handle enum
    if (prop['enum'] && Array.isArray(prop['enum']) && prop['enum'].length > 0) {
      // Check if all enum values are strings (z.enum only works with strings)
      const allStrings = prop['enum'].every((val) => typeof val === 'string');

      if (allStrings) {
        // Use z.enum() for string enums
        const enumValues = prop['enum'].map((val) => ts.factory.createStringLiteral(val as string, true));
        const enumExpression = ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(
            ts.factory.createIdentifier('z'),
            ts.factory.createIdentifier('enum'),
          ),
          undefined,
          [ts.factory.createArrayLiteralExpression(enumValues, false)],
        );

        return required
          ? enumExpression
          : ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(enumExpression, ts.factory.createIdentifier('optional')),
              undefined,
              [],
            );
      } else {
        // Use z.union([z.literal(...), ...]) for numeric/boolean/mixed enums
        const literalSchemas = prop['enum'].map((val) => {
          let literalValue: ts.Expression;
          if (typeof val === 'string') {
            literalValue = ts.factory.createStringLiteral(val, true);
          } else if (typeof val === 'number') {
            // Handle negative numbers correctly
            if (val < 0) {
              literalValue = ts.factory.createPrefixUnaryExpression(
                ts.SyntaxKind.MinusToken,
                ts.factory.createNumericLiteral(String(Math.abs(val))),
              );
            } else {
              literalValue = ts.factory.createNumericLiteral(String(val));
            }
          } else if (typeof val === 'boolean') {
            literalValue = val ? ts.factory.createTrue() : ts.factory.createFalse();
          } else {
            literalValue = ts.factory.createStringLiteral(String(val), true);
          }

          return ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
              ts.factory.createIdentifier('z'),
              ts.factory.createIdentifier('literal'),
            ),
            undefined,
            [literalValue],
          );
        });

        const unionExpression = ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(
            ts.factory.createIdentifier('z'),
            ts.factory.createIdentifier('union'),
          ),
          undefined,
          [ts.factory.createArrayLiteralExpression(literalSchemas, false)],
        );

        return required
          ? unionExpression
          : ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(unionExpression, ts.factory.createIdentifier('optional')),
              undefined,
              [],
            );
      }
    }

    switch (prop['type']) {
      case 'array': {
        const itemsSchema = prop['items'] ? this.buildProperty(prop['items'], true) : this.buildZodAST(['unknown']);
        let arraySchema = this.buildZodAST([
          {
            type: 'array',
            args: [itemsSchema],
          },
        ]);

        // Apply array constraints
        if (typeof prop['minItems'] === 'number') {
          arraySchema = ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(arraySchema, ts.factory.createIdentifier('min')),
            undefined,
            [ts.factory.createNumericLiteral(String(prop['minItems']))],
          );
        }
        if (typeof prop['maxItems'] === 'number') {
          arraySchema = ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(arraySchema, ts.factory.createIdentifier('max')),
            undefined,
            [ts.factory.createNumericLiteral(String(prop['maxItems']))],
          );
        }

        return required
          ? arraySchema
          : ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(arraySchema, ts.factory.createIdentifier('optional')),
              undefined,
              [],
            );
      }
      case 'object': {
        const propObj = prop satisfies {
          properties?: Record<string, unknown>;
          required?: string[];
        };
        const properties = (propObj['properties'] ?? {}) as Record<string, unknown>;
        const propRequired = (propObj['required'] ?? []) as string[];

        const propertiesEntries = Object.entries(properties);

        if (propertiesEntries.length > 0) {
          const objectSchema = this.buildZodAST([
            {
              type: 'object',
              args: [
                ts.factory.createObjectLiteralExpression(
                  propertiesEntries.map(([name, propValue]): ts.ObjectLiteralElementLike => {
                    return ts.factory.createPropertyAssignment(
                      ts.factory.createIdentifier(name),
                      this.buildProperty(propValue, propRequired.includes(name)),
                    );
                  }),
                  true,
                ),
              ],
            },
          ]);

          // Apply object constraints
          let constrainedSchema = objectSchema;
          if (typeof prop['minProperties'] === 'number') {
            constrainedSchema = ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(constrainedSchema, ts.factory.createIdentifier('refine')),
              undefined,
              [
                ts.factory.createArrowFunction(
                  undefined,
                  undefined,
                  [ts.factory.createParameterDeclaration(undefined, undefined, 'obj', undefined, undefined, undefined)],
                  undefined,
                  ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                  ts.factory.createBinaryExpression(
                    ts.factory.createPropertyAccessExpression(
                      ts.factory.createCallExpression(
                        ts.factory.createPropertyAccessExpression(
                          ts.factory.createIdentifier('Object'),
                          ts.factory.createIdentifier('keys'),
                        ),
                        undefined,
                        [ts.factory.createIdentifier('obj')],
                      ),
                      ts.factory.createIdentifier('length'),
                    ),
                    ts.factory.createToken(ts.SyntaxKind.GreaterThanEqualsToken),
                    ts.factory.createNumericLiteral(String(prop['minProperties'])),
                  ),
                ),
                ts.factory.createObjectLiteralExpression([
                  ts.factory.createPropertyAssignment(
                    ts.factory.createIdentifier('message'),
                    ts.factory.createStringLiteral(
                      `Object must have at least ${String(prop['minProperties'])} properties`,
                    ),
                  ),
                ]),
              ],
            );
          }
          if (typeof prop['maxProperties'] === 'number') {
            constrainedSchema = ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(constrainedSchema, ts.factory.createIdentifier('refine')),
              undefined,
              [
                ts.factory.createArrowFunction(
                  undefined,
                  undefined,
                  [ts.factory.createParameterDeclaration(undefined, undefined, 'obj', undefined, undefined, undefined)],
                  undefined,
                  ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                  ts.factory.createBinaryExpression(
                    ts.factory.createPropertyAccessExpression(
                      ts.factory.createCallExpression(
                        ts.factory.createPropertyAccessExpression(
                          ts.factory.createIdentifier('Object'),
                          ts.factory.createIdentifier('keys'),
                        ),
                        undefined,
                        [ts.factory.createIdentifier('obj')],
                      ),
                      ts.factory.createIdentifier('length'),
                    ),
                    ts.factory.createToken(ts.SyntaxKind.LessThanEqualsToken),
                    ts.factory.createNumericLiteral(String(prop['maxProperties'])),
                  ),
                ),
                ts.factory.createObjectLiteralExpression([
                  ts.factory.createPropertyAssignment(
                    ts.factory.createIdentifier('message'),
                    ts.factory.createStringLiteral(
                      `Object must have at most ${String(prop['maxProperties'])} properties`,
                    ),
                  ),
                ]),
              ],
            );
          }

          return required
            ? constrainedSchema
            : ts.factory.createCallExpression(
                ts.factory.createPropertyAccessExpression(constrainedSchema, ts.factory.createIdentifier('optional')),
                undefined,
                [],
              );
        }

        return this.buildZodAST([
          {
            type: 'record',
            args: [this.buildZodAST(['string']), this.buildZodAST(['unknown'])],
          },
        ]);
      }
      case 'integer': {
        let numberSchema = this.buildZodAST(['number', 'int']);

        // Apply number constraints
        if (prop['minimum'] !== undefined && typeof prop['minimum'] === 'number') {
          const minValue =
            prop['exclusiveMinimum'] && typeof prop['exclusiveMinimum'] === 'boolean'
              ? prop['minimum'] + 1
              : prop['minimum'];
          numberSchema = ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
              numberSchema,
              ts.factory.createIdentifier(
                prop['exclusiveMinimum'] && typeof prop['exclusiveMinimum'] === 'boolean' ? 'gt' : 'gte',
              ),
            ),
            undefined,
            [ts.factory.createNumericLiteral(String(minValue))],
          );
        }
        if (prop['maximum'] !== undefined && typeof prop['maximum'] === 'number') {
          const maxValue =
            prop['exclusiveMaximum'] && typeof prop['exclusiveMaximum'] === 'boolean'
              ? prop['maximum'] - 1
              : prop['maximum'];
          numberSchema = ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
              numberSchema,
              ts.factory.createIdentifier(prop['exclusiveMaximum'] ? 'lt' : 'lte'),
            ),
            undefined,
            [ts.factory.createNumericLiteral(String(maxValue))],
          );
        }
        if (typeof prop['multipleOf'] === 'number') {
          const refineFunction = ts.factory.createArrowFunction(
            undefined,
            undefined,
            [ts.factory.createParameterDeclaration(undefined, undefined, 'val', undefined, undefined, undefined)],
            undefined,
            ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
            ts.factory.createBinaryExpression(
              ts.factory.createBinaryExpression(
                ts.factory.createIdentifier('val'),
                ts.factory.createToken(ts.SyntaxKind.PercentToken),
                ts.factory.createNumericLiteral(String(prop['multipleOf'])),
              ),
              ts.factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
              ts.factory.createNumericLiteral('0'),
            ),
          );
          const refineOptions = ts.factory.createObjectLiteralExpression([
            ts.factory.createPropertyAssignment(
              ts.factory.createIdentifier('message'),
              ts.factory.createStringLiteral(`Number must be a multiple of ${String(prop['multipleOf'])}`),
            ),
          ]);
          numberSchema = ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(numberSchema, ts.factory.createIdentifier('refine')),
            undefined,
            [refineFunction, refineOptions],
          );
        }

        return required
          ? numberSchema
          : ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(numberSchema, ts.factory.createIdentifier('optional')),
              undefined,
              [],
            );
      }
      case 'number': {
        let numberSchema = this.buildZodAST(['number']);

        // Apply number constraints
        if (prop['minimum'] !== undefined && typeof prop['minimum'] === 'number') {
          const minValue =
            prop['exclusiveMinimum'] && typeof prop['exclusiveMinimum'] === 'boolean'
              ? prop['minimum'] + 1
              : prop['minimum'];
          numberSchema = ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
              numberSchema,
              ts.factory.createIdentifier(
                prop['exclusiveMinimum'] && typeof prop['exclusiveMinimum'] === 'boolean' ? 'gt' : 'gte',
              ),
            ),
            undefined,
            [ts.factory.createNumericLiteral(String(minValue))],
          );
        }
        if (prop['maximum'] !== undefined && typeof prop['maximum'] === 'number') {
          const maxValue =
            prop['exclusiveMaximum'] && typeof prop['exclusiveMaximum'] === 'boolean'
              ? prop['maximum'] - 1
              : prop['maximum'];
          numberSchema = ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
              numberSchema,
              ts.factory.createIdentifier(prop['exclusiveMaximum'] ? 'lt' : 'lte'),
            ),
            undefined,
            [ts.factory.createNumericLiteral(String(maxValue))],
          );
        }
        if (typeof prop['multipleOf'] === 'number') {
          const refineFunction = ts.factory.createArrowFunction(
            undefined,
            undefined,
            [ts.factory.createParameterDeclaration(undefined, undefined, 'val', undefined, undefined, undefined)],
            undefined,
            ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
            ts.factory.createBinaryExpression(
              ts.factory.createBinaryExpression(
                ts.factory.createIdentifier('val'),
                ts.factory.createToken(ts.SyntaxKind.PercentToken),
                ts.factory.createNumericLiteral(String(prop['multipleOf'])),
              ),
              ts.factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
              ts.factory.createNumericLiteral('0'),
            ),
          );
          const refineOptions = ts.factory.createObjectLiteralExpression([
            ts.factory.createPropertyAssignment(
              ts.factory.createIdentifier('message'),
              ts.factory.createStringLiteral(`Number must be a multiple of ${String(prop['multipleOf'])}`),
            ),
          ]);
          numberSchema = ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(numberSchema, ts.factory.createIdentifier('refine')),
            undefined,
            [refineFunction, refineOptions],
          );
        }

        return required
          ? numberSchema
          : ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(numberSchema, ts.factory.createIdentifier('optional')),
              undefined,
              [],
            );
      }
      case 'string': {
        let stringSchema = this.buildZodAST(['string']);

        // Apply string format
        if (prop['format']) {
          switch (prop['format']) {
            case 'email':
              stringSchema = ts.factory.createCallExpression(
                ts.factory.createPropertyAccessExpression(
                  ts.factory.createIdentifier('z'),
                  ts.factory.createIdentifier('email'),
                ),
                undefined,
                [],
              );
              break;
            case 'uri':
            case 'url':
              stringSchema = ts.factory.createCallExpression(
                ts.factory.createPropertyAccessExpression(
                  ts.factory.createIdentifier('z'),
                  ts.factory.createIdentifier('url'),
                ),
                undefined,
                [],
              );
              break;
            case 'uuid':
              stringSchema = ts.factory.createCallExpression(
                ts.factory.createPropertyAccessExpression(
                  ts.factory.createIdentifier('z'),
                  ts.factory.createIdentifier('uuid'),
                ),
                undefined,
                [],
              );
              break;
            case 'date-time':
              stringSchema = ts.factory.createCallExpression(
                ts.factory.createPropertyAccessExpression(
                  ts.factory.createPropertyAccessExpression(
                    ts.factory.createIdentifier('z'),
                    ts.factory.createIdentifier('iso'),
                  ),
                  ts.factory.createIdentifier('datetime'),
                ),
                undefined,
                [this.buildDefaultValue({local: true})],
              );
              break;
            case 'date':
              stringSchema = ts.factory.createCallExpression(
                ts.factory.createPropertyAccessExpression(
                  ts.factory.createPropertyAccessExpression(
                    ts.factory.createIdentifier('z'),
                    ts.factory.createIdentifier('iso'),
                  ),
                  ts.factory.createIdentifier('date'),
                ),
                undefined,
                [],
              );
              break;
            case 'time':
              stringSchema = ts.factory.createCallExpression(
                ts.factory.createPropertyAccessExpression(stringSchema, ts.factory.createIdentifier('time')),
                undefined,
                [],
              );
              break;
            // Add more formats as needed
          }
        }

        // Apply string constraints
        if (typeof prop['minLength'] === 'number') {
          stringSchema = ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(stringSchema, ts.factory.createIdentifier('min')),
            undefined,
            [ts.factory.createNumericLiteral(String(prop['minLength']))],
          );
        }
        if (typeof prop['maxLength'] === 'number') {
          stringSchema = ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(stringSchema, ts.factory.createIdentifier('max')),
            undefined,
            [ts.factory.createNumericLiteral(String(prop['maxLength']))],
          );
        }
        if (prop['pattern'] && typeof prop['pattern'] === 'string') {
          stringSchema = ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(stringSchema, ts.factory.createIdentifier('regex')),
            undefined,
            [
              ts.factory.createNewExpression(ts.factory.createIdentifier('RegExp'), undefined, [
                ts.factory.createStringLiteral(prop['pattern'], true),
              ]),
            ],
          );
        }

        // Apply default value if not required
        if (!required && prop['default'] !== undefined) {
          const defaultValue = this.buildDefaultValue(prop['default']);
          stringSchema = ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(stringSchema, ts.factory.createIdentifier('default')),
            undefined,
            [defaultValue],
          );
        }

        return required
          ? stringSchema
          : ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(stringSchema, ts.factory.createIdentifier('optional')),
              undefined,
              [],
            );
      }
      case 'boolean': {
        let booleanSchema = this.buildZodAST(['boolean']);

        // Apply default value if not required
        if (!required && prop['default'] !== undefined) {
          const defaultValue =
            typeof prop['default'] === 'boolean'
              ? prop['default']
                ? ts.factory.createTrue()
                : ts.factory.createFalse()
              : ts.factory.createFalse();
          booleanSchema = ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(booleanSchema, ts.factory.createIdentifier('default')),
            undefined,
            [defaultValue],
          );
        }

        return required
          ? booleanSchema
          : ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(booleanSchema, ts.factory.createIdentifier('optional')),
              undefined,
              [],
            );
      }
      case 'unknown':
      default:
        return this.buildZodAST(['unknown', ...(!required ? ['optional'] : [])]);
    }
  }

  private buildDefaultValue(value: unknown): ts.Expression {
    if (typeof value === 'string') {
      return ts.factory.createStringLiteral(value, true);
    }
    if (typeof value === 'number') {
      return ts.factory.createNumericLiteral(String(value));
    }
    if (typeof value === 'boolean') {
      return value ? ts.factory.createTrue() : ts.factory.createFalse();
    }
    if (value === null) {
      return ts.factory.createNull();
    }
    if (Array.isArray(value)) {
      return ts.factory.createArrayLiteralExpression(
        value.map((item) => this.buildDefaultValue(item)),
        false,
      );
    }
    if (typeof value === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (value === null) {
        return ts.factory.createNull();
      }
      return ts.factory.createObjectLiteralExpression(
        Object.entries(value).map(([key, val]) =>
          ts.factory.createPropertyAssignment(ts.factory.createIdentifier(key), this.buildDefaultValue(val)),
        ),
        true,
      );
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return ts.factory.createStringLiteral(String(value), true);
    }
    // For objects and arrays, we need to handle them differently
    // This should not happen in practice, but we handle it for type safety
    return ts.factory.createStringLiteral(JSON.stringify(value), true);
  }

  private handleLogicalOperator(
    operator: 'anyOf' | 'oneOf' | 'allOf' | 'not',
    schemas: unknown[],
    required: boolean,
  ): ts.CallExpression {
    const logicalExpression = this.buildLogicalOperator(operator, schemas);
    return required
      ? logicalExpression
      : ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(logicalExpression, ts.factory.createIdentifier('optional')),
          undefined,
          [],
        );
  }

  private buildLogicalOperator(operator: 'anyOf' | 'oneOf' | 'allOf' | 'not', schemas: unknown[]): ts.CallExpression {
    switch (operator) {
      case 'anyOf':
      case 'oneOf': {
        const unionSchemas = schemas.map((schema) => this.buildSchemaFromLogicalOperator(schema));
        return ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(
            ts.factory.createIdentifier('z'),
            ts.factory.createIdentifier('union'),
          ),
          undefined,
          [ts.factory.createArrayLiteralExpression(unionSchemas, false)],
        );
      }
      case 'allOf': {
        if (schemas.length === 0) {
          throw new Error('allOf requires at least one schema');
        }

        const firstSchema = this.buildSchemaFromLogicalOperator(schemas[0]);
        return schemas.slice(1).reduce<ts.Expression>((acc, schema) => {
          const schemaExpression = this.buildSchemaFromLogicalOperator(schema);
          return ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
              ts.factory.createIdentifier('z'),
              ts.factory.createIdentifier('intersection'),
            ),
            undefined,
            [acc, schemaExpression],
          );
        }, firstSchema) as ts.CallExpression;
      }
      case 'not': {
        const notSchema = this.buildSchemaFromLogicalOperator(schemas[0]);
        return ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(
            ts.factory.createPropertyAccessExpression(
              ts.factory.createIdentifier('z'),
              ts.factory.createIdentifier('any'),
            ),
            ts.factory.createIdentifier('refine'),
          ),
          undefined,
          [
            ts.factory.createArrowFunction(
              undefined,
              undefined,
              [ts.factory.createParameterDeclaration(undefined, undefined, 'val', undefined, undefined, undefined)],
              undefined,
              ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
              ts.factory.createPrefixUnaryExpression(
                ts.SyntaxKind.ExclamationToken,
                ts.factory.createCallExpression(
                  ts.factory.createPropertyAccessExpression(notSchema, ts.factory.createIdentifier('safeParse')),
                  undefined,
                  [ts.factory.createIdentifier('val')],
                ),
              ),
            ),
            ts.factory.createObjectLiteralExpression([
              ts.factory.createPropertyAssignment(
                ts.factory.createIdentifier('message'),
                ts.factory.createStringLiteral('Value must not match the excluded schema'),
              ),
            ]),
          ],
        );
      }
      default:
        throw new Error(`Unsupported logical operator: ${String(operator)}`);
    }
  }

  private buildSchemaFromLogicalOperator(schema: unknown): ts.CallExpression | ts.Identifier {
    if (this.isReference(schema)) {
      // In logical operators, references are always required (they're part of a union/intersection)
      return this.buildFromReference(schema);
    }

    const safeSchema = SchemaProperties.safeParse(schema);
    if (safeSchema.success) {
      return this.buildProperty(safeSchema.data, true);
    }

    return this.buildBasicTypeFromSchema(schema);
  }

  private buildBasicTypeFromSchema(schema: unknown): ts.CallExpression | ts.Identifier {
    if (typeof schema === 'object' && schema !== null && 'type' in schema) {
      const schemaObj = schema as {type: string; properties?: Record<string, unknown>; items?: unknown};

      switch (schemaObj.type) {
        case 'string':
          return this.buildZodAST(['string']);
        case 'number':
          return this.buildZodAST(['number']);
        case 'integer':
          return this.buildZodAST(['number', 'int']);
        case 'boolean':
          return this.buildZodAST(['boolean']);
        case 'object':
          return this.buildObjectTypeFromSchema(schemaObj);
        case 'array':
          return this.buildArrayTypeFromSchema(schemaObj);
        default:
          return this.buildZodAST(['unknown']);
      }
    }

    return this.buildZodAST(['unknown']);
  }

  private buildObjectTypeFromSchema(schemaObj: {properties?: Record<string, unknown>}): ts.CallExpression {
    const properties = Object.entries(schemaObj.properties ?? {});

    if (properties.length > 0) {
      return this.buildZodAST([
        {
          type: 'object',
          args: [
            ts.factory.createObjectLiteralExpression(
              properties.map(([name, property]): ts.ObjectLiteralElementLike => {
                return ts.factory.createPropertyAssignment(
                  ts.factory.createIdentifier(name),
                  this.buildSchemaFromLogicalOperator(property),
                );
              }),
              true,
            ),
          ],
        },
      ]);
    }

    return this.buildZodAST([
      {
        type: 'record',
        args: [this.buildZodAST(['string']), this.buildZodAST(['unknown'])],
      },
    ]);
  }

  private buildArrayTypeFromSchema(schemaObj: {items?: unknown}): ts.CallExpression {
    if (schemaObj.items) {
      return this.buildZodAST([
        {
          type: 'array',
          args: [this.buildSchemaFromLogicalOperator(schemaObj.items)],
        },
      ]);
    }
    return this.buildZodAST(['array']);
  }

  private isReference(reference: unknown): reference is ReferenceType {
    if (typeof reference === 'object' && reference !== null && '$ref' in reference) {
      const ref = reference satisfies {$ref?: unknown};
      return typeof ref.$ref === 'string' && ref.$ref.length > 0;
    }
    return false;
  }

  private buildFromReference(reference: ReferenceType): ts.CallExpression | ts.Identifier {
    const {$ref = ''} = Reference.parse(reference);
    const refName = $ref.split('/').pop() ?? 'never';
    const sanitizedRefName = this.typeBuilder.sanitizeIdentifier(refName);

    // Check if this reference creates a circular dependency
    if (this.isCircularReference(refName)) {
      // Generate: z.lazy(() => RefSchema)
      return ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier('z'),
          ts.factory.createIdentifier('lazy'),
        ),
        undefined,
        [
          ts.factory.createArrowFunction(
            undefined,
            undefined,
            [],
            undefined,
            ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
            ts.factory.createIdentifier(sanitizedRefName),
          ),
        ],
      );
    }

    return ts.factory.createIdentifier(sanitizedRefName);
  }

  /**
   * Determines if a reference creates a circular dependency that needs z.lazy().
   * A reference is circular if:
   * 1. It's a direct self-reference (schema references itself)
   * 2. It's part of a circular dependency chain (A -> B -> A)
   */
  private isCircularReference(refName: string): boolean {
    // Case 1: Direct self-reference
    if (refName === this.currentSchemaName) {
      return true;
    }

    // Case 2: Reference to a schema that's part of a circular dependency chain
    // and we're currently building a schema that's also in that chain
    if (
      this.circularSchemas.has(refName) &&
      this.currentSchemaName !== null &&
      this.circularSchemas.has(this.currentSchemaName)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Detects schemas that are part of circular dependency chains.
   * Uses a modified Tarjan's algorithm to find strongly connected components (SCCs).
   * Schemas in SCCs with more than one node, or self-referencing schemas, are circular.
   */
  private detectCircularDependencies(schemas: Record<string, unknown>): Set<string> {
    const circularSchemas = new Set<string>();

    // Build dependency graph
    const graph = new Map<string, string[]>();
    for (const [name, schema] of Object.entries(schemas)) {
      const dependencies = jp
        .query(schema, '$..["$ref"]')
        .filter((ref: string) => ref.startsWith('#/components/schemas/'))
        .map((ref: string) => ref.replace('#/components/schemas/', ''))
        .filter((dep: string) => dep in schemas);
      graph.set(name, dependencies);
    }

    // Tarjan's algorithm for finding SCCs
    let index = 0;
    const indices = new Map<string, number>();
    const lowlinks = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];

    const strongConnect = (node: string): void => {
      indices.set(node, index);
      lowlinks.set(node, index);
      index++;
      stack.push(node);
      onStack.add(node);

      const neighbors = graph.get(node) ?? [];
      for (const neighbor of neighbors) {
        if (!indices.has(neighbor)) {
          strongConnect(neighbor);
          const currentLowlink = lowlinks.get(node) ?? 0;
          const neighborLowlink = lowlinks.get(neighbor) ?? 0;
          lowlinks.set(node, Math.min(currentLowlink, neighborLowlink));
        } else if (onStack.has(neighbor)) {
          const currentLowlink = lowlinks.get(node) ?? 0;
          const neighborIndex = indices.get(neighbor) ?? 0;
          lowlinks.set(node, Math.min(currentLowlink, neighborIndex));
        }
      }

      // If node is a root of an SCC
      if (lowlinks.get(node) === indices.get(node)) {
        const scc: string[] = [];
        let w: string | undefined;
        do {
          w = stack.pop();
          if (w !== undefined) {
            onStack.delete(w);
            scc.push(w);
          }
        } while (w !== undefined && w !== node);

        // An SCC is circular if it has more than one node
        // or if it has one node that references itself
        if (scc.length > 1) {
          for (const schemaName of scc) {
            circularSchemas.add(schemaName);
          }
        } else if (scc.length === 1) {
          const schemaName = scc[0];
          if (schemaName !== undefined) {
            const deps = graph.get(schemaName) ?? [];
            if (deps.includes(schemaName)) {
              circularSchemas.add(schemaName);
            }
          }
        }
      }
    };

    for (const node of graph.keys()) {
      if (!indices.has(node)) {
        strongConnect(node);
      }
    }

    return circularSchemas;
  }

  private topologicalSort(schemas: Record<string, unknown>): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (name: string) => {
      if (visiting.has(name)) {
        return;
      }
      if (visited.has(name)) {
        return;
      }

      visiting.add(name);
      const schema = schemas[name];
      const dependencies = jp
        .query(schema, '$..["$ref"]')
        .filter((ref: string) => ref.startsWith('#/components/schemas/'))
        .map((ref: string) => ref.replace('#/components/schemas/', ''));

      for (const dep of dependencies) {
        if (schemas[dep]) {
          visit(dep);
        }
      }

      visiting.delete(name);
      visited.add(name);
      result.push(name);
    };

    for (const name of Object.keys(schemas)) {
      if (!visited.has(name)) {
        visit(name);
      }
    }

    return result;
  }
}

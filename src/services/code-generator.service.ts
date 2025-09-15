import jp from 'jsonpath';
import * as ts from 'typescript';
import { z } from 'zod';
import type { CodeGenerator, SchemaBuilder } from '../interfaces/code-generator.js';
import type { MethodSchemaType, OpenApiSpecType, ReferenceType } from '../types/openapi.js';
import { MethodSchema, Reference, SchemaProperties } from '../types/openapi.js';
import { TypeScriptImportBuilderService } from './import-builder.service.js';
import { TypeScriptTypeBuilderService } from './type-builder.service.js';

export class TypeScriptCodeGeneratorService implements CodeGenerator, SchemaBuilder {
  private readonly typeBuilder = new TypeScriptTypeBuilderService();
  private readonly importBuilder = new TypeScriptImportBuilderService();
  private readonly printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  private readonly ZodAST = z.object({
    type: z.enum(['string', 'number', 'boolean', 'object', 'array', 'unknown']),
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

      if (safeCategory.anyOf && Array.isArray(safeCategory.anyOf) && safeCategory.anyOf.length > 0) {
        return this.handleLogicalOperator('anyOf', safeCategory.anyOf, required);
      }

      if (safeCategory.oneOf && Array.isArray(safeCategory.oneOf) && safeCategory.oneOf.length > 0) {
        return this.handleLogicalOperator('oneOf', safeCategory.oneOf, required);
      }

      if (safeCategory.allOf && Array.isArray(safeCategory.allOf) && safeCategory.allOf.length > 0) {
        return this.handleLogicalOperator('allOf', safeCategory.allOf, required);
      }

      if (safeCategory.not) {
        return this.handleLogicalOperator('not', [safeCategory.not], required);
      }

      return this.buildProperty(safeCategory, required);
    }

    throw safeCategorySchema.error;
  }

  private buildAST(openapi: OpenApiSpecType): ts.Statement[] {
    const imports = this.importBuilder.buildImports();
    const schemas = this.buildSchemas(openapi);
    const clientClass = this.buildClientClass(openapi, schemas);
    const baseUrlConstant = this.buildBaseUrlConstant(openapi);

    return [
      this.createComment('Imports'),
      ...imports,
      this.createComment('Components schemas'),
      ...Object.values(schemas),
      ...baseUrlConstant,
      this.createComment('Client class'),
      clientClass,
    ];
  }

  private buildSchemas(openapi: OpenApiSpecType): Record<string, ts.VariableStatement> {
    const schemasEntries = Object.entries(openapi.components?.schemas ?? {});
    const sortedSchemaNames = this.topologicalSort(Object.fromEntries(schemasEntries));

    return sortedSchemaNames.reduce<Record<string, ts.VariableStatement>>((schemaRegistered, name) => {
      const schema = openapi.components?.schemas?.[name];
      if (!schema) return schemaRegistered;

      const variableStatement = ts.factory.createVariableStatement(
        [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              ts.factory.createIdentifier(this.typeBuilder.sanitizeIdentifier(name)),
              undefined,
              undefined,
              this.buildSchema(schema),
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

  private buildClientClass(
    openapi: OpenApiSpecType,
    schemas: Record<string, ts.VariableStatement>,
  ): ts.ClassDeclaration {
    const clientName = this.generateClientName(openapi.info.title);
    const methods = this.buildClientMethods(openapi, schemas);

    return ts.factory.createClassDeclaration(
      [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createIdentifier(clientName),
      undefined,
      undefined,
      [
        this.typeBuilder.createProperty('#baseUrl', 'string', true),
        this.buildConstructor(),
        this.buildHttpRequestMethod(),
        ...methods,
      ],
    );
  }

  private buildConstructor(): ts.ConstructorDeclaration {
    return ts.factory.createConstructorDeclaration(
      undefined,
      [
        this.typeBuilder.createParameter('baseUrl', 'string', ts.factory.createIdentifier('defaultBaseUrl')),
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

  private buildHttpRequestMethod(): ts.MethodDeclaration {
    return ts.factory.createMethodDeclaration(
      [ts.factory.createToken(ts.SyntaxKind.AsyncKeyword)],
      undefined,
      ts.factory.createPrivateIdentifier('#makeRequest'),
      undefined,
      [this.typeBuilder.createGenericType('T')],
      [
        this.typeBuilder.createParameter('method', 'string'),
        this.typeBuilder.createParameter('path', 'string'),
        this.typeBuilder.createParameter(
          'options',
          'unknown',
          ts.factory.createObjectLiteralExpression([], false),
          true,
        ),
      ],
      ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Promise'), [
        ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T'), undefined),
      ]),
      ts.factory.createBlock(
        [
          ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
              [
                ts.factory.createVariableDeclaration(
                  ts.factory.createIdentifier('url'),
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
                  ts.factory.createIdentifier('response'),
                  undefined,
                  undefined,
                  ts.factory.createAwaitExpression(
                    ts.factory.createCallExpression(ts.factory.createIdentifier('fetch'), undefined, [
                      ts.factory.createIdentifier('url'),
                      ts.factory.createObjectLiteralExpression(
                        [
                          ts.factory.createShorthandPropertyAssignment(
                            ts.factory.createIdentifier('method'),
                            undefined,
                          ),
                          ts.factory.createPropertyAssignment(
                            ts.factory.createIdentifier('headers'),
                            ts.factory.createObjectLiteralExpression(
                              [
                                ts.factory.createPropertyAssignment(
                                  ts.factory.createStringLiteral('Content-Type', true),
                                  ts.factory.createStringLiteral('application/json', true),
                                ),
                              ],
                              true,
                            ),
                          ),
                        ],
                        true,
                      ),
                    ]),
                  ),
                ),
              ],
              ts.NodeFlags.Const,
            ),
          ),
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
    return Object.entries(openapi.paths).reduce<ts.MethodDeclaration[]>((endpoints, [path, pathItem]) => {
      const methods = Object.entries(pathItem)
        .filter(([method]) => ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method))
        .map(([method, methodSchema]) => {
          const safeMethodSchema = MethodSchema.parse(methodSchema);

          if (!safeMethodSchema.operationId) {
            return null;
          }

          return this.buildEndpointMethod(method, path, safeMethodSchema, schemas);
        })
        .filter((method): method is ts.MethodDeclaration => method !== null);

      return [...endpoints, ...methods];
    }, []);
  }

  private buildEndpointMethod(
    method: string,
    path: string,
    schema: MethodSchemaType,
    schemas: Record<string, ts.VariableStatement>,
  ): ts.MethodDeclaration {
    const parameters = this.buildMethodParameters(schema, schemas);
    const responseType = this.getResponseType(schema, schemas);

    return ts.factory.createMethodDeclaration(
      [ts.factory.createToken(ts.SyntaxKind.AsyncKeyword)],
      undefined,
      ts.factory.createIdentifier(String(schema.operationId)),
      undefined,
      undefined,
      parameters,
      responseType,
      ts.factory.createBlock(
        [
          ts.factory.createReturnStatement(
            ts.factory.createAwaitExpression(
              ts.factory.createCallExpression(
                ts.factory.createPropertyAccessExpression(
                  ts.factory.createThis(),
                  ts.factory.createPrivateIdentifier('#makeRequest'),
                ),
                undefined,
                [
                  ts.factory.createStringLiteral(method.toUpperCase(), true),
                  ts.factory.createStringLiteral(path, true),
                ],
              ),
            ),
          ),
        ],
        true,
      ),
    );
  }

  private buildMethodParameters(
    schema: MethodSchemaType,
    schemas: Record<string, ts.VariableStatement>,
  ): ts.ParameterDeclaration[] {
    void schemas; // Mark as intentionally unused
    const parameters: ts.ParameterDeclaration[] = [];

    if (schema.parameters) {
      schema.parameters.forEach((param) => {
        if (param.in === 'path' && param.required) {
          parameters.push(
            this.typeBuilder.createParameter(
              this.typeBuilder.sanitizeIdentifier(param.name),
              'string',
              undefined,
              false,
            ),
          );
        }
      });
    }

    parameters.push(this.typeBuilder.createParameter('_', 'unknown', undefined, true));

    return parameters;
  }

  private getResponseType(
    schema: MethodSchemaType,
    schemas: Record<string, ts.VariableStatement>,
  ): ts.TypeNode | undefined {
    void schemas; // Mark as intentionally unused
    const response200 = schema.responses?.['200'];
    if (!response200?.content?.['application/json']?.schema) {
      return undefined;
    }

    return ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Promise'), [
      ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
    ]);
  }

  private buildBaseUrlConstant(openapi: OpenApiSpecType): ts.Statement[] {
    const baseUrl = openapi.servers?.[0]?.url;
    if (!baseUrl) {
      return [];
    }

    return [
      ts.factory.createVariableStatement(
        undefined,
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              ts.factory.createIdentifier('defaultBaseUrl'),
              undefined,
              undefined,
              ts.factory.createStringLiteral(baseUrl, true),
            ),
          ],
          ts.NodeFlags.Const,
        ),
      ),
    ];
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
      return this.buildFromReference(prop);
    }

    const methodsToApply: string[] = [];

    if (prop.anyOf && Array.isArray(prop.anyOf) && prop.anyOf.length > 0) {
      return this.handleLogicalOperator('anyOf', prop.anyOf, required);
    }

    if (prop.oneOf && Array.isArray(prop.oneOf) && prop.oneOf.length > 0) {
      return this.handleLogicalOperator('oneOf', prop.oneOf, required);
    }

    if (prop.allOf && Array.isArray(prop.allOf) && prop.allOf.length > 0) {
      return this.handleLogicalOperator('allOf', prop.allOf, required);
    }

    if (prop.not) {
      return this.handleLogicalOperator('not', [prop.not], required);
    }

    switch (prop.type) {
      case 'array':
        return this.buildZodAST([
          {
            type: 'array',
            args: prop.items ? [this.buildProperty(prop.items, true)] : [],
          },
          ...(!required ? ['optional'] : []),
        ]);
      case 'object':
        {
          const {
            properties = {},
            required: propRequired = []
          } = prop as { properties?: Record<string, unknown>; required?: string[] };

          return this.buildZodAST([
            {
              type: 'object',
              args: [
                ts.factory.createObjectLiteralExpression(
                  Object.entries(properties).map(([name, propValue]): ts.ObjectLiteralElementLike => {
                    return ts.factory.createPropertyAssignment(
                      ts.factory.createIdentifier(name),
                      this.buildProperty(propValue, propRequired.includes(name)),
                    );
                  }),
                  true,
                ),
              ],
            },
            ...(!required ? ['optional'] : []),
          ]);
        }
      case 'integer':
        methodsToApply.push('int');
        return this.buildZodAST(['number', ...methodsToApply, ...(!required ? ['optional'] : [])]);
      case 'number':
        return this.buildZodAST(['number', ...(!required ? ['optional'] : [])]);
      case 'string':
        return this.buildZodAST(['string', ...(!required ? ['optional'] : [])]);
      case 'boolean':
        return this.buildZodAST(['boolean', ...(!required ? ['optional'] : [])]);
      case 'unknown':
      default:
        return this.buildZodAST(['unknown', ...(!required ? ['optional'] : [])]);
    }
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
      const schemaObj = schema as { type: string; properties?: Record<string, unknown>; items?: unknown };

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

  private buildObjectTypeFromSchema(schemaObj: { properties?: Record<string, unknown> }): ts.CallExpression {
    if (schemaObj.properties) {
      return this.buildZodAST([
        {
          type: 'object',
          args: [
            ts.factory.createObjectLiteralExpression(
              Object.entries(schemaObj.properties).map(([name, property]): ts.ObjectLiteralElementLike => {
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
    return this.buildZodAST(['object']);
  }

  private buildArrayTypeFromSchema(schemaObj: { items?: unknown }): ts.CallExpression {
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
      const ref = reference as { $ref?: unknown };
      return typeof ref.$ref === 'string' && ref.$ref.length > 0;
    }
    return false;
  }

  private buildFromReference(reference: ReferenceType): ts.Identifier {
    const { $ref = '' } = Reference.parse(reference);
    const refName = $ref.split('/').pop() ?? 'never';
    return ts.factory.createIdentifier(this.typeBuilder.sanitizeIdentifier(refName));
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

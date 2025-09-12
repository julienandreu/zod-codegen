import {readFileSync, writeFileSync} from 'fs';
import {Reporter} from './utils/reporter';
import {resolve} from 'path';
import {load} from 'js-yaml';
import {MethodSchema, OpenApiSpec, Parameter, Reference, SchemaProperties} from './openapi';
import ts from 'typescript';
import jp from 'jsonpath';
import {z} from 'zod';
import {parse} from 'path-to-regexp';

const IsTypeImport = z.boolean();

const ImportedElement = z.record(IsTypeImport);

const ImportOptions = z.object({
  defaultImport: ImportedElement.optional(),
  namedImports: ImportedElement.optional(),
});

export class Generator {
  private _target: string;
  private _printer: ts.Printer;

  constructor(
    private _name: string,
    private _version: string,
    private _reporter: Reporter,
    private _input: string,
    private _output: string,
  ) {
    this._target = resolve(this._output, 'type.ts');
    this._printer = ts.createPrinter({newLine: ts.NewLineKind.LineFeed});
  }

  readFile(): unknown {
    const sourceContent = readFileSync(this._input, 'utf8');

    try {
      return JSON.parse(sourceContent);
    } catch (_) {
      return load(sourceContent);
    }
  }

  parseFile(source: unknown) {
    return OpenApiSpec.parse(source);
  }

  createImport(target: string, options: z.infer<typeof ImportOptions>): ts.ImportDeclaration {
    const safeOptions = ImportOptions.parse(options);
    const [defaultImport, isDefaultImportTypeImport = false] = Object.entries(safeOptions.defaultImport ?? {})[0] ?? [];
    const {success: hasDefaultImport} = z.string().safeParse(defaultImport);

    const safeNameImports = ImportedElement.safeParse(safeOptions.namedImports);
    const namedImportList = safeNameImports.success ? Object.entries(safeNameImports.data) : [];

    return ts.factory.createImportDeclaration(
      undefined,
      ts.factory.createImportClause(
        isDefaultImportTypeImport,
        hasDefaultImport ? ts.factory.createIdentifier(defaultImport) : undefined,
        namedImportList.length > 0
          ? ts.factory.createNamedImports(
              namedImportList.map(([name, isTypeImport = false]) => {
                return ts.factory.createImportSpecifier(isTypeImport, undefined, ts.factory.createIdentifier(name));
              }),
            )
          : undefined,
      ),
      ts.factory.createStringLiteral(target, true),
      undefined,
    );
  }

  createType(type: string) {
    switch (type) {
      case 'string':
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
      case 'number':
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
      case 'boolean':
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
      case 'unknown':
      default:
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
    }
  }

  createProperty(name: string, type: string, isReadonly = false) {
    const createIdentifier = name.startsWith('#') ? 'createPrivateIdentifier' : 'createIdentifier';

    return ts.factory.createPropertyDeclaration(
      isReadonly ? [ts.factory.createToken(ts.SyntaxKind.ReadonlyKeyword)] : undefined,
      ts.factory[createIdentifier](name),
      undefined,
      this.createType(type),
      undefined,
    );
  }

  createParameter(name: string, type?: string | ts.TypeNode, defaultValue?: ts.Expression, isOptional = false) {
    return ts.factory.createParameterDeclaration(
      undefined,
      undefined,
      ts.factory.createIdentifier(this.sanitizeIdentifier(name)),
      isOptional ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
      typeof type === 'string' ? this.createType(type) : type,
      defaultValue,
    );
  }

  createGenericType(name: string) {
    return ts.factory.createTypeParameterDeclaration(
      undefined,
      ts.factory.createIdentifier(name),
      undefined,
      undefined,
    );
  }

  debugAST(...nodes: ts.Node[]) {
    const debugFile = ts.createSourceFile(this._target, '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    console.log(
      this._printer.printList(ts.ListFormat.SourceFileStatements, ts.factory.createNodeArray(nodes), debugFile),
    );
  }

  static ZodAST = z.object({
    type: z.enum(['string', 'number', 'boolean', 'object', 'array', 'unknown']),
    args: z.array(z.unknown()).optional(),
  });

  buildZodAST(input: (string | z.infer<typeof Generator.ZodAST>)[]) {
    const [initial, ...rest] = input;

    const safeInitial = Generator.ZodAST.safeParse(initial);

    const initialExpression = !safeInitial.success
      ? ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(
            ts.factory.createIdentifier('z'),
            ts.factory.createIdentifier(Generator.ZodAST.shape.type.parse(initial)),
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

    const rootExpression = rest.reduce((expression, exp) => {
      const safeExp = Generator.ZodAST.safeParse(exp);
      return !safeExp.success
        ? ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(expression, ts.factory.createIdentifier(String(exp))),
            undefined,
            [],
          )
        : ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(expression, ts.factory.createIdentifier(safeExp.data.type)),
            undefined,
            (safeExp.data.args ?? []) as ts.Expression[],
          );
    }, initialExpression);

    return rootExpression;
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

  buildLogicalOperator(operator: 'anyOf' | 'oneOf' | 'allOf' | 'not', schemas: unknown[]): ts.CallExpression {
    switch (operator) {
      case 'anyOf':
      case 'oneOf': {
        // Both anyOf and oneOf map to z.union in Zod
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
        // allOf maps to z.intersection in Zod
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
        // not maps to z.any().refine with negation logic
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
    // Check if it's a reference
    if (this.isReference(schema)) {
      return this.buildFromReference(schema);
    }

    // Try to parse as SchemaProperties first
    const safeSchema = SchemaProperties.safeParse(schema);
    if (safeSchema.success) {
      return this.buildProperty(safeSchema.data, true);
    }

    // If that fails, try to build as a basic type
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

    // Fallback to unknown
    return this.buildZodAST(['unknown']);
  }

  private buildObjectTypeFromSchema(schemaObj: {properties?: Record<string, unknown>}): ts.CallExpression {
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

  isReference(reference: unknown): reference is z.infer<typeof Reference> {
    if (typeof reference === 'object' && reference !== null && '$ref' in reference) {
      const ref = reference as {$ref?: unknown};
      return typeof ref.$ref === 'string' && ref.$ref.length > 0;
    }
    return false;
  }

  buildFromReference(reference: unknown): ts.Identifier {
    const {$ref = ''} = Reference.parse(reference);
    const refName = $ref.split('/').pop() ?? 'never';

    return ts.factory.createIdentifier(this.sanitizeIdentifier(refName));
  }

  // TODO: Extract methods to build each type of property
  // eslint-disable-next-line complexity
  buildProperty(property: unknown, required = false): ts.CallExpression | ts.Identifier {
    const safeProperty = SchemaProperties.parse(property);

    // Handle logical operators first
    if (safeProperty.anyOf && safeProperty.anyOf.length > 0) {
      return this.handleLogicalOperator('anyOf', safeProperty.anyOf, required);
    }

    if (safeProperty.oneOf && safeProperty.oneOf.length > 0) {
      return this.handleLogicalOperator('oneOf', safeProperty.oneOf, required);
    }

    if (safeProperty.allOf && safeProperty.allOf.length > 0) {
      return this.handleLogicalOperator('allOf', safeProperty.allOf, required);
    }

    if (safeProperty.not) {
      return this.handleLogicalOperator('not', [safeProperty.not], required);
    }

    switch (safeProperty.type) {
      case 'array':
        return this.buildZodAST([
          {
            type: 'array',
            args: [this.buildProperty(safeProperty.items, true)],
          },
          ...(!required ? ['optional'] : []),
        ]);
      case 'object':
        return this.buildZodAST([
          {
            type: 'object',
            args: [
              ts.factory.createObjectLiteralExpression(
                Object.entries(safeProperty.properties ?? {}).map(([name, property]): ts.ObjectLiteralElementLike => {
                  return ts.factory.createPropertyAssignment(
                    ts.factory.createIdentifier(name),
                    this.buildProperty(property, safeProperty.required?.includes(name) ?? false),
                  );
                }),
                true,
              ),
            ],
          },
          ...(!required ? ['optional'] : []),
        ]);
      case 'integer':
        return this.buildZodAST(['number', 'int', ...(!required ? ['optional'] : [])]);
      case 'number':
        return this.buildZodAST(['number', ...(!required ? ['optional'] : [])]);
      case 'string':
        return this.buildZodAST(['string', ...(!required ? ['optional'] : [])]);
      case 'boolean':
        return this.buildZodAST(['boolean', ...(!required ? ['optional'] : [])]);
      case 'unknown':
        return this.buildZodAST(['unknown', ...(!required ? ['optional'] : [])]);
      default:
        if (this.isReference(property)) {
          return this.buildFromReference(property);
        }

        return this.buildZodAST(['unknown', ...(!required ? ['optional'] : [])]);
    }
  }

  buildSchema(schema: unknown, required = true) {
    const safeCategorySchema = SchemaProperties.safeParse(schema);
    if (safeCategorySchema.success) {
      const safeCategory = safeCategorySchema.data;

      // Handle logical operators at the schema level
      if (safeCategory.anyOf && safeCategory.anyOf.length > 0) {
        return this.handleLogicalOperator('anyOf', safeCategory.anyOf, required);
      }

      if (safeCategory.oneOf && safeCategory.oneOf.length > 0) {
        return this.handleLogicalOperator('oneOf', safeCategory.oneOf, required);
      }

      if (safeCategory.allOf && safeCategory.allOf.length > 0) {
        return this.handleLogicalOperator('allOf', safeCategory.allOf, required);
      }

      if (safeCategory.not) {
        return this.handleLogicalOperator('not', [safeCategory.not], required);
      }

      return this.buildProperty(safeCategory, required);
    }

    throw safeCategorySchema.error;
  }

  getRequestBody(schema: unknown) {
    const safeSchema = MethodSchema.safeParse(schema);

    if (!safeSchema.success) {
      return;
    }

    const requestBodySchema = safeSchema.data.requestBody?.content?.['application/json']?.schema;

    if (requestBodySchema?.$ref) {
      return requestBodySchema.$ref.split('/').pop();
    }

    return requestBodySchema;
  }

  getParameters(schema: unknown, filter?: string[]) {
    const safeSchema = MethodSchema.safeParse(schema);

    if (!safeSchema.success) {
      return;
    }

    const parametersSchema = safeSchema.data.parameters;

    if (!filter) {
      return parametersSchema;
    }

    return parametersSchema?.filter((parameter) => filter.includes(parameter.in));
  }

  getResponseBody(schemas: Record<string, ts.VariableStatement>, operationId: string, schema: unknown) {
    try {
      const safeSchema = MethodSchema.parse(schema);

      const responseBodySchema = safeSchema.responses?.['200']?.content?.['application/json']?.schema;
      const safeResponseBodySchema = SchemaProperties.parse(responseBodySchema);

      if (safeResponseBodySchema.$ref) {
        return safeResponseBodySchema.$ref.split('/').pop();
      }

      const identifier = `${operationId}Response`;
      const newSchema = this.toPascalCase(identifier);

      const variableStatement = ts.factory.createVariableStatement(
        [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              ts.factory.createIdentifier(newSchema),
              undefined,
              undefined,
              this.buildSchema(safeResponseBodySchema),
            ),
          ],
          ts.NodeFlags.Const,
        ),
      );

      // TODO: Refactor this side effect
      schemas[newSchema] = variableStatement;

      return newSchema;
    } catch (_) {
      return;
    }
  }

  toCamelCase(word: string) {
    return word.charAt(0).toLowerCase() + word.slice(1);
  }

  toPascalCase(word: string) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  sanitizeIdentifier(name: string): string {
    // Replace hyphens and other invalid characters with underscores
    // Ensure it starts with a letter or underscore
    let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');

    // Ensure it doesn't start with a number
    if (/^[0-9]/.test(sanitized)) {
      sanitized = '_' + sanitized;
    }

    // Ensure it's not empty
    if (sanitized.length === 0) {
      sanitized = '_';
    }

    return sanitized;
  }

  buildPathParameter(schemas: Record<string, ts.VariableStatement>, parameter: unknown) {
    const safeParameter = Parameter.parse(parameter);

    const identifier = `${safeParameter.in}Parameter${this.toPascalCase(safeParameter.name)}`;
    const newSchema = this.sanitizeIdentifier(this.toPascalCase(identifier));

    const variableStatement = ts.factory.createVariableStatement(
      [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createVariableDeclarationList(
        [
          ts.factory.createVariableDeclaration(
            ts.factory.createIdentifier(newSchema),
            undefined,
            undefined,
            this.buildSchema(safeParameter.schema, safeParameter.required ?? false),
          ),
        ],
        ts.NodeFlags.Const,
      ),
    );

    // TODO: Refactor this side effect
    schemas[newSchema] = variableStatement;

    return this.createParameter(
      this.sanitizeIdentifier(safeParameter.name),
      ts.factory.createTypeReferenceNode(
        ts.factory.createQualifiedName(ts.factory.createIdentifier('z'), ts.factory.createIdentifier('infer')),
        [ts.factory.createTypeQueryNode(ts.factory.createIdentifier(newSchema), undefined)],
      ),
      undefined,
      !safeParameter.required,
    );
  }

  hasNoPathParams(path: string) {
    const out = parse(path);
    const {success} = z.array(z.string()).safeParse(out);

    return success;
  }

  // Topological sort for schema dependencies
  private topologicalSort(schemas: Record<string, unknown>): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (name: string) => {
      if (visiting.has(name)) {
        // Circular dependency detected, add it anyway
        return;
      }
      if (visited.has(name)) {
        return;
      }

      visiting.add(name);
      const schema = schemas[name];
      const dependencies = jp
        .query(schema, '$..[\'$ref\']')
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

  buildAST(openapi: Zod.infer<typeof OpenApiSpec>) {
    const importFromAxios = this.createImport('axios', {
      defaultImport: {
        axios: false,
      },
      namedImports: {
        AxiosResponse: true,
      },
    });

    const importFromZod = this.createImport('zod', {
      defaultImport: {
        z: false,
      },
    });

    const importFromPathToRegexp = this.createImport('path-to-regexp', {
      namedImports: {
        compile: false,
      },
    });

    const schemasEntries = Object.entries(openapi.components?.schemas ?? {});
    const sortedSchemaNames = this.topologicalSort(Object.fromEntries(schemasEntries));

    const schemas: Record<string, ts.VariableStatement> = sortedSchemaNames.reduce((schemaRegistered, name) => {
      const schema = openapi.components?.schemas?.[name];
      if (!schema) return schemaRegistered;

      const variableStatement = ts.factory.createVariableStatement(
        [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              ts.factory.createIdentifier(this.sanitizeIdentifier(name)),
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

    const paths = Object.entries(openapi.paths).reduce<ts.MethodDeclaration[]>((endpoints, [path, endpoint]) => {
      // TODO: Refactor this mess
      // eslint-disable-next-line complexity
      const methods = Object.entries(endpoint).map(([method, methodSchema]) => {
        const safeMethodSchema = MethodSchema.parse(methodSchema);

        if (!safeMethodSchema.operationId) {
          return [...endpoints];
        }

        const safeRequestBodySchemaName = z.string().safeParse(this.getRequestBody(safeMethodSchema));

        const safeResponseBodySchemaName = z
          .string()
          .safeParse(this.getResponseBody(schemas, safeMethodSchema.operationId, safeMethodSchema));

        return ts.factory.createMethodDeclaration(
          [ts.factory.createToken(ts.SyntaxKind.AsyncKeyword)],
          undefined,
          ts.factory.createIdentifier(safeMethodSchema.operationId),
          undefined,
          undefined,
          [
            // Required parameters first
            ...(this.getParameters(safeMethodSchema, ['path'])?.map((parameter) =>
              this.buildPathParameter(schemas, parameter),
            ) ?? []),
            ...(safeRequestBodySchemaName.success
              ? [
                  this.createParameter(
                    this.sanitizeIdentifier(
                      this.toCamelCase(safeRequestBodySchemaName.data.replace(/([a-z])([A-Z])/g, '$1-$2')),
                    ),
                    ts.factory.createTypeReferenceNode(
                      ts.factory.createQualifiedName(
                        ts.factory.createIdentifier('z'),
                        ts.factory.createIdentifier('infer'),
                      ),
                      [
                        ts.factory.createTypeQueryNode(
                          ts.factory.createIdentifier(safeRequestBodySchemaName.data),
                          undefined,
                        ),
                      ],
                    ),
                  ),
                ]
              : []),
            // Optional parameters last
            ...(this.getParameters(safeMethodSchema, ['query'])?.map((parameter) =>
              this.buildPathParameter(schemas, parameter),
            ) ?? []),
            ...(this.getParameters(safeMethodSchema, ['header'])?.map((parameter) =>
              this.buildPathParameter(schemas, parameter),
            ) ?? []),
            this.createParameter('_', 'unknown', undefined, true),
          ],
          safeResponseBodySchemaName.success
            ? ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Promise'), [
                ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('AxiosResponse'), [
                  ts.factory.createTypeReferenceNode(
                    ts.factory.createQualifiedName(
                      ts.factory.createIdentifier('z'),
                      ts.factory.createIdentifier('infer'),
                    ),
                    [
                      ts.factory.createTypeQueryNode(
                        ts.factory.createIdentifier(safeResponseBodySchemaName.data),
                        undefined,
                      ),
                    ],
                  ),
                ]),
              ])
            : undefined,
          ts.factory.createBlock(
            [
              // START OF THE METHOD

              ...(safeRequestBodySchemaName.success
                ? [
                    ts.factory.createVariableStatement(
                      undefined,
                      ts.factory.createVariableDeclarationList(
                        [
                          ts.factory.createVariableDeclaration(
                            ts.factory.createIdentifier('safeData'),
                            undefined,
                            undefined,
                            ts.factory.createCallExpression(
                              ts.factory.createPropertyAccessExpression(
                                ts.factory.createIdentifier(safeRequestBodySchemaName.data),
                                ts.factory.createIdentifier('parse'),
                              ),
                              undefined,
                              [
                                ts.factory.createIdentifier(
                                  this.sanitizeIdentifier(
                                    this.toCamelCase(
                                      safeRequestBodySchemaName.data.replace(/([a-z])([A-Z])/g, '$1-$2'),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        ts.NodeFlags.Const,
                      ),
                    ),
                  ]
                : []),
              // TODO: Add safe parsing of all other params
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
                            ts.factory.createPrivateIdentifier('#makeApiRequest'),
                          ),
                          undefined,
                          [
                            ts.factory.createStringLiteral(method, true),
                            this.hasNoPathParams(path)
                              ? ts.factory.createStringLiteral(path, true)
                              : ts.factory.createCallExpression(
                                  ts.factory.createCallExpression(ts.factory.createIdentifier('compile'), undefined, [
                                    ts.factory.createStringLiteral(path.replace(/\{([^}]+)\}/g, ':$1'), true),
                                  ]),
                                  undefined,
                                  [
                                    ts.factory.createObjectLiteralExpression(
                                      this.getParameters(safeMethodSchema, ['path'])?.map(({name}) => {
                                        return ts.factory.createPropertyAssignment(
                                          ts.factory.createIdentifier(name),
                                          ts.factory.createCallExpression(
                                            ts.factory.createIdentifier('String'),
                                            undefined,
                                            [ts.factory.createIdentifier(name)],
                                          ),
                                        );
                                      }) ?? [],
                                      true,
                                    ),
                                  ],
                                ),

                            // params
                            ...(() => {
                              const queryStringParams = this.getParameters(safeMethodSchema, ['query']);

                              if (!queryStringParams) {
                                return [];
                              }

                              return [
                                ts.factory.createObjectLiteralExpression(
                                  queryStringParams.map((param) => {
                                    return ts.factory.createPropertyAssignment(
                                      ts.factory.createIdentifier(param.name),
                                      ts.factory.createCallExpression(
                                        ts.factory.createIdentifier('String'),
                                        undefined,
                                        [ts.factory.createIdentifier(param.name)],
                                      ),
                                    );
                                  }),
                                  true,
                                ),
                              ];
                            })(),
                            // headers
                            ...(() => {
                              const headerParams = this.getParameters(safeMethodSchema, ['header']);

                              if (!headerParams) {
                                return [];
                              }

                              return [
                                ts.factory.createObjectLiteralExpression(
                                  headerParams.map((param) => {
                                    return ts.factory.createShorthandPropertyAssignment(
                                      ts.factory.createIdentifier(param.name),
                                      undefined,
                                    );
                                  }),
                                ),
                              ];
                            })(),
                            // data
                            ...(safeRequestBodySchemaName.success ? [ts.factory.createIdentifier('safeData')] : []),
                          ],
                        ),
                      ),
                    ),
                  ],
                  ts.NodeFlags.Const,
                ),
              ),
              ...(safeResponseBodySchemaName.success
                ? [
                    ts.factory.createVariableStatement(
                      undefined,
                      ts.factory.createVariableDeclarationList(
                        [
                          ts.factory.createVariableDeclaration(
                            ts.factory.createIdentifier('safeResponseData'),
                            undefined,
                            undefined,
                            ts.factory.createCallExpression(
                              ts.factory.createPropertyAccessExpression(
                                ts.factory.createIdentifier(safeResponseBodySchemaName.data),
                                ts.factory.createIdentifier('parse'),
                              ),
                              undefined,
                              [
                                ts.factory.createPropertyAccessExpression(
                                  ts.factory.createIdentifier('response'),
                                  ts.factory.createIdentifier('data'),
                                ),
                              ],
                            ),
                          ),
                        ],
                        ts.NodeFlags.Const,
                      ),
                    ),
                    ts.factory.createReturnStatement(
                      ts.factory.createObjectLiteralExpression(
                        [
                          ts.factory.createSpreadAssignment(ts.factory.createIdentifier('response')),
                          ts.factory.createPropertyAssignment(
                            ts.factory.createIdentifier('data'),
                            ts.factory.createIdentifier('safeResponseData'),
                          ),
                        ],
                        true,
                      ),
                    ),
                  ]
                : [ts.factory.createReturnStatement(ts.factory.createIdentifier('response'))]),

              // END OF THE METHOD
            ],
            true,
          ),
        );
      });

      return endpoints.concat(...methods);
    }, []);

    const safeBaseUrl = z.string().safeParse(openapi.servers?.[0]?.url);

    const defaultBaseUrl = safeBaseUrl.success
      ? [
          ts.addSyntheticTrailingComment(
            ts.factory.createIdentifier('\n'),
            ts.SyntaxKind.SingleLineCommentTrivia,
            ' Default base URL',
            true,
          ),
          ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
              [
                ts.factory.createVariableDeclaration(
                  ts.factory.createIdentifier('defaultBaseUrl'),
                  undefined,
                  undefined,
                  ts.factory.createStringLiteral(safeBaseUrl.data, true),
                ),
              ],
              ts.NodeFlags.Const,
            ),
          ),
        ]
      : [];

    const clientHelperName = openapi.info.title
      .split(/[^a-zA-Z0-9]/g)
      .map((word) => this.toPascalCase(word))
      .join('');

    const clientHelper = ts.factory.createClassDeclaration(
      [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createIdentifier(clientHelperName),
      undefined,
      undefined,
      [
        // Properties
        // Private properties
        this.createProperty('#baseUrl', 'string', true),

        // Methods
        // Constructor
        ts.factory.createConstructorDeclaration(
          undefined,
          [
            this.createParameter(
              'baseUrl',
              'string',
              defaultBaseUrl.length > 0 ? ts.factory.createIdentifier('defaultBaseUrl') : undefined,
            ),
            this.createParameter('_', 'unknown', undefined, true),
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
        ),
        // TODO: Refactor this, it's a mess right now :(
        // #makeApiRequest(method, path, data)
        ts.factory.createMethodDeclaration(
          [ts.factory.createToken(ts.SyntaxKind.AsyncKeyword)],
          undefined,
          ts.factory.createPrivateIdentifier('#makeApiRequest'),
          undefined,
          [this.createGenericType('T')],
          [
            this.createParameter('method', 'string'),
            this.createParameter('path', 'string'),
            this.createParameter(
              'headers',
              ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Record'), [
                ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('PropertyKey'), undefined),
                ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
              ]),
              ts.factory.createObjectLiteralExpression([], false),
            ),
            this.createParameter(
              'params',
              ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Record'), [
                ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('PropertyKey'), undefined),
                ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
              ]),
              ts.factory.createObjectLiteralExpression([], false),
            ),
            this.createParameter('data', 'unknown', undefined, true),
            this.createParameter('_', 'unknown', undefined, true),
          ],
          ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Promise'), [
            ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('AxiosResponse'), [
              ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T'), undefined),
            ]),
          ]),
          ts.factory.createBlock(
            [
              ts.factory.createReturnStatement(
                ts.factory.createCallExpression(
                  ts.factory.createIdentifier('axios'),
                  [ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('T'), undefined)],
                  [
                    ts.factory.createObjectLiteralExpression(
                      [
                        ts.factory.createShorthandPropertyAssignment(ts.factory.createIdentifier('method'), undefined),
                        ts.factory.createPropertyAssignment(
                          ts.factory.createIdentifier('url'),
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
                        ts.factory.createShorthandPropertyAssignment(ts.factory.createIdentifier('params'), undefined),
                        ts.factory.createShorthandPropertyAssignment(ts.factory.createIdentifier('data'), undefined),
                        ts.factory.createPropertyAssignment(
                          ts.factory.createIdentifier('headers'),
                          ts.factory.createObjectLiteralExpression(
                            [
                              ts.factory.createPropertyAssignment(
                                ts.factory.createStringLiteral('Content-Type', true),
                                ts.factory.createStringLiteral('application/json', true),
                              ),
                              ts.factory.createSpreadAssignment(ts.factory.createIdentifier('headers')),
                            ],
                            true,
                          ),
                        ),
                      ],
                      true,
                    ),
                  ],
                ),
              ),
            ],
            true,
          ),
        ),
        ...paths,
      ],
    );

    return [
      ts.addSyntheticTrailingComment(
        ts.factory.createIdentifier('\n'),
        ts.SyntaxKind.SingleLineCommentTrivia,
        ' Imports',
        true,
      ),
      importFromAxios,
      importFromZod,
      importFromPathToRegexp,

      ts.addSyntheticTrailingComment(
        ts.factory.createIdentifier('\n'),
        ts.SyntaxKind.SingleLineCommentTrivia,
        ' Components schemas',
        true,
      ),
      ...Object.values(schemas),

      ...defaultBaseUrl,

      ts.addSyntheticTrailingComment(
        ts.factory.createIdentifier('\n'),
        ts.SyntaxKind.SingleLineCommentTrivia,
        ' Client class',
        true,
      ),
      clientHelper,
    ];
  }

  buildCode(openapi: Zod.infer<typeof OpenApiSpec>): string {
    const file = ts.createSourceFile(this._target, '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);

    const nodes = this.buildAST(openapi);

    return this._printer.printList(ts.ListFormat.MultiLine, ts.factory.createNodeArray(nodes), file);
  }

  writeFile(title: string, version: string, source: string) {
    writeFileSync(
      this._target,
      [
        '// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.',
        `// Built with ${this._name}@${this._version}`,
        `// Latest edit: ${new Date().toUTCString()}`,
        `// Source file: ${this._input}`,
        `// API: ${title} v${version}`,
        '/* eslint-disable */',
        '// @ts-nocheck',
        source,
      ].join('\n'),
    );
  }

  run(): number {
    try {
      const rawSource = this.readFile();
      const openapi = this.parseFile(rawSource);
      const code = this.buildCode(openapi);

      this.writeFile(openapi.info.title, openapi.info.version, code);

      return 0;
    } catch (error) {
      if (error instanceof Error) {
        this._reporter.error(error.message);
      }

      return 1;
    }
  }
}

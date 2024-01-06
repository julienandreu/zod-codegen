import { readFileSync, writeFileSync, } from 'fs';
import { Reporter } from './utils/reporter';
import { resolve } from 'path';
import { load } from 'js-yaml';
import { OpenApiSpec, SchemaProperties } from './openapi';
import ts from 'typescript';
import { z } from 'zod';

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
    this._printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
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
    const [
      defaultImport,
      isDefaultImportTypeImport = false,
    ] = Object.entries(safeOptions.defaultImport ?? {})[0];
    const { success: hasDefaultImport } = z.string().safeParse(defaultImport);

    const safeNameImports = ImportedElement.safeParse(safeOptions.namedImports);
    const namedImportList = safeNameImports.success
      ? Object.entries(safeNameImports.data)
      : [];

    return ts.factory.createImportDeclaration(
      undefined,
      ts.factory.createImportClause(
        isDefaultImportTypeImport,
        hasDefaultImport
          ? ts.factory.createIdentifier(defaultImport)
          : undefined,
        namedImportList.length > 0
          ? ts.factory.createNamedImports(
            namedImportList.map(([name, isTypeImport = false]) => {
              return ts.factory.createImportSpecifier(
                isTypeImport,
                undefined,
                ts.factory.createIdentifier(name)
              );
            }),
          )
          : undefined,
      ),
      ts.factory.createStringLiteral(target, true),
      undefined
    );
  }

  debugAST(...nodes: ts.Node[]) {
    const debugFile = ts.createSourceFile(
      this._target,
      '',
      ts.ScriptTarget.Latest,
      false,
      ts.ScriptKind.TS
    );
    console.log(this._printer.printList(
      ts.ListFormat.SourceFileStatements,
      ts.factory.createNodeArray(nodes),
      debugFile,
    ));
  }

  static ZodAST = z.object({
    type: z.enum(['string', 'number', 'boolean', 'object']),
    args: z.array(z.unknown()).optional(),
  });

  buildZodAST(input: (string | z.infer<typeof Generator.ZodAST>)[]) {
    const [initial, ...rest] = input;

    const safeInitial = Generator.ZodAST.safeParse(initial);

    const initialExpression = !safeInitial.success
      ? ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier('z'),
          ts.factory.createIdentifier(String(initial)),
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
          ts.factory.createPropertyAccessExpression(
            expression,
            ts.factory.createIdentifier(String(exp)),
          ),
          undefined,
          [],
        )
        : ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(
            expression,
            ts.factory.createIdentifier(safeExp.data.type),
          ),
          undefined,
          (safeExp.data.args ?? []) as ts.Expression[],
        );
    }, initialExpression);

    return rootExpression;
  }

  // TODO: Extract methods to build each type of property
  // eslint-disable-next-line complexity
  buildProperty(property: unknown, required = false) {
    const safeProperty = SchemaProperties.parse(property);
    switch (safeProperty.type) {
      case 'object':
        return this.buildZodAST([
          {
            type: 'object',
            args: [
              ts.factory.createObjectLiteralExpression(
                Object.entries(safeProperty.properties ?? {})
                  .map(([name, property]): ts.ObjectLiteralElementLike => {
                    return ts.factory.createPropertyAssignment(
                      ts.factory.createIdentifier(name),
                      this.buildProperty(property, safeProperty.required?.includes(name) ?? false),
                    );
                  }),
                true,
              )
            ],
          },
          ...(!required ? ['optional'] : []),
        ]);
      case 'integer':
        return this.buildZodAST([
          'number',
          'int',
          ...(!required ? ['optional'] : []),
        ]);
      case 'string':
        return this.buildZodAST([
          'string',
          ...(!required ? ['optional'] : []),
        ]);
      case 'boolean':
        return this.buildZodAST([
          'boolean',
          ...(!required ? ['optional'] : []),
        ]);
      default:
        return this.buildZodAST([
          'boolean',
          ...(!required ? ['optional'] : []),
        ]);
    }
  }

  buildSchema(schema: unknown) {
    const safeCategorySchema = SchemaProperties.safeParse(schema);
    if (safeCategorySchema.success) {
      const safeCategory = safeCategorySchema.data;
      return this.buildProperty(safeCategory, true);
    }

    throw safeCategorySchema.error;
  }

  buildAST(openapi: Zod.infer<typeof OpenApiSpec>) {
    const importFromAxios = this.createImport(
      'axios',
      {
        defaultImport: {
          axios: false,
        },
        namedImports: {
          AxiosResponse: true,
        }
      }
    );

    const importFromZod = this.createImport(
      'zod',
      {
        defaultImport: {
          z: false,
        }
      }
    );

    const schemas = Object.entries(openapi.components?.schemas ?? {})
      .map(([name, schema]) => {
        return ts.factory.createVariableStatement(
          undefined,
          ts.factory.createVariableDeclarationList(
            [
              ts.factory.createVariableDeclaration(
                ts.factory.createIdentifier(name),
                undefined,
                undefined,
                this.buildSchema(schema)
              ),
            ],
            ts.NodeFlags.Const
          )
        );
      });

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
            ts.NodeFlags.Const
          )
        ),
      ]
      : [];

    const clientHelperName = openapi.info.title
      .split(/[^a-zA-Z0-9]/g)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    const clientHelper = ts.factory.createClassDeclaration(
      [
        ts.factory.createToken(ts.SyntaxKind.ExportKeyword)
      ],
      ts.factory.createIdentifier(clientHelperName),
      undefined,
      undefined,
      [
        // Properties
        // Private properties
        ts.factory.createPropertyDeclaration(
          [
            ts.factory.createToken(ts.SyntaxKind.ReadonlyKeyword)
          ],
          ts.factory.createPrivateIdentifier('#baseUrl'),
          undefined,
          ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
          undefined,
        ),
        // Constructor
        ts.factory.createConstructorDeclaration(
          undefined,
          [
            ts.factory.createParameterDeclaration(
              undefined,
              undefined,
              ts.factory.createIdentifier('baseUrl'),
              undefined,
              ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
              defaultBaseUrl.length > 0
                ? ts.factory.createIdentifier('defaultBaseUrl')
                : undefined,
            )
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
        // Methods
        // TODO: Refactor this, it's a mess right now :(
        // #makeApiRequest(method, path, data)
        ts.factory.createMethodDeclaration(
          [
            ts.factory.createToken(ts.SyntaxKind.AsyncKeyword)
          ],
          undefined,
          ts.factory.createPrivateIdentifier('#makeApiRequest'),
          undefined,
          [
            ts.factory.createTypeParameterDeclaration(
              undefined,
              ts.factory.createIdentifier('T'),
              undefined,
              undefined
            )
          ],
          [
            ts.factory.createParameterDeclaration(
              undefined,
              undefined,
              ts.factory.createIdentifier('method'),
              undefined,
              ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
              undefined
            ),
            ts.factory.createParameterDeclaration(
              undefined,
              undefined,
              ts.factory.createIdentifier('path'),
              undefined,
              ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
              undefined
            ),
            ts.factory.createParameterDeclaration(
              undefined,
              undefined,
              ts.factory.createIdentifier('data'),
              ts.factory.createToken(ts.SyntaxKind.QuestionToken),
              ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
              undefined
            )
          ],
          ts.factory.createTypeReferenceNode(
            ts.factory.createIdentifier('Promise'),
            [
              ts.factory.createTypeReferenceNode(
                ts.factory.createIdentifier('AxiosResponse'),
                [
                  ts.factory.createTypeReferenceNode(
                    ts.factory.createIdentifier('T'),
                    undefined
                  )]
              )]
          ),
          ts.factory.createBlock(
            [
              ts.factory.createReturnStatement(ts.factory.createCallExpression(
                ts.factory.createIdentifier('axios'),
                [
                  ts.factory.createTypeReferenceNode(
                    ts.factory.createIdentifier('T'),
                    undefined
                  )
                ],
                [
                  ts.factory.createObjectLiteralExpression(
                    [
                      ts.factory.createShorthandPropertyAssignment(
                        ts.factory.createIdentifier('method'),
                        undefined
                      ),
                      ts.factory.createPropertyAssignment(
                        ts.factory.createIdentifier('url'),
                        ts.factory.createTemplateExpression(
                          ts.factory.createTemplateHead(
                            '',
                            ''
                          ),
                          [
                            ts.factory.createTemplateSpan(
                              ts.factory.createPropertyAccessExpression(
                                ts.factory.createThis(),
                                ts.factory.createPrivateIdentifier('#baseUrl')
                              ),
                              ts.factory.createTemplateMiddle(
                                '',
                                ''
                              )
                            ),
                            ts.factory.createTemplateSpan(
                              ts.factory.createIdentifier('path'),
                              ts.factory.createTemplateTail(
                                '',
                                ''
                              )
                            )
                          ]
                        )
                      ),
                      ts.factory.createShorthandPropertyAssignment(
                        ts.factory.createIdentifier('data'),
                        undefined
                      ),
                      ts.factory.createPropertyAssignment(
                        ts.factory.createIdentifier('headers'),
                        ts.factory.createObjectLiteralExpression(
                          [
                            ts.factory.createPropertyAssignment(
                              ts.factory.createStringLiteral('Content-Type'),
                              ts.factory.createStringLiteral('application/json')
                            )
                          ],
                          true
                        )
                      )
                    ],
                    true
                  )]
              ))
            ],
            true
          ),
        ),
      ]
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

      ts.addSyntheticTrailingComment(
        ts.factory.createIdentifier('\n'),
        ts.SyntaxKind.SingleLineCommentTrivia,
        ' Components schemas',
        true,
      ),
      ...schemas,

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
    const file = ts.createSourceFile(
      this._target,
      '',
      ts.ScriptTarget.Latest,
      false,
      ts.ScriptKind.TS
    );

    const nodes = this.buildAST(openapi);

    return this._printer.printList(
      ts.ListFormat.MultiLine,
      ts.factory.createNodeArray(nodes),
      file,
    );
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
        source,
      ].join('\n')
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
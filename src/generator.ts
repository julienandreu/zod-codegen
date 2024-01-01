/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import SwaggerParser from '@apidevtools/swagger-parser';
import { mkdirSync, writeFileSync } from 'fs';
import type { OpenAPI, OpenAPIV3 } from 'openapi-types';
import { Reporter } from './utils/reporter';
import {
  createPrinter,
  createSourceFile,
  EmitHint,
  factory,
  NewLineKind,
  NodeFlags,
  Printer,
  ScriptKind,
  ScriptTarget,
  SourceFile,
  SyntaxKind,
} from 'typescript';
import { resolve } from 'path';

export class Generator {
  private _printer: Printer;

  constructor(
    private _reporter: Reporter,
    private _input: string,
    private _output: string
  ) {
    this._printer = createPrinter({ newLine: NewLineKind.LineFeed });
  }

  parseOpenApiV3Doc(
    _$refs: SwaggerParser.$Refs,
    _doc: OpenAPIV3.Document,
  ) {
    return {
      imports: {},
      queryKeys: {},
      requests: {},
      queries: {},
      mutations: {},
      types: {},
    };
  }

  parse(
    $refs: SwaggerParser.$Refs,
    doc: OpenAPI.Document,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    return this.parseOpenApiV3Doc($refs, doc as any);
  }

  buildSource(_data: Record<PropertyKey, unknown>): SourceFile {
    return factory.createSourceFile(
      [
        factory.createTypeAliasDeclaration(
          [factory.createToken(SyntaxKind.ExportKeyword)],
          factory.createIdentifier('Uuid'),
          undefined,
          factory.createTypeReferenceNode('string')
        ),
      ],
      factory.createToken(SyntaxKind.EndOfFileToken),
      NodeFlags.None
    );
  }

  buildFile(data: Record<PropertyKey, unknown>): string {
    const completePath = resolve(this._output, 'type.ts');

    const file = createSourceFile(
      completePath,
      '',
      ScriptTarget.Latest,
      false,
      ScriptKind.TS
    );

    const result = this._printer.printNode(
      EmitHint.Unspecified,
      this.buildSource(data),
      file
    );

    return result;
  }

  parseRef(parser: SwaggerParser, path: string, depth = 0): any {
    try {
      if (depth > 10) {
        return {};
      }

      const ref = parser.$refs.get(path);

      if (ref.type === 'object') {
        const properties = ref.properties as any[];
        const required = ref.required as any[];

        const refProps = Object.entries(properties).reduce((flatRefProps, [refKey, refValue]) => {
          const refRequired = required.includes(refKey);

          if (typeof refValue.type === 'undefined') {
            const nestedRef = refValue.allOf[0].$ref;
            const nestedRefProps = this.parseRef(parser, String(nestedRef), depth + 1);

            return {
              ...flatRefProps,
              [refKey]: {
                required: refRequired,
                ...nestedRefProps,
              },
            };
          }

          return {
            ...flatRefProps,
            [refKey]: {
              required: refRequired,
              type: refValue.type,
            },
          };
        }, {});

        return {
          $refs: ref,
          ...refProps,
        };
      }

      return {
        ...ref,
      };
    } catch (_) {
      return {};
    }
  }

  async run(name: string, version: string): Promise<number> {
    try {
      const parser = new SwaggerParser();
      const api = await parser.bundle(this._input);
      const paths = { ...api.paths };
      const [endpoint, path] = Object.entries(paths)[0];
      const { parameters, ...verbs } = path as any;
      const { post } = verbs;
      const { operationId, requestBody } = post as any;
      const bodySchema = requestBody.$ref;
      const schema = parser.$refs.get(String(bodySchema));
      const request = schema.content['application/json'].schema.allOf as any[];
      const fields = request.reduce((flatFields, field) => {
        const props = Object.entries(field).reduce((flatProps, [key, value]) => {
          if (key === '$ref') {
            const ref = this.parseRef(parser, String(value));

            return {
              ...flatProps,
              ...ref,
            };
          }

          return {
            ...flatProps,
            [key]: value,
          };
        }, {});

        return {
          ...flatFields,
          ...props,
        };
      }, {});

      console.dir({
        endpoint,
        post: {
          operationId,
          fields,
        },
      }, { depth: null });

      process.exit(0);

      this._reporter.log('API name: %s, Version: %s', api.info.title, api.info.version);

      const data = this.parse(parser.$refs, api);
      const source = this.buildFile(data);

      mkdirSync(this._output, { recursive: true });
      writeFileSync(
        resolve(this._output, 'type.ts'),
        [
          '// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.',
          `// Built with ${name}@${version}`,
          `// Latest edit: ${new Date().toUTCString()}`,
          `// Source file: ${this._input}`,
          `// API: ${api.info.title} v${api.info.version}`,
          null,
          source
        ].join('\n')
      );

      return 0;
    } catch (error) {
      if (error instanceof Error) {
        this._reporter.error(error.message);
      }

      return 1;
    }
  }
}
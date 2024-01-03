import SwaggerParser from '@apidevtools/swagger-parser';
import { mkdirSync, } from 'fs';
import { Reporter } from './utils/reporter';
import { resolve } from 'path';
import openapiTS from 'openapi-typescript';
import { factory, NewLineKind, Printer, ScriptKind, ScriptTarget, createPrinter, createSourceFile } from 'typescript';

export class Generator {
  private _printer: Printer;

  constructor(
    private _reporter: Reporter,
    private _input: string,
    private _output: string,
  ) {
    this._printer = createPrinter({
      newLine: NewLineKind.LineFeed,
      removeComments: false,
    });
  }

  async run(name: string, version: string): Promise<number> {
    try {
      const parser = new SwaggerParser();
      const api = await parser.bundle(this._input);

      this._reporter.log('API name: %s, Version: %s', api.info.title, api.info.version);
      this._reporter.log('Built with: %s@%s', name, version);

      const rst = await openapiTS(this._input, {
        additionalProperties: true,
        alphabetize: true,
        defaultNonNullable: true,
        emptyObjectsUnknown: true,
        excludeDeprecated: true,
        exportType: true,
        pathParamsAsTypes: true,
        silent: false,
      });

      const sourceFile = createSourceFile(
        resolve(this._output, 'type.ts'),
        '',
        ScriptTarget.ESNext,
        false,
        ScriptKind.TS,
      );

      // @ts-expect-error it’s OK to overwrite statements once
      sourceFile.statements = factory.createNodeArray(
        Array.isArray(rst) ? rst : [rst],
      );

      mkdirSync(this._output, { recursive: true });

      this._printer.printFile(sourceFile);

      // writeFileSync(
      //   resolve(this._output, 'type.ts'),
      //   [
      //     '// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.',
      //     `// Built with ${name}@${version}`,
      //     `// Latest edit: ${new Date().toUTCString()}`,
      //     `// Source file: ${this._input}`,
      //     `// API: ${api.info.title} v${api.info.version}`,
      //     null,
      //     sourceFile.text,
      //   ].join('\n')
      // );

      return 0;
    } catch (error) {
      if (error instanceof Error) {
        this._reporter.error(error.message);
      }

      return 1;
    }
  }
}
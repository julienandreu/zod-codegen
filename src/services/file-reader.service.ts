import {readFileSync} from 'node:fs';
import {load} from 'js-yaml';
import type {OpenApiFileParser, OpenApiFileReader} from '../interfaces/file-reader.js';
import type {OpenApiSpecType} from '../types/openapi.js';
import {OpenApiSpec} from '../types/openapi.js';

export class SyncFileReaderService implements OpenApiFileReader {
  readFile(path: string): string {
    return readFileSync(path, 'utf8');
  }
}

export class OpenApiFileParserService implements OpenApiFileParser<OpenApiSpecType> {
  parse(input: unknown): OpenApiSpecType {
    let parsedInput: unknown;

    if (typeof input === 'string') {
      try {
        parsedInput = JSON.parse(input);
      } catch {
        parsedInput = load(input);
      }
    } else {
      parsedInput = input;
    }

    return OpenApiSpec.parse(parsedInput);
  }
}

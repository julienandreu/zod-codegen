import {readFileSync} from 'node:fs';
import {load} from 'js-yaml';
import type {OpenApiFileParser, OpenApiFileReader} from '../interfaces/file-reader.js';
import type {OpenApiSpecType} from '../types/openapi.js';
import {OpenApiSpec} from '../types/openapi.js';

export class SyncFileReaderService implements OpenApiFileReader {
  async readFile(path: string): Promise<string> {
    // Check if path is a URL
    try {
      const url = new URL(path);
      // If it's a valid URL, fetch it
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch ${path}: ${String(response.status)} ${response.statusText}`);
      }
      return await response.text();
    } catch {
      // If URL parsing fails, treat it as a local file path
      return readFileSync(path, 'utf8');
    }
  }
}

export class OpenApiFileParserService implements OpenApiFileParser<OpenApiSpecType> {
  parse(input: unknown): OpenApiSpecType {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const parsedInput =
      typeof input === 'string'
        ? (() => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return JSON.parse(input);
            } catch {
              return load(input);
            }
          })()
        : input;

    return OpenApiSpec.parse(parsedInput);
  }
}

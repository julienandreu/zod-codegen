import { load } from 'js-yaml';
import { readFileSync } from 'node:fs';
import type { OpenApiFileParser, OpenApiFileReader } from '../interfaces/file-reader';
import type { OpenApiSpecType } from '../types/openapi';
import { OpenApiSpec } from '../types/openapi';

export class SyncFileReaderService implements OpenApiFileReader {
  private isUrl(path: string): boolean {
    try {
      const url = new URL(path);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  async readFile(path: string): Promise<string> {
    if (this.isUrl(path)) {
      return await this.fetchUrl(path);
    }

    return readFileSync(path, 'utf8');
  }

  private async fetchUrl(path: string): Promise<string> {
    const url = new URL(path);

    const headers: Record<string, string> = {};
    if (url.username || url.password) {
      const credentials = `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`;
      headers['Authorization'] = `Basic ${btoa(credentials)}`;
      url.username = '';
      url.password = '';
    }

    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${path}: ${String(response.status)} ${response.statusText}`);
    }

    return await response.text();
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

import { CORE_SCHEMA, intCoreTag, load, mergeTag, NOT_RESOLVED } from 'js-yaml';
import { readFileSync } from 'node:fs';
import type { OpenApiFileParser, OpenApiFileReader } from '../interfaces/file-reader';
import type { OpenApiSpecType } from '../types/openapi';
import { OpenApiSpec } from '../types/openapi';

// js-yaml 5 loads plain YAML 1.2 core. Re-add what js-yaml 4 also accepted, so specs keep
// generating the same code: merge keys (`<<`) and binary or signed hex/octal integers.
const LEGACY_INTEGER = /^([-+]?)0(?:b([01]+)|o([0-7]+)|x([0-9a-fA-F]+))$/;

const legacyIntTag = {
  ...intCoreTag,
  resolve: (source: string, isExplicit: boolean, tagName: string): number | typeof NOT_RESOLVED => {
    const resolved = intCoreTag.resolve(source, isExplicit, tagName);
    const match = resolved === NOT_RESOLVED ? LEGACY_INTEGER.exec(source) : null;
    if (!match) {
      return resolved;
    }

    const [, sign = '', binary, octal, hex = ''] = match;
    const value = binary !== undefined ? parseInt(binary, 2) : octal !== undefined ? parseInt(octal, 8) : parseInt(hex, 16);
    return sign === '-' ? -value : value;
  }
};

const YAML_SCHEMA = CORE_SCHEMA.withTags(mergeTag, legacyIntTag);

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
              return load(input, { schema: YAML_SCHEMA });
            }
          })()
        : input;

    return OpenApiSpec.parse(parsedInput);
  }
}

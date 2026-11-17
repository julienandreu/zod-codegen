import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { describe, expect, it } from 'vitest';
import { TypeScriptCodeGeneratorService } from '../../src/services/code-generator.service';
import type { OpenApiSpecType } from '../../src/types/openapi';
import Pet, * as generated from '../fixtures/name-collisions/api';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Schema names that collide with globals, generated names, the client class and each other.
const fixtureDir = join(__dirname, '../fixtures/name-collisions');
const fixtureFile = join(fixtureDir, 'api.ts');

const fixtureHeader = [
  '// Generated from openapi.json by tests/integration/name-collisions.test.ts.',
  '// Update with `npx vitest run tests/integration/name-collisions.test.ts -u`.',
  '/* eslint-disable */',
  '// @ts-nocheck',
  ''
].join('\n');

describe('Generated names', () => {
  it('matches the committed fixture', async () => {
    const spec = JSON.parse(readFileSync(join(fixtureDir, 'openapi.json'), 'utf-8')) as OpenApiSpecType;
    const generatedCode = fixtureHeader + new TypeScriptCodeGeneratorService().generate(spec);
    const formatted = await format(generatedCode, { ...(await resolveConfig(fixtureFile)), filepath: fixtureFile });

    await expect(formatted).toMatchFileSnapshot(fixtureFile);
  });

  it('renames colliding schemas, keeping names that do not collide', () => {
    expect(Object.keys(generated).sort()).toEqual([
      'ErrorSchema',
      'ErrorSchema2',
      'GetPetResponse',
      'HttpError',
      'Node',
      'PetSchema',
      'RegExpSchema',
      'ResponseValidationError',
      'SearchResponse',
      'SendOperationResponse',
      'StringSchema',
      'default',
      'defaultBaseUrl',
      'pet_item',
      'pet_itemSchema',
      'serverConfigurations'
    ]);
  });

  it('points every reference at the renamed schema', () => {
    expect(generated.ErrorSchema2.safeParse({ message: 'boom', cause: 'why' }).success).toBe(true);
    expect(generated.ErrorSchema2.safeParse({ message: 'boom', cause: 1 }).success).toBe(false);
    expect(generated.PetSchema.safeParse({ item: { name: 'Rex' } }).success).toBe(true);
    expect(generated.PetSchema.safeParse({ item: { name: 1 } }).success).toBe(false);
    expect(generated.Node.safeParse({ next: { next: {} } }).success).toBe(true);
  });

  it('renames parameters that would shadow a module-level name', async () => {
    const calls: string[] = [];
    const fetch = (input: string | URL | Request): Promise<Response> => {
      calls.push(String(input));
      return Promise.resolve(new Response(JSON.stringify('created'), { status: 201, headers: { 'Content-Type': 'application/json' } }));
    };

    // The 201 schema is a string, reached through `z.union`, which a parameter named `z` would shadow.
    await expect(new Pet({ fetch }).getPet('rex', 'mammal')).resolves.toBe('created');
    expect(calls).toEqual(['https://api.example.com/pets/rex?class=mammal']);
  });

  it('gives every parameter of an operation a distinct name, also next to its response names', async () => {
    const calls: string[] = [];
    const fetch = (input: string | URL | Request): Promise<Response> => {
      calls.push(String(input));
      return Promise.resolve(new Response(JSON.stringify('found'), { headers: { 'Content-Type': 'application/json' } }));
    };

    // `z` must not take `zParam` from the parameter actually named zParam, and `SearchResponse` must not shadow the schema.
    await expect(new Pet({ fetch }).search('a', 'b', 'c')).resolves.toBe('found');
    expect(calls).toEqual(['https://api.example.com/search?z=a&zParam=b&SearchResponse=c']);
  });

  it('renames operations named like client methods, which keep working', async () => {
    const calls: string[] = [];
    const fetch = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      calls.push(`${init?.method ?? 'GET'} ${String(input)}`);
      return Promise.resolve(
        init?.method === 'POST' ? new Response(JSON.stringify('sent'), { headers: { 'Content-Type': 'application/json' } }) : new Response(null, { status: 204 })
      );
    };
    const api = new Pet({ fetch });

    await expect(api.sendOperation()).resolves.toBe('sent');
    await expect(api.readBodyOperation()).resolves.toBeUndefined();
    await expect(api.handleResponseOperation()).resolves.toBeUndefined();
    await expect(api.getBaseRequestOptionsOperation()).resolves.toBeUndefined();
    await expect(api.constructorOperation()).resolves.toBeUndefined();
    // One fetch per call: the runtime send and readBody were not replaced by the endpoints.
    expect(calls).toEqual([
      'POST https://api.example.com/send',
      'GET https://api.example.com/read-body',
      'GET https://api.example.com/handle-response',
      'GET https://api.example.com/base-options',
      'GET https://api.example.com/constructor'
    ]);
  });

  it.skipIf(!process.features.typescript)('loads under Node type stripping', () => {
    const script = `await import(${JSON.stringify(pathToFileURL(fixtureFile).href)});`;

    expect(() => execFileSync(process.execPath, ['--input-type=module', '--eval', script], { encoding: 'utf-8', stdio: 'pipe' })).not.toThrow();
  });
});

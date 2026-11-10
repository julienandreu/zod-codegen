import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TypeScriptCodeGeneratorService } from '../../src/services/code-generator.service';
import type { OpenApiSpecType } from '../../src/types/openapi';
import PetAPI, { ResponseValidationError } from '../fixtures/error-schema/api';

const __dirname = dirname(fileURLToPath(import.meta.url));
// The spec's `Error` schema is the case that used to shadow the built-in Error in generated code.
const fixtureDir = join(__dirname, '../fixtures/error-schema');
const fixtureFile = join(fixtureDir, 'api.ts');

// The CLI writes the same last two lines; its build and date lines are left out so the fixture is stable.
const fixtureHeader = [
  '// Generated from openapi.json by tests/integration/generated-client.test.ts.',
  '// Update with `npx vitest run tests/integration/generated-client.test.ts -u`.',
  '/* eslint-disable */',
  '// @ts-nocheck',
  ''
].join('\n');

describe('Generated client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stubFetch = (body: unknown, init: ResponseInit = { status: 200 }): void => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { ...init, headers: { 'Content-Type': 'application/json' } })))
    );
  };

  it('matches the committed fixture that the type tests check', async () => {
    const spec = JSON.parse(readFileSync(join(fixtureDir, 'openapi.json'), 'utf-8')) as OpenApiSpecType;
    const generated = fixtureHeader + new TypeScriptCodeGeneratorService().generate(spec);
    const formatted = await format(generated, { ...(await resolveConfig(fixtureFile)), filepath: fixtureFile });

    await expect(formatted).toMatchFileSnapshot(fixtureFile);
  });

  it('rejects an invalid response body with ResponseValidationError carrying the body and the Zod issues', async () => {
    const body = { id: 'not-a-number' };
    stubFetch(body);
    const client = new PetAPI({ baseUrl: 'https://api.example.com' });

    const failure: unknown = await client.getPet(1).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ResponseValidationError);
    expect(failure).toBeInstanceOf(Error);
    const validation = failure as ResponseValidationError<unknown>;
    expect(validation.name).toBe('ResponseValidationError');
    expect(validation.message).toMatch(/^Invalid pet: /);
    expect(validation.response).toEqual(body);
    expect(validation.data).toBe(validation.response);
    // `response` stays an own field, so error serializers and loggers still see the body.
    expect(Object.hasOwn(validation, 'response')).toBe(true);
    expect(Object.keys(validation)).toContain('response');
    expect((JSON.parse(JSON.stringify(validation)) as { response: unknown }).response).toEqual(body);
    expect(validation.error.issues.map((issue) => issue.path.join('.'))).toEqual(['id', 'name']);
  });

  it('rejects a non-OK response with the built-in Error, not the Error schema', async () => {
    stubFetch({ message: 'boom' }, { status: 500, statusText: 'Internal Server Error' });
    const client = new PetAPI({ baseUrl: 'https://api.example.com' });

    const failure: unknown = await client.getPet(1).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect(failure).not.toBeInstanceOf(ResponseValidationError);
    expect((failure as Error).message).toBe('HTTP 500: Internal Server Error');
  });

  it('uses the first server URL when baseUrl is omitted', async () => {
    stubFetch({ id: 1, name: 'Rex' });
    const client = new PetAPI({});

    await expect(client.getPet(1)).resolves.toEqual({ id: 1, name: 'Rex' });
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('https://api.example.com/pets/1');
  });

  it.skipIf(!process.features.typescript)('loads under Node type stripping', () => {
    const script = `await import(${JSON.stringify(pathToFileURL(fixtureFile).href)});`;

    expect(() => execFileSync(process.execPath, ['--input-type=module', '--eval', script], { encoding: 'utf-8', stdio: 'pipe' })).not.toThrow();
  });
});

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TypeScriptCodeGeneratorService } from '../../src/services/code-generator.service';
import type { OpenApiSpecType } from '../../src/types/openapi';
import PetAPI, { GetInventoryResponse, HttpError, ResponseValidationError } from '../fixtures/error-schema/api';
import type { RequestOptions } from '../fixtures/error-schema/api';

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

interface FetchCall {
  url: string;
  init: RequestInit;
  thisArg: unknown;
}

// Serves the responses in order, one per call.
const mockFetch = (...responses: Response[]): { fetch: typeof globalThis.fetch; calls: FetchCall[] } => {
  const calls: FetchCall[] = [];
  const fetch = function (this: unknown, input: string | URL | Request, init: RequestInit = {}): Promise<Response> {
    calls.push({ url: String(input), init, thisArg: this });
    const response = responses[calls.length - 1];
    return response ? Promise.resolve(response) : Promise.reject(new Error('no more responses'));
  };
  return { fetch, calls };
};

const json = (body: unknown, init: ResponseInit = {}): Response => new Response(JSON.stringify(body), { status: 200, ...init, headers: { 'Content-Type': 'application/json' } });

const client = (...responses: Response[]): { api: PetAPI; calls: FetchCall[] } => {
  const { fetch, calls } = mockFetch(...responses);
  return { api: new PetAPI({ fetch }), calls };
};

const failureOf = async (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => undefined,
    (error: unknown) => error
  );

describe('Generated client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('matches the committed fixture that the type tests check', async () => {
    const spec = JSON.parse(readFileSync(join(fixtureDir, 'openapi.json'), 'utf-8')) as OpenApiSpecType;
    const generated = fixtureHeader + new TypeScriptCodeGeneratorService().generate(spec);
    const formatted = await format(generated, { ...(await resolveConfig(fixtureFile)), filepath: fixtureFile });

    await expect(formatted).toMatchFileSnapshot(fixtureFile);
  });

  describe('transport', () => {
    it('keeps the server base path and calls the injected fetch as a plain function', async () => {
      const { api, calls } = client(json({ id: 1, name: 'Rex' }));

      await expect(api.getPet(1)).resolves.toEqual({ id: 1, name: 'Rex' });
      expect(calls[0]?.url).toBe('https://api.example.com/v1/pets/1');
      // Browsers throw "Illegal invocation" when fetch is called as a method of another object.
      expect(calls[0]?.thisArg).toBeUndefined();
    });

    it('falls back to the global fetch', async () => {
      const { fetch, calls } = mockFetch(json({ id: 1, name: 'Rex' }));
      vi.stubGlobal('fetch', fetch);

      await expect(new PetAPI({}).getPet(1)).resolves.toEqual({ id: 1, name: 'Rex' });
      expect(calls).toHaveLength(1);
    });

    it('sends no Content-Type without a body', async () => {
      const { api, calls } = client(json({ id: 1, name: 'Rex' }));

      await api.getPet(1);

      expect(new Headers(calls[0]?.init.headers).has('Content-Type')).toBe(false);
    });

    it('sends JSON when the operation offers JSON and form bodies', async () => {
      const { api, calls } = client(json({ id: 1, name: 'Rex' }, { status: 201 }));

      await api.createPet({ id: 1, name: 'Rex' });

      expect(calls[0]?.init.method).toBe('POST');
      expect(new Headers(calls[0]?.init.headers).get('Content-Type')).toBe('application/json');
      expect(calls[0]?.init.body).toBe(JSON.stringify({ id: 1, name: 'Rex' }));
    });

    it('leaves out undefined query parameters', async () => {
      const { api, calls } = client(json([]), json([]));

      await api.listPets();
      await api.listPets('cat');

      expect(calls.map((call) => call.url)).toEqual(['https://api.example.com/v1/pets', 'https://api.example.com/v1/pets?tag=cat']);
    });

    it('lets handleResponse retry through send, and decodes only the final response', async () => {
      const unavailable = new Response('busy', { status: 503 });
      const { fetch, calls } = mockFetch(unavailable, json({ id: 1, name: 'Rex' }));

      class RetryingPetAPI extends PetAPI {
        protected override async handleResponse(response: Response, method: string, path: string, options: RequestOptions): Promise<Response> {
          return response.status === 503 ? this.send(method, path, options) : response;
        }
      }

      await expect(new RetryingPetAPI({ fetch }).getPet(1)).resolves.toEqual({ id: 1, name: 'Rex' });
      expect(calls).toHaveLength(2);
      expect(unavailable.bodyUsed).toBe(false);
    });
  });

  describe('decoding', () => {
    it('returns undefined for a 204 response', async () => {
      const { api } = client(new Response(null, { status: 204 }));

      await expect(api.deletePet(1)).resolves.toBeUndefined();
    });

    it('returns the text of a non-JSON response', async () => {
      const { api } = client(new Response('available', { headers: { 'Content-Type': 'text/plain' } }));

      await expect(api.getPetStatus(1)).resolves.toBe('available');
    });

    it('returns undefined for a HEAD request', async () => {
      const { api } = client(new Response(null, { status: 200 }));

      await expect(api.petExists_head(1)).resolves.toBeUndefined();
    });
  });

  describe('validation', () => {
    it('validates array responses', async () => {
      const { api } = client(json([{ id: 1, name: 'Rex' }]), json([{ id: 1, name: 'Rex' }, { id: 'two' }]));

      await expect(api.listPets()).resolves.toEqual([{ id: 1, name: 'Rex' }]);
      const failure = await failureOf(api.listPets());
      expect(failure).toBeInstanceOf(ResponseValidationError);
      expect((failure as ResponseValidationError).error.issues.map((issue) => issue.path.join('.'))).toEqual(['1.id', '1.name']);
    });

    it('validates inline responses with the exported <Operation>Response schema, for any status in a 2XX range', async () => {
      const { api } = client(json({ available: 3 }), json(['not', 'a', 'map'], { status: 206 }));

      await expect(api.getInventory()).resolves.toEqual({ available: 3 });
      await expect(failureOf(api.getInventory())).resolves.toBeInstanceOf(ResponseValidationError);
      expect(GetInventoryResponse.safeParse({ available: 3 }).success).toBe(true);
    });

    it('picks the schema by status, and returns undefined for a declared response without content', async () => {
      const { api } = client(json({ id: 1, name: 'Rex' }, { status: 201 }), new Response(null, { status: 204 }));

      await expect(api.createPet({ id: 1, name: 'Rex' })).resolves.toEqual({ id: 1, name: 'Rex' });
      await expect(api.createPet({ id: 1, name: 'Rex' })).resolves.toBeUndefined();
    });

    it('validates an undeclared 2xx status against the declared success schemas', async () => {
      const { api } = client(json({ jobId: 'abc' }, { status: 202 }));

      await expect(failureOf(api.createPet({ id: 1, name: 'Rex' }))).resolves.toBeInstanceOf(ResponseValidationError);
    });

    it('never validates a success against the default (error) schema', async () => {
      const { api } = client(json({ message: 'an Error, not a Pet' }));

      await expect(failureOf(api.getPet(1))).resolves.toBeInstanceOf(ResponseValidationError);
    });

    it('uses the default schema when the operation declares no 2xx response', async () => {
      const { api } = client(json({ ok: true }), json({ ok: 'yes' }));

      await expect(api.echo()).resolves.toEqual({ ok: true });
      await expect(failureOf(api.echo())).resolves.toBeInstanceOf(ResponseValidationError);
    });
  });

  describe('errors', () => {
    it('throws HttpError with the response, the status and the decoded body on a non-2xx status', async () => {
      const { api } = client(json({ message: 'no such pet' }, { status: 404, statusText: 'Not Found' }));

      const failure = await failureOf(api.getPet(1));

      expect(failure).toBeInstanceOf(HttpError);
      expect(failure).toBeInstanceOf(Error);
      expect(failure).not.toBeInstanceOf(ResponseValidationError);
      const http = failure as HttpError;
      expect(http.name).toBe('HttpError');
      expect(http.message).toBe('HTTP 404: Not Found');
      expect(http.status).toBe(404);
      expect(http.response).toBeInstanceOf(Response);
      expect(http.body).toEqual({ message: 'no such pet' });
    });

    it('keeps the raw text when an error body is malformed JSON', async () => {
      const { api } = client(new Response('<html>Bad Gateway</html>', { status: 502, headers: { 'Content-Type': 'application/json' } }));

      const failure = await failureOf(api.getPet(1));

      expect(failure).toBeInstanceOf(HttpError);
      expect((failure as HttpError).body).toBe('<html>Bad Gateway</html>');
    });

    it('throws ResponseValidationError with the response, the body and the Zod issues', async () => {
      const body = { id: 'not-a-number' };
      const { api } = client(json(body));

      const failure = await failureOf(api.getPet(1));

      expect(failure).toBeInstanceOf(ResponseValidationError);
      expect(failure).toBeInstanceOf(Error);
      const validation = failure as ResponseValidationError;
      expect(validation.name).toBe('ResponseValidationError');
      expect(validation.response).toBeInstanceOf(Response);
      expect(validation.body).toEqual(body);
      expect(validation.error.issues.map((issue) => issue.path.join('.'))).toEqual(['id', 'name']);
      expect(validation.message).toContain('id: ');
      // `body` is an own field, so error serializers and loggers still see it.
      expect((JSON.parse(JSON.stringify(validation)) as { body: unknown }).body).toEqual(body);
    });

    it('fails validation for an empty body where a schema is declared', async () => {
      const { api } = client(new Response('', { status: 200, headers: { 'Content-Type': 'application/json' } }));

      const failure = await failureOf(api.getPet(1));

      expect(failure).toBeInstanceOf(ResponseValidationError);
      expect((failure as ResponseValidationError).body).toBeUndefined();
    });

    it('returns the decoded body unvalidated when validateResponses is false', async () => {
      const { fetch } = mockFetch(json({ id: 'not-a-number' }));

      await expect(new PetAPI({ fetch, validateResponses: false }).getPet(1)).resolves.toEqual({ id: 'not-a-number' });
    });
  });

  it.skipIf(!process.features.typescript)('loads under Node type stripping', () => {
    const script = `await import(${JSON.stringify(pathToFileURL(fixtureFile).href)});`;

    expect(() => execFileSync(process.execPath, ['--input-type=module', '--eval', script], { encoding: 'utf-8', stdio: 'pipe' })).not.toThrow();
  });
});

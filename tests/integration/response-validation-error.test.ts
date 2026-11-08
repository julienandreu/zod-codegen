import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as ts from 'typescript';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { TypeScriptCodeGeneratorService } from '../../src/services/code-generator.service';
import type { OpenApiSpecType } from '../../src/types/openapi';

const __dirname = dirname(fileURLToPath(import.meta.url));
const testOutputDir = join(__dirname, '../../test-output-response-validation');
const apiFile = join(testOutputDir, 'api.ts');
const consumerFile = join(testOutputDir, 'consumer.ts');

// The `Error` schema is the case that used to shadow the built-in Error in generated code.
const spec: OpenApiSpecType = {
  openapi: '3.0.0',
  info: { title: 'Pet API', version: '1.0.0' },
  servers: [{ url: 'https://api.example.com' }],
  paths: {
    '/pets/{id}': {
      get: {
        operationId: 'getPet',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': {
            description: 'Success',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } }
          },
          'default': {
            description: 'Failure',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Pet: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' }
        },
        required: ['id', 'name']
      },
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string' }
        },
        required: ['message']
      }
    }
  }
};

interface GeneratedErrorInstance extends Error {
  readonly data: unknown;
  readonly response: unknown;
  readonly error: { issues: { message: string; path: PropertyKey[] }[] };
}

interface GeneratedModule {
  default: new (options: { baseUrl?: string }) => { getPet(id: number): Promise<unknown> };
  ResponseValidationError: abstract new (...args: never[]) => GeneratedErrorInstance;
}

describe('Generated ResponseValidationError', () => {
  let generated: GeneratedModule;

  beforeAll(async () => {
    rmSync(testOutputDir, { recursive: true, force: true });
    mkdirSync(testOutputDir, { recursive: true });
    writeFileSync(apiFile, new TypeScriptCodeGeneratorService().generate(spec));
    generated = (await import(pathToFileURL(apiFile).href)) as GeneratedModule;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(() => {
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  const stubFetch = (body: unknown, init: ResponseInit = { status: 200 }): void => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { ...init, headers: { 'Content-Type': 'application/json' } })))
    );
  };

  it('rejects an invalid response body with ResponseValidationError carrying the body and the Zod issues', async () => {
    const body = { id: 'not-a-number' };
    stubFetch(body);
    const client = new generated.default({ baseUrl: 'https://api.example.com' });

    const failure: unknown = await client.getPet(1).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(generated.ResponseValidationError);
    expect(failure).toBeInstanceOf(Error);
    const validation = failure as GeneratedErrorInstance;
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
    const client = new generated.default({ baseUrl: 'https://api.example.com' });

    const failure: unknown = await client.getPet(1).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect(failure).not.toBeInstanceOf(generated.ResponseValidationError);
    expect((failure as Error).message).toBe('HTTP 500: Internal Server Error');
  });

  it('types ResponseValidationError as a built-in Error for consumers', () => {
    writeFileSync(
      consumerFile,
      [
        "import { ResponseValidationError } from './api';",
        'export function describeFailure(caught: unknown): string {',
        '  if (caught instanceof ResponseValidationError) {',
        '    const issues: number = caught.error.issues.length;',
        '    const body: unknown = caught.data ?? caught.response;',
        '    return `${caught.name}: ${caught.message} (${issues} issues, ${String(body)}) ${caught.stack ?? ""}`;',
        '  }',
        "  return '';",
        '}'
      ].join('\n')
    );

    const program = ts.createProgram([consumerFile], {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']
    });
    const diagnostics = ts.getPreEmitDiagnostics(program, program.getSourceFile(consumerFile)).map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));

    expect(diagnostics).toEqual([]);
  });
});

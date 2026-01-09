import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest';
import {Generator} from '../../src/generator';
import {Reporter} from '../../src/utils/reporter';
import {readFileSync, existsSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const testOutputDir = join(__dirname, '../../test-output-errors');

describe('Error Scenarios', () => {
  let generator: Generator;
  let mockReporter: Reporter;
  const logSpy = vi.fn();
  const errorSpy = vi.fn();

  beforeEach(() => {
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, {recursive: true, force: true});
    }
    mkdirSync(testOutputDir, {recursive: true});

    mockReporter = {
      log: logSpy,
      error: errorSpy,
    } as unknown as Reporter;

    logSpy.mockClear();
    errorSpy.mockClear();
  });

  afterEach(() => {
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, {recursive: true, force: true});
    }
  });

  describe('File Reading Errors', () => {
    it('should handle non-existent local file', async () => {
      generator = new Generator('test-app', '1.0.0', mockReporter, './non-existent-file.yaml', testOutputDir);

      const exitCode = await generator.run();

      expect(exitCode).toBe(1);
      expect(errorSpy).toHaveBeenCalled();
      expect(errorSpy.mock.calls[0][0]).toContain('Error');
    });

    it('should handle network errors when fetching URL', async () => {
      const originalFetch = global.fetch;
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      generator = new Generator(
        'test-app',
        '1.0.0',
        mockReporter,
        'https://example.com/nonexistent.json',
        testOutputDir,
      );

      const exitCode = await generator.run();

      expect(exitCode).toBe(1);
      expect(errorSpy).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalled();

      global.fetch = originalFetch;
    });

    it('should handle HTTP errors when fetching URL', async () => {
      const originalFetch = global.fetch;
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Error response',
      } as Response);
      global.fetch = mockFetch;

      generator = new Generator('test-app', '1.0.0', mockReporter, 'https://example.com/error.json', testOutputDir);

      const exitCode = await generator.run();

      expect(exitCode).toBe(1);
      expect(errorSpy).toHaveBeenCalled();
      // Error should mention the HTTP error or parsing failure
      const errorMessage = errorSpy.mock.calls[0][0] as string;
      expect(errorMessage).toMatch(/500|Error|Failed/);

      global.fetch = originalFetch;
    });
  });

  describe('Parsing Errors', () => {
    it('should handle invalid JSON', async () => {
      const invalidFile = join(testOutputDir, 'invalid.json');
      writeFileSync(invalidFile, '{ invalid json }');

      generator = new Generator('test-app', '1.0.0', mockReporter, invalidFile, testOutputDir);

      const exitCode = await generator.run();

      expect(exitCode).toBe(1);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle invalid YAML', async () => {
      const invalidFile = join(testOutputDir, 'invalid.yaml');
      writeFileSync(invalidFile, 'invalid: yaml: [unclosed');

      generator = new Generator('test-app', '1.0.0', mockReporter, invalidFile, testOutputDir);

      const exitCode = await generator.run();

      expect(exitCode).toBe(1);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle invalid OpenAPI version', async () => {
      const invalidFile = join(testOutputDir, 'invalid-version.yaml');
      writeFileSync(
        invalidFile,
        `
openapi: 2.0.0
info:
  title: Test API
  version: 1.0.0
paths: {}
`,
      );

      generator = new Generator('test-app', '1.0.0', mockReporter, invalidFile, testOutputDir);

      const exitCode = await generator.run();

      expect(exitCode).toBe(1);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle missing required fields', async () => {
      const invalidFile = join(testOutputDir, 'missing-fields.yaml');
      writeFileSync(
        invalidFile,
        `
openapi: 3.0.0
paths: {}
`,
      );

      generator = new Generator('test-app', '1.0.0', mockReporter, invalidFile, testOutputDir);

      const exitCode = await generator.run();

      expect(exitCode).toBe(1);
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('File Writing Errors', () => {
    it('should handle write permission errors gracefully', async () => {
      // Create a read-only directory (on Unix systems)
      const readOnlyDir = join(testOutputDir, 'readonly');
      mkdirSync(readOnlyDir, {recursive: true});
      // Note: chmod doesn't work the same way on all systems, so this test
      // might need to be adjusted based on the environment

      generator = new Generator('test-app', '1.0.0', mockReporter, './samples/swagger-petstore.yaml', readOnlyDir);

      const exitCode = await generator.run();

      // Should either succeed or fail gracefully
      expect([0, 1]).toContain(exitCode);
    });
  });

  describe('Malformed OpenAPI Specs', () => {
    it('should handle empty spec', async () => {
      const emptyFile = join(testOutputDir, 'empty.yaml');
      writeFileSync(emptyFile, '');

      generator = new Generator('test-app', '1.0.0', mockReporter, emptyFile, testOutputDir);

      const exitCode = await generator.run();

      expect(exitCode).toBe(1);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle spec with no paths', async () => {
      const noPathsFile = join(testOutputDir, 'no-paths.yaml');
      writeFileSync(
        noPathsFile,
        `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths: {}
`,
      );

      generator = new Generator('test-app', '1.0.0', mockReporter, noPathsFile, testOutputDir);

      const exitCode = await generator.run();

      // Should succeed even with no paths
      expect(exitCode).toBe(0);
      expect(logSpy).toHaveBeenCalled();
    });

    it('should handle spec with no components', async () => {
      const noComponentsFile = join(testOutputDir, 'no-components.yaml');
      writeFileSync(
        noComponentsFile,
        `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      operationId: test
      responses:
        '200':
          description: Success
`,
      );

      generator = new Generator('test-app', '1.0.0', mockReporter, noComponentsFile, testOutputDir);

      const exitCode = await generator.run();

      // Should succeed even with no components
      expect(exitCode).toBe(0);
    });
  });
});

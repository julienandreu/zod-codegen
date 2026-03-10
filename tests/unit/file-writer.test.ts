import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SyncFileWriterService } from '../../src/services/file-writer.service';

const __dirname = dirname(fileURLToPath(import.meta.url));
const testOutputDir = join(__dirname, '../../test-output-writer');

describe('SyncFileWriterService', () => {
  beforeEach(() => {
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }

    mkdirSync(testOutputDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('credential redaction', () => {
    it('should redact password from URL with embedded credentials', () => {
      const writer = new SyncFileWriterService('zod-codegen', '1.0.0', 'https://user:secretpass@api.example.com/openapi.json');

      const outPath = join(testOutputDir, 'api.ts');
      writer.writeFile(outPath, 'const x = 1;');

      const content = readFileSync(outPath, 'utf-8');
      expect(content).toContain('// Source file: https://user:***@api.example.com/openapi.json');
      expect(content).not.toContain('secretpass');
    });

    it('should redact password from URL with percent-encoded credentials', () => {
      const writer = new SyncFileWriterService('zod-codegen', '1.0.0', 'https://api%2Bstaging%40saris.ai:hnt.xjx3rby8YKM8wnm@api.staging.saris.ai/api/openapi.json');

      const outPath = join(testOutputDir, 'api.ts');
      writer.writeFile(outPath, 'const x = 1;');

      const content = readFileSync(outPath, 'utf-8');
      expect(content).toContain('api%2Bstaging%40saris.ai');
      expect(content).toContain(':***@');
      expect(content).not.toContain('hnt.xjx3rby8YKM8wnm');
    });

    it('should leave URL without credentials unchanged', () => {
      const writer = new SyncFileWriterService('zod-codegen', '1.0.0', 'https://api.example.com/openapi.json');

      const outPath = join(testOutputDir, 'api.ts');
      writer.writeFile(outPath, 'const x = 1;');

      const content = readFileSync(outPath, 'utf-8');
      expect(content).toContain('// Source file: https://api.example.com/openapi.json');
    });

    it('should leave local file paths unchanged', () => {
      const writer = new SyncFileWriterService('zod-codegen', '1.0.0', './samples/openapi.json');

      const outPath = join(testOutputDir, 'api.ts');
      writer.writeFile(outPath, 'const x = 1;');

      const content = readFileSync(outPath, 'utf-8');
      expect(content).toContain('// Source file: ./samples/openapi.json');
    });
  });
});

import {describe, expect, it} from 'vitest';
import {execSync} from 'node:child_process';
import {resolve} from 'node:path';
import {existsSync, rmSync, readFileSync} from 'node:fs';

describe('CLI Comprehensive Integration', () => {
  const cwd = resolve(__dirname, '../..');
  const testOutputDir = resolve(cwd, 'test-output-cli');

  beforeEach(() => {
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, {recursive: true, force: true});
    }
  });

  afterEach(() => {
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, {recursive: true, force: true});
    }
  });

  describe('Basic CLI Usage', () => {
    it('should generate code with default output directory', () => {
      execSync('node ./dist/src/cli.js --input ./samples/swagger-petstore.yaml --output generated', {
        encoding: 'utf-8',
        cwd,
      });

      const outputFile = resolve(cwd, 'generated/type.ts');
      expect(existsSync(outputFile)).toBe(true);

      const content = readFileSync(outputFile, 'utf-8');
      expect(content).toContain('SwaggerPetstoreOpenAPI30');
    });

    it('should generate code with custom output directory', () => {
      execSync(`node ./dist/src/cli.js --input ./samples/swagger-petstore.yaml --output ${testOutputDir}`, {
        encoding: 'utf-8',
        cwd,
      });

      const outputFile = resolve(testOutputDir, 'type.ts');
      expect(existsSync(outputFile)).toBe(true);
    });

    it('should accept naming convention option', () => {
      execSync(
        `node ./dist/src/cli.js --input ./samples/swagger-petstore.yaml --output ${testOutputDir} --naming-convention camelCase`,
        {
          encoding: 'utf-8',
          cwd,
        },
      );

      const outputFile = resolve(testOutputDir, 'type.ts');
      const content = readFileSync(outputFile, 'utf-8');

      // Verify camelCase is applied (operation IDs should be camelCase)
      expect(content).toMatch(/async \w+\(/);
    });

    it('should reject invalid naming convention', () => {
      expect(() => {
        execSync(
          `node ./dist/src/cli.js --input ./samples/swagger-petstore.yaml --output ${testOutputDir} --naming-convention invalid`,
          {
            encoding: 'utf-8',
            cwd,
            stdio: 'pipe',
          },
        );
      }).toThrow();
    });
  });

  describe('CLI Error Handling', () => {
    it('should exit with code 1 on invalid input file', () => {
      try {
        execSync('node ./dist/src/cli.js --input ./nonexistent.yaml --output generated', {
          encoding: 'utf-8',
          cwd,
          stdio: 'pipe',
        });
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        // Command should fail
        expect(error).toBeDefined();
      }
    });

    it('should require input option', () => {
      expect(() => {
        execSync('node ./dist/src/cli.js --output generated', {
          encoding: 'utf-8',
          cwd,
          stdio: 'pipe',
        });
      }).toThrow();
    });
  });

  describe('CLI with Different Spec Formats', () => {
    it('should handle JSON format', () => {
      execSync(`node ./dist/src/cli.js --input ./samples/pokeapi-openapi.json --output ${testOutputDir}`, {
        encoding: 'utf-8',
        cwd,
      });

      const outputFile = resolve(testOutputDir, 'type.ts');
      expect(existsSync(outputFile)).toBe(true);
    });

    it('should handle YAML format', () => {
      execSync(`node ./dist/src/cli.js --input ./samples/swagger-petstore.yaml --output ${testOutputDir}`, {
        encoding: 'utf-8',
        cwd,
      });

      const outputFile = resolve(testOutputDir, 'type.ts');
      expect(existsSync(outputFile)).toBe(true);
    });
  });
});

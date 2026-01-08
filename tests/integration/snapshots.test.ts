import {describe, expect, it} from 'vitest';
import {Generator} from '../../src/generator.js';
import {Reporter} from '../../src/utils/reporter.js';
import {readFileSync, existsSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';
import {execSync} from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const testOutputDir = join(__dirname, '../../test-output-snapshots');

describe('Generated Code Snapshots', () => {
  let generator: Generator;
  const reporter = new Reporter(process.stdout, process.stderr);

  beforeEach(() => {
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, {recursive: true, force: true});
    }
    mkdirSync(testOutputDir, {recursive: true});
  });

  afterEach(() => {
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, {recursive: true, force: true});
    }
  });

  describe('swagger-petstore.yaml', () => {
    it('should generate valid TypeScript code', async () => {
      generator = new Generator('test-app', '1.0.0', reporter, './samples/swagger-petstore.yaml', testOutputDir);

      const exitCode = await generator.run();
      expect(exitCode).toBe(0);

      const outputFile = join(testOutputDir, 'type.ts');
      expect(existsSync(outputFile)).toBe(true);

      const content = readFileSync(outputFile, 'utf-8');

      // Verify key components exist
      expect(content).toMatch(/import\s*{\s*z\s*}\s*from\s*['"]zod['"]/);
      expect(content).toContain('SwaggerPetstoreOpenAPI30');
      expect(content).toContain('export const Pet');
      expect(content).toContain('export const Order');
      expect(content).toContain('export const User');
      expect(content).toContain('async findPetsByStatus');
      expect(content).toContain('async addPet');
      expect(content).toContain('protected getBaseRequestOptions');
      expect(content).toContain('protected async handleResponse');
    });

    it('should generate syntactically valid TypeScript code', async () => {
      generator = new Generator('test-app', '1.0.0', reporter, './samples/swagger-petstore.yaml', testOutputDir);

      await generator.run();

      const outputFile = join(testOutputDir, 'type.ts');
      const content = readFileSync(outputFile, 'utf-8');

      // Verify basic TypeScript syntax
      expect(content).toContain('import');
      expect(content).toContain('export');
      expect(content).toContain('class');
      expect(content).toContain('async');
      expect(content).toContain('protected');

      // Verify code structure
      expect(content.length).toBeGreaterThan(1000); // Should be substantial
      expect(content.split('{').length).toBeGreaterThan(content.split('}').length - 10); // Rough bracket balance check
    });
  });

  describe('test-logical.yaml', () => {
    it('should generate correct logical operators', async () => {
      generator = new Generator('test-app', '1.0.0', reporter, './samples/test-logical.yaml', testOutputDir);

      await generator.run();

      const outputFile = join(testOutputDir, 'type.ts');
      const content = readFileSync(outputFile, 'utf-8');

      // Verify logical operators are generated correctly
      expect(content).toContain('TestAnyOf');
      expect(content).toContain('z.union');
      expect(content).toContain('TestOneOf');
      expect(content).toContain('TestAllOf');
      expect(content).toContain('z.intersection');
      expect(content).toContain('TestNot');
    });
  });

  describe('server-variables-example.yaml', () => {
    it('should generate server configuration with variables', async () => {
      generator = new Generator(
        'test-app',
        '1.0.0',
        reporter,
        './samples/server-variables-example.yaml',
        testOutputDir,
      );

      await generator.run();

      const outputFile = join(testOutputDir, 'type.ts');
      const content = readFileSync(outputFile, 'utf-8');

      // Verify server variables are handled
      expect(content).toContain('serverConfigurations');
      expect(content).toContain('serverVariables');
      expect(content).toContain('resolveServerUrl');
      expect(content).toContain('ClientOptions');
    });
  });

  describe('pokeapi-openapi.json', () => {
    it('should generate code for PokéAPI spec', async () => {
      generator = new Generator('test-app', '1.0.0', reporter, './samples/pokeapi-openapi.json', testOutputDir);

      await generator.run();

      const outputFile = join(testOutputDir, 'type.ts');
      const content = readFileSync(outputFile, 'utf-8');

      expect(content).toMatch(/export (default )?class/);
      expect(content).toContain('export const Pokemon');
      expect(content).toContain('async getPokemonById');
    });
  });
});

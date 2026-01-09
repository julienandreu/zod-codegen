import type {Reporter} from './utils/reporter';
import type {OpenApiSpecType} from './types/openapi';
import type {GeneratorOptions} from './types/generator-options';
import {OpenApiFileParserService, SyncFileReaderService} from './services/file-reader.service';
import {TypeScriptCodeGeneratorService} from './services/code-generator.service';
import {SyncFileWriterService} from './services/file-writer.service';

// Re-export types for library users
export type {GeneratorOptions} from './types/generator-options';
export type {NamingConvention, OperationDetails, OperationNameTransformer} from './utils/naming-convention';

/**
 * Main generator class for creating TypeScript code from OpenAPI specifications.
 *
 * This class orchestrates the code generation process:
 * 1. Reads the OpenAPI specification file (local or remote)
 * 2. Parses and validates the specification
 * 3. Generates TypeScript code with Zod schemas and type-safe API client
 * 4. Writes the generated code to the output directory
 *
 * @example
 * ```typescript
 * import {Generator} from 'zod-codegen';
 * import {Reporter} from './utils/reporter';
 *
 * const reporter = new Reporter(process.stdout, process.stderr);
 * const generator = new Generator(
 *   'my-app',
 *   '1.0.0',
 *   reporter,
 *   './openapi.yaml',
 *   './generated',
 *   {namingConvention: 'camelCase'}
 * );
 *
 * const exitCode = await generator.run();
 * ```
 */
export class Generator {
  private readonly fileReader = new SyncFileReaderService();
  private readonly fileParser = new OpenApiFileParserService();
  private readonly codeGenerator: TypeScriptCodeGeneratorService;
  private readonly fileWriter: SyncFileWriterService;
  private readonly outputPath: string;

  /**
   * Creates a new Generator instance.
   *
   * @param _name - The name of the application/library (used in generated file headers)
   * @param _version - The version of the application/library (used in generated file headers)
   * @param reporter - Reporter instance for logging messages and errors
   * @param inputPath - Path or URL to the OpenAPI specification file
   * @param _outputDir - Directory where generated files will be written
   * @param options - Optional configuration for code generation
   */
  constructor(
    private readonly _name: string,
    private readonly _version: string,
    private readonly reporter: Reporter,
    private readonly inputPath: string,
    private readonly _outputDir: string,
    options: GeneratorOptions = {},
  ) {
    this.fileWriter = new SyncFileWriterService(this._name, this._version, inputPath);
    this.outputPath = this.fileWriter.resolveOutputPath(this._outputDir);
    this.codeGenerator = new TypeScriptCodeGeneratorService(options);
  }

  /**
   * Executes the code generation process.
   *
   * @returns Promise that resolves to an exit code (0 for success, 1 for failure)
   */
  async run(): Promise<number> {
    try {
      const rawSource = await this.readFile();
      const openApiSpec = this.parseFile(rawSource);
      const generatedCode = this.generateCode(openApiSpec);

      this.writeFile(generatedCode);
      this.reporter.log(`✅ Generated types successfully at: ${this.outputPath}`);

      return 0;
    } catch (error) {
      if (error instanceof Error) {
        this.reporter.error(`❌ Error: ${error.message}`);
      } else {
        this.reporter.error('❌ An unknown error occurred');
      }

      return 1;
    }
  }

  private async readFile(): Promise<string> {
    return await this.fileReader.readFile(this.inputPath);
  }

  private parseFile(source: string): OpenApiSpecType {
    return this.fileParser.parse(source);
  }

  private generateCode(spec: OpenApiSpecType): string {
    return this.codeGenerator.generate(spec);
  }

  private writeFile(content: string): void {
    this.fileWriter.writeFile(this.outputPath, content);
  }
}

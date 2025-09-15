import type { Reporter } from './utils/reporter.js';
import type { OpenApiSpecType } from './types/openapi.js';
import { OpenApiFileParserService, SyncFileReaderService } from './services/file-reader.service.js';
import { TypeScriptCodeGeneratorService } from './services/code-generator.service.js';
import { SyncFileWriterService } from './services/file-writer.service.js';

export class Generator {
  private readonly fileReader = new SyncFileReaderService();
  private readonly fileParser = new OpenApiFileParserService();
  private readonly codeGenerator = new TypeScriptCodeGeneratorService();
  private readonly fileWriter: SyncFileWriterService;
  private readonly outputPath: string;

  constructor(
    private readonly _name: string,
    private readonly _version: string,
    private readonly reporter: Reporter,
    private readonly inputPath: string,
    private readonly _outputDir: string,
  ) {
    this.fileWriter = new SyncFileWriterService(this._name, this._version, inputPath);
    this.outputPath = this.fileWriter.resolveOutputPath(this._outputDir);
  }

  async run(): Promise<number> {
    try {
      const rawSource = this.readFile();
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

      return Promise.resolve(1);
    }
  }

  private readFile(): string {
    return this.fileReader.readFile(this.inputPath);
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

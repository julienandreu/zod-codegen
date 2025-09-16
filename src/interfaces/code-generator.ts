import type {OpenApiSpecType} from '../types/openapi.js';

export interface CodeGenerator {
  generate(spec: OpenApiSpecType): string;
}

export interface SchemaBuilder {
  buildSchema(schema: unknown, required?: boolean): unknown;
}

export interface TypeBuilder {
  buildType(type: string): unknown;
}

export interface ImportBuilder {
  buildImports(): unknown[];
}

export interface ClassBuilder {
  buildClass(spec: OpenApiSpecType): unknown;
}

export interface FileWriter {
  writeFile(filePath: string, content: string): Promise<void> | void;
}

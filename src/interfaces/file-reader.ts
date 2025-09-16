export interface FileReader {
  readFile(path: string): Promise<string> | string;
}

export interface FileParser<TInput, TOutput> {
  parse(input: TInput): TOutput;
}

export interface OpenApiFileReader extends FileReader {
  readFile(path: string): Promise<string> | string;
}

export interface OpenApiFileParser<TOutput> extends FileParser<unknown, TOutput> {
  parse(input: unknown): TOutput;
}

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';

interface PackageJson {
  name: string;
  version: string;
  description: string;
}

/**
 * Type guard for the package.json object
 * 
 * @param input Unknown input
 * @returns true if the input is an event object
 */
export function isPackageJson(input: unknown): input is PackageJson {
  const event = z
    .object({
      name: z.string(),
      version: z.string(),
      description: z.string(),
    })
    .strict()
    .catchall(z.any())
    .required();

  const { success } = event.safeParse(input);

  return success;
}

const sourcePath = resolve(__dirname, '..', 'package.json');

const data: unknown = JSON.parse(readFileSync(sourcePath, 'utf8'));

if (!isPackageJson(data)) {
  process.exit(1);
}
  
const { name, version, description } = data;

const targetPath = resolve(__dirname, '..', 'src', 'assets', 'manifest.json');

writeFileSync(targetPath, JSON.stringify({ name, version, description }, null, 2));
  
process.exit(0);

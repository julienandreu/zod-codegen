import {z} from 'zod';

interface Manifest {
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
export function isManifest(input: unknown): input is Manifest {
  const manifest = z
    .object({
      name: z.string(),
      version: z.string(),
      description: z.string(),
    })
    .strict()
    .catchall(z.any())
    .required();

  const {success} = manifest.safeParse(input);

  return success;
}

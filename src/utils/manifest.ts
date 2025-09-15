import {z} from 'zod';

interface Manifest {
  readonly name: string;
  readonly version: string;
  readonly description: string;
}

const ManifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),
});

export function isManifest(input: unknown): input is Manifest {
  return ManifestSchema.safeParse(input).success;
}

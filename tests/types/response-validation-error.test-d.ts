import { describe, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';
import { ResponseValidationError } from '../fixtures/error-schema/api';

// The fixture's spec has a schema named `Error`; the generated class must still extend the built-in one.
describe('generated ResponseValidationError', () => {
  it('narrows to a built-in Error with the validation details', () => {
    const caught: unknown = undefined;

    if (caught instanceof ResponseValidationError) {
      expectTypeOf(caught).toExtend<globalThis.Error>();
      expectTypeOf(caught.message).toEqualTypeOf<string>();
      expectTypeOf(caught.name).toEqualTypeOf<string>();
      expectTypeOf(caught.stack).toEqualTypeOf<string | undefined>();
      expectTypeOf(caught.error.issues).toEqualTypeOf<z.core.$ZodIssue[]>();
      expectTypeOf(caught.response).toEqualTypeOf<unknown>();
      expectTypeOf(caught.data).toEqualTypeOf<unknown>();
    }
  });
});

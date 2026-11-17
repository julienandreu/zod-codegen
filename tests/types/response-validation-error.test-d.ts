import { describe, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';
import { HttpError, ResponseValidationError } from '../fixtures/error-schema/api';

// The fixture's spec has a schema named `Error`; the generated classes must still extend the built-in one.
describe('generated error classes', () => {
  it('narrows ResponseValidationError to a built-in Error with the response, the body and the issues', () => {
    const caught: unknown = undefined;

    if (caught instanceof ResponseValidationError) {
      expectTypeOf(caught).toExtend<globalThis.Error>();
      expectTypeOf(caught.message).toEqualTypeOf<string>();
      expectTypeOf(caught.name).toEqualTypeOf<string>();
      expectTypeOf(caught.stack).toEqualTypeOf<string | undefined>();
      expectTypeOf(caught.response).toEqualTypeOf<Response>();
      expectTypeOf(caught.body).toEqualTypeOf<unknown>();
      expectTypeOf(caught.error.issues).toEqualTypeOf<z.core.$ZodIssue[]>();
    }
  });

  it('narrows HttpError to a built-in Error with the response, the status and the body', () => {
    const caught: unknown = undefined;

    if (caught instanceof HttpError) {
      expectTypeOf(caught).toExtend<globalThis.Error>();
      expectTypeOf(caught.response).toEqualTypeOf<Response>();
      expectTypeOf(caught.status).toEqualTypeOf<number>();
      expectTypeOf(caught.body).toEqualTypeOf<unknown>();
    }
  });
});

/**
 * Example showing how to handle failed requests. The generated client throws:
 * - HttpError for any non-2xx status, with the Response, the status and the body (already decoded)
 * - ResponseValidationError when a 2xx body does not match its schema
 *
 * It also overrides handleResponse to turn a 401 into a custom error before the body is read.
 *
 * Run with: npx ts-node examples/petstore/error-handling-usage.ts
 */

import SwaggerPetstoreOpenAPI30, { HttpError, type RequestOptions, ResponseValidationError } from './api';

/** Thrown for 401 responses, so callers can send the user back to sign in */
export class AuthenticationError extends Error {
  readonly response: Response;

  constructor(response: Response) {
    super(`Authentication required for ${response.url}`);
    this.name = 'AuthenticationError';
    this.response = response;
  }
}

class PetstoreClientWithCustomErrors extends SwaggerPetstoreOpenAPI30 {
  protected override async handleResponse(response: Response, method: string, path: string, options: RequestOptions): Promise<Response> {
    if (response.status === 401) {
      throw new AuthenticationError(response);
    }

    return super.handleResponse(response, method, path, options);
  }
}

async function main() {
  const client = new PetstoreClientWithCustomErrors({});

  try {
    console.log('🔍 Fetching available pets (success case)...\n');
    const availablePets = await client.findPetsByStatus('available');
    console.log(`✅ Found ${availablePets.length} available pets`);

    console.log('\n🔍 Fetching non-existent pet (404 case)...\n');
    await client.getPetById(999999);
  } catch (e) {
    if (e instanceof AuthenticationError) {
      console.error('❌ Please sign in:', e.message);
    } else if (e instanceof HttpError) {
      // JSON bodies are parsed, anything else is text; headers stay on the response.
      if (e.status === 404) {
        console.error('❌ Pet not found (404):', e.body ?? e.message);
      } else if (e.status === 429) {
        console.error('❌ Rate limited, retry after', e.response.headers.get('Retry-After') ?? '?', 'seconds');
      } else if (e.status >= 500) {
        console.error('❌ Server error:', e.status, e.body ?? e.message);
      } else {
        console.error(`❌ HTTP ${e.status}:`, e.body ?? e.message);
      }
    } else if (e instanceof ResponseValidationError) {
      console.error('❌ Unexpected response shape:', e.message);
      console.error('   Body:', e.body);
    } else if (e instanceof Error) {
      console.error('❌ Network or other error:', e.message);
    } else {
      console.error('❌ Unknown error:', e);
    }

    process.exit(1);
  }
}

void main();

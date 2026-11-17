/**
 * Example showing how to retry rate-limited (429) and unavailable (503) responses by overriding
 * handleResponse. It runs inside send, before the body is read, so a retry just calls send again:
 * only the final response is decoded and validated.
 *
 * Run with: npx ts-node examples/petstore/retry-handler-usage.ts
 */

import SwaggerPetstoreOpenAPI30, { type RequestOptions } from './api';

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

class PetstoreClientWithRetry extends SwaggerPetstoreOpenAPI30 {
  // send passes the same options object to every attempt of one call, so it identifies the call.
  readonly #attempts = new WeakMap<RequestOptions, number>();

  protected override async handleResponse(response: Response, method: string, path: string, options: RequestOptions): Promise<Response> {
    const attempt = (this.#attempts.get(options) ?? 1) + 1;
    if ((response.status !== 429 && response.status !== 503) || attempt > MAX_ATTEMPTS) {
      // Out of attempts: the client throws HttpError with this last response.
      return response;
    }

    // Retry-After is in seconds here; without it, back off exponentially.
    const retryAfter = Number(response.headers.get('Retry-After'));
    const delay = retryAfter > 0 ? retryAfter * 1000 : BASE_DELAY_MS * 2 ** (attempt - 2);
    console.log(`⚠️  ${response.status} on ${method} ${path}. Retrying in ${delay}ms (attempt ${attempt}/${MAX_ATTEMPTS})`);

    this.#attempts.set(options, attempt);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return this.send(method, path, options);
  }
}

async function main() {
  const client = new PetstoreClientWithRetry({});

  try {
    console.log('🔍 Fetching pets with retry handler...\n');

    const availablePets = await client.findPetsByStatus('available');
    console.log(`✅ Found ${availablePets.length} available pets`);

    if (availablePets.length > 0) {
      console.log('\n📋 First pet details:');
      console.log(JSON.stringify(availablePets[0], null, 2));
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
    } else {
      console.error('❌ Unknown error:', error);
    }

    process.exit(1);
  }
}

void main();

/**
 * Example showing how to catch 4xx/5xx responses and throw custom errors
 * by extending the generated client and overriding the handleResponse method
 *
 * Run with: npx ts-node examples/petstore/error-handling-usage.ts
 */

import SwaggerPetstoreOpenAPI30 from './api';

/** Custom error for HTTP 4xx/5xx with status, statusText, and optional body */
export class HttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body?: unknown;

  constructor(message: string, status: number, statusText: string, body?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

class PetstoreClientWithCustomErrors extends SwaggerPetstoreOpenAPI30 {
  protected async handleResponse<_T>(
    response: Response,
    _method: string,
    _path: string,
    _options: {
      params?: Record<string, string | number | boolean>;
      data?: unknown;
      contentType?: string;
      headers?: Record<string, string>;
    }
  ): Promise<Response> {
    if (response.ok) {
      return response;
    }

    // Optionally read body for error details (with try/catch for non-JSON responses)
    let body: unknown;
    try {
      const contentType = response.headers.get('Content-Type') ?? '';
      body = contentType.includes('application/json') ? await response.json() : await response.text();
    } catch {
      body = undefined;
    }

    throw new HttpError(`HTTP ${response.status}: ${response.statusText}`, response.status, response.statusText, body);
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
    if (e instanceof HttpError) {
      if (e.status === 404) {
        console.error('❌ Pet not found (404):', e.body ?? e.message);
      } else if (e.status >= 500) {
        console.error('❌ Server error:', e.status, e.body ?? e.message);
      } else {
        console.error(`❌ HTTP ${e.status}:`, e.body ?? e.message);
      }
    } else if (e instanceof Error) {
      console.error('❌ Error:', e.message);
    } else {
      console.error('❌ Unknown error:', e);
    }

    process.exit(1);
  }
}

void main();

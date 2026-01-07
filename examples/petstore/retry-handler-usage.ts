/**
 * Example showing how to handle special HTTP response cases (e.g., 429 retry logic)
 * by extending the generated client and overriding the handleResponse method
 *
 * Run with: npx ts-node examples/petstore/retry-handler-usage.ts
 */

import {SwaggerPetstoreOpenAPI30} from './type.js';

class PetstoreClientWithRetry extends SwaggerPetstoreOpenAPI30 {
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second base delay
  private retrying = false; // Track if we're currently in a retry to avoid infinite loops

  /**
   * Override handleResponse to intercept responses and handle special cases
   * This method is called before error checking, allowing you to:
   * - Retry requests on specific status codes (e.g., 429 Too Many Requests)
   * - Modify responses before they're processed
   * - Implement custom error handling logic
   */
  protected async handleResponse<T>(
    response: Response,
    method: string,
    path: string,
    options: {
      params?: Record<string, string | number | boolean>;
      data?: unknown;
      contentType?: string;
      headers?: Record<string, string>;
    },
  ): Promise<Response> {
    // Skip retry logic if we're already retrying to avoid infinite loops
    if (this.retrying) {
      return response;
    }

    // Handle 429 Too Many Requests with exponential backoff retry
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : this.retryDelay;

      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        console.log(
          `⚠️  Rate limited (429). Retrying in ${delay * (attempt + 1)}ms... (Attempt ${attempt + 1}/${this.maxRetries})`,
        );

        // Wait before retrying with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay * (attempt + 1)));

        // Retry the request
        // We use retryRequest helper to avoid going through handleResponse again
        // (which would cause infinite loops). Alternatively, if makeRequest is protected,
        // you could call it directly, but you'd need to ensure handleResponse doesn't
        // retry again by checking the retrying flag.
        try {
          this.retrying = true;
          const retryResponse = await this.retryRequest(method, path, options);
          this.retrying = false;

          if (retryResponse.ok) {
            console.log(`✅ Retry successful after ${attempt + 1} attempt(s)`);
            return retryResponse;
          }
          // If still rate limited, continue to next retry
          if (retryResponse.status === 429 && attempt < this.maxRetries - 1) {
            continue;
          }
          // Return the response even if it's an error (will be handled by normal error flow)
          return retryResponse;
        } catch (error) {
          this.retrying = false;
          // If retry fails and we're out of attempts, throw
          if (attempt === this.maxRetries - 1) {
            throw error;
          }
        }
      }
    }

    // Handle other status codes if needed
    // For example, you could handle 503 Service Unavailable similarly
    if (response.status === 503) {
      console.log('⚠️  Service unavailable (503). You could implement retry logic here too.');
    }

    // For all other responses, return as-is
    return response;
  }

  /**
   * Helper method to retry a request
   * This reconstructs the request using the same parameters
   * Note: If makeRequest is protected (not private), you could call it directly instead
   */
  private async retryRequest(
    method: string,
    path: string,
    options: {
      params?: Record<string, string | number | boolean>;
      data?: unknown;
      contentType?: string;
      headers?: Record<string, string>;
    },
  ): Promise<Response> {
    // Reconstruct the request - this duplicates logic from makeRequest
    // but allows us to retry without going through handleResponse again
    const baseUrl = `${(this as any)['#baseUrl']}${path}`;
    const url =
      options.params && Object.keys(options.params).length > 0
        ? (() => {
            const urlObj = new URL(baseUrl);
            Object.entries(options.params).forEach(([key, value]) => {
              urlObj.searchParams.set(key, String(value));
            });
            return urlObj.toString();
          })()
        : baseUrl;

    const baseOptions = this.getBaseRequestOptions();
    const contentType =
      options.contentType === 'application/x-www-form-urlencoded'
        ? 'application/x-www-form-urlencoded'
        : 'application/json';
    const baseHeaders = baseOptions.headers !== undefined ? baseOptions.headers : {};
    const headers = Object.assign(
      {},
      baseHeaders,
      {'Content-Type': contentType},
      options.headers !== undefined ? options.headers : {},
    );
    const body =
      options.data !== undefined
        ? options.contentType === 'application/x-www-form-urlencoded'
          ? (() => {
              const params = new URLSearchParams();
              Object.entries(options.data as Record<string, unknown>).forEach(([key, value]) => {
                params.set(key, String(value));
              });
              return params.toString();
            })()
          : JSON.stringify(options.data)
        : null;

    return await fetch(url, Object.assign({}, baseOptions, {method, headers: headers, body: body}));
  }
}

async function main() {
  const client = new PetstoreClientWithRetry({});

  try {
    console.log('🔍 Fetching pets with retry handler...\n');

    // This will use the handleResponse hook if a 429 is encountered
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

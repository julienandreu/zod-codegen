/**
 * Example showing how to use the policy system for handling HTTP responses
 *
 * This demonstrates various policy configurations including:
 * - Retry policies with different backoff strategies
 * - Circuit breaker patterns
 * - Logging policies
 * - Combining multiple policies
 *
 * Run with: npx ts-node examples/petstore/policy-usage.ts
 */

import {SwaggerPetstoreOpenAPI30, type ClientOptions} from './type.js';
import {
  CircuitBreakerPolicy,
  LoggingPolicy,
  PolicyHelper,
  RetryPolicy,
  type ResponsePolicy,
} from '../../src/policies/index.js';

// ============================================================================
// Example 1: Basic Retry Policy
// ============================================================================

class PetstoreClientWithRetry extends SwaggerPetstoreOpenAPI30 {
  private readonly policyHelper: PolicyHelper;
  private retrying = false;

  constructor(options: ClientOptions = {}) {
    super(options);

    // Create retry policy with default settings
    const retryPolicy = new RetryPolicy({
      maxRetries: 3,
      baseDelay: 1000,
      strategy: 'exponential',
      retryableStatusCodes: [429, 503, 504],
      onRetry: (context, delay) => {
        console.log(`⚠️  Retrying ${context.method} ${context.path} after ${delay}ms (attempt ${context.attempt + 1})`);
      },
    });

    this.policyHelper = new PolicyHelper([retryPolicy]);
  }

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
    // Skip if already retrying to avoid infinite loops
    if (this.retrying) {
      return response;
    }

    this.retrying = true;
    try {
      return await this.policyHelper.execute(response, method, path, options, () =>
        this.retryRequest(method, path, options),
      );
    } finally {
      this.retrying = false;
    }
  }

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

// ============================================================================
// Example 2: Advanced Retry Policy with Custom Configuration
// ============================================================================

class PetstoreClientWithAdvancedRetry extends SwaggerPetstoreOpenAPI30 {
  private readonly policyHelper: PolicyHelper;
  private retrying = false;

  constructor(options: ClientOptions = {}) {
    super(options);

    // Custom retry policy with exponential backoff and jitter
    const retryPolicy = new RetryPolicy({
      maxRetries: 5,
      baseDelay: 500,
      maxDelay: 10000,
      strategy: 'exponential-jitter', // Adds randomness to prevent thundering herd
      retryableStatusCodes: [429, 500, 502, 503, 504],
      respectRetryAfter: true, // Respect Retry-After headers
      onRetry: (context, delay) => {
        console.log(
          `🔄 Retry attempt ${context.attempt + 1} for ${context.method} ${context.path} (status: ${context.response.status})`,
        );
        console.log(`   Waiting ${delay}ms before retry...`);
      },
    });

    this.policyHelper = new PolicyHelper([retryPolicy]);
  }

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
    if (this.retrying) {
      return response;
    }

    this.retrying = true;
    try {
      return await this.policyHelper.execute(response, method, path, options, () =>
        this.retryRequest(method, path, options),
      );
    } finally {
      this.retrying = false;
    }
  }

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

// ============================================================================
// Example 3: Multiple Policies (Retry + Logging + Circuit Breaker)
// ============================================================================

class PetstoreClientWithMultiplePolicies extends SwaggerPetstoreOpenAPI30 {
  private readonly policyHelper: PolicyHelper;
  private retrying = false;

  constructor(options: ClientOptions = {}) {
    super(options);

    // Combine multiple policies
    const policies: ResponsePolicy[] = [
      // 1. Logging policy (runs first)
      new LoggingPolicy({
        logRequests: false,
        logResponses: true,
        logErrors: true,
        logger: (message, data) => {
          console.log(`[LOG] ${message}`, data);
        },
      }),

      // 2. Circuit breaker (prevents cascading failures)
      new CircuitBreakerPolicy({
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minute
        failureStatusCodes: [500, 502, 503, 504],
        onOpen: () => {
          console.warn('⚠️  Circuit breaker opened - too many failures');
        },
        onClose: () => {
          console.log('✅ Circuit breaker closed - service recovered');
        },
      }),

      // 3. Retry policy (handles transient failures)
      new RetryPolicy({
        maxRetries: 3,
        baseDelay: 1000,
        strategy: 'exponential',
        retryableStatusCodes: [429, 503, 504],
      }),
    ];

    this.policyHelper = new PolicyHelper(policies);
  }

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
    if (this.retrying) {
      return response;
    }

    this.retrying = true;
    try {
      return await this.policyHelper.execute(response, method, path, options, () =>
        this.retryRequest(method, path, options),
      );
    } finally {
      this.retrying = false;
    }
  }

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

// ============================================================================
// Example Usage
// ============================================================================

async function main() {
  console.log('=== Example 1: Basic Retry Policy ===\n');
  const client1 = new PetstoreClientWithRetry({});
  try {
    const pets = await client1.findPetsByStatus('available');
    console.log(`✅ Found ${pets.length} pets\n`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }

  console.log('\n=== Example 2: Advanced Retry Policy ===\n');
  const client2 = new PetstoreClientWithAdvancedRetry({});
  try {
    const pets = await client2.findPetsByStatus('available');
    console.log(`✅ Found ${pets.length} pets\n`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }

  console.log('\n=== Example 3: Multiple Policies ===\n');
  const client3 = new PetstoreClientWithMultiplePolicies({});
  try {
    const pets = await client3.findPetsByStatus('available');
    console.log(`✅ Found ${pets.length} pets\n`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

void main();

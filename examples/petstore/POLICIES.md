# Response Handling Policies

The policy system allows you to handle HTTP responses with configurable strategies for retries, circuit breakers, logging, and more.

**Important**: `zod-codegen` is a dev-dependency (code generation tool), not a runtime dependency. Policies should be implemented locally in your project, not imported from `zod-codegen`. This example demonstrates how to implement policies locally. You can copy the implementations from this example or implement your own custom policies.

## Available Policies

### 1. RetryPolicy

Handles automatic retries for specific HTTP status codes with configurable backoff strategies.

**Configuration Options:**

- `maxRetries` (default: 3) - Maximum number of retry attempts
- `baseDelay` (default: 1000) - Base delay in milliseconds before first retry
- `maxDelay` (default: 30000) - Maximum delay in milliseconds
- `strategy` (default: 'exponential') - Backoff strategy: 'fixed', 'linear', 'exponential', 'exponential-jitter'
- `retryableStatusCodes` (default: [429, 503, 504]) - Status codes to retry on
- `respectRetryAfter` (default: true) - Whether to respect Retry-After header
- `shouldRetry` - Custom function to determine if a response should be retried
- `calculateDelay` - Custom function to calculate retry delay
- `onRetry` - Callback called before each retry attempt

**Example:**

```typescript
// Import from your local policies implementation
import {RetryPolicy, PolicyHelper} from './policies.js';

const retryPolicy = new RetryPolicy({
  maxRetries: 5,
  baseDelay: 500,
  strategy: 'exponential-jitter',
  retryableStatusCodes: [429, 503, 504],
  onRetry: (context, delay) => {
    console.log(`Retrying after ${delay}ms...`);
  },
});

const policyHelper = new PolicyHelper([retryPolicy]);
```

### 2. CircuitBreakerPolicy

Prevents cascading failures by opening the circuit after a threshold of failures.

**Configuration Options:**

- `failureThreshold` (default: 5) - Number of failures before opening the circuit
- `resetTimeout` (default: 60000) - Time in milliseconds to wait before attempting to close the circuit
- `failureStatusCodes` (default: [500, 502, 503, 504]) - Status codes that count as failures
- `onOpen` - Callback when circuit opens
- `onClose` - Callback when circuit closes

**Example:**

```typescript
// Import from your local policies implementation
import {CircuitBreakerPolicy, PolicyHelper} from './policies.js';

const circuitBreaker = new CircuitBreakerPolicy({
  failureThreshold: 5,
  resetTimeout: 60000,
  onOpen: () => console.warn('Circuit opened'),
  onClose: () => console.log('Circuit closed'),
});

const policyHelper = new PolicyHelper([circuitBreaker]);
```

### 3. LoggingPolicy

Logs requests, responses, and errors for debugging and monitoring.

**Configuration Options:**

- `logRequests` (default: false) - Whether to log requests
- `logResponses` (default: false) - Whether to log responses
- `logErrors` (default: true) - Whether to log errors
- `logger` - Custom logger function

**Example:**

```typescript
// Import from your local policies implementation
import {LoggingPolicy, PolicyHelper} from './policies.js';

const logging = new LoggingPolicy({
  logResponses: true,
  logErrors: true,
  logger: (message, data) => {
    console.log(`[API] ${message}`, data);
  },
});

const policyHelper = new PolicyHelper([logging]);
```

## Using Policies with Generated Clients

To use policies with your generated client, extend the client and override `handleResponse`:

```typescript
import { YourGeneratedClient } from './generated/type.js';
// Import from your local policies implementation
import { RetryPolicy, PolicyHelper } from './policies.js';

class MyClient extends YourGeneratedClient {
  private readonly policyHelper: PolicyHelper;
  private retrying = false;

  constructor(options = {}) {
    super(options);

    const retryPolicy = new RetryPolicy({
      maxRetries: 3,
      baseDelay: 1000,
      strategy: 'exponential',
    });

    this.policyHelper = new PolicyHelper([retryPolicy]);
  }

  protected async handleResponse<T>(
    response: Response,
    method: string,
    path: string,
    options: {...},
  ): Promise<Response> {
    // Prevent infinite loops
    if (this.retrying) {
      return response;
    }

    this.retrying = true;
    try {
      return await this.policyHelper.execute(
        response,
        method,
        path,
        options,
        () => this.retryRequest(method, path, options),
      );
    } finally {
      this.retrying = false;
    }
  }

  private async retryRequest(...): Promise<Response> {
    // Reconstruct and make the request
    // (see examples for full implementation)
  }
}
```

## Combining Multiple Policies

You can combine multiple policies by passing them all to `PolicyHelper`:

```typescript
const policies = [
  new LoggingPolicy({logResponses: true}),
  new CircuitBreakerPolicy({failureThreshold: 5}),
  new RetryPolicy({maxRetries: 3}),
];

const policyHelper = new PolicyHelper(policies);
```

Policies are executed in order. If a policy sets `stopPropagation: true`, subsequent policies won't run.

## Backoff Strategies

The RetryPolicy supports several backoff strategies:

- **fixed**: Constant delay (`baseDelay`)
- **linear**: Linear increase (`baseDelay * (attempt + 1)`)
- **exponential**: Exponential backoff (`baseDelay * 2^attempt`)
- **exponential-jitter**: Exponential backoff with random jitter to prevent thundering herd

## Custom Policies

You can create custom policies by implementing the `ResponsePolicy` interface:

```typescript
// Import from your local policies implementation
import type {ResponsePolicy, ResponseContext, PolicyResult} from './policies.js';

class MyCustomPolicy implements ResponsePolicy {
  readonly name = 'MyCustomPolicy';

  handle(context: ResponseContext): PolicyResult {
    // Your custom logic here
    if (context.response.status === 418) {
      // Handle I'm a teapot status
      return {response: context.response, stopPropagation: true};
    }
    return {response: context.response};
  }
}
```

## Policy Execution Order

Policies are executed in the order they're provided. The executor:

1. Runs each policy in sequence
2. Stops if a policy sets `stopPropagation: true`
3. Retries if a policy sets `shouldRetry: true`
4. Waits for `retryDelay` milliseconds before retrying
5. Makes a new request and repeats the process

## Best Practices

1. **Order matters**: Place logging policies first, circuit breakers before retries
2. **Prevent infinite loops**: Use a `retrying` flag to prevent `handleResponse` from being called recursively
3. **Respect Retry-After**: Enable `respectRetryAfter` for APIs that provide it
4. **Use jitter**: Use `exponential-jitter` strategy to prevent thundering herd problems
5. **Monitor circuit breakers**: Set callbacks to monitor when circuits open/close
6. **Log appropriately**: Enable logging in development, disable in production for performance

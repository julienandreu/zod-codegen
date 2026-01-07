import type {PolicyResult, ResponseContext, ResponsePolicy, RetryPolicyConfig} from '../types/policies.js';

/**
 * Retry policy implementation
 *
 * Handles retries for specific HTTP status codes with configurable backoff strategies.
 */
export class RetryPolicy implements ResponsePolicy {
  readonly name = 'RetryPolicy';

  private readonly config: Required<
    Pick<RetryPolicyConfig, 'maxRetries' | 'baseDelay' | 'maxDelay' | 'strategy' | 'respectRetryAfter'>
  > & {
    retryableStatusCodes: number[];
    shouldRetry?: RetryPolicyConfig['shouldRetry'];
    calculateDelay?: RetryPolicyConfig['calculateDelay'];
    onRetry?: RetryPolicyConfig['onRetry'];
  };

  constructor(config: RetryPolicyConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      baseDelay: config.baseDelay ?? 1000,
      maxDelay: config.maxDelay ?? 30000,
      strategy: config.strategy ?? 'exponential',
      respectRetryAfter: config.respectRetryAfter ?? true,
      retryableStatusCodes: config.retryableStatusCodes ?? [429, 503, 504],
      shouldRetry: config.shouldRetry,
      calculateDelay: config.calculateDelay,
      onRetry: config.onRetry,
    };
  }

  handle(context: ResponseContext): PolicyResult {
    // Check if we should retry this response
    if (!this.shouldRetry(context)) {
      return {response: context.response};
    }

    // Check if we've exceeded max retries
    if (context.attempt >= this.config.maxRetries) {
      return {response: context.response};
    }

    // Calculate delay
    const retryAfter = this.config.respectRetryAfter ? this.getRetryAfter(context.response) : undefined;
    const delay = this.calculateDelay(context.attempt, retryAfter);

    // Call onRetry callback if provided
    if (this.config.onRetry) {
      const result = this.config.onRetry(context, delay);
      if (result instanceof Promise) {
        // If async, we can't wait for it in sync handle method
        // The executor will handle this
        void result;
      }
    }

    return {
      response: context.response,
      shouldRetry: true,
      retryDelay: delay,
    };
  }

  private shouldRetry(context: ResponseContext): boolean {
    // Use custom shouldRetry function if provided
    const customShouldRetry = this.config.shouldRetry;
    if (customShouldRetry) {
      return customShouldRetry(context);
    }

    // Check if status code is retryable
    return this.config.retryableStatusCodes.includes(context.response.status);
  }

  private calculateDelay(attempt: number, retryAfter?: number): number {
    // Use Retry-After header if available and respected
    if (retryAfter !== undefined) {
      return Math.min(retryAfter * 1000, this.config.maxDelay);
    }

    // Use custom calculateDelay function if provided
    if (this.config.calculateDelay) {
      return this.config.calculateDelay(attempt, this.config.baseDelay);
    }

    // Calculate delay based on strategy
    let delay: number;
    switch (this.config.strategy) {
      case 'fixed': {
        delay = this.config.baseDelay;
        break;
      }
      case 'linear': {
        delay = this.config.baseDelay * (attempt + 1);
        break;
      }
      case 'exponential': {
        delay = this.config.baseDelay * Math.pow(2, attempt);
        break;
      }
      case 'exponential-jitter': {
        const exponential = this.config.baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * exponential * 0.1; // 10% jitter
        delay = exponential + jitter;
        break;
      }
      default: {
        delay = this.config.baseDelay * Math.pow(2, attempt);
      }
    }

    return Math.min(delay, this.config.maxDelay);
  }

  private getRetryAfter(response: Response): number | undefined {
    const retryAfter = response.headers.get('Retry-After');
    if (!retryAfter) {
      return undefined;
    }

    // Retry-After can be either seconds (number) or HTTP date
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds;
    }

    // Try parsing as HTTP date
    const date = new Date(retryAfter);
    if (!isNaN(date.getTime())) {
      const now = Date.now();
      const delay = Math.max(0, date.getTime() - now);
      return Math.ceil(delay / 1000);
    }

    return undefined;
  }
}

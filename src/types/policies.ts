/**
 * Policy system for handling HTTP responses
 *
 * Policies allow you to intercept and modify responses, implement retry logic,
 * circuit breakers, logging, and other cross-cutting concerns.
 */

export interface ResponseContext {
  readonly response: Response;
  readonly method: string;
  readonly path: string;
  readonly options: {
    params?: Record<string, string | number | boolean>;
    data?: unknown;
    contentType?: string;
    headers?: Record<string, string>;
  };
  readonly attempt: number;
  readonly startTime: number;
}

export interface PolicyResult {
  /**
   * The response to use (may be modified or replaced)
   */
  response: Response;
  /**
   * Whether to stop processing other policies
   */
  stopPropagation?: boolean;
  /**
   * Whether to retry the request (if true, the policy executor will retry)
   */
  shouldRetry?: boolean;
  /**
   * Delay before retry in milliseconds
   */
  retryDelay?: number;
}

/**
 * Base interface for all response handling policies
 */
export interface ResponsePolicy {
  /**
   * Name of the policy (for logging/debugging)
   */
  readonly name: string;

  /**
   * Handle a response. This method is called for each response before error checking.
   *
   * @param context - The response context including the response, request details, and attempt number
   * @returns A policy result indicating how to proceed
   */
  handle(context: ResponseContext): Promise<PolicyResult> | PolicyResult;
}

/**
 * Backoff strategy for retries
 */
export type BackoffStrategy = 'fixed' | 'linear' | 'exponential' | 'exponential-jitter';

/**
 * Configuration for retry policy
 */
export interface RetryPolicyConfig {
  /**
   * Maximum number of retry attempts (default: 3)
   */
  maxRetries?: number;

  /**
   * Base delay in milliseconds before first retry (default: 1000)
   */
  baseDelay?: number;

  /**
   * Maximum delay in milliseconds (default: 30000)
   */
  maxDelay?: number;

  /**
   * Backoff strategy to use (default: 'exponential')
   */
  strategy?: BackoffStrategy;

  /**
   * Status codes to retry on (default: [429, 503, 504])
   */
  retryableStatusCodes?: number[];

  /**
   * Whether to respect Retry-After header (default: true)
   */
  respectRetryAfter?: boolean;

  /**
   * Custom function to determine if a response should be retried
   */
  shouldRetry?: (context: ResponseContext) => boolean;

  /**
   * Custom function to calculate retry delay
   */
  calculateDelay?: (attempt: number, baseDelay: number, retryAfter?: number) => number;

  /**
   * Callback called before each retry attempt
   */
  onRetry?: (context: ResponseContext, delay: number) => void | Promise<void>;
}

/**
 * Circuit breaker state
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Configuration for circuit breaker policy
 */
export interface CircuitBreakerPolicyConfig {
  /**
   * Number of failures before opening the circuit (default: 5)
   */
  failureThreshold?: number;

  /**
   * Time in milliseconds to wait before attempting to close the circuit (default: 60000)
   */
  resetTimeout?: number;

  /**
   * Status codes that count as failures (default: [500, 502, 503, 504])
   */
  failureStatusCodes?: number[];

  /**
   * Callback when circuit opens
   */
  onOpen?: () => void;

  /**
   * Callback when circuit closes
   */
  onClose?: () => void;
}

/**
 * Configuration for timeout policy
 */
export interface TimeoutPolicyConfig {
  /**
   * Request timeout in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Callback when timeout occurs
   */
  onTimeout?: () => void;
}

/**
 * Configuration for logging policy
 */
export interface LoggingPolicyConfig {
  /**
   * Whether to log requests (default: false)
   */
  logRequests?: boolean;

  /**
   * Whether to log responses (default: false)
   */
  logResponses?: boolean;

  /**
   * Whether to log errors (default: true)
   */
  logErrors?: boolean;

  /**
   * Custom logger function
   */
  logger?: (message: string, data?: unknown) => void;
}

/**
 * Configuration for rate limit policy
 */
export interface RateLimitPolicyConfig {
  /**
   * Maximum number of requests per window (default: 100)
   */
  maxRequests?: number;

  /**
   * Time window in milliseconds (default: 60000)
   */
  windowMs?: number;

  /**
   * Whether to queue requests when rate limited (default: false)
   */
  queueRequests?: boolean;

  /**
   * Callback when rate limited
   */
  onRateLimited?: () => void;
}

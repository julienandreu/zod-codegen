import type {CircuitBreakerPolicyConfig, PolicyResult, ResponseContext, ResponsePolicy} from '../types/policies.js';

/**
 * Circuit breaker policy implementation
 *
 * Prevents cascading failures by opening the circuit after a threshold of failures.
 */
export class CircuitBreakerPolicy implements ResponsePolicy {
  readonly name = 'CircuitBreakerPolicy';

  private state: import('../types/policies.js').CircuitState = 'closed';
  private failureCount = 0;
  private nextAttempt = 0;

  private readonly config: Required<Pick<CircuitBreakerPolicyConfig, 'failureThreshold' | 'resetTimeout'>> & {
    failureStatusCodes: number[];
    onOpen?: CircuitBreakerPolicyConfig['onOpen'];
    onClose?: CircuitBreakerPolicyConfig['onClose'];
  };

  constructor(config: CircuitBreakerPolicyConfig = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      resetTimeout: config.resetTimeout ?? 60000,
      failureStatusCodes: config.failureStatusCodes ?? [500, 502, 503, 504],
      onOpen: config.onOpen,
      onClose: config.onClose,
    };
  }

  handle(context: ResponseContext): PolicyResult {
    const now = Date.now();

    // Check if circuit is open
    if (this.state === 'open') {
      // Check if we should attempt to close (half-open)
      if (now >= this.nextAttempt) {
        this.state = 'half-open';
        this.failureCount = 0;
      } else {
        // Circuit is still open, reject immediately
        return {
          response: context.response,
          stopPropagation: true,
        };
      }
    }

    // Check if response indicates failure
    const isFailure = this.isFailure(context.response);

    if (isFailure) {
      this.failureCount++;

      // If we've exceeded threshold, open circuit
      if (this.failureCount >= this.config.failureThreshold) {
        this.state = 'open';
        this.nextAttempt = now + this.config.resetTimeout;
        if (this.config.onOpen) {
          this.config.onOpen();
        }
      }
    } else {
      // Success - reset failure count and close circuit if half-open
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.config.onClose?.();
      }
      this.failureCount = 0;
    }

    return {response: context.response};
  }

  private isFailure(response: Response): boolean {
    return this.config.failureStatusCodes.includes(response.status) || !response.ok;
  }

  /**
   * Get current circuit state
   */
  getState(): import('../types/policies.js').CircuitState {
    return this.state;
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.nextAttempt = 0;
  }
}

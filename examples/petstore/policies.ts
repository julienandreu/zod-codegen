/**
 * Local policy implementations
 *
 * NOTE: zod-codegen is a dev-dependency (code generation tool), not a runtime dependency.
 * Policies should be implemented locally in your project, not imported from zod-codegen.
 *
 * This file demonstrates how to implement policies locally. You can:
 * 1. Copy the policy implementations from zod-codegen's source code
 * 2. Implement your own custom policies
 * 3. Use a separate policy library
 *
 * For reference implementations, see: https://github.com/julienandreu/zod-codegen/tree/main/src/policies
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
  response: Response;
  stopPropagation?: boolean;
  shouldRetry?: boolean;
  retryDelay?: number;
}

export interface ResponsePolicy {
  readonly name: string;
  handle(context: ResponseContext): PolicyResult | Promise<PolicyResult>;
}

export type BackoffStrategy = 'fixed' | 'linear' | 'exponential' | 'exponential-jitter';

export interface RetryPolicyConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  strategy?: BackoffStrategy;
  retryableStatusCodes?: number[];
  respectRetryAfter?: boolean;
  shouldRetry?: (context: ResponseContext) => boolean;
  calculateDelay?: (attempt: number, retryAfter?: number) => number;
  onRetry?: (context: ResponseContext, delay: number) => void | Promise<void>;
}

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
    if (!this.shouldRetry(context)) {
      return {response: context.response};
    }

    if (context.attempt >= this.config.maxRetries) {
      return {response: context.response};
    }

    const retryAfter = this.config.respectRetryAfter ? this.getRetryAfter(context.response) : undefined;
    const delay = this.calculateDelay(context.attempt, retryAfter);

    if (this.config.onRetry) {
      const result = this.config.onRetry(context, delay);
      if (result instanceof Promise) {
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
    if (this.config.shouldRetry) {
      return this.config.shouldRetry(context);
    }
    return this.config.retryableStatusCodes.includes(context.response.status);
  }

  private calculateDelay(attempt: number, retryAfter?: number): number {
    if (retryAfter !== undefined) {
      return Math.min(retryAfter * 1000, this.config.maxDelay);
    }

    if (this.config.calculateDelay) {
      return this.config.calculateDelay(attempt, retryAfter);
    }

    let delay = this.config.baseDelay;

    switch (this.config.strategy) {
      case 'fixed':
        delay = this.config.baseDelay;
        break;
      case 'linear':
        delay = this.config.baseDelay * (attempt + 1);
        break;
      case 'exponential':
        delay = this.config.baseDelay * Math.pow(2, attempt);
        break;
      case 'exponential-jitter':
        const exponential = this.config.baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * exponential * 0.1;
        delay = exponential + jitter;
        break;
    }

    return Math.min(delay, this.config.maxDelay);
  }

  private getRetryAfter(response: Response): number | undefined {
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) {
      const parsed = parseInt(retryAfter, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }
}

export interface CircuitBreakerPolicyConfig {
  failureThreshold?: number;
  resetTimeout?: number;
  failureStatusCodes?: number[];
  onOpen?: () => void;
  onClose?: () => void;
}

type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreakerPolicy implements ResponsePolicy {
  readonly name = 'CircuitBreakerPolicy';

  private state: CircuitState = 'closed';
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

    if (this.state === 'open') {
      if (now >= this.nextAttempt) {
        this.state = 'half-open';
        this.failureCount = 0;
      } else {
        return {
          response: context.response,
          stopPropagation: true,
        };
      }
    }

    const isFailure = this.isFailure(context.response);

    if (isFailure) {
      this.failureCount++;

      if (this.failureCount >= this.config.failureThreshold) {
        this.state = 'open';
        this.nextAttempt = now + this.config.resetTimeout;
        if (this.config.onOpen) {
          this.config.onOpen();
        }
      }
    } else {
      if (this.state === 'half-open') {
        this.state = 'closed';
        if (this.config.onClose) {
          this.config.onClose();
        }
      }
      this.failureCount = 0;
    }

    return {response: context.response};
  }

  private isFailure(response: Response): boolean {
    return this.config.failureStatusCodes.includes(response.status);
  }
}

export interface LoggingPolicyConfig {
  logRequests?: boolean;
  logResponses?: boolean;
  logErrors?: boolean;
  logger?: (message: string, data?: unknown) => void;
}

export class LoggingPolicy implements ResponsePolicy {
  readonly name = 'LoggingPolicy';

  private readonly config: Required<Pick<LoggingPolicyConfig, 'logRequests' | 'logResponses' | 'logErrors'>> &
    Pick<LoggingPolicyConfig, 'logger'>;

  constructor(config: LoggingPolicyConfig = {}) {
    this.config = {
      logRequests: config.logRequests ?? false,
      logResponses: config.logResponses ?? false,
      logErrors: config.logErrors ?? true,
      logger: config.logger ?? console.log,
    };
  }

  handle(context: ResponseContext): PolicyResult {
    const duration = Date.now() - context.startTime;
    const isError = !context.response.ok;

    if (this.config.logResponses || (this.config.logErrors && isError)) {
      const logData = {
        method: context.method,
        path: context.path,
        status: context.response.status,
        statusText: context.response.statusText,
        duration: `${String(duration)}ms`,
        attempt: context.attempt,
      };

      const logger = this.config.logger;
      if (isError && logger) {
        logger(`[HTTP Error] ${context.method} ${context.path} - ${String(context.response.status)}`, logData);
      } else if (this.config.logResponses && logger) {
        logger(`[HTTP Response] ${context.method} ${context.path} - ${String(context.response.status)}`, logData);
      }
    }

    return {response: context.response};
  }
}

export class PolicyExecutor {
  private readonly policies: ResponsePolicy[];

  constructor(policies: ResponsePolicy[]) {
    this.policies = policies;
  }

  async execute(context: ResponseContext, makeRequest: () => Promise<Response>): Promise<Response> {
    let currentContext = context;
    let attempt = 0;

    while (true) {
      let result: PolicyResult | null = null;
      let stopPropagation = false;

      for (const policy of this.policies) {
        const policyResult = await this.executePolicy(policy, currentContext);
        result = policyResult;

        if (policyResult.stopPropagation) {
          stopPropagation = true;
          break;
        }

        if (policyResult.shouldRetry) {
          break;
        }
      }

      if (stopPropagation) {
        return result?.response ?? currentContext.response;
      }

      if (result?.shouldRetry && attempt < 10) {
        const delay = result.retryDelay ?? 1000;
        await this.sleep(delay);

        attempt++;
        const newResponse = await makeRequest();
        currentContext = {
          ...currentContext,
          response: newResponse,
          attempt,
        };
        continue;
      }

      return result?.response ?? currentContext.response;
    }
  }

  private async executePolicy(policy: ResponsePolicy, context: ResponseContext): Promise<PolicyResult> {
    try {
      const result = policy.handle(context);
      return result instanceof Promise ? await result : result;
    } catch (error) {
      console.error(`[PolicyExecutor] Policy ${policy.name} threw an error:`, error);
      return {response: context.response};
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class PolicyHelper {
  private readonly executor: PolicyExecutor;

  constructor(policies: ResponsePolicy[]) {
    this.executor = new PolicyExecutor(policies);
  }

  async execute(
    response: Response,
    method: string,
    path: string,
    options: {
      params?: Record<string, string | number | boolean>;
      data?: unknown;
      contentType?: string;
      headers?: Record<string, string>;
    },
    makeRequest: () => Promise<Response>,
  ): Promise<Response> {
    const context: ResponseContext = {
      response,
      method,
      path,
      options,
      attempt: 0,
      startTime: Date.now(),
    };

    return await this.executor.execute(context, makeRequest);
  }
}

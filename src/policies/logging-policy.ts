import type {LoggingPolicyConfig, PolicyResult, ResponseContext, ResponsePolicy} from '../types/policies.js';

/**
 * Logging policy implementation
 *
 * Logs requests, responses, and errors for debugging and monitoring.
 */
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

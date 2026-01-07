import type {PolicyResult, ResponseContext, ResponsePolicy} from '../types/policies.js';

/**
 * Executes policies in sequence, handling retries and propagation
 */
export class PolicyExecutor {
  private readonly policies: ResponsePolicy[];

  constructor(policies: ResponsePolicy[]) {
    this.policies = policies;
  }

  /**
   * Execute all policies and handle retries
   */
  async execute(context: ResponseContext, makeRequest: () => Promise<Response>): Promise<Response> {
    let currentContext = context;
    let attempt = 0;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      // Execute all policies
      let result: PolicyResult | null = null;
      let stopPropagation = false;

      for (const policy of this.policies) {
        const policyResult = await this.executePolicy(policy, currentContext);
        result = policyResult;

        // If policy says to stop propagation, break
        if (policyResult.stopPropagation) {
          stopPropagation = true;
          break;
        }

        // If policy says to retry, break and retry
        if (policyResult.shouldRetry) {
          break;
        }
      }

      // If we should stop propagation, return the response
      if (stopPropagation) {
        return result?.response ?? currentContext.response;
      }

      // If we should retry, wait and retry
      if (result?.shouldRetry && attempt < 10) {
        // Prevent infinite loops
        const delay = result.retryDelay ?? 1000;
        await this.sleep(delay);

        attempt++;
        // Make a new request
        const newResponse = await makeRequest();
        currentContext = {
          ...currentContext,
          response: newResponse,
          attempt,
        };
        continue;
      }

      // No retry needed, return the response
      return result?.response ?? currentContext.response;
    }
  }

  private async executePolicy(policy: ResponsePolicy, context: ResponseContext): Promise<PolicyResult> {
    try {
      const result = policy.handle(context);
      return result instanceof Promise ? await result : result;
    } catch (error) {
      // If policy throws, log and continue with original response
      console.error(`[PolicyExecutor] Policy ${policy.name} threw an error:`, error);
      return {response: context.response};
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

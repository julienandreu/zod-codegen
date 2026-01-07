import type {ResponseContext, ResponsePolicy} from '../types/policies.js';
import {PolicyExecutor} from './policy-executor.js';

/**
 * Helper class for creating policy-enabled clients
 *
 * This provides utilities for integrating policies with generated clients.
 * Extend your generated client and use these helpers in your handleResponse override.
 */
export class PolicyHelper {
  private readonly executor: PolicyExecutor;

  constructor(policies: ResponsePolicy[]) {
    this.executor = new PolicyExecutor(policies);
  }

  /**
   * Execute policies for a response
   *
   * Use this in your handleResponse override to apply policies.
   */
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

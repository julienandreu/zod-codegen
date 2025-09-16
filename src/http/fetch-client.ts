import {HttpClient, HttpError, HttpRequestConfig, HttpResponse} from '../types/http.js';

declare const globalThis: typeof global & {
  fetch?: typeof fetch;
  Headers?: typeof Headers;
  Request?: typeof Request;
  Response?: typeof Response;
};

type FetchFunction = (input: string | Request, init?: RequestInit) => Promise<Response>;

type HeadersConstructor = new (init?: HeadersInit) => Headers;

export class FetchHttpClient implements HttpClient {
  private readonly fetch: FetchFunction;
  private readonly Headers: HeadersConstructor;

  constructor(
    private readonly baseUrl = '',
    private readonly defaultHeaders: Record<string, string> = {},
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeof globalThis.fetch === 'function' && globalThis.Headers) {
      this.fetch = globalThis.fetch.bind(globalThis);
      this.Headers = globalThis.Headers;
      return;
    }

    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      this.fetch = window.fetch.bind(window);
      this.Headers = window.Headers;
      return;
    }

    throw new Error(
      "Fetch API is not available. Please ensure you're running in a compatible environment or polyfill fetch.",
    );
  }

  async request<TResponse = unknown, TRequest = unknown>(
    config: HttpRequestConfig<TRequest>,
  ): Promise<HttpResponse<TResponse>> {
    const url = this.buildUrl(config.url, config.params);
    const headers = this.buildHeaders(config.headers);
    const body = this.buildBody(config.data, headers);

    const controller = new AbortController();
    const timeoutId = config.timeout
      ? setTimeout(() => {
          controller.abort();
        }, config.timeout)
      : undefined;

    try {
      const response = await this.fetch(url, {
        method: config.method,
        headers,
        body,
        signal: controller.signal,
      });

      const responseHeaders = this.extractHeaders(response.headers);
      const data = await this.parseResponse<TResponse>(response);

      if (!response.ok) {
        throw new HttpError(`HTTP ${String(response.status)}: ${response.statusText}`, response.status, {
          data,
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          url: response.url,
        });
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        url: response.url,
      };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new HttpError('Request timeout', 408);
        }
        throw new HttpError(`Network error: ${error.message}`, 0);
      }

      throw new HttpError('Unknown network error', 0);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(path, this.baseUrl || 'http://localhost');

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return url.toString();
  }

  private buildHeaders(customHeaders?: Record<string, string>): Headers {
    const headers = new this.Headers();

    Object.entries(this.defaultHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    if (customHeaders) {
      Object.entries(customHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }

    return headers;
  }

  private buildBody(data?: unknown, headers?: Headers): string | null {
    if (!data) {
      return null;
    }

    const contentType = headers?.get('content-type') ?? 'application/json';

    if (contentType.includes('application/json')) {
      if (!headers?.has('content-type')) {
        headers?.set('content-type', 'application/json');
      }
      return JSON.stringify(data);
    }

    if (typeof data === 'string') {
      return data;
    }

    return JSON.stringify(data);
  }

  private extractHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key.toLowerCase()] = value;
    });
    return result;
  }

  private async parseResponse<TResponse>(response: Response): Promise<TResponse> {
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      return (await response.json()) as TResponse;
    }

    if (contentType.includes('text/')) {
      return (await response.text()) as unknown as TResponse;
    }

    try {
      const text = await response.text();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return text ? JSON.parse(text) : ({} as TResponse);
    } catch {
      return {} as TResponse;
    }
  }
}

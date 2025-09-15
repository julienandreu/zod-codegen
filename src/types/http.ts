export interface HttpRequestConfig<TData = unknown> {
  readonly url: string;
  readonly method: HttpMethod;
  readonly headers?: Record<string, string>;
  readonly params?: Record<string, string | number | boolean>;
  readonly data?: TData;
  readonly timeout?: number;
}

export interface HttpResponse<TData = unknown> {
  readonly data: TData;
  readonly status: number;
  readonly statusText: string;
  readonly headers: Record<string, string>;
  readonly url: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface HttpClient {
  request<TResponse = unknown, TRequest = unknown>(
    config: HttpRequestConfig<TRequest>,
  ): Promise<HttpResponse<TResponse>>;
}

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response?: HttpResponse,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

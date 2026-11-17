// Generated from openapi.json by tests/integration/generated-client.test.ts.
// Update with `npx vitest run tests/integration/generated-client.test.ts -u`.
/* eslint-disable */
// @ts-nocheck

// Imports
import { z } from 'zod';

// Explicit type declarations
export interface Pet {
  id: number;
  name: string;
}
export interface Error {
  message: string;
}

// Components schemas
export const Pet: z.ZodType<Pet> = z.object({
  id: z.number().int(),
  name: z.string()
});
export const Error: z.ZodType<Error> = z.object({
  message: z.string()
});
export const serverConfigurations = [
  {
    url: 'https://api.example.com/v1'
  }
];
export const defaultBaseUrl = 'https://api.example.com/v1';
function resolveServerUrl(serverIndex?: number | undefined, serverVariables: Record<string, string> = {}): string {
  const configs = [
    {
      url: 'https://api.example.com/v1'
    }
  ];
  const idx = serverIndex ?? 0;
  if (idx < configs.length) {
    const config = configs[idx];
    let url = config.url;
    if (config.variables && serverVariables) {
      for (const [key, value] of Object.entries(serverVariables)) {
        url = url.replace(new RegExp('\\{' + key + '\\}', 'g'), value);
      }
    }
    return url;
  }
  return 'https://api.example.com/v1';
}
export type RequestOptions = {
  params?: Record<string, unknown>;
  data?: unknown;
  contentType?: string;
  headers?: Record<string, string>;
};
export type ClientOptions = {
  baseUrl?: string;
  serverIndex?: number;
  serverVariables?: Record<string, string>;
  fetch?: typeof globalThis.fetch;
  validateResponses?: boolean;
};
export class HttpError extends globalThis.Error {
  readonly response: Response;
  readonly body: unknown;
  constructor(response: Response, body: unknown) {
    super('HTTP ' + response.status + ': ' + response.statusText);
    this.name = 'HttpError';
    this.response = response;
    this.body = body;
  }
  get status(): number {
    return this.response.status;
  }
}
export class ResponseValidationError<T = unknown> extends globalThis.Error {
  readonly response: Response;
  readonly body: unknown;
  readonly error: z.ZodError<T>;
  constructor(response: Response, body: unknown, error: z.ZodError<T>) {
    super('Response does not match its schema: ' + error.issues.map((issue) => (issue.path.length > 0 ? issue.path.map(String).join('.') + ': ' : '') + issue.message).join('; '));
    this.name = 'ResponseValidationError';
    this.response = response;
    this.body = body;
    this.error = error;
  }
}

// Client class
export default class PetAPI {
  readonly #baseUrl: string;
  readonly #fetch: typeof globalThis.fetch | undefined;
  readonly #validateResponses: boolean;
  constructor(options: ClientOptions = {}) {
    this.#baseUrl = options.baseUrl ?? resolveServerUrl(options.serverIndex, options.serverVariables);
    this.#fetch = options.fetch;
    this.#validateResponses = options.validateResponses ?? true;
  }
  protected getBaseRequestOptions(): Partial<Omit<RequestInit, 'method' | 'body'>> {
    return {};
  }
  protected async handleResponse(response: Response, method: string, path: string, options: RequestOptions): Promise<Response> {
    return response;
  }
  protected async send(method: string, path: string, options: RequestOptions = {}): Promise<Response> {
    const url = new globalThis.URL(this.#baseUrl.replace(/\/+$/, '') + path);
    for (const [key, value] of Object.entries(options.params ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
    const baseOptions = this.getBaseRequestOptions();
    const headers = new globalThis.Headers(baseOptions.headers);
    let body: string | undefined;
    if (options.data !== undefined) {
      if (options.contentType === 'application/x-www-form-urlencoded') {
        const form = new globalThis.URLSearchParams();
        for (const [key, value] of Object.entries(options.data as Record<string, unknown>)) {
          if (value !== undefined) {
            form.set(key, String(value));
          }
        }
        body = form.toString();
      } else {
        body = JSON.stringify(options.data);
      }
      headers.set('Content-Type', options.contentType ?? 'application/json');
    }
    for (const [key, value] of Object.entries(options.headers ?? {})) {
      headers.set(key, value);
    }
    const fetchFn = this.#fetch ?? globalThis.fetch;
    const response = await fetchFn(url, { ...baseOptions, method, headers, body });
    return this.handleResponse(response, method, path, options);
  }
  protected async readBody(response: Response): Promise<unknown> {
    if (response.status === 204 || response.status === 205) {
      return undefined;
    }
    const text = await response.text();
    if (text === '') {
      return undefined;
    }
    const mediaType = response.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase();
    if (mediaType === undefined || mediaType === 'application/json' || mediaType.endsWith('+json')) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    return text;
  }
  async #parse<T>(response: Response, schemas: Readonly<Record<string, z.ZodType | null>>): Promise<T> {
    const body = await this.readBody(response);
    if (!response.ok) {
      throw new HttpError(response, body);
    }
    const status = String(response.status);
    const range = status.charAt(0) + 'XX';
    const schema = status in schemas ? schemas[status] : range in schemas ? schemas[range] : schemas['*'];
    if (!schema || !this.#validateResponses) {
      return body as T;
    }
    const result = schema.safeParse(body);
    if (!result.success) {
      throw new ResponseValidationError<T>(response, body, result.error as z.ZodError<T>);
    }
    return result.data as T;
  }
  /**
   * @param tag
   * @returns {Pet[]}
   */
  async listPets(tag?: string): Promise<Pet[]> {
    return this.#parse<Pet[]>(await this.send('GET', '/pets', { params: { tag: tag } }), {});
  }
  /**
   * @param body
   * @returns {Pet}
   */
  async createPet(body: Pet): Promise<Pet> {
    return this.#parse<Pet>(await this.send('POST', '/pets', { data: body }), { '*': Pet });
  }
  /**
   * @param id
   * @returns {Pet}
   */
  async getPet(id: number): Promise<Pet> {
    return this.#parse<Pet>(await this.send('GET', `/pets/${id}`, {}), { '*': Pet });
  }
  /**
   * @param id
   * @returns {void}
   */
  async petExists_head(id: number): Promise<void> {
    return this.#parse<void>(await this.send('HEAD', `/pets/${id}`, {}), {});
  }
  /**
   * @param id
   * @returns {void}
   */
  async deletePet(id: number): Promise<void> {
    return this.#parse<void>(await this.send('DELETE', `/pets/${id}`, {}), {});
  }
  /**
   * @param id
   * @returns {void}
   */
  async getPetStatus(id: number): Promise<void> {
    return this.#parse<void>(await this.send('GET', `/pets/${id}/status`, {}), {});
  }
  /**
   * @returns {void}
   */
  async getInventory(): Promise<void> {
    return this.#parse<void>(await this.send('GET', '/inventory', {}), {});
  }
  /**
   * @returns {Record<string, unknown>}
   */
  async echo(): Promise<Record<string, unknown>> {
    return this.#parse<Record<string, unknown>>(await this.send('GET', '/echo', {}), {});
  }
}

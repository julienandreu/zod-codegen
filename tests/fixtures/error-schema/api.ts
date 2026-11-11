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
    url: 'https://api.example.com'
  }
];
export const defaultBaseUrl = 'https://api.example.com';
export type ClientOptions = {
  baseUrl?: string;
  serverIndex?: number;
  serverVariables?: Record<string, string>;
};
function resolveServerUrl(serverIndex?: number | undefined, serverVariables: Record<string, string> = {}): string {
  const configs = [
    {
      url: 'https://api.example.com'
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
  return 'https://api.example.com';
}
export class ResponseValidationError<T> extends globalThis.Error {
  readonly response: unknown;
  readonly error: z.ZodError<T>;
  constructor(message: string, response: unknown, error: z.ZodError<T>) {
    super(message);
    this.name = 'ResponseValidationError' as const;
    this.response = response;
    this.error = error;
  }
  get data(): unknown {
    return this.response;
  }
}

// Client class
export default class PetAPI {
  readonly #baseUrl: string;
  constructor(options: ClientOptions) {
    const resolvedUrl = options.baseUrl ?? resolveServerUrl(options.serverIndex, options.serverVariables);
    this.#baseUrl = resolvedUrl;
  }
  protected getBaseRequestOptions(): Partial<Omit<RequestInit, 'method' | 'body'>> {
    return {};
  }
  protected async handleResponse<T>(
    response: Response,
    method: string,
    path: string,
    options: _params___Record_string__string___number___boolean___data___unknown__contentType___string__headers___Record_string__string__
  ): Promise<Response> {
    return response;
  }
  protected async makeRequest<T>(
    method: string,
    path: string,
    options: _params___Record_string__string___number___boolean___data___unknown__contentType___string__headers___Record_string__string__ = {}
  ): Promise<T> {
    const baseUrl = new URL(path, this.#baseUrl);
    const url =
      options.params && Object.keys(options.params).length > 0
        ? (() => {
            Object.entries(options.params)
              .filter(([, value]) => value !== undefined)
              .forEach(([key, value]) => {
                baseUrl.searchParams.set(key, String(value));
              });
            return baseUrl.toString();
          })()
        : baseUrl.toString();
    const baseOptions = this.getBaseRequestOptions();
    const contentType = options.contentType === 'application/x-www-form-urlencoded' ? 'application/x-www-form-urlencoded' : 'application/json';
    const baseHeaders = baseOptions.headers !== undefined ? baseOptions.headers : {};
    const headers = Object.assign({}, baseHeaders, { 'Content-Type': contentType }, options.headers !== undefined ? options.headers : {});
    const body =
      options.data !== undefined
        ? options.contentType === 'application/x-www-form-urlencoded'
          ? (() => {
              const params = new URLSearchParams();
              Object.entries(options.data).forEach(([key, value]) => {
                params.set(key, String(value));
              });
              return params.toString();
            })()
          : JSON.stringify(options.data)
        : null;
    const rawResponse = await fetch(url, Object.assign({}, baseOptions, { method, headers: headers, body: body }));
    const response = await this.handleResponse<T>(rawResponse, method, path, options);
    if (!response.ok) throw new globalThis.Error(`HTTP ${response.status}: ${response.statusText}`);
    if (response.status === 204 || response.status === 205) {
      return undefined as T;
    }
    return await response.json();
  }
  /**
   * @param id
   * @returns {Pet}
   */
  async getPet(id: number): Promise<Pet> {
    const response = await this.makeRequest('GET', `/pets/${id}`, {});
    const parsedPet = Pet.safeParse(response);
    if (!parsedPet.success) {
      throw new ResponseValidationError<Pet>(`Invalid pet: ${parsedPet.error.issues.map((error) => error.message).join(', ')}`, response, parsedPet.error);
    }
    return parsedPet.data;
  }
}

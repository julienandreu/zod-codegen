// The parts of a generated client that do not depend on the spec. They are kept as TypeScript source
// and parsed into nodes by the generator. Keep them erasable TypeScript (no enums, namespaces or
// parameter properties): generated clients are loaded under Node type stripping. Avoid template
// literals too, so the source needs no escaping here.

export const buildRuntimeDeclarationsSource = (hasServers: boolean): string => String.raw`
export type RequestOptions = {
    params?: Record<string, unknown>;
    data?: unknown;
    contentType?: string;
    headers?: Record<string, string>;
};

export type ClientOptions = {
    baseUrl${hasServers ? '?' : ''}: string;
${hasServers ? '    serverIndex?: number;\n    serverVariables?: Record<string, string>;' : ''}
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
`;

export const buildClientMembersSource = (hasServers: boolean): string => String.raw`
class Client {
    readonly #baseUrl: string;
    readonly #fetch: typeof globalThis.fetch | undefined;
    readonly #validateResponses: boolean;
    constructor(options: ClientOptions${hasServers ? ' = {}' : ''}) {
        this.#baseUrl = ${hasServers ? 'options.baseUrl ?? resolveServerUrl(options.serverIndex, options.serverVariables)' : 'options.baseUrl'};
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
}
`;

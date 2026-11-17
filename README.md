# zod-codegen

[![npm version](https://img.shields.io/npm/v/zod-codegen.svg)](https://www.npmjs.com/package/zod-codegen)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![CI](https://github.com/julienandreu/zod-codegen/workflows/CI/badge.svg)](https://github.com/julienandreu/zod-codegen/actions)
[![Coverage](https://img.shields.io/codecov/c/github/julienandreu/zod-codegen)](https://codecov.io/gh/julienandreu/zod-codegen)

A powerful TypeScript code generator that creates **Zod schemas** and **type-safe clients** from OpenAPI specifications.

## 🚀 Features

- **🔥 Zod Schema Generation**: Automatically generate Zod validation schemas from OpenAPI component schemas
- **🎯 Type-Safe Client**: Generate a fully type-safe API client class with methods for each endpoint
- **📡 Multiple Formats**: Support for OpenAPI 3.x specifications in JSON and YAML formats
- **🌐 Remote Files**: Fetch OpenAPI specs from URLs using native fetch API
- **⚡ Fast**: Optimized for performance with minimal dependencies
- **🔧 Advanced Schema Support**: Handles logical operators (anyOf, oneOf, allOf, not), enums, discriminators, and complex nested schemas
- **📦 Single File Output**: Generates all schemas and client in one convenient TypeScript file
- **🛡️ Runtime Validation**: Every success response with a schema is validated with Zod, picked by status code (`validateResponses: false` turns it off)
- **🚨 Typed Errors**: `HttpError` for non-2xx responses (with the `Response`, status and decoded body) and `ResponseValidationError` for bodies that don't match their schema
- **🌍 Form Support**: Supports both JSON and form-urlencoded request bodies, preferring JSON when an operation accepts both
- **🔐 Extensible**: Override `getBaseRequestOptions()` for authentication, headers and other fetch options, and `send()`, `readBody()` or `handleResponse()` for transport, decoding, retries and logging
- **🧪 Injectable fetch**: Pass `fetch` in the client options for tests or runtimes without a global `fetch`
- **🌐 Server Configuration**: Full support for OpenAPI server variables and templating (e.g., `{environment}.example.com`)
- **⚙️ Flexible Client Options**: Options-based constructor supporting server selection, variable overrides, and custom base URLs

## 📦 Installation

### Global Installation (CLI)

```bash
npm install -g zod-codegen
```

### Project Installation

```bash
npm install --save-dev zod-codegen
```

## 🔧 Usage

### Command Line Interface

```bash
# Generate from local file
zod-codegen --input ./openapi.json --output ./generated

# Generate from URL
zod-codegen --input https://api.example.com/openapi.json --output ./api

# Generate with custom output directory
zod-codegen -i ./swagger.yaml -o ./src/generated
```

#### CLI Options

| Option                | Alias | Description                                                    | Default     |
| --------------------- | ----- | -------------------------------------------------------------- | ----------- |
| `--input`             | `-i`  | Path or URL to OpenAPI file                                    | Required    |
| `--output`            | `-o`  | Output directory (writes api.ts) or path to the generated file | `generated` |
| `--naming-convention` | `-n`  | Naming convention for operation IDs                            | (none)      |
| `--help`              | `-h`  | Show help                                                      |             |
| `--version`           | `-v`  | Show version                                                   |             |

#### Naming Conventions

The `--naming-convention` option allows you to transform operation IDs according to common naming conventions. Supported conventions:

- `camelCase` - e.g., `getUserById`
- `PascalCase` - e.g., `GetUserById`
- `snake_case` - e.g., `get_user_by_id`
- `kebab-case` - e.g., `get-user-by-id`
- `SCREAMING_SNAKE_CASE` - e.g., `GET_USER_BY_ID`
- `SCREAMING-KEBAB-CASE` - e.g., `GET-USER-BY-ID`

**Example:**

```bash
# Transform operation IDs to camelCase
zod-codegen --input ./openapi.json --output ./generated --naming-convention camelCase

# Transform operation IDs to snake_case
zod-codegen -i ./openapi.json -o ./generated -n snake_case
```

This is particularly useful when OpenAPI specs have inconsistent or poorly named operation IDs.

### Programmatic Usage

```typescript
import { Generator } from 'zod-codegen';
import type { GeneratorOptions } from 'zod-codegen';

// Create a simple reporter object
const reporter = {
  log: (...args: unknown[]) => console.log(...args),
  error: (...args: unknown[]) => console.error(...args)
};

// Create generator instance with naming convention
const generator = new Generator(
  'my-app',
  '1.0.0',
  reporter,
  './openapi.json', // Input path or URL
  './generated', // Output directory
  {
    namingConvention: 'camelCase' // Transform operation IDs to camelCase
  }
);

// Run the generator
const exitCode = await generator.run();
```

#### Custom Operation Name Transformer

For more advanced use cases, you can provide a custom transformer function that receives full operation details:

```typescript
import { Generator } from 'zod-codegen';
import type { GeneratorOptions, OperationDetails } from 'zod-codegen';

const customTransformer: GeneratorOptions['operationNameTransformer'] = (details: OperationDetails) => {
  // details includes: operationId, method, path, tags, summary, description
  const { operationId, method, tags } = details;

  // Example: Prefix with HTTP method and tag
  const tag = tags?.[0] || 'default';
  return `${method.toUpperCase()}_${tag}_${operationId}`;
};

const generator = new Generator('my-app', '1.0.0', reporter, './openapi.json', './generated', {
  operationNameTransformer: customTransformer
});
```

**Note:** Custom transformers take precedence over naming conventions if both are provided.

## 📁 Generated Output

The generator creates a single TypeScript file (`api.ts`) containing:

- **Zod Schemas**: Exported Zod validation schemas and TypeScript types for all component schemas defined in your OpenAPI spec
- **Response Schemas**: An exported `<Operation>Response` type and schema for each inline response schema (arrays, objects, primitives)
- **API Client Class**: A type-safe client class with methods for each endpoint operation
- **Error Classes**: `HttpError` for non-2xx responses and `ResponseValidationError` for bodies that fail their schema
- **Server Configuration**: `serverConfigurations` array and `defaultBaseUrl` constant extracted from OpenAPI servers
- **Client Options Type**: `ClientOptions` for server selection, variable overrides, a custom `fetch` and turning validation off
- **Protected Extension Points**: `getBaseRequestOptions()`, `handleResponse()`, `send()` and `readBody()`

Names that would clash with a JavaScript global, a reserved word or a generated name get a `Schema` suffix (then a number if needed), and every reference follows: a schema named `Error` is exported as `ErrorSchema`.

### Generated Client Structure

The generated client class includes:

```typescript
export default class YourAPI {
  // `options` defaults to {} when the spec defines servers; otherwise `baseUrl` is required
  constructor(options: ClientOptions);

  // Override to customize request options: headers (authentication), signal, credentials, cache, ...
  protected getBaseRequestOptions(): Partial<Omit<RequestInit, 'method' | 'body'>>;

  // Called by send() with each response before its body is read: retries, logging, custom errors
  protected async handleResponse(response: Response, method: string, path: string, options: RequestOptions): Promise<Response>;

  // Transport: builds the URL, headers and body, calls fetch and returns the Response (never reads the body)
  protected async send(method: string, path: string, options?: RequestOptions): Promise<Response>;

  // Decoding: reads the body once. Empty bodies, 204, 205 and HEAD give undefined, JSON is parsed, anything else is text
  protected async readBody(response: Response): Promise<unknown>;

  // Generated endpoint methods (one per operationId)
  async yourEndpointMethod(...): Promise<ResponseType>;
}

export type ClientOptions = {
  baseUrl?: string;                         // Override the base URL (required when the spec has no servers)
  serverIndex?: number;                     // Select a server by index (0-based)
  serverVariables?: Record<string, string>; // Override server template variables
  fetch?: typeof globalThis.fetch;          // Custom fetch, e.g. for tests
  validateResponses?: boolean;              // Defaults to true; false returns decoded bodies unvalidated
};

// Thrown for any non-2xx status. Extends Error, with the message `HTTP <status>: <statusText>`
export class HttpError extends Error {
  readonly response: Response; // Status, statusText and headers, such as Retry-After
  readonly body: unknown; // Already decoded, since the stream can only be read once
  get status(): number;
}

// Thrown when a 2xx body does not match its schema
export class ResponseValidationError<T = unknown> extends Error {
  readonly response: Response;
  readonly body: unknown; // The value that failed the schema
  readonly error: z.ZodError<T>;
}

// Server configuration (when servers are defined)
export const serverConfigurations: Array<{
  url: string;
  description?: string;
  variables?: Record<string, {
    default: string;
    enum?: string[];
    description?: string;
  }>;
}>;

export const defaultBaseUrl: string;   // First server with default variables
```

### Response Validation

Each method checks the response status, decodes the body once, then validates it against the schema declared for that status:

1. A non-2xx status throws `HttpError`, even when the body is malformed JSON (the raw text is kept as `body`).
2. A 2xx body is validated against the exact status (`201`), then its range (`2XX`), then the operation's other success schemas for any undeclared 2xx status. `default` is only used when an operation declares no 2xx response, so a success is never checked against an error schema.
3. A status declared without content returns `undefined`, and non-JSON content (such as `text/plain`) is returned as text, unvalidated.

The method's return type is the union of its declared success types, for example `Promise<Pet | undefined>` when an operation declares `200` with `Pet` and `204` without content.

### File Structure

```
generated/
└── api.ts             # All schemas and client in one file
```

## 🎯 Example

Given this OpenAPI specification:

```yaml
openapi: 3.0.0
info:
  title: User API
  version: 1.0.0
servers:
  - url: https://api.example.com
paths:
  /users/{id}:
    get:
      operationId: getUserById
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        email:
          type: string
          format: email
      required: [id, name, email]
```

**Generated Output** (`generated/api.ts`):

```typescript
import { z } from 'zod';

// Explicit type declarations
export interface User {
  id: number;
  name: string;
  email: string;
}

// Components schemas
export const User: z.ZodType<User> = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.email()
});

// Server configuration (when servers are defined in OpenAPI spec)
export const serverConfigurations = [
  {
    url: 'https://api.example.com'
  }
];
export const defaultBaseUrl = 'https://api.example.com';

// ... RequestOptions, ClientOptions, HttpError and ResponseValidationError (see above)

// Client class
export default class UserAPI {
  constructor(options: ClientOptions = {}) {
    // ...
  }

  // ... getBaseRequestOptions, handleResponse, send and readBody (see above)

  async getUserById(id: number): Promise<User> {
    return this.#parse<User>(await this.send('GET', `/users/${id}`, {}), { '200': User, '*': User });
  }
}
```

**Usage:**

```typescript
import UserAPI, { HttpError, ResponseValidationError } from './generated/api';

// Use default server from OpenAPI spec
const client = new UserAPI({});

try {
  const user = await client.getUserById(123);
  // user is fully typed and validated!
} catch (error) {
  if (error instanceof HttpError && error.status === 404) {
    // error.body holds the decoded error body, error.response the headers
  } else if (error instanceof ResponseValidationError) {
    // error.body failed the User schema; error.error is the ZodError
  }
}
```

### Extending the Client

The generated client includes a protected `getBaseRequestOptions()` method that you can override to customize request options. This method returns `Partial<Omit<RequestInit, 'method' | 'body'>>`, allowing you to configure:

- **Headers**: Authentication tokens, User-Agent, custom headers
- **CORS**: `mode`, `credentials` for cross-origin requests
- **Request Options**: `signal` (AbortController), `cache`, `redirect`, `referrer`, etc.

**Important**: Options from `getBaseRequestOptions()` are **merged with** (not replaced by) request-specific options. Base options like `mode`, `credentials`, and `signal` are preserved, while headers are merged: base headers, then `Content-Type` (only when the request has a body), then request headers. See [EXAMPLES.md](EXAMPLES.md) for detailed merging behavior.

The other extension points:

- **`handleResponse()`** runs inside `send()` for every response, before the body is read. Return the response to continue, call `this.send(method, path, options)` again to retry, or throw your own error. See [examples/petstore/retry-handler-usage.ts](examples/petstore/retry-handler-usage.ts).
- **`send()`** performs the request and returns the `Response`. Override it to change how URLs or bodies are built.
- **`readBody()`** decodes the body once. Override it for binary or other non-JSON responses, which are returned as text by default.

To test a client without a network, pass a `fetch` function in the options: `new UserAPI({ fetch: async () => new Response(JSON.stringify(user), { headers: { 'Content-Type': 'application/json' } }) })`.

#### Basic Authentication Example

```typescript
import UserAPI from './generated/api';
import type { ClientOptions } from './generated/api';

class AuthenticatedUserAPI extends UserAPI {
  private accessToken: string | null = null;

  constructor(options: ClientOptions = {}) {
    super(options);
  }

  protected getBaseRequestOptions(): Partial<Omit<RequestInit, 'method' | 'body'>> {
    const options = super.getBaseRequestOptions();
    return {
      ...options,
      headers: {
        ...((options.headers as Record<string, string>) || {}),
        ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {})
      }
    };
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }
}

// Usage
const client = new AuthenticatedUserAPI({});
client.setAccessToken('your-token-here');
const user = await client.getUserById(123); // Includes Authorization header
```

#### Complete Configuration Example

```typescript
import UserAPI from './generated/api';
import type { ClientOptions } from './generated/api';

class FullyConfiguredAPI extends UserAPI {
  private accessToken: string | null = null;

  constructor(options: ClientOptions = {}) {
    super(options);
  }

  protected getBaseRequestOptions(): Partial<Omit<RequestInit, 'method' | 'body'>> {
    const options = super.getBaseRequestOptions();
    return {
      ...options,
      headers: {
        ...((options.headers as Record<string, string>) || {}),
        'User-Agent': 'MyApp/1.0.0',
        ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {})
      },
      mode: 'cors',
      credentials: 'include',
      cache: 'no-cache'
    };
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }
}

// Usage
const client = new FullyConfiguredAPI({});
client.setAccessToken('your-token');
```

#### Available Request Options

You can set any `RequestInit` option except `method` and `body` (which are controlled by the generated code):

| Option           | Type                 | Description                                                         |
| ---------------- | -------------------- | ------------------------------------------------------------------- |
| `headers`        | `HeadersInit`        | Request headers (authentication, User-Agent, etc.)                  |
| `signal`         | `AbortSignal`        | AbortController signal for request cancellation                     |
| `credentials`    | `RequestCredentials` | CORS credentials mode (`'include'`, `'same-origin'`, `'omit'`)      |
| `mode`           | `RequestMode`        | Request mode (`'cors'`, `'no-cors'`, `'same-origin'`, `'navigate'`) |
| `cache`          | `RequestCache`       | Cache mode (`'default'`, `'no-cache'`, `'reload'`, etc.)            |
| `redirect`       | `RequestRedirect`    | Redirect handling (`'follow'`, `'error'`, `'manual'`)               |
| `referrer`       | `string`             | Referrer URL                                                        |
| `referrerPolicy` | `ReferrerPolicy`     | Referrer policy                                                     |
| `integrity`      | `string`             | Subresource integrity hash                                          |
| `keepalive`      | `boolean`            | Keep connection alive                                               |

See [EXAMPLES.md](EXAMPLES.md) for comprehensive examples including:

- Bearer token authentication
- Session management with token refresh
- Custom User-Agent headers
- CORS configuration
- Request cancellation with AbortController
- Environment-specific configurations
- Response handling with custom retry logic, [4xx/5xx error handling](EXAMPLES.md#handling-4xx5xx-in-handleresponse), and error transformation

## ⬆️ Migrating from 1.x to 2.0

Regenerate your clients after upgrading, then check these changes:

**Runtime**

- Node.js 24 or later is required.

**YAML specs**

- Unquoted dates and timestamps are read as strings, as they would be in a JSON spec.
- Explicit `!!timestamp`, `!!binary`, `!!set`, `!!omap` and `!!pairs` tags are rejected, and an empty file fails with a YAML error. Merge keys (`<<`) still work.

**Generated client**

- `makeRequest` is gone. Override `send()` for transport, `readBody()` for decoding or `handleResponse()` for retries and logging. `handleResponse()` is no longer generic, and its options are typed `RequestOptions`.
- Non-2xx responses throw `HttpError` instead of `Error`. It extends `Error` and keeps the `HTTP <status>: <statusText>` message, but read `error.status`, `error.body` and `error.response` rather than parsing the message.
- `ResponseValidationError` takes `(response, body, error)`: `response` is now the `Response`, the decoded body moved to `body`, and the `data` getter is removed.
- More responses are validated: arrays, inline and primitive schemas, and `+json` or `*/*` media types. A response that doesn't match its schema now throws `ResponseValidationError`; pass `validateResponses: false` to skip validation.
- Success bodies are validated against the schema for their status. `default` is only used when an operation declares no 2xx response.
- Return types are the union of the declared success types (for example `Pet | undefined` when a 204 is also declared), and responses with non-JSON content are typed `string`.
- Schemas named like a global, a reserved word or a generated name are exported with a `Schema` suffix: `Error` becomes `ErrorSchema`.
- Clients for specs without servers take `new Client({ baseUrl })` instead of `new Client(baseUrl)`.
- Request URLs keep the server's base path (`https://api.example.com/v1` + `/pets` gives `/v1/pets`; 1.x dropped `/v1`).
- `Content-Type` is only sent with a body, and JSON is sent when an operation accepts both JSON and form data.

## 📖 Examples

Check out the [examples directory](./examples/) for complete, runnable examples:

- **[Petstore API](./examples/petstore/)** - Complete example with the Swagger Petstore API
- **[PokéAPI](./examples/pokeapi/)** - Example with a public REST API

Each example includes:

- Generated client code
- Basic usage examples
- Authentication examples
- README with instructions

## 📚 Documentation

- **[README.md](README.md)** - Project overview and quick start guide
- **[EXAMPLES.md](EXAMPLES.md)** - Comprehensive examples and patterns for extending the client
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Guidelines for contributing to the project
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and changes

## 🛠️ Development

### Prerequisites

- Node.js ≥ 24 (see [.nvmrc](.nvmrc) for the recommended version)
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/julienandreu/zod-codegen.git
cd zod-codegen

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Available Scripts

| Script                  | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `npm run build`         | Build the project                               |
| `npm run build:watch`   | Build in watch mode                             |
| `npm run dev`           | Development mode with example                   |
| `npm test`              | Run tests                                       |
| `npm run test:watch`    | Run tests in watch mode                         |
| `npm run test:coverage` | Run tests with coverage                         |
| `npm run lint`          | Lint and fix code                               |
| `npm run format`        | Format code with Prettier                       |
| `npm run type-check`    | Type check without emitting                     |
| `npm run validate`      | Run all checks (lint, format, type-check, test) |
| `npm run clean`         | Clean build artifacts                           |

## 📋 Requirements

- **Node.js**: ≥ 24
- **TypeScript**: ≥ 5.9.3
- **Zod**: >=4.1.12 <5, installed in your project (generated code imports it; CI tests both ends of the range)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Start for Contributors

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run validation: `npm run validate`
6. Commit your changes: `git commit -m 'feat: add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

## 📝 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENCE) file for details.

## 🙏 Acknowledgments

- [Zod](https://zod.dev/) - TypeScript-first schema validation
- [OpenAPI Specification](https://www.openapis.org/) - API specification standard
- [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript

## 📞 Support

- 🐛 **Bug reports**: [GitHub Issues](https://github.com/julienandreu/zod-codegen/issues)
- 💬 **Questions**: [GitHub Discussions](https://github.com/julienandreu/zod-codegen/discussions)
- 📧 **Email**: [julienandreu@me.com](mailto:julienandreu@me.com)

---

Made with ❤️ by [Julien Andreu](https://github.com/julienandreu)

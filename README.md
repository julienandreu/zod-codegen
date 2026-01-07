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
- **🛡️ Runtime Validation**: Built-in Zod validation for request/response data
- **🌍 Form Support**: Supports both JSON and form-urlencoded request bodies
- **🔐 Extensible**: Override `getBaseRequestOptions()` to add authentication, custom headers, CORS, and other fetch options
- **🔄 Response Policies**: Built-in policy system for retries, circuit breakers, logging, and custom response handling
- **🌐 Server Configuration**: Full support for OpenAPI server variables and templating (e.g., `{environment}.example.com`)
- **⚙️ Flexible Client Options**: Options-based constructor supporting server selection, variable overrides, and custom base URLs

## 📦 Installation

### Global Installation (CLI)

```bash
yarn global add zod-codegen
```

### Project Installation

```bash
yarn add --dev zod-codegen
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

| Option                | Alias | Description                         | Default     |
| --------------------- | ----- | ----------------------------------- | ----------- |
| `--input`             | `-i`  | Path or URL to OpenAPI file         | Required    |
| `--output`            | `-o`  | Directory to output generated files | `generated` |
| `--naming-convention` | `-n`  | Naming convention for operation IDs | (none)      |
| `--help`              | `-h`  | Show help                           |             |
| `--version`           | `-v`  | Show version                        |             |

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
import {Generator} from 'zod-codegen';
import type {GeneratorOptions} from 'zod-codegen';

// Create a simple reporter object
const reporter = {
  log: (...args: unknown[]) => console.log(...args),
  error: (...args: unknown[]) => console.error(...args),
};

// Create generator instance with naming convention
const generator = new Generator(
  'my-app',
  '1.0.0',
  reporter,
  './openapi.json', // Input path or URL
  './generated', // Output directory
  {
    namingConvention: 'camelCase', // Transform operation IDs to camelCase
  },
);

// Run the generator
const exitCode = await generator.run();
```

#### Custom Operation Name Transformer

For more advanced use cases, you can provide a custom transformer function that receives full operation details:

```typescript
import {Generator} from 'zod-codegen';
import type {GeneratorOptions, OperationDetails} from 'zod-codegen';

const customTransformer: GeneratorOptions['operationNameTransformer'] = (details: OperationDetails) => {
  // details includes: operationId, method, path, tags, summary, description
  const {operationId, method, tags} = details;

  // Example: Prefix with HTTP method and tag
  const tag = tags?.[0] || 'default';
  return `${method.toUpperCase()}_${tag}_${operationId}`;
};

const generator = new Generator('my-app', '1.0.0', reporter, './openapi.json', './generated', {
  operationNameTransformer: customTransformer,
});
```

**Note:** Custom transformers take precedence over naming conventions if both are provided.

## 📁 Generated Output

The generator creates a single TypeScript file (`type.ts`) containing:

- **Zod Schemas**: Exported Zod validation schemas for all component schemas defined in your OpenAPI spec
- **API Client Class**: A type-safe client class with methods for each endpoint operation
- **Server Configuration**: `serverConfigurations` array and `defaultBaseUrl` constant extracted from OpenAPI servers
- **Client Options Type**: `ClientOptions` type for flexible server selection and variable overrides
- **Protected Extension Points**:
  - `getBaseRequestOptions()` method for customizing request options
  - `handleResponse()` method for response handling (retries, circuit breakers, etc.)

### Generated Client Structure

The generated client class includes:

```typescript
export class YourAPI {
  readonly #baseUrl: string;

  // Options-based constructor (if servers are defined in OpenAPI spec)
  constructor(options: ClientOptions);

  // Or simple baseUrl constructor (if no servers defined)
  constructor(baseUrl: string = '/', _?: unknown);

  // Protected method - override to customize request options
  protected getBaseRequestOptions(): Partial<Omit<RequestInit, 'method' | 'body'>>;

  // Protected method - override to handle responses (retries, circuit breakers, etc.)
  protected async handleResponse<T>(response: Response, method: string, path: string, options: {...}): Promise<Response>;

  // Private method - handles all HTTP requests
  async #makeRequest<T>(method: string, path: string, options: {...}): Promise<T>;

  // Generated endpoint methods (one per operationId)
  async yourEndpointMethod(...): Promise<ResponseType>;
}

// ClientOptions type (when servers are defined)
export type ClientOptions = {
  baseUrl?: string;                    // Override base URL directly
  serverIndex?: number;                // Select server by index (0-based)
  serverVariables?: Record<string, string>; // Override server template variables
};

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

### File Structure

```
generated/
└── type.ts           # All schemas and client in one file
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

**Generated Output** (`generated/type.ts`):

```typescript
import {z} from 'zod';

// Components schemas
export const User = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string().email(),
});

// Server configuration (when servers are defined in OpenAPI spec)
export const serverConfigurations = [
  {
    url: 'https://api.example.com',
  },
];
export const defaultBaseUrl = 'https://api.example.com';
export type ClientOptions = {
  baseUrl?: string;
  serverIndex?: number;
  serverVariables?: Record<string, string>;
};

// Client class
export class UserAPI {
  readonly #baseUrl: string;

  constructor(options: ClientOptions = {}) {
    this.#baseUrl = options.baseUrl || defaultBaseUrl;
  }

  protected getBaseRequestOptions(): Partial<Omit<RequestInit, 'method' | 'body'>> {
    return {};
  }

  async getUserById(id: number): Promise<z.infer<typeof User>> {
    return User.parse(await this.#makeRequest<z.infer<typeof User>>('GET', `/users/${id}`, {}));
  }

  // ... private #makeRequest method
}
```

**Usage:**

```typescript
import {UserAPI, User} from './generated/type.js';

// Use default server from OpenAPI spec
const client = new UserAPI({});
const user = await client.getUserById(123);
// user is fully typed and validated!
```

### Extending the Client

The generated client includes a protected `getBaseRequestOptions()` method that you can override to customize request options. This method returns `Partial<Omit<RequestInit, 'method' | 'body'>>`, allowing you to configure:

- **Headers**: Authentication tokens, User-Agent, custom headers
- **CORS**: `mode`, `credentials` for cross-origin requests
- **Request Options**: `signal` (AbortController), `cache`, `redirect`, `referrer`, etc.

**Important**: Options from `getBaseRequestOptions()` are **merged with** (not replaced by) request-specific options. Base options like `mode`, `credentials`, and `signal` are preserved, while headers are merged (base headers + Content-Type + request headers). See [EXAMPLES.md](EXAMPLES.md) for detailed merging behavior.

#### Basic Authentication Example

```typescript
import {UserAPI, ClientOptions} from './generated/type.js';

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
        ...(this.accessToken ? {Authorization: `Bearer ${this.accessToken}`} : {}),
      },
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
import {UserAPI, ClientOptions} from './generated/type.js';

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
        ...(this.accessToken ? {Authorization: `Bearer ${this.accessToken}`} : {}),
      },
      mode: 'cors',
      credentials: 'include',
      cache: 'no-cache',
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
- Response handling policies (retries, circuit breakers, logging)

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

- Node.js ≥ 24.11.1
- yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/julienandreu/zod-codegen.git
cd zod-codegen

# Install dependencies
yarn install

# Build the project
yarn build

# Run tests
yarn test

# Run linting
yarn lint

# Format code
yarn format
```

### Testing

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage

# Run tests with UI
yarn test:ui
```

### Available Scripts

| Script               | Description                                     |
| -------------------- | ----------------------------------------------- |
| `yarn build`         | Build the project                               |
| `yarn build:watch`   | Build in watch mode                             |
| `yarn dev`           | Development mode with example                   |
| `yarn test`          | Run tests                                       |
| `yarn test:watch`    | Run tests in watch mode                         |
| `yarn test:coverage` | Run tests with coverage                         |
| `yarn lint`          | Lint and fix code                               |
| `yarn format`        | Format code with Prettier                       |
| `yarn type-check`    | Type check without emitting                     |
| `yarn validate`      | Run all checks (lint, format, type-check, test) |
| `yarn clean`         | Clean build artifacts                           |

## 📋 Requirements

- **Node.js**: ≥ 24.11.1
- **TypeScript**: ≥ 5.9.3
- **Zod**: ≥ 4.1.12

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Start for Contributors

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `yarn test`
5. Run validation: `yarn validate`
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

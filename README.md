# zod-codegen

[![npm version](https://img.shields.io/npm/v/zod-codegen.svg)](https://www.npmjs.com/package/zod-codegen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
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

| Option      | Alias | Description                         | Default     |
| ----------- | ----- | ----------------------------------- | ----------- |
| `--input`   | `-i`  | Path or URL to OpenAPI file         | Required    |
| `--output`  | `-o`  | Directory to output generated files | `generated` |
| `--help`    | `-h`  | Show help                           |             |
| `--version` | `-v`  | Show version                        |             |

### Programmatic Usage

```typescript
import {Generator} from 'zod-codegen';

// Create a simple reporter object
const reporter = {
  log: (...args: unknown[]) => console.log(...args),
  error: (...args: unknown[]) => console.error(...args),
};

// Create generator instance
const generator = new Generator(
  'my-app',
  '1.0.0',
  reporter,
  './openapi.json', // Input path or URL
  './generated', // Output directory
);

// Run the generator
const exitCode = await generator.run();
```

## 📁 Generated Output

The generator creates a single TypeScript file (`type.ts`) containing:

- **Zod Schemas**: Exported Zod validation schemas for all component schemas defined in your OpenAPI spec
- **API Client Class**: A type-safe client class with methods for each endpoint operation
- **Base URL Constant**: A `defaultBaseUrl` constant extracted from the OpenAPI servers configuration

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

const defaultBaseUrl = 'https://api.example.com';

// Client class
export class UserAPI {
  #baseUrl: string;

  constructor(baseUrl: string = defaultBaseUrl, _?: unknown) {
    this.#baseUrl = baseUrl;
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

const client = new UserAPI();
const user = await client.getUserById(123);
// user is fully typed and validated!
```

## 🛠️ Development

### Prerequisites

- Node.js ≥ 24.11.1
- npm or yarn

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

- **Node.js**: ≥ 24.11.1
- **TypeScript**: ≥ 5.9.3
- **Zod**: ≥ 4.1.12

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

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

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

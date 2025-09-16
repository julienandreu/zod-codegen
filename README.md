# zod-codegen

[![npm version](https://img.shields.io/npm/v/zod-codegen.svg)](https://www.npmjs.com/package/zod-codegen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![CI](https://github.com/julienandreu/zod-codegen/workflows/CI/badge.svg)](https://github.com/julienandreu/zod-codegen/actions)
[![Coverage](https://img.shields.io/codecov/c/github/julienandreu/zod-codegen)](https://codecov.io/gh/julienandreu/zod-codegen)

A powerful TypeScript code generator that creates **Zod schemas** and **type-safe clients** from OpenAPI specifications.

## 🚀 Features

- **🔥 Zod Schema Generation**: Automatically generate Zod validation schemas from OpenAPI specs
- **🎯 Type-Safe**: Full TypeScript support with generated types
- **📡 Multiple Formats**: Support for OpenAPI 3.x, Swagger 2.0, JSON, and YAML
- **🌐 Remote Files**: Fetch OpenAPI specs from URLs
- **⚡ Fast**: Optimized for performance with minimal dependencies
- **🔧 Configurable**: Flexible output options and customization
- **📦 CLI & Programmatic**: Use as a CLI tool or integrate into your build process

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

const generator = new Generator();

// Generate from local file
await generator.generate({
  input: './openapi.json',
  output: './generated',
});

// Generate from URL
await generator.generate({
  input: 'https://api.example.com/openapi.json',
  output: './api',
});
```

## 📁 Generated Output

The generator creates the following structure:

```
generated/
├── schemas/           # Zod validation schemas
│   ├── user.schema.ts
│   └── product.schema.ts
├── types/            # TypeScript type definitions
│   ├── user.types.ts
│   └── product.types.ts
└── client/           # Type-safe API client
    └── api.client.ts
```

## 🎯 Example

Given this OpenAPI specification:

```yaml
openapi: 3.0.0
info:
  title: User API
  version: 1.0.0
paths:
  /users:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
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

**Generated Zod Schema** (`schemas/user.schema.ts`):

```typescript
import {z} from 'zod';

export const UserSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string().email(),
});

export type User = z.infer<typeof UserSchema>;
```

**Generated Types** (`types/user.types.ts`):

```typescript
export interface User {
  id: number;
  name: string;
  email: string;
}
```

**Generated Client** (`client/api.client.ts`):

```typescript
import {UserSchema, type User} from '../schemas/user.schema.js';

export class ApiClient {
  async getUsers(): Promise<User[]> {
    const response = await fetch('/api/users');
    const data = await response.json();
    return UserSchema.array().parse(data);
  }
}
```

## 🛠️ Development

### Prerequisites

- Node.js ≥ 18.0.0
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

- **Node.js**: ≥ 18.0.0
- **TypeScript**: ≥ 5.0.0
- **Zod**: ≥ 3.20.0

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

# Examples

This directory contains example implementations demonstrating how to use `zod-codegen` with real-world OpenAPI specifications.

## Available Examples

### 🐾 [Petstore API](./petstore/)

The Swagger Petstore API is a well-known example API that demonstrates various OpenAPI features. This example shows:

- Basic client usage
- Authentication with API keys
- Extending the client for custom headers
- Working with pets, orders, and users

**Generate the client:**

```bash
zod-codegen --input ./samples/swagger-petstore.yaml --output ./examples/petstore
```

**Run examples:**

```bash
npx ts-node examples/petstore/basic-usage.ts
npx ts-node examples/petstore/authenticated-usage.ts
```

### ⚡ [PokéAPI](./pokeapi/)

PokéAPI is a public RESTful API that provides data about Pokémon. This example demonstrates:

- Working with a real-world public API
- Fetching Pokémon data
- Custom client configuration

**Generate the client:**

```bash
zod-codegen --input https://pokeapi.co/api/v2/openapi.json --output ./examples/pokeapi
```

## Structure

Each example directory contains:

- `type.ts` - Generated client and schemas (created by zod-codegen)
- `README.md` - Example-specific documentation
- `basic-usage.ts` - Basic usage examples
- `authenticated-usage.ts` - Authentication examples (if applicable)

## Getting Started

1. **Choose an example** that matches your use case
2. **Generate the client** using the command shown in the example's README
3. **Review the generated code** in `type.ts`
4. **Run the example scripts** to see it in action
5. **Extend the client** using patterns from [EXAMPLES.md](../EXAMPLES.md)

## Learning Path

1. Start with **Petstore** to understand basic concepts
2. Try **PokéAPI** to see a real-world public API
3. Read [EXAMPLES.md](../EXAMPLES.md) for advanced patterns
4. Create your own example with your API!

## Contributing Examples

If you'd like to add an example:

1. Create a new directory under `examples/`
2. Add a `README.md` explaining the example
3. Include example TypeScript files
4. Update this README to list your example

# PokéAPI Example

This example demonstrates how to use `zod-codegen` with the PokéAPI OpenAPI specification.

## Setup

First, generate the client from the PokéAPI OpenAPI spec:

```bash
zod-codegen --input ./samples/pokeapi-openapi.json --output ./examples/pokeapi
```

**Note**: PokéAPI doesn't provide an official OpenAPI specification, so we've created a simplified OpenAPI spec based on their API structure. For production use, you may want to create a more complete specification based on the [PokéAPI documentation](https://pokeapi.co/docs/v2).

## Basic Usage

```typescript
import {PokAPI, defaultBaseUrl} from './type.js';

// Create a client instance
const client = new PokAPI(defaultBaseUrl);

// Use the generated methods
const pokemon = await client.getPokemonById('pikachu');
console.log('Pokemon:', pokemon);
```

## Example: Fetching Pokémon Data

See [basic-usage.ts](./basic-usage.ts) for a complete example:

```typescript
import {PokAPI, defaultBaseUrl} from './type.js';

async function getPokemonInfo() {
  const client = new PokAPI(defaultBaseUrl);

  try {
    // Get a specific Pokémon by ID or name
    const pikachu = await client.getPokemonById('pikachu');
    console.log(`Name: ${pikachu.name}`);
    console.log(`Height: ${pikachu.height} dm`);
    console.log(`Weight: ${pikachu.weight} hg`);

    if (pikachu.types && pikachu.types.length > 0) {
      const types = pikachu.types
        .map((t) => t.type?.name)
        .filter(Boolean)
        .join(', ');
      console.log(`Types: ${types}`);
    }

    // Get Pokémon list with pagination
    const pokemonList = await client.getPokemonList(20, 0);
    console.log(`\nTotal Pokémon: ${pokemonList.count}`);
    console.log(`Showing: ${pokemonList.results.length} results`);
  } catch (error) {
    console.error('Error fetching Pokémon:', error);
  }
}

getPokemonInfo();
```

**Run the example:**

```bash
npx ts-node examples/pokeapi/basic-usage.ts
```

## Example: Extending for Custom Headers

See [custom-client.ts](./custom-client.ts) for a complete example:

```typescript
import {PokAPI, defaultBaseUrl} from './type.js';

class CustomPokeAPI extends PokAPI {
  protected getBaseRequestOptions(): Partial<Omit<RequestInit, 'method' | 'body'>> {
    const options = super.getBaseRequestOptions();
    return {
      ...options,
      headers: {
        ...((options.headers as Record<string, string>) || {}),
        'User-Agent': 'MyPokemonApp/1.0.0',
        Accept: 'application/json',
      },
      mode: 'cors',
      cache: 'default',
    };
  }
}

const client = new CustomPokeAPI(defaultBaseUrl);
```

**Run the example:**

```bash
npx ts-node examples/pokeapi/custom-client.ts
```

## Note

PokéAPI is a public API that doesn't require authentication, making it perfect for testing and learning. The generated client will work out of the box without any additional configuration.

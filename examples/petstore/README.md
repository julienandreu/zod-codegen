# Petstore API Example

This example demonstrates how to use `zod-codegen` with the Swagger Petstore OpenAPI specification.

## Generated Files

After running `zod-codegen`, you'll get:

- `type.ts` - Contains all Zod schemas and the generated API client

## Basic Usage

```typescript
import {SwaggerPetstoreOpenAPI30} from './type.js';

// Create a client instance using default server from OpenAPI spec
const client = new SwaggerPetstoreOpenAPI30({});

// Use the generated methods
const pets = await client.findPetsByStatus('available');
console.log('Available pets:', pets);
```

### Server Configuration Options

The generated client supports flexible server configuration:

```typescript
import {SwaggerPetstoreOpenAPI30, ClientOptions} from './type.js';

// Option 1: Use default server (first server from OpenAPI spec)
const defaultClient = new SwaggerPetstoreOpenAPI30({});

// Option 2: Override with custom base URL
const customClient = new SwaggerPetstoreOpenAPI30({
  baseUrl: 'https://custom-api.example.com/v3',
});

// Option 3: Select server by index (if multiple servers exist)
const indexedClient = new SwaggerPetstoreOpenAPI30({
  serverIndex: 0,
});

// Option 4: Use server variables (if your OpenAPI spec has templated URLs)
// Example spec: https://{environment}.example.com:{port}/v{version}
const variableClient = new SwaggerPetstoreOpenAPI30({
  serverIndex: 0,
  serverVariables: {
    environment: 'api.staging',
    port: '8443',
    version: '2',
  },
});
```

## Example: Finding Pets

```typescript
import {SwaggerPetstoreOpenAPI30} from './type.js';

async function findAvailablePets() {
  const client = new SwaggerPetstoreOpenAPI30({});

  try {
    // Find pets by status
    const availablePets = await client.findPetsByStatus('available');
    console.log(`Found ${availablePets.length} available pets`);

    // Find pets by tags
    const taggedPets = await client.findPetsByTags(['friendly', 'cute']);
    console.log(`Found ${taggedPets.length} tagged pets`);

    // Get a specific pet by ID
    const pet = await client.getPetById(1);
    console.log('Pet details:', pet);
  } catch (error) {
    console.error('Error fetching pets:', error);
  }
}

findAvailablePets();
```

## Example: Adding a Pet

```typescript
import {SwaggerPetstoreOpenAPI30, Pet, PetStatus} from './type.js';
import {z} from 'zod';

async function addNewPet() {
  const client = new SwaggerPetstoreOpenAPI30({});

  const newPet: z.infer<typeof Pet> = {
    id: 12345,
    name: 'Fluffy',
    status: PetStatus.enum.available,
    category: {
      id: 1,
      name: 'Dogs',
    },
    photoUrls: ['https://example.com/fluffy.jpg'],
    tags: [
      {id: 1, name: 'friendly'},
      {id: 2, name: 'cute'},
    ],
  };

  try {
    const addedPet = await client.addPet(newPet);
    console.log('Pet added:', addedPet);
  } catch (error) {
    console.error('Error adding pet:', error);
  }
}

addNewPet();
```

## Example: Extending the Client

See the main [EXAMPLES.md](../../EXAMPLES.md) for comprehensive examples on extending the client for authentication, CORS, and custom headers.

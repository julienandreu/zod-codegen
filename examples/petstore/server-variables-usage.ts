/**
 * Example showing how to use server variables for different environments
 *
 * Run with: npx ts-node examples/petstore/server-variables-usage.ts
 *
 * Note: This example uses a hypothetical API with server variables.
 * For a real example, generate a client from an OpenAPI spec with server variables.
 */

import {SwaggerPetstoreOpenAPI30, ClientOptions} from './type';

async function main() {
  // Example 1: Use default server (first server from OpenAPI spec)
  console.log('📡 Example 1: Using default server\n');
  const defaultClient = new SwaggerPetstoreOpenAPI30({});
  console.log('Default client created');

  // Example 2: Override with custom baseUrl
  console.log('\n📡 Example 2: Overriding with custom baseUrl\n');
  const customClient = new SwaggerPetstoreOpenAPI30({
    baseUrl: 'https://custom-api.example.com/v3',
  });
  console.log('Custom client created');

  // Example 3: Select different server by index (if multiple servers exist)
  console.log('\n📡 Example 3: Selecting server by index\n');
  const indexedClient = new SwaggerPetstoreOpenAPI30({
    serverIndex: 0, // Use first server
  });
  console.log('Indexed client created');

  // Example 4: Using server variables (if your OpenAPI spec has templated URLs)
  // For example: https://{environment}.example.com:{port}/v{version}
  console.log('\n📡 Example 4: Using server variables\n');
  const variableClient = new SwaggerPetstoreOpenAPI30({
    serverIndex: 0,
    serverVariables: {
      // environment: 'api.staging',  // Uncomment if your spec has these variables
      // port: '8443',
      // version: '2',
    },
  });
  console.log('Variable client created');

  // Example 5: Combining server selection with custom baseUrl override
  console.log('\n📡 Example 5: Combining options\n');
  const combinedClient = new SwaggerPetstoreOpenAPI30({
    serverIndex: 0,
    serverVariables: {
      // Add variables here if your spec supports them
    },
    // baseUrl takes precedence if provided
    // baseUrl: 'https://override.example.com',
  });
  console.log('Combined client created');

  console.log('\n✅ All examples completed!');
  console.log("\n💡 Tip: Check your OpenAPI spec's servers array to see available options.");
  console.log('   Server variables allow you to switch between environments (dev, staging, prod)');
  console.log('   without changing code!');
}

void main();

/**
 * Basic usage example for the generated Petstore API client
 *
 * Run with: npx ts-node examples/petstore/basic-usage.ts
 */

import {SwaggerPetstoreOpenAPI30} from './api';

async function main() {
  // Use default server (first server from OpenAPI spec)
  const client = new SwaggerPetstoreOpenAPI30({});

  try {
    console.log('🔍 Finding available pets...\n');

    // Find pets by status
    const availablePets = await client.findPetsByStatus('available');
    console.log(`✅ Found ${availablePets.length} available pets`);

    if (availablePets.length > 0) {
      console.log('\n📋 First pet details:');
      console.log(JSON.stringify(availablePets[0], null, 2));
    }

    // Find pets by tags (if available)
    try {
      const taggedPets = await client.findPetsByTags(['friendly']);
      console.log(`\n🏷️  Found ${taggedPets.length} pets with tags`);
    } catch (error) {
      console.log('\n⚠️  Tags endpoint may not be available');
    }

    // Get store inventory
    try {
      const inventory = await client.getInventory();
      console.log('\n📦 Store inventory:');
      console.log(JSON.stringify(inventory, null, 2));
    } catch (error) {
      console.log('\n⚠️  Inventory endpoint may require authentication');
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
    } else {
      console.error('❌ Unknown error:', error);
    }
    process.exit(1);
  }
}

void main();

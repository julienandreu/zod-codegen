/**
 * Basic usage example for the generated PokéAPI client
 *
 * Run with: npx ts-node examples/pokeapi/basic-usage.ts
 */

import {PokAPI, defaultBaseUrl} from './type';

async function main() {
  const client = new PokAPI(defaultBaseUrl);

  try {
    console.log('🔍 Fetching Pokémon data...\n');

    // Get a specific Pokémon by ID or name
    console.log('📖 Getting Pikachu...');
    const pikachu = await client.getPokemonById('pikachu');
    console.log(`✅ Found: ${pikachu.name}`);
    console.log(`   ID: ${pikachu.id}`);
    console.log(`   Height: ${pikachu.height} dm`);
    console.log(`   Weight: ${pikachu.weight} hg`);

    if (pikachu.types && pikachu.types.length > 0) {
      const types = pikachu.types
        .map((t) => t.type?.name)
        .filter(Boolean)
        .join(', ');
      console.log(`   Types: ${types}`);
    }

    if (pikachu.sprites?.front_default) {
      console.log(`   Sprite: ${pikachu.sprites.front_default}`);
    }

    // Get Pokémon list
    console.log('\n📋 Getting Pokémon list...');
    const pokemonList = await client.getPokemonList(10, 0);
    console.log(`✅ Found ${pokemonList.count} total Pokémon`);
    console.log(`   Showing first ${pokemonList.results.length} results:`);

    pokemonList.results.slice(0, 5).forEach((pokemon, index) => {
      console.log(`   ${index + 1}. ${pokemon.name}`);
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
      if (error.message.includes('HTTP')) {
        console.error('   This might be a network issue or the API endpoint may have changed.');
      }
    } else {
      console.error('❌ Unknown error:', error);
    }
    process.exit(1);
  }
}

void main();

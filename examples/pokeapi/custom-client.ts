/**
 * Example showing how to extend the PokéAPI client with custom configuration
 *
 * Run with: npx ts-node examples/pokeapi/custom-client.ts
 */

import { defaultBaseUrl, PokAPI } from './api';

class CustomPokeAPIClient extends PokAPI {
  protected getBaseRequestOptions(): Partial<Omit<RequestInit, 'method' | 'body'>> {
    const options = super.getBaseRequestOptions();
    return {
      ...options,
      headers: {
        ...((options.headers as Record<string, string>) || {}),
        'User-Agent': 'MyPokemonApp/1.0.0 (https://myapp.com)',
        'Accept': 'application/json'
      },
      mode: 'cors',
      cache: 'default'
    };
  }
}

async function main() {
  const client = new CustomPokeAPIClient(defaultBaseUrl);

  try {
    console.log('🔍 Fetching Pokémon with custom client...\n');

    // Get Charizard
    const charizard = await client.getPokemonById('charizard');
    console.log(`✅ ${charizard.name.toUpperCase()}`);
    console.log(`   ID: ${charizard.id}`);
    console.log(`   Height: ${charizard.height} dm`);
    console.log(`   Weight: ${charizard.weight} hg`);

    if (charizard.abilities && charizard.abilities.length > 0) {
      console.log('\n   Abilities:');
      charizard.abilities.forEach((ability, index) => {
        const abilityName = ability.ability?.name || 'Unknown';
        const hidden = ability.is_hidden ? ' (hidden)' : '';
        console.log(`   ${index + 1}. ${abilityName}${hidden}`);
      });
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

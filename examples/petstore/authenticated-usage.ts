/**
 * Example showing how to extend the generated client for authentication
 *
 * Run with: npx ts-node examples/petstore/authenticated-usage.ts
 */

import {SwaggerPetstoreOpenAPI30, ClientOptions} from './type';

class AuthenticatedPetstoreAPI extends SwaggerPetstoreOpenAPI30 {
  private apiKey: string | null = null;

  constructor(options: ClientOptions = {}) {
    super(options);
  }

  protected getBaseRequestOptions(): Partial<Omit<RequestInit, 'method' | 'body'>> {
    const options = super.getBaseRequestOptions();
    return {
      ...options,
      headers: {
        ...((options.headers as Record<string, string>) || {}),
        ...(this.apiKey ? {api_key: this.apiKey} : {}),
        'User-Agent': 'PetstoreClient/1.0.0',
      },
    };
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  clearApiKey(): void {
    this.apiKey = null;
  }
}

async function main() {
  const client = new AuthenticatedPetstoreAPI({});

  // Set API key for authenticated requests
  client.setApiKey('your-api-key-here');

  try {
    console.log('🔐 Making authenticated request...\n');

    // This endpoint typically requires authentication
    const inventory = await client.getInventory();
    console.log('✅ Inventory retrieved:');
    console.log(JSON.stringify(inventory, null, 2));
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

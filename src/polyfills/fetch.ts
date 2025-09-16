export interface FetchPolyfillOptions {
  enableNodejsPolyfill?: boolean;
}

export async function setupFetchPolyfill(options: FetchPolyfillOptions = {}): Promise<void> {
  if (typeof fetch === 'function') {
    return;
  }

  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    return;
  }

  if (options.enableNodejsPolyfill && typeof process !== 'undefined' && process.versions.node) {
    try {
      await import('undici');
      return;
    } catch {
      // Fall through to error
    }
  }

  throw new Error(
    'Fetch API is not available. ' + 'For Node.js environments, please install undici: npm install undici',
  );
}

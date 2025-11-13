# Usage Examples

## Extending the Generated Client for Authentication and Configuration

The generated client class includes a protected `getBaseRequestOptions()` method that you can override to customize request options. This method returns `Partial<Omit<RequestInit, 'method' | 'body'>>`, allowing you to set:

- **Headers**: Authentication tokens, User-Agent, custom headers
- **CORS**: `mode`, `credentials` for cross-origin requests
- **Request Options**: `signal` (AbortController), `cache`, `redirect`, `referrer`, etc.

All examples below demonstrate how to extend the generated client class to add these features.

### Example: Adding Bearer Token Authentication

```typescript
import {SwaggerPetstoreOpenAPI30, ClientOptions} from './generated/type.js';

class AuthenticatedPetstoreAPI extends SwaggerPetstoreOpenAPI30 {
  private accessToken: string | null = null;

  constructor(options: ClientOptions = {}) {
    super(options);
  }

  // Override getBaseRequestOptions to add Authorization header
  protected getBaseRequestOptions(): Partial<Omit<RequestInit, 'method' | 'body'>> {
    const options = super.getBaseRequestOptions();
    return {
      ...options,
      headers: {
        ...((options.headers as Record<string, string>) || {}),
        ...(this.accessToken ? {Authorization: `Bearer ${this.accessToken}`} : {}),
      },
    };
  }

  // Helper method to set the access token
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  // Helper method to clear the token
  clearAccessToken(): void {
    this.accessToken = null;
  }
}

// Usage
async function main() {
  const client = new AuthenticatedPetstoreAPI({});

  // Set authentication token
  client.setAccessToken('your-token-here');

  // All subsequent requests will include the Authorization header
  const pets = await client.findPetsByStatus('available');
  console.log(pets);

  // You can also manually set/update the token
  client.setAccessToken('new-token-here');

  // Or clear it
  client.clearAccessToken();
}

void main();
```

### Example: Session Management with Token Refresh

```typescript
import {SwaggerPetstoreOpenAPI30} from './generated/type.js';

class SessionManagedPetstoreAPI extends SwaggerPetstoreOpenAPI30 {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: Date | null = null;

  protected getBaseRequestOptions(): Partial<Omit<RequestInit, 'method' | 'body'>> {
    const options = super.getBaseRequestOptions();

    // Check if token is expired and refresh if needed
    if (this.tokenExpiry && this.tokenExpiry <= new Date()) {
      this.refreshAccessToken().catch(console.error);
    }

    return {
      ...options,
      headers: {
        ...((options.headers as Record<string, string>) || {}),
        ...(this.accessToken ? {Authorization: `Bearer ${this.accessToken}`} : {}),
      },
    };
  }

  async login(username: string, password: string): Promise<void> {
    // Example: If your API has a login endpoint
    // const response = await this.loginUser({ username, password });
    // this.setTokens(response.access_token, response.refresh_token, response.expires_in);

    // For demonstration, setting tokens directly
    this.setTokens('access-token-here', 'refresh-token-here', 3600);
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    // Example: If your API has a refresh endpoint
    // const response = await this.refreshToken({ refresh_token: this.refreshToken });
    // this.setTokens(response.access_token, response.refresh_token, response.expires_in);

    // For demonstration
    this.setTokens('new-access-token', this.refreshToken, 3600);
  }

  private setTokens(accessToken: string, refreshToken?: string, expiresIn?: number): void {
    this.accessToken = accessToken;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }
    if (expiresIn) {
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);
    }
  }
}
```

### Example: Custom Headers Per Request

If you need to pass custom headers for specific requests, you can extend the client and add helper methods:

```typescript
import {SwaggerPetstoreOpenAPI30, ClientOptions} from './generated/type.js';

class CustomHeadersPetstoreAPI extends SwaggerPetstoreOpenAPI30 {
  constructor(options: ClientOptions = {}) {
    super(options);
  }
  protected getBaseRequestOptions(): Partial<Omit<RequestInit, 'method' | 'body'>> {
    const options = super.getBaseRequestOptions();
    return {
      ...options,
      headers: {
        ...((options.headers as Record<string, string>) || {}),
        'X-Custom-Header': 'custom-value',
        'X-Request-ID': this.generateRequestId(),
      },
    };
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### Example: API Key Authentication

```typescript
import {SwaggerPetstoreOpenAPI30, ClientOptions} from './generated/type.js';

class ApiKeyAuthenticatedPetstoreAPI extends SwaggerPetstoreOpenAPI30 {
  constructor(options: ClientOptions & {apiKey: string}) {
    super(options);
    this.apiKey = options.apiKey;
  }

  private apiKey: string;

  protected getBaseRequestOptions(): Partial<Omit<RequestInit, 'method' | 'body'>> {
    const options = super.getBaseRequestOptions();
    return {
      ...options,
      headers: {
        ...((options.headers as Record<string, string>) || {}),
        'X-API-Key': this.apiKey,
      },
    };
  }
}
```

### Example: Using AbortController for Request Cancellation

```typescript
import {SwaggerPetstoreOpenAPI30, ClientOptions} from './generated/type.js';

class CancellablePetstoreAPI extends SwaggerPetstoreOpenAPI30 {
  constructor(options: ClientOptions = {}) {
    super(options);
  }
  private abortController: AbortController | null = null;

  protected getBaseRequestOptions(): Partial<Omit<RequestInit, 'method' | 'body'>> {
    const options = super.getBaseRequestOptions();
    this.abortController = new AbortController();
    return {
      ...options,
      signal: this.abortController.signal,
    };
  }

  cancelRequests(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

// Usage
const client = new CancellablePetstoreAPI();
const promise = client.findPetsByStatus('available');
// Later, cancel the request
client.cancelRequests();
```

### Example: Custom Credentials and CORS Mode

```typescript
import {SwaggerPetstoreOpenAPI30, ClientOptions} from './generated/type.js';

class CustomCorsPetstoreAPI extends SwaggerPetstoreOpenAPI30 {
  constructor(options: ClientOptions = {}) {
    super(options);
  }

  protected getBaseRequestOptions(): Partial<Omit<RequestInit, 'method' | 'body'>> {
    const options = super.getBaseRequestOptions();
    return {
      ...options,
      credentials: 'include', // Include cookies in CORS requests
      mode: 'cors', // Enable CORS
    };
  }
}

// Usage
const client = new CustomCorsPetstoreAPI({});
```

<｜tool▁call▁begin｜>
grep

### Example: Complete Configuration (CORS, User-Agent, Authentication)

Here's a comprehensive example showing how to combine CORS settings, custom User-Agent, and authentication:

```typescript
import {SwaggerPetstoreOpenAPI30, ClientOptions} from './generated/type.js';

class FullyConfiguredPetstoreAPI extends SwaggerPetstoreOpenAPI30 {
  private accessToken: string | null = null;
  private readonly userAgent: string;

  constructor(options: ClientOptions & {userAgent?: string} = {}) {
    super(options);
    this.userAgent = options.userAgent || 'MyApp/1.0.0 (https://myapp.com)';
  }

  protected getBaseRequestOptions(): Partial<Omit<RequestInit, 'method' | 'body'>> {
    const options = super.getBaseRequestOptions();

    // Build headers object
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
      'User-Agent': this.userAgent,
      ...(this.accessToken ? {Authorization: `Bearer ${this.accessToken}`} : {}),
    };

    return {
      ...options,
      headers,
      // CORS configuration
      mode: 'cors', // Enable CORS
      credentials: 'include', // Include cookies and credentials in CORS requests
      // Cache control
      cache: 'no-cache', // Don't cache requests
      // Redirect handling
      redirect: 'follow', // Follow redirects automatically
    };
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  clearAccessToken(): void {
    this.accessToken = null;
  }
}

// Usage
const client = new FullyConfiguredPetstoreAPI({
  userAgent: 'MyCustomApp/2.0.0 (Custom User Agent)',
});

// Set authentication token
client.setAccessToken('your-bearer-token-here');

// All requests will now include:
// - Custom User-Agent header
// - Authorization header (Bearer token)
// - CORS mode enabled
// - Credentials included
// - No caching
// - Automatic redirect following
const pets = await client.findPetsByStatus('available');
```

### Example: Environment-Specific Configuration

You can also create different configurations for different environments:

```typescript
import {SwaggerPetstoreOpenAPI30, ClientOptions} from './generated/type.js';

interface ClientConfig {
  userAgent?: string;
  enableCors?: boolean;
  includeCredentials?: boolean;
  cachePolicy?: RequestCache;
}

class ConfigurablePetstoreAPI extends SwaggerPetstoreOpenAPI30 {
  private accessToken: string | null = null;
  private readonly config: Required<ClientConfig>;

  constructor(options: ClientOptions & {config?: ClientConfig} = {}) {
    super(options);
    const config = options.config || {};
    this.config = {
      userAgent: config.userAgent || 'PetstoreAPIClient/1.0.0',
      enableCors: config.enableCors ?? true,
      includeCredentials: config.includeCredentials ?? true,
      cachePolicy: config.cachePolicy || 'no-cache',
    };
  }

  protected getBaseRequestOptions(): Partial<Omit<RequestInit, 'method' | 'body'>> {
    const options = super.getBaseRequestOptions();

    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
      'User-Agent': this.config.userAgent,
      ...(this.accessToken ? {Authorization: `Bearer ${this.accessToken}`} : {}),
    };

    const requestOptions: Partial<Omit<RequestInit, 'method' | 'body'>> = {
      ...options,
      headers,
      cache: this.config.cachePolicy,
    };

    // Conditionally add CORS options
    if (this.config.enableCors) {
      requestOptions.mode = 'cors';
      if (this.config.includeCredentials) {
        requestOptions.credentials = 'include';
      }
    }

    return requestOptions;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }
}

// Usage for production
const productionClient = new ConfigurablePetstoreAPI({
  config: {
    userAgent: 'MyApp/1.0.0 Production',
    enableCors: true,
    includeCredentials: true,
    cachePolicy: 'default',
  },
});

// Usage for development
const devClient = new ConfigurablePetstoreAPI({
  config: {
    userAgent: 'MyApp/1.0.0 Development',
    enableCors: true,
    includeCredentials: false, // Don't send credentials in dev
    cachePolicy: 'no-cache',
  },
});
```

## How It Works

### Architecture Overview

The generated client uses a layered approach to request configuration:

1. **Base Options Layer**: `getBaseRequestOptions()` - Override this to set default options for all requests
2. **Request-Specific Layer**: Options passed to individual endpoint methods (via `options.headers`)
3. **Generated Layer**: Method, body, and Content-Type headers are set automatically

### Request Options Merging Order

When a request is made, options are merged in this order (later values override earlier ones):

1. **Base Options** from `getBaseRequestOptions()` - All RequestInit options (headers, signal, credentials, mode, cache, etc.)
2. **Content-Type Header** - Automatically set based on request body (`application/json` or `application/x-www-form-urlencoded`)
3. **Request-Specific Headers** - From `options.headers` parameter (if provided)
4. **Method and Body** - Always set by generated code (cannot be overridden)

**Important**: `getBaseRequestOptions()` returns **base options that are merged with**, not replaced by, request-specific options. This means:

- ✅ Base options like `mode`, `credentials`, `signal` are preserved
- ✅ Headers are merged (base headers + Content-Type + request headers)
- ✅ Request-specific headers override base headers
- ✅ Method and body always come from the request (not from baseOptions)

### Type Safety

The `getBaseRequestOptions()` method returns `Partial<Omit<RequestInit, 'method' | 'body'>>`, which means:

- ✅ **You CAN set**: `headers`, `signal`, `credentials`, `mode`, `cache`, `redirect`, `referrer`, `referrerPolicy`, `integrity`, `keepalive`
- ❌ **You CANNOT set**: `method` (controlled by endpoint), `body` (controlled by request data)

This ensures type safety while preventing accidental overrides of critical request properties.

### Complete Options Merging Details

The final fetch request uses `Object.assign()` to merge options:

```typescript
// Headers are merged first:
const finalHeaders = Object.assign(
  {}, // Start with empty object
  baseOptions.headers || {}, // 1. Base headers from getBaseRequestOptions()
  {'Content-Type': contentType}, // 2. Content-Type (may override base)
  options.headers || {}, // 3. Request-specific headers (highest priority)
);

// Then all options are merged:
const finalOptions = Object.assign(
  {}, // Start with empty object
  baseOptions, // 1. All base options (mode, credentials, signal, cache, etc.)
  {
    // 2. Request-specific options (override base)
    method, // Always from endpoint
    headers: finalHeaders, // Merged headers
    body, // Always from request data
  },
);

fetch(url, finalOptions);
```

**Important**:

- Always return `Record<string, string>` for headers in `getBaseRequestOptions()` for predictable merging behavior
- Base options (like `mode`, `credentials`, `signal`) are preserved unless explicitly overridden
- Headers are merged, not replaced - base headers + Content-Type + request headers

### Request Flow

```
User calls endpoint method
    ↓
getBaseRequestOptions() called → Returns base options
    ↓
#makeRequest() merges:
    - Base options (headers, signal, credentials, etc.)
    - Content-Type header
    - Request-specific headers
    - Method and body
    ↓
fetch() called with merged options
    ↓
Response returned and validated with Zod
```

## Best Practices

### 1. Always Call Super Method

```typescript
protected getBaseRequestOptions() {
  const options = super.getBaseRequestOptions(); // ✅ Preserve base options
  return { ...options, /* your additions */ };
}
```

### 2. Proper Header Merging

```typescript
protected getBaseRequestOptions() {
  const options = super.getBaseRequestOptions();
  return {
    ...options,
    headers: {
      ...(options.headers as Record<string, string> || {}), // ✅ Handle undefined
      'Authorization': `Bearer ${this.token}`,
    },
  };
}
```

### 3. Store Sensitive Data Privately

```typescript
class SecureAPI extends YourAPI {
  private accessToken: string | null = null; // ✅ Private property
  // Never expose tokens in public methods
}
```

### 4. Handle Token Expiration

```typescript
protected getBaseRequestOptions() {
  // ✅ Check expiration before using token
  if (this.tokenExpiry && this.tokenExpiry <= new Date()) {
    this.refreshToken();
  }
  // ... rest of implementation
}
```

### 5. Provide Helper Methods

```typescript
class UserFriendlyAPI extends YourAPI {
  // ✅ Provide convenient methods
  async login(username: string, password: string) {
    const response = await this.auth_login_post({username, password});
    this.setAccessToken(response.token);
  }

  logout() {
    this.clearAccessToken();
  }
}
```

### 6. Use TypeScript Strictly

```typescript
// ✅ Type your headers explicitly
const headers: Record<string, string> = {
  'User-Agent': this.userAgent,
  ...(this.token ? {Authorization: `Bearer ${this.token}`} : {}),
};
```

### 7. Environment-Specific Configuration

```typescript
// ✅ Different configs for different environments
const prodClient = new ConfigurableAPI({
  config: {
    userAgent: 'MyApp/1.0.0 Production',
    enableCors: true,
  },
});

const devClient = new ConfigurableAPI({
  config: {
    userAgent: 'MyApp/1.0.0 Development',
    enableCors: false,
  },
});
```

### 8. Error Handling

```typescript
class RobustAPI extends YourAPI {
  protected getBaseRequestOptions() {
    const options = super.getBaseRequestOptions();
    return {
      ...options,
      signal: this.createAbortSignal(), // ✅ Handle cancellation
    };
  }

  private createAbortSignal(): AbortSignal {
    const controller = new AbortController();
    // Set timeout, etc.
    return controller.signal;
  }
}
```

## Common Patterns

### Pattern 1: Simple Authentication

```typescript
import {YourAPI, ClientOptions} from './generated/type.js';

class SimpleAuthAPI extends YourAPI {
  private token: string | null = null;

  constructor(options: ClientOptions = {}) {
    super(options);
  }

  protected getBaseRequestOptions() {
    const options = super.getBaseRequestOptions();
    return {
      ...options,
      headers: {
        ...((options.headers as Record<string, string>) || {}),
        ...(this.token ? {Authorization: `Bearer ${this.token}`} : {}),
      },
    };
  }
}
```

### Pattern 2: Multiple Headers

```typescript
import {YourAPI, ClientOptions} from './generated/type.js';

class MultiHeaderAPI extends YourAPI {
  constructor(options: ClientOptions = {}) {
    super(options);
  }

  protected getBaseRequestOptions() {
    const options = super.getBaseRequestOptions();
    return {
      ...options,
      headers: {
        ...((options.headers as Record<string, string>) || {}),
        'User-Agent': 'MyApp/1.0.0',
        'X-API-Version': 'v2',
        'X-Request-ID': this.generateId(),
      },
    };
  }
}
```

### Pattern 3: Conditional Options

```typescript
import {YourAPI, ClientOptions} from './generated/type.js';

class ConditionalAPI extends YourAPI {
  constructor(options: ClientOptions = {}) {
    super(options);
  }

  protected getBaseRequestOptions() {
    const options = super.getBaseRequestOptions();
    const config: Partial<Omit<RequestInit, 'method' | 'body'>> = {...options};

    if (this.needsCors) {
      config.mode = 'cors';
      config.credentials = 'include';
    }

    return config;
  }
}
```

## Troubleshooting

### Headers Not Being Applied

**Problem**: Custom headers aren't appearing in requests.

**Solution**: Ensure you're spreading base options and handling undefined:

```typescript
headers: {
  ...(options.headers as Record<string, string> || {}), // ✅ Handle undefined
  'Your-Header': 'value',
}
```

### CORS Errors

**Problem**: CORS errors when making requests.

**Solution**: Set CORS options in `getBaseRequestOptions()`:

```typescript
return {
  ...options,
  mode: 'cors',
  credentials: 'include', // If needed
};
```

### Token Not Persisting

**Problem**: Token is lost between requests.

**Solution**: Store token as instance property:

```typescript
import {YourAPI, ClientOptions} from './generated/type.js';

class MyAPI extends YourAPI {
  private token: string | null = null; // ✅ Instance property

  constructor(options: ClientOptions = {}) {
    super(options);
  }

  setToken(token: string) {
    this.token = token; // ✅ Persists across requests
  }
}
```

### Type Errors

**Problem**: TypeScript errors when overriding.

**Solution**: Ensure return type matches exactly:

```typescript
protected getBaseRequestOptions(): Partial<Omit<RequestInit, 'method' | 'body'>> {
  // ✅ Correct return type
}
```

import {describe, expect, it} from 'vitest';
import {TypeScriptCodeGeneratorService} from '../../src/services/code-generator.service.js';
import type {OpenApiSpecType} from '../../src/types/openapi.js';

describe('TypeScriptCodeGeneratorService', () => {
  let generator: TypeScriptCodeGeneratorService;

  beforeEach(() => {
    generator = new TypeScriptCodeGeneratorService();
  });

  describe('generate', () => {
    it('should generate code for a minimal OpenAPI spec', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const code = generator.generate(spec);
      expect(code).toBeTruthy();
      expect(typeof code).toBe('string');
      expect(code).toMatch(/import\s*{\s*z\s*}\s*from\s*['"]zod['"]/);
      expect(code).toContain('export class');
    });

    it('should generate schemas for component schemas', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                id: {type: 'integer'},
                name: {type: 'string'},
              },
              required: ['id', 'name'],
            },
          },
        },
      };

      const code = generator.generate(spec);
      expect(code).toContain('export const User');
      expect(code).toContain('z.object');
      expect(code).toContain('z.number().int()');
      expect(code).toContain('z.string()');
    });

    it('should generate client methods for paths', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/users': {
            get: {
              operationId: 'getUsers',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {type: 'string'},
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const code = generator.generate(spec);
      expect(code).toContain('async getUsers');
      expect(code).toContain('#makeRequest');
    });

    it('should generate getBaseRequestOptions method', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const code = generator.generate(spec);
      expect(code).toContain('protected getBaseRequestOptions');
      expect(code).toContain('Partial<Omit<RequestInit');
    });

    it('should handle servers configuration', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        servers: [{url: 'https://api.example.com'}],
        paths: {},
      };

      const code = generator.generate(spec);
      expect(code).toContain('defaultBaseUrl');
      expect(code).toContain('https://api.example.com');
    });

    it('should handle complex schemas with references', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                id: {type: 'integer'},
                profile: {$ref: '#/components/schemas/Profile'},
              },
              required: ['id'],
            },
            Profile: {
              type: 'object',
              properties: {
                name: {type: 'string'},
                email: {type: 'string', format: 'email'},
              },
              required: ['name', 'email'],
            },
          },
        },
      };

      const code = generator.generate(spec);
      expect(code).toContain('export const User');
      expect(code).toContain('export const Profile');
      // Profile should be defined before User (topological sort)
      const profileIndex = code.indexOf('Profile');
      const userIndex = code.indexOf('User');
      expect(profileIndex).toBeLessThan(userIndex);
    });

    it('should handle enum types', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            Status: {
              type: 'string',
              enum: ['active', 'inactive', 'pending'],
            },
          },
        },
      };

      const code = generator.generate(spec);
      expect(code).toContain('z.enum');
      expect(code).toContain('active');
      expect(code).toContain('inactive');
      expect(code).toContain('pending');
    });

    it('should handle array types', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            Tags: {
              type: 'array',
              items: {type: 'string'},
            },
          },
        },
      };

      const code = generator.generate(spec);
      expect(code).toContain('z.array');
      expect(code).toContain('z.string()');
    });
  });

  describe('buildSchema', () => {
    it('should build schema for string type', () => {
      const schema = {type: 'string'};
      const result = generator.buildSchema(schema, true);
      expect(result).toBeDefined();
    });

    it('should build schema for number type', () => {
      const schema = {type: 'number'};
      const result = generator.buildSchema(schema, true);
      expect(result).toBeDefined();
    });

    it('should build schema for boolean type', () => {
      const schema = {type: 'boolean'};
      const result = generator.buildSchema(schema, true);
      expect(result).toBeDefined();
    });

    it('should handle optional fields', () => {
      const schema = {type: 'string'};
      const result = generator.buildSchema(schema, false);
      expect(result).toBeDefined();
    });

    it('should handle string formats', () => {
      const schema = {type: 'string', format: 'email'};
      const result = generator.buildSchema(schema, true);
      expect(result).toBeDefined();
    });
  });
});

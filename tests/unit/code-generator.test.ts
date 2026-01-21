import {beforeEach, describe, expect, it} from 'vitest';
import {TypeScriptCodeGeneratorService} from '../../src/services/code-generator.service';
import type {OpenApiSpecType} from '../../src/types/openapi';

describe('TypeScriptCodeGeneratorService', () => {
  let generator: TypeScriptCodeGeneratorService;

  beforeEach(() => {
    generator = new TypeScriptCodeGeneratorService();
  });

  describe('naming conventions', () => {
    it('should apply camelCase naming convention', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/users': {
            get: {
              operationId: 'get_user_by_id',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {type: 'string'},
                    },
                  },
                },
              },
            },
          },
        },
      };

      const generatorWithConvention = new TypeScriptCodeGeneratorService({
        namingConvention: 'camelCase',
      });
      const code = generatorWithConvention.generate(spec);
      expect(code).toContain('async getUserById');
      expect(code).not.toContain('async get_user_by_id');
    });

    it('should apply PascalCase naming convention', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/users': {
            get: {
              operationId: 'get_user_by_id',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {type: 'string'},
                    },
                  },
                },
              },
            },
          },
        },
      };

      const generatorWithConvention = new TypeScriptCodeGeneratorService({
        namingConvention: 'PascalCase',
      });
      const code = generatorWithConvention.generate(spec);
      expect(code).toContain('async GetUserById');
      expect(code).not.toContain('async get_user_by_id');
    });

    it('should apply snake_case naming convention', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/users': {
            get: {
              operationId: 'getUserById',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {type: 'string'},
                    },
                  },
                },
              },
            },
          },
        },
      };

      const generatorWithConvention = new TypeScriptCodeGeneratorService({
        namingConvention: 'snake_case',
      });
      const code = generatorWithConvention.generate(spec);
      expect(code).toContain('async get_user_by_id');
      expect(code).not.toContain('async getUserById');
    });

    it('should use custom transformer when provided', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/users/{id}': {
            get: {
              operationId: 'getUserById',
              tags: ['users'],
              summary: 'Get user',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {type: 'string'},
                    },
                  },
                },
              },
            },
          },
        },
      };

      const customTransformer = (details: {
        operationId: string;
        method: string;
        path: string;
        tags?: string[];
        summary?: string;
        description?: string;
      }) => {
        return `${details.method.toUpperCase()}_${details.tags?.[0] || 'default'}_${details.operationId}`;
      };

      const generatorWithTransformer = new TypeScriptCodeGeneratorService({
        operationNameTransformer: customTransformer,
      });
      const code = generatorWithTransformer.generate(spec);
      expect(code).toContain('async GET_users_getUserById');
    });

    it('should prioritize custom transformer over naming convention', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/users': {
            get: {
              operationId: 'get_user_by_id',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {type: 'string'},
                    },
                  },
                },
              },
            },
          },
        },
      };

      const customTransformer = () => 'customName';

      const generatorWithBoth = new TypeScriptCodeGeneratorService({
        namingConvention: 'PascalCase',
        operationNameTransformer: customTransformer,
      });
      const code = generatorWithBoth.generate(spec);
      expect(code).toContain('async customName');
      expect(code).not.toContain('GetUserById');
      expect(code).not.toContain('get_user_by_id');
    });
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
      expect(code).toContain('export default class');
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
      expect(code).toContain('makeRequest');
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

    it('should handle numeric enum types with z.union and z.literal', () => {
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
              type: 'integer',
              enum: [-99, 0, 1, 2],
            },
            ExecutionMode: {
              type: 'integer',
              enum: [1, 2],
            },
          },
        },
      };

      const code = generator.generate(spec);
      // Numeric enums should use z.union([z.literal(...), ...])
      expect(code).toContain('z.union');
      expect(code).toContain('z.literal');
      expect(code).toContain('-99');
      expect(code).toContain('0');
      expect(code).toContain('1');
      expect(code).toContain('2');
      // Should not use z.enum for numeric enums
      expect(code).not.toContain('Status: z.enum');
      expect(code).not.toContain('ExecutionMode: z.enum');
    });

    it('should merge baseOptions with request-specific options in makeRequest', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/test': {
            get: {
              operationId: 'testEndpoint',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {type: 'string'},
                    },
                  },
                },
              },
            },
          },
        },
      };

      const code = generator.generate(spec);

      // Should call getBaseRequestOptions()
      expect(code).toContain('getBaseRequestOptions()');

      // Should merge headers: baseHeaders + Content-Type + request headers
      expect(code).toContain('Object.assign');
      expect(code).toContain('baseHeaders');
      expect(code).toContain('Content-Type');

      // Should merge all options: baseOptions + {method, headers, body}
      expect(code).toMatch(/Object\.assign\s*\(\s*\{\s*\}\s*,\s*baseOptions/);
      expect(code).toContain('method');
      expect(code).toContain('headers');
      expect(code).toContain('body');
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

  describe('circular dependencies', () => {
    it('should use z.lazy() for direct self-referencing schemas', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            TreeNode: {
              type: 'object',
              properties: {
                value: {type: 'string'},
                children: {
                  type: 'array',
                  items: {$ref: '#/components/schemas/TreeNode'},
                },
              },
              required: ['value'],
            },
          },
        },
      };

      const code = generator.generate(spec);
      expect(code).toContain('z.lazy(() => TreeNode)');
    });

    it('should use z.lazy() for indirect circular dependencies (A -> B -> A)', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            Person: {
              type: 'object',
              properties: {
                name: {type: 'string'},
                bestFriend: {$ref: '#/components/schemas/Friend'},
              },
              required: ['name'],
            },
            Friend: {
              type: 'object',
              properties: {
                nickname: {type: 'string'},
                person: {$ref: '#/components/schemas/Person'},
              },
              required: ['nickname'],
            },
          },
        },
      };

      const code = generator.generate(spec);
      // Both references should use z.lazy()
      expect(code).toContain('z.lazy(() => Friend)');
      expect(code).toContain('z.lazy(() => Person)');
    });

    it('should not use z.lazy() for non-circular references', () => {
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
              },
              required: ['name'],
            },
          },
        },
      };

      const code = generator.generate(spec);
      // Profile should be referenced directly, not with z.lazy()
      expect(code).not.toContain('z.lazy(() => Profile)');
      expect(code).toContain('profile: Profile.optional()');
    });

    it('should handle complex circular chains (A -> B -> C -> A)', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            Alpha: {
              type: 'object',
              properties: {
                beta: {$ref: '#/components/schemas/Beta'},
              },
            },
            Beta: {
              type: 'object',
              properties: {
                gamma: {$ref: '#/components/schemas/Gamma'},
              },
            },
            Gamma: {
              type: 'object',
              properties: {
                alpha: {$ref: '#/components/schemas/Alpha'},
              },
            },
          },
        },
      };

      const code = generator.generate(spec);
      // All references in the cycle should use z.lazy()
      expect(code).toContain('z.lazy(() => Beta)');
      expect(code).toContain('z.lazy(() => Gamma)');
      expect(code).toContain('z.lazy(() => Alpha)');
    });

    it('should handle self-referencing schemas in arrays', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            Category: {
              type: 'object',
              properties: {
                name: {type: 'string'},
                subcategories: {
                  type: 'array',
                  items: {$ref: '#/components/schemas/Category'},
                },
              },
              required: ['name'],
            },
          },
        },
      };

      const code = generator.generate(spec);
      expect(code).toContain('z.array(z.lazy(() => Category))');
    });

    it('should handle self-referencing schemas in anyOf', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            Expression: {
              type: 'object',
              properties: {
                value: {
                  anyOf: [{type: 'string'}, {$ref: '#/components/schemas/Expression'}],
                },
              },
            },
          },
        },
      };

      const code = generator.generate(spec);
      expect(code).toContain('z.lazy(() => Expression)');
    });
  });

  describe('logical operators edge cases', () => {
    it('should handle anyOf with basic type schemas', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            StringOrNumber: {
              anyOf: [{type: 'string'}, {type: 'number'}],
            },
          },
        },
      };

      const code = generator.generate(spec);
      expect(code).toContain('z.union');
      expect(code).toContain('z.string()');
      expect(code).toContain('z.number()');
    });

    it('should handle oneOf with object schemas', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            Variant: {
              oneOf: [
                {type: 'object', properties: {name: {type: 'string'}}},
                {type: 'object', properties: {id: {type: 'number'}}},
              ],
            },
          },
        },
      };

      const code = generator.generate(spec);
      expect(code).toContain('z.union');
    });

    it('should handle allOf with multiple schemas', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            Combined: {
              allOf: [
                {type: 'object', properties: {id: {type: 'number'}}},
                {type: 'object', properties: {name: {type: 'string'}}},
              ],
            },
          },
        },
      };

      const code = generator.generate(spec);
      expect(code).toContain('z.intersection');
    });

    it('should handle object type with empty properties in logical operators', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            EmptyObject: {
              anyOf: [{type: 'object', properties: {}}],
            },
          },
        },
      };

      const code = generator.generate(spec);
      // Empty object should fallback to record type
      expect(code).toContain('z.record');
    });

    it('should handle array type without items in logical operators', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            GenericArray: {
              anyOf: [{type: 'array'}],
            },
          },
        },
      };

      const code = generator.generate(spec);
      // Array without items should use z.array() with unknown
      expect(code).toContain('z.array');
      expect(code).toContain('z.unknown()');
    });

    it('should handle unknown type in logical operators', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            UnknownType: {
              anyOf: [{type: 'unknown' as any}],
            },
          },
        },
      };

      const code = generator.generate(spec);
      expect(code).toContain('z.unknown()');
    });

    it('should handle non-object schema in logical operators', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            InvalidSchema: {
              anyOf: [null as any],
            },
          },
        },
      };

      const code = generator.generate(spec);
      // Should fallback to unknown for invalid schemas
      expect(code).toContain('z.unknown()');
    });

    it('should handle integer type in logical operators', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            IntOrString: {
              anyOf: [{type: 'integer'}, {type: 'string'}],
            },
          },
        },
      };

      const code = generator.generate(spec);
      expect(code).toContain('z.number().int()');
      expect(code).toContain('z.string()');
    });

    it('should handle boolean type in logical operators', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            BoolOrString: {
              anyOf: [{type: 'boolean'}, {type: 'string'}],
            },
          },
        },
      };

      const code = generator.generate(spec);
      expect(code).toContain('z.boolean()');
      expect(code).toContain('z.string()');
    });

    it('should handle object type with properties in logical operators', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            ObjectVariant: {
              anyOf: [
                {
                  type: 'object',
                  properties: {
                    name: {type: 'string'},
                    age: {type: 'number'},
                  },
                },
              ],
            },
          },
        },
      };

      const code = generator.generate(spec);
      expect(code).toContain('z.union');
      expect(code).toContain('name');
      expect(code).toContain('age');
    });

    it('should handle array type with items in logical operators', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            ArrayVariant: {
              anyOf: [
                {
                  type: 'array',
                  items: {type: 'string'},
                },
              ],
            },
          },
        },
      };

      const code = generator.generate(spec);
      expect(code).toContain('z.union');
      expect(code).toContain('z.array');
      expect(code).toContain('z.string()');
    });

    it('should handle schema without type property in logical operators', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            InvalidSchema: {
              anyOf: [{} as any],
            },
          },
        },
      };

      const code = generator.generate(spec);
      // Should fallback to unknown for schemas without type
      expect(code).toContain('z.unknown()');
    });
  });

  describe('server variables', () => {
    it('should generate server configuration with variables', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        servers: [
          {
            url: 'https://{environment}.example.com:{port}/v{version}',
            variables: {
              environment: {
                default: 'api',
                enum: ['api', 'api.staging', 'api.prod'],
              },
              port: {
                default: '443',
              },
              version: {
                default: '1',
              },
            },
          },
        ],
        paths: {},
      };

      const code = generator.generate(spec);
      expect(code).toContain('serverConfigurations');
      expect(code).toContain('serverVariables');
      expect(code).toContain('resolveServerUrl');
      expect(code).toContain('environment');
      expect(code).toContain('port');
      expect(code).toContain('version');
    });

    it('should handle server variables with enum values', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        servers: [
          {
            url: 'https://{env}.example.com',
            variables: {
              env: {
                default: 'prod',
                enum: ['dev', 'staging', 'prod'],
                description: 'Environment',
              },
            },
          },
        ],
        paths: {},
      };

      const code = generator.generate(spec);
      expect(code).toContain('enum');
      expect(code).toContain('dev');
      expect(code).toContain('staging');
      expect(code).toContain('prod');
    });

    it('should handle multiple servers with different variables', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        servers: [
          {
            url: 'https://api.example.com',
          },
          {
            url: 'https://{env}.example.com',
            variables: {
              env: {
                default: 'staging',
              },
            },
          },
        ],
        paths: {},
      };

      const code = generator.generate(spec);
      expect(code).toContain('serverConfigurations');
      // Should have both servers
      expect(code).toContain('https://api.example.com');
      expect(code).toContain('https://{env}.example.com');
    });
  });

  describe('explicit types', () => {
    it('should generate explicit interface for object schema when explicitTypes is enabled', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            Order: {
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

      const generatorWithExplicitTypes = new TypeScriptCodeGeneratorService({
        explicitTypes: true,
      });
      const code = generatorWithExplicitTypes.generate(spec);

      // Should generate explicit interface
      expect(code).toContain('export interface Order');
      expect(code).toContain('id: number');
      expect(code).toContain('name: string');

      // Should add type annotation to schema
      expect(code).toContain('export const Order: z.ZodType<Order>');

      // Should NOT generate z.infer type export
      expect(code).not.toContain('z.infer<typeof Order>');
    });

    it('should not generate explicit types when explicitTypes is disabled (default)', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            Order: {
              type: 'object',
              properties: {
                id: {type: 'integer'},
              },
              required: ['id'],
            },
          },
        },
      };

      const code = generator.generate(spec);

      // Should NOT generate explicit interface
      expect(code).not.toContain('export interface Order');

      // Should generate z.infer type export
      expect(code).toContain('z.infer<typeof Order>');

      // Should NOT have type annotation on schema
      expect(code).not.toContain('z.ZodType<Order>');
    });

    it('should generate type alias for enum schema', () => {
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

      const generatorWithExplicitTypes = new TypeScriptCodeGeneratorService({
        explicitTypes: true,
      });
      const code = generatorWithExplicitTypes.generate(spec);

      // Should generate type alias (not interface) for enum
      expect(code).toContain('export type Status');
      expect(code).toContain("'active'");
      expect(code).toContain("'inactive'");
      expect(code).toContain("'pending'");

      // Should add type annotation to schema
      expect(code).toContain('export const Status: z.ZodType<Status>');
    });

    it('should generate type alias for array schema', () => {
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

      const generatorWithExplicitTypes = new TypeScriptCodeGeneratorService({
        explicitTypes: true,
      });
      const code = generatorWithExplicitTypes.generate(spec);

      // Should generate type alias for array
      expect(code).toContain('export type Tags = string[]');

      // Should add type annotation to schema
      expect(code).toContain('export const Tags: z.ZodType<Tags>');
    });

    it('should handle nested objects with references', () => {
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
              },
              required: ['name'],
            },
          },
        },
      };

      const generatorWithExplicitTypes = new TypeScriptCodeGeneratorService({
        explicitTypes: true,
      });
      const code = generatorWithExplicitTypes.generate(spec);

      // Should generate interfaces for both
      expect(code).toContain('export interface User');
      expect(code).toContain('export interface Profile');

      // User should reference Profile type
      expect(code).toContain('profile?: Profile');

      // Both should have type annotations
      expect(code).toContain('export const User: z.ZodType<User>');
      expect(code).toContain('export const Profile: z.ZodType<Profile>');
    });

    it('should handle union types (anyOf)', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            StringOrNumber: {
              anyOf: [{type: 'string'}, {type: 'number'}],
            },
          },
        },
      };

      const generatorWithExplicitTypes = new TypeScriptCodeGeneratorService({
        explicitTypes: true,
      });
      const code = generatorWithExplicitTypes.generate(spec);

      // Should generate type alias for union
      expect(code).toContain('export type StringOrNumber = string | number');

      // Should add type annotation to schema
      expect(code).toContain('export const StringOrNumber: z.ZodType<StringOrNumber>');
    });

    it('should handle intersection types (allOf)', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            Base: {
              type: 'object',
              properties: {
                id: {type: 'integer'},
              },
              required: ['id'],
            },
            Extended: {
              allOf: [
                {$ref: '#/components/schemas/Base'},
                {
                  type: 'object',
                  properties: {
                    name: {type: 'string'},
                  },
                },
              ],
            },
          },
        },
      };

      const generatorWithExplicitTypes = new TypeScriptCodeGeneratorService({
        explicitTypes: true,
      });
      const code = generatorWithExplicitTypes.generate(spec);

      // Should generate interface for Base
      expect(code).toContain('export interface Base');

      // Should generate type alias for Extended (intersection)
      expect(code).toContain('export type Extended = Base &');

      // Should add type annotations to schemas
      expect(code).toContain('export const Base: z.ZodType<Base>');
      expect(code).toContain('export const Extended: z.ZodType<Extended>');
    });

    it('should handle optional properties', () => {
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
                email: {type: 'string'},
              },
              required: ['id'],
            },
          },
        },
      };

      const generatorWithExplicitTypes = new TypeScriptCodeGeneratorService({
        explicitTypes: true,
      });
      const code = generatorWithExplicitTypes.generate(spec);

      // id should be required (no ?)
      expect(code).toContain('id: number');
      // email should be optional (with ?)
      expect(code).toContain('email?: string');
    });

    it('should handle circular dependencies', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            Node: {
              type: 'object',
              properties: {
                id: {type: 'integer'},
                children: {
                  type: 'array',
                  items: {$ref: '#/components/schemas/Node'},
                },
              },
              required: ['id'],
            },
          },
        },
      };

      const generatorWithExplicitTypes = new TypeScriptCodeGeneratorService({
        explicitTypes: true,
      });
      const code = generatorWithExplicitTypes.generate(spec);

      // Should generate interface with self-reference
      expect(code).toContain('export interface Node');
      expect(code).toContain('children?: Node[]');

      // Should add type annotation to schema
      expect(code).toContain('export const Node: z.ZodType<Node>');

      // Zod schema should use z.lazy for circular reference
      expect(code).toContain('z.lazy');
    });

    it('should handle numeric enum types', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            Priority: {
              type: 'integer',
              enum: [0, 1, 2],
            },
          },
        },
      };

      const generatorWithExplicitTypes = new TypeScriptCodeGeneratorService({
        explicitTypes: true,
      });
      const code = generatorWithExplicitTypes.generate(spec);

      // Should generate type alias for numeric enum
      expect(code).toContain('export type Priority');
      expect(code).toMatch(/0\s*\|\s*1\s*\|\s*2/);

      // Should add type annotation to schema
      expect(code).toContain('export const Priority: z.ZodType<Priority>');
    });
  });
});

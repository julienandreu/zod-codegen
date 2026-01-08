import {beforeEach, describe, expect, it} from 'vitest';
import {TypeScriptCodeGeneratorService} from '../../src/services/code-generator.service.js';
import type {OpenApiSpecType} from '../../src/types/openapi.js';

describe('TypeScriptCodeGeneratorService - Edge Cases', () => {
  let generator: TypeScriptCodeGeneratorService;

  beforeEach(() => {
    generator = new TypeScriptCodeGeneratorService();
  });

  describe('buildBasicTypeFromSchema edge cases', () => {
    it('should handle unknown type in default case', () => {
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
              anyOf: [{type: 'custom' as any}],
            },
          },
        },
      };

      const code = generator.generate(spec);
      expect(code).toContain('z.unknown()');
    });

    it('should handle schema without type property', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            NoType: {
              anyOf: [{} as any],
            },
          },
        },
      };

      const code = generator.generate(spec);
      expect(code).toContain('z.unknown()');
    });

    it('should handle null schema', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            NullSchema: {
              anyOf: [null as any],
            },
          },
        },
      };

      const code = generator.generate(spec);
      // Should handle gracefully
      expect(code).toBeTruthy();
    });
  });

  describe('buildObjectTypeFromSchema edge cases', () => {
    it('should handle object with empty properties in logical operators', () => {
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

    it('should handle object with properties in logical operators', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            ObjectWithProps: {
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
      expect(code).toContain('name');
      expect(code).toContain('age');
    });
  });

  describe('buildArrayTypeFromSchema edge cases', () => {
    it('should handle array without items in logical operators', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            ArrayNoItems: {
              anyOf: [{type: 'array'}],
            },
          },
        },
      };

      const code = generator.generate(spec);
      expect(code).toContain('z.array');
      expect(code).toContain('z.unknown()');
    });

    it('should handle array with items in logical operators', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            ArrayWithItems: {
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
      expect(code).toContain('z.array');
      expect(code).toContain('z.string()');
    });
  });

  describe('Complex nested logical operators', () => {
    it('should handle nested anyOf within allOf', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            NestedLogical: {
              allOf: [
                {
                  anyOf: [{type: 'string'}, {type: 'number'}],
                },
                {
                  type: 'object',
                  properties: {
                    id: {type: 'string'},
                  },
                },
              ],
            },
          },
        },
      };

      const code = generator.generate(spec);
      expect(code).toContain('z.intersection');
      expect(code).toContain('z.union');
    });

    it('should handle not operator with complex schema', () => {
      const spec: OpenApiSpecType = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            NotComplex: {
              not: {
                type: 'object',
                properties: {
                  forbidden: {type: 'string'},
                },
              },
            },
          },
        },
      };

      const code = generator.generate(spec);
      // The not operator uses z.any.refine() pattern
      expect(code).toContain('z.any');
      expect(code).toContain('refine');
      expect(code).toMatch(/forbidden|Value must not match/);
    });
  });
});

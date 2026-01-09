import {describe, expect, it, beforeEach} from 'vitest';
import {TypeScriptTypeBuilderService} from '../../src/services/type-builder.service';
import * as ts from 'typescript';

describe('TypeScriptTypeBuilderService', () => {
  let builder: TypeScriptTypeBuilderService;

  beforeEach(() => {
    builder = new TypeScriptTypeBuilderService();
  });

  describe('buildType', () => {
    it('should build string type', () => {
      const typeNode = builder.buildType('string');
      expect(typeNode.kind).toBe(ts.SyntaxKind.StringKeyword);
    });

    it('should build number type', () => {
      const typeNode = builder.buildType('number');
      expect(typeNode.kind).toBe(ts.SyntaxKind.NumberKeyword);
    });

    it('should build boolean type', () => {
      const typeNode = builder.buildType('boolean');
      expect(typeNode.kind).toBe(ts.SyntaxKind.BooleanKeyword);
    });

    it('should build unknown type', () => {
      const typeNode = builder.buildType('unknown');
      expect(typeNode.kind).toBe(ts.SyntaxKind.UnknownKeyword);
    });

    it('should build array type', () => {
      const typeNode = builder.buildType('string[]');
      expect(typeNode.kind).toBe(ts.SyntaxKind.ArrayType);
    });

    it('should build Record type (returns unknown)', () => {
      const typeNode = builder.buildType('Record<string, number>');
      expect(typeNode.kind).toBe(ts.SyntaxKind.UnknownKeyword);
    });

    it('should build custom type reference', () => {
      const typeNode = builder.buildType('CustomType');
      expect(typeNode.kind).toBe(ts.SyntaxKind.TypeReference);
    });
  });

  describe('createProperty', () => {
    it('should create property with readonly modifier', () => {
      const property = builder.createProperty('name', 'string', true);
      expect(property.modifiers).toBeDefined();
      expect(property.modifiers?.some((m) => m.kind === ts.SyntaxKind.ReadonlyKeyword)).toBe(true);
    });

    it('should create property without readonly modifier', () => {
      const property = builder.createProperty('name', 'string', false);
      const hasReadonly = property.modifiers?.some((m) => m.kind === ts.SyntaxKind.ReadonlyKeyword) ?? false;
      expect(hasReadonly).toBe(false);
    });

    it('should handle private identifier (#)', () => {
      const property = builder.createProperty('#private', 'string');
      expect(property.name).toBeDefined();
    });
  });

  describe('createParameter', () => {
    it('should create optional parameter', () => {
      const param = builder.createParameter('name', 'string', undefined, true);
      expect(param.questionToken).toBeDefined();
    });

    it('should create required parameter', () => {
      const param = builder.createParameter('name', 'string', undefined, false);
      expect(param.questionToken).toBeUndefined();
    });

    it('should create parameter with TypeNode type', () => {
      const typeNode = ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
      const param = builder.createParameter('name', typeNode);
      expect(param.type).toBe(typeNode);
    });
  });

  describe('sanitizeIdentifier', () => {
    it('should sanitize identifier with special characters', () => {
      const sanitized = builder.sanitizeIdentifier('test-name@123');
      expect(sanitized).toBe('test_name_123');
    });

    it('should add prefix for identifiers starting with number', () => {
      const sanitized = builder.sanitizeIdentifier('123test');
      expect(sanitized).toBe('_123test');
    });

    it('should handle empty string', () => {
      const sanitized = builder.sanitizeIdentifier('');
      expect(sanitized).toBe('_');
    });
  });

  describe('toCamelCase', () => {
    it('should convert first letter to lowercase', () => {
      const result = builder.toCamelCase('Test');
      expect(result).toBe('test');
    });

    it('should handle single character', () => {
      const result = builder.toCamelCase('T');
      expect(result).toBe('t');
    });

    it('should handle empty string', () => {
      const result = builder.toCamelCase('');
      expect(result).toBe('');
    });
  });

  describe('toPascalCase', () => {
    it('should convert first letter to uppercase', () => {
      const result = builder.toPascalCase('test');
      expect(result).toBe('Test');
    });

    it('should handle single character', () => {
      const result = builder.toPascalCase('t');
      expect(result).toBe('T');
    });
  });
});

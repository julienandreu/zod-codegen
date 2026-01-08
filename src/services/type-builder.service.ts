import * as ts from 'typescript';
import type {TypeBuilder} from '../interfaces/code-generator';

export class TypeScriptTypeBuilderService implements TypeBuilder {
  buildType(type: string): ts.TypeNode {
    switch (type) {
      case 'string':
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
      case 'number':
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
      case 'boolean':
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
      case 'unknown':
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
      default:
        // Handle custom types (like Pet, Order, User, etc.) and array types
        if (type.endsWith('[]')) {
          const itemType = type.slice(0, -2);
          return ts.factory.createArrayTypeNode(this.buildType(itemType));
        }
        // Handle Record types
        if (type.startsWith('Record<')) {
          // For now, return unknown for complex Record types
          return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
        }
        // Custom type name - create a type reference
        return ts.factory.createTypeReferenceNode(
          ts.factory.createIdentifier(this.sanitizeIdentifier(type)),
          undefined,
        );
    }
  }

  createProperty(name: string, type: string, isReadonly = false): ts.PropertyDeclaration {
    const createIdentifier = name.startsWith('#') ? 'createPrivateIdentifier' : 'createIdentifier';

    return ts.factory.createPropertyDeclaration(
      isReadonly ? [ts.factory.createToken(ts.SyntaxKind.ReadonlyKeyword)] : undefined,
      ts.factory[createIdentifier](name),
      undefined,
      this.buildType(type),
      undefined,
    );
  }

  createParameter(
    name: string,
    type?: string | ts.TypeNode,
    defaultValue?: ts.Expression,
    isOptional = false,
  ): ts.ParameterDeclaration {
    return ts.factory.createParameterDeclaration(
      undefined,
      undefined,
      ts.factory.createIdentifier(this.sanitizeIdentifier(name)),
      isOptional ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
      typeof type === 'string' ? this.buildType(type) : type,
      defaultValue,
    );
  }

  createGenericType(name: string): ts.TypeParameterDeclaration {
    return ts.factory.createTypeParameterDeclaration(
      undefined,
      ts.factory.createIdentifier(name),
      undefined,
      undefined,
    );
  }

  sanitizeIdentifier(name: string): string {
    const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
    const withPrefix = /^[0-9]/.test(sanitized) ? '_' + sanitized : sanitized;
    return withPrefix.length === 0 ? '_' : withPrefix;
  }

  toCamelCase(word: string): string {
    return word.charAt(0).toLowerCase() + word.slice(1);
  }

  toPascalCase(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
}

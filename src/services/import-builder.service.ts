import * as ts from 'typescript';
import { z } from 'zod';
import type { ImportBuilder } from '../interfaces/code-generator.js';

const IsTypeImport = z.boolean();
const ImportedElement = z.record(z.string(), IsTypeImport);

const ImportOptions = z.object({
  defaultImport: ImportedElement.optional(),
  namedImports: ImportedElement.optional(),
});

type ImportOptionsType = z.infer<typeof ImportOptions>;

export class TypeScriptImportBuilderService implements ImportBuilder {
  buildImports(): ts.ImportDeclaration[] {
    return [
      this.createImport('zod', {
        defaultImport: { z: false },
      }),
      this.createImport('path-to-regexp', {
        namedImports: { compile: false },
      }),
    ];
  }

  createImport(target: string, options: ImportOptionsType): ts.ImportDeclaration {
    const safeOptions = ImportOptions.parse(options);
    const [defaultImport] = Object.entries(safeOptions.defaultImport ?? {})[0] ?? [undefined, false];
    const { success: hasDefaultImport } = z.string().safeParse(defaultImport);

    const safeNameImports = ImportedElement.safeParse(safeOptions.namedImports);
    const namedImportList = safeNameImports.success ? Object.entries(safeNameImports.data) : [];

    // Create import specifiers for named imports
    const namedImports = namedImportList.length > 0
      ? ts.factory.createNamedImports(
        namedImportList.map(([name, isTypeImport = false]) => {
          return ts.factory.createImportSpecifier(isTypeImport, undefined, ts.factory.createIdentifier(name));
        }),
      )
      : undefined;

    // Check if we have any imports at all
    const hasAnyImports = hasDefaultImport || namedImports;

    // For side effects imports, we can pass undefined as the import clause
    // For imports with bindings, we need to create the clause differently
    return ts.factory.createImportDeclaration(
      undefined,
      hasAnyImports ? {
        kind: ts.SyntaxKind.ImportClause,
        isTypeOnly: false,
        name: hasDefaultImport && defaultImport ? ts.factory.createIdentifier(defaultImport) : undefined,
        namedBindings: namedImports,
      } as ts.ImportClause : undefined,
      ts.factory.createStringLiteral(target, true),
      undefined,
    );
  }
}

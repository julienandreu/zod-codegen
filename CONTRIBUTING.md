# Contributing to zod-codegen

Thank you for your interest in contributing to zod-codegen! 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please be respectful and professional in all interactions.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Git

### Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/YOUR_USERNAME/zod-codegen.git
   cd zod-codegen
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Build the Project**

   ```bash
   npm run build
   ```

4. **Run Tests**

   ```bash
   npm test
   ```

5. **Run Development Mode**
   ```bash
   npm run dev
   ```

## Making Changes

### Branch Naming

Use descriptive branch names:

- `feat/add-new-schema-type` - for new features
- `fix/handle-edge-case` - for bug fixes
- `docs/update-readme` - for documentation
- `refactor/optimize-parser` - for refactoring

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect code meaning (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to our CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

**Examples:**

```bash
feat: add support for OpenAPI 3.1 discriminator
fix: handle circular references in schemas
docs: add examples for complex types
test: add integration tests for CLI
```

## Pull Request Process

1. **Create Feature Branch**

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make Changes**
   - Write code following our [coding standards](#coding-standards)
   - Add tests for new functionality
   - Update documentation as needed

3. **Validate Your Changes**

   ```bash
   npm run validate
   ```

   This runs:
   - Type checking
   - Linting
   - Formatting check
   - All tests

4. **Commit Changes**

   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push to Fork**

   ```bash
   git push origin feat/your-feature-name
   ```

6. **Create Pull Request**
   - Use our PR template
   - Link to any related issues
   - Provide clear description of changes
   - Add screenshots if applicable

### PR Requirements

- [ ] All tests pass
- [ ] Code coverage maintained/improved
- [ ] Documentation updated
- [ ] Commit messages follow conventional format
- [ ] No breaking changes (unless justified)
- [ ] Self-review completed

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Prefer explicit types over `any`
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Code Style

We use ESLint and Prettier for consistent code style:

```bash
# Auto-fix linting issues
npm run lint

# Format code
npm run format
```

### File Structure

```
src/
├── cli.ts              # CLI entry point
├── generator.ts        # Main generator class
├── services/           # Business logic
│   ├── *.service.ts
├── utils/              # Utilities
│   ├── *.ts
├── types/              # Type definitions
│   ├── *.ts
└── interfaces/         # Interfaces
    ├── *.ts
```

## Testing

### Test Structure

```
tests/
├── unit/               # Unit tests
│   ├── *.test.ts
├── integration/        # Integration tests
│   ├── *.test.ts
└── fixtures/           # Test data
    ├── *.json
```

### Writing Tests

- Use Vitest for testing
- Write descriptive test names
- Test edge cases and error conditions
- Maintain test coverage above 80%

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest run generator.test.ts
```

## Documentation

### Code Documentation

- Add JSDoc comments to public APIs
- Include examples in documentation
- Document complex algorithms and business logic

### README Updates

If your changes affect usage, update the README:

- Add new examples
- Update installation instructions
- Document new CLI options

## Release Process

Releases are automated using semantic-release:

1. Merge to `main` branch
2. Semantic-release analyzes commits
3. Automatically creates version and release notes
4. Publishes to npm
5. Creates GitHub release

## Getting Help

- 📚 Check existing [documentation](README.md)
- 🐛 Search [existing issues](https://github.com/julienandreu/zod-codegen/issues)
- 💬 Start a [discussion](https://github.com/julienandreu/zod-codegen/discussions)
- 📧 Email: [julienandreu@me.com](mailto:julienandreu@me.com)

## Recognition

Contributors are recognized in our:

- Release notes
- Contributors section
- Acknowledgments

Thank you for contributing! 🙏

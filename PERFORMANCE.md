# Build Performance

## Current Build Time

- **Standard TypeScript (`tsc`)**: ~1.2 seconds
- **Project size**: 19 TypeScript files, ~184KB

## TypeScript Native Preview (TSGO)

For even faster builds, you can optionally use the TypeScript Native Preview (TSGO), a Go-based compiler that can be up to 10x faster.

### Installation

```bash
npm install -D @typescript/native-preview
```

### Usage

```bash
# Use native compiler for builds
npm run build:native

# Or use directly
npx tsgo --project tsconfig.json
```

### Notes

- **Status**: Still in preview/experimental phase
- **Compatibility**: May not support all TypeScript features yet
- **Best for**: Large codebases where build time is a bottleneck
- **Current project**: Build is already fast (~1.2s), so the benefit is minimal

### When to Use TSGO

✅ **Use TSGO if:**

- You have a large codebase (>100 files)
- Build time is >5 seconds
- You're willing to test experimental features

❌ **Stick with `tsc` if:**

- Your build is already fast (<2 seconds)
- You need 100% feature compatibility
- You're in production

### Benchmarking

To compare performance:

```bash
# Standard TypeScript
time npm run build

# Native TypeScript
time npm run build:native
```

# Enterprise Testing Pattern

This document outlines the standard testing architecture for the Good Shepherd Insights Router. All new tests must adhere to these conventions to ensure scalability, readability, and prevention of source-bundle bloat.

## 1. Directory Structure

Unit tests must **never** reside alongside application code in the `src/` directory. 

All testing logic must be isolated within the root-level `tests/` folder. The internal structure of the `tests/` folder must perfectly mirror the folder hierarchy of the `src/` directory.

**Example:**
- Source Code: `src/gateway/GoodshepherdModelGateway.ts`
- Test Suite: `tests/gateway/GoodshepherdModelGateway.test.ts`

## 2. Dynamic Fixtures (No Hardcoded Strings)

Magic strings, mock payload injections, configuration IDs, and expected outcomes must **not** be hardcoded inside the `.test.ts` execution files.

Instead, every test module should have an accompanying `.fixtures.ts` file in the same directory. This file exports a centralized, scalable configuration object (e.g., `GATEWAY_TEST_CONFIG`) that aggregates the baseline strings.

**Why?** If an underlying identifier or upstream provider URL changes, you only need to update the single `fixtures.ts` file rather than hunting down 15 broken assertions.

## 3. Explanatory JSDoc Headlines

Every test block (`it()`) must be preceded by an enterprise-grade JSDoc comment. 

The comment must begin with a **concise, descriptive headline** summarizing the precise intent of the execution block, followed by a brief explanation of the behavior being validated.

**Good Example:**
```typescript
/**
 * Local Model URL Resolution
 * 
 * Confirms that models prefixed with `local:` are correctly detected
 * and routed to the default local proxy URL format instead of the 
 * production inference endpoints.
 */
it('should correctly determine the base URL for local models', () => { ... });
```

**Bad Example:**
```typescript
// tests the local model
it('should test local', () => { ... });
```

## 4. Test Isolation

To prevent test-state pollution (where the side-effect of one test breaks a subsequent test), classes and instances being evaluated must be instantiated cleanly before *every* test. 

Use Vitest's `beforeEach()` hook to wipe internal state cleanly:

```typescript
describe('GoodshepherdModelGateway', () => {
    let gateway: GoodshepherdModelGateway;

    beforeEach(() => {
        gateway = new GoodshepherdModelGateway();
    });
    
    // ...
});
```

## 5. Execution

The repository uses `vitest` as the standard JavaScript/TypeScript test runner.
- Run tests once: `npm run test`
- Run tests in watch mode (for active development): `npm run test:watch`

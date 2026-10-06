# bitmark-editor-angular (workspace)

The Angular CLI workspace for `@gmb/bitmark-editor-angular` (PLAN-021 Step
13a) and its cosmic-shaped example app (Step 15a).

```bash
npm install
npx ng build bitmark-editor-angular   # the library → dist/bitmark-editor-angular
npx ng build example                   # the example app → dist/example
cd e2e && npx playwright test -c playwright.config.mjs
```

The library depends on the core package through `file:../bitmark-editor`;
build that first (`bun run build` in `packages/bitmark-editor`).

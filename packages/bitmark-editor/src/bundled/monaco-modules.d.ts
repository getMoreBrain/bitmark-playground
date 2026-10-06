// Monaco 0.57 ships no types for this path (its "exports" map it to the
// JSON language's contribution module).
declare module 'monaco-editor/language/json/monaco.contribution' {
  export const jsonDefaults: unknown;
  export const getWorker: unknown;
}

// Mock for Monaco basic-language contribution side-effect imports in tests.
// The real modules register a language via monaco's global registry, which the
// test environment (jsdom + mocked monaco-editor) does not provide.
export {};

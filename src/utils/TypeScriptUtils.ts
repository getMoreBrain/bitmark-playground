/**
 * Type to remove 'readonly' from a type definition
 */
export type Writable<T> = { -readonly [K in keyof T]: T[K] };

const INDENT = '  ';

/**
 * `JSON.stringify(bits, undefined, 2)`, written one bit at a time so the
 * offset where each bit starts is known as it is written (PLAN-018 D1).
 *
 * The text is identical to the one-call form: each element is stringified on
 * its own and indented one level. Newlines inside JSON strings are escaped,
 * so indenting at every raw newline is exact.
 */
export const jsonWithBitStarts = (
  bits: readonly unknown[],
): { text: string; bitStarts: number[] } => {
  if (bits.length === 0) return { text: '[]', bitStarts: [] };
  const bitStarts: number[] = [];
  let text = '[';
  bits.forEach((bit, i) => {
    text += i === 0 ? `\n${INDENT}` : `,\n${INDENT}`;
    bitStarts.push(text.length);
    // An array element that has no JSON form is written as `null`, as
    // `JSON.stringify` does.
    const element = JSON.stringify(bit, undefined, 2) ?? 'null';
    text += element.replace(/\n/g, `\n${INDENT}`);
  });
  text += '\n]';
  return { text, bitStarts };
};

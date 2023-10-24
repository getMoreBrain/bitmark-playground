class StringUtils {
  isString(obj: unknown): boolean {
    return typeof obj === 'string' || obj instanceof String;
  }
}

const stringUtils = new StringUtils();

export { stringUtils as StringUtils };

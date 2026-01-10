/**
 * Converts a camelCase or PascalCase string to kebab-case.
 * @param str The string to convert
 * @returns The kebab-case string
 * @example
 * toKebabCase('camelCase') // 'camel-case'
 * toKebabCase('PascalCase') // 'pascal-case'
 * toKebabCase('po2Measured') // 'po2-measured'
 */
export function toKebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

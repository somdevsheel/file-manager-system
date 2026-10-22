/** Validation for user-entered file/folder names. Returns an error message, or null if valid. */
export function validateFileName(value: string): string | null {
  const name = value.trim();
  if (name.length === 0) return 'Name cannot be empty';
  if (name === '.' || name === '..') return 'This name is reserved';
  if (name.includes('/')) return 'Name cannot contain "/"';
  if (name.includes('\0')) return 'Name contains an invalid character';
  if (name.length > 255) return 'Name is too long';
  return null;
}

/**
 * Normalized key of a user-written name (spec 050): lowercase letters, digits and single dashes, with the accents
 * dropped (`Black Speech` → `black-speech`, `Adûnaic` → `adunaic`). References between entities store this key; the
 * name the user wrote is kept apart for display.
 */
export function toKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** toKey for optional values: null, undefined and blank stay null. */
export function toOptionalKey(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null;
  return toKey(text) || null;
}

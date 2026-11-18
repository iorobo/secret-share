export type LogicalTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'themeMode';

export function getInitialLogicalTheme(): LogicalTheme {
  try {
    const stored = localStorage.getItem(
      THEME_STORAGE_KEY,
    ) as LogicalTheme | null;
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    return 'light';
  }
  return 'light';
}

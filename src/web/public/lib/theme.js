// Theme controller for the operator console.
//
// Three-state model:
//   - localStorage 'personal-ai-agent-theme' === 'light' | 'dark' -> explicit user choice
//   - absent                                                       -> follow the OS preference
// The document root carries `data-theme` only when an explicit choice exists; when
// absent the attribute is removed so the `@media (prefers-color-scheme: dark)` rules
// (scoped to `:root:not([data-theme='light'])`) take over.

export const THEME_STORAGE_KEY = 'personal-ai-agent-theme';
export const THEME_TOGGLE_ID = 'theme-toggle-button';

const THEME_GLYPH = { light: '☀', dark: '☾' };

function isBrowser() {
  return typeof document !== 'undefined';
}

function prefersDark() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * @returns {'light' | 'dark' | null} the explicitly stored theme, or null for "follow system".
 */
export function getStoredTheme() {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function persistTheme(theme) {
  try {
    if (theme === 'light' || theme === 'dark') {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } else {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    }
  } catch {
    // Storage may be unavailable (private mode / disabled); theme still applies for the session.
  }
}

/**
 * The theme actually being rendered right now: an explicit choice if present, otherwise the OS preference.
 * @returns {'light' | 'dark'}
 */
export function getEffectiveTheme() {
  const stored = getStoredTheme();
  if (stored) {
    return stored;
  }
  return prefersDark() ? 'dark' : 'light';
}

/**
 * Reflect the chosen theme on the document root.
 * @param {'light' | 'dark' | null} theme  null removes the attribute (= follow system).
 */
export function applyTheme(theme) {
  if (!isBrowser()) {
    return;
  }
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') {
    root.dataset.theme = theme;
  } else {
    delete root.dataset.theme;
  }
}

function getToggleButton() {
  return isBrowser() ? document.getElementById(THEME_TOGGLE_ID) : null;
}

function updateToggleButton(effectiveTheme) {
  const button = getToggleButton();
  if (!button) {
    return;
  }
  const nextTheme = effectiveTheme === 'dark' ? 'light' : 'dark';
  const label = nextTheme === 'dark' ? '다크 모드로 전환' : '라이트 모드로 전환';
  button.textContent = THEME_GLYPH[effectiveTheme] ?? THEME_GLYPH.light;
  button.setAttribute('aria-label', label);
  button.setAttribute('title', label);
  button.setAttribute('aria-pressed', String(effectiveTheme === 'dark'));
}

/**
 * Apply the stored theme (or system default) and sync the toggle button.
 * Safe to call once during app bootstrap.
 */
export function initTheme() {
  if (!isBrowser()) {
    return;
  }
  applyTheme(getStoredTheme());
  updateToggleButton(getEffectiveTheme());
}

/**
 * Flip between light and dark based on what is currently rendered, persist the choice,
 * and refresh the toggle button. Returns the new effective theme.
 * @returns {'light' | 'dark'}
 */
export function toggleTheme() {
  const nextTheme = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
  persistTheme(nextTheme);
  applyTheme(nextTheme);
  updateToggleButton(nextTheme);
  return nextTheme;
}

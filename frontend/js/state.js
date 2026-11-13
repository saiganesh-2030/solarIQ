// Global application state management
const STATE_KEY = 'solariq_state';
const THEME_KEY = 'solariq_theme';

const defaultState = {
  plantId: 4135001,
  plantName: 'Plant 1',
  tariff: 6.0,
  k: 3.5,
  lastAnalysisId: null,
};

function loadState() {
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    return raw ? { ...defaultState, ...jsonParse(raw) } : defaultState;
  } catch (e) {
    return defaultState;
  }
}

function jsonParse(str) {
  try { return JSON.parse(str); } catch (e) { return {}; }
}

export const state = loadState();

export function updateState(partial) {
  Object.assign(state, partial);
  try {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('solariq:statechange', { detail: state }));
}

export function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
  window.dispatchEvent(new CustomEvent('solariq:themechange', { detail: theme }));
}

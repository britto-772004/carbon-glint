/** Demo mode flag. Lives in sessionStorage so a refresh keeps the demo; closing the tab ends it. */
const KEY = 'cg.demo';
let memory = false;

export const isDemoMode = (): boolean => {
  try {
    return window.sessionStorage.getItem(KEY) === '1';
  } catch {
    return memory;
  }
};

export const setDemoMode = (on: boolean): void => {
  memory = on;
  try {
    if (on) window.sessionStorage.setItem(KEY, '1');
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // storage unavailable: the in-memory flag still works for this page load
  }
};

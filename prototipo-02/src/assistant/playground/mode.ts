export const isPlayground = () => new URLSearchParams(window.location.search).get('playground') === '1';
export const playgroundStorageKey = 'nls-playground-v1';

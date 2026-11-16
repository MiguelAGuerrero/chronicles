// @layer core

/** On a phone the page's document may load nothing from anywhere (NP13, NI7); the web's page is the app's own. */
export const NOTE_CSP = "default-src 'self' 'unsafe-inline' 'unsafe-eval' file: data: blob:; connect-src 'none'; img-src data: blob:; frame-src 'none'; form-action 'none'";

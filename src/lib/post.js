/**
 * POST some JSON. Three callers spelled out the same method / content-type /
 * JSON.stringify triple, and the copies had already diverged in the way that
 * matters: ThemeToggle's had no error handling at all, so toggling the theme
 * offline threw an unhandled rejection where LangSwitcher's careful `finally`
 * handled the identical failure.
 *
 * The response is returned unread — /api/chat needs the body and the status,
 * /api/prefs needs neither.
 *
 * @param {string} url
 * @param {unknown} body
 */
export const postJSON = (url, body) =>
  fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });

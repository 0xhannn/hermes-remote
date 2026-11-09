// Hermes auth guard — verifies session via API cookie (not localStorage).
// Checks the authorized /api/hermes/config endpoint; on 401 clears stale
// localStorage pin and redirects to auth. Re-runs on pageshow so browser
// back-forward cache (bfcache) cannot resurrect an abandoned session.
async function hermesGuard(nextPath) {
  const next = nextPath || window.location.pathname;
  try {
    const res = await fetch('/api/hermes/config', { credentials: 'same-origin' });
    if (res.ok) return true;
  } catch (e) { /* network error -> treat as unauthenticated */ }
  localStorage.removeItem('hermes_pin');
  window.location.href = '/hermes/auth/?next=' + encodeURIComponent(next);
  return false;
}

// Re-verify on pageshow (triggers on bfcache back/forward navigation).
window.addEventListener('pageshow', (e) => {
  if (e.persisted) hermesGuard();
});

// Store pin in localStorage for legacy X-Hermes-PIN header (still sent as backup).
function hermesSetPin(pin) {
  localStorage.setItem('hermes_pin', pin || '');
}

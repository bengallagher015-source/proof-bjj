/* ══════════════════════════════════════════════════════════
   cloud.js — optional sync. Local-first stays true: the app
   never needs an account. Sign in from the You tab and the
   record mirrors to one row in Supabase (RLS: only you can
   read or write it). Same project as REBUILD, so one login
   covers both apps. Raw fetch, no SDK.
   ══════════════════════════════════════════════════════════ */

const SUPA_URL = 'https://tawgickecvgsxfrsbcgl.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhd2dpY2tlY3Znc3hmcnNiY2dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NTA3OTAsImV4cCI6MjEwMDAyNjc5MH0.Cn7s4PCo33JbpS05spOkNA74_qKEGqH0pwRjq2_IBXs';
const AUTH_KEY = 'proof-auth';
const TABLE = '/rest/v1/proof_users';

let auth = null;
let cloud = { status: 'off', lastSync: 0, pending: false, err: '' };   /* off | ok | offline | error */

function loadAuth() { try { auth = JSON.parse(localStorage.getItem(AUTH_KEY)); } catch (e) { auth = null; } }
function saveAuth(a) {
  auth = a;
  try { a ? localStorage.setItem(AUTH_KEY, JSON.stringify(a)) : localStorage.removeItem(AUTH_KEY); } catch (e) {}
}
function mkSession(d) {
  return { access_token: d.access_token, refresh_token: d.refresh_token,
           expires_at: Date.now() + ((d.expires_in || 3600) * 1000),
           user: { id: d.user.id, email: d.user.email } };
}
function signedIn() { return !!(auth && auth.user && auth.access_token); }

async function refreshToken() {
  if (!auth || !auth.refresh_token) return;
  try {
    const r = await fetch(SUPA_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', headers: { apikey: SUPA_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: auth.refresh_token }) });
    if (r.ok) saveAuth(mkSession(await r.json()));
    else if (r.status === 400 || r.status === 401) saveAuth(null);   /* revoked — sign out cleanly */
  } catch (e) { /* offline; keep the token, try later */ }
}
async function authFetch(path, opts) {
  opts = opts || {};
  if (auth && auth.expires_at && Date.now() > auth.expires_at - 60000) await refreshToken();
  const headers = Object.assign({ apikey: SUPA_ANON, 'Content-Type': 'application/json' }, opts.headers || {});
  if (auth && auth.access_token) headers.Authorization = 'Bearer ' + auth.access_token;
  return fetch(SUPA_URL + path, Object.assign({}, opts, { headers }));
}
async function signIn(email, pass) {
  const r = await fetch(SUPA_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { apikey: SUPA_ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password: pass }) });
  const d = await r.json();
  if (!r.ok || !d.access_token) throw new Error(d.error_description || d.msg || 'Wrong email or password');
  saveAuth(mkSession(d)); return d;
}
async function signUp(email, pass) {
  const r = await fetch(SUPA_URL + '/auth/v1/signup', {
    method: 'POST', headers: { apikey: SUPA_ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password: pass }) });
  const d = await r.json();
  if (!r.ok || !d.access_token) throw new Error(d.msg || d.error_description || 'Could not create account');
  saveAuth(mkSession(d)); return d;
}
function signOut() {
  saveAuth(null); cloud = { status: 'off', lastSync: 0, pending: false, err: '' };
  /* the record stays on this device — signing out is not deleting */
}

/* ── the row ─────────────────────────────────────────────── */
async function pullCloud() {
  const r = await authFetch(TABLE + '?id=eq.' + auth.user.id + '&select=data,saved_at', { method: 'GET' });
  if (!r.ok) throw new Error('pull ' + r.status);
  const rows = await r.json();
  return rows && rows[0] ? rows[0] : null;
}
let pushTimer = null;
async function pushCloud() {
  if (!signedIn()) return false;
  const body = { id: auth.user.id, email: auth.user.email,
    name: (state.profile && state.profile.name) || (auth.user.email || '').split('@')[0],
    data: state, saved_at: state.savedAt || 0 };
  try {
    const r = await authFetch(TABLE, { method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(body) });
    cloud.pending = !r.ok;
    if (r.ok) { cloud.status = 'ok'; cloud.lastSync = Date.now(); cloud.err = ''; }
    else { cloud.status = 'error'; cloud.err = 'push ' + r.status; }
    paintSyncChip();
    return r.ok;
  } catch (e) { cloud.pending = true; cloud.status = 'offline'; paintSyncChip(); return false; }
}
/* engine.js calls this after every successful local write (see saveState) */
function onStateSaved() {
  if (!signedIn()) return;
  clearTimeout(pushTimer); pushTimer = setTimeout(pushCloud, 1500);
}
window.addEventListener('online', () => { if (signedIn() && cloud.pending) pushCloud(); });

/* Adopt a record from the cloud. Always through the safety ring: the record it
   replaces becomes an undo point, exactly like an import would. */
function adoptCloud(d) {
  if (!validRecord(d)) return false;
  snapshot();
  state = Object.assign(defaults(), d);
  return saveState(true);      /* sets baseline, so the stale-tab guard is happy */
}

/* Reconcile: whoever saved most recently wins, and nothing is thrown away.
   - cloud newer  → adopt it (local goes into the undo ring)
   - local newer  → push it
   - cloud empty  → push local (this is the "first login claims this device" case)
   Called at boot when signed in, after sign-in, and whenever the app comes back to
   the foreground — which is the cross-device moment. */
async function syncNow(reason) {
  if (!signedIn()) return 'off';
  let row = null;
  try { row = await pullCloud(); }
  catch (e) { cloud.status = 'offline'; paintSyncChip(); return 'offline'; }
  const cloudAt = row && row.data && typeof row.data === 'object' ? (row.saved_at || row.data.savedAt || 0) : 0;
  const localAt = state.savedAt || 0;
  const localHasStuff = state.profile && (state.sessions.length || learnedCount());
  let result;
  if (cloudAt > localAt && row.data && Array.isArray(row.data.sessions)) {
    if (adoptCloud(row.data)) {
      result = 'pulled';
      if (typeof applyBelt === 'function' && state.profile) applyBelt(state.profile.belt);
      if (typeof renderTab === 'function' && typeof currentTab !== 'undefined') renderTab(currentTab);
      if (reason !== 'boot') toast('Synced — picked up newer training from your other device');
    } else result = 'error';
  } else if (localHasStuff || !cloudAt) {
    result = (await pushCloud()) ? 'pushed' : 'error';
  } else result = 'same';
  cloud.status = result === 'error' ? 'error' : 'ok';
  if (cloud.status === 'ok') cloud.lastSync = Date.now();
  paintSyncChip();
  return result;
}
/* phone comes back to the app → see if the laptop wrote something */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && signedIn()) syncNow('foreground');
});

/* ── UI: the sync card on the You tab ────────────────────── */
function syncCardHTML() {
  if (!signedIn()) return `
    <div class="card" id="syncCard">
      <div class="card-hd"><h3>Sync</h3><span class="tiny">off · this device only</span></div>
      <p class="tiny" style="margin-bottom:12px">Sign in and your record lives in the cloud too — same data on your phone and laptop, and it survives a lost phone. No account needed to use PROOF; this is optional.</p>
      <form class="sync-form" id="syncForm">
        <input id="syncEmail" type="email" placeholder="Email" autocomplete="email" required>
        <input id="syncPass" type="password" placeholder="Password" autocomplete="current-password" minlength="6" required>
        <div class="btnrow">
          <button type="submit" class="btn small" data-mode="in">Sign in</button>
          <button type="button" class="btn ghost small" id="syncUp">Create account</button>
        </div>
        <p class="tiny sync-err" id="syncErr" hidden></p>
      </form>
    </div>`;
  const when = cloud.lastSync ? relDate(cloud.lastSync).toLowerCase() : 'not yet';
  const lab = { ok: 'synced', offline: 'offline — will sync', error: 'sync error', off: '' }[cloud.status] || cloud.status;
  return `
    <div class="card" id="syncCard">
      <div class="card-hd"><h3>Sync</h3><span class="tiny sync-chip s-${cloud.status}" id="syncChip">${lab}</span></div>
      <div class="setrow"><span>Signed in as<br><b class="tiny">${esc(auth.user.email)}</b></span><button id="syncOut">Sign out</button></div>
      <div class="setrow"><span>Last synced<br><b class="tiny">${when}${cloud.err ? ' · ' + esc(cloud.err) : ''}</b></span><button id="syncGo">Sync now</button></div>
      <p class="tiny" style="margin-top:8px">Newer wins, and whatever it replaces goes into “Undo last replace” — nothing is thrown away by a sync.</p>
    </div>`;
}
function paintSyncChip() {
  const c = document.getElementById('syncChip'); if (!c) return;
  const lab = { ok: 'synced', offline: 'offline — will sync', error: 'sync error' }[cloud.status] || cloud.status;
  c.textContent = lab; c.className = 'tiny sync-chip s-' + cloud.status;
}
function bindSyncCard(rerender) {
  const f = document.getElementById('syncForm');
  if (f) {
    const err = m => { const e = document.getElementById('syncErr'); e.textContent = m; e.hidden = !m; };
    const go = async mode => {
      err('');
      const email = document.getElementById('syncEmail').value, pass = document.getElementById('syncPass').value;
      if (!email || pass.length < 6) return err('Email, and a password of 6+ characters.');
      const btns = f.querySelectorAll('button'); btns.forEach(b => b.disabled = true);
      try {
        if (mode === 'up') await signUp(email, pass); else await signIn(email, pass);
        const r = await syncNow('signin');
        toast(r === 'pulled' ? 'Signed in — your record came down from the cloud'
            : r === 'pushed' ? 'Signed in — this device is now backed up'
            : r === 'offline' ? 'Signed in — will sync when online' : 'Signed in');
        rerender();
      } catch (e) { err(e.message || 'Could not sign in'); btns.forEach(b => b.disabled = false); }
    };
    f.addEventListener('submit', e => { e.preventDefault(); go('in'); });
    document.getElementById('syncUp').addEventListener('click', () => go('up'));
  }
  const out = document.getElementById('syncOut');
  if (out) out.addEventListener('click', () => {
    if (!confirm('Sign out? Your training stays on this device; it just stops syncing.')) return;
    signOut(); rerender(); toast('Signed out');
  });
  const g = document.getElementById('syncGo');
  if (g) g.addEventListener('click', async () => {
    g.textContent = 'Syncing…';
    const r = await syncNow('manual');
    toast(r === 'pulled' ? 'Picked up newer training from the cloud' : r === 'pushed' ? 'Backed up' : r === 'same' ? 'Already in sync' : r === 'offline' ? 'Offline — will sync when online' : 'Sync failed — try again');
    rerender();
  });
}

/* boot: nothing to do unless a session is stored */
async function enterCloud() {
  loadAuth();
  if (!signedIn()) return;
  await refreshToken();
  if (!signedIn()) return;   /* token was revoked */
  syncNow('boot');
}

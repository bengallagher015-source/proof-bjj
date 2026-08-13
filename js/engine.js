/* ══════════════════════════════════════════════════════════
   engine.js — state, storage, and the three engines:
   Proof (progress evidence), Body (load + niggles),
   Recall (spaced repetition). Plus lifetime stats, heatmap,
   trophies and the demo seed. Money-free, backend-free.
   ══════════════════════════════════════════════════════════ */

const KEY = 'proof-v1';
const BAK = KEY + '-bak';          /* snapshot taken before anything replaces the record */
const QUAR = KEY + '-quarantine';  /* a blob we could not read — kept, never overwritten */
const DAY = 86400000;

function defaults() {
  return {
    v: 1,
    profile: null,   // {name, belt, stripes, weeklyTarget, createdTs}
    sessions: [],    // newest LAST (chronological)
    recall: {},      // techId -> {stage, due, name}
    reviewLog: [],   // [{ts, id, grade}] — fuels quests + MP
    seen: [],        // proof ids already celebrated
    focus: null,     // techId — this week's weapon
    lastLevel: 1,    // last level celebrated (level-up detection)
    learned: {},     // techId -> ts, the library ticks
    demo: false,
    savedAt: 0,      // ms of last write — guards stale tabs (see saveState)
  };
}
let state = defaults();
let quarantined = false;   /* boot found a blob it could not read */
let lastSaveOK = true;     /* false when the most recent write did not land */
/* The savedAt of the record this session's state descends from. Anything newer than
   this on disk was written by another tab. Infinity = we deliberately do not descend
   from what's stored (quarantined it), so we're free to write over it. */
let baseline = 0;

function loadState() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { return; }
  if (!raw) return;
  let d = null;
  try { d = JSON.parse(raw); } catch (e) { d = null; }
  if (d && d.v === 1 && Array.isArray(d.sessions)) {
    state = Object.assign(defaults(), d);
    baseline = d.savedAt || 0;
    return;
  }
  /* Corrupt, or written by a newer PROOF than this bundle (a stale cached bundle must
     never flatten newer data). Keep a copy before the app can save over the original. */
  try { localStorage.setItem(QUAR, raw); } catch (e) { /* nothing more we can do */ }
  quarantined = true;
  baseline = Infinity;   /* copy kept — this session may now own the key */
}

/* force = a deliberate wholesale replacement (import, restore, reset, demo), which is
   allowed to land on top of a newer record because the user just asked for it. */
function saveState(force) {
  /* A tab that booted before another tab wrote holds a stale whole-blob copy. Re-read
     the stamp and refuse to flatten a newer record — the user reloads to pick it up. */
  if (!force) {
    try {
      const cur = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (cur && cur.savedAt && cur.savedAt > baseline) {
        if (typeof toast === 'function') toast('Newer data saved in another tab — reload before logging here', 6000);
        return (lastSaveOK = false);
      }
    } catch (e) { /* unreadable; fall through to the write */ }
  }
  state.savedAt = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    baseline = state.savedAt;
    return (lastSaveOK = true);
  } catch (e) {
    if (typeof toast === 'function') toast('⚠️ Not saved — storage full or private browsing. Export a backup.', 7000);
    return (lastSaveOK = false);
  }
}

/* Everything the render path will touch, checked before a single byte is written.
   Array.isArray(sessions) alone is not enough — one null in the array throws in
   lifetime() AFTER the save, which bricks every tab and strands the undo button. */
function validRecord(d) {
  if (!d || d.v !== 1 || !Array.isArray(d.sessions)) return false;
  if (!d.profile || !d.profile.belt || !BELTS[d.profile.belt]) return false;
  if (!d.sessions.every(s => s && typeof s === 'object' && typeof s.ts === 'number' &&
      (s.techs == null || Array.isArray(s.techs)) && (s.niggles == null || Array.isArray(s.niggles)))) return false;
  if (d.recall != null && (typeof d.recall !== 'object' || Array.isArray(d.recall))) return false;
  if (d.reviewLog != null && !Array.isArray(d.reviewLog)) return false;
  if (d.seen != null && !Array.isArray(d.seen)) return false;
  return true;
}

/* Copy the record aside before any path that replaces it wholesale.
   A RING, not one slot: two destructive taps in a row (load demo, then clear demo)
   would otherwise leave the only undo point holding demo data, with the real record
   gone for good. When trimming, demo-only snapshots are evicted before real ones. */
const BAK_MAX = 4;
function readBaks() {
  try {
    const a = JSON.parse(localStorage.getItem(BAK) || '[]');
    return Array.isArray(a) ? a.filter(b => b && Array.isArray(b.sessions)) : [];
  } catch (e) { return []; }
}
function realCount(sessions) { return sessions.filter(s => s && !s.demo).length; }

function snapshot() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!d || !Array.isArray(d.sessions) || !d.sessions.length) return;
    const list = readBaks();
    /* don't stack duplicates of the same record */
    if (list[0] && list[0].savedAt === d.savedAt && list[0].sessions.length === d.sessions.length) return;
    list.unshift(d);
    while (list.length > BAK_MAX) {
      /* evict the oldest snapshot that holds no real sessions; if they all do, the oldest */
      let i = list.length - 1;
      for (let j = list.length - 1; j > 0; j--) if (!realCount(list[j].sessions)) { i = j; break; }
      list.splice(i, 1);
    }
    localStorage.setItem(BAK, JSON.stringify(list));
  } catch (e) { /* best effort — quota, private mode */ }
}
/* A blob this bundle could not read is kept under QUAR. Give it a way back — otherwise
   it sits in storage under a key no phone user can reach. */
function quarantineInfo() {
  try {
    const d = JSON.parse(localStorage.getItem(QUAR) || 'null');
    if (!d || !Array.isArray(d.sessions) || !d.sessions.length) return null;
    return { n: d.sessions.length, v: d.v };
  } catch (e) { return null; }
}
function recoverQuarantine() {
  try {
    const d = JSON.parse(localStorage.getItem(QUAR) || 'null');
    if (!d || !Array.isArray(d.sessions)) return false;
    /* Down-convert to what this bundle understands, keeping every session. */
    const salvaged = Object.assign(defaults(), d, { v: 1 });
    salvaged.sessions = d.sessions.filter(s => s && typeof s === 'object' && typeof s.ts === 'number');
    if (!validRecord(salvaged)) return false;
    snapshot();
    state = salvaged;
    if (!saveState(true)) return false;
    try { localStorage.removeItem(QUAR); } catch (e) {}
    return true;
  } catch (e) { return false; }
}

/* Offer the newest snapshot that still holds real sessions, so the demo can never
   bury the user's own record behind it. */
function bestSnapshotIdx() {
  const list = readBaks();
  if (!list.length) return -1;
  const i = list.findIndex(b => realCount(b.sessions) > 0);
  return i === -1 ? 0 : i;
}
function snapshotInfo() {
  const list = readBaks(); const i = bestSnapshotIdx();
  if (i < 0) return null;
  const d = list[i];
  return { n: d.sessions.length, real: realCount(d.sessions), ts: d.savedAt || 0, more: list.length - 1 };
}
function restoreSnapshot() {
  try {
    const list = readBaks(); const i = bestSnapshotIdx();
    if (i < 0) return false;
    const d = list[i];
    snapshot();                      /* current record joins the ring before we leave it */
    state = Object.assign(defaults(), d);
    return saveState(true);
  } catch (e) { return false; }
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function hasProfile() { return !!(state.profile && state.profile.belt); }

/* ── formatting ──────────────────────────────────────────── */
function fmtDur(mins) {
  if (mins < 60) return mins + 'm';
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : h + 'h';
}
function fmtHours(mins) { return (mins / 60).toFixed(mins >= 5970 ? 0 : 1).replace(/\.0$/, ''); }
function fmtDate(ts) { return new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }); }
function relDate(ts) {
  const d = Math.round((startOfDay(Date.now()) - startOfDay(ts)) / DAY);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return d + ' days ago';
  return fmtDate(ts);
}
function startOfDay(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }

/* ── sessions ────────────────────────────────────────────── */
function addSession(s) {
  s.id = s.id || uid();
  s.ts = s.ts || Date.now();
  const before = allProofs();
  state.sessions.push(s);
  state.sessions.sort((a, b) => a.ts - b.ts);
  /* recall: every technique touched gets a review slot */
  for (const t of (s.techs || [])) {
    if (!state.recall[t.id]) state.recall[t.id] = { stage: 0, due: s.ts + DAY, name: t.name };
  }
  const after = allProofs();
  const beforeIds = new Set(before.map(p => p.id));
  const fresh = after.filter(p => !beforeIds.has(p.id));
  saveState();
  return fresh;
}
function deleteSession(id) {
  state.sessions = state.sessions.filter(s => s.id !== id);
  saveState();
}

/* ── lifetime + week stats ───────────────────────────────── */
function lifetime() {
  const ss = state.sessions;
  const mins = ss.reduce((n, s) => n + (s.mins || 0), 0);
  const rounds = ss.reduce((n, s) => n + (s.rounds || 0), 0);
  const subs = ss.reduce((n, s) => n + (s.techs || []).filter(t => t.res === 'hit' && t.cat === 'sub').reduce((a, t) => a + t.n, 0), 0);
  const arsenal = new Set(); ss.forEach(s => (s.techs || []).forEach(t => arsenal.add(t.id)));
  return { sessions: ss.length, mins, hours: fmtHours(mins), rounds, subs, arsenal: arsenal.size };
}
function weekStart(ts) { const d = new Date(ts); const day = (d.getDay() + 6) % 7; d.setHours(0, 0, 0, 0); return d.getTime() - day * DAY; }
function weekStats() {
  const w0 = weekStart(Date.now());
  const ss = state.sessions.filter(s => s.ts >= w0);
  return { sessions: ss.length, mins: ss.reduce((n, s) => n + s.mins, 0), target: (state.profile && state.profile.weeklyTarget) || 3 };
}
function heatmapData(weeks = 17) {
  const end = startOfDay(Date.now());
  const start = weekStart(end - (weeks - 1) * 7 * DAY);
  const map = {};
  for (const s of state.sessions) {
    const k = startOfDay(s.ts);
    if (k >= start) map[k] = (map[k] || 0) + (s.mins / 60) * (s.intensity || 3);
  }
  const cells = [];
  for (let t = start; t <= end; t += DAY) cells.push({ ts: t, v: map[t] || 0 });
  return cells;
}

/* ── PROOF engine ────────────────────────────────────────── */
const SESSION_MILES = [1, 5, 10, 25, 50, 100, 150, 200, 300];
const HOUR_MILES = [10, 25, 50, 100, 200, 300, 500];
const TECH_MILES = [5, 10, 25, 50, 100];

function allProofs() {
  const proofs = [];
  const hitCount = {}, seenFirst = {}, seenVs = {};
  let mins = 0, hourIdx = 0, sessIdx = 0, lastTs = 0;
  const higher = { white: 1, blue: 2, purple: 3, brown: 4, black: 5, bigger: 0.5 };
  const myBelt = state.profile ? higher[state.profile.belt] : 1;

  state.sessions.forEach((s, si) => {
    /* comeback */
    if (lastTs && s.ts - lastTs >= 21 * DAY) {
      proofs.push({ id: 'back-' + s.id, kind: 'comeback', ts: s.ts, icon: '🔥', tier: 1,
        title: 'Back on the mat', sub: `Returned after ${Math.round((s.ts - lastTs) / DAY)} days away. Showing up is the whole game.` });
    }
    lastTs = s.ts;
    /* session milestones */
    if (SESSION_MILES.includes(si + 1)) {
      proofs.push({ id: 'sess-' + (si + 1), kind: 'mile', ts: s.ts, icon: si === 0 ? '🥋' : '📅', tier: si + 1 >= 50 ? 3 : si + 1 >= 10 ? 2 : 1,
        title: si === 0 ? 'Day one. It counts.' : `Session ${si + 1}`,
        sub: si === 0 ? 'Every black belt logged a first session. This was yours.' : `${si + 1} sessions logged. Most people never see this number.` });
    }
    /* hour milestones */
    mins += s.mins || 0;
    while (hourIdx < HOUR_MILES.length && mins >= HOUR_MILES[hourIdx] * 60) {
      proofs.push({ id: 'hrs-' + HOUR_MILES[hourIdx], kind: 'mile', ts: s.ts, icon: '⏱️', tier: HOUR_MILES[hourIdx] >= 100 ? 3 : 2,
        title: `${HOUR_MILES[hourIdx]} hours on the mat`, sub: 'Time nobody can take back off you.' });
      hourIdx++;
    }
    /* technique proofs */
    for (const t of (s.techs || [])) {
      if (t.res !== 'hit') continue;
      if (!seenFirst[t.id]) {
        seenFirst[t.id] = true;
        proofs.push({ id: 'first-' + t.id, kind: 'first', ts: s.ts, icon: '⚡', tier: 2,
          title: `First ${t.name} in the wild`, sub: `Drilling is practice. This one happened in live rolling.` });
      }
      const beforeN = hitCount[t.id] || 0;
      hitCount[t.id] = beforeN + t.n;
      for (const m of TECH_MILES) if (beforeN < m && hitCount[t.id] >= m) {
        proofs.push({ id: `tm-${t.id}-${m}`, kind: 'mile', ts: s.ts, icon: '🎯', tier: m >= 25 ? 3 : 2,
          title: `${t.name} ×${m}`, sub: `Landed ${m} times in rolling. That's not luck any more — that's your game.` });
      }
      if (t.vs && higher[t.vs] > myBelt && !seenVs[t.id + t.vs]) {
        seenVs[t.id + t.vs] = true;
        proofs.push({ id: `vs-${t.id}-${t.vs}`, kind: 'vs', ts: s.ts, icon: '🗡️', tier: 3,
          title: `${t.name} on a ${t.vs} belt`, sub: `Landed up the food chain. Remember this one.` });
      }
    }
    /* clean sheet */
    const conceded = (s.techs || []).some(t => t.res === 'conceded');
    if ((s.rounds || 0) >= 4 && !conceded && (s.techs || []).length && ['gi', 'nogi', 'open', 'comp'].includes(s.type)) {
      proofs.push({ id: 'clean-' + s.id, kind: 'clean', ts: s.ts, icon: '🧱', tier: 1,
        title: 'Clean sheet', sub: `${s.rounds} rounds, tapped to nobody.` });
    }
  });

  /* trend proofs (trailing windows — computed once, on latest state) */
  const n = state.sessions.length;
  if (n >= 12) {
    const half = Math.floor(n / 2);
    const oldS = state.sessions.slice(Math.max(0, n - 2 * half), n - half);
    const newS = state.sessions.slice(n - half);
    const rate = ss => {
      const c = ss.reduce((a, s) => a + (s.techs || []).filter(t => t.res === 'conceded').reduce((x, t) => x + t.n, 0), 0);
      const r = ss.reduce((a, s) => a + (s.rounds || 0), 0);
      return r ? c / r : 0;
    };
    const o = rate(oldS), w = rate(newS);
    if (o > 0.15 && w < o * 0.65) {
      proofs.push({ id: 'trend-survive-' + n, kind: 'trend', ts: state.sessions[n - 1].ts, icon: '📉', tier: 3,
        title: 'Getting harder to kill', sub: `You're getting tapped ${Math.round((1 - w / Math.max(o, .001)) * 100)}% less per round than earlier in your training. Quiet, massive progress.` });
    }
  }
  return proofs.sort((a, b) => b.ts - a.ts);
}
function unseenProofs() { const seen = new Set(state.seen); return allProofs().filter(p => !seen.has(p.id)); }
function markProofsSeen(ids) { state.seen.push(...ids.filter(id => !state.seen.includes(id))); saveState(); }

/* ── BODY engine ─────────────────────────────────────────── */
function bodyStatus() {
  const now = Date.now();
  const heat = {}, hits = {};
  for (const s of state.sessions) {
    for (const g of (s.niggles || [])) {
      const age = (now - s.ts) / DAY;
      if (age > 28) continue;
      const decay = Math.max(0, 1 - age / 21);
      heat[g.region] = Math.min(1, (heat[g.region] || 0) + (g.sev / 3) * decay);
      if (age <= 21) (hits[g.region] = hits[g.region] || []).push(s.ts);
    }
  }
  const alerts = [];
  for (const [region, list] of Object.entries(hits)) {
    if (list.length >= 3) {
      const r = regionById(region);
      alerts.push({ cls: 'bad', ico: '🚨', html: `<b>${r ? r.name : region} has come up ${list.length} times in 3 weeks.</b> That's a pattern, not bad luck — drop intensity on it before it makes the decision for you.` });
    }
  }
  const last = state.sessions[state.sessions.length - 1];
  if (last && last.warmupPain && (now - last.ts) < 5 * DAY) {
    alerts.push({ cls: 'warn', ico: '⚠️', html: `<b>Pain during warm-up last session.</b> The research is blunt: training through warm-up pain measurably raises injury risk. Next session, start slower — or make it a drilling night.` });
  }
  /* load: this week vs 4-week average */
  const w0 = weekStart(now);
  const units = s => (s.mins / 60) * (s.intensity || 3);
  const cur = state.sessions.filter(s => s.ts >= w0).reduce((a, s) => a + units(s), 0);
  let prev = 0;
  for (let i = 1; i <= 4; i++) prev += state.sessions.filter(s => s.ts >= w0 - i * 7 * DAY && s.ts < w0 - (i - 1) * 7 * DAY).reduce((a, s) => a + units(s), 0);
  const avg = prev / 4;
  const ratio = avg > 0 ? cur / avg : (cur > 0 ? 1 : 0);
  let label = 'In rhythm', cls = 'ok', note = 'Load matches your recent normal. This is where good adaptation happens.';
  if (avg === 0 && cur === 0) { label = 'Resting'; cls = 'ok'; note = 'Nothing logged recently.'; }
  else if (ratio < 0.6) { label = 'Fresh'; cls = 'ok'; note = 'Well under your normal load. Green light to push.'; }
  else if (ratio > 1.5) { label = 'Spiking'; cls = 'bad'; note = `This week is ${ratio.toFixed(1)}× your four-week average — the classic injury window. Earn the big weeks gradually.`; }
  else if (ratio > 1.25) { label = 'Building'; cls = 'warn'; note = 'Load is climbing above your normal. Fine — just sleep like it matters.'; }
  if (cls !== 'ok') alerts.push({ cls, ico: cls === 'bad' ? '📈' : '💤', html: `<b>Training load: ${label.toLowerCase()}.</b> ${note}` });
  return { heat, alerts, load: { cur, avg, ratio, label, cls, note } };
}

/* ── RECALL engine ───────────────────────────────────────── */
const IVL = [1, 3, 7, 21, 60];
function recallDue() {
  const now = Date.now();
  return Object.entries(state.recall)
    .filter(([, r]) => r.due <= now)
    .map(([id, r]) => ({ id, ...r, tech: techById(id) }))
    .filter(x => x.tech)
    .sort((a, b) => a.due - b.due)
    .slice(0, 6);
}
function gradeRecall(id, grade) {
  const r = state.recall[id]; if (!r) return;
  if (grade === 'got') r.stage = Math.min(r.stage + 1, IVL.length - 1);
  else if (grade === 'gone') r.stage = 0;
  r.due = Date.now() + IVL[grade === 'gone' ? 0 : r.stage] * DAY;
  state.reviewLog.push({ ts: Date.now(), id, grade });
  saveState();
}
function techStats(id) {
  let drilled = 0, hit = 0, lastNote = '', lastTs = 0, vsBest = null;
  const order = { white: 1, blue: 2, purple: 3, brown: 4, black: 5 };
  for (const s of state.sessions) for (const t of (s.techs || [])) if (t.id === id) {
    if (t.res === 'hit') hit += t.n; else if (t.res !== 'conceded') drilled += t.n;
    if (s.notes && s.ts > lastTs) { lastNote = s.notes; lastTs = s.ts; }
    if (t.vs && (!vsBest || order[t.vs] > order[vsBest])) vsBest = t.vs;
  }
  return { drilled, hit, lastNote, lastTs, vsBest };
}
function arsenal() {
  const map = {};
  for (const s of state.sessions) for (const t of (s.techs || [])) {
    if (t.res === 'conceded') continue;
    map[t.id] = map[t.id] || { id: t.id, name: t.name, cat: t.cat, drilled: 0, hit: 0, lastTs: 0 };
    if (t.res === 'hit') map[t.id].hit += t.n; else map[t.id].drilled += t.n;
    map[t.id].lastTs = Math.max(map[t.id].lastTs, s.ts);
  }
  return Object.values(map).sort((a, b) => (b.hit * 3 + b.drilled) - (a.hit * 3 + a.drilled));
}

/* ── trophies ────────────────────────────────────────────── */
function trophies() {
  const L = lifetime();
  const p = allProofs();
  const firsts = p.filter(x => x.kind === 'first').length;
  const def = [
    { id: 'day1', icon: '🥋', title: 'Day One', sub: 'Log your first session', need: 1, have: L.sessions },
    { id: 's10', icon: '📅', title: 'Regular', sub: '10 sessions', need: 10, have: L.sessions },
    { id: 's50', icon: '🗓️', title: 'Fixture', sub: '50 sessions', need: 50, have: L.sessions },
    { id: 'h25', icon: '⏱️', title: 'Mat Time', sub: '25 hours logged', need: 25, have: L.mins / 60 },
    { id: 'h100', icon: '⌛', title: 'The Grind', sub: '100 hours logged', need: 100, have: L.mins / 60 },
    { id: 'r100', icon: '🌀', title: 'Round 100', sub: '100 rounds rolled', need: 100, have: L.rounds },
    { id: 'r500', icon: '🌪️', title: 'Washing Machine', sub: '500 rounds rolled', need: 500, have: L.rounds },
    { id: 'a10', icon: '🧰', title: 'Toolbox', sub: '10 techniques in your arsenal', need: 10, have: L.arsenal },
    { id: 'a25', icon: '🗺️', title: 'Cartographer', sub: '25 techniques mapped', need: 25, have: L.arsenal },
    { id: 'f5', icon: '⚡', title: 'Live Rounds', sub: '5 firsts landed in rolling', need: 5, have: firsts },
    { id: 'sub25', icon: '🔒', title: 'Closer', sub: '25 submissions finished', need: 25, have: L.subs },
    { id: 'sub100', icon: '🐍', title: 'Anaconda', sub: '100 submissions finished', need: 100, have: L.subs },
  ];
  return def.map(t => ({ ...t, got: t.have >= t.need, pct: Math.min(100, Math.round(t.have / t.need * 100)) }));
}

/* ── MAT RANK (XP) engine ────────────────────────────────────
   MP is DERIVED — a pure function over sessions/reviews/trophies —
   so it can never drift or be gamed by state edits. Points reward
   showing up, logging honestly and reviewing; never guilt. */
const LEVELS = [
  'Day One', 'Shrimp', 'Mat Rat', 'Grip Fighter', 'Guard Puller', 'Hip Escapist',
  'Pressure Cooker', 'Sweep Merchant', 'Submission Curious', 'Cardio Machine',
  'Half Guard Dweller', 'Lapel Scientist', 'Berimbolo Menace', 'Old School',
  'Tap Collector', 'Position Purist', 'Transition Ghost', 'Squeeze Artist',
  'Mat General', 'Comeback King', 'Iron Lung', 'Quiet Assassin',
  "Professor's Problem", 'Mat Legend',
];
const LVL_AT = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 4900,
  5900, 7000, 8200, 9500, 11000, 12700, 14600, 16700, 19000, 21500, 24200, 27100];

function sessionMP(s) {
  let mp = 50;
  mp += Math.min(10, s.rounds || 0) * 5;
  mp += Math.min(4, Math.floor((s.mins || 0) / 30)) * 10;
  for (const t of (s.techs || [])) {
    if (t.res === 'hit') { mp += Math.min(5, t.n) * 8; if (t.vs) mp += 30; }
  }
  if ((s.niggles || []).length || s.warmupPain) mp += 10; /* honesty bonus */
  if (s.notes && s.notes.length > 20) mp += 10;
  return mp;
}
/* ── the library: 184 moves, ticked off as they're learnt ── */
/* state.learned is additive ({techId: ts}); absent means a fresh install or an old
   backup, both of which should read as "nothing ticked yet", not as an error. */
function learnedMap() { return (state.learned && typeof state.learned === 'object') ? state.learned : {}; }
function isLearned(id) { return !!learnedMap()[id]; }
function learnedCount() { return Object.keys(learnedMap()).length; }

function setLearned(id, on) {
  if (!state.learned || typeof state.learned !== 'object') state.learned = {};
  if (on) {
    if (state.learned[id]) return false;
    state.learned[id] = Date.now();
    /* ticking a move puts it straight into spaced repetition — the library feeds
       the review queue rather than sitting beside it */
    if (!state.recall[id]) {
      const t = techById(id);
      /* Spread a bulk tick-off across days rather than dumping 40 reviews on tomorrow —
         recallDue() shows 6 at a time, so queue in batches of 6. */
      const now = Date.now();
      const pending = Object.values(state.recall).filter(r => r.due > now).length;
      state.recall[id] = { stage: 0, due: now + DAY * (1 + Math.floor(pending / 6)), name: t ? t.name : id };
    }
  } else {
    delete state.learned[id];
  }
  saveState();
  return true;
}

/* Anything logged in a session counts as met, even if never ticked by hand. */
function touchedIds() {
  const s = new Set();
  for (const sess of state.sessions) for (const t of (sess.techs || [])) s.add(t.id);
  return s;
}

/* ── skill-tree node states ──────────────────────────────── */
/* A move is open when its prerequisite is done (or it's a root); everything deeper
   stays locked. That's the whole pull of the map — one tick lights up the next. */
function nodeState(id) {
  if (isLearned(id)) return 'learnt';
  const p = preOf(id);
  return (p === null || isLearned(p)) ? 'open' : 'locked';
}
function treeStats() {
  const real = TECHS.filter(t => !TECH_GENERIC.has(t.id));
  let learnt = 0, open = 0;
  const openIds = [];
  for (const t of real) {
    const s = nodeState(t.id);
    if (s === 'learnt') learnt++;
    else if (s === 'open') { open++; openIds.push(t.id); }
  }
  return { total: real.length, learnt, open, openIds,
           pct: Math.round(learnt / real.length * 100) };
}
/* How much of the map a single tick would light up — used to sell the next node. */
function unlocksBy(id) { return childrenOf(id).length; }

function libStats() {
  const touched = touchedIds(), lm = learnedMap();
  const cats = LIB_ORDER.map(cat => {
    const all = TECHS.filter(t => t.cat === cat && !TECH_GENERIC.has(t.id));
    const done = all.filter(t => lm[t.id]).length;
    return { cat, name: TECH_CATS[cat].pl, ico: TECH_CATS[cat].ico,
             total: all.length, done, pct: all.length ? Math.round(done / all.length * 100) : 0 };
  });
  const total = TECHS.filter(t => !TECH_GENERIC.has(t.id)).length;
  const done = cats.reduce((n, c) => n + c.done, 0);
  return { cats, total, done, pct: Math.round(done / total * 100),
           untickedButTouched: [...touched].filter(id => !lm[id] && techById(id)).length };
}

/* The "next one" engine: unticked moves closest to the user's current depth, with
   anything they've already hit in a session pushed to the front — that's the easiest
   tick available and the one that feels most earned. */
function nextUp(n = 3) {
  const lm = learnedMap(), touched = touchedIds();
  /* aim one notch above the deepest band they've mostly cleared */
  let band = 1;
  for (let l = 1; l <= 5; l++) {
    const all = TECHS.filter(t => techLevel(t.id) === l);
    const got = all.filter(t => lm[t.id]).length;
    if (got >= all.length * 0.6) band = Math.min(5, l + 1); else { band = l; break; }
  }
  return TECHS
    .filter(t => !lm[t.id] && !TECH_GENERIC.has(t.id) && nodeState(t.id) === 'open')
    .map(t => {
      const lvl = techLevel(t.id);
      let score = Math.abs(lvl - band) * 10;      /* closest to their band first */
      if (touched.has(t.id)) score -= 25;          /* already hit it on the mat */
      if (lvl < band) score -= 3;                  /* prefer filling gaps below */
      score -= Math.min(unlocksBy(t.id), 5) * 2;   /* nodes that open more of the map */
      return { ...t, lvl, touched: touched.has(t.id), unlocks: unlocksBy(t.id), score };
    })
    .sort((a, b) => a.score - b.score || a.lvl - b.lvl || a.name.localeCompare(b.name))
    .slice(0, n);
}

function totalMP() {
  let mp = 0;
  for (const s of state.sessions) mp += sessionMP(s);
  mp += learnedCount() * 20;   /* every move ticked off the library is worth MP */
  /* firsts pay extra (from proof feed so it matches what user saw) */
  for (const p of allProofs()) mp += p.kind === 'first' ? 40 : p.kind === 'vs' ? 0 : p.kind === 'mile' ? 25 : p.kind === 'trend' ? 60 : 15;
  for (const r of state.reviewLog) mp += r.grade === 'got' ? 15 : r.grade === 'fuzzy' ? 8 : 5;
  for (const q of completedQuests()) mp += q.mp;
  return mp;
}
function rankOf(mp) {
  let lvl = 1;
  for (let i = 0; i < LVL_AT.length; i++) if (mp >= LVL_AT[i]) lvl = i + 1;
  const over = lvl - LEVELS.length;
  const name = over > 0 ? `Mat Legend ${['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][Math.min(over - 1, 8)]}` : LEVELS[lvl - 1];
  const floor = lvl <= LVL_AT.length ? LVL_AT[lvl - 1] : LVL_AT[LVL_AT.length - 1] + (lvl - LVL_AT.length) * 3000;
  const next = lvl < LVL_AT.length ? LVL_AT[lvl] : floor + 3000;
  return { lvl, name, mp, floor, next, pct: Math.min(100, Math.round((mp - floor) / (next - floor) * 100)) };
}
function matRank() { return rankOf(totalMP()); }

/* ── weekly quests ───────────────────────────────────────── */
function weekKey(ts = Date.now()) { return weekStart(ts); }
function questsFor() {
  const w0 = weekKey();
  const target = (state.profile && state.profile.weeklyTarget) || 3;
  const wkSessions = state.sessions.filter(s => s.ts >= w0);
  const wkReviews = state.reviewLog.filter(r => r.ts >= w0);
  const focus = state.focus ? techById(state.focus) : null;
  const focusHits = focus ? wkSessions.reduce((a, s) => a + (s.techs || []).filter(t => t.id === focus.id && t.res === 'hit').reduce((x, t) => x + t.n, 0), 0) : 0;
  const anyHits = wkSessions.reduce((a, s) => a + (s.techs || []).filter(t => t.res === 'hit').reduce((x, t) => x + t.n, 0), 0);
  const noted = wkSessions.filter(s => s.notes && s.notes.length > 20).length;
  const q = [
    { id: 'show', ico: '🥋', name: `Show up ×${target}`, sub: 'The only quest that really matters', have: wkSessions.length, need: target, mp: 100 },
    focus
      ? { id: 'focus', ico: '🗡️', name: `Sharpen the ${focus.name}`, sub: 'Land your focus weapon twice', have: Math.min(focusHits, 2), need: 2, mp: 120 }
      : { id: 'land3', ico: '🎯', name: 'Land 3 techniques', sub: 'Anything, on anyone, cleanly', have: Math.min(anyHits, 3), need: 3, mp: 120 },
    { id: 'recall2', ico: '🧠', name: '2 recall check-ins', sub: 'Sixty seconds against forgetting', have: Math.min(wkReviews.length, 2), need: 2, mp: 80 },
    { id: 'scribe', ico: '✍️', name: 'Tell the story twice', sub: 'Two sessions logged with real notes', have: Math.min(noted, 2), need: 2, mp: 60 },
  ];
  return q.map(x => ({ ...x, done: x.have >= x.need, pct: Math.min(100, Math.round(x.have / x.need * 100)) }));
}
/* completed quests across history (approx: evaluate per past week) */
function completedQuests() {
  const out = [];
  if (!state.sessions.length) return out;
  const first = weekKey(state.sessions[0].ts);
  const target = (state.profile && state.profile.weeklyTarget) || 3;
  for (let w = first; w <= weekKey(); w += 7 * DAY) {
    const ss = state.sessions.filter(s => s.ts >= w && s.ts < w + 7 * DAY);
    if (ss.length >= target) out.push({ id: 'show-' + w, mp: 100 });
    const hits = ss.reduce((a, s) => a + (s.techs || []).filter(t => t.res === 'hit').reduce((x, t) => x + t.n, 0), 0);
    if (hits >= 3) out.push({ id: 'land-' + w, mp: 120 });
    const rv = state.reviewLog.filter(r => r.ts >= w && r.ts < w + 7 * DAY).length;
    if (rv >= 2) out.push({ id: 'recall-' + w, mp: 80 });
    const noted = ss.filter(s => s.notes && s.notes.length > 20).length;
    if (noted >= 2) out.push({ id: 'scribe-' + w, mp: 60 });
  }
  return out;
}

/* ── week streak (consecutive weeks at target) ───────────── */
function weekStreak() {
  const target = (state.profile && state.profile.weeklyTarget) || 3;
  let streak = 0, w = weekKey();
  const count = w0 => state.sessions.filter(s => s.ts >= w0 && s.ts < w0 + 7 * DAY).length;
  const curMet = count(w) >= target;
  if (curMet) { streak = 1; }
  w -= 7 * DAY;
  while (count(w) >= target) { streak++; w -= 7 * DAY; }
  return { streak, curMet, cur: count(weekKey()), target };
}

/* ── insights ("coach's eye") ────────────────────────────── */
function insights() {
  const out = [];
  const ss = state.sessions;
  if (ss.length < 8) return out;
  /* nemesis: what catches you most */
  const con = {};
  ss.slice(-14).forEach(s => (s.techs || []).filter(t => t.res === 'conceded').forEach(t => con[t.name] = (con[t.name] || 0) + t.n));
  const conTotal = Object.values(con).reduce((a, b) => a + b, 0);
  const nem = Object.entries(con).sort((a, b) => b[1] - a[1])[0];
  if (nem && nem[1] >= 4 && nem[1] / conTotal >= 0.3) {
    out.push({ id: 'nemesis', ico: '🐍', title: `${nem[0]} is your nemesis`, sub: `It accounts for ${Math.round(nem[1] / conTotal * 100)}% of what's catching you lately. One dedicated defensive block changes your whole month — ask your coach for the escape.` });
  }
  /* gi vs no-gi hit rate */
  const rate = type => { const g = ss.filter(s => s.type === type); if (g.length < 5) return null; return g.reduce((a, s) => a + (s.techs || []).filter(t => t.res === 'hit').reduce((x, t) => x + t.n, 0), 0) / g.length; };
  const gi = rate('gi'), ng = rate('nogi');
  if (gi != null && ng != null && Math.max(gi, ng) >= Math.min(gi, ng) * 1.6 && Math.max(gi, ng) >= 1) {
    const better = gi > ng ? 'gi' : 'no-gi';
    out.push({ id: 'split', ico: '⚖️', title: `You're ${Math.round(Math.max(gi, ng) / Math.max(0.1, Math.min(gi, ng)) * 10) / 10}× more dangerous in ${better}`, sub: `${better === 'gi' ? 'Grips are doing work for you — steal that control game into no-gi with collar ties and wrist rides.' : 'Speed suits you — in gi, slow it down and borrow your no-gi pace on top.'}` });
  }
  /* body pattern by session type */
  const byType = {};
  ss.slice(-20).forEach(s => (s.niggles || []).forEach(g => { const k = s.type + '|' + g.region.replace(/-[lr]$/, ''); byType[k] = (byType[k] || 0) + 1; }));
  const bt = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
  if (bt && bt[1] >= 3) {
    const [type, region] = bt[0].split('|');
    const tn = (SESSION_TYPES.find(x => x.id === type) || {}).name || type;
    out.push({ id: 'bodytype', ico: '🩹', title: `${region.charAt(0).toUpperCase() + region.slice(1)} flags cluster after ${tn}`, sub: `${bt[1]} times in your last 20 sessions. Worth a longer warm-up on ${tn} nights — or telling your coach which position is doing it.` });
  }
  /* golden day */
  const byDay = {};
  ss.forEach(s => { const d = new Date(s.ts).getDay(); (byDay[d] = byDay[d] || []).push(s.feel || 3); });
  const days = Object.entries(byDay).filter(([, v]) => v.length >= 4).map(([d, v]) => [d, v.reduce((a, b) => a + b, 0) / v.length]);
  if (days.length >= 2) {
    days.sort((a, b) => b[1] - a[1]);
    if (days[0][1] - days[days.length - 1][1] >= 0.8) {
      const nm = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][days[0][0]];
      out.push({ id: 'goldday', ico: '☀️', title: `${nm}s are your golden sessions`, sub: `Your best-feeling rolls keep landing on ${nm}s. Protect that slot — and notice what you do differently before it.` });
    }
  }
  return out.slice(0, 3);
}

/* ── then vs now ─────────────────────────────────────────── */
function thenVsNow() {
  const now = Date.now(), W6 = 42 * DAY;
  const cur = state.sessions.filter(s => s.ts >= now - W6);
  const old = state.sessions.filter(s => s.ts >= now - 2 * W6 && s.ts < now - W6);
  if (cur.length < 6 || old.length < 6) return null;
  const stat = ss => {
    const rounds = ss.reduce((a, s) => a + (s.rounds || 0), 0);
    const taps = ss.reduce((a, s) => a + (s.techs || []).filter(t => t.res === 'conceded').reduce((x, t) => x + t.n, 0), 0);
    const hits = ss.reduce((a, s) => a + (s.techs || []).filter(t => t.res === 'hit').reduce((x, t) => x + t.n, 0), 0);
    return { perWk: (ss.length / 6).toFixed(1), hours: fmtHours(ss.reduce((a, s) => a + s.mins, 0)), tapRate: rounds ? (taps / rounds) : 0, hitsPer: (hits / ss.length).toFixed(1) };
  };
  return { old: stat(old), cur: stat(cur) };
}

/* ── weekly hours series (for chart) ─────────────────────── */
function weeklySeries(n = 12) {
  const out = [];
  const w0 = weekKey();
  for (let i = n - 1; i >= 0; i--) {
    const a = w0 - i * 7 * DAY;
    const mins = state.sessions.filter(s => s.ts >= a && s.ts < a + 7 * DAY).reduce((x, s) => x + s.mins, 0);
    out.push({ w: a, h: mins / 60 });
  }
  return out;
}

/* ── demo seed (deterministic) ───────────────────────────── */
function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function seedDemo() {
  snapshot();                        /* demo data replaces the record — keep an undo point */
  const rnd = mulberry(42);
  const pick = a => a[Math.floor(rnd() * a.length)];
  const now = Date.now();
  const start = now - 160 * DAY;
  state.sessions = [];
  state.recall = {}; state.seen = [];
  const learnPool = ['closed-guard', 'shrimp-escape', 'bridge-roll', 'scissor-sweep', 'cross-collar', 'armbar', 'triangle', 'knee-cut', 'half-guard', 'kimura', 'guillotine', 'hip-bump', 'back-control', 'rnc', 'americana', 'torreando', 'single-leg', 'butterfly-sweep', 'darce', 'mount-escape', 'side-escape', 'arm-triangle', 'dlr', 'leg-drag', 'ankle-lock', 'bow-arrow', 'osoto-gari', 'x-guard'];
  let skill = 0.12, t = start, learned = 0;
  const notesBank = {
    good: ['Felt smooth tonight, hips finally doing what I tell them.', 'Good session. Flowing more, forcing less.', 'Best rolls in weeks.'],
    bad: ['Got worked. Everyone had my number tonight.', 'Rough one — gassed early and paid for it.', 'Humbled by the small purple belt again.'],
    mid: ['Solid session, nothing fancy.', 'Decent night. Drilling clicked, rolling scrappy.', 'Showed up, did the work.'],
  };
  while (t < now - DAY) {
    /* 2–4 sessions a week, with one 24-day comeback gap mid-arc */
    t += (rnd() < 0.55 ? 2 : rnd() < 0.5 ? 3 : 1) * DAY + Math.floor(rnd() * 10) * 3600000;
    if (state.sessions.length === 26) t += 24 * DAY;
    if (t >= now) break;
    const type = rnd() < 0.62 ? (rnd() < 0.55 ? 'gi' : 'nogi') : pick(['open', 'drill', 'gi', 'nogi']);
    const mins = type === 'open' ? 90 : pick([60, 60, 75, 90]);
    const rounds = type === 'drill' ? 2 : 4 + Math.floor(rnd() * 4);
    const intensity = type === 'drill' ? 2 : Math.min(5, 2 + Math.floor(rnd() * 3) + (rnd() < 0.18 ? 1 : 0));
    const techs = [];
    if (learned < learnPool.length && rnd() < 0.75) {
      const id = learnPool[learned++];
      const tx = techById(id);
      techs.push({ id, name: tx.name, cat: tx.cat, res: 'drilled', n: 1, vs: null });
    }
    const known = learnPool.slice(0, Math.max(2, learned));
    const nHit = rnd() < skill ? 1 + Math.floor(rnd() * (skill > .5 ? 3 : 2)) : (rnd() < skill + .25 ? 1 : 0);
    for (let i = 0; i < nHit; i++) {
      const id = pick(known); const tx = techById(id);
      if (techs.some(x => x.id === id && x.res === 'hit')) { techs.find(x => x.id === id && x.res === 'hit').n++; continue; }
      const vs = rnd() < 0.14 + skill * 0.2 ? pick(['white', 'white', 'blue', 'blue', 'purple']) : null;
      techs.push({ id, name: tx.name, cat: tx.cat, res: 'hit', n: 1, vs });
    }
    const nCon = rnd() < (0.9 - skill) ? 1 + Math.floor(rnd() * 2) : (rnd() < 0.4 ? 1 : 0);
    for (let i = 0; i < nCon; i++) {
      const id = pick(['armbar', 'triangle', 'rnc', 'guillotine', 'kimura', 'ankle-lock', 'bow-arrow']);
      const tx = techById(id);
      if (!techs.some(x => x.id === id)) techs.push({ id, name: tx.name, cat: tx.cat, res: 'conceded', n: 1, vs: null });
    }
    const niggles = [];
    const age = (now - t) / DAY;
    if (age < 22 && rnd() < 0.8) niggles.push({ region: 'knee-l', sev: rnd() < 0.4 ? 2 : 1 });      /* recent left-knee cluster */
    if (age > 60 && age < 90 && rnd() < 0.3) niggles.push({ region: 'ribs', sev: 2 });
    if (rnd() < 0.12) niggles.push({ region: pick(['hand-r', 'hand-l', 'neck', 'shoulder-r']), sev: 1 });
    const feel = nHit > nCon ? (rnd() < 0.5 ? 4 : 5) : nCon > nHit + 1 ? 2 : 3;
    state.sessions.push({
      id: uid(), ts: t, type, mins, rounds, intensity, feel, demo: 1,
      warmupPain: age < 8 && rnd() < 0.5,
      notes: pick(feel >= 4 ? notesBank.good : feel <= 2 ? notesBank.bad : notesBank.mid),
      techs, niggles,
    });
    skill = Math.min(0.75, skill + 0.012);
  }
  /* recall queue seeded from arsenal, a few due now */
  arsenal().slice(0, 12).forEach((a, i) => {
    state.recall[a.id] = { stage: Math.min(2, 1 + (i % 2)), due: now - (i < 3 ? 2 * DAY : -((i + 1) * 2 * DAY)), name: a.name };
  });
  /* review history so quests/MP have texture */
  state.reviewLog = [];
  for (let i = 0; i < 30; i++) {
    state.reviewLog.push({ ts: now - Math.floor(rnd() * 100) * DAY, id: pick(learnPool.slice(0, 12)), grade: rnd() < 0.6 ? 'got' : rnd() < 0.5 ? 'fuzzy' : 'gone' });
  }
  state.focus = 'knee-cut';
  state.seen = allProofs().slice(3).map(p => p.id); /* leave 3 fresh proofs to celebrate */
  state.lastLevel = Math.max(1, matRank().lvl - 1); /* one tasteful level-up on entry */
  state.demo = true;
  saveState(true);
}
function resetAll() {
  snapshot();                        /* erasing is the one thing people most want back */
  const prof = state.profile;
  state = Object.assign(defaults(), { profile: prof });
  return saveState(true);
}
/* Drop only the seeded sessions. Anything the user logged on top of the demo stays —
   the demo flag is sticky, so "start fresh" must not read as "erase your real work". */
function realSessions() { return state.sessions.filter(s => !s.demo); }
function clearDemoOnly() {
  snapshot();
  const kept = realSessions();
  state = Object.assign(defaults(), { profile: state.profile, sessions: kept });
  return saveState(true);
}

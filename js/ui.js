/* ══════════════════════════════════════════════════════════
   ui.js — every screen. v2: Mat Rank, quests, recap story,
   level-ups, insights, shadow drills, charts. app.js owns
   routing, voice and boot.
   ══════════════════════════════════════════════════════════ */

const $ = s => document.querySelector(s);
const view = () => $('#view');
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── belt theming ────────────────────────────────────────── */
function applyBelt(belt) {
  document.documentElement.dataset.belt = belt;
  const chip = $('#beltChip');
  if (chip && state.profile) {
    const st = state.profile.stripes ? ` · ${state.profile.stripes}` : '';
    chip.innerHTML = `<i></i>${BELTS[belt].name}${st}`;
  }
}

/* ── toast / burst / count-up ────────────────────────────── */
function toast(msg, ms) {
  const w = $('#toasts'); const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg; w.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, ms || 2400);
  while (w.children.length > 3) w.firstChild.remove();
}
function burst(x, y, n = 18) {
  if (reduceMotion()) return;
  const acc = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim();
  const cols = [acc, '#f2f3f5', acc, '#9aa3b2'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.className = 'pt'; p.style.cssText = `left:${x}px;top:${y}px;background:${cols[i % 4]}`;
    document.body.appendChild(p);
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5, v = 60 + Math.random() * 110;
    p.animate([
      { transform: 'translate(0,0) rotate(0)', opacity: 1 },
      { transform: `translate(${Math.cos(a) * v}px,${Math.sin(a) * v - 50}px) rotate(${Math.random() * 320 - 160}deg)`, opacity: 0 },
    ], { duration: 750 + Math.random() * 450, easing: 'cubic-bezier(.16,.8,.4,1)' }).onfinish = () => p.remove();
  }
}
function countUp(el, to, { dur = 900, dec = 0, suffix = '' } = {}) {
  if (!el) return;
  if (reduceMotion()) { el.textContent = to.toFixed(dec) + suffix; return; }
  const t0 = performance.now();
  const tick = t => {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = (to * e).toFixed(dec) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ── sheet manager ───────────────────────────────────────── */
let sheetCloseCb = null;
function openSheet(html, onClose) {
  sheetCloseCb = onClose || null;
  $('#sheetBody').innerHTML = html;
  $('#sheet').hidden = false; $('#scrim').hidden = false;
  requestAnimationFrame(() => { $('#sheet').classList.add('on'); $('#scrim').classList.add('on'); });
  document.body.style.overflow = 'hidden';
}
function closeSheet() {
  $('#sheet').classList.remove('on'); $('#scrim').classList.remove('on');
  document.body.style.overflow = '';
  setTimeout(() => { $('#sheet').hidden = true; $('#scrim').hidden = true; $('#sheetBody').innerHTML = ''; }, 420);
  if (sheetCloseCb) { const f = sheetCloseCb; sheetCloseCb = null; f(); }
}

/* ── mega overlay (level-up / shadow drill) ──────────────── */
function openMega(html) {
  const m = $('#mega');
  m.innerHTML = `<div class="mega-in">${html}</div>`;
  m.hidden = false;
  requestAnimationFrame(() => m.classList.add('on'));
}
function closeMega() {
  const m = $('#mega');
  m.classList.remove('on');
  setTimeout(() => { m.hidden = true; m.innerHTML = ''; }, 400);
}
function checkLevelUp() {
  const r = matRank();
  if (r.lvl <= (state.lastLevel || 1)) return false;
  state.lastLevel = r.lvl; saveState();
  openMega(`
    <div class="m-kick">Mat rank up</div>
    <div class="m-badge">${r.lvl}</div>
    <h2>${esc(r.name)}</h2>
    <p>${r.mp.toLocaleString()} Mat Points. Earned the slow way — on the mat, in the log, one honest session at a time.</p>
    <button class="btn" id="megaShare">Share it</button>
    <button class="btn ghost" id="megaOk" style="margin-top:10px">Carry on</button>`);
  setTimeout(() => burst(innerWidth / 2, innerHeight / 2 - 120, 26), 350);
  $('#megaOk').addEventListener('click', closeMega);
  $('#megaShare').addEventListener('click', () => shareRankCard(r));
  return true;
}

/* ── body SVG ────────────────────────────────────────────── */
function bodySVG(heat = {}, interactive = false, sel = {}) {
  const cls = id => {
    const h = interactive ? (sel[id] || 0) : Math.ceil((heat[id] || 0) * 3);
    let c = 'bs';
    if (interactive) { c += ' pick'; if (sel[id]) c += ' on'; }
    else if (h >= 3) c += ' h3'; else if (h === 2) c += ' h2'; else if (h === 1) c += ' h1';
    return c;
  };
  const R = (id, shape) => shape.replace('/>', ` class="${cls(id)}" data-region="${id}"/>`);
  return `<svg class="bodysvg" viewBox="0 0 200 336" xmlns="http://www.w3.org/2000/svg">
    <path d="M64 60 Q56 80 54 102 L46 132" class="bs" style="fill:none;stroke:var(--line-2);stroke-width:13;stroke-linecap:round" opacity=".55"/>
    <path d="M136 60 Q144 80 146 102 L154 132" class="bs" style="fill:none;stroke:var(--line-2);stroke-width:13;stroke-linecap:round" opacity=".55"/>
    <path d="M84 158 L84 296 M116 158 L116 296" style="fill:none;stroke:var(--line-2);stroke-width:17;stroke-linecap:round" opacity=".55"/>
    ${R('head', `<circle cx="100" cy="26" r="17"/>`)}
    ${R('neck', `<rect x="91" y="44" width="18" height="13" rx="6"/>`)}
    <path d="M68 58 Q100 50 132 58 L136 118 Q136 152 100 154 Q64 152 64 118 Z" class="bs" opacity=".9"/>
    ${R('shoulder-l', `<circle cx="61" cy="66" r="11.5"/>`)}
    ${R('shoulder-r', `<circle cx="139" cy="66" r="11.5"/>`)}
    ${R('ribs', `<rect x="74" y="76" width="52" height="27" rx="9"/>`)}
    ${R('back', `<rect x="74" y="122" width="52" height="20" rx="8"/>`)}
    ${R('elbow-l', `<circle cx="52" cy="104" r="9.5"/>`)}
    ${R('elbow-r', `<circle cx="148" cy="104" r="9.5"/>`)}
    ${R('hand-l', `<circle cx="45" cy="138" r="9.5"/>`)}
    ${R('hand-r', `<circle cx="155" cy="138" r="9.5"/>`)}
    ${R('hip-l', `<circle cx="82" cy="160" r="10.5"/>`)}
    ${R('hip-r', `<circle cx="118" cy="160" r="10.5"/>`)}
    ${R('knee-l', `<circle cx="84" cy="226" r="10.5"/>`)}
    ${R('knee-r', `<circle cx="116" cy="226" r="10.5"/>`)}
    ${R('ankle-l', `<circle cx="84" cy="302" r="9.5"/>`)}
    ${R('ankle-r', `<circle cx="116" cy="302" r="9.5"/>`)}
    <text x="30" y="332" style="fill:var(--tx-3);font:600 9px var(--f-mono)">L</text>
    <text x="164" y="332" style="fill:var(--tx-3);font:600 9px var(--f-mono)">R</text>
  </svg>`;
}

/* ── shared proof card ───────────────────────────────────── */
function proofCard(p, isNew = false) {
  return `<div class="proof ${isNew ? 'new' : ''}" data-proof="${esc(p.id)}">
    <div class="proof-in">
      <div class="proof-ico">${p.icon}</div>
      <div class="proof-tx"><b>${esc(p.title)}</b><span>${esc(p.sub)}</span></div>
      <button class="proof-share" data-share-proof="${esc(p.id)}" aria-label="Share this proof">
        <svg viewBox="0 0 24 24"><path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 13v6h14v-6"/></svg>
      </button>
    </div>
  </div>`;
}
function bindProofShares(root) {
  root.querySelectorAll('[data-share-proof]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const p = allProofs().find(x => x.id === b.dataset.shareProof);
    if (p) shareProofCard(p);
  }));
}
function questRow(q) {
  return `<div class="quest ${q.done ? 'done' : ''}">
    <div class="q-ico">${q.ico}</div>
    <div class="q-tx"><b>${esc(q.name)}</b><span>${esc(q.sub)}</span>
      ${q.done ? '' : `<div class="q-bar"><i style="width:${q.pct}%"></i></div>`}</div>
    <span class="q-mp">${q.done ? '✓ ' : ''}${q.mp} MP</span>
  </div>`;
}

/* ── HOME ("Mat") ────────────────────────────────────────── */
function homeHeadline(fresh, streakN, alerts) {
  if (!state.sessions.length) return 'Let’s start the record.';
  if (fresh.length) return 'Receipts came in.';
  if (streakN >= 2) return `Week ${streakN} of the chain.`;
  if (alerts.some(a => a.cls === 'bad')) return 'Big engine. Check the oil.';
  const lines = ['The mat remembers.', 'Show up. Write it down.', 'Slow is smooth.', 'Stack the bricks.'];
  return lines[Math.floor(Date.now() / DAY) % lines.length];
}
function renderHome() {
  const L = lifetime(), W = weekStats(), due = recallDue(), body = bodyStatus();
  const fresh = unseenProofs();
  const rank = matRank();
  const chain = weekStreak();
  const quests = questsFor();
  const qDone = quests.filter(q => q.done).length;
  const focus = state.focus ? techById(state.focus) : null;
  const last = state.sessions[state.sessions.length - 1];
  const ss = [...state.sessions].reverse().slice(0, 3);
  const name = state.profile.name ? state.profile.name.split(' ')[0] : 'mate';
  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
  const pct = Math.min(1, W.sessions / W.target);
  const circ = 2 * Math.PI * 32;
  const flames = Math.min(6, Math.max(chain.streak, 1));

  view().innerHTML = `
    <div class="aurora">
      <div class="kicker" style="margin:8px 0 2px">${greet}, ${esc(name)}</div>
      <h1 style="font-size:29px;margin-bottom:16px">${homeHeadline(fresh, chain.streak, body.alerts)}</h1>
    </div>

    ${fresh.length ? `<div class="kicker">New proof unlocked</div>${fresh.slice(0, 3).map(p => proofCard(p, true)).join('')}` : ''}

    <div class="card enter">
      <div class="rank">
        <div class="rank-badge">${rank.lvl}</div>
        <div class="rank-tx">
          <b>${esc(rank.name)}</b>
          <span>LVL ${rank.lvl} · <span class="rank-mp"><span id="mpNum">0</span> MP</span><em>${(rank.next - rank.mp).toLocaleString()} to next</em></span>
          <div class="xp"><i id="xpBar"></i></div>
        </div>
      </div>
    </div>

    <div class="card enter">
      <div class="week-row">
        <div class="ring">
          <svg viewBox="0 0 74 74">
            <circle class="bg" cx="37" cy="37" r="32"/>
            <circle class="fg" cx="37" cy="37" r="32" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - pct)}"/>
          </svg>
          <b>${W.sessions}/${W.target}</b>
        </div>
        <div class="week-copy" style="flex:1">
          <b>${W.sessions >= W.target ? 'Week made. Everything else is bonus.' : W.sessions ? `${W.target - W.sessions} more and the week is yours.` : 'Fresh week. First one sets the tone.'}</b>
          <span>${W.sessions ? `${fmtDur(W.mins)} on the mat this week` : `Target: ${W.target} sessions`}</span>
          <div class="chain">
            ${Array.from({ length: flames }, (_, i) => `<span class="chain-fl ${i < chain.streak ? 'on' : ''}">🔥</span>`).join('')}
            <span class="chain-tx">${chain.streak >= 2 ? `<b>${chain.streak}-week chain.</b> Don't hand it back.` : chain.streak === 1 ? '<b>Chain started.</b> Back it up next week.' : 'Hit target to light the first flame.'}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card enter">
      <div class="card-hd"><h3>This week's quests</h3><span class="tiny">${qDone}/${quests.length}</span></div>
      ${quests.map(questRow).join('')}
    </div>

    ${(due.length || focus || last) ? `<div class="card enter" id="gamePlan">
      <div class="card-hd"><h3>🎯 Game plan</h3>${focus ? `<span class="tiny">FOCUS SET</span>` : `<span class="tiny" id="setFocusHint">PICK A FOCUS →</span>`}</div>
      ${focus ? `<div class="focusrow"><span class="focus-chip"><i>🗡️</i>${esc(focus.name)}</span><span class="tiny">this week's weapon — hunt it early, before you're tired</span></div>` : ''}
      ${due.length ? `<p class="muted" style="font-size:13px">🧠 ${due.length} recall check-in${due.length > 1 ? 's' : ''} waiting — do them on the drive over (not literally).</p>` : ''}
      ${last && last.notes ? `<div class="plan-note">Last time: “${esc(last.notes.length > 110 ? last.notes.slice(0, 110) + '…' : last.notes)}”</div>` : ''}
    </div>` : ''}

    <div class="statgrid" style="margin-bottom:14px">
      <div class="stat"><b><span id="stHrs">0</span><em>h</em></b><span>Mat time</span></div>
      <div class="stat"><b id="stRnd">0</b><span>Rounds</span></div>
      <div class="stat"><b id="stArs">0</b><span>Arsenal</span></div>
    </div>

    ${body.alerts.length ? `<div class="card enter" id="homeBody" role="button" tabindex="0" style="padding-bottom:8px">
      <div class="card-hd"><h3>Body check</h3><span class="tiny">BODY →</span></div>
      ${body.alerts.slice(0, 1).map(a => `<div class="alert ${a.cls}"><span class="a-ico">${a.ico}</span><div>${a.html}</div></div>`).join('')}
    </div>` : ''}

    <div class="card enter">
      <div class="card-hd"><h3>Recent sessions</h3></div>
      ${ss.length ? ss.map(s => {
        const st = SESSION_TYPES.find(x => x.id === s.type) || SESSION_TYPES[0];
        const hits = (s.techs || []).filter(t => t.res === 'hit').reduce((a, t) => a + t.n, 0);
        return `<div class="tech-row" data-sess="${s.id}" role="button" tabindex="0">
          <div class="tech-cat">${st.ico}</div>
          <div class="tech-nm"><b>${st.name} · ${fmtDur(s.mins)}</b><span>${relDate(s.ts)}${s.rounds ? ` · ${s.rounds} rounds` : ''}${hits ? ` · ${hits} landed` : ''}</span></div>
          <div class="tech-n"><b>+${sessionMP(s)}</b><span>MP</span></div>
        </div>`;
      }).join('') : `<div class="empty"><div class="e-ico">🥋</div><h3>No sessions yet</h3><p>Hit LOG after training — 30 seconds, talk or type.</p></div>`}
    </div>`;

  /* animate numbers */
  countUp($('#mpNum'), rank.mp, { dur: 1100 });
  countUp($('#stHrs'), parseFloat(L.hours), { dec: L.mins >= 5970 ? 0 : 1 });
  countUp($('#stRnd'), L.rounds);
  countUp($('#stArs'), L.arsenal);
  setTimeout(() => { const x = $('#xpBar'); if (x) x.style.width = rank.pct + '%'; }, 80);

  bindProofShares(view());
  if (fresh.length) {
    markProofsSeen(fresh.map(p => p.id));
    setTimeout(() => { const el = view().querySelector('.proof'); if (el) { const r = el.getBoundingClientRect(); burst(r.left + 40, r.top + 30); } }, 500);
  }
  const hb = $('#homeBody'); if (hb) hb.addEventListener('click', () => switchTab('body'));
  const sf = $('#setFocusHint'); if (sf) sf.addEventListener('click', () => switchTab('recall'));
  const gp = $('#gamePlan'); if (gp && due.length) gp.addEventListener('click', e => { if (!e.target.closest('.focus-chip')) switchTab('recall'); });
  view().querySelectorAll('[data-sess]').forEach(el => el.addEventListener('click', () => openSessionSheet(el.dataset.sess)));
  checkLevelUp();
}

/* session detail sheet */
function openSessionSheet(id) {
  const s = state.sessions.find(x => x.id === id); if (!s) return;
  const st = SESSION_TYPES.find(x => x.id === s.type) || SESSION_TYPES[0];
  const grp = r => (s.techs || []).filter(t => t.res === r);
  const line = (label, list, cls) => list.length ? `<div class="lbl">${label}</div><div class="chips">${list.map(t =>
    `<span class="chip ${cls}"><span class="c-ico">${TECH_CATS[t.cat].ico}</span>${esc(t.name)}${t.n > 1 ? `<span class="c-n">×${t.n}</span>` : ''}${t.vs ? `<span class="c-n">vs ${t.vs}</span>` : ''}</span>`).join('')}</div>` : '';
  openSheet(`
    <h2>${st.ico} ${st.name} — ${fmtDate(s.ts)}</h2>
    <p class="sub">${fmtDur(s.mins)} · ${s.rounds || 0} rounds · intensity ${s.intensity || 3}/5 · +${sessionMP(s)} MP</p>
    ${line('Landed', grp('hit'), 'hit')}
    ${line('Drilled / learned', [...grp('drilled'), ...grp('learned')], '')}
    ${line('Caught by', grp('conceded'), 'conceded')}
    ${(s.rolls || []).length ? `<div class="lbl">Rounds</div>${rollsInSession(s).map(r => { const p = partnerById(r.pid); return p ? `
      <button class="roll-line" data-partner="${r.pid}"><i class="belt-dot b-${p.belt}"></i><b>${esc(p.name)}</b>
        <span class="roll-tally"><em class="o-won">${r.won}</em><em class="o-even">${r.even}</em><em class="o-lost">${r.lost}</em></span></button>` : ''; }).join('')}` : ''}
    ${(s.niggles || []).length ? `<div class="lbl">Body flags</div><div class="chips">${s.niggles.map(g => { const r = regionById(g.region); return `<span class="chip niggle">${r ? r.name : g.region} · ${['', 'mild', 'sore', 'bad'][g.sev]}</span>`; }).join('')}</div>` : ''}
    ${s.notes ? `<div class="lbl">Notes</div><p style="font-size:14.5px;line-height:1.6;color:var(--tx-2)">${esc(s.notes)}</p>` : ''}
    <div class="btnrow">
      <button class="btn small" id="shSess">Share card</button>
      <button class="btn small ghost" id="delSess">Delete</button>
    </div>`);
  $('#shSess').addEventListener('click', () => shareSessionCard(s));
  $('#delSess').addEventListener('click', () => {
    if (!confirm('Delete this session? This can’t be undone.')) return;
    deleteSession(id); closeSheet(); renderTab(currentTab); toast('Session deleted');
  });
}

/* ── PROOF tab ───────────────────────────────────────────── */
function areaChart(series) {
  const W = 320, H = 110, P = 8;
  const max = Math.max(1, ...series.map(d => d.h));
  const pts = series.map((d, i) => [P + i * (W - 2 * P) / (series.length - 1), H - P - (d.h / max) * (H - 2 * P - 14)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ` L${pts[pts.length - 1][0].toFixed(1)} ${H - P} L${pts[0][0].toFixed(1)} ${H - P} Z`;
  const lastP = pts[pts.length - 1];
  return `<svg class="chart areachart" viewBox="0 0 ${W} ${H}">
    <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
      <stop class="grad-stop-a" offset="0"/><stop class="grad-stop-b" offset="1"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#ag)"/>
    <path class="ln" d="${line}"/>
    <circle class="dot" cx="${lastP[0]}" cy="${lastP[1]}" r="3.6"/>
    <text x="${P}" y="${H - 1}">12 wks ago</text><text x="${W - P}" y="${H - 1}" text-anchor="end">now</text>
  </svg>`;
}
function renderProof() {
  const L = lifetime(), proofs = allProofs(), tr = trophies(), ins = insights(), tvn = thenVsNow();
  const cells = heatmapData(17);
  const max = Math.max(1, ...cells.map(c => c.v));
  const lvl = v => v === 0 ? '' : v < max * .25 ? 'l1' : v < max * .5 ? 'l2' : v < max * .8 ? 'l3' : 'l4';
  const got = tr.filter(t => t.got).length;
  const series = weeklySeries(12);

  view().innerHTML = `
    <div class="aurora">
      <div class="kicker" style="margin:8px 0 2px">The record</div>
      <div class="hero-num"><span id="heroHrs">0</span><small>hours of proof</small></div>
      <p class="muted" style="font-size:13.5px;margin:6px 0 18px">${L.sessions} sessions · ${L.rounds} rounds · ${L.subs} finishes. Nobody can take these back.</p>
    </div>

${(() => { const board = partnerBoard(); if (!board.length) return ''; const nem = nemesis(), tide = turningTide(), belts = beltTally();
      return `<div class="card enter">
      <div class="card-hd"><h3>Rolling partners</h3><span class="tiny">${board.reduce((n,p)=>n+p.rounds,0)} rounds logged</span></div>
      ${tide.length ? tide.slice(0,2).map(p => `<div class="pt-flag good"><span>🌊</span><div><b>Turning the tide on ${esc(p.name)}</b><span>Winning ${Math.round(p.recent*100)}% of your last six, up from ${Math.round(p.prior*100)}%.</span></div></div>`).join('') : ''}
      ${nem ? `<div class="pt-flag"><span>🎯</span><div><b>${esc(partnerDisplay(nem.pid))} has your number</b><span>${nem.lost} of your last ${nem.rounds} rounds. That's a study project, not a problem.</span></div></div>` : ''}
      ${belts.length ? `<div class="belt-row">${belts.map(b => `<div class="belt-cell"><i class="belt-dot b-${b.belt}"></i><b class="num">${b.won}<em>–</em>${b.even}<em>–</em>${b.lost}</b><span>vs ${b.belt}</span></div>`).join('')}</div>` : ''}
      ${board.slice(0, 6).map(p => `<button class="tech-row pt-row" data-partner="${p.pid}">
        <div class="tech-cat"><i class="belt-dot lg b-${p.belt}"></i></div>
        <div class="tech-nm"><b>${esc(p.name)}</b><span>${p.rounds} rounds · last ${relDate(p.lastTs).toLowerCase()}</span></div>
        <span class="roll-tally"><em class="o-won">${p.won}</em><em class="o-even">${p.even}</em><em class="o-lost">${p.lost}</em></span>
      </button>`).join('')}
    </div>`; })()}
    ${ins.length ? `<div class="kicker">Coach's eye</div>` + ins.map(i => `
      <div class="insight"><div class="insight-in"><span class="i-ico">${i.ico}</span><div><b>${esc(i.title)}</b><span>${esc(i.sub)}</span></div></div></div>`).join('') : ''}

    <div class="card enter">
      <div class="card-hd"><h3>Hours per week</h3><span class="tiny">12 weeks</span></div>
      ${areaChart(series)}
    </div>

    ${tvn ? `<div class="card enter">
      <div class="card-hd"><h3>Then vs now</h3><span class="tiny">6 wks vs prior 6</span></div>
      <div class="tvn">
        <div class="tvn-row-lbl">Sessions / week</div>
        <div class="t-then"><b>${tvn.old.perWk}</b><span>then</span></div><span class="t-arrow">→</span><div class="t-now"><b>${tvn.cur.perWk}</b><span>now</span></div>
        <div class="tvn-row-lbl">Tapped per round</div>
        <div class="t-then"><b>${tvn.old.tapRate.toFixed(2)}</b><span>then</span></div><span class="t-arrow">→</span><div class="t-now"><b>${tvn.cur.tapRate.toFixed(2)}</b><span>now</span></div>
        <div class="tvn-row-lbl">Landed / session</div>
        <div class="t-then"><b>${tvn.old.hitsPer}</b><span>then</span></div><span class="t-arrow">→</span><div class="t-now"><b>${tvn.cur.hitsPer}</b><span>now</span></div>
      </div>
    </div>` : ''}

    <div class="card enter">
      <div class="card-hd"><h3>Consistency</h3><button class="link" id="shWrap" style="color:var(--acc);font:600 12px var(--f-mono);letter-spacing:.08em">SHARE MONTH ↗</button></div>
      <div class="hm">${cells.map(c => `<i class="${lvl(c.v)}" title="${fmtDate(c.ts)}"></i>`).join('')}</div>
      <div class="hm-foot"><span class="tiny">last 17 weeks</span><span class="tiny">less&nbsp;<i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--ink-4)"></i>&nbsp;<i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--acc)"></i>&nbsp;more</span></div>
    </div>

    <div class="card enter">
      <div class="card-hd"><h3>Trophies</h3><span class="tiny">${got}/${tr.length}</span></div>
      <div class="shelf">${tr.map(t => `
        <div class="trophy ${t.got ? 'got' : ''}">
          <div class="t-ico">${t.icon}</div><b>${t.title}</b><span>${t.sub}</span>
          ${t.got ? '' : `<div class="t-bar"><i style="width:${t.pct}%"></i></div>`}
        </div>`).join('')}</div>
    </div>

    <div class="kicker">Proof feed</div>
    ${proofs.length ? proofs.slice(0, 30).map(p => `<div>${proofCard(p)}<p class="tiny" style="margin:-6px 4px 12px">${relDate(p.ts)}</p></div>`).join('')
      : `<div class="empty"><div class="e-ico">⚡</div><h3>Proof accumulates here</h3><p>Log sessions and this feed fills with firsts, milestones and trends — receipts of getting better.</p></div>`}`;

  countUp($('#heroHrs'), parseFloat(L.hours), { dec: L.mins >= 5970 ? 0 : 1, dur: 1100 });
  bindProofShares(view());
  const w = $('#shWrap'); if (w) w.addEventListener('click', shareWrapCard);
}

/* ── BODY tab ────────────────────────────────────────────── */
function renderBody() {
  const b = bodyStatus();
  const pctW = Math.min(100, Math.round((b.load.ratio / 2) * 100));
  view().innerHTML = `
    <div class="aurora">
      <div class="kicker" style="margin:8px 0 2px">The chassis</div>
      <h1 style="font-size:29px;margin-bottom:16px">Listen before it shouts.</h1>
    </div>

    ${b.alerts.length ? b.alerts.map(a => `<div class="alert ${a.cls}"><span class="a-ico">${a.ico}</span><div>${a.html}</div></div>`).join('')
      : `<div class="alert ok"><span class="a-ico">✅</span><div><b>All quiet.</b> No recurring flags, load in range. Keep stacking sessions.</div></div>`}

    <div class="card enter">
      <div class="card-hd"><h3>Niggle map</h3><span class="tiny">last 4 weeks</span></div>
      <div class="bodywrap">${bodySVG(b.heat)}</div>
      <div class="legend">
        <span><i style="background:var(--ink-4)"></i>quiet</span>
        <span><i style="background:color-mix(in srgb,var(--warn) 30%,var(--ink-4))"></i>noted</span>
        <span><i style="background:color-mix(in srgb,var(--warn) 62%,var(--ink-4))"></i>recurring</span>
        <span><i style="background:var(--bad)"></i>hot</span>
      </div>
    </div>

    <div class="card enter">
      <div class="card-hd"><h3>Training load</h3><span class="tiny" style="color:${b.load.cls === 'bad' ? 'var(--bad)' : b.load.cls === 'warn' ? 'var(--warn)' : 'var(--good)'}">${b.load.label.toUpperCase()}</span></div>
      <div class="loadbar"><i style="width:${pctW}%"></i><u></u></div>
      <p class="tiny" style="margin-bottom:8px">this week vs your 4-week average (marker = 1.25×)</p>
      <p class="muted" style="font-size:13.5px">${b.load.note}</p>
    </div>

    <div class="card enter">
      <div class="card-hd"><h3>Why this matters</h3></div>
      <p class="muted" style="font-size:13.5px;line-height:1.65">Most BJJ injuries happen in ordinary sparring, not comps — and surveys show over half of practitioners get hurt in any six-month window. The two biggest levers you control: don't spike weekly load, and don't train through pain that's already there at warm-up. PROOF watches both, and pays MP for honest body logs.</p>
    </div>`;
}

/* ── RECALL tab ──────────────────────────────────────────── */
const DRILL_STEPS = ['Set your grips', 'The entry — where does it start?', 'The mechanics — step by step', 'The finish. Slow. Perfect.'];
function shadowDrill(techName, onDone) {
  const circ = 2 * Math.PI * 66;
  let t = 60, stepIdx = 0, timer = null;
  openMega(`
    <div class="m-kick">Shadow drill</div>
    <h2 style="margin-bottom:16px">${esc(techName)}</h2>
    <div class="drill-ring">
      <svg viewBox="0 0 150 150" width="150" height="150">
        <circle class="bg" cx="75" cy="75" r="66"/>
        <circle class="fg" cx="75" cy="75" r="66" stroke-dasharray="${circ}" stroke-dashoffset="0" id="drillFg"/>
      </svg>
      <b id="drillT">60</b>
    </div>
    <div class="drill-step" id="drillStep">Close your eyes. Breathe once.</div>
    <p class="tiny" style="margin-bottom:18px">visualise it at full detail — grips, weight, timing</p>
    <button class="btn ghost" id="drillSkip">End early</button>`);
  const finish = () => {
    clearInterval(timer);
    closeMega();
    onDone();
  };
  timer = setInterval(() => {
    t--;
    const el = $('#drillT'), fg = $('#drillFg'), st = $('#drillStep');
    if (!el) { clearInterval(timer); return; }
    el.textContent = t;
    fg.style.strokeDashoffset = circ * (1 - t / 60);
    const idx = Math.min(DRILL_STEPS.length - 1, Math.floor((60 - t) / 15));
    if (idx !== stepIdx) { stepIdx = idx; st.textContent = DRILL_STEPS[idx]; }
    if (t <= 0) finish();
  }, 1000);
  $('#drillSkip').addEventListener('click', finish);
}
function renderRecall() {
  const due = recallDue(), ars = arsenal();
  const lib = libStats(), next = nextUp(3), tree = treeStats();
  const IVL_TX = ['tomorrow', 'in 3 days', 'in a week', 'in 3 weeks', 'in 2 months'];
  view().innerHTML = `
    <div class="aurora">
      <div class="kicker" style="margin:8px 0 2px">The library</div>
      <h1 style="font-size:29px;margin-bottom:16px">Use it or lose it — so use it.</h1>
    </div>
    <div id="dueWrap">
      ${due.length ? due.map((d, i) => `
        <div class="due ${i ? '' : 'enter'}" data-due="${d.id}" ${i ? 'hidden' : ''}>
          <div class="kicker">Recall check · ${i + 1}/${due.length} · +15 MP</div>
          <h3>${esc(d.name)}</h3>
          <p>Close your eyes. Walk through it step by step — grips, angles, finish. Could you hit it tomorrow?</p>
          ${techNotes(d.id).cues.length ? `<ul class="due-cues">${techNotes(d.id).cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
          <button class="due-page" data-page="${d.id}">${techNotes(d.id).cues.length ? 'Edit cues' : 'Add cues for next time'} ›</button>
          <div class="due-btns">
            <button class="b-gone" data-grade="gone">Gone</button>
            <button class="b-fuzzy" data-grade="fuzzy">Fuzzy</button>
            <button class="b-got" data-grade="got">Still got it</button>
          </div>
          <button class="btn ghost small" data-drill style="margin-top:12px">🎬 Shadow drill it — 60 seconds</button>
          <div class="ladder">${[0, 1, 2, 3, 4].map(s => `<i class="${s <= d.stage ? 'on' : ''}"></i>`).join('')}</div>
        </div>`).join('')
      : `<div class="card"><div class="empty" style="padding:20px"><div class="e-ico">🧠</div><h3>Queue clear</h3><p>Techniques you log resurface here right before your brain files them under "gone". Next reviews are scheduled.</p></div></div>`}
    </div>

    <div class="card enter" style="margin-top:6px">
      <div class="card-hd"><h3>The library</h3><span class="tiny">${lib.done} / ${lib.total} learnt</span></div>
      <div class="lib-bar"><i style="width:${lib.pct}%"></i></div>
      <button class="bm-open" id="openMap">
        <span class="bm-open-svg">${miniMapSVG()}</span>
        <span class="bm-open-tx"><b>Open the map</b><span>${tree.learnt} of ${tree.total} lit · ${tree.open} ready to unlock</span></span>
        <span class="bm-open-go">→</span>
      </button>
      <p class="tiny" style="margin:8px 0 14px">${lib.done === 0
        ? 'Every move in jiu-jitsu, in one list. Tick what you know — the rest becomes your map.'
        : lib.untickedButTouched
          ? `${lib.untickedButTouched} move${lib.untickedButTouched > 1 ? 's you\'ve' : ' you\'ve'} already hit on the mat ${lib.untickedButTouched > 1 ? 'are' : 'is'} still unticked.`
          : `${lib.pct}% of the map filled in.`}</p>

      ${next.length ? `<div class="kicker" style="margin-bottom:8px">Next one to get</div>
      ${next.map(t => `
        <div class="lib-next" data-learn="${t.id}">
          <button class="lib-tick" aria-label="Mark ${esc(t.name)} learnt"></button>
          <div class="tech-nm"><b>${esc(t.name)}${t.touched ? '<i class="lib-hit">hit it</i>' : ''}</b><span>${TECH_CATS[t.cat].name} · ${BELTS[BELT_ORDER[t.lvl - 1]].name.toLowerCase()} belt</span></div>
        </div>`).join('')}` : `<p class="tiny">Whole library ticked. Genuinely rare — go teach.</p>`}

      <div class="lib-cats">
        ${lib.cats.map(c => `
          <button class="lib-cat" data-cat="${c.cat}" style="--h:${CAT_HUE[c.cat]}">
            <span class="lc-ico">${c.ico}</span>
            <span class="lc-nm">${c.name}</span>
            <span class="lc-n num">${c.done}/${c.total}</span>
            <span class="lc-bar"><i style="width:${c.pct}%"></i></span>
          </button>`).join('')}
      </div>
    </div>

    <div class="card enter" style="margin-top:6px">
      <div class="card-hd"><h3>Your arsenal</h3><span class="tiny">★ = focus weapon</span></div>
      ${ars.length ? ars.slice(0, 16).map(a => `
        <div class="tech-row">
          <button class="tech-cat" data-focus="${a.id}" aria-label="Make ${esc(a.name)} your focus" style="font-size:15px">${state.focus === a.id ? '⭐' : TECH_CATS[a.cat].ico}</button>
          <div class="tech-nm" data-page="${a.id}" role="button" tabindex="0"><b>${esc(a.name)}${techNotes(a.id).cues.length ? ' <i class="tp-cued" title="has cues">✎</i>' : ''}</b><span>${TECH_CATS[a.cat].name} · last touched ${relDate(a.lastTs).toLowerCase()}</span></div>
          <div class="tech-n"><b>${a.hit}</b><span>landed</span></div>
        </div>`).join('')
      : `<div class="empty"><div class="e-ico">🗺️</div><h3>Empty map</h3><p>Every technique you log becomes a page in your own book.</p></div>`}
    </div>`;

  view().querySelectorAll('[data-due]').forEach(card => {
    const id = card.dataset.due;
    const name = (state.recall[id] || {}).name || id;
    card.querySelectorAll('[data-grade]').forEach(btn => btn.addEventListener('click', () => {
      const grade = btn.dataset.grade;
      gradeRecall(id, grade);
      const r = btn.getBoundingClientRect();
      if (grade === 'got') burst(r.left + r.width / 2, r.top);
      toast(grade === 'got' ? `+15 MP — resurfaces ${IVL_TX[Math.min(state.recall[id].stage, 4)]}` : grade === 'fuzzy' ? '+8 MP — no stress, it’ll come back around' : '+5 MP for honesty — review it tomorrow');
      const next = card.nextElementSibling;
      card.remove();
      if (next && next.dataset && next.dataset.due) next.hidden = false;
      else if (!$('#dueWrap [data-due]')) renderRecall();
      checkLevelUp();
    }));
    const pg = card.querySelector('[data-page]');
    if (pg) pg.addEventListener('click', () => openTechPage(id, renderRecall));
    const dr = card.querySelector('[data-drill]');
    if (dr) dr.addEventListener('click', () => shadowDrill(name, () => toast('Drilled in the mind — now grade it honestly')));
  });
  view().querySelectorAll('[data-focus]').forEach(b => b.addEventListener('click', () => {
    state.focus = state.focus === b.dataset.focus ? null : b.dataset.focus;
    saveState(); renderRecall();
    toast(state.focus ? `${techById(state.focus).name} is this week's weapon` : 'Focus cleared');
  }));
  view().querySelectorAll('.tech-row [data-page]').forEach(el => el.addEventListener('click', () => openTechPage(el.dataset.page, renderRecall)));
  view().querySelectorAll('[data-learn]').forEach(row => row.addEventListener('click', () => {
    const id = row.dataset.learn, t = techById(id);
    const r = row.getBoundingClientRect();
    setLearned(id, true);
    burst(r.left + 26, r.top + r.height / 2, 12);
    toast(`${t.name} learnt · +20 MP — it'll come back for a recall check tomorrow`, 3400);
    renderRecall(); checkLevelUp();
  }));
  view().querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => openLibrary(b.dataset.cat)));
  const om = $('#openMap'); if (om) om.addEventListener('click', () => openBrainMap());
}

/* Thumbnail of the real graph for the card — same layout, no labels, so the button
   shows the user their own map rather than a generic icon. */
function miniMapSVG() {
  const L = treeLayout();
  const edges = L.edges.map(([a, b]) => {
    const p = L.nodes[a], c = L.nodes[b];
    const on = nodeState(a) === 'learnt' && nodeState(b) === 'learnt';
    return `<line x1="${p.x.toFixed(0)}" y1="${p.y.toFixed(0)}" x2="${c.x.toFixed(0)}" y2="${c.y.toFixed(0)}"
      class="${on ? 'mm-on' : 'mm-off'}"${on ? ` style="stroke:${catHue(b)}"` : ''}/>`;
  }).join('');
  const dots = Object.values(L.nodes).map(n => {
    const s = nodeState(n.id);
    return `<circle cx="${n.x.toFixed(0)}" cy="${n.y.toFixed(0)}" r="${n.depth === 1 ? 34 : n.leaf ? 13 : 20}"
      class="mm-${s}"${s === 'locked' ? '' : ` style="fill:${catHue(n.id)}"`}/>`;
  }).join('');
  return `<svg viewBox="${L.minX} ${L.minY} ${L.w} ${L.h}" class="minimap" aria-hidden="true">${edges}${dots}</svg>`;
}

/* ── the brain map ───────────────────────────────────────────
   181 moves, every one hanging off the thing that teaches it. Roots in the middle,
   the art growing outward. Synapses dim until the move before them is learnt. */
let mapView = null;   /* {k, tx, ty} — zoom + pan, kept across re-renders */

function openBrainMap(focusId) {
  const L = treeLayout();
  const wrap = document.getElementById('mega');
  wrap.hidden = false;
  wrap.className = 'mega brainmap';
  wrap.innerHTML = `
    <div class="bm-top">
      <div class="bm-title">
        <b>The map</b>
        <span id="bmCount"></span>
        <span class="bm-legend">
          <span><i class="s-learnt"></i>learnt</span>
          <span><i class="s-open"></i>ready</span>
          <span><i class="s-locked"></i>locked</span>
        </span>
      </div>
      <button class="bm-x" id="bmClose" aria-label="Close map">✕</button>
    </div>
    <svg id="bmSvg" viewBox="${L.minX} ${L.minY} ${L.w} ${L.h}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="bmGlow"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
        <radialGradient id="bmCore" cx="38%" cy="34%">
          <stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <g id="bmRings"></g>
      <g id="bmEdges"></g>
      <g id="bmPulse"></g>
      <g id="bmNodes"></g>
    </svg>
    <div class="bm-card" id="bmCard" hidden></div>`;

  /* .mega starts at opacity 0. Flush the style so the transition has a start value,
     then reveal synchronously — rAF is throttled when the tab isn't actively
     rendering, which can leave the map sitting invisible over the app. */
  void wrap.offsetWidth;
  wrap.classList.add('on');

  const svg = document.getElementById('bmSvg');
  const gR = document.getElementById('bmRings');
  const gE = document.getElementById('bmEdges'), gP = document.getElementById('bmPulse');
  const gN = document.getElementById('bmNodes');

  /* faint indent guides so deep branches stay anchored to the level above */
  gR.innerHTML = Array.from({ length: 11 }, (_, d) =>
    `<line class="bm-ring" x1="${d * L.COL}" y1="${L.minY}" x2="${d * L.COL}" y2="${L.minY + L.h}"/>`).join('');

  const rOf = n => n.depth === 0 ? 16 : n.leaf ? 7 : 9 + Math.min(Math.sqrt(n.sub) * 1.6, 6);
  const edgePath = (p, c) => {
    /* Down the parent's own column, then a rounded turn into the child — the shape a
       file tree makes, which is what tells you at a glance what belongs to what. */
    const x = p.x, turn = 15;
    return `M${x} ${(p.y + rOf(p) + 2).toFixed(0)} V${(c.y - turn).toFixed(0)}` +
           ` Q${x} ${c.y.toFixed(0)} ${(x + turn).toFixed(0)} ${c.y.toFixed(0)}` +
           ` H${(c.x - rOf(c) - 3).toFixed(0)}`;
  };

  const paint = () => {
    const st = treeStats();
    document.getElementById('bmCount').textContent = `${st.learnt} / ${st.total} · ${st.open} ready`;

    /* edges: width tapers from trunk to twig with subtree size, hue from the branch
       they feed, and only light up once both ends are learnt */
    const lit = [];
    gE.innerHTML = L.edges.map(([a, b]) => {
      const p = L.nodes[a], c = L.nodes[b];
      const sa = nodeState(a), sc = nodeState(b);
      const on = sa === 'learnt' && sc === 'learnt';
      const cls = on ? 'e-on' : sa === 'learnt' ? 'e-half' : 'e-off';
      const w = (1.6 + Math.sqrt(c.sub) * 1.5).toFixed(1);
      const d = edgePath(p, c);
      if (on) lit.push({ b, c, d });
      return `<path class="bm-e ${cls}" d="${d}" style="${cls === 'e-off' ? '' : `stroke:${catHue(b)};`}stroke-width:${w}"/>`;
    }).join('');
    /* Every pulse is an animated, drop-shadowed path — a fully-lit map would be 179 of
       them and would cook a phone GPU. Keep the outermost ones, where the eye is. */
    const PULSE_MAX = 64;
    gP.innerHTML = lit
      .sort((x, y) => y.c.depth - x.c.depth)
      .slice(0, PULSE_MAX)
      .map(({ b, c, d }) => `<path class="bm-p" d="${d}" style="stroke:${catHue(b)};animation-delay:${(c.depth * 0.24 + (c.si % 3) * 0.4).toFixed(2)}s"/>`)
      .join('');

    gN.innerHTML = Object.values(L.nodes).map(n => {
      const t = techById(n.id), s = nodeState(n.id);
      const rad = rOf(n);
      const hue = catHue(n.id);
      const lit = s !== 'locked';
      /* Every node is labelled — each row belongs to one node, so nothing can collide.
         Locked leaves just sit back until you're looking at them. */
      const dim = (s === 'locked' && !n.kids) ? ' far' : '';
      return `<g class="bm-n ${s}${focusId === n.id ? ' focus' : ''}" data-node="${n.id}"
        style="${lit ? `--h:${hue};` : ''}animation-delay:${Math.min(n.depth * 0.045, 0.4).toFixed(2)}s"
        transform="translate(${n.x.toFixed(0)} ${n.y.toFixed(0)})">
        <rect class="bm-hit" x="${-rad - 12}" y="-26" width="${Math.round(rad + 40 + t.name.length * 11.4)}" height="52"/>
        ${s === 'open' ? `<circle class="bm-ripple" r="${rad}"/>` : ''}
        <circle class="bm-dot" r="${rad}"/>
        ${s === 'learnt' ? `<circle class="bm-spec" r="${(rad * 0.72).toFixed(1)}" fill="url(#bmCore)"/>` : ''}
        <text class="bm-t${dim}" x="${rad + 14}">${esc(t.name)}</text>
      </g>`;
    }).join('');

    gN.querySelectorAll('[data-node]').forEach(g => g.addEventListener('click', e => {
      e.stopPropagation(); showNodeCard(g.dataset.node, paint);
    }));
  };
  paint();

  /* ── pan + pinch zoom ── */
  /* The tree is ~3900 units across and ~7400 down; all of it at once would make the
     labels unreadable. Open at a span you can actually read and let people pull back. */
  /* The canvas is a tall narrow column. Fit its WIDTH to the screen — meet would fit
     the 11,000-unit height instead and render everything microscopic. */
  const vw = svg.clientWidth || 375, vh = svg.clientHeight || 700;
  const fit = Math.min(vw / L.w, vh / L.h);          /* preserveAspectRatio="meet" */
  const k0 = (vw / L.w) / fit;
  const cx = L.minX + L.w / 2, cy = L.minY + L.h / 2;
  const centreOn = (id, k) => {
    const n = L.nodes[id]; if (!n) return { tx: 0, ty: 0 };
    return { tx: -(n.x - cx) * fit * k, ty: -(n.y - cy) * fit * k };
  };
  if (!mapView) {
    /* full width, scrolled to the root the user actually starts from */
    const target = (focusId && L.nodes[focusId]) ? focusId : 'closed-guard';
    const c = centreOn(target, k0);
    mapView = { k: k0, tx: 0, ty: c.ty + vh * 0.32 };
  }
  const apply = () => {
    svg.style.transform = `translate(${mapView.tx}px,${mapView.ty}px) scale(${mapView.k})`;
    svg.classList.toggle('zoomed', mapView.k > k0 * 1.25);
  };
  apply();

  let drag = null, pinch = null;
  const pt = e => ({ x: e.touches ? e.touches[0].clientX : e.clientX, y: e.touches ? e.touches[0].clientY : e.clientY });
  const dist = e => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);

  const down = e => {
    if (e.touches && e.touches.length === 2) { pinch = { d: dist(e), k: mapView.k }; drag = null; return; }
    const p = pt(e); drag = { x: p.x - mapView.tx, y: p.y - mapView.ty, moved: 0 };
  };
  const move = e => {
    if (pinch && e.touches && e.touches.length === 2) {
      e.preventDefault();
      mapView.k = Math.max(.45, Math.min(4, pinch.k * (dist(e) / pinch.d)));
      apply(); return;
    }
    if (!drag) return;
    e.preventDefault();
    const p = pt(e);
    drag.moved += Math.abs(p.x - mapView.tx - drag.x) + Math.abs(p.y - mapView.ty - drag.y);
    mapView.tx = p.x - drag.x; mapView.ty = p.y - drag.y;
    apply();
  };
  const up = () => { pinch = null; drag = null; };

  svg.addEventListener('mousedown', down); svg.addEventListener('touchstart', down, { passive: true });
  window.addEventListener('mousemove', move); svg.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('mouseup', up); svg.addEventListener('touchend', up);
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    mapView.k = Math.max(.45, Math.min(4, mapView.k * (e.deltaY > 0 ? 0.9 : 1.1)));
    apply();
  }, { passive: false });

  document.getElementById('bmClose').addEventListener('click', closeBrainMap);
  wrap.addEventListener('click', e => {
    if (e.target === wrap || e.target === svg) document.getElementById('bmCard').hidden = true;
  });
}

function closeBrainMap() {
  const wrap = document.getElementById('mega');
  wrap.hidden = true; wrap.className = 'mega'; wrap.innerHTML = '';
  renderRecall();
}

function showNodeCard(id, repaint) {
  const t = techById(id), s = nodeState(id), pre = preOf(id), kids = childrenOf(id);
  const card = document.getElementById('bmCard');
  const preName = pre ? techById(pre).name : null;
  card.hidden = false;
  card.style.setProperty('--h', CAT_HUE[t.cat]);
  card.innerHTML = `
    <div class="bm-c-hd">
      <span class="bm-c-ico">${TECH_CATS[t.cat].ico}</span>
      <div><b>${esc(t.name)}</b><span><i class="bm-c-cat">${TECH_CATS[t.cat].name}</i> · ${BELTS[BELT_ORDER[techLevel(id) - 1]].name.toLowerCase()} belt</span></div>
    </div>
    <p class="bm-c-p">${s === 'learnt'
      ? (kids.length ? `Learnt. It opens ${kids.length} move${kids.length > 1 ? 's' : ''}: ${kids.slice(0, 3).map(k => esc(techById(k).name)).join(', ')}${kids.length > 3 ? '…' : ''}` : 'Learnt. End of this branch.')
      : s === 'open'
        ? (kids.length ? `Ready to learn — ticking it opens ${kids.length} more.` : 'Ready to learn.')
        : `Locked behind <b>${esc(preName)}</b>. Learn that first.`}</p>
    <div class="bm-c-btns">
    ${s === 'locked'
      ? `<button class="btn ghost small" data-goto="${pre}">Show me ${esc(preName)}</button>`
      : `<button class="btn small" data-tick2="${id}">${s === 'learnt' ? 'Un-tick' : 'Mark learnt'}</button>`}
      <button class="btn ghost small" data-page2="${id}">Open page ›</button>
    </div>`;

  const b = card.querySelector('[data-tick2]');
  if (b) b.addEventListener('click', () => {
    const on = nodeState(id) !== 'learnt';
    setLearned(id, on);
    if (on) {
      const el = document.querySelector(`[data-node="${id}"] .bm-dot`);
      if (el) { const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 14); }
      const n = childrenOf(id).length;
      toast(n ? `${t.name} learnt · ${n} new move${n > 1 ? 's' : ''} unlocked` : `${t.name} learnt`, 3200);
    }
    repaint(); showNodeCard(id, repaint); checkLevelUp();
  });
  const pg2 = card.querySelector('[data-page2]');
  if (pg2) pg2.addEventListener('click', () => {
    /* #mega (the map) outranks #sheet in the stack, so a page opened over it would
       be invisible. Step out of the map, show the page, step back in on the same
       node — mapView persists, so it reopens exactly where it was. */
    closeBrainMap();
    openTechPage(id, () => openBrainMap(id));
  });
  const g = card.querySelector('[data-goto]');
  if (g) g.addEventListener('click', () => {
    const L = treeLayout(), n = L.nodes[g.dataset.goto], svg = document.getElementById('bmSvg');
    if (n && svg) {
      const fit = Math.min(svg.clientWidth / L.w, svg.clientHeight / L.h);
      const cy = L.minY + L.h / 2;
      mapView.ty = -(n.y - cy) * fit * mapView.k;   /* scroll to it; width already fits */
      svg.style.transform = `translate(${mapView.tx}px,${mapView.ty}px) scale(${mapView.k})`;
    }
    showNodeCard(g.dataset.goto, repaint);
  });
}

/* ── technique page: one move, everything you know about it ──────────────
   Your cues and notes, what the log says, where it sits on the map, and the
   actions that matter. Reached from the map, the library, the arsenal and the
   recall check. Cues written here resurface in that move's recall check. */
/* ── partner page ─────────────────────────────────────────── */
function openPartnerPage(pid) {
  const p = partnerById(pid); if (!p) return;
  const draw = () => {
    const st = partnerStats(pid);
    const pct = st.rounds ? Math.round(st.won / st.rounds * 100) : 0;
    openSheet(`
      <div class="pp">
        <div class="tp-hd"><i class="belt-dot xl b-${p.belt}"></i><div class="tp-tx"><h2>${esc(p.name)}</h2><p class="sub">${BELTS[p.belt].name} belt · ${st.rounds} round${st.rounds === 1 ? '' : 's'} over ${st.sessions} session${st.sessions === 1 ? '' : 's'}</p></div></div>
        <div class="tp-stats"><div><b class="num o-won">${st.won}</b><span>got them</span></div><div><b class="num">${st.even}</b><span>even</span></div><div><b class="num o-lost">${st.lost}</b><span>got me</span></div></div>
        <p class="tiny tp-meta">${st.rounds ? `You take ${pct}% of rounds` : 'No rounds yet'}${st.firstWinTs ? ` · first caught them ${fmtDate(st.firstWinTs)}` : st.rounds ? ' · haven\'t caught them yet — that first one is coming' : ''}${st.turning ? ' · <b style="color:var(--good)">turning the tide</b>' : ''}</p>
        <div class="tp-sec"><div class="card-hd"><h3>Round by round</h3><span class="tiny">newest first</span></div>
          <div class="pp-strip">${st.rs.slice(0, 40).map(r => `<i class="o-${r.out}" title="${fmtDate(r.sess.ts)}"></i>`).join('')}</div>
          ${st.rs.slice(0, 6).map(r => `<button class="tp-row" data-sess="${r.sess.id}"><i class="tp-dot ${r.out === 'won' ? 'r-hit' : r.out === 'lost' ? 'r-conceded' : ''}"></i><span class="tp-row-tx"><b>${r.out === 'won' ? 'Got them' : r.out === 'lost' ? 'Got me' : 'Even'}</b><span>${relDate(r.sess.ts)}</span></span><span class="tp-row-go">›</span></button>`).join('')}
        </div>
        <div class="tp-sec"><div class="card-hd"><h3>Details</h3></div>
          <form class="roll-new" id="ppEdit"><input id="ppName" value="${esc(p.name)}" maxlength="40"><div class="roll-belts">${BELT_ORDER.map(b => `<button type="button" class="belt-pick b-${b}${b === p.belt ? ' on' : ''}" data-belt="${b}"></button>`).join('')}</div><button type="submit" class="btn small">Save</button></form>
          <p class="tiny" style="margin-top:8px">Got promoted? Change the belt here — past rounds keep the belt they were rolled at.</p>
        </div>
      </div>`);
    document.querySelectorAll('.pp [data-sess]').forEach(b => b.addEventListener('click', () => openSessionSheet(b.dataset.sess)));
    let belt = p.belt;
    document.querySelectorAll('.pp .belt-pick').forEach(b => b.addEventListener('click', () => { belt = b.dataset.belt; document.querySelectorAll('.pp .belt-pick').forEach(x => x.classList.toggle('on', x.dataset.belt === belt)); }));
    $('#ppEdit').addEventListener('submit', e => { e.preventDefault(); p.name = $('#ppName').value.trim().slice(0, 40) || p.name; p.belt = belt; saveState(); toast('Saved'); draw(); });
  };
  draw();
}

/* ── partner page ends ─────────────────────────────────────── */
function openTechPage(id, onClose) {
  const t = techById(id); if (!t) return;
  const draw = () => {
    const f = techFull(id), hue = CAT_HUE[t.cat];
    const belt = BELTS[BELT_ORDER[f.lvl - 1]].name.toLowerCase();
    const stateLine = f.state === 'learnt' ? 'learnt'
      : f.state === 'open' ? 'ready to learn'
      : `locked behind ${esc(techById(f.pre).name)}`;
    const hist = f.hist.slice(0, 8);
    openSheet(`
      <div class="tp" style="--h:${hue}">
        <div class="tp-hd">
          <span class="tp-ico">${TECH_CATS[t.cat].ico}</span>
          <div class="tp-tx">
            <h2>${esc(t.name)}</h2>
            <p class="sub"><i class="tp-cat">${TECH_CATS[t.cat].name}</i> · ${belt} belt · ${stateLine}</p>
          </div>
        </div>

        <div class="tp-stats">
          <div><b class="num">${f.hit}</b><span>landed</span></div>
          <div><b class="num">${f.drilled}</b><span>drilled</span></div>
          <div><b class="num">${f.conceded}</b><span>caught by</span></div>
        </div>
        <p class="tiny tp-meta">${f.firstHitTs ? `First landed ${fmtDate(f.firstHitTs)}` : 'Never landed yet'}${f.lastTs ? ` · last touched ${relDate(f.lastTs).toLowerCase()}` : ''}${f.vsBest ? ` · best vs ${f.vsBest} belt` : ''}</p>

        <div class="tp-sec">
          <div class="card-hd"><h3>Your cues</h3><span class="tiny">${f.notes.cues.length ? 'shown in recall checks' : 'the things that make it work'}</span></div>
          ${f.notes.cues.length ? `<ul class="tp-cues">${f.notes.cues.map((c, i) => `
            <li><span>${esc(c)}</span><button data-cue-x="${i}" aria-label="Remove cue">✕</button></li>`).join('')}</ul>` : ''}
          <form class="tp-add" id="tpCueForm">
            <input id="tpCue" placeholder="${f.notes.cues.length ? 'Another one…' : 'e.g. hip out before the angle'}" maxlength="90" autocomplete="off">
            <button type="submit" class="btn small">Add</button>
          </form>
        </div>

        <div class="tp-sec">
          <div class="card-hd"><h3>Notes</h3></div>
          <textarea class="transcript tp-note" id="tpNote" rows="3" placeholder="What's working, what isn't, who showed you it…">${esc(f.notes.note)}</textarea>
        </div>

        <div class="tp-sec">
          <div class="card-hd"><h3>On the mat</h3><span class="tiny">${f.sessions ? `${f.sessions} session${f.sessions > 1 ? 's' : ''}` : ''}</span></div>
          ${hist.length ? hist.map(h => {
            const r = h.t.res;
            const lab = r === 'hit' ? 'Landed' : r === 'conceded' ? 'Caught by it' : r === 'learned' ? 'Learnt' : 'Drilled';
            return `<button class="tp-row" data-sess="${h.sess.id}">
              <i class="tp-dot r-${r}"></i>
              <span class="tp-row-tx"><b>${lab}${h.t.n > 1 ? ` ×${h.t.n}` : ''}${h.t.vs ? ` <em>vs ${h.t.vs}</em>` : ''}</b><span>${relDate(h.sess.ts)}${h.sess.notes ? ' · “' + esc(h.sess.notes.slice(0, 48)) + (h.sess.notes.length > 48 ? '…' : '') + '”' : ''}</span></span>
              <span class="tp-row-go">›</span>
            </button>`;
          }).join('') : `<p class="tiny">Not in the log yet. Say its name when you log a session and it'll show up here.</p>`}
        </div>

        ${f.kids.length || f.pre ? `<p class="tiny tp-map">${f.pre ? `Branches off <b>${esc(techById(f.pre).name)}</b>` : 'A root of the map'}${f.kids.length ? ` · opens ${f.kids.length}: ${f.kids.slice(0, 3).map(k => esc(techById(k).name)).join(', ')}${f.kids.length > 3 ? '…' : ''}` : ''}</p>` : ''}

        <div class="tp-actions">
          ${f.state === 'locked'
            ? `<button class="btn ghost small" data-goto-page="${f.pre}">Show me ${esc(techById(f.pre).name)}</button>`
            : `<button class="btn small" id="tpLearn">${f.state === 'learnt' ? 'Un-tick' : 'Mark learnt'}</button>`}
          <button class="btn ghost small" id="tpFocus">${state.focus === id ? '⭐ Focus weapon' : 'Make it my focus'}</button>
          <button class="btn ghost small" id="tpDrill">🎬 Shadow drill</button>
        </div>
      </div>`, onClose);

    /* cues */
    $('#tpCueForm').addEventListener('submit', e => {
      e.preventDefault();
      const v = $('#tpCue').value.trim(); if (!v) return;
      setTechNotes(id, { cues: [...techNotes(id).cues, v] });
      draw(); $('#tpCue').focus();
    });
    document.querySelectorAll('[data-cue-x]').forEach(b => b.addEventListener('click', () => {
      const cues = techNotes(id).cues.slice(); cues.splice(+b.dataset.cueX, 1);
      setTechNotes(id, { cues }); draw();
    }));
    /* note saves on blur, not per keystroke — one write, not fifty */
    $('#tpNote').addEventListener('blur', () => {
      const v = $('#tpNote').value;
      if (v !== techNotes(id).note) { setTechNotes(id, { note: v }); toast('Saved'); }
    });
    /* rows → session */
    document.querySelectorAll('[data-sess]').forEach(b => b.addEventListener('click', () => openSessionSheet(b.dataset.sess)));
    /* actions */
    const ln = $('#tpLearn'); if (ln) ln.addEventListener('click', () => {
      const on = nodeState(id) !== 'learnt';
      setLearned(id, on);
      if (on) { const r = ln.getBoundingClientRect(); burst(r.left + r.width / 2, r.top, 12); toast(`${t.name} learnt · +20 MP`); }
      draw(); checkLevelUp();
    });
    $('#tpFocus').addEventListener('click', () => {
      state.focus = state.focus === id ? null : id; saveState(); draw();
      toast(state.focus ? `${t.name} is this week's weapon` : 'Focus cleared');
    });
    $('#tpDrill').addEventListener('click', () => shadowDrill(t.name, () => toast('Drilled in the mind')));
    const g = document.querySelector('[data-goto-page]'); if (g) g.addEventListener('click', () => openTechPage(g.dataset.gotoPage, onClose));
  };
  draw();
}

/* Full move list for one category — tick as you go. */
function openLibrary(cat) {
  const draw = () => {
    const lm = learnedMap(), touched = touchedIds();
    const all = TECHS.filter(t => t.cat === cat)
      .map(t => ({ ...t, lvl: techLevel(t.id), on: !!lm[t.id], hit: touched.has(t.id) }))
      .sort((a, b) => a.lvl - b.lvl || a.name.localeCompare(b.name));
    const done = all.filter(t => t.on).length;
    openSheet(`
      <h2>${TECH_CATS[cat].ico} ${TECH_CATS[cat].pl}</h2>
      <p class="sub">${done} of ${all.length} ticked · grouped by roughly when you'd meet them</p>
      ${[1, 2, 3, 4, 5].map(lvl => {
        const rows = all.filter(t => t.lvl === lvl);
        if (!rows.length) return '';
        return `<div class="lib-band">${BELTS[BELT_ORDER[lvl - 1]].name}</div>` + rows.map(t => `
          <label class="lib-row${t.on ? ' on' : ''}">
            <input type="checkbox" data-tick="${t.id}"${t.on ? ' checked' : ''}>
            <span class="lib-box" aria-hidden="true"></span>
            <span class="lib-nm">${esc(t.name)}${t.hit ? '<i class="lib-hit">hit it</i>' : ''}</span>
            <button type="button" class="lib-go" data-page="${t.id}" aria-label="Open ${esc(t.name)}">›</button>
          </label>`).join('');
      }).join('')}
      <button class="btn ghost small" id="libDone" style="margin-top:18px">Done</button>`);
    document.getElementById('libDone').addEventListener('click', closeSheet);
    /* the › sits inside a <label>; stop the click reaching it or the box toggles too */
    document.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      openTechPage(b.dataset.page, () => openLibrary(cat));
    }));
    document.querySelectorAll('[data-tick]').forEach(cb => cb.addEventListener('change', () => {
      setLearned(cb.dataset.tick, cb.checked);
      cb.closest('.lib-row').classList.toggle('on', cb.checked);
      /* redraw the tab underneath so the counts stay honest when the sheet closes */
      const y = document.getElementById('sheetBody').scrollTop;
      renderRecall();
      document.getElementById('sheetBody').scrollTop = y;
    }));
  };
  draw();
}

/* ── YOU tab ─────────────────────────────────────────────── */
function renderYou() {
  const p = state.profile, L = lifetime(), rank = matRank();
  const focus = state.focus ? techById(state.focus) : null;
  const snap = snapshotInfo();
  const quar = quarantineInfo();
  view().innerHTML = `
    <div class="you-hd">
      <div class="avatar">${esc((p.name || 'P')[0].toUpperCase())}</div>
      <div><h2>${esc(p.name || 'You')}</h2><p class="tiny">${BELTS[p.belt].name} belt${p.stripes ? ` · ${p.stripes} stripe${p.stripes > 1 ? 's' : ''}` : ''} · Rank ${rank.lvl} “${rank.name}” · ${rank.mp.toLocaleString()} MP</p></div>
    </div>

    <div class="card">
      <div class="card-hd"><h3>Belt</h3><span class="tiny">theme follows you</span></div>
      <div class="seg" style="margin:0">
        ${BELT_ORDER.map(b => `<button data-belt-pick="${b}" class="${p.belt === b ? 'on' : ''}">${BELTS[b].name}</button>`).join('')}
      </div>
      <div class="lbl">Stripes</div>
      <div class="dots">${[0, 1, 2, 3, 4].map(n => `<button data-stripe="${n}" class="${(p.stripes || 0) === n ? 'on' : ''}">${n}</button>`).join('')}</div>
    </div>

    <div class="card">
      <div class="card-hd"><h3>Training</h3></div>
      <div class="setrow"><span>Weekly session target</span>
        <div class="stepper"><button id="tgDown">−</button><b>${p.weeklyTarget || 3}</b><button id="tgUp">+</button></div>
      </div>
      <div class="setrow"><span>Focus weapon</span><button id="focusBtn">${focus ? esc(focus.name) + ' ✕' : 'Pick in Recall →'}</button></div>
      <div class="setrow"><span>Name</span><button id="editName">${esc(p.name || 'Set')} ✏️</button></div>
    </div>

    ${typeof syncCardHTML === 'function' ? syncCardHTML() : ''}
    <div class="card">
      <div class="card-hd"><h3>Data</h3><span class="tiny">${state.demo ? 'DEMO DATA LOADED' : 'yours, on this device'}</span></div>
      <div class="setrow"><span>Share this month</span><button id="wrapBtn">Make card ↗</button></div>
      <div class="setrow"><span>Share my rank</span><button id="rankBtn">Make card ↗</button></div>
      <div class="setrow"><span>Export backup</span><button id="expBtn">Download JSON</button></div>
      <div class="setrow"><span>Import backup</span><button id="impBtn">Choose file</button><input type="file" id="impFile" accept="application/json" hidden></div>
      ${state.demo
        ? `<div class="setrow"><span>Demo data</span><button class="danger" id="clearDemo">Clear demo</button></div>`
        : `<div class="setrow"><span>Explore with demo data${state.sessions.length ? ` <b class="warn-inline">replaces your ${state.sessions.length}</b>` : ''}</span><button id="loadDemo">Load demo</button></div>`}
      <div class="setrow"><span>Erase everything</span><button class="danger" id="nukeBtn">Reset</button></div>
      ${snap ? `<div class="setrow"><span>Undo last replace<br><b class="tiny">${snap.n} sessions${snap.real && snap.real !== snap.n ? ` (${snap.real} yours)` : ''}${snap.ts ? ' · ' + new Date(snap.ts).toLocaleDateString() : ''}${snap.more ? ` · ${snap.more} older kept` : ''}</b></span><button id="undoBtn">Restore</button></div>` : ''}
      ${quar ? `<div class="setrow"><span>Unreadable data found<br><b class="tiny">${quar.n} sessions from a newer version</b></span><button id="quarBtn">Recover</button></div>` : ''}
    </div>
    <p class="tiny" style="text-align:center;padding:8px 0 20px">PROOF v2 — local-first, no account, your data never leaves this device.</p>`;

  view().querySelectorAll('[data-belt-pick]').forEach(b => b.addEventListener('click', () => {
    p.belt = b.dataset.beltPick; saveState(); applyBelt(p.belt); renderYou();
    toast(`${BELTS[p.belt].name} belt — the app levels with you`);
  }));
  view().querySelectorAll('[data-stripe]').forEach(b => b.addEventListener('click', () => { p.stripes = +b.dataset.stripe; saveState(); applyBelt(p.belt); renderYou(); }));
  $('#tgUp').addEventListener('click', () => { p.weeklyTarget = Math.min(7, (p.weeklyTarget || 3) + 1); saveState(); renderYou(); });
  $('#tgDown').addEventListener('click', () => { p.weeklyTarget = Math.max(1, (p.weeklyTarget || 3) - 1); saveState(); renderYou(); });
  $('#focusBtn').addEventListener('click', () => {
    if (state.focus) { state.focus = null; saveState(); renderYou(); toast('Focus cleared'); }
    else switchTab('recall');
  });
  $('#editName').addEventListener('click', () => { const n = prompt('Your name', p.name || ''); if (n != null) { p.name = n.trim(); saveState(); renderYou(); } });
  if (typeof bindSyncCard === 'function') bindSyncCard(renderYou);
  $('#wrapBtn').addEventListener('click', shareWrapCard);
  $('#rankBtn').addEventListener('click', () => shareRankCard(matRank()));
  $('#expBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `proof-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    toast('Backup downloaded');
  });
  $('#impBtn').addEventListener('click', () => $('#impFile').click());
  $('#impFile').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(tx => {
      const d = JSON.parse(tx);
      /* Validate everything the render path will touch BEFORE writing anything — a
         throw after saveState() would report failure over already-destroyed data. */
      if (!validRecord(d)) throw 0;
      if (!confirm(`Import ${d.sessions.length} sessions? This replaces the ${state.sessions.length} on this device.`)) return;
      snapshot();
      state = Object.assign(defaults(), d);   /* merge over defaults: a file missing
                                                 recall/seen/reviewLog must not brick */
      saveState(true); applyBelt(state.profile.belt); renderYou(); toast('Backup restored');
    }).catch(() => toast('That file doesn’t look like a PROOF backup'));
  });
  const ld = $('#loadDemo'); if (ld) ld.addEventListener('click', () => {
    const n = state.sessions.length;
    if (n && !confirm(`This replaces your ${n} logged session${n > 1 ? 's' : ''} with a demo record.\n\nYou can undo it afterwards, but export a backup first if they matter.\n\nLoad demo anyway?`)) return;
    seedDemo(); renderTab('home'); toast('Demo athlete loaded — poke around');
  });
  const cd = $('#clearDemo'); if (cd) cd.addEventListener('click', () => {
    const mine = realSessions().length;
    const msg = mine
      ? `Remove the demo sessions and keep the ${mine} you logged yourself?`
      : 'Clear the demo data and start your own record?';
    if (confirm(msg)) { clearDemoOnly(); renderTab('home'); toast(mine ? `Demo cleared — your ${mine} kept` : 'Fresh mats. Your story now.'); }
  });
  $('#nukeBtn').addEventListener('click', () => { if (confirm('Erase ALL data on this device?\n\nRecoverable with "Undo last replace" until you erase again — but export a backup to be safe.')) { resetAll(); state.profile = null; saveState(true); location.reload(); } });
  const qb = $('#quarBtn'); if (qb) qb.addEventListener('click', () => {
    const q = quarantineInfo(); if (!q) return;
    if (!confirm(`Recover ${q.n} sessions saved by a newer version of PROOF? Anything currently here becomes an undo point.`)) return;
    if (recoverQuarantine()) { applyBelt(state.profile ? state.profile.belt : 'white'); renderTab('home'); toast(`Recovered ${q.n} sessions`); }
    else toast('Could not read that copy — export it from the newer device instead', 6000);
  });
  const ub = $('#undoBtn'); if (ub) ub.addEventListener('click', () => {
    const s = snapshotInfo(); if (!s) return;
    if (!confirm(`Restore the ${s.n} sessions from before the last replace? What's here now becomes the new undo point.`)) return;
    if (restoreSnapshot()) { applyBelt(state.profile ? state.profile.belt : 'white'); renderTab('home'); toast(`Restored ${s.n} sessions`); }
    else toast('Could not restore that snapshot');
  });
}

/* ── LOG FLOW ────────────────────────────────────────────── */
const draft = { type: 'gi', mins: 60, rounds: 5, intensity: 3, notes: '', parsed: null, niggleSel: {}, warmupPain: false, rolls: [] };

function openLogSheet() {
  Object.assign(draft, { type: 'gi', mins: 60, rounds: 5, intensity: 3, notes: '', parsed: null, niggleSel: {}, warmupPain: false, rolls: [] });
  openSheet(logStep1(), () => Voice.stop());
  bindLogStep1();
}
function logStep1() {
  return `
    <h2>Log session</h2><p class="sub">Ten seconds of admin, then just talk.</p>
    <div class="lbl">Type</div>
    <div class="seg">${SESSION_TYPES.map(t => `<button data-t="${t.id}" class="${draft.type === t.id ? 'on' : ''}">${t.ico} ${t.name}</button>`).join('')}</div>
    <div class="row2">
      <div><div class="lbl">Duration</div>
        <div class="stepper"><button data-d="-15">−</button><b id="durV">${fmtDur(draft.mins)}</b><button data-d="15">+</button></div></div>
      <div><div class="lbl">Rounds</div>
        <div class="stepper"><button data-r="-1">−</button><b id="rndV">${draft.rounds}</b><button data-r="1">+</button></div></div>
    </div>
    <div class="lbl">Intensity</div>
    <div class="dots" id="intDots">${[1, 2, 3, 4, 5].map(n => `<button data-i="${n}" class="${draft.intensity === n ? 'on' : ''}">${n}</button>`).join('')}</div>
    <div class="btnrow"><button class="btn" id="toCapture">Next — what happened?</button></div>`;
}
function bindLogStep1() {
  const b = $('#sheetBody');
  b.querySelectorAll('[data-t]').forEach(x => x.addEventListener('click', () => { draft.type = x.dataset.t; b.querySelectorAll('[data-t]').forEach(y => y.classList.toggle('on', y === x)); }));
  b.querySelectorAll('[data-d]').forEach(x => x.addEventListener('click', () => { draft.mins = Math.max(15, Math.min(240, draft.mins + +x.dataset.d)); $('#durV').textContent = fmtDur(draft.mins); }));
  b.querySelectorAll('[data-r]').forEach(x => x.addEventListener('click', () => { draft.rounds = Math.max(0, Math.min(20, draft.rounds + +x.dataset.r)); $('#rndV').textContent = draft.rounds; }));
  b.querySelectorAll('[data-i]').forEach(x => x.addEventListener('click', () => { draft.intensity = +x.dataset.i; b.querySelectorAll('[data-i]').forEach(y => y.classList.toggle('on', y === x)); }));
  $('#toCapture').addEventListener('click', () => { $('#sheetBody').innerHTML = logStep2(); bindLogStep2(); });
}
function logStep2() {
  const focus = state.focus ? techById(state.focus) : null;
  return `
    <h2>What happened out there?</h2>
    <p class="sub">Talk like you'd tell a mate. "Hit two triangles, got caught in a guillotine, left knee's a bit sore."${focus ? ` Did the <b style="color:var(--acc)">${esc(focus.name)}</b> come out?` : ''}</p>
    <div class="mic">
      <button class="mic-btn" id="micBtn" aria-label="Tap to talk">
        <svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/></svg>
      </button>
      <div class="mic-hint" id="micHint">tap to talk · or type below</div>
    </div>
    <textarea class="transcript" id="notesTx" placeholder="…or type it here" rows="3">${esc(draft.notes)}</textarea>
    <div id="chipZone"></div>
    <div class="lbl">Add a technique manually</div>
    <div class="addtech"><input id="techQ" placeholder="Search: armbar, knee cut, de la riva…" autocomplete="off"></div>
    <div class="tsug" id="techSug" hidden></div>
    <div class="lbl">Anything hurting? Tap the spot (tap again = worse)</div>
    <div class="bodywrap" id="nigglePick">${bodySVG({}, true, draft.niggleSel)}</div>
    <div class="lbl">Who did you roll with? <span class="tiny">tap a name, then tap how each round went</span></div>
    <div id="rollZone"></div>
    <div class="tgl">
      <div class="tgl-tx"><b>Pain during warm-up?</b><span>The honest answer is the useful one (+10 MP)</span></div>
      <button class="tgl-sw ${draft.warmupPain ? 'on' : ''}" id="wupTgl" role="switch" aria-checked="${draft.warmupPain}"></button>
    </div>
    <div class="btnrow">
      <button class="btn ghost" id="backTo1" style="flex:.6">Back</button>
      <button class="btn" id="saveSess">Save session</button>
    </div>`;
}
function reparse() {
  draft.parsed = parseNotes(draft.notes);
  drawChips();
}
function drawChips() {
  const z = $('#chipZone'); if (!z) return;
  const p = draft.parsed;
  if (!p || (!p.techs.length && !p.niggles.length)) { z.innerHTML = draft.notes.trim() ? `<p class="tiny" style="margin-top:10px">Listening for techniques… name them and they'll appear as chips.</p>` : ''; return; }
  z.innerHTML = `<div class="chips">${p.techs.map((t, i) =>
    `<span class="chip ${t.res === 'hit' ? 'hit' : t.res === 'conceded' ? 'conceded' : ''} ${t.first ? 'first' : ''}">
      <span class="c-ico">${t.res === 'hit' ? '✅' : t.res === 'conceded' ? '🩸' : TECH_CATS[t.cat].ico}</span>
      ${esc(t.name)}${t.n > 1 ? `<span class="c-n">×${t.n}</span>` : ''}${t.vs ? `<span class="c-n">vs ${t.vs}</span>` : ''}${t.first ? `<span class="c-n">FIRST</span>` : ''}
      <button class="c-x" data-rmtech="${i}" aria-label="Remove">✕</button>
    </span>`).join('')}
    ${p.niggles.map((g, i) => { const r = regionById(g.region); return `<span class="chip niggle">🩹 ${r ? r.name : g.region}<button class="c-x" data-rmnig="${i}" aria-label="Remove">✕</button></span>`; }).join('')}
  </div>`;
  z.querySelectorAll('[data-rmtech]').forEach(b => b.addEventListener('click', () => { p.techs.splice(+b.dataset.rmtech, 1); drawChips(); }));
  z.querySelectorAll('[data-rmnig]').forEach(b => b.addEventListener('click', () => { p.niggles.splice(+b.dataset.rmnig, 1); drawChips(); }));
}
function bindLogStep2() {
  bindRolls();
  const tx = $('#notesTx');
  let deb;
  tx.addEventListener('input', () => { draft.notes = tx.value; clearTimeout(deb); deb = setTimeout(reparse, 350); });
  if (draft.notes) reparse();

  const mic = $('#micBtn'), hint = $('#micHint');
  mic.addEventListener('click', () => {
    if (Voice.active) { Voice.stop(); return; }
    const ok = Voice.start(
      interim => { tx.value = (draft.notes ? draft.notes + ' ' : '') + interim; },
      final => { draft.notes = (draft.notes ? draft.notes + ' ' : '') + final; tx.value = draft.notes; reparse(); },
      () => { mic.classList.remove('rec'); hint.textContent = 'tap to talk · or type below'; }
    );
    if (ok) { mic.classList.add('rec'); hint.textContent = 'listening… tap again to stop'; }
    else { hint.textContent = 'voice not available here — typing works just as well'; tx.focus(); }
  });

  const q = $('#techQ'), sug = $('#techSug');
  q.addEventListener('input', () => {
    const res = searchTechs(q.value);
    sug.hidden = !res.length;
    sug.innerHTML = res.map(t => `<button data-add="${t.id}"><span>${TECH_CATS[t.cat].ico}</span> ${esc(t.name)}<span class="cat">${TECH_CATS[t.cat].name}</span></button>`).join('');
    sug.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
      const t = techById(b.dataset.add);
      draft.parsed = draft.parsed || { techs: [], niggles: [], feel: 3, warmupPain: false, firsts: [] };
      const ex = draft.parsed.techs.find(x => x.id === t.id);
      if (ex) ex.n++; else draft.parsed.techs.push({ id: t.id, name: t.name, cat: t.cat, res: 'hit', n: 1, vs: null, first: false });
      q.value = ''; sug.hidden = true; drawChips();
    }));
  });

  $('#nigglePick').addEventListener('click', e => {
    const r = e.target.closest('[data-region]'); if (!r) return;
    const id = r.dataset.region;
    draft.niggleSel[id] = ((draft.niggleSel[id] || 0) + 1) % 4;
    $('#nigglePick').innerHTML = bodySVG({}, true, draft.niggleSel);
  });

  $('#wupTgl').addEventListener('click', () => { draft.warmupPain = !draft.warmupPain; $('#wupTgl').classList.toggle('on', draft.warmupPain); });
  $('#backTo1').addEventListener('click', () => { $('#sheetBody').innerHTML = logStep1(); bindLogStep1(); });
  $('#saveSess').addEventListener('click', saveDraft);
}

/* ── the recap story (post-save ritual) ──────────────────── */
/* ── rounds in the log flow ───────────────────────────────── */
/* Recent partners as chips; tapping one adds a row for them. Each row is three
   outcome taps — Got them / Even / Got me — and a running count per outcome, so a
   night of six rounds with one person is six taps. New partner = name + belt. */
function drawRolls() {
  const z = $('#rollZone'); if (!z) return;
  const recent = partnerBoard().slice(0, 6).map(p => p.pid);
  const inDraft = new Set(draft.rolls.map(r => r.pid));
  const rows = [...new Set(draft.rolls.map(r => r.pid))];
  const count = (pid, out) => draft.rolls.filter(r => r.pid === pid && r.out === out).length;
  z.innerHTML = `
    ${rows.map(pid => { const p = partnerById(pid); if (!p) return ''; return `
      <div class="roll-row" data-roll="${pid}">
        <div class="roll-who"><i class="belt-dot b-${p.belt}"></i><b>${esc(p.name)}</b><span>${BELTS[p.belt].name.toLowerCase()} · ${count(pid,'won')+count(pid,'even')+count(pid,'lost')} rd</span></div>
        <div class="roll-outs">
          ${OUTS.map(o => `<button class="roll-out o-${o}" data-out="${o}">${o === 'won' ? 'Got them' : o === 'even' ? 'Even' : 'Got me'}${count(pid,o) ? `<em>${count(pid,o)}</em>` : ''}</button>`).join('')}
        </div>
        <button class="roll-x" data-roll-x="${pid}" aria-label="Remove">✕</button>
      </div>`; }).join('')}
    <div class="chips roll-chips">
      ${recent.filter(pid => !inDraft.has(pid)).map(pid => { const p = partnerById(pid); return `<button class="chip" data-roll-add="${pid}"><i class="belt-dot b-${p.belt}"></i>${esc(p.name)}</button>`; }).join('')}
      <button class="chip ghost" id="rollNew">+ someone new</button>
    </div>
    <form class="roll-new" id="rollNewForm" hidden>
      <input id="rollName" placeholder="Name (optional)" maxlength="40" autocomplete="off">
      <div class="roll-belts">${BELT_ORDER.map(b => `<button type="button" class="belt-pick b-${b}" data-belt="${b}" aria-label="${BELTS[b].name}"></button>`).join('')}</div>
      <button type="submit" class="btn small">Add</button>
    </form>`;
  bindRolls();
}
let rollNewBelt = 'blue';
function bindRolls() {
  const z = $('#rollZone'); if (!z) return;
  if (!z.innerHTML.trim()) { drawRolls(); return; }
  z.querySelectorAll('[data-roll-add]').forEach(b => b.onclick = () => addRollRow(b.dataset.rollAdd));
  z.querySelectorAll('[data-roll]').forEach(row => {
    const pid = row.dataset.roll;
    row.querySelectorAll('[data-out]').forEach(b => b.onclick = () => { draft.rolls.push({ pid, out: b.dataset.out }); drawRolls(); });
  });
  z.querySelectorAll('[data-roll-x]').forEach(b => b.onclick = () => { draft.rolls = draft.rolls.filter(r => r.pid !== b.dataset.rollX); rollRows.delete(b.dataset.rollX); drawRolls(); });
  const nb = $('#rollNew'); if (nb) nb.onclick = () => { const f = $('#rollNewForm'); f.hidden = !f.hidden; if (!f.hidden) { paintBelt(); $('#rollName').focus(); } };
  const paintBelt = () => z.querySelectorAll('.belt-pick').forEach(b => b.classList.toggle('on', b.dataset.belt === rollNewBelt));
  z.querySelectorAll('.belt-pick').forEach(b => b.onclick = () => { rollNewBelt = b.dataset.belt; paintBelt(); });
  const f = $('#rollNewForm'); if (f) f.onsubmit = e => { e.preventDefault(); const pid = addPartner($('#rollName').value, rollNewBelt); addRollRow(pid); };
}
/* a partner can be on the sheet with zero rounds logged yet — track that separately
   from draft.rolls so the row shows before the first outcome tap */
const rollRows = new Set();
function addRollRow(pid) { rollRows.add(pid); if (!draft.rolls.some(r => r.pid === pid)) draft.rolls.push({ pid, out: '' }); drawRolls(); }

function saveDraft() {
  Voice.stop();
  const p = draft.parsed || parseNotes(draft.notes);
  const niggles = [...p.niggles];
  for (const [region, sev] of Object.entries(draft.niggleSel)) {
    if (!sev) continue;
    const ex = niggles.find(n => n.region === region);
    if (ex) ex.sev = Math.max(ex.sev, sev); else niggles.push({ region, sev });
  }
  const sess = {
    ts: Date.now(), type: draft.type, mins: draft.mins, rounds: draft.rounds,
    intensity: draft.intensity, feel: p.feel, warmupPain: draft.warmupPain || p.warmupPain,
    notes: draft.notes.trim(), techs: p.techs.map(({ first, ...t }) => t), niggles,
    rolls: draft.rolls.filter(r => OUTS.includes(r.out)).map(r => ({ pid: r.pid, out: r.out })),
  };
  const mpBefore = totalMP();
  const questsBefore = questsFor().filter(q => q.done).map(q => q.id);
  const fresh = addSession(sess);
  if (!lastSaveOK) {
    /* The write did not land. Do not run the recap — telling someone "+120 MP" for a
       session that is not on disk is worse than telling them nothing. */
    toast('⚠️ This session did NOT save. Export a backup, then log it again.', 9000);
    return;
  }
  markProofsSeen(fresh.map(x => x.id));
  const mpAfter = totalMP();
  const questsAfter = questsFor().filter(q => q.done);
  const newQuests = questsAfter.filter(q => !questsBefore.includes(q.id));
  const rank = matRank();
  const chain = weekStreak();
  const L = lifetime();
  const due = recallDue();
  const hits = sess.techs.filter(t => t.res === 'hit');
  const gained = mpAfter - mpBefore;

  const cards = [];
  cards.push(`
    <div class="story-card">
      <div class="story-k">Logged</div>
      <div class="story-big">#${L.sessions}</div>
      <p class="story-sub">${fmtDur(sess.mins)} · ${sess.rounds} rounds · ${L.hours}h lifetime</p>
      <div><span class="mp-pop">+<span id="mpGain">0</span> MP</span></div>
    </div>`);
  if (hits.length || fresh.length) {
    cards.push(`
      <div class="story-card">
        <div class="story-k">${fresh.length ? 'Proof unlocked' : 'What you landed'}</div>
        ${hits.length ? `<div class="chips" style="justify-content:center">${hits.map(t =>
          `<span class="chip hit"><span class="c-ico">✅</span>${esc(t.name)}${t.n > 1 ? `<span class="c-n">×${t.n}</span>` : ''}${t.vs ? `<span class="c-n">vs ${t.vs}</span>` : ''}</span>`).join('')}</div>` : ''}
        <div class="story-list">${fresh.slice(0, 2).map(x => proofCard(x, true)).join('')}</div>
      </div>`);
  }
  cards.push(`
    <div class="story-card">
      <div class="story-k">The week</div>
      <div class="story-big" style="font-size:46px">${weekStats().sessions}/${weekStats().target}<small> sessions</small></div>
      ${newQuests.length ? `<p class="story-sub" style="margin-bottom:10px">Quest${newQuests.length > 1 ? 's' : ''} complete:</p><div class="story-list">${newQuests.map(questRow).join('')}</div>`
        : `<p class="story-sub">${chain.curMet ? `Week made — chain at ${chain.streak}. 🔥` : `${weekStats().target - weekStats().sessions} more for the week. The chain is watching.`}</p>`}
    </div>`);
  if (sess.niggles.length || sess.warmupPain) {
    const names = sess.niggles.map(g => (regionById(g.region) || {}).name || g.region).join(', ');
    cards.push(`
      <div class="story-card">
        <div class="story-k">Body noted</div>
        <div style="font-size:44px;margin-bottom:8px">🩹</div>
        <p class="story-sub"><b style="color:var(--tx)">${esc(names || 'Warm-up pain')} logged.</b> Honesty pays — PROOF is watching for patterns so this stays a niggle, not a layoff.</p>
      </div>`);
  }
  cards.push(`
    <div class="story-card">
      <div class="story-k">Rank ${rank.lvl} · ${esc(rank.name)}</div>
      <div class="xp" style="max-width:220px;margin:10px auto 8px"><i id="storyXp"></i></div>
      <p class="story-sub" style="margin-bottom:16px">${rank.next - rank.mp} MP to “${rankOf(rank.next).name}”.${due.length ? ` ${due.length} recall check-in${due.length > 1 ? 's' : ''} waiting — easy points.` : ''}</p>
      <div class="btnrow" style="margin-top:4px">
        <button class="btn small ghost" id="poShare">Share card</button>
        <button class="btn small" id="poDone">Done</button>
      </div>
    </div>`);

  $('#sheetBody').innerHTML = `
    <div class="story-k" style="text-align:center;margin:4px 0 10px;font:700 10.5px/1 var(--f-mono);letter-spacing:.2em;color:var(--tx-3)">SESSION RECAP — SWIPE</div>
    <div class="story" id="story">${cards.join('')}</div>
    <div class="story-dots" id="storyDots">${cards.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</div>`;

  const story = $('#story'), dots = [...$('#storyDots').children];
  story.addEventListener('scroll', () => {
    const i = Math.round(story.scrollLeft / story.clientWidth);
    dots.forEach((d, j) => d.classList.toggle('on', j === i));
  }, { passive: true });

  countUp($('#mpGain'), gained, { dur: 1000 });
  setTimeout(() => { const x = $('#storyXp'); if (x) x.style.width = rank.pct + '%'; }, 150);
  bindProofShares($('#sheetBody'));
  setTimeout(() => { const r = $('#sheet').getBoundingClientRect(); burst(r.left + r.width / 2, r.top + 80); }, 300);
  $('#poDone').addEventListener('click', () => { closeSheet(); renderTab('home'); });
  $('#poShare').addEventListener('click', () => shareSessionCard(state.sessions[state.sessions.length - 1]));
}

/* ── ONBOARDING ──────────────────────────────────────────── */
function renderOnboarding() {
  const wrap = $('#onbSlides');
  let step = 0, belt = 'white', name = '', target = 3;
  const dots = () => `<div class="onb-dots">${[0, 1, 2].map(i => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>`;
  const slides = [
    () => `
      <div class="onb-art"><svg class="bigmark" viewBox="0 0 40 40"><path class="wm-a" d="M6 26 L20 10 L27 17 L13 33 Z"/><path class="wm-b" d="M13 10 L34 26 L27 33 L6 17 Z"/></svg></div>
      ${dots()}
      <h1>Jiu-jitsu, <em>measured.</em></h1>
      <p class="lead">95% of people quit before black belt — almost always because progress went invisible. PROOF is the record: log a session in 30 seconds, and it shows you the evidence you're getting better, watches your body's warning lights, and resurfaces techniques before you forget them.</p>
      <button class="btn" id="onbNext">Start the record</button>`,
    () => `
      <div style="height:24px"></div>
      ${dots()}
      <h1>Your belt.<br><em>Your colours.</em></h1>
      <p class="lead">The whole app themes itself to your rank — and levels up when you do.</p>
      <div class="beltpick">
        ${BELT_ORDER.map(b => `<button data-b="${b}" class="${belt === b ? 'on' : ''}"><span class="b-band" style="background:${BELTS[b].hex}"></span>${BELTS[b].name} belt</button>`).join('')}
      </div>
      <button class="btn" id="onbNext">That's me</button>`,
    () => `
      <div style="height:24px"></div>
      ${dots()}
      <h1>Last thing.</h1>
      <p class="lead">A name for the record, and an honest weekly target — consistency beats heroics.</p>
      <input type="text" id="onbName" placeholder="Your name" value="${esc(name)}" autocomplete="given-name">
      <div class="lbl">Sessions per week</div>
      <div class="dots" style="margin-bottom:26px">${[1, 2, 3, 4, 5, 6].map(n => `<button data-tg="${n}" class="${target === n ? 'on' : ''}">${n}</button>`).join('')}</div>
      <button class="btn" id="onbGo">Step on the mat</button>
      <button class="btn ghost" id="onbDemo" style="margin-top:10px">Explore with demo data first</button>`,
  ];
  const draw = () => {
    wrap.innerHTML = slides[step]();
    const nx = $('#onbNext'); if (nx) nx.addEventListener('click', () => { step++; draw(); });
    wrap.querySelectorAll('[data-b]').forEach(b => b.addEventListener('click', () => { belt = b.dataset.b; applyBelt(belt); draw(); }));
    wrap.querySelectorAll('[data-tg]').forEach(b => b.addEventListener('click', () => { target = +b.dataset.tg; draw(); }));
    const nameIn = $('#onbName'); if (nameIn) nameIn.addEventListener('input', () => name = nameIn.value);
    const done = demo => {
      state.profile = { name: name.trim() || 'Athlete', belt, stripes: 0, weeklyTarget: target, createdTs: Date.now() };
      saveState();
      if (demo) seedDemo();
      $('#onb').hidden = true; $('#app').hidden = false;
      applyBelt(belt); renderTab('home');
      toast(demo ? 'Demo athlete loaded — this is 5 months in' : 'Day one. It counts.');
    };
    const go = $('#onbGo'); if (go) go.addEventListener('click', () => done(false));
    const dm = $('#onbDemo'); if (dm) dm.addEventListener('click', () => done(true));
  };
  applyBelt(belt);
  draw();
}

/* ── SHARE CARDS (canvas 1080×1350) ──────────────────────── */
async function drawCardBase(ctx, kicker) {
  await document.fonts.ready;
  const acc = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim();
  ctx.clearRect(0, 0, 1080, 1350);
  ctx.fillStyle = '#0a0d12'; ctx.fillRect(0, 0, 1080, 1350);
  ctx.strokeStyle = 'rgba(255,255,255,.028)'; ctx.lineWidth = 2;
  for (let x = 0; x < 1080; x += 54) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1350); ctx.stroke(); }
  for (let y = 0; y < 1350; y += 54) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1080, y); ctx.stroke(); }
  const g = ctx.createRadialGradient(540, -100, 60, 540, -100, 900);
  g.addColorStop(0, acc + '33'); g.addColorStop(1, 'transparent');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 700);
  ctx.fillStyle = acc;
  ctx.save(); ctx.translate(84, 84); ctx.scale(1.5, 1.5);
  ctx.beginPath(); ctx.moveTo(6, 26); ctx.lineTo(20, 10); ctx.lineTo(27, 17); ctx.lineTo(13, 33); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = .55;
  ctx.beginPath(); ctx.moveTo(13, 10); ctx.lineTo(34, 26); ctx.lineTo(27, 33); ctx.lineTo(6, 17); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1; ctx.restore();
  ctx.font = '800 44px "Bricolage Grotesque", sans-serif';
  ctx.fillStyle = '#f2f3f5';
  ctx.fillText('P R O O F', 160, 128);
  ctx.font = '600 24px "Spline Sans Mono", monospace';
  ctx.fillStyle = '#66707f'; ctx.fillText(kicker.toUpperCase(), 86, 200);
  ctx.fillStyle = acc; ctx.fillRect(0, 1290, 1080, 60);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(880, 1290, 44, 60);
  return acc;
}
async function finishCard(title) {
  const cv = $('#shareCanvas');
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  const file = new File([blob], title + '.png', { type: 'image/png' });
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return; } catch (e) { /* cancelled */ }
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = title + '.png'; a.click();
    URL.revokeObjectURL(a.href);
    toast('Card saved — fire it into the group chat');
  }
}
async function shareSessionCard(s) {
  const cv = $('#shareCanvas'), ctx = cv.getContext('2d');
  const acc = await drawCardBase(ctx, 'session logged');
  const st = SESSION_TYPES.find(x => x.id === s.type) || SESSION_TYPES[0];
  const idx = state.sessions.findIndex(x => x.id === s.id) + 1;
  ctx.fillStyle = '#f2f3f5'; ctx.font = '800 190px "Bricolage Grotesque", sans-serif';
  ctx.fillText('#' + idx, 80, 480);
  ctx.font = '700 52px "Bricolage Grotesque", sans-serif';
  ctx.fillText(`${st.name} · ${fmtDur(s.mins)} · ${s.rounds} rounds`, 84, 570);
  ctx.font = '500 34px "Spline Sans Mono", monospace'; ctx.fillStyle = '#9aa3b2';
  ctx.fillText(new Date(s.ts).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }), 84, 630);
  let y = 740;
  const hits = (s.techs || []).filter(t => t.res === 'hit');
  if (hits.length) {
    ctx.fillStyle = '#66707f'; ctx.font = '600 26px "Spline Sans Mono", monospace';
    ctx.fillText('LANDED', 84, y); y += 62;
    ctx.font = '700 46px "Bricolage Grotesque", sans-serif';
    for (const t of hits.slice(0, 5)) {
      ctx.fillStyle = acc; ctx.fillText('◆', 84, y);
      ctx.fillStyle = '#f2f3f5';
      ctx.fillText(`${t.name}${t.n > 1 ? '  ×' + t.n : ''}${t.vs ? '  vs ' + t.vs : ''}`, 140, y);
      y += 66;
    }
  }
  const L = lifetime(), r = matRank();
  ctx.fillStyle = '#9aa3b2'; ctx.font = '500 30px "Spline Sans Mono", monospace';
  ctx.fillText(`${L.hours}h lifetime · rank ${r.lvl} “${r.name}” · +${sessionMP(s)} MP`, 84, 1240);
  await finishCard('proof-session-' + idx);
}
async function shareProofCard(p) {
  const cv = $('#shareCanvas'), ctx = cv.getContext('2d');
  await drawCardBase(ctx, 'proof unlocked');
  ctx.font = '200px serif'; ctx.fillText(p.icon, 84, 500);
  ctx.fillStyle = '#f2f3f5'; ctx.font = '800 92px "Bricolage Grotesque", sans-serif';
  wrapText(ctx, p.title, 84, 680, 900, 100);
  ctx.fillStyle = '#9aa3b2'; ctx.font = '500 40px "Inter", sans-serif';
  wrapText(ctx, p.sub, 84, 850, 900, 56);
  ctx.fillStyle = '#66707f'; ctx.font = '500 30px "Spline Sans Mono", monospace';
  ctx.fillText(fmtDate(p.ts) + ' · earned on the mat', 84, 1240);
  await finishCard('proof-' + p.id);
}
async function shareRankCard(r) {
  const cv = $('#shareCanvas'), ctx = cv.getContext('2d');
  const acc = await drawCardBase(ctx, 'mat rank');
  ctx.fillStyle = acc; ctx.font = '800 260px "Bricolage Grotesque", sans-serif';
  ctx.fillText(String(r.lvl), 84, 560);
  ctx.fillStyle = '#f2f3f5'; ctx.font = '800 92px "Bricolage Grotesque", sans-serif';
  wrapText(ctx, r.name, 84, 690, 900, 100);
  ctx.fillStyle = '#9aa3b2'; ctx.font = '500 40px "Inter", sans-serif';
  wrapText(ctx, `${r.mp.toLocaleString()} Mat Points — earned one honest session at a time.`, 84, 810, 880, 56);
  const L = lifetime();
  ctx.fillStyle = '#66707f'; ctx.font = '500 30px "Spline Sans Mono", monospace';
  ctx.fillText(`${L.sessions} sessions · ${L.hours}h · ${L.rounds} rounds`, 84, 1240);
  await finishCard('proof-rank-' + r.lvl);
}
async function shareWrapCard() {
  const cv = $('#shareCanvas'), ctx = cv.getContext('2d');
  const acc = await drawCardBase(ctx, 'this month on the mat');
  const m0 = new Date(); m0.setDate(1); m0.setHours(0, 0, 0, 0);
  const ss = state.sessions.filter(s => s.ts >= m0.getTime());
  const mins = ss.reduce((a, s) => a + s.mins, 0), rounds = ss.reduce((a, s) => a + (s.rounds || 0), 0);
  const hits = {};
  ss.forEach(s => (s.techs || []).filter(t => t.res === 'hit').forEach(t => hits[t.name] = (hits[t.name] || 0) + t.n));
  const top = Object.entries(hits).sort((a, b) => b[1] - a[1])[0];
  const month = new Date().toLocaleDateString('en-AU', { month: 'long' });
  ctx.fillStyle = '#f2f3f5'; ctx.font = '800 110px "Bricolage Grotesque", sans-serif';
  ctx.fillText(month, 84, 440);
  const rows = [
    [ss.length, 'sessions'], [fmtHours(mins) + 'h', 'on the mat'], [rounds, 'rounds'],
    [top ? top[0] : '—', top ? `top weapon ×${top[1]}` : 'top weapon'],
  ];
  let y = 600;
  for (const [big, small] of rows) {
    ctx.fillStyle = acc; ctx.font = '800 84px "Bricolage Grotesque", sans-serif';
    ctx.fillText(String(big), 84, y);
    ctx.fillStyle = '#66707f'; ctx.font = '600 30px "Spline Sans Mono", monospace';
    ctx.fillText(String(small).toUpperCase(), 84, y + 44);
    y += 160;
  }
  await finishCard('proof-' + month.toLowerCase());
}
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = String(text).split(' ');
  let line = '';
  for (const w of words) {
    if (ctx.measureText(line + w).width > maxW && line) { ctx.fillText(line, x, y); line = w + ' '; y += lh; }
    else line += w + ' ';
  }
  ctx.fillText(line.trim(), x, y);
}

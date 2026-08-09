/* ══════════════════════════════════════════════════════════
   app.js — boot, tab routing, voice controller, PWA glue.
   ══════════════════════════════════════════════════════════ */

let currentTab = 'home';

function renderTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  if (tab === 'home') renderHome();
  else if (tab === 'proof') renderProof();
  else if (tab === 'body') renderBody();
  else if (tab === 'recall') renderRecall();
  else if (tab === 'you') renderYou();
  view().scrollTop = 0;
  window.scrollTo(0, 0);
}
function switchTab(tab) { renderTab(tab); }

/* ── voice controller (Web Speech API) ───────────────────── */
const Voice = {
  rec: null, active: false,
  start(onInterim, onFinal, onEnd) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return false;
    try {
      const r = new SR();
      r.lang = 'en-AU'; r.interimResults = true; r.continuous = true; r.maxAlternatives = 1;
      let finalBuf = '';
      r.onresult = e => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) { finalBuf += t + ' '; onFinal(t.trim()); }
          else interim += t;
        }
        if (interim) onInterim((finalBuf + interim).trim());
      };
      r.onend = () => { this.active = false; this.rec = null; onEnd(); };
      r.onerror = () => { this.active = false; try { r.stop(); } catch (e) {} };
      r.start();
      this.rec = r; this.active = true;
      return true;
    } catch (e) { return false; }
  },
  stop() { if (this.rec) { try { this.rec.stop(); } catch (e) {} } this.active = false; },
};

/* ── wiring ──────────────────────────────────────────────── */
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => renderTab(b.dataset.tab)));
document.getElementById('fabLog').addEventListener('click', openLogSheet);
document.getElementById('scrim').addEventListener('click', closeSheet);
document.getElementById('beltChip').addEventListener('click', () => renderTab('you'));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.getElementById('sheet').hidden) closeSheet(); });

/* swipe down on grab-handle closes sheet */
(() => {
  const sheet = document.getElementById('sheet');
  let y0 = null;
  sheet.addEventListener('touchstart', e => { if (sheet.scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchmove', e => {
    if (y0 == null) return;
    const dy = e.touches[0].clientY - y0;
    if (dy > 90 && document.getElementById('sheetBody').scrollTop === 0) { y0 = null; closeSheet(); }
  }, { passive: true });
  sheet.addEventListener('touchend', () => y0 = null);
})();

/* ── boot ────────────────────────────────────────────────── */
loadState();
if (hasProfile()) {
  document.getElementById('app').hidden = false;
  applyBelt(state.profile.belt);
  renderTab('home');
} else {
  document.getElementById('onb').hidden = false;
  renderOnboarding();
}

/* PWA */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

/* ══════════════════════════════════════════════════════════
   taxonomy.js — the BJJ brain.
   Belt themes, technique vocabulary, body regions, and the
   parser that turns "hit two triangles, knee's a bit sore"
   into structured data. Pure functions, no state.
   ══════════════════════════════════════════════════════════ */

const BELTS = {
  white:  { name: 'White',  hex: '#e9e6dd' },
  blue:   { name: 'Blue',   hex: '#5b96f7' },
  purple: { name: 'Purple', hex: '#a583fa' },
  brown:  { name: 'Brown',  hex: '#c98d57' },
  black:  { name: 'Black',  hex: '#e6bb4f' },
};
const BELT_ORDER = ['white', 'blue', 'purple', 'brown', 'black'];

const SESSION_TYPES = [
  { id: 'gi',    name: 'Gi',        ico: '🥋' },
  { id: 'nogi',  name: 'No-Gi',     ico: '🩳' },
  { id: 'open',  name: 'Open mat',  ico: '🤼' },
  { id: 'comp',  name: 'Comp',      ico: '🏆' },
  { id: 'drill', name: 'Drilling',  ico: '🔁' },
  { id: 'priv',  name: 'Private',   ico: '🎯' },
];

const TECH_CATS = {
  sub:     { name: 'Submission', ico: '🔒' },
  sweep:   { name: 'Sweep',      ico: '🔄' },
  pass:    { name: 'Pass',       ico: '➡️' },
  escape:  { name: 'Escape',     ico: '🚪' },
  td:      { name: 'Takedown',   ico: '🤸' },
  guard:   { name: 'Guard',      ico: '🛡️' },
  control: { name: 'Control',    ico: '⚓' },
};

/* [id, name, cat, aliases...] — aliases include spoken/passive forms */
const TECH_DEFS = [
  /* submissions */
  ['armbar', 'Armbar', 'sub', 'arm bar', 'armbarred', 'juji'],
  ['triangle', 'Triangle', 'sub', 'triangle choke', 'triangled', 'triangles'],
  ['rnc', 'Rear-Naked Choke', 'sub', 'rear naked', 'rear naked choke', 'mata leao'],
  ['kimura', 'Kimura', 'sub', 'kimuras'],
  ['americana', 'Americana', 'sub', 'keylock', 'key lock'],
  ['guillotine', 'Guillotine', 'sub', 'guillotined', 'guillotines'],
  ['arm-triangle', 'Arm Triangle', 'sub', 'arm triangle', 'head and arm', 'kata gatame'],
  ['darce', "D'Arce", 'sub', 'darce', 'darce choke', 'd arce'],
  ['anaconda', 'Anaconda', 'sub', 'anaconda choke'],
  ['ezekiel', 'Ezekiel', 'sub', 'ezekiel choke'],
  ['omoplata', 'Omoplata', 'sub', 'omoplatas'],
  ['gogoplata', 'Gogoplata', 'sub'],
  ['heel-hook', 'Heel Hook', 'sub', 'heel hook', 'heel hooked', 'inside heel hook', 'outside heel hook'],
  ['kneebar', 'Kneebar', 'sub', 'knee bar'],
  ['toe-hold', 'Toe Hold', 'sub', 'toe hold', 'toehold'],
  ['ankle-lock', 'Ankle Lock', 'sub', 'ankle lock', 'straight ankle', 'achilles lock', 'footlock', 'foot lock'],
  ['cross-collar', 'Cross-Collar Choke', 'sub', 'cross collar', 'collar choke', 'cross choke'],
  ['bow-arrow', 'Bow & Arrow', 'sub', 'bow and arrow'],
  ['loop-choke', 'Loop Choke', 'sub', 'loop choked'],
  ['clock-choke', 'Clock Choke', 'sub', 'clock'],
  ['baseball-choke', 'Baseball Choke', 'sub', 'baseball bat choke'],
  ['north-south-choke', 'North-South Choke', 'sub', 'north south choke'],
  ['paper-cutter', 'Paper Cutter', 'sub', 'paper cutter choke', 'breadcutter', 'bread cutter'],
  ['wrist-lock', 'Wrist Lock', 'sub', 'wristlock', 'wrist locked'],
  ['calf-slicer', 'Calf Slicer', 'sub', 'calf crush'],
  ['twister', 'Twister', 'sub'],
  /* sweeps */
  ['scissor-sweep', 'Scissor Sweep', 'sweep', 'scissor'],
  ['hip-bump', 'Hip Bump Sweep', 'sweep', 'hip bump'],
  ['flower-sweep', 'Flower Sweep', 'sweep', 'pendulum sweep', 'pendulum'],
  ['butterfly-sweep', 'Butterfly Sweep', 'sweep', 'hook sweep'],
  ['x-sweep', 'X-Guard Sweep', 'sweep', 'x guard sweep', 'technical stand up sweep'],
  ['tripod-sweep', 'Tripod Sweep', 'sweep'],
  ['lumberjack', 'Lumberjack Sweep', 'sweep'],
  ['old-school', 'Old School Sweep', 'sweep', 'old school'],
  ['john-wayne', 'John Wayne Sweep', 'sweep'],
  ['berimbolo', 'Berimbolo', 'sweep', 'bolo'],
  ['sweep', 'Sweep (general)', 'sweep', 'swept', 'sweeps'],
  /* passes */
  ['knee-cut', 'Knee Cut', 'pass', 'knee slice', 'knee cut pass', 'knee slide'],
  ['torreando', 'Torreando', 'pass', 'toreando', 'bullfighter pass', 'bull fighter'],
  ['over-under', 'Over-Under Pass', 'pass', 'over under'],
  ['double-under', 'Double-Under Pass', 'pass', 'double under', 'stack pass'],
  ['smash-pass', 'Smash Pass', 'pass', 'smash passed'],
  ['leg-drag', 'Leg Drag', 'pass', 'leg dragged'],
  ['body-lock-pass', 'Body Lock Pass', 'pass', 'body lock pass', 'bodylock pass'],
  ['long-step', 'Long Step Pass', 'pass', 'long step'],
  ['pass', 'Guard Pass (general)', 'pass', 'passed', 'passed guard', 'passes'],
  /* escapes */
  ['shrimp-escape', 'Hip Escape', 'escape', 'shrimp', 'shrimped', 'hip escape'],
  ['bridge-roll', 'Bridge & Roll', 'escape', 'upa', 'bridge and roll', 'bump and roll'],
  ['elbow-knee-escape', 'Elbow-Knee Escape', 'escape', 'elbow knee', 'elbow escape'],
  ['back-escape', 'Back Escape', 'escape', 'escaped the back', 'escaped back'],
  ['mount-escape', 'Mount Escape', 'escape', 'escaped mount', 'escaped the mount'],
  ['side-escape', 'Side Control Escape', 'escape', 'escaped side control', 'escaped side'],
  ['guard-recovery', 'Guard Recovery', 'escape', 'recovered guard', 'reguard', 're-guard'],
  /* takedowns */
  ['double-leg', 'Double Leg', 'td', 'double legged', 'double'],
  ['single-leg', 'Single Leg', 'td', 'single legged', 'single'],
  ['osoto-gari', 'Osoto Gari', 'td', 'osoto'],
  ['seoi-nage', 'Seoi Nage', 'td', 'seoi'],
  ['uchi-mata', 'Uchi Mata', 'td'],
  ['foot-sweep', 'Foot Sweep', 'td', 'ashi waza', 'foot swept'],
  ['ankle-pick', 'Ankle Pick', 'td', 'ankle picked'],
  ['arm-drag', 'Arm Drag', 'td', 'arm dragged'],
  ['snap-down', 'Snap Down', 'td', 'snapdown', 'snapped down'],
  ['takedown', 'Takedown (general)', 'td', 'took him down', 'took her down', 'took them down'],
  /* guards */
  ['closed-guard', 'Closed Guard', 'guard', 'full guard'],
  ['half-guard', 'Half Guard', 'guard', 'half'],
  ['deep-half', 'Deep Half', 'guard', 'deep half guard'],
  ['butterfly-guard', 'Butterfly Guard', 'guard', 'butterfly'],
  ['open-guard', 'Open Guard', 'guard'],
  ['dlr', 'De La Riva', 'guard', 'de la riva', 'dlr guard'],
  ['rdlr', 'Reverse De La Riva', 'guard', 'reverse de la riva'],
  ['spider-guard', 'Spider Guard', 'guard', 'spider'],
  ['lasso', 'Lasso Guard', 'guard', 'lasso guard'],
  ['x-guard', 'X-Guard', 'guard', 'x guard'],
  ['slx', 'Single-Leg X', 'guard', 'single leg x', 'ashi garami', 'ashi'],
  ['k-guard', 'K-Guard', 'guard', 'k guard'],
  ['rubber-guard', 'Rubber Guard', 'guard'],
  ['worm-guard', 'Worm Guard', 'guard'],
  ['fifty-fifty', '50/50', 'guard', '50 50', 'fifty fifty'],
  ['turtle', 'Turtle', 'guard', 'turtled'],
  /* control / positions */
  ['mount', 'Mount', 'control', 'mounted', 'full mount', 'high mount'],
  ['back-control', 'Back Control', 'control', 'took the back', 'back take', 'got the back', 'back mount', 'hooks in'],
  ['side-control', 'Side Control', 'control', 'side mount', 'cross side'],
  ['knee-on-belly', 'Knee on Belly', 'control', 'knee on belly', 'knee ride', 'kob'],
  ['north-south', 'North-South', 'control', 'north south'],
  ['crucifix', 'Crucifix', 'control'],
  ['body-triangle', 'Body Triangle', 'control', 'body lock'],
  ['front-headlock', 'Front Headlock', 'control', 'front head lock'],
];

const TECHS = TECH_DEFS.map(d => ({ id: d[0], name: d[1], cat: d[2], aliases: [d[1].toLowerCase(), ...d.slice(3)] }));
const TECH_BY_ID = Object.fromEntries(TECHS.map(t => [t.id, t]));
function techById(id) { return TECH_BY_ID[id]; }

/* ── body regions (front-view map) ───────────────────────── */
const REGIONS = [
  { id: 'head',    name: 'Head',       aliases: ['head', 'skull', 'eye', 'nose', 'jaw', 'ear', 'cauliflower'] },
  { id: 'neck',    name: 'Neck',       aliases: ['neck', 'trap', 'traps'] },
  { id: 'shoulder-l', name: 'L Shoulder', aliases: [] },
  { id: 'shoulder-r', name: 'R Shoulder', aliases: [] },
  { id: 'elbow-l', name: 'L Elbow',    aliases: [] },
  { id: 'elbow-r', name: 'R Elbow',    aliases: [] },
  { id: 'hand-l',  name: 'L Hand',     aliases: [] },
  { id: 'hand-r',  name: 'R Hand',     aliases: [] },
  { id: 'ribs',    name: 'Ribs',       aliases: ['rib', 'ribs', 'chest', 'sternum'] },
  { id: 'back',    name: 'Lower Back', aliases: ['back', 'lower back', 'spine'] },
  { id: 'hip-l',   name: 'L Hip',      aliases: [] },
  { id: 'hip-r',   name: 'R Hip',      aliases: [] },
  { id: 'knee-l',  name: 'L Knee',     aliases: [] },
  { id: 'knee-r',  name: 'R Knee',     aliases: [] },
  { id: 'ankle-l', name: 'L Ankle',    aliases: [] },
  { id: 'ankle-r', name: 'R Ankle',    aliases: [] },
];
/* words → base region (side resolved by 'left/right' in context) */
const REGION_WORDS = [
  ['shoulder', 'shoulder'], ['rotator', 'shoulder'],
  ['elbow', 'elbow'], ['forearm', 'elbow'], ['bicep', 'elbow'],
  ['wrist', 'hand'], ['hand', 'hand'], ['finger', 'hand'], ['fingers', 'hand'], ['thumb', 'hand'], ['knuckle', 'hand'],
  ['hip', 'hip'], ['groin', 'hip'], ['hamstring', 'hip'], ['quad', 'hip'], ['glute', 'hip'],
  ['knee', 'knee'], ['mcl', 'knee'], ['acl', 'knee'], ['meniscus', 'knee'], ['calf', 'knee'], ['shin', 'knee'],
  ['ankle', 'ankle'], ['foot', 'ankle'], ['toe', 'ankle'], ['toes', 'ankle'], ['achilles', 'ankle'],
  ['rib', 'ribs'], ['ribs', 'ribs'], ['chest', 'ribs'], ['sternum', 'ribs'],
  ['neck', 'neck'], ['trap', 'neck'],
  ['back', 'back'], ['spine', 'back'],
  ['head', 'head'], ['ear', 'head'], ['nose', 'head'], ['jaw', 'head'], ['eye', 'head'],
];
const SIDED = ['shoulder', 'elbow', 'hand', 'hip', 'knee', 'ankle'];

function regionById(id) { return REGIONS.find(r => r.id === id); }

/* ── the parser ──────────────────────────────────────────── */
const NUM_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, couple: 2, few: 3 };
const PAIN_WORDS = /\b(sore|tweak(?:ed)?|tight|cranky|hurt(?:s|ing)?|pain(?:ful)?|bang(?:ed)? up|jam(?:med)?|popp?(?:ed)?|strain(?:ed)?|niggl(?:e|y|ing)|tender|ach(?:e|y|ing)|swollen|stiff|dodgy|buggered|rooted)\b/;
const SEV3 = /\b(popp?ed|strain(?:ed)?|torn|tore|swollen|can'?t|really hurt|agony|buggered|rooted)\b/;
const SEV1 = /\b(bit|little|slightly|touch|tad|mildly|cranky|tight|stiff|niggl)\b/;
const CONCEDE_BEFORE = /(tapped (?:to|out to)|got (?:caught|stuck|hit|smashed|subbed|finished|choked)(?: (?:in|with|by))?|caught (?:me )?in|lost to|gave up|defend(?:ed|ing)(?: a| the)?|got put in)\s*(?:a |an |the )?$/;
const PASSIVE_GOT = /\b(?:got|was|kept getting|getting)\s+$/;
const HIT_NEAR = /\b(hit|land(?:ed)?|finish(?:ed)?|nail(?:ed)?|got|caught|secur(?:ed)?|lock(?:ed)? (?:up|in)|tapped (?:him|her|them|a|the|everyone)|submitted|swept|pass(?:ed)?|escap(?:ed)?|took|scor(?:ed)?|won with|finally)\b/;
const DRILL_NEAR = /\b(drill(?:ed|ing)?|work(?:ed|ing)?(?: on)?|practic(?:ed|ing)|rep(?:ped|s|ping)?|position(?:al)? sparring|flow(?:ed|ing)? through)\b/;
const LEARN_NEAR = /\b(learn(?:ed|t)|taught|showed (?:us|me)|covered|went (?:over|through)|lesson (?:was|on)|class (?:was|on)|technique of the day)\b/;
const FIRST_NEAR = /\b(first (?:time|ever)|finally (?:hit|got|landed|caught)|never (?:hit|got) (?:one|that|it) before|breakthrough)\b/;

function esc_rx(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function parseNotes(raw) {
  const text = ' ' + (raw || '').toLowerCase().replace(/\s+/g, ' ') + ' ';
  const out = { techs: [], niggles: [], feel: 3, warmupPain: false, firsts: [] };
  if (!raw || !raw.trim()) return out;

  /* techniques */
  const claimed = new Set();
  for (const t of TECHS) {
    let best = null;
    for (const alias of t.aliases) {
      const rx = new RegExp('\\b' + esc_rx(alias) + '\\b', 'g');
      let m;
      while ((m = rx.exec(text))) {
        const i = m.index, end = i + m[0].length;
        const key = i + ':' + end;
        if (claimed.has(key)) continue;
        const before = text.slice(Math.max(0, i - 46), i);
        const around = text.slice(Math.max(0, i - 46), Math.min(text.length, end + 30));
        const passive = /(?:ed|red)$/.test(alias) && alias !== t.name.toLowerCase(); // "armbarred"
        let res = 'drilled';
        if (CONCEDE_BEFORE.test(before) || (passive && PASSIVE_GOT.test(before))) res = 'conceded';
        else {
          /* nearest verb before the mention wins — "worked X, hit Y" must not
             drag "worked" onto Y */
          const lastIdx = rx => { const g = new RegExp(rx.source, 'g'); let m, li = -1; while ((m = g.exec(before))) li = m.index; return li; };
          const hi = lastIdx(HIT_NEAR), dr = lastIdx(DRILL_NEAR), le = lastIdx(LEARN_NEAR);
          const top = Math.max(hi, dr, le);
          if (top < 0) res = (!passive && /\b(x ?\d|twice|couple of)\b/.test(around)) ? 'hit' : 'drilled';
          else res = top === hi ? 'hit' : top === le ? 'learned' : 'drilled';
        }
        /* count */
        let n = 1;
        const cm = around.match(/\b(\d+|one|two|three|four|five|six|couple|few)\s*(?:x\b)?\s*(?=[a-z ]{0,18}$)/);
        const cn = before.match(/\b(\d+|one|two|three|four|five|six|a couple(?: of)?|a few)\s+(?:more )?$/);
        const tw = text.slice(end, end + 16).match(/^\s*(?:x ?(\d)|twice|three times)/);
        if (cn) { const w = cn[1].replace(/^a /, '').replace(/ of$/, ''); n = NUM_WORDS[w] || parseInt(w) || 1; }
        else if (tw) { n = tw[1] ? parseInt(tw[1]) : (tw[0].includes('twice') ? 2 : 3); }
        else if (cm && /^\d+$/.test(cm[1])) { /* ambient number — ignore, too risky */ }
        /* vs (opponent) — tight window after the tech so a neighbouring
           technique's "on a purple belt" can't bleed onto this one */
        let vs = null;
        const vm = text.slice(end, end + 34).match(/^[^.]{0,12}\b(?:on|against|vs)\s+(?:a |an |the )?(white|blue|purple|brown|black)\s*belt/);
        if (vm) vs = vm[1];
        else if (/^[^.]{0,12}\b(?:on|against)\s+(?:a |the )?(?:bigger|huge|big)\s/.test(text.slice(end, end + 30))) vs = 'bigger';
        /* "first" must precede the mention, not trail after it */
        const first = FIRST_NEAR.test(before);
        const cand = { id: t.id, name: t.name, cat: t.cat, res, n: Math.max(1, Math.min(n, 20)), vs: res === 'hit' ? vs : null, first: res === 'hit' && first };
        /* prefer 'hit' > 'conceded' > 'learned' > 'drilled' when merging same tech */
        const rank = { hit: 3, conceded: 2, learned: 1, drilled: 0 };
        if (!best || rank[cand.res] > rank[best.res] || (cand.res === best.res && cand.n > best.n)) best = cand;
        claimed.add(key);
      }
    }
    if (best) {
      out.techs.push(best);
      if (best.first) out.firsts.push(t.id);
    }
  }
  /* drop generic entries when a specific same-cat entry exists */
  const generics = { sweep: 'sweep', pass: 'pass', takedown: 'td' };
  out.techs = out.techs.filter(t => {
    if (!(t.id in generics)) return true;
    return !out.techs.some(o => o.id !== t.id && o.cat === generics[t.id]);
  });

  /* niggles */
  const sentences = text.split(/[.;!?\n]/);
  for (const s of sentences) {
    if (!PAIN_WORDS.test(s)) continue;
    for (const [word, base] of REGION_WORDS) {
      const rx = new RegExp('\\b' + word + 's?\\b');
      if (!rx.test(s)) continue;
      /* "back" is a chronic false-positive ("took the back", "back to it") — require pain word close by */
      if (base === 'back' && !/\b(lower )?back\b[^.]{0,26}(sore|tight|tweak|pain|hurt|ach|stiff)|((sore|tight|tweak|pain|hurt|ach|stiff)[^.]{0,20}\bback\b)/.test(s)) continue;
      let sev = 2;
      if (SEV3.test(s)) sev = 3; else if (SEV1.test(s)) sev = 1;
      let id = base;
      if (SIDED.includes(base)) {
        const side = /\bleft\b/.test(s) ? 'l' : /\bright\b/.test(s) ? 'r' : 'l';
        id = base + '-' + side;
      }
      if (!out.niggles.some(x => x.region === id)) out.niggles.push({ region: id, sev });
    }
  }
  /* warm-up pain (the research-backed early warning) */
  if (/warm(?:ing)? ?up[^.]{0,40}(hurt|pain|sore|tweak|tight)|(hurt|pain|sore|tweak)[^.]{0,26}warm(?:ing)? ?up/.test(text)) out.warmupPain = true;

  /* feel */
  if (/\b(flow(?:ing|ed)|unstoppable|on fire|best (?:session|roll)|amazing|great session|felt (?:great|amazing|strong)|killed it)\b/.test(text)) out.feel = 5;
  else if (/\b(good session|solid|felt good|happy with|decent)\b/.test(text)) out.feel = 4;
  else if (/\b(smashed|crushed|destroyed|terrible|awful|rough (?:night|session|one)|got worked|humbled|exhausted|gassed)\b/.test(text)) out.feel = 2;
  else if (/\b(worst|demoralis|want(?:ed)? to quit|everything hurt)\b/.test(text)) out.feel = 1;

  return out;
}

/* fuzzy search for the manual technique picker */
function searchTechs(q) {
  q = q.trim().toLowerCase();
  if (!q) return [];
  const starts = [], contains = [];
  for (const t of TECHS) {
    const hay = t.aliases.join(' ');
    if (t.name.toLowerCase().startsWith(q) || t.aliases.some(a => a.startsWith(q))) starts.push(t);
    else if (hay.includes(q)) contains.push(t);
  }
  return [...starts, ...contains].slice(0, 6);
}

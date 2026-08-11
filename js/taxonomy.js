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
  sub:     { name: 'Submission', pl: 'Submissions', ico: '🔒' },
  leg:     { name: 'Leg lock',   pl: 'Leg locks',   ico: '🦵' },
  sweep:   { name: 'Sweep',      pl: 'Sweeps',      ico: '🔄' },
  pass:    { name: 'Pass',       pl: 'Passes',      ico: '➡️' },
  escape:  { name: 'Escape',     pl: 'Escapes',     ico: '🚪' },
  td:      { name: 'Takedown',   pl: 'Takedowns',   ico: '🤸' },
  guard:   { name: 'Guard',      pl: 'Guards',      ico: '🛡️' },
  control: { name: 'Position',   pl: 'Positions',   ico: '⚓' },
};
/* Library reading order — coarse position work first, finishes after. */
const LIB_ORDER = ['control', 'guard', 'pass', 'sweep', 'sub', 'leg', 'escape', 'td'];

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
  ['heel-hook', 'Heel Hook', 'leg', 'heel hook', 'heel hooked'],
  ['inside-heel-hook', 'Inside Heel Hook', 'leg', 'inside heel hook', 'ihh'],
  ['outside-heel-hook', 'Outside Heel Hook', 'leg', 'outside heel hook', 'ohh'],
  ['kneebar', 'Kneebar', 'leg', 'knee bar'],
  ['toe-hold', 'Toe Hold', 'leg', 'toe hold', 'toehold'],
  ['ankle-lock', 'Ankle Lock', 'leg', 'ankle lock', 'straight ankle', 'achilles lock', 'footlock', 'foot lock'],
  ['estima-lock', 'Estima Lock', 'leg', 'estima'],
  ['aoki-lock', 'Aoki Lock', 'leg', 'aoki'],
  ['banana-split', 'Banana Split', 'leg', 'banana split'],
  ['knee-compression', 'Knee Compression', 'leg', 'knee slicer', 'knee crush'],
  ['cross-collar', 'Cross-Collar Choke', 'sub', 'cross collar', 'collar choke', 'cross choke'],
  ['bow-arrow', 'Bow & Arrow', 'sub', 'bow and arrow'],
  ['loop-choke', 'Loop Choke', 'sub', 'loop choked'],
  ['clock-choke', 'Clock Choke', 'sub', 'clock'],
  ['baseball-choke', 'Baseball Choke', 'sub', 'baseball bat choke'],
  ['north-south-choke', 'North-South Choke', 'sub', 'north south choke'],
  ['paper-cutter', 'Paper Cutter', 'sub', 'paper cutter choke', 'breadcutter', 'bread cutter'],
  ['wrist-lock', 'Wrist Lock', 'sub', 'wristlock', 'wrist locked'],
  ['calf-slicer', 'Calf Slicer', 'leg', 'calf crush'],
  ['twister', 'Twister', 'sub'],
  ['peruvian-necktie', 'Peruvian Necktie', 'sub', 'peruvian'],
  ['japanese-necktie', 'Japanese Necktie', 'sub'],
  ['von-flue', 'Von Flue Choke', 'sub', 'von flue', 'vonflue'],
  ['bulldog-choke', 'Bulldog Choke', 'sub', 'bulldog'],
  ['buggy-choke', 'Buggy Choke', 'sub', 'buggy'],
  ['monoplata', 'Monoplata', 'sub'],
  ['baratoplata', 'Baratoplata', 'sub'],
  ['tarikoplata', 'Tarikoplata', 'sub', 'tariko'],
  ['brabo-choke', 'Brabo Choke', 'sub', 'brabo'],
  ['mounted-triangle', 'Mounted Triangle', 'sub', 'mounted triangle'],
  ['rear-triangle', 'Rear Triangle', 'sub', 'rear triangle'],
  ['short-choke', 'Short Choke', 'sub', 'short choke'],
  ['lapel-choke', 'Lapel Choke', 'sub', 'lapel choke'],
  ['straight-armlock', 'Straight Armlock', 'sub', 'straight arm lock', 'juji gatame'],
  ['belly-down-armbar', 'Belly-Down Armbar', 'sub', 'belly down armbar'],
  ['crucifix-choke', 'Crucifix Choke', 'sub'],
  ['can-opener', 'Can Opener', 'sub', 'can opener'],
  ['bicep-slicer', 'Bicep Slicer', 'sub', 'bicep crush', 'biceps slicer'],
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
  ['elevator-sweep', 'Elevator Sweep', 'sweep', 'elevator'],
  ['waiter-sweep', 'Waiter Sweep', 'sweep', 'waiter'],
  ['dogfight-sweep', 'Dogfight Sweep', 'sweep', 'dogfight'],
  ['electric-chair', 'Electric Chair', 'sweep', 'electric chair'],
  ['tornado-sweep', 'Tornado Sweep', 'sweep', 'tornado'],
  ['overhead-sweep', 'Overhead Sweep', 'sweep', 'overhead'],
  ['star-sweep', 'Star Sweep', 'sweep'],
  ['kiss-of-dragon', 'Kiss of the Dragon', 'sweep', 'kiss of the dragon', 'kotd'],
  ['shin-to-shin-sweep', 'Shin-to-Shin Sweep', 'sweep', 'shin to shin sweep'],
  ['muscle-sweep', 'Muscle Sweep', 'sweep'],
  ['balloon-sweep', 'Balloon Sweep', 'sweep', 'balloon'],
  ['sumi-gaeshi', 'Sumi Gaeshi', 'sweep', 'sumi'],
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
  ['x-pass', 'X-Pass', 'pass', 'x pass'],
  ['stack-pass', 'Stack Pass', 'pass', 'stacked'],
  ['headquarters', 'Headquarters', 'pass', 'hq', 'head quarters'],
  ['folding-pass', 'Folding Pass', 'pass', 'folding'],
  ['cartwheel-pass', 'Cartwheel Pass', 'pass', 'cartwheel'],
  ['floating-pass', 'Floating Pass', 'pass', 'float pass', 'floating'],
  ['leg-weave', 'Leg Weave', 'pass', 'leg weave'],
  ['tozi-pass', 'Tozi Pass', 'pass', 'tozi', 'wilson guard pass'],
  ['backstep', 'Backstep', 'pass', 'back step'],
  ['knee-shield-pass', 'Knee Shield Pass', 'pass', 'knee shield pass'],
  ['saulo-pass', 'Saulo Pass', 'pass', 'saulo'],
  ['pressure-pass', 'Pressure Pass', 'pass', 'pressure passed'],
  ['toreando-bullfight', 'Bullfighter Pass', 'pass', 'bull fighter pass'],
  ['pass', 'Guard Pass (general)', 'pass', 'passed', 'passed guard', 'passes'],
  /* escapes */
  ['shrimp-escape', 'Hip Escape', 'escape', 'shrimp', 'shrimped', 'hip escape'],
  ['bridge-roll', 'Bridge & Roll', 'escape', 'upa', 'bridge and roll', 'bump and roll'],
  ['elbow-knee-escape', 'Elbow-Knee Escape', 'escape', 'elbow knee', 'elbow escape'],
  ['back-escape', 'Back Escape', 'escape', 'escaped the back', 'escaped back'],
  ['mount-escape', 'Mount Escape', 'escape', 'escaped mount', 'escaped the mount'],
  ['side-escape', 'Side Control Escape', 'escape', 'escaped side control', 'escaped side'],
  ['guard-recovery', 'Guard Recovery', 'escape', 'recovered guard', 'reguard', 're-guard'],
  ['granby-roll', 'Granby Roll', 'escape', 'granby'],
  ['ghost-escape', 'Ghost Escape', 'escape', 'ghost'],
  ['sit-out', 'Sit-Out', 'escape', 'sit out'],
  ['hip-heist', 'Hip Heist', 'escape', 'hip heist'],
  ['wrestle-up', 'Wrestle-Up', 'escape', 'wrestle up'],
  ['kipping-escape', 'Kipping Escape', 'escape', 'kip escape'],
  ['stack-escape', 'Stack Escape', 'escape', 'escaped the stack'],
  ['north-south-escape', 'North-South Escape', 'escape', 'escaped north south'],
  ['kob-escape', 'Knee-on-Belly Escape', 'escape', 'escaped knee on belly'],
  ['turtle-recovery', 'Turtle Recovery', 'escape', 'recovered turtle'],
  ['frame-and-shrimp', 'Frame & Shrimp', 'escape', 'frame and shrimp'],
  ['leg-lock-escape', 'Leg Lock Escape', 'escape', 'escaped the heel hook', 'leg lock defence', 'leg lock defense'],
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
  ['blast-double', 'Blast Double', 'td', 'blast double'],
  ['high-crotch', 'High Crotch', 'td', 'high crotch'],
  ['low-single', 'Low Single', 'td', 'low single'],
  ['duck-under', 'Duck Under', 'td', 'duck under'],
  ['fireman-carry', "Fireman's Carry", 'td', 'fireman carry', 'firemans carry'],
  ['ouchi-gari', 'Ouchi Gari', 'td', 'ouchi'],
  ['kouchi-gari', 'Kouchi Gari', 'td', 'kouchi'],
  ['harai-goshi', 'Harai Goshi', 'td', 'harai'],
  ['tai-otoshi', 'Tai Otoshi', 'td'],
  ['tomoe-nage', 'Tomoe Nage', 'td', 'tomoe'],
  ['drop-seoi', 'Drop Seoi Nage', 'td', 'drop seoi'],
  ['body-lock-td', 'Body Lock Takedown', 'td', 'body lock takedown'],
  ['russian-tie', 'Russian Tie', 'td', 'russian two on one', 'two on one'],
  ['knee-tap', 'Knee Tap', 'td', 'knee tapped'],
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
  ['collar-sleeve', 'Collar & Sleeve', 'guard', 'collar sleeve'],
  ['knee-shield', 'Knee Shield', 'guard', 'knee shield', 'z guard', 'z-guard'],
  ['sit-up-guard', 'Sit-Up Guard', 'guard', 'sit up guard'],
  ['shin-to-shin', 'Shin-to-Shin Guard', 'guard', 'shin to shin'],
  ['octopus-guard', 'Octopus Guard', 'guard', 'octopus'],
  ['williams-guard', 'Williams Guard', 'guard', 'williams'],
  ['squid-guard', 'Squid Guard', 'guard', 'squid'],
  ['saddle', 'Saddle (411)', 'guard', 'saddle', 'honey hole', '411', 'four eleven', 'inside sankaku'],
  ['outside-ashi', 'Outside Ashi', 'guard', 'outside ashi garami'],
  ['cross-ashi', 'Cross Ashi', 'guard', 'cross ashi garami', '50 50 cross'],
  ['reverse-x', 'Reverse X', 'guard', 'reverse x guard'],
  /* control / positions */
  ['mount', 'Mount', 'control', 'mounted', 'full mount', 'high mount'],
  ['back-control', 'Back Control', 'control', 'took the back', 'back take', 'got the back', 'back mount', 'hooks in'],
  ['side-control', 'Side Control', 'control', 'side mount', 'cross side'],
  ['knee-on-belly', 'Knee on Belly', 'control', 'knee on belly', 'knee ride', 'kob'],
  ['north-south', 'North-South', 'control', 'north south'],
  ['crucifix', 'Crucifix', 'control'],
  ['body-triangle', 'Body Triangle', 'control', 'body lock'],
  ['front-headlock', 'Front Headlock', 'control', 'front head lock'],
  ['s-mount', 'S-Mount', 'control', 's mount'],
  ['technical-mount', 'Technical Mount', 'control', 'technical mount'],
  ['kesa-gatame', 'Kesa Gatame', 'control', 'scarf hold', 'kesa'],
  ['reverse-kesa', 'Reverse Kesa Gatame', 'control', 'reverse scarf hold'],
  ['twister-side', 'Twister Side Control', 'control', 'twister side'],
  ['seatbelt', 'Seatbelt', 'control', 'seat belt'],
  ['truck', 'The Truck', 'control', 'truck position'],
  ['gift-wrap', 'Gift Wrap', 'control', 'gift wrapped'],
  ['headquarters-pos', 'Headquarters Position', 'control', 'hq position'],
  ['dogfight', 'Dogfight', 'control', 'dog fight'],
  ['leg-drag-pos', 'Leg Drag Position', 'control', 'leg drag position'],
];

/* Library metadata: syllabus level 1–5 (roughly white→black) drives the "next up"
   suggestions. Anything absent defaults to 3 — see techLevel(). */
const TECH_LVL = {
  1: ['closed-guard', 'mount', 'side-control', 'back-control', 'shrimp-escape', 'bridge-roll',
      'elbow-knee-escape', 'guard-recovery', 'mount-escape', 'side-escape', 'armbar', 'rnc',
      'cross-collar', 'americana', 'kimura', 'scissor-sweep', 'hip-bump', 'flower-sweep',
      'knee-cut', 'torreando', 'half-guard', 'turtle', 'double-leg', 'single-leg', 'guillotine',
      'triangle', 'knee-on-belly', 'frame-and-shrimp', 'sweep', 'pass', 'takedown'],
  2: ['butterfly-guard', 'open-guard', 'dlr', 'spider-guard', 'knee-shield', 'collar-sleeve',
      'butterfly-sweep', 'tripod-sweep', 'elevator-sweep', 'old-school', 'over-under',
      'double-under', 'leg-drag', 'stack-pass', 'long-step', 'headquarters', 'back-escape',
      'north-south', 'north-south-choke', 'bow-arrow', 'ezekiel', 'arm-triangle', 'omoplata',
      'ankle-lock', 'straight-armlock', 'osoto-gari', 'ankle-pick', 'arm-drag', 'snap-down',
      'foot-sweep', 'sit-out', 'granby-roll', 'kob-escape', 'stack-escape', 'crucifix',
      'front-headlock', 'seatbelt', 'kesa-gatame', 'dogfight', 'leg-drag-pos', 'headquarters-pos',
      'wrist-lock', 'loop-choke', 'clock-choke', 'x-pass', 'smash-pass', 'body-lock-pass'],
  3: ['deep-half', 'lasso', 'x-guard', 'rdlr', 'sit-up-guard', 'shin-to-shin', 'rubber-guard',
      'x-sweep', 'lumberjack', 'john-wayne', 'waiter-sweep', 'dogfight-sweep', 'balloon-sweep',
      'shin-to-shin-sweep', 'muscle-sweep', 'sumi-gaeshi', 'floating-pass', 'leg-weave',
      'folding-pass', 'backstep', 'knee-shield-pass', 'tozi-pass', 'saulo-pass', 'pressure-pass',
      'darce', 'anaconda', 'brabo-choke', 'paper-cutter', 'baseball-choke', 'lapel-choke',
      'short-choke', 'mounted-triangle', 'belly-down-armbar', 'von-flue', 'bulldog-choke',
      'kneebar', 'toe-hold', 'calf-slicer', 's-mount', 'technical-mount',
      'reverse-kesa', 'gift-wrap', 'body-triangle', 'seoi-nage', 'uchi-mata', 'high-crotch',
      'low-single', 'duck-under', 'ouchi-gari', 'kouchi-gari', 'knee-tap', 'russian-tie',
      'body-lock-td', 'blast-double', 'ghost-escape', 'hip-heist', 'wrestle-up', 'turtle-recovery',
      'north-south-escape', 'kipping-escape', 'leg-lock-escape'],
  4: ['slx', 'k-guard', 'fifty-fifty', 'saddle', 'outside-ashi', 'octopus-guard', 'squid-guard',
      'berimbolo', 'electric-chair', 'overhead-sweep', 'star-sweep', 'tornado-sweep',
      'cartwheel-pass', 'heel-hook', 'outside-heel-hook', 'estima-lock', 'banana-split',
      'knee-compression', 'bicep-slicer', 'peruvian-necktie', 'japanese-necktie', 'monoplata',
      'baratoplata', 'tarikoplata', 'buggy-choke', 'crucifix-choke', 'rear-triangle', 'gogoplata',
      'truck', 'twister-side', 'harai-goshi', 'tai-otoshi', 'tomoe-nage', 'drop-seoi',
      'fireman-carry', 'can-opener'],
  5: ['worm-guard', 'williams-guard', 'reverse-x', 'cross-ashi', 'kiss-of-dragon',
      'inside-heel-hook', 'aoki-lock', 'twister'],
};
const TECH_LVL_BY_ID = (() => {
  const m = {};
  for (const [lvl, ids] of Object.entries(TECH_LVL)) for (const id of ids) m[id] = +lvl;
  return m;
})();
function techLevel(id) { return TECH_LVL_BY_ID[id] || 3; }

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

  /* techniques
     Longest alias first, and a match consumes its character range — otherwise
     "inside heel hook" also scores Heel Hook, and "blast double" also scores
     Double Leg. Whichever name covers more of the sentence is the one meant. */
  const claimed = [];
  const overlaps = (i, end) => claimed.some(([a, b]) => i < b && end > a);
  const pairs = [];
  for (const t of TECHS) for (const alias of t.aliases) pairs.push([t, alias]);
  pairs.sort((a, b) => b[1].length - a[1].length);
  const bestBy = new Map();
  {
    for (const [t, alias] of pairs) {
      let best = bestBy.get(t.id) || null;
      const rx = new RegExp('\\b' + esc_rx(alias) + '\\b', 'g');
      let m;
      while ((m = rx.exec(text))) {
        const i = m.index, end = i + m[0].length;
        if (overlaps(i, end)) continue;
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
        claimed.push([i, end]);
        bestBy.set(t.id, best);
      }
    }
    /* back to definition order so downstream ordering is stable */
    for (const t of TECHS) {
      const best = bestBy.get(t.id);
      if (!best) continue;
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

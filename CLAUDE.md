# PROOF — Jiu-Jitsu, measured

A static, zero-dependency BJJ training companion for Ben. Local-first PWA: vanilla
JS, no build step, no backend, no accounts. Live at
**https://bengallagher015-source.github.io/proof-bjj/** — auto-deploys from `main`
via GitHub Pages (~15s after push).

Previously developed out of the REBUILD Tracker working directory; extracted into
its own project September 2026. Nothing here depends on REBUILD.

## Why it exists

From market research (Aug 2026): ~95% of people quit before black belt, almost
always because progress goes invisible; injuries are the other exit, mostly from
ordinary sparring, unmanaged load, and training through warm-up pain. PROOF is the
missing feedback loop — a 30-second session log feeding three engines that make
progress and risk legible.

## The user (context that should shape decisions)

- Ben logs **at the gym, on an iPhone**. Mobile ergonomics beat desktop polish.
- He is visually ambitious and will say so — two map designs were rejected before
  the current one. When he says "make it better", make a decisive structural
  change, not a tweak.
- He ships fast and wants things live. Confirm before pushing (it publishes), but
  expect the answer to be yes.

## Files

Everything is hand-written, loaded in order by `index.html`:

| file | lines | holds |
|---|---|---|
| `js/taxonomy.js` | ~600 | belts, categories, the 184-technique vocabulary, the skill-tree graph + layout, the note parser |
| `js/engine.js` | ~785 | state + storage, the three engines, MP/rank/quests, library + tree state, demo seed |
| `js/ui.js` | ~1350 | every render function, the log flow, the brain map, sheets/overlays |
| `js/app.js` | ~134 | tab routing, recovery panel, voice controller, boot |
| `css/style.css` | ~760 | the whole design system |
| `sw.js` | 65 | service worker (network-first shell) |

No bundler. Load order matters: taxonomy → engine → ui → app.

## Data shape

`localStorage` key `proof-v1` (see **Data safety** for the other two keys):

```
{ v: 1, savedAt: <ms>,
  profile: {name, belt, stripes, weeklyTarget, createdTs} | null,
  sessions: [ {id, ts, type, mins, rounds, intensity, feel, warmupPain, notes,
               techs: [{id,name,cat,res:'hit'|'drilled'|'conceded'|'learned',n,vs}],
               niggles: [{region,sev}], demo?: 1} ],   // chronological, newest LAST
  recall:   { techId: {stage, due, name} },
  reviewLog:[ {ts, id, grade} ],
  seen:     [ proofId ],        // proofs already celebrated
  focus:    techId | null,      // this week's weapon
  learned:  { techId: ts },     // the library ticks
  lastLevel: <int>, demo: <bool> }
```

Every field is **additive** — absent reads as empty, never as an error. There is no
migration chain; `loadState()` merges over `defaults()`.

## The three engines (`engine.js`)

- **Proof** — `allProofs()` derives evidence from history: firsts, milestones, "vs
  higher belt", tapped-less trends. `seen[]` stops re-celebrating.
- **Body** — `bodyStatus()`: niggle heat-map, 3-in-21-days pattern alerts,
  warm-up-pain flag, weekly load ratio. **Load-bearing, do not soften.**
- **Recall** — spaced repetition at 1/3/7/21/60 days (`IVL`), `recallDue()` caps at
  6 a day, `gradeRecall()` moves the stage.

Engagement layer on top: `totalMP()` (derived, never stored) → 24 named levels
(`LEVELS`/`LVL_AT`), weekly quests (`questsFor`), week-chain streak, `insights()`,
`thenVsNow()`.

## The library and the map

- **184 techniques** in `TECH_DEFS`. 3 are parser catch-alls ("Sweep (general)") in
  `TECH_GENERIC` and are excluded from the library and the tree → **181 real moves**:
  19 positions, 27 guards, 21 passes, 22 sweeps, 39 submissions, 11 leg locks,
  19 escapes, 23 takedowns.
- `TECH_LVL` gives each a syllabus level 1–5 (roughly the belt you'd meet it at) →
  `techLevel()`.
- `CAT_HUE` gives each category a jewel hue. **Only lit nodes wear it** — the unlearnt
  map stays graphite, so the coloured part is the earned part. The library's category
  tiles carry the same hues, which is where the colour language is taught.
- `TECH_PRE` gives every move **exactly one prerequisite**, so the art renders as a
  tree. Two roots, deliberately: `closed-guard` (ground) and `double-leg` (standing).
  Parents cross categories on purpose (Armbar off Closed Guard, D'Arce off Front
  Headlock, Inside Heel Hook off Saddle) — that is what makes it one map.
  Verified acyclic, all 181 reach a root, max depth 11, 179 edges.
- `nodeState()` = `learnt` | `open` (prerequisite done) | `locked`. One tick lights
  the next ring — that is the whole pull.
- `treeLayout()` is an **indented outline tree** (948 × 11,408 units), one row per
  move, depth as indent. **Two layouts were tried and rejected; do not retry them:**
  a radial fan put labels in each other's way at every zoom, and a centred tidy tree
  left enormous voids near the roots (one root owns 107 leaves and spreads its
  children the full canvas height). Indenting spends every row and gives each label
  a lane nothing else can occupy.

## The parser (`parseNotes`)

Turns "hit two triangles, knee's a bit sore" into structured data. Aliases match
**longest-first and consume their character range** — without that, "inside heel
hook" also scored Heel Hook and "blast double" also scored Double Leg. Resolution
is proximity-based (nearest verb wins), the vs-belt window is a tight trailing
≤12 chars, and FIRST only reads from preceding text. Adding a technique whose name
contains an existing one is safe; adding a loose alias is not.

## Data safety (hard-won — read before touching storage)

Two audits found real destroyers. The invariants now:

- **Nothing replaces the record without a confirmation and an undo point.**
  `snapshot()` keeps a **ring of 4** under `proof-v1-bak`, evicting demo-only
  snapshots before real ones (a single slot got clobbered by the second destructive
  tap). Surfaced as "Undo last replace"; restore swaps, so it undoes both ways.
- `validRecord()` checks session shape **before any write**. A file with `[null]` in
  `sessions` once passed `Array.isArray`, saved, then threw during render — reporting
  "doesn't look like a PROOF backup" over data it had already replaced, and bricking
  every tab so the undo button itself was unreachable.
- `saveState(force)` returns a boolean and sets `lastSaveOK`; `saveDraft` aborts the
  celebratory recap when the write did not land. Silent failures used to award MP for
  sessions that were never on disk.
- The stale-tab guard compares against `baseline` (set at load), **not**
  `state.savedAt` — which is 0 for any state that did not come from the stored record.
  Getting this wrong made onboarding-after-quarantine impossible to save.
- Unreadable or newer-version blobs go to `proof-v1-quarantine` with a Recover button,
  never discarded.
- `renderTab` catches render throws → `renderRecovery()` (export / undo / reset), and
  boot is wrapped, and `index.html` carries a **boot guard**: both `#app` and `#onb`
  start hidden, so scripts that never run leave a blank page with no way out. After 6s
  it shows "PROOF didn't start" + Repair & reload (drops caches, unregisters the SW,
  reloads). Styled inline so it survives the stylesheet failing. It must never touch
  `localStorage`.

## Service worker

**Network-first for the shell**, cache-first for artwork. It was cache-first with no
revalidation and that bricked Ben's phone to a blank screen: once the cache held a
broken shell, that device served it forever and bumping `CACHE` could not help,
because the new SW could not install. Bump `CACHE` on every shell change anyway.

## Design system

Dark, near-black (`--ink:#070910`) with a belt-colour accent that re-themes the whole
app via `[data-belt]` on `<html>` — deliberate retention mechanic, "the app levels
with you". Bricolage Grotesque display / Inter body / Spline Sans Mono for numbers.
Cards are gradient surfaces with a rim highlight and two-part shadows (contact +
wide bloom) so they sit *on* the page. Category hues are the colour system; the belt
accent is chrome. Elevate within this; don't flatten it.

## iPhone gotchas

- All inputs are `font-size:16px` — stops iOS zoom-on-focus. Keep ≥16px.
- `viewport-fit=cover` + `env(safe-area-inset-*)` on the top bar, tab bar, FAB,
  sheets and onboarding. `.view`'s bottom gutter **must** include the inset or the
  last card is stuck under the LOG button on notched phones.
- Touch targets ≥44px, especially settings rows — they sit next to Reset.
- `requestAnimationFrame` is throttled when a tab isn't actively rendering. Reveal
  overlays synchronously (flush with `void el.offsetWidth`, then add the class) or
  they can sit invisible over the app.
- Voice is the browser's own `webkitSpeechRecognition`, not AI. **Untested on a real
  iPhone** — historically unreliable inside home-screen PWAs. Degrades to typing,
  which parses identically.
- Safari evicts `localStorage` for sites not opened in ~7 days; Add to Home Screen
  exempts it. Tell users this.

## Working on it

```bash
npx serve -l 4181 .          # or the `proof` launch config
git push                     # publishes to GitHub Pages, ~15s
```

Verify in the browser at 375×812 before claiming anything works. There is no test
suite — the checks are: all five tabs render without throwing, the parser handles a
handful of realistic phrases, and the destructive paths still prompt and still undo.

## Not built yet

Cross-device sync (the REBUILD project has a Supabase pattern worth copying), social
/ kudos, an App Store wrapper, custom domain, a jump-to-branch control on the map.

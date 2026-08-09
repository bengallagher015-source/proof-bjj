# PROOF — Jiu-Jitsu, measured.

**Live: https://bengallagher015-source.github.io/proof-bjj/**

The BJJ training companion that proves you're improving. ~95% of people quit
before black belt, almost always because progress goes invisible — PROOF is
the missing feedback loop.

Log a session in 30 seconds (talk or type — a BJJ-fluent parser structures it),
and three engines go to work:

- **Proof** — evidence you're improving: firsts in live rolling, milestones,
  "landed it on a higher belt", getting-tapped-less trends, trophies, a
  training heatmap, share cards built for the gym group chat.
- **Body** — niggle heat-map, recurring-pattern alerts, the research-backed
  warm-up-pain warning, weekly load-spike monitor.
- **Recall** — spaced repetition (1/3/7/21/60 days) so techniques resurface
  before you forget them, plus 60-second shadow-drill visualisations.

Wrapped in the engagement layer: **Mat Rank** XP with 24 levels, weekly
quests, a focus weapon, week chains, and a post-session recap story. The
whole app themes itself to your belt.

## Install on your phone

Open the URL in Safari (iOS) or Chrome (Android) → Share → **Add to Home
Screen**. Fully offline after first load. Local-first: no account, your data
never leaves your device (export/import JSON in the You tab).

## Stack

Static PWA. Vanilla JS, zero dependencies, no build step. Auto-deploys from
`main` via GitHub Pages.

```
index.html            shell
css/style.css         ink & tatami design system, belt themes
js/taxonomy.js        BJJ vocabulary + notes parser
js/engine.js          state, Proof/Body/Recall + XP/quest/insight engines
js/ui.js              screens, recap story, share cards
js/app.js             routing, voice, boot
sw.js                 offline cache
tools/gen_icons.py    stdlib PNG icon generator
```

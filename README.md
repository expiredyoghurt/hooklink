# Hook & Link v0.6
Tap-the-text game for P3/4. Fifteen full stories, each with three hook-and-link areas ranked 1 Ideal, 2 Good, 3 Workable. This version is Hook & Link only; the old Flashback Detectives code has been removed.

- **Mixed Round** (v0.5): six cards from six different stories, alternating "pick the ideal hook" and "name the kind of link". Cards are checked one at a time on the server (`/api/hl/mix`, `mix-check`, `mix-finish`); only the first answer to a card counts. 3 stars = all right, 2 = two thirds or more, 1 = fewer. Best stars are kept as `hl_stars` mode `mix`, story `round`; cards are logged as mode `mix`.

- **Plan a Story** (v0.6): notes on the story mountain (5 parts) and the 8-point story arc (8 parts), each with an inline SVG picture, short plain text and a note on where hooks and links usually go. Pupils pick a shape and can change it any time; it is saved in D1 (`plan_pref`). A practice activity shows a short story's events in a mixed-up order and the pupil chooses the part each belongs to; the server checks it (`/api/hl/plan-check`). Content lives in `src/plan.json`. After Spot the Hook and Make the Link, a "where this fits" card shows roughly which part of the pupil's shape each hook or link falls in, worked out from its place in the text.

## Pupils (`/`)
- **Spot the Hook**: tap three hooks, strongest first. 3 stars = all three found, no wrong taps, ideal tapped first; 2 = ideal plus one other, at most one wrong; 1 = otherwise.
- **Make the Link**: the hook and its memory are shown; tap the linked detail and name the kind (object / action / feeling / words). 3 stars = all three right first time; 2 = all details right.
- Home screen shows total stars, per-game stars, a "Play next" button and a badge shelf. Nine badges (First Hook, First Link, Triple Hook, Perfect Link, Ideal Eye, Both Doors, Comeback, Hook Master, Link Master) are worked out on the server from stars and attempts; a banner announces each new badge. No leaderboards. Cheat card, easy-read font, bigger text and read-aloud are included.

## Teachers (`/teacher`)
One login for everything. Tabs: Results, Pupils, Stories, Teachers (super admin only), Password.
- **Results**: class filter (applies to every table), stars per pupil and story, class averages, suggested next steps (pupils grouped by pattern, e.g. "picks a weak hook first"), most-tapped mistakes, right-detail-wrong-kind links, CSV.
- **Pupils**: reset PIN, delete pupil (only in your classes).
- **Stories**: add, edit, copy, hide/show, delete. Select words in the story and press a marker button (Hook A-C, Link A-C, Decoy 1-2); fill in the memory, rank, link kind and reasons. The same checks that protect the built-in stories run before saving: every marker once, three different ranks, each hook before its link, phrases of 16 words or fewer. A short "How to write a good story" guide sits at the top of the editor. Teachers can edit their own stories and copy any story; only the super admin can edit built-in stories (Restore original undoes an edit).
- **Planning**: sets which shape pupils see first, per class, with a school setting (super admin) as fallback. A pupil's own choice always wins. Order: pupil, class, school, story mountain. Also lists the parts of both shapes.
- Teachers see only the classes the super admin assigns them (none by default).

## Content and API
- Built-in stories: `src/scenes.json`. Markup `[id|text]`: ha-hc hooks, la-lc links, x1-x2 decoys. Ids are renumbered (t1, t2...) before they reach the browser; ranks, reasons and answers are sent only after a check.
- Teacher-made and edited stories live in the `hl_stories` table.
- `src/worker.js` (login, routes), `src/hl.js` (game, story store, validation, results).

## Setup
1. Create the D1 database and put its id in `wrangler.toml`.
2. Run `schema.sql` (safe to re-run; upgrading to v0.6 needs it once for the new `plan_pref` and `plan_default` tables).
3. Set `admin_user` and `admin_password` secrets.
4. Optional, for a database that came from Flashback Detectives v2.0: run `cleanup-flashback.sql` once to drop the old tables.
5. Push to `main`.

Note: changing the wording of a story pupils have already played can make old "most-tapped mistake" counts point to different words.

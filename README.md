# Hook & Link v0.7
Tap-the-text game for P3/4. Fifteen full stories, each with three hook-and-link areas ranked 1 Ideal, 2 Good, 3 Workable. Every story also has a model flashback story for its Ideal area: the present story, the hook, the flashback, and a link back that shows how the memory changed the character. This version is Hook & Link only; the old Flashback Detectives code has been removed.

- **Mixed Round** (v0.5): six cards from six different stories, alternating "pick the ideal hook" and "name the kind of link". Cards are checked one at a time on the server (`/api/hl/mix`, `mix-check`, `mix-finish`); only the first answer to a card counts. 3 stars = all right, 2 = two thirds or more, 1 = fewer. Best stars are kept as `hl_stars` mode `mix`, story `round`; cards are logged as mode `mix`.

- **Plan a Story** (v0.6): notes on the story mountain (5 parts) and the 8-point story arc (8 parts), each with an inline SVG picture, short plain text and a note on where hooks and links usually go. Pupils pick a shape and can change it any time; it is saved in D1 (`plan_pref`). A practice activity shows a short story's events in a mixed-up order and the pupil chooses the part each belongs to; the server checks it (`/api/hl/plan-check`). Content lives in `src/plan.json`. After Spot the Hook and Make the Link, a "where this fits" card shows roughly which part of the pupil's shape each hook or link falls in, worked out from its place in the text.

## Pupils (`/`)
- **Spot the Hook** (v0.7): pupils read a one-line summary of each of the three memories the character could slip into, then pick the ONE hook that opens the best memory. 3 stars = the Ideal hook, 2 = Good, 1 = Workable; tapping a link or a decoy gives no stars (try again). The memory lines are shuffled, so their order does not show which hook opens which. After the check pupils see all three hooks with their memories and ranks, and the Ideal area told as one finished story (present story, hook, flashback, link back). Stories without a model story show a short hook, memory and link summary instead.
- **Make the Link** (v0.7): the memory is shown, and pupils work in two steps. Step 1: tap the part of the story that ties back to the memory. Step 2: say what is the same in the memory and in that part (same object / action / feeling / words, each button has a one-line example). 3 stars = all three right first time; 2 = all details right.
- Home screen shows total stars, per-game stars, a "Play next" button and a badge shelf. Nine badges (First Hook, First Link, Triple Hook, Perfect Link, Ideal Eye, Both Doors, Comeback, Hook Master, Link Master) are worked out on the server from stars and attempts; a banner announces each new badge. No leaderboards. Cheat card, easy-read font, bigger text and read-aloud are included.

## Teachers (`/teacher`)
One login for everything. Tabs: Results, Pupils, Stories, Teachers (super admin only), Password.
- **Results**: class filter (applies to every table), stars per pupil and story, class averages, suggested next steps (pupils grouped by pattern, e.g. "picks a weak hook first"), most-tapped mistakes, right-detail-wrong-kind links, CSV.
- **Pupils**: reset PIN, delete pupil (only in your classes).
- **Stories**: add, edit, copy, hide/show, delete. Select words in the story and press a marker button (Hook A-C, Link A-C, Decoy 1-2); fill in the one-line memory, the memory, rank, link kind and reasons, and (optionally) the model flashback story. The same checks that protect the built-in stories run before saving: every marker once, three different ranks, each hook before its link, phrases of 16 words or fewer, a one-line memory of 8 to 140 characters for each area, and, if the model story is used, all four of its parts. A short "How to write a good story" guide sits at the top of the editor. Teachers can edit their own stories and copy any story; only the super admin can edit built-in stories (Restore original undoes an edit).
- **Planning**: sets which shape pupils see first, per class, with a school setting (super admin) as fallback. A pupil's own choice always wins. Order: pupil, class, school, story mountain. Also lists the parts of both shapes.
- Teachers see only the classes the super admin assigns them (none by default).

## Content and API
- Built-in stories: `src/scenes.json`. Each area has `memory` (used in Make the Link and the Mixed Round) and `line` (one line, used in Spot the Hook); each story has `whole` (`present`, `hook`, `flashback`, `back`). Stories saved before v0.7 have no `line`, so Spot the Hook shows their full memory until a teacher adds one. Markup `[id|text]`: ha-hc hooks, la-lc links, x1-x2 decoys. Ids are renumbered (t1, t2...) before they reach the browser; ranks, reasons and answers are sent only after a check.
- Teacher-made and edited stories live in the `hl_stories` table.
- `src/worker.js` (login, routes), `src/hl.js` (game, story store, validation, results).

## Setup
1. Create the D1 database and put its id in `wrangler.toml`.
2. Run `schema.sql` (safe to re-run; upgrading to v0.6 or later needs it once for the `plan_pref` and `plan_default` tables). v0.7 has no schema change.
3. Set `admin_user` and `admin_password` secrets.
4. Optional, for a database that came from Flashback Detectives v2.0: run `cleanup-flashback.sql` once to drop the old tables.
5. Push to `main`.

Note: changing the wording of a story pupils have already played can make old "most-tapped mistake" counts point to different words.

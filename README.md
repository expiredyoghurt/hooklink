# Hook & Link v1.1
Tap-the-text game for P3/4. Fifteen full stories, each with three hook-and-link areas ranked 1 Ideal, 2 Good, 3 Workable. This version is Hook & Link only; the old Flashback Detectives code has been removed.

- **Mixed Round** (v0.5): six cards from six different stories, alternating "pick the ideal hook" and "name the kind of link". Cards are checked one at a time on the server (`/api/hl/mix`, `mix-check`, `mix-finish`); only the first answer to a card counts. 3 stars = all right, 2 = two thirds or more, 1 = fewer. Best stars are kept as `hl_stars` mode `mix`, story `round`; cards are logged as mode `mix`.

- **Plan a Story** (v0.6): notes on the story mountain (5 parts) and the 8-point story arc (8 parts), each with an inline SVG picture, short plain text and a note on where hooks and links usually go. Pupils pick a shape and can change it any time; it is saved in D1 (`plan_pref`). A practice activity shows a short story's events in a mixed-up order and the pupil chooses the part each belongs to; the server checks it (`/api/hl/plan-check`). Content lives in `src/plan.json`. After Spot the Hook and Make the Link, a "where this fits" card shows roughly which part of the pupil's shape each hook or link falls in, worked out from its place in the text.

## Two story types (v0.8)
- **Embedded Linked Flashback** (the original 15 stories, `src/scenes.json`): the memory sits inside the present story.
- **Classic Linked Flashback** (5 new stories, `src/classic.json`): the flashback is the main story. A hook in the present opens it and a link in the present closes it. Text is stored as `before`, `===`, flashback, `===`, `after`, with markers `ha/hb/hc` (hooks, before), `da/db/dc` (the matching flashback details), `la/lb/lc` (links, after) and decoys `x1/x2`.
- **Staged classic stories (k6 to k15, v0.9):** the flashback is four paragraphs with stage labels (`stages`: Trigger, Problem, Resolution, Lesson). A hook points to a detail in the Trigger or Problem (`da/db/dc`). A link repeats a detail from the Resolution or Lesson (`ea/eb/ec`, field `ldetail`). Each area also has `wlr`, the rationale for the link's rank. All 15 built-in classic stories (k1 to k15) now have stages. Older custom stories without `stages` still play, using one detail for hook and link with no stage labels.
- **Varied answers (v1.0):** in k6 to k15 the best hook and the best link differ from story to story (`rank` is the hook rank, `lrank` the link rank, `wr` and `wlr` the reasons). A sound, a feeling or an action can be the best answer. Stories without `lrank` use `rank` for both.
- **Write it (v1.0):** after a classic Spot the Hook or Make the Link, pupils write their own hook or link sentence. `/api/hl/write-check` runs rule-based checks (a full sentence, uses details from the right stages, stays in the main story, points to a memory or shows change). Feedback only: no stars, no AI, nothing saved.
- **Into the Flashback and Back (v1.0):** a six-question round on going in (time words), tense (had + verb, then simple past) and coming back. Items are in `src/flow.json`; answers are checked on the server.
- **Classic story editor (v1.0):** teachers use "+ New classic story", or Copy on any story that has Trigger, Problem, Resolution and Lesson stages. Type each phrase exactly; the server marks it, checks that it appears once in the right part, and checks ranks and reasons. Built-in classic stories can be copied, not edited.
- Spot the Hook (classic): pick ONE hook, then tap the flashback detail it points to. Stars: ideal 3, good 2, workable 1, minus 1 for the wrong detail (minimum 1).
- Make the Link (classic): pick ONE link, tap the flashback detail it repeats, then say what is the same. Same star rule; a wrong kind costs 1 star.
- The Mixed Round, story editor and per-story "where it fits" card use the embedded stories only. Classic stories can be hidden but not edited yet. Progress, stars, badges and teacher results cover both.

## Pupils (`/`)
- **Spot the Hook** (v0.7): pick ONE hook. Under the story, three clue cards show the first sentence of each hook's memory, so pupils can choose the hook that opens the best flashback. 3 stars = the ideal hook, 2 = the good one, 1 = anything else. Feedback shows all three as hook, flashback, back to now.
- **Make the Link**: the hook and its memory are shown. Step 1: tap the part of the story that is the same as something in the memory. Step 2: say what is the same (object, action, feeling or words); the buttons are disabled until a part is tapped and name the thing tapped. After each answer a "back to now" line shows how the flashback changed the character. 3 stars = all three right first time; 2 = all details right.
- Home screen shows total stars, per-game stars, a "Play next" button and a badge shelf. Nine badges (First Hook, First Link, Triple Hook, Perfect Link, Ideal Eye, Both Doors, Comeback, Hook Master, Link Master) are worked out on the server from stars and attempts; a banner announces each new badge. No leaderboards. Cheat card, easy-read font, bigger text and read-aloud are included.

## Teachers (`/teacher`)
One login for everything. Tabs: Results, Pupils, Stories, Teachers (super admin only), Password.
- **Results**: class filter (applies to every table), stars per pupil and story, class averages, suggested next steps (pupils grouped by pattern, e.g. "picks a weak hook first"), most-tapped mistakes, right-detail-wrong-kind links, CSV.
- **Pupils**: reset PIN, delete pupil (only in your classes).
- **Stories**: add, edit, copy, hide/show, delete. Each area also needs a "back to now" line. Select words in the story and press a marker button (Hook A-C, Link A-C, Decoy 1-2); fill in the memory, rank, link kind and reasons. The same checks that protect the built-in stories run before saving: every marker once, three different ranks, each hook before its link, phrases of 16 words or fewer. A short "How to write a good story" guide sits at the top of the editor. Teachers can edit their own stories and copy any story; only the super admin can edit built-in stories (Restore original undoes an edit).
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

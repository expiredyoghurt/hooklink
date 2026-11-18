# Changelog
## v0.7
- Changed: **Spot the Hook** is now one pick. Pupils choose the single hook that opens the best memory (3 stars Ideal, 2 Good, 1 Workable; a link or decoy gives no stars). Before, they tapped three hooks.
- New: a **one-line memory** for every hook (45 for the built-in stories) is shown in Spot the Hook, shuffled, so pupils know what each memory is (for example, "Aisha remembers being too scared to jump into the pool.") before choosing.
- New: every built-in story now has a **model flashback story** for its Ideal area: the present story, the hook, the flashback, and a link back that shows how the memory changed the character. Pupils read it after Spot the Hook, with the hook and link words highlighted.
- Changed: **Make the Link** now has two numbered steps. Step 1: tap the part of the story that ties back to the memory. Step 2: say what is the same in the memory and in that part. The four buttons say "Same object / action / feeling / words" with an icon and a one-line example. The tapped words are shown above the buttons. The Mixed Round link cards use the same buttons and question.
- Changed: teacher story editor has a required one-line memory for each area and an optional four-part model story. Guide updated. Stories saved before v0.7 still work (they show their full memory in Spot the Hook until a line is added).
- Changed: badge "Ideal Eye" is now "Pick the ideal hook in 5 different stories". Suggested next step "Picks a weak hook first" is now "Often picks a weak hook". Cheat card updated.
- Fixed: the purple "memory hook" highlight was hard to read in dark mode.
- No schema change. Old Spot the Hook results (three taps) stay as they are.
## v0.6
- New: **Plan a Story** door on the pupil home screen. Notes and an inline SVG picture for the story mountain (5 parts) and the 8-point story arc (Stasis, Trigger, The Quest, The Surprise, Critical Choice, Climax, Reversal, Resolution). Pupils choose a shape and can change it any time; the choice is saved in D1. Read-aloud, easy-read font, bigger text and focus management work as elsewhere.
- New: practice activity. Two short stories (Mei and the Red Hat, Sam's Sports Day) with events in a mixed-up order; the pupil chooses the part for each event and gets checked feedback. Checked on the server; no stars or badges yet.
- New: after Spot the Hook and Make the Link, a card shows roughly where the hooks or links sit on the pupil's shape (from their position in the text; a guide, not a rule).
- New: teacher **Planning** tab. Set the starting shape per class (teachers, for their own classes) or for the whole school (super admin). Default is the story mountain. Pupil choice > class > school > story mountain.
- Schema: new tables `plan_pref` and `plan_default`. Run `schema.sql` once. Without them the app still works and pupils see the story mountain.
- Fixed: the super admin Teachers list called an undefined helper and could fail to load.
- Changed: deleting a pupil also removes their saved shape.
## v0.5
- New: Mixed Round, a third door on the pupil home screen. Six cards from six different stories: three "which hook is the ideal one?" cards (shows all three hooks and their memories) and three "what kind of link is this?" cards. Immediate feedback with the ranking explained, a star result and a "Mix Master" badge for 3 stars.
- New: teacher dashboard shows each pupil's best Mixed Round stars and cards right out of cards seen, for ideal-hook and link-kind cards. Two new "Suggested next steps" patterns appear when a pupil gets under half of at least four cards of one type wrong.
- No schema change. Works with any stories, including ones added in the teacher editor (a story needs three areas).
## v0.4
- New: nine badges with a badge shelf on the pupil home screen and a "New badge" banner after a story. Computed on the server (`GET /api/hl/badges`). No leaderboards.
- New: "How to write a good story" guide at the top of the teacher story editor (open for new stories).
## v0.3
- New: five more stories (11-15: The Lantern Walk, The Promise, The Burnt Tarts, The Smudged Rangoli, The Parade Rehearsal). 15 stories, 45 ranked areas.
- New: teacher story editor (add, edit, copy, hide, delete) with server-side validation.
- New: "Suggested next steps" on the results page, grouping pupils by pattern (weak first pick, hook/link mix-ups, wrong link kind and so on).
- New: pupil progress screen with total stars and a "Play next" button.
- Changed: class filter now applies to the mistakes tables as well.
- Changed: one teacher dashboard at /teacher (results, pupils, stories, teachers, password). /results.html redirects there.
- Removed: all Flashback Detectives code, content and routes. Added cleanup-flashback.sql (optional).
- Not yet: mixed round.
## v0.2
- New: stories 6-10 (The Lift Lobby, The Group Project, The Red Kite, The Spelling Bee, The Free Peach), 30 ranked areas in total across ten stories.
- New: teacher results page (`/results.html`) with per-pupil stars, class averages, most-tapped mistakes, wrong-kind links and CSV export, scoped to the teacher's classes.
- Not yet: mixed round, more stories.
## v0.1
- New: Spot the Hook and Make the Link on 5 full stories (3 ranked areas each), server-side scoring, stars, cheat card, easy-read font, bigger text, read-aloud, focus management.
- Not yet: mixed round, teacher results view, more stories (scoped first release was 15 hook and 12 link scenes; this has 15 areas from 5 stories in both modes).

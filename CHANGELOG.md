# Changelog
## v0.8
- The pupil story lists now sit under two headers: **Embedded Linked Flashback** (the 15 existing stories) and **Classic Linked Flashback** (new).
- New: 5 Classic Linked Flashback stories (The Fallen Tower, Standing Beside Sara, The Thirsty Plant, Just One Tiny Bite, The Paper Plane). Themes: forgiveness, standing up for others, responsibility, trying new things, welcoming others. Each has a present-day opening, a flashback of about 90 to 100 words, and a present-day closing with a hook, a matching flashback detail and a link in each of three ranked areas.
- New: classic Spot the Hook (pick one hook, tap the flashback detail it points to) and Make the Link (pick one link, tap the flashback detail it repeats, say what is the same).
- Not changed: Mixed Round, teacher story editor and the "where it fits" card stay with the embedded stories. Classic stories can be hidden by teachers but not edited.
- Fixed: saving over a built-in classic story is refused with a clear message.
## v0.7
- Changed: Spot the Hook is now one pick. Pupils choose the single hook that opens the best flashback. Three memory clue cards (the first sentence of each hook's memory) sit under the story, so the pupil knows what each hook leads to. Tap the hook in the story or the clue card. Stars: ideal 3, good 2, anything else 1. Logging is unchanged, so badges and teacher results still work.
- New: every area in all 15 stories has a "back to now" line showing how the flashback changed the character. After a pick, feedback shows all three options as hook, flashback, back to now, ranked.
- Changed: Make the Link is two clear steps. Step 1: tap the part of the story that is the same as something in the memory. Step 2: choose what is the same: object (a thing), action (something done), feeling, or words (said or thought). The buttons stay disabled until a part is tapped and show the phrase tapped. The Mixed Round link-kind cards use the same wording.
- Changed: teacher story editor has a "Back to now" box per area. It is required when saving. The memory's first sentence is the pupil's clue. Stories saved before v0.7 still play; they just have no back-to-now lines until edited.
- Not done: the flashbacks are still the one-to-two sentence memories, not full scenes.
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

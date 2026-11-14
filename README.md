# Hook & Link v0.2
Tap-the-text game for P3/4. Ten full stories, each with three hook-and-link areas ranked 1 Ideal, 2 Good, 3 Workable.
- **Spot the Hook**: tap three hooks, strongest first. Stars: 3 = all three found, no wrong taps, ideal tapped first; 2 = ideal plus one other, at most one wrong; 1 = otherwise.
- **Make the Link**: for each area the hook is shown with its memory; tap the linked detail and name the kind (object / action / feeling / words). 3 stars = all three right first time; 2 = all details right.
- Content: `src/scenes.json`. Tokens are written `[id|text]` (ha-hc hooks, la-lc links, x1-x2 decoys). Ids are renumbered (t1, t2...) before they reach the browser; ranks, reasons and answers are sent only after a check.
- API: `src/hl.js` (routes under `/api/hl/`), wired into `src/worker.js` after pupil auth. Login, register, teacher login and secrets are unchanged from Flashback Detectives v2.0.
- Setup: create the D1 database, put its id in `wrangler.toml`, run `schema.sql` (safe to re-run), set `admin_user` / `admin_password` secrets, push to `main`.
- Teacher results: `public/results.html` (log in with the same teacher or admin account). Teachers see only the classes assigned to them. It shows stars per pupil and story for both games, class averages, the details pupils tap most by mistake, right-detail-wrong-kind links, and a CSV download. API: `GET /api/admin/hl-results`.
- Known leftover: Flashback Detectives routes and `teacher.html` still ship in this zip. Tables `hl_log` and `hl_stars` hold the data.

# TODO

- [ ] Add Express backend (`server.js`) with `POST /api/chat` that calls Gemini using `process.env.GEMINI_API_KEY`.
- [ ] Update `src/App.tsx` to call `/api/chat` via `fetch` instead of calling Gemini directly from the browser.
- [ ] Harden frontend request/response + error handling so messages always append on success/failure.
- [ ] Modernize UI: update `src/App.tsx` markup/classes for a modern chat layout.
- [ ] Modernize styling: update `src/index.css` (message bubbles, header/input visuals, remove/limit brutal styles).
- [ ] Update `package.json` scripts to run Vite + Express dev server.
- [ ] (Manual) Add `GEMINI_API_KEY` to `.env.local` and run `npm run dev`.

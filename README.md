# Fazzalari Crokinole Cup

A mobile-first web app for running the annual Fazzalari family Crokinole tournament. Built to work on phones at the table: there's only ever one tournament, everyone opens it from the home screen, scores get entered in real time, and winners are immortalized in the Cup History.

**Live site:** https://crokinole.alexkeats.ca

---

## What it does

- **Host** creates a tournament, enters all player names, and the app randomly pairs them into teams of 2
- **Players** open the tournament on their own phones from the home screen (one tournament at a time, no PIN)
- Host picks the **format** at setup: round robin games per team, and whether everyone or the top 4 make the playoffs. The format is saved on the tournament doc.
- Round robin phase: every team plays exactly the chosen number of games (no repeat opponents), across 2 arenas, 2 matches at a time
- Standings auto-calculate after every score entry (wins, then point differential, then points scored), with a playoff cut line when not everyone advances
- A **Playoffs** tab shows the projected bracket during the round robin; the real bracket is generated when the last round robin game is scored
- The final is a best-of-3 series
- Crowning the winner adds them to the **Cup History** — a permanent record in Firestore
- Home screen always shows the reigning champions
- **Admin sign-in** (link at the bottom of the home page, PIN-protected, remembered per device): until someone signs in, the ⚙ Manage panel (rename players, start over, delete tournament), score Edit links, and Cup History photo controls are hidden entirely
- Each game records `scoredAt` / `editedAt` (ms) for later stats
- A banner prompts everyone to refresh when a new version is deployed; a refresh reopens the same screen

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React 18 |
| Styling | Tailwind CSS v3 |
| Database | Firebase Firestore (Spark / free tier) |
| Hosting | Vercel (free tier) |
| DNS | GoDaddy → Vercel |

No backend server. No auth. Everything runs client-side with Firestore for real-time sync.

Firebase project: **fazzalaricrokinole** (console.firebase.google.com)
Vercel project: **fazzalari-crokinole** (vercel.com)

---

## Design system

"Heritage Trattoria" theme — meant to feel like an old Italian sports newspaper.

- **Colors:** cream (`#FBFBE2`), forest green (`#006241`), rosso red (`#B61629`), gold (`#D4AF37`), ink (`#1B1D0E`)
- **Fonts:** Newsreader (serif, headlines) + Plus Jakarta Sans (body) — both loaded from Google Fonts
- **Tricolore:** decorative green/cream/red stripe component used at top/bottom of ceremonial screens
- **Arenas:** "Cucina Colosseo" (green) and "Soggiorno Stadium" (red)

---

## Project structure

```
src/
  App.jsx                  # State-based router (no React Router)
  main.jsx                 # Entry point
  firebase/
    config.js              # Firebase init, exports `db`
    db.js                  # All Firestore reads/writes
  utils/
    tournamentLogic.js     # Pure functions: team pairing, round robin, bracket, standings, format summary
    hostAuth.js            # Admin PIN check (hashed), per-device sign-in, useAdmin hook
    compressImage.js       # Shrinks photos to fit a Firestore doc
    useNewVersion.js       # Detects a new deploy and shows the refresh banner
  components/
    Home.jsx               # Landing page — shows reigning champs, Start/Open Tournament and History buttons
    CreateTournament.jsx   # Enter player names → random team pairing → create tournament
    BracketDiagram.jsx     # Tree-style bracket picture (setup preview, projected and live bracket)
    TournamentView.jsx     # Main tournament screen — tabs for Matches/Standings or Bracket/Standings
    RoundRobin.jsx         # Round robin match list
    MatchCard.jsx          # Individual match card with score entry
    PlayoffBracket.jsx     # Bracket display with ChampionshipFinal (best-of-3)
    Standings.jsx          # Standings table
    WinnerScreen.jsx       # Shown when a champion is crowned
    CupHistory.jsx         # All-time champions list with photos
    Tricolore.jsx          # Decorative stripe component
    ManageTournament.jsx   # Admin panel: rename players, start over, delete
    PasswordPrompt.jsx     # Admin PIN sign-in form
    CupPhoto.jsx           # Champion photo display and upload for Cup History entries

scripts/
  seed-history.mjs         # One-time: seeded the 4 historical Cup History entries
  update-history.mjs       # One-time: renamed "Alex" to "Zander" in 2026 and 2022 entries
  upload-images.mjs        # One-time: wrote /champions/<filename> URLs into each cupHistory doc

public/
  champions/               # Champion photos served statically by Vercel
    matt&alexEaster2026Champs.jpg
    dec2024champs.png
    dec2023champs.png
    dec2022champs.png
```

---

## Routing

Navigation is handled by a single `go(view, opts)` function in `App.jsx`. There is no URL routing — the entire app lives at `/`. Views:

- `home` → Home
- `create` → CreateTournament
- `tournament` → TournamentView (requires `tournamentId`)
- `history` → CupHistory

---

## Firestore data model

### `meta/activeTournament`
Singleton document. Points to the currently active tournament. Cleared when a tournament completes.
```
{ tournamentId: string | null }
```

### `tournaments/{id}`
One document per tournament.
```
{
  id, status,                // status: 'roundrobin' | 'playoffs' | 'complete'
  teams,                     // [{ id, names: [string, string] }]
  format,                    // { gamesPerTeam, playoffTeams } (missing on older docs = all teams)
  rounds,                    // round robin rounds; each game has scores, scoredAt, editedAt
  standings,                 // computed after each score submission
  bracket,                   // null until playoffs; see generateBracket()
  winnersTeamId,
  createdAt, completedAt,
}
```

### `cupHistory/{id}`
One document per historical champion. Ordered by `date desc`.
```
{
  winners: string[],         // e.g. ["Matt", "Zander"]
  date: Timestamp,
  tournamentId: string | null,
  imageUrl: string | null,   // e.g. "/champions/dec2024champs.png"
}
```

---

## Tournament logic

All core logic lives in `src/utils/tournamentLogic.js` — pure functions, no Firebase.

### Team pairing
Players are shuffled and paired sequentially into teams of 2. Always requires an even number of players (8–16).

### Round robin scheduler
Greedy algorithm. Iterates all possible matchups (shuffled), assigns each to the earliest round where:
- fewer than 2 matches are already scheduled, AND
- neither team is already playing that round

Round counts by team size:
- 4–6 teams → 3 rounds
- 7–8 teams → 4 rounds

### Standings
Sorted by wins, then score differential as tiebreaker.

### Bracket generation
Seeded from final standings. Handles 4–8 teams:
- **4 teams:** Semifinals → Final
- **5 teams:** Play-in (4v5) → Semifinals → Final (1st seed gets bye)
- **6 teams:** Semifinals → Final Four → Final
- **7 teams:** First Round (3 matches) → Semifinals → Final
- **8 teams:** Quarterfinals → Semifinals → Final

Each match has `feedsTo` and `feedsSlot` fields. When a score is submitted via `submitBracketScore()`, the winner is automatically written into the next round's match slot using a Firestore transaction.

### The Final
Best-of-3. Tracked as 3 individual games on `bracket.final.games`. First to 2 wins. `submitFinalGame()` sets `bracket.final.winnerId` when a team reaches 2 wins, which triggers `WinnerScreen` in `TournamentView`.

---

## Cup History photos

Each `cupHistory` document has an optional `imageUrl` field. Photos are stored as static files in `public/champions/` and served by Vercel's CDN — no Firebase Storage is used.

### Managing cup history entries

Use `scripts/manage-history.mjs` for all cup history operations.

```bash
# List all entries with their Firestore doc IDs
node scripts/manage-history.mjs list

# Add a new entry (copy image to public/champions/ first)
node scripts/manage-history.mjs add --winners "Name1,Name2" --date "YYYY-MM-DD" --image "filename.jpg"

# Attach or update an image on an existing entry (run list first to get the doc ID)
node scripts/manage-history.mjs attach-image --doc "<firestore-doc-id>" --image "filename.jpg"
```

After any change: commit and push — Vercel will deploy the updated images automatically.

**Typical post-tournament workflow:**
1. The app automatically creates the `cupHistory` entry when a winner is crowned
2. Copy the photo into `public/champions/`
3. Run `list` to find the doc ID of the new entry
4. Run `attach-image` to link the photo
5. Commit and push

### Future improvement
An in-app photo upload feature was intentionally deferred. The intended approach would use Firebase Storage, but note: the Firebase project's default GCP region is **northamerica-northeast1 (Toronto)**, which is not a no-cost Storage region on the Spark plan. Options when the time comes:
- Upgrade to Blaze plan (pay-as-you-go, still effectively free at this scale)
- Create a new Firebase project with a US region as default
- Keep the static file approach and just add a drag-and-drop to the deploy flow

---

## Local development

```bash
npm install
npm run dev        # starts Vite dev server at http://localhost:5173
```

The app connects to the real Firestore database even in dev. There is no local emulator configured.

---

## Deployment

Vercel auto-deploys on every push to `main` on GitHub.

```bash
git add -A
git commit -m "your message"
git push
```

Vercel build command: `npm run build` (Vite outputs to `dist/`).

DNS: GoDaddy CNAME `crokinole` → `cname.vercel-dns.com`

---

## Firestore rules

Open read/write — this is a private family app, not exposed publicly in any meaningful way. Rules are in `firestore.rules` and deployed with:

```bash
firebase deploy --only firestore:rules
```

---

## Scripts

All scripts in `scripts/` use ES modules and connect directly to Firestore. Run with:

```bash
node scripts/<name>.mjs
```

They all call `terminate(db)` and `process.exit(0)` at the end to cleanly close the Firestore connection.

# Rainbow-AI — Project Blueprint
> **Living Document** — Master reference for vision, architecture, and development decisions.
> Update this document as the project evolves. All major design choices should be traceable here.
>
> *Last updated: 2026-03-31 (rev 2 — Card Mode removed; §7 decisions recorded)*

---

## Table of Contents

1. [Project Vision & Goals](#1-project-vision--goals)
2. [User-Facing Functionality](#2-user-facing-functionality)
3. [Technical Architecture](#3-technical-architecture)
4. [Data Flow](#4-data-flow)
5. [Production Requirements](#5-production-requirements)
6. [Development Principles](#6-development-principles)
7. [Open Questions — Owner Input Needed](#7-open-questions--owner-input-needed)

---

## 1. Project Vision & Goals

### What Rainbow Is

Rainbow is an **AI-powered personal calendar and task management app** that makes managing your time feel alive, expressive, and intelligent. It combines a visually distinctive circular time view, floating task bubbles, and natural-language voice commands into a single cohesive daily companion.

The internal project name is **"ra1nbow"**. The package.json identifier is `orbit` (after the core day-wheel feature). Both names are in use — Rainbow is the user-facing brand; Orbit refers specifically to the circular calendar view.

### Core Problem

Standard calendar apps are utilitarian and passive. They display what you scheduled, but offer no intelligence about how your day is actually going. They don't distinguish between tasks that are *done*, tasks that *slipped*, or time that is *free*. They don't understand natural language. And they're visually dull.

Rainbow solves this by making time feel tangible:
- Events live on a **circular time ring** — position communicates urgency and proximity
- Tasks are **physical balloons** with weight and presence, not lines in a list
- The app **listens to you** — voice commands reschedule, complete, or edit events without touching a keyboard
- Each evening, a **Journey recap** surfaces what happened, what didn't, and invites reflection

### Target User Experience

> "The app should feel *alive*. Tasks should have personality. Language in the UI should be warm and human."

Using Rainbow should feel like working with an assistant who has good taste, not filling out a form. Specifically:
- **Fast and physical** — dragging an event on the wheel feels like moving something real; balloons float and respond to touch
- **Expressive but uncluttered** — the color system and animations communicate state without requiring labels
- **Always responsive to voice** — the mic button is always a tap away; the AI understands context, not just keywords
- **Emotionally honest about time** — the evening Journey view doesn't pretend the day was perfect; it surfaces the real story

---

## 2. User-Facing Functionality

### Core Views (Modes)

The app has three distinct modes. Each is visually and functionally separate.

| Mode | Trigger | Purpose |
|------|---------|---------|
| **Orbit** | Default / `'orbit'` | 24-hour circular day wheel — schedule view |
| **Rainbow** | Nav toggle / `'rainbow'` | Floating balloon task manager |
| **Journey** | Evening / `'journey'` | Daily recap after 7 PM |

#### Orbit (Circular Day Wheel)
The primary view. A 24-hour ring rendered in SVG where time is position on a circle. Events appear as arc segments colored with the rainbow gradient palette.

- **Drag** events to reschedule (snaps to 5-minute increments)
- **Resize** events by dragging start or end handles
- **Click a gap** in the ring to create a new event at that time
- **Right-click / long-press** an event for a context menu (complete, edit, delete)
- A **current-time indicator** moves in real time around the ring
- Supports 24h / 12h display, configurable timezone, and 4 marker resolution levels

#### Rainbow (Balloon Task View)
Tasks as floating physics balloons. Each balloon represents an unscheduled task with a duration estimate and an optional color.

- **Create** a balloon by pressing the `+` button
- **Pop** a balloon to complete the task (particle burst animation)
- **Edit** a balloon for title, duration, and labels
- Tasks at rest gently float (subtle CSS `float` keyframe)
- Unresolved tasks pulse orange to communicate urgency
- Balloon tasks are backed by the `tasks` table in SQLite — they persist across sessions and sync with the backend

#### Journey (Evening Recap)
Activates at 7 PM. A dark ambient view that surfaces completed tasks and a narrative "beat feed" of the day's notable moments.

- Beat types: `unresolved` | `call` | `place` | `task` | `message`
- Beats animate in with staggered entrance (0.55s + 0.09s × index)
- Status pills: Unresolved / First time / Milestone
- "Send quick reply" CTA on unresolved beats
- Smart back navigation returns to the previous mode
- Data sourced from `/api/calendar/journey` — real completed and cancelled events from the user's Google Calendar

### Voice Command AI

A microphone button (bottom-center, always visible) lets the user speak commands in natural language.

Flow:
1. User taps mic → app starts recording
2. Audio blob sent to backend → OpenAI Whisper transcribes it
3. Transcript + compressed schedule context sent to GPT-4o-mini
4. LLM selects a tool (reschedule, complete, update task details)
5. Tool executes directly against the database
6. Toast notification confirms the action

Available voice actions today:
- Reschedule an event to a new time or date
- Mark an event as complete
- Update a task's name, color, or notes

### Google Calendar Integration

- **Sign in with Google** → OAuth consent screen → tokens stored in SQLite
- **Sync** pulls events from Google Calendar (7 days back, 30 days forward)
- **Create / Edit / Delete** events immediately push to Google Calendar
- **Completing** an event renames it with a `✓` prefix on Google Calendar
- App works fully offline (SQLite-only) if Google is not connected

### Settings

Accessible via gear icon. Persisted in `localStorage` under key `'ra1nbow-settings'`.

| Setting | Options | Default |
|---------|---------|---------|
| Time Format | 12h / 24h | 24h |
| Timezone | 13 pre-configured zones | System |
| Dark Mode | On / Off | Off |
| Marker Resolution | minimal / standard / chronograph / technical | standard |

### User Flows

**New user, first visit:**
1. App loads in Orbit mode with demo events visible (seeded local user)
2. User can immediately drag, create, and complete events — no login required
3. Optionally: sign in with Google to sync real calendar data

**Daily use (returning user):**
1. Open app → Orbit mode shows today's ring (synced from Google Calendar)
2. Voice command or manual drag to adjust schedule
3. Switch to Rainbow to triage unscheduled tasks (persisted server-side)
4. After 7 PM → Journey icon glows → tap to review the day (real event data)

**Voice command:**
1. Tap mic button
2. Say "Move my 3 PM meeting to 4 PM" or "Mark dentist as done"
3. Toast confirms the action within ~2 seconds

---

## 3. Technical Architecture

### Frontend

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Language | TypeScript 5.7 |
| Build tool | Vite 6.1 (dev: port 5173) |
| Animation | Framer Motion 12.34 |
| Styling | Tailwind CSS 3.4 + custom CSS keyframes |
| Icons | Lucide React |
| State | useState + useCallback (no Redux/Context) |
| Persistence | localStorage (settings + task balloons) |

**Component structure** (`src/components/` — 22+ components):
- `DayWheel.tsx` — 34KB, core circular calendar SVG with drag/resize logic
- `TasksPage.tsx` — Balloon physics manager
- `JourneyPage.tsx` — Evening recap feed
- `VoiceButton.tsx` — Microphone recording, AI pipeline trigger
- `EventCreator.tsx` / `EventEditor.tsx` — Create and edit modals
- `EventActionMenu.tsx` — Right-click context menu
- `Settings.tsx` — Preferences modal
- `DateStrip.tsx` — Left-sidebar date picker
- `JourneyIcon.tsx` — Glowing star icon (top-right, activates at 7 PM)

**Key shared files:**
- `src/types.ts` — All TypeScript interfaces (`CalendarEvent`, `DragState`, `ResizeState`)
- `src/constants.ts` — Color palette, wheel dimensions, sample events, timezones
- `src/utils.ts` — All calendar math (hour↔angle, collision detection, time formatting, snap logic)
- `src/hooks/useCurrentTime.ts` — Real-time clock with timezone, updates every second
- `src/data/journeyMockData.ts` — Fallback mock beats (used only when real data is unavailable)

**Routing:**
No React Router. Mode is tracked as a `useState` string in `App.tsx`. OAuth callback uses query params (`?login=success`) cleared via `window.history.replaceState()`.

### Backend

| Layer | Technology |
|-------|-----------|
| Framework | Express.js 5.2 |
| Language | TypeScript 5.7 (runtime via `tsx`) |
| Database | better-sqlite3 12.8 (ACID, WAL mode) |
| AI — Voice | OpenAI Whisper-1 (transcription) |
| AI — Commands | GPT-4o-mini (tool selection & execution) |
| Calendar Sync | Google APIs SDK 171.4 |
| File uploads | Multer 2.1 (audio blobs) |
| Auth | Google OAuth 2.0 |
| Dev server port | 3001 |

**Route structure:**

```
/api/auth/google            GET   → Redirect to Google consent screen
/api/auth/google/callback   GET   → Token exchange, user creation/upsert
/api/calendar/sync          POST  → Pull events from Google Calendar into SQLite
/api/calendar/events        GET   → Return events for a given date range
/api/calendar/events        POST  → Create event (SQLite + push to Google)
/api/calendar/events/:id    PUT   → Update event
/api/calendar/events/:id    DELETE → Soft-delete (status = 'cancelled')
/api/calendar/events/:id/complete  POST → Mark complete + rename on Google
/api/calendar/events/:id/restore   POST → Restore cancelled event
/api/calendar/journey       GET   → Fetch completed/cancelled events for recap
/api/ai/transcribe          POST  → Audio → Whisper → transcript
/api/ai/execute             POST  → Transcript → GPT-4o-mini → tool execution
/api/health                 GET   → Health check
```

**AI mock mode:** If `OPENAI_API_KEY === 'KEY_PENDING'`, both AI endpoints return simulated success responses without calling OpenAI. Safe for offline development.

### Database

**Current:** SQLite (`database.sqlite`) with WAL mode via better-sqlite3.

**Schema (6 tables):**

```sql
users              (id, email, created_at)
oauth_credentials  (id, user_id, provider, access_token, refresh_token, expires_at)
calendars          (id, user_id, provider_calendar_id, sync_token, channel_id)
events             (id, calendar_id, provider_event_id, title, start_time, end_time,
                    startH, endH, date, color, description, status)
tasks              (id, user_id, title, duration_minutes, completed, due_date)
```

Indexes: `events(calendar_id)`, `events(date)`, `calendars(user_id)`,
`oauth_credentials(user_id, provider)`, `tasks(user_id)`

**Offline / demo user:** A seeded `local@rainbow.ai` user with a matching calendar row is auto-created on first run. The app is fully functional without Google auth.

**Future: PostgreSQL migration.** The SQLite schema is intentionally designed to map cleanly to PostgreSQL. When migrating:
- Replace `better-sqlite3` with `pg` or `postgres`
- Switch `TEXT PRIMARY KEY` UUIDs to native `UUID` type
- Add connection pooling (PgBouncer or built-in pool)
- Move the `database.sqlite` file path to an env-configurable `DATABASE_URL`
- Run the same schema DDL (no structural changes needed)

### External Integrations

**Google Calendar OAuth 2.0:**
- Scopes: `userinfo.email`, `userinfo.profile`, `calendar`
- Redirect URI: `http://localhost:3001/api/auth/google/callback` (dev)
- Uses `access_type: 'offline'` + `prompt: 'consent'` to ensure refresh token issuance
- Token refresh is handled transparently by the Google APIs SDK

**OpenAI:**
- Whisper-1: audio transcription
- GPT-4o-mini: tool-use inference (light, low-latency model appropriate for real-time commands)
- Schedule context compressed to `[id, title, date, startH]` tuples, max 40 events, cached 60s

**Future AI providers** (flagged in request, not yet implemented):
- Anthropic Claude: would replace GPT-4o-mini for command execution
- Provider abstraction layer needed before swapping — see [§7](#7-open-questions--owner-input-needed)

### Authentication (End-to-End)

```
User clicks "Sign in with Google"
  → Frontend: GET /api/auth/google
  → Backend: builds Google OAuth URL, redirects browser

Browser lands on Google consent screen
  → User approves
  → Google redirects to: GET /api/auth/google/callback?code=AUTH_CODE

Backend callback handler:
  1. Exchange code for { access_token, refresh_token, id_token }
  2. Decode id_token to get user email + sub (Google user ID)
  3. ACID transaction:
     a. Upsert user into `users` table (id = Google sub)
     b. Upsert credentials into `oauth_credentials` (provider = 'google')
  4. Redirect to http://localhost:5173/?login=success

Frontend:
  - Detects ?login=success on mount
  - Clears query param via history.replaceState
  - Triggers POST /api/calendar/sync to pull Google Calendar events

Subsequent API calls:
  - Backend reads oauth_credentials for the (single, implicit) user
  - If access_token is expired, calls google.oauth2.refreshAccessToken()
  - Refreshed token written back to DB
```

> **Auth goal:** Every user must sign in before using the app. Two auth paths are supported: **Google OAuth** (primary — one-click, no password) and a **native Rainbow account** (email + password, for users who prefer not to use Google). After either path, the backend issues a session token (JWT or cookie) scoped to that user. The current single-user assumption must be replaced before any public deployment.

---

## 4. Data Flow

### Standard Event Interaction

```
User drags event on DayWheel
  → React state update (optimistic, immediate visual)
  → PUT /api/calendar/events/:id { startH, endH, date }
  → SQLite UPDATE events SET startH = ?, endH = ?
  → Google Calendar: PATCH event with new start/end times (async, fire-and-forget)
  → Response: updated event object
  → React state reconciled with server response
```

### Voice Command Flow

```
User taps mic button (VoiceButton.tsx)
  → MediaRecorder records audio blob
  → POST /api/ai/transcribe (FormData with audio file)
  → Multer saves temp file to /uploads
  → OpenAI Whisper-1 transcribes audio → { transcript }
  → Temp file deleted

POST /api/ai/execute { transcript }
  → Build schedule context: query SQLite for next 14 days of events
  →   Compress to array of [id, title, date, startH] (max 40 events)
  →   Cache result for 60 seconds
  → Send to GPT-4o-mini with tool definitions:
      - reschedule_calendar_event
      - update_task_details
      - complete_event
  → If LLM returns a tool_call:
      → Execute tool directly on SQLite
      → Return { success: true, action: { tool, params } }
  → Frontend shows toast notification with result + transcript preview
```

### AI Decision Points

| When AI is called | Condition |
|-------------------|-----------|
| After voice transcription | Always (on successful transcription) |
| Calendar sync | Never — sync is deterministic pull from Google |
| Event create/edit/delete | Never — these are direct CRUD operations |
| Journey recap | Never — beats are derived from real completed/cancelled events via `/api/calendar/journey` |

### Google Calendar Sync

```
POST /api/calendar/sync
  → Read oauth_credentials for user (refresh token if needed)
  → Call Google Calendar API: events.list (singleEvents: true)
      timeMin: 7 days ago, timeMax: 30 days from now
  → For each Google event:
      → Upsert into SQLite events table
      → Compute startH / endH from ISO times
      → Assign deterministic color from event ID hash
  → Return count of synced events
```

---

## 5. Production Requirements

### Security Standards

| Concern | Current state | Production requirement |
|---------|--------------|----------------------|
| OAuth secrets | `.env` file (gitignored) | Environment variables in hosting platform secrets manager |
| CORS | `app.use(cors())` — open | Restrict to known frontend origins |
| Auth | Single-user implicit (no session) | JWT or session cookie with user ID |
| Rate limiting | None | Add `express-rate-limit` to AI endpoints (cost protection) |
| File uploads | Temp files in `/uploads` | Enforce file size limit (Multer `limits`), delete immediately after use |
| SQL injection | Not applicable — better-sqlite3 uses parameterized statements natively | Maintain parameterized queries on PostgreSQL migration |
| Secrets in logs | No logging middleware | Ensure access/refresh tokens never appear in logs |

### Performance Expectations

| Metric | Target |
|--------|--------|
| Calendar event load | < 200ms (SQLite is in-process) |
| Voice transcription (Whisper) | 1–3s depending on audio length |
| AI command execution (GPT-4o-mini) | 1–2s |
| Google Calendar sync | < 5s for typical calendar (< 200 events) |
| Drag/resize frame rate | 60 fps (all transforms via Framer Motion / CSS) |

### Deployment Targets

> **Note:** Hosting platform not yet decided — see [§7](#7-open-questions--owner-input-needed).

Architecture is compatible with any Node.js host (Railway, Fly.io, Render, DigitalOcean App Platform).

**Required environment variables in production:**
```
PORT
VITE_API_URL                  # public URL of backend
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI           # must match OAuth console (production URL)
OPENAI_API_KEY
DATABASE_URL                  # for PostgreSQL migration
```

**Build pipeline:**
```
npm run build   → tsc -b && vite build → dist/
```
The Express server can serve `dist/` as static files (single binary deploy) or the frontend can be deployed separately to a CDN.

### Scalability Considerations

| Stage | Users | Changes needed |
|-------|-------|----------------|
| 1 | 1–10 | SQLite is sufficient; no changes |
| 2 | 10–100 | Migrate to PostgreSQL; add proper session management |
| 3 | 100–1,000 | Add Redis for schedule context cache; rate-limit AI endpoints per user |
| 4 | 1,000–10,000 | Horizontal scaling (stateless Express + external DB + CDN for frontend); queue voice jobs |
| 5 | 10,000+ | Separate AI service; dedicated calendar sync worker; consider WebSockets for real-time multi-device |

---

## 6. Development Principles

### Code Organization

```
src/
  components/   One file per visual concept. PascalCase.tsx.
  data/         Mock data and fixtures. Never inline in components.
  hooks/        Custom React hooks. camelCase.ts.
  types.ts      All shared TypeScript interfaces (single source of truth)
  constants.ts  Colors, dimensions, config values, sample data
  utils.ts      Pure functions — calendar math, formatting, geometry
  App.tsx       App shell, mode state machine, top-level callbacks

server/
  index.ts      Express setup, route mounting, CORS, listen
  db.ts         Database init, schema, migrations
  auth.ts       OAuth flow
  calendar.ts   Calendar CRUD + Google sync
  ai.ts         Transcription + LLM execution
```

**Naming conventions:**
- Components: `PascalCase.tsx`
- Utilities/hooks: `camelCase.ts`
- Types: `PascalCase` interfaces (e.g., `CalendarEvent`, `DragState`)
- CSS classes: Tailwind utilities preferred; custom keyframes in `index.css`
- Constants: `ALL_CAPS_SNAKE_CASE` for config values (e.g., `WHEEL_SIZE`, `RING_RADIUS`)

### Visual & Animation Standards

- **Color:** Always use the 8-color rainbow gradient system (`g1-dusk` through `g8-chrome`). Never plain red/blue/green.
- **Animation:** Framer Motion for all modals, page transitions, and interactive elements. CSS keyframes for sustained/looping effects (floats, pulses, glows).
- **Glassmorphism:** Cards, modals, and overlays use `backdrop-blur` + semi-transparent backgrounds + `1px solid rgba(white, 0.1)` borders.
- **Micro-animations are required:** `whileTap={{ scale: 0.95 }}` on buttons, `whileHover={{ y: -4 }}` on cards. These are not optional polish.
- **No `display: none` for transitions.** Use `AnimatePresence` + `motion.div` for enter/exit.

### Error Handling

- **Frontend:** Silent failures. Never show React error boundary crash screens. Wrap async operations in try/catch with fallback UI.
- **Backend:** Return structured error responses `{ error: string, code?: string }`. Log errors server-side. Do not expose stack traces to clients.
- **AI errors:** Fall back gracefully — if Whisper fails, show a toast ("Couldn't hear that — try again"). If GPT tool execution fails, show the transcript but skip the action.
- **Google API errors:** If sync fails (token expired, network), app continues working with local SQLite data. Retry sync on next explicit trigger.

### Decision Framework

When there are multiple valid implementation approaches:

1. **Favor what's already in the codebase.** Check `utils.ts`, `hooks/`, and existing components before writing new abstractions.
2. **Favor animation fidelity over code elegance.** If a simpler implementation looks worse, choose the more complex one.
3. **Favor offline-first.** Write to SQLite immediately; push to Google asynchronously. Never block UI on external API calls.
4. **Favor explicit over clever.** Readable, predictable code over clever one-liners.
5. **When touching more than 3 files or restructuring the component tree** — stop, state the interpretation explicitly, and confirm scope with the owner before writing code.

### Agent Workflow Rules

These rules apply to every AI agent session on this project:

1. **Read before writing.** Always read the current file before modifying it. Never assume file contents match a previous version.
2. **Log completed work.** After finishing a meaningful feature or fix, add an entry to `docs/agent_log.md` (append-only — never edit previous entries).
3. **Use existing patterns.** Check `utils.ts` and `hooks/` for existing logic before writing new utilities.
4. **Propose, don't surprise.** When a request has multiple valid interpretations, state your interpretation at the top of the response before writing code.
5. **Mock data in `src/data/`.** Never hardcode realistic-looking data inline in components. Extract to `src/data/` or `constants.ts`.

### Testing Strategy

> **Not yet implemented.** See [§7](#7-open-questions--owner-input-needed) for priority decisions.

When testing is added, the intended approach:
- **Unit tests** (Vitest): Pure functions in `utils.ts` — calendar math, formatting, geometry
- **Component tests** (React Testing Library): Key user interactions (drag to reschedule, create event, voice command flow)
- **Integration tests**: Backend API routes against a test SQLite database
- **No mocking the database** — integration tests should hit a real (test) database

---

## 7. Decisions & Open Questions

Items marked **✅ Decided** are settled — treat them as requirements. Items marked **🔲 Open** still need a decision before implementation can begin.

---

### 7.1 Authentication ✅ Decided

**Decision:** All users must authenticate before using Rainbow. Two auth paths are supported:
1. **Sign in with Google** (primary) — one-click OAuth, no password required
2. **Rainbow account** (email + password) — for users who prefer not to link Google

After either path the backend issues a session token (JWT recommended — stateless, easy to validate across services) scoped to the authenticated user. Every API route must validate this token and resolve the `user_id` before touching the database.

**Implementation requirements:**
- Add a `password_hash` column to the `users` table (nullable — only set for native accounts)
- Add auth middleware to all protected routes
- Store JWT in an `httpOnly` cookie (XSS-safe) or `Authorization` header
- Native Rainbow account does not require Google Calendar — calendar sync is optional

---

### 7.2 Task Backend Sync ✅ Decided

**Decision:** Balloon tasks are backed by the `tasks` table in SQLite and synced with the backend. They persist across sessions and devices.

**Implementation requirements:**
- Wire `TasksPage.tsx` to `GET/POST/PUT/DELETE /api/tasks` instead of localStorage
- The backend `tasks` table already exists — routes need to be added
- Tasks are scoped to `user_id`
- Google Tasks sync is **not** in scope for now (may be revisited)
- Tasks should eventually be schedulable: draggable from the Rainbow view onto the Orbit ring to become a timed event

---

### 7.3 AI Provider Strategy 🔲 Open

**Current state:** Voice transcription uses OpenAI Whisper; command execution uses GPT-4o-mini.

**Not yet decided:** Whether to switch the command execution model to Anthropic Claude or another provider.

**Recommendation when ready to decide:**
- Abstract the AI execution layer behind a thin provider interface (`executeCommand(transcript, context) → ToolResult`) so the model can be swapped without touching business logic
- Keep Whisper for transcription regardless — it's best-in-class for speech-to-text
- Evaluate Claude for command execution when the voice command feature expands (more tools, more complex queries)

---

### 7.4 Production Hosting 🔲 Open

**Current state:** Local development only.

**Recommendations to consider:**

| Option | Pros | Cons |
|--------|------|------|
| **Railway** | Git-connected, easy Node + Postgres, usage-based pricing | Less control than VPS |
| **Fly.io** | Edge deployment, persistent volumes, good for SQLite long-term | More setup complexity |
| **Render** | Free tier, simple deploys | Cold starts on free tier |
| **Vercel (frontend) + Railway (backend)** | CDN edge for frontend, simple backend | Two platforms to manage |

**Also needed:** Domain name. If "rainbow.ai" is the brand target, check availability and decide before configuring OAuth redirect URIs for production.

---

### 7.5 Database Migration 🔲 Open

**Decision:** Stay on SQLite until a hosting platform is chosen and multi-user load warrants it. Do not migrate speculatively.

**Trigger for migration:** When the hosting platform is decided, evaluate whether SQLite persistent volumes are supported. If not (e.g., Vercel, Render free tier), migrate to PostgreSQL at that point.

**Preferred PostgreSQL provider when ready:** Neon or Railway Postgres (both have generous free tiers and straightforward migration paths from SQLite).

---

### 7.6 Journey Beats — Real Data ✅ Decided

**Decision:** Journey view displays real data from the user's Google Calendar. The `/api/calendar/journey` endpoint already fetches completed and cancelled events for a given date — this is the data source.

**Implementation requirements:**
- Replace `journeyMockData.ts` import in `JourneyPage.tsx` with a fetch to `/api/calendar/journey?date=YYYY-MM-DD`
- Keep `journeyMockData.ts` as a fallback for when the user has no Google Calendar connected or the fetch fails
- Beat type mapping: derive beat types from event metadata (missed = `unresolved`, etc.)
- AI-generated narrative is a future enhancement, not a current requirement

---

### 7.7 Mobile ✅ Decided

**Decision:** Mobile must be a first-class experience — not just "doesn't break" but fully functional and polished, matching the desktop experience.

**Requirements:**
- All interactions (drag/resize on Orbit wheel, balloon physics in Rainbow, voice command) must work on touch devices
- Layout must adapt cleanly at all breakpoints — no hidden features on mobile
- Touch targets must meet minimum tap size (44×44px)
- The circular Orbit wheel must be touch-draggable (pointer events, not mouse-only)
- Voice command mic button must use the device microphone on mobile
- **PWA is the target delivery format** — installable from the browser, offline-capable, no App Store required (can be revisited later for native)

---

### 7.8 Collaboration 🔲 Open

**Decision:** Collaboration is in scope but the implementation details are not yet defined.

**Known requirements:**
- Users should be able to share a calendar or view with another Rainbow user
- Collaborative editing (two people seeing the same events in real time) is likely desirable

**What needs to be scoped before implementation:**
- Share model: shared calendars? shared workspaces? event-level invites?
- Real-time sync: WebSockets (Socket.io) or polling?
- Permissions: read-only vs. edit access?
- Notification model: how does a user know something changed?

**Impact on current architecture:** Collaboration requires multi-user auth (7.1 ✅) and PostgreSQL (7.5) to be completed first. Do not start collaboration work until those are in place.

---

*End of Blueprint — update this document whenever a 🔲 Open item is decided.*

# Ra1nbow — Agent Log

> **This file is append-only.** Every agent that touches this project must add an entry at the end.
> Never delete or edit previous entries. The log is permanent project history.
>
> **Template:** See Cargo's GEMINI.md §12 for the required entry format (adopted from that project).

---

## [2026-03-06] — Feature: Journey Daily Recap Page

**What was changed:**
- Created `src/data/journeyMockData.ts` — new `src/data/` directory established. Contains all Journey mock data: `JourneyBeat` + `CompletedTask` types, `TONIGHT_STORY` opening line, `COMPLETED_TASKS` array (3 items), `JOURNEY_BEATS` array (5 beats: 1 unresolved, 1 call, 1 place, 1 task, 1 message), and `QUIET_DAY_STORY` fallback.
- Created `src/components/JourneyPage.tsx` — full dark-mode daily recap view. Includes: ambient radial glow background, gradient "Journey" title, italic opening story line, expandable task chips, "Your Day" divider, stagger-animated beat feed with 5 beat types, status pills (Unresolved/First time/Milestone), "Send quick reply" CTA on unresolved beats, and back navigation. All data sourced from `journeyMockData.ts`.
- Created `src/components/JourneyIcon.tsx` — small ✦ star icon for the top-right header. Detects evening hours (`>= 19:00`) and activates the `journey-glow-ring` CSS animation. Shows a rainbow-colored indicator dot at evening. Hides glow when Journey is open.
- Modified `src/App.tsx` — extended mode union to `'orbit' | 'rainbow' | 'balloon' | 'journey'`. Added `prevModeRef` for smart back navigation. Imported and mounted `JourneyIcon` in the header (top-right). Mounted `JourneyPage` inside `AnimatePresence` at z-20. Added `handleOpenJourney` and `handleCloseJourney` callbacks.
- Modified `src/index.css` — appended two new keyframe blocks: `journey-glow-pulse` (rainbow glow ring for the ✦ icon at evening) and `unresolved-pulse` (soft orange box-shadow animation for unresolved beat cards).

**Components affected:** `journeyMockData.ts` (new), `JourneyPage.tsx` (new), `JourneyIcon.tsx` (new), `App.tsx`, `index.css`

**Decisions made:**
- Journey uses `z-20` and `AnimatePresence` (not the opacity-toggle pattern used by other modes) — because Journey needed a proper enter/exit animation (`opacity: 0 → 1`), and `AnimatePresence` gives us that cleanly. The existing modes use a simpler opacity CSS toggle which doesn't animate out.
- Inline styles were used intentionally for dynamic rgba values and gradients in `JourneyPage.tsx` and `JourneyIcon.tsx` — these cannot be expressed as static Tailwind utility classes. Per `rules.md` §3, this is acceptable for complex values that can't be expressed in Tailwind.
- Beat data ordered: unresolved first, then reverse-chronological. This ensures the most important item (the Elisha missed call) appears at the top of the feed.
- Evening detection (`useIsEvening()`) is a simple in-component hook reading `new Date().getHours()`. This is intentionally not reactive — the glow only changes on re-render (which is fine for a prototype).
- `src/data/` directory was created following the Cargo convention (`cargo-app/src/data/mockData.ts`) — separating mock data from components.
- Adopted Cargo's `docs/agent_log.md` pattern for Rainbow.

**Patterns to reuse:**
- `journeyMockData.ts` pattern — new feature data always goes in `src/data/` not inline in components.
- `prevModeRef` pattern — for any future view that needs to "return to where you came from."
- Beat card stagger pattern — `delay: 0.55 + index * 0.09` with `ease: [0.22, 1, 0.36, 1]` for satisfying staggered entrances.

**Known issues / follow-up needed:**
- Browser subagent visual verification was blocked by a network timeout in the testing environment. Visual verification should be done by the user at `http://localhost:5174` (or whichever port Vite picks — check terminal output).
- The Vite dev server occupied port 5174 instead of 5173 (5173 was in use). This is normal behavior.
- CSS lint warnings about inline styles in `JourneyPage.tsx` and `JourneyIcon.tsx` are intentional — these are dynamic rgba/gradient values that cannot be expressed as Tailwind utilities (per `rules.md` §3).
- Evening detection is static per render. In a future version, it could use `useCurrentTime()` hook pattern (already in Rainbow) to reactively update the glow as the clock passes 7PM.
- Future: add `useCurrentTime()` to `JourneyIcon` so the glow activates live at 7PM without a page refresh.

---

## [2026-03-06] — Feature: Card Mode View & Event Editor

**What was changed:**
- Created `src/components/CardMode.tsx` — Dynamic React implementation of the daily calendar timeline. Features: Fixed Israel Time digital clock, vertical "playing card" event layouts, and auto-calculating "free time" mini-cards between events.
- Created `src/components/CardEditor.tsx` — Full-screen modal for creating and editing events in Card Mode. Fields: Title, Start/End Time, Notes, and Labels (comma-separated). Uses a dedicated `CardEventData` type.
- Modified `src/App.tsx` — Integrated `CardMode` and `CardEditor`. Mode state now includes `'card'`. Added logic for creating/saving events specifically for the Card view, while maintaining syncing with the main `events` state.
- Modified `src/index.html` & `src/index.css` — Switched global font family to **Outfit** (via Google Fonts) for a modern, fun aesthetic. Updated base font-wide variables.
- Cleaned up the root directory — Deleted legacy `mockup.html` and `styles.css` as they are now fully replaced by React components.
- Fixed Runtime Error — Resolved a white screen bug where `CardMode` incorrectly called `.getHours()` on the `currentTime` prop (which is a number, not a Date object).

**Components affected:** `CardMode.tsx` (new), `CardEditor.tsx` (new), `App.tsx`, `index.html`, `index.css`

**Decisions made:**
- **Mode Separation:** Card Mode has its own dedicated editor (`CardEditor`) rather than reusing the Orbit Mode’s `EventEditor`. This was necessary to accommodate the extra fields (Notes, Labels) while keeping the Orbit view minimal.
- **Dynamic Gap Analysis:** Instead of hardcoded 30-minute intervals, the code now calculates gaps between events in the sorted event list and renders a "free time" pill only when space exists.
- **Persistent Clock:** The Israel Time clock follows the system's `intl` formatter for `Asia/Jerusalem` but is separated from the app's `currentTime` logic to ensure visually accurate "Israel Time" regardless of the user's local emulator settings.
- **Card Proportions:** Used a fixed `220px` height for event cards to give them a satisfying "vertical playing card" weight.

**Patterns to reuse:**
- `React.Fragment` gap insertion — A clean way to interleave gap elements between list items during a `.map()` without breaking layout.
- `decimalHours` type usage — The project standard for time is "decimal hours" (e.g. 14.5). All new components must adhere to this to avoid `getHours()` runtime crashes.

**Known issues / follow-up needed:**
- The `CardEditor` currently uses standard HTML `<input type="time">`. For a higher-fidelity prototype, this could be replaced with a custom sliding time-picker to match the "Orbit" vibe.
- Labels are currently a comma-separated string in the editor; they could be converted to a proper tag-input pill system in the future.

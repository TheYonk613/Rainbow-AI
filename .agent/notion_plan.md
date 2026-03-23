# Rainbow Project Plan (Extracted from Notion)

## 🌟 General Vision
- **Central Hub**: Unified landing page with access to **Orbit**, **Rainbow**, and **Balloons** modes.
- **Navigation**: Persistent 3-button navigation always visible.
- **Infrastructure**: Local host setup to route between all project variants.

## 🛠️ Task Sheet & Immediate To-Dos
- [x] **Dark Mode & Settings**: Implementation completed.
- [x] **Extended Bubble Choices**: Enhanced selection options implemented.
- [x] **Refine Card Mode**: (Avishai)
    - [x] Active digital clock integration.
    - [x] 30-minute time intervals between cards. (Note: Dynamic gaps implemented)
    - [x] Transition to vertical card layout.
    - [x] Variables should be editable. (Title, Time, Notes, Labels)
    - [x] Custom font implementation. (Outfit)
- [ ] **Design Resolution**: (Avishai) Complete overall design polish.
- [x] **Git/Repo Sync**: `Balloon-tasks` merged into `main`; conflicts resolved in `App.tsx`. ✅ (2026-03-01)

## 💡 Feature Backlog (Core Concepts)
- **Enhanced Edit View**: High priority. Interactive transition (spin) between Orbit and Rainbow modes when editing.
- **Anchor/Adventure Logic**: Mode-based task management (Time-triggered vs. Action/Manual-triggered).
- **Atmospheric Tasks**: Task "bubble blower" in the corner; tasks settle dynamically around the event orbit.
- **Emotional Forgiveness**: "Fresh Start" button to reschedule missed items with zero penalty.
- **Dynamic Event Scaling**: Size, corner radius, and color change based on importance/excitement.
- **Contextual Presence**: Active events should "radiate" and occupy more screen real estate.
- **Buffer Zones**: Pre-event anxiety and post-event recovery time visualization.

## 🎈 Balloon Mode Specifics
- **UI Alignment**: Edit window to match Orbit design ("I want to...", "Add task").
- **Minimalism**: Temporary disabling of technical settings gear.
- **Poetic Pop 2.0**: Refine explosion intensity into slow-drifting confetti.

## 🎨 Future Aesthetic & UX
- **Neon Glow**: Move towards a neon-on-dark aesthetic for maximum visual pop.
- **Fluid Physics**: Bubbles should "melt" and merge when overlapping.
- **Tactile Feedback**: Visual "grip" effect when moving bubbles (replacing the static white dot).
- **Proactive AI**: Daily titles (e.g., "Prep for Purim") and auto-scheduling based on user "spam" input.

---
*Extracted on March 3, 2026*

---

## 🤖 Agent Session Log

### Session: 2026-02-26 — Navigation Architecture ("Three Worlds" Switcher)

**Completed by:** Antigravity Agent

#### What was done:

1. **Introduced 3-mode state** in `App.tsx`:
   - Replaced the old binary `page: 'day' | 'tasks'` state with `mode: 'orbit' | 'rainbow' | 'balloon'`.
   - Default mode on load is `'orbit'` (the DayWheel/calendar view).

2. **Built the Global Persistent Dock** (center-bottom floating pill):
   - Always visible regardless of active mode.
   - Three buttons: **Orbit**, **Rainbow**, **Balloon**.
   - Uses glassmorphism: `bg-white/40 backdrop-blur-md`, bordered pill container.
   - Active button styled with a gradient or solid white + shadow; inactive buttons are ghost-style with hover effect.

3. **Swapped view assignment to match correct mode names:**
   - **Orbit** button → shows the `DayWheel` calendar view (time-as-orbit).
   - **Rainbow** button → shows the "Rainbow Mode Incoming" placeholder.
   - **Balloon** button → shows `TasksPage` (balloon physics cluster).

4. **Cross-fade transition (0.4s):**
   - All three views are kept mounted at all times in `absolute inset-0` containers.
   - Active view: `opacity-100 pointer-events-auto z-10`.
   - Inactive views: `opacity-0 pointer-events-none z-0`.
   - Transition class: `transition-opacity duration-[400ms]`.

5. **Cluster Memory preserved:**
   - Because `TasksPage` is never unmounted, balloon positions, drag state, and task data survive mode switches without resetting.

6. **Moved the Balloon `+` button up:**
   - Increased bottom padding from `pb-10` to `pb-28` in `TasksPage.tsx` so the add button clears the persistent dock and is fully visible.

7. **Removed old navigation:**
   - Deleted the old "Tasks / Day View" toggle button from the bottom-left pill area.
   - Retained the "Card Mode" link button.

#### Files modified:
- `src/App.tsx` — mode state, view layout, and persistent dock
### Session: 2026-03-01 — 2026-03-06 | Sundays with Netanel: Drive Analysis

**Completed by:** Antigravity Agent (`8785ea8d-f64b-4869-b301-17cc331c0460`)

#### What was done:

1. **Deep Research & Audit**: Explored "Sundays with Netanel" Drive folder containing vids and strategic docs.
2. **Strategy Synthesis**: Defined the difference between AI-Enabled (Dashboard) and AI-Native (Chauffeur) products.
3. **UI/UX Deep Dive**: Analyzed the evolution of Orbit Mode and the Rainbow Calendar's Double-Ring system.
4. **Validation Mapping**: Identified the "Deposit Solution" for business validation (sell tickets before the concert).
5. **Artifact Generation**: Created `rainbow_ai_takeaways.md` as a permanent project reference.

#### Files created:
- `rainbow_ai_takeaways.md` — Full synthesis of project vision and business model.

---
*Log maintained by Antigravity Agent.*

### Session: 2026-03-03 — 2026-03-06 | Poetic Pop 2.0 (Refined Tasks)

**Completed by:** Antigravity Agent

#### What was done:

1. **Refined Animation**: Replaced violent balloon shaking with a tactile "squeeze" distortion (horizontal bulge/vertical squish) in `TaskBalloon.tsx`. Reduced trigger time to 800ms.
2. **Confetti Burst**: Swapped generic particles in `BalloonParticles.tsx` for physics-based paper confetti that drifts and sways.
3. **Task Migration**: Updated `MigratingText.tsx` to arc task "tokens" gracefully toward the bottom-right corner upon completion.
4. **Completed Ledger**: Built a persistent tally and hover-revealed list in `TasksPage.tsx` to track finished tasks.
5. **Aesthetic Upgrade**: Implemented staggered list animations and color-coded bullets matching balloon history.
6. **Dark Mode Fix**: Configured Class-based dark mode in Tailwind to ensure UI visibility during manual theme toggling.

#### Files modified:
- `src/components/TaskBalloon.tsx`
- `src/components/BalloonParticles.tsx`
- `src/components/MigratingText.tsx`
- `src/components/TasksPage.tsx`
- `tailwind.config.js`

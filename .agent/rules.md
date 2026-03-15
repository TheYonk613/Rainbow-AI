# Operational Contract: ra1nbow (Prototype Mode)
> Last updated: March 2026

---

## 1. 🧙 The "Wizard of Oz" Protocol
This is the most important rule. We are building a **simulation**, not a product.

- **Fake Latency:** When a user clicks a button (like "Save Event"), DO NOT process data instantly. Simulate a 500ms "loading" state (spinner), then immediately trigger a "Success" toast notification.
- **No Real Logic:** Do not write complex algorithms for date collision or validation. If an event is dragged to a new time, simply snap it there visually. Do not check if it overlaps with another event.
- **Console Logging:** Instead of executing backend commands, log the intended action to the console (e.g., `console.log("User would have saved event: Team Sync")`).

---

## 2. 🚫 Hard Constraints (The "Don't" List)

- **NO External APIs:** Do not write `fetch()`, `axios`, or async/await calls to external servers. All data must be local.
- **NO Authentication Code:** Do not create specific "protected routes" or checks for user sessions. Assume the user is always logged in as "Demo User."
- **NO Future-Proofing:** Do not write code for features we might need later (like database schemas). If it is not visible on the screen right now, do not write code for it.
- **NO State Persistence:** Do not use LocalStorage, Cookies, or Databases. If the page is refreshed, the app resets to its initial state.
- **NO Date Math:** Do not write complex calendar logic to calculate leap years or moving dates. Hardcode the current month/date when needed for visual demos.

---

## 3. 🎨 Visual & "Vibe" Standards

- **Aesthetic Priority:** If a choice is between "clean code" and "better animation," choose the animation. Use **Framer Motion** or CSS transitions for every hover, click, and modal appearance.
- **Neon on Dark:** The app leans toward a neon-on-dark aesthetic. Vibrant colors should pop against dark backgrounds. Avoid muted or washed-out palettes.
- **Glassmorphism:** Cards, modals, and panels should use the established glassmorphism style (`backdrop-blur`, semi-transparent backgrounds, subtle borders).
- **Tailwind Purity:** Use Tailwind utility classes for 100% of styling. Do not create separate `.css` files unless generating complex keyframe animations that cannot be expressed in Tailwind.
- **No Generic Colors:** Never use plain red/blue/green. Use the rainbow gradient system already established in the project (see `index.css`).
- **Hardcoded Dates:** To prevent the calendar from looking empty or broken, hardcode dates/months where needed. The "Current Day" highlight must always appear on the chosen demo date.

---

## 4. 🔁 Animation & Interaction Fidelity

- **Clickable Everything:** Every element that *looks* interactive (buttons, cards, icons, labels) must have a `cursor-pointer` and a hover effect — even if clicking it only logs to the console.
- **Framer Motion First:** All modals, drawers, pop-ups, and page transitions must use `framer-motion` (`AnimatePresence`, `motion.div`) — never `display: none` toggling.
- **Micro-animations are mandatory:** Button presses should scale down slightly (`whileTap={{ scale: 0.95 }}`). Cards should lift on hover (`whileHover={{ y: -4 }}`). These details matter enormously.
- **No Jank:** Do not use `setTimeout` for faking transitions. Always use Framer Motion's `transition` prop or CSS `transition` property.

---

## 5. 🧱 Component Architecture

- **One Component, One Job:** Each file in `/src/components` must represent a single, focused UI concept. Do not write 300+ line monolithic components.
- **Props Over State:** Prefer passing data down via props rather than creating local state that could conflict with the parent. Lift state up when two siblings need to share data.
- **Naming Convention:** Component files use `PascalCase.tsx`. Utility functions use `camelCase.ts`. Constants live in `constants.ts`. Types live in `types.ts`.
- **No Anonymous Exports:** Always use named exports for components (e.g., `export const TaskBalloon = ...`). This makes refactoring easier.
- **Data lives in `constants.ts` or mock files:** Never hardcode real-looking data ("Coffee with Sarah") inline inside a component. Extract it to `constants.ts` or a `mockData` structure.

---

## 6. 🖥️ Layout & Responsiveness

- **Mobile-Aware by Default:** Every component must at minimum *not break* on mobile. Use Tailwind's `sm:` / `md:` / `lg:` prefixes proactively.
- **Self-Correction Authorized:** If the agent notices a layout breaking on mobile screens, it is authorized to hide complex elements (like sidebars) automatically without asking for permission.
- **No Overlapping Elements:** Always verify that popups, modals, and dropdowns have a high enough `z-index` to appear above everything else. Use the established z-index scale: `z-10` (cards), `z-20` (dropdowns), `z-50` (modals), `z-[9999]` (toast notifications).

---

## 7. 🛡️ Error Handling Policy

- **Silent Failure:** If a frontend error occurs (e.g., a missing image), do not crash the app. Display a grey placeholder box or a default "fallback" state immediately.
- **No Red Error Screens:** The prototype must never show a React error boundary crash screen during a demo. Wrap fragile components in `try/catch` or conditional rendering.
- **Fallback UI:** Every async-looking operation (even faked ones) must have a loading state and a success/error state.

---

## 8. 📝 Agent Workflow Rules

- **Read before writing:** Before making any changes to a component, read its current file content first. Do not assume the existing code matches a previous version.
- **Log completed work:** After finishing a meaningful task, update the relevant task as complete in `notion_plan.md`.
- **Use existing patterns:** Before creating a new utility or hook, check `utils.ts` and `hooks/` to see if similar logic already exists.
- **Ask before big refactors:** If a request seems to require touching more than 3 files or restructuring the component tree, confirm scope with the user before proceeding.
- **Propose, don't surprise:** When implementing a feature that has multiple valid interpretations, state your interpretation clearly at the top of your response before writing code.

---

## 9. 🌈 Rainbow-Specific Feature Rules

- **Mode Integrity:** The three core modes—**Orbit**, **Rainbow (Balloon)**, and **Card**—must be visually distinct. Do not bleed one mode's styling into another.
- **Emotional Design:** The app should feel *alive*. Tasks should have personality (e.g., the "Fresh Start" button should feel forgiving, not bureaucratic). Language in the UI should be warm and human.
- **Bubble Physics Illusion:** When bubbles/balloons move, apply a slight `ease-in-out` with overshoot to simulate weight. Avoid linear movements — they feel robotic.
- **No Empty States:** Every view must show something meaningful if there is no data. Use example/placeholder items that demonstrate the intended experience.
- **Atmospheric Tasks:** Task bubbles should never look static. Even at rest, consider a subtle `float` keyframe animation (slow, gentle bob up and down).

---

*This contract applies to all agent sessions working on the ra1nbow project.*

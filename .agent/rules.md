# Operational Contract: ra1nbow (Prototype Mode)

## 1. The "Wizard of Oz" Protocol
This is the most important rule. We are building a **simulation**, not a product.
*   **Fake Latency:** When a user clicks a button (like "Save Event"), DO NOT process data instantly. Instead, simulate a 500ms "loading" state (spinner), then immediately trigger a "Success" toast notification.
*   **No Real Logic:** Do not write complex algorithms for date collision or validation. If an event is dragged to a new time, simply snap it there visually. Do not check if it overlaps with another event.
*   **Console Logging:** Instead of executing backend commands, log the intended action to the console (e.g., `console.log("User would have saved event: Team Sync")`).

## 2. Hard Constraints (The "Don't" List)
*   **NO External APIs:** Do not write `fetch()`, `axios`, or async/await calls to external servers. All data must be local.
*   **NO Authentication Code:** Do not create specific "protected routes" or checks for user sessions. Assume the user is always logged in as "Demo User."
*   **NO Future-Proofing:** Do not write code for features we might need later (like database schemas). If it is not visible on the screen right now, do not write code for it.

## 3. Visual & "Vibe" Standards
*   **Aesthetic Priority:** If a choice is between "clean code" and "better animation," choose the animation. Use **Framer Motion** or CSS transitions for every hover, click, and modal appearance.
*   **Hardcoded Dates:** To prevent the calendar from looking empty or broken in the future, **hardcode the current date to October 15, 2024.** Ensure the "Current Day" highlight always stays on this specific date.
*   **Tailwind Purity:** Use Tailwind utility classes for 100% of the styling. Do not create separate `.css` files unless generating complex keyframe animations.

## 4. Error Handling Policy
*   **Silent Failure:** If a frontend error occurs (e.g., a missing image), do not crash the app. Display a grey placeholder box or a default "fallback" state immediately.
*   **Self-Correction:** If you (the Agent) notice the layout breaking on mobile screens, you are authorized to hide complex elements (like the sidebar) automatically without asking for permission.

## 5. Interaction Fidelity
*   **Clickable Everything:** Ensure every element that *looks* interactive (buttons, cards, icons) has a `cursor-pointer` and a hover effect, even if clicking it does nothing but log to the console.

# Project Instructions: ra1nbow (Interactive Prototype)

## 1. What we are building
We are building a "High-Fidelity Interactive Prototype" for a calendar app called ra1nbow.
The goal is to simulate the *experience* of using the app for a design demonstration, without any functional logic underneath. It should feel like a clickable Figma prototype running in the browser.

**Core Features (Visual Only):**
*   **Visual Fidelity:** Pixel-perfect UI with vibrant "rainbow" gradients and glass-morphism effects.
*   **Static Views:** A Month View and Day View populated with hardcoded "dummy" data to show what a busy schedule looks like.
*   **Fake Interactions:** 
    *   Clicking a day should open an "Add Event" modal. 
    *   Clicking "Save" in the modal should simply close the modal (triggering a success toast animation) without actually saving data.
    *   Hover states and transitions must be smooth and polished.

## 2. What we are NOT building
To ensure this remains a prototype, we are strictly excluding all application logic:
*   **No State Persistence:** Do not use LocalStorage, Cookies, or Databases. If I refresh the page, the app should reset to its initial state.
*   **No Real Form Logic:** Do not validate inputs. We assume the user enters perfect data.
*   **No Date Math:** Do not write complex calendar logic to calculate leap years or moving dates. Hardcode the month of **October 2024** and only display that month.
*   **No Authentication or Backend:** As defined in standard Anti-gravity workflows, absolutely no server-side code [1].

## 3. What "Done" looks like
The project is considered "done" when:
*   The app loads visually complete with "fake" events already populated on the grid (e.g., "Coffee with Sarah," "Team Sync").
*   All interactive elements (buttons, inputs) have hover states and cursor pointers.
*   Clicking buttons triggers visual feedback (modals opening/closing, buttons changing color) instantly.
*   The layout is fully responsive and looks like a finished SaaS product on both mobile and desktop.

## 4. Operating Rules
*   **Data Source:** Create a file called `mockData.json` containing 5-10 fake events. Import and map through this file to populate the grid. 
*   **Tech Stack:** React, Tailwind CSS, Framer Motion (for animations).
*   **Hardcoding:** It is acceptable and encouraged to hardcode dates and grid layouts to ensure perfect visual alignment for this demo.

## 5. Project Scaffolding
*   `/src/components` (UI components: EventCard, Modal, DateGrid)
*   `/src/data` (Contains only `mockData.json`)
*   `/src/assets` (Images/Icons)

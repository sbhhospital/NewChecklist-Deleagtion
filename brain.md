# SBH Workforce Performance & Checklist System — Brain Documentation

This file documents all configuration rules, custom scoring designs, dashboard performance updates, and report structures in the system.

---

## 1. Core Checklist Scoring Rules

Scores are computed out of **100 points** in Checklist mode as a pure penalty deduction system.

| Frequency | Points (Value) | Grace Margin | Day 1 Delay | Day 2 Delay | Day 3+ / Overdue |
|---|---|---|---|---|---|
| **Daily** | 10 pts | 0 days (Immediate) | N/A | N/A | **-10 pts** |
| **Weekly** | 5 pts | 3 days | -1 pt | -3 pts | **-5 pts** |
| **Fortnightly** | 10 pts | 3 days | -2 pts | -7 pts | **-10 pts** |
| **Monthly** | 20 pts | 3 days | -5 pts | -15 pts | **-20 pts** |
| **Quarterly** | 20 pts | 3 days | -5 pts | -15 pts | **-20 pts** |
| **Half-yearly** | 20 pts | 3 days | -5 pts | -15 pts | **-20 pts** |
| **Yearly** | 20 pts | 3 days | -5 pts | -15 pts | **-20 pts** |

### Login Discipline Deductions (Checklist Mode)
* Missed logins deduct a flat **-10 points per missed day**.

### Score Formula
$$\text{Score} = \max\left(0, 100 - \sum \text{Checklist Penalties} - \sum \text{Login Penalties}\right)$$
*No bonus inflation applies to Checklist Performance.*

---

## 2. Dashboard Interface & Navigation

### Checklist Sub-Tabs
Added sub-tabs inside Checklist Performance to instantly filter calculations:
* **All Checklists**: Shows comprehensive stats.
* **Daily**: Recalculates scores and totals considering only Daily tasks.
* **Weekly**: Recalculates scores and totals considering only Weekly tasks.
* **Fortnightly**: Recalculates scores and totals considering only Fortnightly tasks.
* **Monthly**: Recalculates scores and totals considering only Monthly tasks.
* **Quarterly**: Recalculates scores and totals considering only Quarterly tasks.
* **Yearly**: Recalculates scores and totals considering only Yearly tasks.

### Frequency Breakdowns in Top Cards Grid
* In Checklist mode, a row of frequency-specific KPI cards is displayed right below the main KPI grid.
* Each card displays the **Active** count of checklists, alongside a breakdown line showing **Done** (Completed), **Grace** (Pending in grace period), and **Esc** (Escalated/Overdue).

### Original Clean Table Reverted
* The main matrix table columns have been reverted to their clean original states:
  * **Assigned**, **Completed**, **Pending**, **Overdue**, **Missed Logins**, and **Missed Checklist** (Checklist mode).

### Zero-Task Checklist Filter
* In Checklist Performance mode, staff members who have **zero checklists assigned** in the filtered list of tasks for the selected date range are automatically filtered out from calculations and reports.

---

## 3. PDF & Excel Report Exports

* **Inactive Users Filtered**: Inactive employees (present in `inactiveUsers` config) are excluded from the exports entirely.
* **Rank Sorted**: Employees are sorted descending by AI Score (highest score at the top) in all exports.
* **Color Coded**: The Score column in PDF exports is color-coded using hex colors matching the tiers.
* **Detailed Breakdown**: Excel and PDF reports export the full frequency breakdown (Done/Active/Grace/Esc) when Checklist mode is set to "All Checklists".

---

## 4. Temporary / Custom Modifications
* **SBH Hospital Funny Loading Overlay**: Added rotating funny corporate/management-themed messages to prevent user frustration during active data loads:
  * Messages rotate dynamically every 2.5 seconds (e.g. *"Assembling the management team for synergy..."*, *"NM is approving the latest entries... please hold!"*, *"Drafting emails that could have been quick meetings..."*, *"Stealing biscuits from the office breakroom..."*).
  * No restricted keywords are used (e.g. *"sync"*, *"sheet"*, *"doctor"*, *"nurse"* are completely omitted).
  * Styled with a pulsing green and orange building loader (`🏥`) and solid opaque `bg-white` backdrop (transparent layers completely removed so background data is 100% hidden during load).
  * **Viewport-Adaptive Sticky Centering**: Solved absolute positioning vertical shift on scrollable screens. The solid white overlay spans the entire height of long lists, but the animated loading elements are locked inside a `sticky top-0 h-[70vh] / h-[80vh]` viewport box. The text and loader are always perfectly centered on the user's screen (mobile or desktop) without scrolling down.
  * Integrated across `LoginPage`, `Dashboard` initial load, `EdpmsDashboardView` (Checklist/Performance tab transitions), `delegation` tasks, `UserManagement`, `AttendanceReport`, `QuickTask`, and `SalesDataPage` (Checklist Page).
  * **Isolated to Content Area**: The loading overlay is rendered *inside* the main content section container of `AdminLayout` for both page-level initial loading and subsequent tab transitions. Added `relative` positioning classes to the delegation list container wrappers, `SalesDataPage` container, and the `<main>` tag in `AdminLayout.jsx` itself. This guarantees that all absolute-positioned content overlays align perfectly inside the main frame and never overlap or block the sidebar navigation menu area.
  * **Double Loading Resolved**: Configured the loading logic inside `Performance.jsx` / `EdpmsDashboardView.jsx` and `QuickTask.jsx` to render sequentially. Multiple overlays are completely unified so only a single solid white viewport-adaptive loader is active at any time.
  * **Robust Score Calculation & Error Handling**: Wrapped the scoring logic calculations in `Performance.jsx` in `try-catch` blocks, ensuring that even if there are malformed rows in the spreadsheet, the page loads instantly and shows the loader/data successfully instead of getting stuck.
* **Direct Google Sheets Viz API Optimization**: Optimized the delegation fetch speed by replacing slow Apps Script endpoints with direct Google Sheets Viz JSON endpoints (`gviz/tq?tqx=out:json`). This drops the initial fetch latency down from **3-4 seconds** to under **200 milliseconds** for instant reflections.
* **React 18 Concurrent Rendering**: Added `startTransition` to Performance tab navigation (switching between Delegation Performance and Checklist Performance) so that heavy data calculation no longer freezes the browser thread.
* **Batch Verification Update**: Admin Verify Pending actions are now batched into a single `fetch` request instead of looping individually, avoiding CORS errors and reducing verify times to under a second.
* **Footer LinkedIn integration**: Wrapped Naman Mishra's name in all footer layouts (`AdminLayout`, `UserLayout`, and `LoginPage`) with an active hyperlink pointing directly to his LinkedIn profile: `https://www.linkedin.com/in/ignamanmishra`.
  * **Initial Underline Removed**: The default link underline decoration has been removed. The text looks clean and only highlights/underlines on mouse hover.
  * **Footer Above Loader**: Boosted the footer z-index in both layouts to `z-[999999]` so it stays fixed and visible at the bottom of the screen instead of being covered by loading overlays.

---

## 5. Delegation Scoring Rules (Dynamic by Task Value)

Delegation scores start at a **Base Score of 100 points**. 
Scores go up by completing tasks on time, and go down due to severe delays, multiple extensions, and missed logins.
Each task has a specific **Task Value (3, 5, or 10 points)** (read from Column V of the spreadsheet).

**General Rule:**
* If completed on time (within target date or approved extended date), the remaining task value is added to the Main Score.
* If delayed or extended, deductions eat up the task value first. If deductions exceed the task value, they subtract directly from the Main Score.

### Task Value = 3 Points
* **On Time Completion:** +3 Points to Main Score
* **Delay Penalties:**
  * 1 Day Delay: -1 Point (User earns 2 points)
  * 2 Days Delay: -3 Points (User earns 0 points)
  * 3+ Days Delay: **-3 Points per day** deducted from MAIN SCORE.
* **Extension Penalties:**
  * 1st Extension: -1 Point (Remaining: 2 points)
  * 2nd Extension: -3 Points (Remaining: 0 points)
  * 3rd+ Extension: **-3 Points per extension** deducted from MAIN SCORE.

### Task Value = 5 Points
* **On Time Completion:** +5 Points to Main Score
* **Delay Penalties:**
  * 1 Day Delay: -1 Point (Remaining: 4 points)
  * 2 Days Delay: -3 Points (Remaining: 2 points)
  * 3 Days Delay: -5 Points (Remaining: 0 points)
  * 4+ Days Delay: **-5 Points per day** deducted from MAIN SCORE.
* **Extension Penalties:**
  * 1st Extension: -2 Points (Remaining: 3 points)
  * 2nd Extension: -5 Points (Remaining: 0 points)
  * 3rd+ Extension: **-5 Points per extension** deducted from MAIN SCORE.

### Task Value = 10 Points
* **On Time Completion:** +10 Points to Main Score
* **Delay Penalties:**
  * 1 Day Delay: -2 Points (Remaining: 8 points)
  * 2 Days Delay: -5 Points (Remaining: 5 points)
  * 3 Days Delay: -10 Points (Remaining: 0 points)
  * 4+ Days Delay: **-10 Points per day** deducted from MAIN SCORE.
* **Extension Penalties:**
  * 1st Extension: -2 Points (Remaining: 8 points)
  * 2nd Extension: -5 Points (Remaining: 5 points)
  * 3rd Extension: -10 Points (Remaining: 0 points)
  * 4th+ Extension: **-10 Points per extension** deducted from MAIN SCORE.

### Login Penalties
* Missed logins deduct points according to the established rules (e.g. multiplied by 10 and subtracted from the main score).

---

## 6. Global Reset & Bonus Buffer (July 29, 2026 Cutoff)

### July 29, 2026 Cutoff Rule
* All delays, escalations, extensions, and missed logins prior to **July 29, 2026** are completely ignored. 
* Reminders, scoring, and delays treat July 29 as Day 1. Old pending tasks do not deduct from the score (`delayDays = 0` and `extensionCount = 0`).

### "Bonus Buffer" Logic & 100/100 Format
* The Dashboard displays the score in a **X/100** format (e.g., `100/100` or `90/100`).
* The maximum possible score is strictly **100**.
* **Bonus points act purely as a shield**:
  * Penalties subtract from Bonus Points first.
  * If an employee has 20 bonus points and 10 penalty points, the score remains **100/100** (penalty absorbed by bonus).
  * If an employee has 20 bonus points and 30 penalty points, the bonus is exhausted, and the remaining 10 penalty points deduct from the Base Score of 100, resulting in **90/100**.

 # #   C h e c k l i s t   R e c u r r e n c e   L o g i c   U p d a t e   ( J u l y   2 7 ) 
 -   C h e c k l i s t   g e n e r a t i o n   i n   c o d e . g s   h a s   b e e n   c o m p l e t e l y   r e w r i t t e n   t o   e n f o r c e   s t r i c t   c a l e n d a r   d a t e s   b a s e d   o n   t h e   a s s i g n e d   S t a r t   D a t e . 
 -   * * D a i l y * * :   E v e r y   w o r k i n g   d a y . 
 -   * * W e e k l y * * :   E x a c t l y   o n   t h e   s a m e   d a y   o f   t h e   w e e k   a s   t h e   S t a r t   D a t e . 
 -   * * F o r t n i g h t l y * * :   E x a c t l y   o n   t h e   S t a r t   D a t e   d a y ,   a n d   1 5   d a y s   o f f s e t   ( e . g .   5 t h   a n d   2 0 t h ) . 
 -   * * M o n t h l y / Q u a r t e r l y / Y e a r l y * * :   E x a c t l y   o n   t h e   s a m e   d a y   o f   t h e   m o n t h   a s   t h e   S t a r t   D a t e . 
 -   T a s k s   w i l l   N E V E R   g e n e r a t e   b e f o r e   t h e i r   o r i g i n a l   S t a r t   D a t e .  
 
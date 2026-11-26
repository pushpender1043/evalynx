# Evalynx — Progress Log

## Day 1.9 — Deep UI Redesign: 3-Layer Shell, S-Curve Sidebar, Soft Color System & Illustrations (Completed)

### What Was Built
1. **3-Layer Shell Architecture (`src/components/layout/ShellLayout.tsx`, `AppShell.tsx`)**:
   - **Layer 1**: Soft lavender-grey canvas (`#D9DAEE` light / `#0E0C2B` dark) with subtle decorative inline SVG curved strokes (`6–8%` opacity) and minimal accent dots (also echoed on `AuthLayout.tsx` around the centered 440px auth card).
   - **Layer 2**: Single large off-white rounded shell panel (`#FAFAFE` light / `#1A1744` dark), `40px` radius on desktop, `24–32px` desktop viewport margin (`12px` tablet, `0px` full-bleed mobile), airy `0 30px 80px rgba(108,92,231,0.12)` shadow, and internal scrolling.
2. **Attached Curved Purple Sidebar (`src/components/layout/SidebarTab.tsx`, `BottomNav.tsx`)**:
   - Replaced the floating sidebar pill with a vertically centered purple tab (`#7A6CF0` → `#6C5CE7`) rendered as a single inline SVG path with exact cubic-Bezier concave S-curve fillets merging flush (`0px` delta) into the panel's left border.
   - Thin outline Lucide icons (`strokeWidth={1.6}`, `22px`, white 75%), active `44px` white rounded square (`16px` radius) with purple icon, dark navy hover/focus tooltips, mint unread dot on Notifications only when unread > 0, no logo and no logout inside the sidebar.
   - Mobile (`<768px`): floating purple rounded-`24px` bottom nav bar (`BottomNav.tsx`) with active white rounded squares while the panel goes full-bleed.
3. **Light, Flat Top Bar (`src/components/layout/Topbar.tsx`)**:
   - Flattened directly onto the Layer 2 panel with `36px` Evalynx icon mark, purple `2.5px` underline-active text tabs, thin 1px lavender-bordered search/command input with `Ctrl K` hint, segmented Light/Dark toggle, bell + settings icons, dark navy primary CTA (`variant="navy"`), and profile dropdown.
4. **Strict 70 / 20 / 7 / 3 Minimal Color System (`src/styles/theme.css`, `src/index.css`)**:
   - Replaced heavy puffy 4-layer clay shadows with soft airy elevation (`0 8px 30px rgba(108,92,231,0.08)`), unified all `StatCard` & `StatChip` tiles to one soft lavender tile (`#EEEDFB`) + purple icon, restricted charts to purple + soft lavender + mint secondary only, and preserved WCAG AA+ Dark mode contrast.
5. **12 Custom Inline SVG Illustrations (`src/components/illustrations/`) + Dev Showcase (`/dev/illustrations`)**:
   - Built all 12 theme-aware inline vector illustrations (`CreateTest`, `AIGenerator`, `QuestionBank`, `Results`, `EmptyTests`, `EmptyPerformance`, `EmptySubmissions`, `EmptyNotifications`, `JoinWithCode`, `PracticeMode`, `EmptyStudents`, `Promo`) using `2px` rounded strokes, flat fills, offset layers, and CSS custom properties for instant Light/Dark adaptation.
6. **Refactored Primitives & Bento Dashboards (`src/components/ui/`, `ProfessorDashboardView.tsx`, `StudentDashboardView.tsx`)**:
   - Added `IllustratedActionCard`, `FeatureCard` (the single purple highlight card per dashboard), `StatChip`, and `DashedAddCard`; upgraded `EmptyState` (`illustration` prop), `ClayCard` (`tinted`/`dashed`), `ClayButton` (`navy`), `ClayBadge`, and `ProgressRing`.
   - Rebuilt Professor and Student dashboards into the airy 3-row Bento grid and wired matching empty-state illustrations across `ProfessorTestsView`, `TestSubmissionsView`, `ProfessorAnalyticsView`, `StudentAnalyticsView`, and `NotificationDrawer`.
   - **Zero business logic, Firebase Auth, or Firestore service changes.**

### Day 1.9 Verification Checklist (Honest Report)
| # | Check | Status | Notes |
| :--- | :--- | :--- | :--- |
| 1 | Attached SVG S-curve sidebar alignment & responsiveness (`1280x620`, `1440x900`, `1920x1080`, `768x900`) | **Pass (Fixed)** | Caught `1px` border offset on initial Playwright check; swapped panel `md:border` to `md:ring-1`, verified `flushDeltaPx === 0`, `clippedTop: false`, `clippedBottom: false`, and `analyticsTooltipOpacity: "1"` on hover. |
| 2 | 3-layer shell panel, flat top bar with underline tabs, segmented theme toggle, & dark navy CTA | **Pass** | Visually verified in Playwright captures across Light & Dark modes on both Professor & Student dashboards. |
| 3 | All 12 custom inline SVG illustrations at `/dev/illustrations` (Light & Dark) | **Pass** | Verified `totalLargeSvgs: 12`, crisp `2px` rounded outlines, clean Light & Dark token switching, zero external URLs. |
| 4 | Strict 70/20/7/3 color discipline across cards, unified lavender stat tiles, & purple/lavender/mint charts | **Pass** | Replaced multi-colored `StatCard` icon tints and amber 3rd bar in Class Comparison chart; single purple `FeatureCard` per dashboard. |
| 5 | Bento Professor & Student dashboards (Real/Demo data + empty states) | **Pass** | Verified Demo Mode Professor & Student 3-row Bento layouts, `IllustratedActionCard`s, `DashedAddCard`, dual `ProgressRing`s, and Integrity Alerts card. |
| 6 | Mobile `360px` full-bleed layout & floating purple `BottomNav` | **Pass** | Verified `overflowX: 0`, `desktopSidebarHidden: true`, `mobileNavVisible: true`, and crisp active white square on mobile dock. |
| 7 | 3-dot `Loader` intact & zero regressions to Auth / Services / Unit Tests | **Pass** | All 27/27 `node:test` assertions pass; zero changes to `src/services/*`, `src/store/*`, or `src/lib/grading.ts` / `proctoring.ts`. |
| 8 | TypeScript strict lint (`tsc --noEmit`), production Vite build, & 0 browser console errors | **Pass (Fixed)** | Caught nullable `sub.score` guard in `ProfessorDashboardView.tsx`; `tsc --noEmit`, `npm run build`, and Playwright console audit (`0 errors, 0 warnings`) all clean. |

---

## Day 3 — Proctoring Basics & Analytics Dashboards (Completed)

### What Was Built
1. **Browser Proctoring Module (`src/features/proctoring/`, `src/lib/proctoring.ts`)**:
   - **Professor Configuration (`TestBuilderSteps.tsx`)**: Added the **Session Monitoring (Proctoring)** card in Step 3 (`Enable session monitoring`, `Require fullscreen mode`, `Warning limit` default `3`, `Block copy, paste, cut & right-click`, `Auto-submit when warning limit is reached`) plus `Show rank among test takers` (`showRankToStudents`) toggle and Step 4 review summary.
   - **Student Pre-Test Checklist (`PreTestChecklistCard.tsx`, `JoinTestView.tsx`)**: Honest notice clarifying sessions are **monitored (not cheat-proof)**, policy summary tiles, interactive fullscreen permission check, and required monitoring consent checkbox before starting.
   - **Attempt Monitoring Hook (`useProctoringMonitor.ts`, `StudentAttemptView.tsx`, `ProctoringWarningModal.tsx`)**: Detects and logs `tab_switch` (`visibilitychange`), `window_blur` (debounced against `visibilitychange`), `fullscreen_exit` (`fullscreenchange`), `copy`, `paste`, `cut`, `right_click` (`contextmenu`), blocked keyboard shortcuts (`Ctrl/Cmd+C/V/X/P/U`, `F12`, `Ctrl+Shift+I/J/C`, `PrintScreen`), and mid-test `page_reload` (`beforeunload` prompt + `sessionStorage` reload detector). Displays `"Warning X of Y"` Clay modal on each event and auto-submits saved answers on reaching the limit with a persisted reason banner (`autoSubmitReason`).
   - **Immutable Firestore Logging (`attemptService.ts`)**: Writes every violation to `attempts/{id}/violations` (`type`, `label`, `details`, `timestamp`, `timestampMs`, `questionNumber`, `strikeNumber`), updates `violationCount`, `tabSwitchCount`, `integrityScore` (`0–100`), `riskLevel` (`low | medium | high`), and `primaryViolationReason` on `attempts/{id}`, and emits live professor `'integrity'` notifications.
2. **Professor Integrity Review & Live Alerts (`ViolationTimelineCard.tsx`, `SubmissionGradingView.tsx`, `TestSubmissionsView.tsx`, `ProfessorDashboardView.tsx`)**:
   - Added chronological **Violation Timeline** with integrity score `ProgressRing`, Low/Medium/High risk badge, auto-submit reason banner, and **Flag Submission / Clear Flag** action with persisted professor note (`professorFlagged`, `professorFlagCleared`, `professorFlagNote`).
   - Wired Professor Dashboard **Integrity Alerts** card directly to real Firestore data (`attemptService.listProfessorIntegrityAlerts`), clicking through straight to the submission detail view (with `"Sample Data"` badge restricted strictly to Demo Mode).
   - Added Integrity/Risk column and Analytics shortcut button to `TestSubmissionsView.tsx`.
3. **Analytics Dashboards & Exports (`src/features/analytics/`, `src/lib/analytics.ts`, `src/lib/pdfExport.ts`)**:
   - **Professor Analytics (`/professor/analytics`, `/professor/tests/:id/analytics`)**: Class Comparison BarChart across tests (with Avg %, Highest %, Pass % legend), test selector, per-test KPI cards (Average, Highest/Lowest, Pass Rate, Average Time, Integrity Flags), Score Distribution BarChart, Hardest Questions callout, Question-wise Accuracy table, and zero-dependency client-side **Export CSV** and **Export PDF** (`%PDF-1.4`) downloads (no `window.open`).
   - **Student Analytics (`/student/analytics`, `StudentResultView.tsx`)**: KPI summary strip, Progress Over Time AreaChart, Topic-wise Performance `ProgressRing` grid, Weak Topics (`< 70%`) card from question topic tags, and Rank Among Test Takers (`#rank of N`) displayed only when the professor enables `showRankToStudents`. All charts render clean empty states when no data exists.
4. **Navigation & Demo Mode Parity**:
   - Added `Analytics` links in `Sidebar`, `BottomNav`, `Topbar`, and per-test cards; updated Demo Mode sample dataset (`src/features/demo/`) with realistic proctoring violations, integrity alerts, and analytics while preserving `0` Firebase network calls.

### Day 3 Verification Checklist (Honest Report)
| # | Check | Status | Notes |
| :--- | :--- | :--- | :--- |
| 1 | Pure unit tests (`proctoring.test.ts`, `analytics.test.ts`, `grading.test.ts`, `validators.test.ts`, `firebaseErrors.test.ts`) | **Pass** | All 27 `node:test` assertions passing (`computeIntegrityMetrics`, shortcut blocking, auto-submit reason, per-test analytics, class comparison, tie-aware ranking, student weak topics). |
| 2 | TypeScript strict lint (`tsc --noEmit`) & Vite production build | **Pass (Fixed)** | Caught and fixed `computeIntegrityMetrics` argument mapping and `checkBlockedProctoringShortcut` destructuring in `useProctoringMonitor.ts` before browser verification; 0 lint/build errors. |
| 3 | Professor Test Builder: enable monitoring (`limit: 8`), fullscreen required, block copy/paste, auto-submit, `showRankToStudents` | **Pass** | Verified live in Playwright against real Firestore; created & published 3-question test (`Trees`, `Graphs`, `Sorting`, 12 marks, code `KZANF4`). |
| 4 | Student Pre-Test Checklist (`JoinTestView`): honest copy, fullscreen check, consent checkbox gating Start | **Pass** | Verified `"monitored (not cheat-proof)"` notice, Start button disabled before consent/instructions checkboxes, enabled after checking both. |
| 5 | All violation types + Warning modal + Mid-test reload persistence + Auto-submit on limit | **Pass** | Triggered `copy` (#1), `paste` (#2), `cut` (#3), `right_click` (#4), `F12` shortcut (#5), `window_blur` (#6), `beforeunload` + `page_reload` (#7 — verified `2/3 Answered` and countdown timer persisted across reload), and `tab_switch` (#8) -> auto-submitted with clear reason banner on `/student/results/:attemptId`. |
| 6 | Professor Dashboard real Integrity Alerts + Violation Timeline + Flag / Clear Flag persistence | **Pass** | Verified Dashboard `Integrity Alerts` displayed Aarav's real alert (`1 Active`, `High Risk`, `8 warnings`, no `"Sample Data"` badge), clicked through to 8-item chronological timeline from `attempts/{id}/violations`, persisted `"Flagged by Professor"` + note across reload, then persisted `"Flag Cleared"` + updated note across reload. |
| 7 | Professor Analytics raw-data math + CSV & PDF exports | **Pass** | Verified exact match against Student #1 (4/12 = 33%) + Student #2 (12/12 = 100%): `Submissions: 2`, `Average: 66.5% (8/12)`, `Highest: 100%`, `Lowest: 33%`, `Pass Rate: 100%`, Question accuracies Q1 `Trees` 100%, Q2 `Graphs` 50%, Q3 `Sorting` 50%. Exported valid `.csv` and `%PDF-1.4` `.pdf` files with exact numbers. |
| 8 | Student Analytics: Topic rings, Weak Topics, & Opt-in Class Rank | **Pass** | Verified Student #1 weak topics (`Graphs`, `Sorting`), Student #2 clean `100%` topic rings + empty weak topics state + live `Rank #1 of 2` badge on Result & Analytics pages. |
| 9 | Demo Mode zero-network isolation + Light/Dark themes + 360px Mobile responsive check | **Pass (Fixed)** | Verified `0` Firebase/Firestore requests in Demo Mode Analytics, `Sample Data` badge, `0px` horizontal overflow at `360px` width, and added visible `Avg % / Highest % / Pass %` color legend to Class Comparison chart after visual inspection. |

---

## Day 1.75 — Loader Simplification, Auth Hardening & Viewer Demo Mode (Completed)

### What Was Built
1. **Simplified 3-Dot Loader (`src/components/ui/Loader.tsx`, `src/styles/theme.css`)**:
   - Removed the heavy card, border, logo, tagline, and `"LOADING"` text from `<Loader />` everywhere.
   - Renders only the 3 staggered bouncing dots (`#6C5CE7`, `#A89CF5`, `#5CC9A7` in light mode; lighter purple/mint tones in dark mode) with ground shadows, `size` (`sm | md | lg`), `fullscreen`, and `prefers-reduced-motion` support.
2. **Auth Hardening & Self-Diagnostics (`src/features/auth/AuthErrorAlert.tsx`, `src/pages/AuthDebugPage.tsx`)**:
   - When `auth/unauthorized-domain` occurs, displays the exact current hostname (`window.location.hostname`) in a copyable chip with a `"Copy"` button and clear Firebase Console setup instructions.
   - Kept Email/Password signup/login completely isolated from Google Sign-In failures; added an iframe `"Open in new tab"` hint using a native anchor (`target="_blank" rel="noopener noreferrer"`).
   - Added a dev-only `/auth-debug` page (`import.meta.env.DEV`) showing hostname, iframe status, Firebase initialization status, `VITE_FIREBASE_*` presence booleans (never values), session state, and last auth error code.
   - Removed the eager Firestore connection probe at module import so zero Firestore requests occur before sign-in or during Demo Mode.
3. **Isolated Client-Side Viewer Demo Mode (`src/features/demo/`)**:
   - Added a secondary `"Explore demo"` button on `/login` with `"View as Professor"` and `"View as Student"` previews stored solely in `sessionStorage` (`evalynx_demo_role`) and memory.
   - Populated realistic Indian academic sample data (Dr. Kavita Deshmukh, Aarav Kulkarni, Priya Nair, Rohan Verma, Sneha Iyer, Aditya Menon; 4 DSA/DBMS/Aptitude/OS tests across Live/Scheduled/Completed/Draft; submissions, results, charts, notifications, and `"Sample Data"` integrity alerts).
   - Added the persistent top Clay banner (`"You are viewing a demo. Changes are not saved."` with `"Create free account"` and `"Exit demo"` buttons) and a Clay write-guard modal (`"This is a demo. Create a free account to do this."`) on every write action.
   - Guaranteed zero Firebase Auth/Firestore network calls in Demo Mode and complete state isolation from real user accounts.

### Day 1.75 Verification Checklist (Honest Report)
| # | Check | Status | Notes |
| :--- | :--- | :--- | :--- |
| 1 | Simplified 3-dot Loader (`sm`/`md`/`lg`/`fullscreen`, light & dark, no card/logo/text) | **Pass** | Verified in DOM snapshot (`role="status" aria-label="Loading"` only) and CSS tokens across light & dark modes. |
| 2 | Real Email/Password signup, login, reload persistence, role redirect, role protection & logout | **Pass** | Verified fresh Professor & Student signups creating real Firestore `users/{uid}`, reload retention, `/login` redirect when signed in, Student blocked from `/professor/dashboard`, and clean logout. |
| 3 | Friendly auth errors & `/auth-debug` (dev-only, boolean-only env flags, no secret leaks) | **Pass** | Verified wrong password & duplicate email show friendly copy with zero `Firebase: Error` or raw `auth/...`; `/auth-debug` renders hostname + `true`/`false` flags only (zero API key strings). |
| 4 | `auth/unauthorized-domain` hostname chip + Copy button + iframe new-tab hint | **Pass (Unit + Component Verified)** | `AuthMappedError` & `isUnauthorizedDomainError` verified in `firebaseErrors.test.ts` (20/20 unit tests passing) and `AuthErrorAlert.tsx`; actual Google popup auth on preview/prod hosts requires adding the hostname in Firebase Console. |
| 5 | Viewer Demo Mode (Professor & Student): banner, realistic sample data, write-guard modals, Exit demo, reload persistence | **Pass (Fixed)** | Verified `"You are viewing a demo. Changes are not saved."`, `"This is a demo. Create a free account to do this."` on Create/Delete/Save, reload retention, clean exit, and fixed `getInitials` so `Dr. Kavita Deshmukh` displays `KD`. |
| 6 | Zero Firebase network calls during Demo Mode & post-demo real account isolation | **Pass (Fixed)** | Removed eager Firestore connection probe; Playwright network audit confirmed `0` Firestore/IdentityToolkit requests across Professor & Student demo sessions, and real login immediately afterward showed zero demo leakage. |
| 7 | Responsive `360px` mobile layout, Light & Dark modes, clean build/lint & 0 runtime page errors | **Pass** | Verified `scrollWidth === 360` (`ok: true`) on `/login`, Professor Demo, and Student Demo; visually inspected screenshots in light & dark modes; `tsc --noEmit` and `npm run build` passed cleanly. |

---

## Day 2 — Test Builder, Test Attempt & Result Engine (Completed)

### What Was Built
1. **Professor Test Builder (`/professor/tests/new`, `/professor/tests/:id/edit`)**:
   - 4-step Minimal Claymorphism wizard: **1. Basic Info** (title, subject, category, description, student instructions), **2. Questions**, **3. Settings**, and **4. Review & Publish**.
   - Supports **MCQ (single)**, **Multiple-Correct**, **True / False**, **Short Answer**, and **Long Answer**, with **Coding** displayed as disabled (`"Later"`).
   - Per-question editor (`QuestionEditorCard.tsx`): prompt, optional Firebase Storage image upload (`question-images/{professorId}/{testId}/...`), dynamic options, correct answer selection, marks, negative marks, difficulty, topic tag, explanation, subjective grading rubric, and one-click **Save to Question Bank** (`questionBank` collection).
   - Add, duplicate, delete, drag-and-drop & up/down reorder, **Bulk CSV Import** + downloadable CSV template, draft auto-save every 10 seconds, pre-publish validation (`>= 1` question, valid schedule window, every objective question has a correct answer), and auto-generated 6-character join code + copyable `/join/:code` link.
2. **Professor Tests Management (`/professor/tests`)**:
   - Real Firestore list with status tabs dynamically derived from schedule (`All`, `Draft`, `Scheduled`, `Live`, `Completed`), live search, category filter, Edit, Duplicate, Delete (with confirmation modal), Copy Code/Link, and View Submissions.
3. **Student Join & Distraction-Free Attempt Runner (`/join/:code`, `/student/attempt/:attemptId`)**:
   - Safe redirect preservation (`location.state.from`) so unauthenticated students opening `/join/:code` land directly back on the join screen after signing in or signing up.
   - Schedule window and attempt-limit validation, active attempt **Resume** detection, and required `"I understand"` instructions confirmation checkbox before starting.
   - Distraction-free Clay attempt UI: floating top bar with live auto-save status (`Saved`/`Saving...`), server-time anchored countdown timer (`<= 5 min` amber warning, `<= 1 min` coral pulse), theme toggle, Question Palette (Current / Answered / Marked for Review / Unanswered with color + text counts), Previous / Next / Mark for Review / Clear Answer controls, debounced Firestore auto-save (`800ms`), reload persistence without timer reset, per-student question/option shuffle order saved in the attempt document, auto-submit on time expiry, and manual submit confirmation modal.
4. **Auto-Grading, Manual Grading & Results (`/student/results/:attemptId`, `/professor/tests/:id/submissions`, `/professor/tests/:id/submissions/:attemptId`)**:
   - Pure, unit-tested grading engine (`src/lib/grading.ts`) auto-grading MCQ, Multiple-Correct, and True/False on submit with negative marking support while flagging Short/Long answers as `"Pending Review"`.
   - Answer keys isolated in `tests/{id}/private/answerKey` (never written into student-readable `tests/{id}/questions/*`).
   - Student Result page respects `showResultMode` (`immediate` vs `after_review`), rendering score, percentage `ProgressRing`, Pass/Fail or Pending Review status, Correct/Wrong/Skipped/Pending counts, per-question breakdown, explanations, and professor feedback.
   - Professor Submissions table (search, status filter, sort by date/score/time) + Manual Grading screen with rubric display, marks input, feedback field, and live recomputation of `attempts/{id}`, `results/{id}`, and test `averageScore`.
5. **Security Documentation (`docs/FIRESTORE_RULES.md`)**:
   - Complete Cloud Firestore Security Rules, Firebase Storage Rules, Firebase Console deployment steps, and optional Blaze-plan Cloud Function server-only grading notes.

### Day 2 Verification Checklist (Honest Report)
| # | Check | Status | Notes |
| :--- | :--- | :--- | :--- |
| 1 | Pure unit tests (`grading.test.ts`, `validators.test.ts`, `firebaseErrors.test.ts`) | **Pass (Fixed)** | Fixed `-0` rounding edge case in `roundMarks`; 19/19 `node:test` assertions passing. |
| 2 | Professor Test Builder (4 steps, MCQ + Multi-Correct + Short Answer, Save to Bank, Publish) | **Pass (Fixed)** | Verified live in Playwright against real Firestore; fixed `Toggle` component so clicking label text toggles switches. |
| 3 | Professor Tests list (`/professor/tests`) tabs, search, copy code/link, submissions navigation | **Pass** | Verified newly published test appeared immediately under Live tests and navigated cleanly to Submissions. |
| 4 | Student `/join/:code` redirect preservation, instructions checkbox & Start Test | **Pass** | Verified unauthenticated `/join/:code` -> Signup as Student -> automatic redirect back to `/join/:code` -> checkbox + Start Test. |
| 5 | Student Attempt Runner: answer Q1–Q3, Mark for Review, debounced auto-save, **reload mid-test** | **Pass** | Verified live reload retained `3/3 Answered`, `Marked (1)`, question order, and server-anchored timer (did not reset to `30:00`). |
| 6 | Submit Confirmation modal + Objective Auto-Grading + Student Result review (`/student/results/:attemptId`) | **Pass** | Verified `6/10 (60%)` auto-graded on Q1+Q2 and Q3 flagged `Pending Manual Review` with per-question review cards. |
| 7 | Professor Submissions table & Manual Grading (`/professor/tests/:id/submissions/:attemptId`) | **Pass** | Verified Professor opened Aarav Sharma's submission, graded Q3 (`4/4` + feedback), saved & published -> updated immediately to `10 / 10 (100%)` `Evaluated`. |
| 8 | Zero TypeScript errors, clean Vite build, & zero browser console errors | **Pass** | `tsc --noEmit`, `npm run build`, and Playwright console log (`0 errors, 0 warnings`) all passed cleanly. |
| 9 | Question image upload (Firebase Storage) | **Implemented (Requires Storage Enabled)** | Wired to real Firebase Storage (`uploadQuestionImage`) with 5 MB & image MIME validation; requires Firebase Storage bucket initialization and Storage rules from `docs/FIRESTORE_RULES.md`. |

---

## Day 1.5 — Fix, Clean Up, Redesign & Test (Completed)

### Summary
- Replaced all mock data with real Firebase Auth & Firestore (`users/{uid}`, `tests`, `results`, `notifications`), added Google Sign-In popup-to-redirect fallback + `/choose-role`, centralized friendly error mapping (`src/lib/firebaseErrors.ts`), and redesigned the entire UI in Minimal Claymorphism (`src/styles/theme.css`, `ClayCard`, `ClayButton`, `ClayInput`, `ClayBadge`). All 12 Day 1.5 verification items passed.

---

## Day 1 — Initial Foundation & Evalynx Rebrand (Completed)
- Established project structure, Evalynx SVG Logo (`src/components/ui/Logo.tsx`, `public/favicon.svg`), custom 3-ball CSS `Loader`, and living `/docs` architecture documentation.

## Known Limitations / Manual Setup Required
- **Firestore & Storage Security Rules**: Publish the updated Day 3 rules documented in `docs/FIRESTORE_RULES.md` (which add append-only `attempts/{attemptId}/violations/{violationId}` rules and conditional opt-in peer rank reads on `results/{resultId}`) inside Firebase Console -> Firestore Database -> Rules and Storage -> Rules.
- **Google Sign-In Authorized Domains**: Add deployment/preview hostnames in Firebase Console -> Authentication -> Settings -> Authorized domains.
- **Browser Monitoring Transparency**: Browser-level proctoring monitors focus changes, fullscreen exits, reloads, and clipboard/shortcut actions, and is intentionally presented as **monitored (not cheat-proof)**. Webcam/vision monitoring and Gemini AI features are scheduled for Phases 5 and 6.

## Suggested Next Prompt
- **Day 4 (Phase 4)**: *"Build the dedicated Professor Question Bank browser & import picker inside Test Builder, plus an Admin role overview for department faculty & assessment oversight."*

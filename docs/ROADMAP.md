# Evalynx — Implementation Roadmap

## Phase 1 — Foundation, Auth, Dashboards & Documentation (Day 1)
- [x] Project architecture, strict folder structure, and living docs in `/docs`
- [x] Brand Identity System: Evalynx SVG Logo (`icon`, `full`, `mono-white`), `/favicon.svg`, and custom 3-ball bouncing `Loader`
- [x] ProtectedRoute & RoleRoute guards (`/professor/*` vs `/student/*`)
- [x] Responsive AppShell (curved purple sidebar, top command bar, mobile bottom nav)
- [x] Professor & Student Dashboards, Tests & Settings pages

## Phase 1.5 — Fix, Clean Up, Redesign & Test (Day 1.5)
- [x] Real Firebase Auth (`onAuthStateChanged`, Email/Password, Forgot Password, Google Sign-In popup-to-redirect fallback, friendly error mapping)
- [x] First-time Google user one-step role selection (`/choose-role`) persisting `users/{uid}` in Firestore
- [x] Complete removal of all mock data, demo buttons, fake stats/charts/alerts, and unbuilt shell routes
- [x] Minimal Claymorphism redesign (`src/styles/theme.css`, `ClayCard`, `ClayButton`, `ClayInput`, `ClayBadge`, centered `440px` auth card, decluttered Light/Dark dashboards)
- [x] Unit test suite (`validators.test.ts`, `firebaseErrors.test.ts`) + Playwright browser E2E & responsive verification

## Phase 1.75 — Loader Simplification, Auth Hardening & Viewer Demo Mode (Day 1.75)
- [x] Simplified `Loader` component to 3 bouncing dots only (no box/card/logo/text), with light & dark mode color tokens and `prefers-reduced-motion` support
- [x] Self-diagnosing `auth/unauthorized-domain` alert with copyable `window.location.hostname` chip, iframe new-tab hint, independent Email/Password auth, and dev-only `/auth-debug` diagnostics page (boolean-only env flags)
- [x] Isolated client-side, read-only Viewer Demo Mode (`src/features/demo/`) with `"Explore demo"` entry (`View as Professor` / `View as Student`), realistic Indian academic sample data, persistent demo banner, write-guard Clay modal, and zero Firebase network calls

## Phase 1.9 — Deep UI Redesign: 3-Layer Shell, S-Curve Sidebar, 70/20/7/3 Palette & SVG Illustrations (Day 1.9)
- [x] 3-Layer Shell (`ShellLayout`): soft lavender canvas (`#D9DAEE` / `#0E0C2B`) with faint decorative SVG lines + single rounded `40px` off-white panel (`#FAFAFE` / `#1A1744`) with internal scroll
- [x] Attached inline SVG purple S-curve sidebar tab (`SidebarTab`) flush (`0px` seam) to the panel's left border, vertically centered with hover tooltips + floating purple mobile bottom dock (`BottomNav`) on `<768px`
- [x] Light flat `Topbar` with `36px` logo mark, purple underline-active text tabs, `Ctrl K` search input, segmented Light/Dark toggle, dark navy primary CTA, and account menu
- [x] Strict 70/20/7/3 soft color system, unified lavender stat icon tiles, and purple/lavender/mint chart discipline across Light & Dark themes
- [x] 12 custom theme-aware inline SVG illustrations (`src/components/illustrations/`) + dev-only `/dev/illustrations` showcase
- [x] Bento Professor & Student Dashboards (`IllustratedActionCard`, `FeatureCard`, `StatChip`, `DashedAddCard`, dual `ProgressRing` cards) without altering business logic, auth, or data services

## Phase 2 — Test Builder, Test Attempt & Result Engine (Day 2 / 2A)
- [x] 4-step Professor Test Builder (`/professor/tests/new`, `/professor/tests/:id/edit`) with collapsible question cards, delete confirmation, live summary strip, optional nullable schedule, 10s + step-change auto-save, unsaved-changes guard, pure `src/lib/testValidation.ts` + unit tests, unique 6-char join code, and Publish Success screen with copyable `/join/:code` link
- [x] Reusable `questionBank` Firestore save action per question
- [x] Professor Tests management (`/professor/tests`) with dynamic schedule status tabs (`Draft`, `Scheduled`, `Live`, `Completed`), updated-date sort, search, filter, duplicate, delete, and submissions entry
- [x] Student Join (`/join/:code`) with redirect preservation, schedule & attempt-limit enforcement, resume detection, and `"I understand"` confirmation
- [x] Distraction-free Student Timed Attempt Runner (`/student/attempt/:attemptId`) with question palette, Mark for Review, Clear Answer, server-time anchored countdown (5 min amber / 1 min coral warnings), debounced Firestore auto-save, mid-test reload resume, auto-submit on timeout, and submit confirmation modal
- [x] Isolated answer keys (`tests/{id}/private/answerKey`), pure objective auto-grading with negative marking (`src/lib/grading.ts` + `grading.test.ts`), `showResultMode` visibility control, Student Result review (`/student/results/:attemptId`), Professor Submissions table, and Manual Grading view (`/professor/tests/:id/submissions/:attemptId`)
- [x] Production Firestore & Storage Security Rules documented in `docs/FIRESTORE_RULES.md`

## Phase 3 — Browser Proctoring Basics & Analytics Dashboards (Day 3)
- [x] Professor test monitoring settings (enable monitoring, fullscreen required, warning limit default 3, copy/paste/right-click block, auto-submit on limit) & opt-in student rank toggle
- [x] Pre-Test Monitoring Checklist (`PreTestChecklistCard`) with honest *"monitored, not cheat-proof"* notice, fullscreen permission check, and consent checkbox
- [x] Real-time event detection & immutable `attempts/{id}/violations` logging: tab switch (`visibilitychange`), window blur, fullscreen exit, copy/paste/cut, right-click, restricted shortcuts (`Ctrl+C/V/X/P/U`, `F12`, `Ctrl+Shift+I/J/C`, `PrintScreen`), and page reload (`beforeunload` + `sessionStorage` reload detector)
- [x] `"Warning X of Y"` Clay modal, integrity score (`0–100`), Low/Medium/High risk badge, auto-submit on limit with clear reason banner, and reload-safe timer/answer persistence
- [x] Professor Submission Violation Timeline + `"Flag / Clear Flag"` decision with persisted review note, plus real Firestore Integrity Alerts card on Professor Dashboard
- [x] Professor Analytics (`/professor/analytics`, `/professor/tests/:id/analytics`): per-test KPIs, score distribution chart, question-wise accuracy, hardest questions, average time, class comparison across tests, and **Export CSV** & **Export PDF**
- [x] Student Analytics (`/student/analytics`): progress over time chart, topic-wise performance rings, weak topics (`< 70%`), and opt-in class rank (`#rank of N`)

## Phase 4 — Question Bank Browser & Institution Controls
- [ ] Dedicated Question Bank browser & picker inside Test Builder
- [ ] Department Admin dashboard & bulk student roster management

## Phase 5 — Smart Webcam & Face/Eye Monitoring
- [ ] Opt-in webcam calibration & lighting check before test start
- [ ] On-device face presence, multi-face detection, and gaze deviation heuristics
- [ ] Integrity risk scoring engine + professor violation snapshot review drawer

## Phase 6 — Gemini AI Question Generation & Subjective Grading
- [ ] Server-side Gemini API proxy routes (`/api/ai/generate-questions`, `/api/ai/grade-answer`)
- [ ] Syllabus/topic-to-question generator with difficulty & Bloom's taxonomy controls
- [ ] Rubric-based AI draft grading for short/long answers with professor approval workflow

## Phase 7 — Coding Assessments, Adaptive Mode & Bilingual Support
- [ ] Embedded code editor with multi-language templates and test-case runner
- [ ] Adaptive difficulty engine for practice mode
- [ ] Full Hindi (`hi`) + English (`en`) localization toggle across UI and exam headers

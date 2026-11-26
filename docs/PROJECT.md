# Evalynx — Product Vision & Scope

> **Tagline:** Evaluate smarter.

## 1. Vision
Evalynx is a modern, trustworthy online examination and assessment platform engineered for universities, engineering colleges, and coaching institutes. It empowers educators to author multi-format exams rapidly while giving students a calm, fair, distraction-free evaluation environment backed by transparent integrity safeguards and AI-assisted grading.

## 2. User Roles
- **Professor / Faculty (`professor`)**: Creates and schedules multi-format assessments, saves reusable questions to their Question Bank, shares 6-character join codes or direct links, monitors submissions, grades subjective responses with rubrics and feedback, and tracks cohort performance.
- **Student (`student`)**: Joins live tests via access code or `/join/:code` link, attempts timed assessments in a distraction-free workspace with auto-save and reload recovery, reviews scores and explanations, and tracks topic-wise mastery.
- **Administrator (`admin` — Planned Phase 4+)**: Manages institution departments, faculty verification, bulk student onboarding, and compliance policies.

## 3. Delivered & Planned Scope

### Delivered (Days 1, 1.5, 1.75, 2, & 3)
- **Authentication & RBAC**: Real Firebase Authentication (Email/Password, Forgot Password, Google Sign-In with popup-to-redirect fallback, one-step `/choose-role` onboarding) with persistent sessions, safe redirect preservation, and strict role route guards.
- **Minimal Claymorphism Design System**: Centralized Light & Dark Claymorphism tokens (`src/styles/theme.css`), reusable `ClayCard`, `ClayButton`, `ClayInput`, `ClayBadge`, `Toggle`, `Modal`, `ProgressRing`, Evalynx SVG Logo, and simplified 3-ball `Loader`.
- **Real Firestore Dashboards & Isolated Demo Mode**: Professor Dashboard (KPI cards, filterable tests, Recharts performance chart, calendar, clickable recent submissions, live Firestore Integrity Alerts) and Student Dashboard (join by code, upcoming/live exams, clickable recent results, topic mastery rings, calendar), plus client-side read-only Viewer Demo Mode (`zero` Firebase requests).
- **Professor Test Builder & Management**: 4-step Test Builder (Basic Info, Questions with 5 active types + Coding `"Later"`, Settings including Session Monitoring policy & opt-in student rank visibility, Review & Publish), Firebase Storage image attachment, drag-and-drop reorder, CSV bulk import/template, 10s draft auto-save, Save to Question Bank, schedule-driven status tabs (`Draft`, `Scheduled`, `Live`, `Completed`), duplicate, and delete.
- **Student Join, Monitored Attempt & Grading Engine**: `/join/:code` validation, transparent Pre-Test Monitoring Checklist (*"monitored, not cheat-proof"*), fullscreen check & consent checkbox, distraction-free `/student/attempt/:attemptId` runner with live monitoring (tab switch, window blur, fullscreen exit, copy/paste/cut, right-click, blocked shortcuts, page reload detection), warning modal (`Warning X of Y`), auto-submit on limit with clear reason, immutable `attempts/{id}/violations` logging, integrity score & Low/Medium/High risk badge, isolated `tests/{id}/private/answerKey` objective auto-grading, Student Result review, Professor Violation Timeline + Flag/Clear Flag decision notes, and Manual Grading.
- **Analytics Dashboards & Exports**: Professor Analytics (`/professor/analytics`, `/professor/tests/:id/analytics`) with per-test KPIs (average, highest, lowest, pass %, average time, integrity flags), score distribution chart, question-wise accuracy table, hardest questions, class comparison chart across tests, and client-side **Export CSV** & **Export PDF** downloads; Student Analytics (`/student/analytics`) with progress over time chart, topic-wise mastery rings, weak topics (`< 70%`), and opt-in class rank (`#rank of N`).

### Upcoming Phases
- **Phase 4 — Question Bank Browser & Admin Controls**: Dedicated Question Bank browser & picker inside Test Builder and department Admin dashboard.
- **Phase 5 — Vision Proctoring**: Opt-in webcam calibration, client-side face presence & gaze deviation checks, multi-face alerts, and timeline review snapshots.
- **Phase 6 — Gemini AI Co-Pilot**: Server-side Gemini question generation and rubric-driven subjective draft grading (`src/features/ai/`).
- **Phase 7 — Coding Sandbox & Bilingual UX**: Embedded code editor with test-case runner and full Hindi + English (`i18n`) interface toggle.

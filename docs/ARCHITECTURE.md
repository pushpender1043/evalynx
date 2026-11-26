# Evalynx — Technical Architecture

## 1. Tech Stack
- **Frontend Core**: React 19, TypeScript, Vite 8
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss";` + `@custom-variant dark`) with centralized Claymorphism tokens in `src/styles/theme.css` and utility classes in `src/index.css`
- **Routing**: React Router v6 (`BrowserRouter`, `ProtectedRoute`, `RoleRoute`, lazy-loaded Day 2 pages, safe `location.state.from` redirect preservation)
- **State Management**: Zustand (`authStore`, `themeStore`, `uiStore`) — theme persisted in `localStorage`; auth session driven exclusively by Firebase `onAuthStateChanged`
- **Backend / Persistence**: Real Firebase Authentication (Email/Password + Google Sign-In with popup-to-redirect fallback), Cloud Firestore (`users`, `tests`, `tests/{id}/questions`, `tests/{id}/private/answerKey`, `questionBank`, `attempts`, `attempts/{id}/violations`, `results`, `notifications`), and Firebase Storage (`question-images`)
- **Charts, Exports & Icons**: Recharts (responsive performance, score distribution, class comparison, and student progress charts), custom SVG `ProgressRing`, zero-dependency client-side CSV & PDF 1.4 generators (`src/lib/analytics.ts`, `src/lib/pdfExport.ts`), `lucide-react` icons

## 2. Folder Structure
```text
src/
  components/
    ui/                 # ClayCard, ClayButton (incl. navy CTA), ClayInput, ClayBadge, IllustratedActionCard, FeatureCard, StatChip, DashedAddCard, Logo, Loader, Modal, EmptyState, Avatar, Toggle, ProgressRing, ProgressBar, Skeleton, ToastContainer
    illustrations/      # 12 theme-aware inline SVG illustrations (CreateTest, AIGenerator, QuestionBank, Results, EmptyTests, EmptyPerformance, EmptySubmissions, EmptyNotifications, JoinWithCode, PracticeMode, EmptyStudents, Promo)
    layout/             # ShellLayout (3-layer panel), SidebarTab (inline SVG S-curve rail), Sidebar, Topbar, BottomNav, NotificationDrawer, AppShell
    dashboard/          # StatCard, TestListCard, CalendarWidget, PerformanceChart, TopicProgressCard
  features/
    auth/               # AuthLayout, AuthErrorAlert, LoginForm, SignupForm, ForgotPasswordModal
    demo/               # Fully isolated client-side Viewer Demo Mode: demoStore, demoData, demoService, DemoBanner, DemoWriteGuardModal
    professor/          # ProfessorDashboardView, CreateTestModal
    student/            # StudentDashboardView, JoinTestCard, UpcomingTestRow
    tests/
      builder/          # TestBuilderView, TestBuilderSteps, QuestionEditorCard
      management/       # ProfessorTestsView
      attempt/          # JoinTestView, StudentAttemptView
      results/          # StudentResultView, TestSubmissionsView, SubmissionGradingView
    proctoring/         # useProctoringMonitor, ProctoringWarningModal, PreTestChecklistCard, ViolationTimelineCard
    analytics/          # ProfessorAnalyticsView (per-test + class comparison + CSV/PDF export), StudentAnalyticsView (progress, topic rings, weak topics, opt-in rank)
    ai/                 # Reserved interfaces for Phase 6 Gemini Question Generator & Grader
  pages/                # LoginPage, SignupPage, ChooseRolePage, AuthDebugPage (DEV only), IllustrationShowcasePage (DEV only), ProfessorDashboardPage, StudentDashboardPage, TestsShellPage, TestBuilderPage, TestSubmissionsPage, SubmissionGradingPage, ProfessorAnalyticsPage, StudentAnalyticsPage, JoinTestPage, StudentAttemptPage, StudentResultPage, SettingsShellPage
  routes/               # AppRoutes, ProtectedRoute, RoleRoute
  services/             # firebase.ts, authService.ts, userService.ts, testService.ts, questionBankService.ts, attemptService.ts
  store/                # authStore.ts, themeStore.ts, uiStore.ts
  hooks/                # useCountdown.ts, useKeyboardShortcut.ts
  lib/                  # utils.ts, constants.ts, validators.ts, analytics.ts, grading.ts, proctoring.ts, pdfExport.ts, firebaseErrors.ts, firestoreError.ts (+ *.test.ts)
  types/                # user.ts, test.ts, question.ts, result.ts
  styles/               # theme.css (Light & Dark Claymorphism design tokens)
docs/                   # Living engineering docs + FIRESTORE_RULES.md
```

## 3. Data Flow & Service Layer Isolation
UI components never import `firebase/auth`, `firebase/firestore`, or `firebase/storage` directly:
1. **`src/services/firebase.ts`**: Initializes Firebase App, Auth, Firestore, and Storage from `VITE_FIREBASE_*` env variables (no eager Firestore network probes at import time). Exposes boolean-only env presence (`getFirebaseEnvPresence`) and SDK readiness (`getFirebaseInitStatus`) for `/auth-debug`.
2. **`src/services/authService.ts`**: Manages `onAuthStateChanged` session hydration, Email/Password login & signup, Forgot Password, Google Sign-In (popup with guarded redirect fallback), and logout. Wraps all Firebase errors in `AuthMappedError` with friendly messages and preserved error codes (never exposing raw `Firebase: Error (...)`).
3. **`src/services/userService.ts`**: Reads, creates, and updates real Firestore `users/{uid}` profiles.
4. **`src/services/testService.ts`**: Handles Test Builder writes (splitting student-safe `tests/{id}/questions/*` from private `tests/{id}/private/answerKey`), schedule-derived status computation, test duplication/deletion, Firebase Storage question image upload, and dashboard aggregate reads.
5. **`src/services/questionBankService.ts`**: Saves and queries reusable professor questions in `questionBank`.
6. **`src/services/attemptService.ts`**: Manages student attempt creation/resumption (persisting per-student shuffle order), server-time clock offset synchronization (`lastSyncedAt: serverTimestamp()` via `getDocFromServer`), debounced answer auto-save, immutable violation logging (`attempts/{id}/violations`) with integrity score & risk classification, auto-submit reason persistence, attempt lock + objective auto-grading via `src/lib/grading.ts`, `results/{attemptId}` summaries, real Professor Integrity Alerts queries, professor Flag / Clear Flag review persistence, and manual grading updates.
7. **Viewer Demo Mode Isolation (`src/features/demo/`)**: Read-only client-side preview stored strictly in `sessionStorage` (`evalynx_demo_role`) and memory. While active, Firebase Auth listeners are detached and service reads dynamically import `demoService` instead of hitting Firestore — guaranteeing **zero** Firebase network requests. Every write action is intercepted by `triggerDemoWriteGuard()` to show the Clay `"This is a demo. Create a free account to do this."` modal. Real authenticated code paths never load or receive demo data.
8. **Pure Logic Tests**: `src/lib/validators.test.ts`, `src/lib/firebaseErrors.test.ts`, `src/lib/grading.test.ts`, `src/lib/proctoring.test.ts`, and `src/lib/analytics.test.ts` validate pure functions via `node:test` (27 passing assertions).

## 4. Active Routes & Access Control
- **Public Auth**: `/login`, `/signup`, `/choose-role` (redirects authenticated users away, preserving safe internal `location.state.from` destinations such as `/join/:code`).
- **Dev Diagnostics & Preview**: `/auth-debug` and `/dev/illustrations` — mounted **only** when `import.meta.env.DEV` is true (`/auth-debug` displays hostname, iframe flag, Firebase init & boolean env presence, and last auth error code; `/dev/illustrations` previews all 12 custom inline SVGs in Light & Dark modes).
- **Shared Protected**: `/join/:code` (Student join with pre-test monitoring checklist & start/resume flow; Professor preview with Builder/Submissions links).
- **Professor Routes (`RoleRoute`)**: `/professor/dashboard`, `/professor/tests`, `/professor/tests/new`, `/professor/tests/:id/edit`, `/professor/tests/:id/submissions`, `/professor/tests/:id/submissions/:attemptId`, `/professor/analytics`, `/professor/tests/:id/analytics`, `/professor/settings`.
- **Student Routes (`RoleRoute`)**: `/student/dashboard`, `/student/tests`, `/student/attempt/:attemptId` (distraction-free monitored shell), `/student/results/:attemptId`, `/student/analytics`, `/student/settings`.

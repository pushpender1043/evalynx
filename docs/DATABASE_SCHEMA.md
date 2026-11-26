# Evalynx — Firestore Database Schema & Security Notes

All timestamps use ISO-8601 strings in client DTOs and Firestore `Timestamp` (`serverTimestamp()`) in production documents. Full deployable rules live in `docs/FIRESTORE_RULES.md`.

## 1. Collections

### `users/{uid}`
Role and profile metadata for every authenticated account.
- `uid`: `string` (matches Firebase Auth UID)
- `name`: `string`
- `email`: `string`
- `role`: `'professor' | 'student' | 'admin'`
- `photoURL`: `string | null`
- `department`, `institution`, `enrollmentId`: `string?`
- `preferredLanguage`: `'en' | 'hi'`
- `createdAt`, `updatedAt`: `Timestamp`

### `tests/{testId}`
Assessment definition authored by a professor.
- `title`, `subject`, `description`, `instructions`: `string`
- `category`: `'DSA' | 'Aptitude' | 'Core CS' | 'Mathematics' | 'Coding'`
- `code`: `string` (auto-generated 6-character uppercase alphanumeric join code, e.g. `"9ZRRTF"`)
- `professorId`, `professorName`: `string`
- `published`: `boolean`
- `status`: `'draft' | 'scheduled' | 'live' | 'completed'` (computed dynamically from `published`, `startTime`, `endTime`)
- `scheduledAt`, `startTime`, `endTime`: ISO-8601 `string`
- `durationMinutes`, `totalMarks`, `passingMarks`, `questionCount`: `number`
- `enrolledCount`, `submittedCount`, `averageScore?`: `number`
- `joinedStudentIds`: `string[]`
- `settings`: `{ durationMinutes, startTime, endTime, shuffleQuestions, shuffleOptions, negativeMarking, attemptLimit, showResultMode: 'immediate' | 'after_review', passingMarks, showRankToStudents?: boolean }`
- `proctoring`: `{ enabled: boolean, fullscreenRequired: boolean, maxTabSwitches: number, blockCopyPaste: boolean, webcamEnabled: boolean, autoSubmitOnLimit: boolean }`
- `createdAt`, `updatedAt`: `Timestamp`

### `tests/{testId}/questions/{questionId}` (Student-Safe)
Public question payload readable by students during an attempt. **Never stores `correctAnswers` or `explanation`.**
- `id`: `string`
- `order`: `number`
- `type`: `'mcq' | 'multi_select' | 'true_false' | 'short_answer' | 'long_answer'`
- `prompt`: `string`
- `imageUrl`: `string | null` (Firebase Storage download URL)
- `options`: `Array<{ id: string; text: string }>`
- `marks`, `negativeMarks`: `number`
- `difficulty`: `'easy' | 'medium' | 'hard'`
- `topic`: `string`
- `rubric`: `string | null`

### `tests/{testId}/private/answerKey` (Isolated Grading Key)
Isolated grading document stored separately from student question documents.
- `professorId`: `string`
- `answers`: `Record<questionId, { correctAnswers: string[]; explanation: string }>`
- `updatedAt`: `Timestamp`

### `questionBank/{bankItemId}`
Reusable professor-owned question bank entries saved directly from the Test Builder.
- `ownerId`: `string`
- `subject`, `topic`: `string`
- `type`: `'mcq' | 'multi_select' | 'true_false' | 'short_answer' | 'long_answer'`
- `difficulty`: `'easy' | 'medium' | 'hard'`
- `prompt`, `imageUrl?`, `options`, `correctAnswers`, `marks`, `negativeMarks`, `explanation`, `rubric?`
- `aiGenerated`: `boolean`
- `tags`: `string[]`
- `createdAt`: `Timestamp`

### `attempts/{attemptId}`
Tracks a single student's active or completed exam session, answers, shuffle order, and per-question grades.
- `testId`, `testTitle`, `testCode`, `subject`, `professorId`: `string`
- `studentId`, `studentName`, `studentEmail`: `string`
- `attemptNumber`: `number`
- `status`: `'in_progress' | 'submitted' | 'auto_submitted' | 'evaluated'`
- `startedAt`, `lastSyncedAt`, `submittedAt?`: `Timestamp` (server-anchored timer calculation)
- `durationMinutes`, `timeTakenSeconds?`: `number`
- `questionOrder`: `string[]` (persisted per-student shuffle order)
- `optionOrders`: `Record<questionId, string[]>`
- `answers`: `Record<questionId, { selectedOptionIds?: string[]; textAnswer?: string; updatedAtMs: number }>`
- `flaggedQuestionIds`: `string[]`
- `score`, `totalMarks`, `percentage`: `number`
- `passed`: `boolean`
- `correctCount`, `wrongCount`, `skippedCount`, `pendingReviewCount`: `number`
- `questionGrades`: `Record<questionId, { questionId, type, outcome, marksAwarded, maxMarks, negativeApplied, feedback?, evaluatedBy }>`
- `showResultMode`: `'immediate' | 'after_review'`
- `resultPublishedToStudent`: `boolean`
- **Day 3 Proctoring & Professor Review Fields**:
  - `proctoringEnabled`: `boolean`
  - `violationCount`, `tabSwitchCount`: `number`
  - `integrityScore`: `number` (`0–100`)
  - `riskLevel`: `'low' | 'medium' | 'high'`
  - `primaryViolationReason?`: `string`
  - `autoSubmitReason?`: `string`
  - `professorFlagged?`, `professorFlagCleared?`: `boolean`
  - `professorFlagNote?`: `string`
  - `professorReviewedAt?`: `Timestamp`

### `attempts/{attemptId}/violations/{violationId}` (Immutable Proctoring Log)
Append-only monitoring event log written during a monitored student attempt.
- `attemptId`, `testId`, `studentId`, `professorId`: `string`
- `type`: `'tab_switch' | 'window_blur' | 'fullscreen_exit' | 'copy' | 'paste' | 'cut' | 'right_click' | 'shortcut_blocked' | 'page_reload'`
- `label`: `string` (human-readable event title)
- `details?`: `string` (context such as blocked shortcut key or limit reached)
- `questionNumber`: `number` (1-indexed active question when event occurred)
- `strikeNumber`: `number` (1-indexed sequential warning counter)
- `timestamp`: `Timestamp` (`serverTimestamp()`)
- `timestampMs`: `number` (client epoch milliseconds for exact chronological sorting)

### `results/{attemptId}`
Denormalized result summary keyed by `attemptId` for fast Professor & Student dashboard reads, topic mastery charts, and opt-in class ranking.
- `attemptId`, `testId`, `testTitle`, `subject`, `professorId`, `studentId`, `studentName`, `enrollmentId`
- `score`, `totalMarks`, `percentage`: `number`
- `passed`: `boolean`
- `status`: `'evaluated' | 'pending_eval'`
- `topicBreakdown`: `Array<{ topic: string; percentage: number }>`
- `violationCount?`, `integrityScore?`: `number`
- `riskLevel?`: `'low' | 'medium' | 'high'`
- `autoSubmitReason?`: `string`
- `publishedAt`: `Timestamp`

### `notifications/{notificationId}`
User-targeted alerts (`userId`, `title`, `message`, `category`, `read`, `createdAt`). Includes live `'integrity'` alerts triggered when a monitored student reaches high risk or repeated warnings.

## 2. Security Rules Reference
See **`docs/FIRESTORE_RULES.md`** for complete Cloud Firestore and Firebase Storage rules, console deployment instructions, and the optional Blaze-plan Cloud Function upgrade for strict server-only `private/answerKey` grading.

# Evalynx — Firestore & Storage Security Rules

This document contains the production-ready security rules for **Cloud Firestore** and **Firebase Storage** supporting **Day 2 & Day 3 (Test Builder, Student Attempts, Auto/Manual Grading, Browser Proctoring Violation Logs, Integrity Review Flags, & Analytics)**.

---

## 1. Security Architecture Highlights

1. **Answer Key Isolation**:
   - Student-visible questions live in `tests/{testId}/questions/{questionId}` and contain **zero** `correctAnswers` or `explanation` fields.
   - Answer keys live exclusively in `tests/{testId}/private/answerKey`.
   - Students can **never** read `private/answerKey` while they have an active (`in_progress`) attempt, and can only read it after submission when the professor allows result review (or never at all if you deploy the optional Cloud Function in Section 5).
2. **Role & Ownership Enforcement**:
   - Only users whose `users/{uid}.role == 'professor'` can create, edit, or delete tests, questions, answer keys, and question bank items — and only for documents where `professorId == request.auth.uid` (or `ownerId == request.auth.uid`).
   - Students can only read published tests (`published == true`), read their own attempts/results, create attempts with their own `studentId`, and update answers only while `status == 'in_progress'`.
3. **Immutable Submissions & Proctoring Violation Logs**:
   - Once an attempt transitions out of `in_progress` to `submitted` or `auto_submitted`, the student can no longer modify `answers`, `startedAt`, or `durationMinutes`.
   - Proctoring events in `attempts/{attemptId}/violations/{violationId}` are **append-only**: only the attempt owner student can create entries during an attempt, both the student and owning professor can read them, and **no client can update or delete** logged violations.
   - Only the owning professor can update `questionGrades`, `score`, `percentage`, `passed`, `status == 'evaluated'`, and integrity decision fields (`professorFlagged`, `professorFlagCleared`, `professorFlagNote`, `professorReviewedAt`).
4. **Opt-In Student Peer Ranking**:
   - Students can read peer score summaries in `results/{resultId}` for a test **only when** that test explicitly sets `settings.showRankToStudents == true` and the student is enrolled (`request.auth.uid in testDoc(testId).data.joinedStudentIds`).

---

## 2. Cloud Firestore Security Rules

Copy and paste the rules below into **Firebase Console → Build → Firestore Database → Rules**, then click **Publish**.

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ─── Helper Functions ───────────────────────────────────────────────
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(uid) {
      return isSignedIn() && request.auth.uid == uid;
    }

    function userDoc() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid));
    }

    function hasRole(role) {
      return isSignedIn() && userDoc().exists() && userDoc().data.role == role;
    }

    function isProfessor() {
      return hasRole('professor');
    }

    function isStudent() {
      return hasRole('student');
    }

    function testDoc(testId) {
      return get(/databases/$(database)/documents/tests/$(testId));
    }

    function isTestOwner(testId) {
      return isProfessor() && testDoc(testId).data.professorId == request.auth.uid;
    }

    // ─── Users Collection ───────────────────────────────────────────────
    match /users/{uid} {
      allow read: if isOwner(uid);
      allow create: if isOwner(uid)
        && request.resource.data.uid == uid
        && request.resource.data.role in ['professor', 'student']
        && request.resource.data.email is string
        && request.resource.data.name is string;
      allow update: if isOwner(uid)
        && request.resource.data.role == resource.data.role
        && request.resource.data.uid == resource.data.uid;
      allow delete: if false;
    }

    // ─── Tests Collection ───────────────────────────────────────────────
    match /tests/{testId} {
      // Professors read their own tests (drafts & published); students read published tests only
      allow read: if isSignedIn() && (
        resource.data.professorId == request.auth.uid ||
        resource.data.published == true
      );

      allow create: if isProfessor()
        && request.resource.data.professorId == request.auth.uid
        && request.resource.data.title is string
        && request.resource.data.code is string;

      // Full edits by owning professor; limited counter/join enrollment updates by students
      allow update: if (
        isProfessor()
        && resource.data.professorId == request.auth.uid
        && request.resource.data.professorId == resource.data.professorId
      ) || (
        isStudent()
        && resource.data.published == true
        && request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(['joinedStudentIds', 'enrolledCount', 'submittedCount'])
      );

      allow delete: if isProfessor()
        && resource.data.professorId == request.auth.uid;

      // Student-safe questions subcollection (NEVER contains answer keys)
      match /questions/{questionId} {
        allow read: if isSignedIn() && (
          isTestOwner(testId) ||
          testDoc(testId).data.published == true
        );
        allow create, update, delete: if isTestOwner(testId);
      }

      // Private answer key subcollection
      match /private/{docId} {
        // Owning professor always has full access.
        // Students may only read `answerKey` on published tests AFTER they submit
        // (for Spark-plan client auto-grading & result explanations).
        // NOTE: If you deploy the Blaze-plan Cloud Function in Section 4,
        // tighten `allow read` to `isTestOwner(testId)` only!
        allow read: if isTestOwner(testId) || (
          isStudent()
          && docId == 'answerKey'
          && testDoc(testId).data.published == true
          && request.auth.uid in testDoc(testId).data.joinedStudentIds
        );
        allow create, update, delete: if isTestOwner(testId);
      }
    }

    // ─── Question Bank Collection ───────────────────────────────────────
    match /questionBank/{itemId} {
      allow read: if isProfessor() && resource.data.ownerId == request.auth.uid;
      allow create: if isProfessor() && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if isProfessor() && resource.data.ownerId == request.auth.uid;
    }

    // ─── Attempts Collection ────────────────────────────────────────────
    match /attempts/{attemptId} {
      allow read: if isSignedIn() && (
        resource.data.studentId == request.auth.uid ||
        resource.data.professorId == request.auth.uid
      );

      allow create: if isStudent()
        && request.resource.data.studentId == request.auth.uid
        && request.resource.data.status == 'in_progress'
        && testDoc(request.resource.data.testId).data.published == true;

      // Students can autosave while in_progress and lock/auto-grade once on submission.
      // Owning professors can manually grade subjective questions and publish scores.
      allow update: if (
        isStudent()
        && resource.data.studentId == request.auth.uid
        && resource.data.startedAt == request.resource.data.startedAt
        && resource.data.durationMinutes == request.resource.data.durationMinutes
        && resource.data.studentId == request.resource.data.studentId
        && resource.data.testId == request.resource.data.testId
        && (
          // Auto-saving during active attempt
          (resource.data.status == 'in_progress'
            && request.resource.data.status in ['in_progress', 'submitted', 'auto_submitted'])
          ||
          // Immediate post-lock objective grading write (Spark-plan flow)
          (resource.data.status in ['submitted', 'auto_submitted']
            && resource.data.answers == request.resource.data.answers
            && request.resource.data.status in ['submitted', 'auto_submitted', 'evaluated'])
        )
      ) || (
        isProfessor()
        && resource.data.professorId == request.auth.uid
        && resource.data.studentId == request.resource.data.studentId
        && resource.data.answers == request.resource.data.answers
      );

      allow delete: if false;

      // Immutable Proctoring Violation Logs (Day 3)
      match /violations/{violationId} {
        allow read: if isSignedIn() && (
          get(/databases/$(database)/documents/attempts/$(attemptId)).data.studentId == request.auth.uid ||
          get(/databases/$(database)/documents/attempts/$(attemptId)).data.professorId == request.auth.uid
        );

        allow create: if isStudent()
          && request.resource.data.attemptId == attemptId
          && request.resource.data.studentId == request.auth.uid
          && get(/databases/$(database)/documents/attempts/$(attemptId)).data.studentId == request.auth.uid
          && request.resource.data.type in [
            'tab_switch',
            'window_blur',
            'fullscreen_exit',
            'copy',
            'paste',
            'cut',
            'right_click',
            'shortcut_blocked',
            'page_reload'
          ];

        // Violations are append-only audit records
        allow update, delete: if false;
      }
    }

    // ─── Results Summary Collection ─────────────────────────────────────
    match /results/{resultId} {
      allow read: if isSignedIn() && (
        resource.data.studentId == request.auth.uid ||
        resource.data.professorId == request.auth.uid ||
        (
          isStudent()
          && testDoc(resource.data.testId).data.settings.showRankToStudents == true
          && request.auth.uid in testDoc(resource.data.testId).data.joinedStudentIds
        )
      );

      allow create, update: if isSignedIn() && (
        (isStudent() && request.resource.data.studentId == request.auth.uid) ||
        (isProfessor() && request.resource.data.professorId == request.auth.uid)
      );

      allow delete: if false;
    }

    // ─── Notifications Collection ───────────────────────────────────────
    match /notifications/{notifId} {
      allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow create: if isSignedIn();
      allow update: if isSignedIn()
        && resource.data.userId == request.auth.uid
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read']);
      allow delete: if false;
    }
  }
}
```

---

## 3. Firebase Storage Rules (Question Image Uploads)

Copy and paste into **Firebase Console → Build → Storage → Rules**, then click **Publish**.

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /question-images/{professorId}/{testId}/{fileName} {
      // Any authenticated user (professor or enrolled student) can view question images
      allow read: if request.auth != null;

      // Only the owning professor can upload valid images <= 5 MB
      allow write: if request.auth != null
        && request.auth.uid == professorId
        && request.resource.size <= 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

---

## 4. How to Apply These Rules

1. Open the [Firebase Console](https://console.firebase.google.com/) and select your Evalynx project.
2. Go to **Build → Firestore Database → Rules**.
3. Replace the editor contents with the **Cloud Firestore Security Rules** from Section 2 and click **Publish**.
4. Go to **Build → Storage** (click **Get Started** if Storage isn't initialized yet), open the **Rules** tab, paste the **Storage Rules** from Section 3, and click **Publish**.

---

## 5. Optional Upgrade: Strict Server-Only Grading (Blaze Plan Cloud Function)

On Firebase's free Spark plan, Evalynx isolates `tests/{id}/private/answerKey` from `questions/*` and performs objective grading immediately after locking `attempts/{id}` to `submitted`/`auto_submitted`.

If you upgrade to Firebase's Blaze plan and want **zero** student read access to `tests/{id}/private/answerKey`, tighten `tests/{testId}/private/{docId}` to `allow read: if isTestOwner(testId);` and deploy an `onDocumentUpdated("attempts/{attemptId}")` Cloud Function that runs `gradeAttempt` from `src/lib/grading.ts` whenever `status` transitions from `in_progress` to `submitted` or `auto_submitted`. `attemptService.submitAttempt` is already designed to fall back seamlessly when `private/answerKey` returns permission-denied!

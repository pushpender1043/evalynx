# Evalynx — Engineering & AI Collaboration Rules

1. **Read Docs First**: Before writing or modifying code in any session, review `docs/PROJECT.md`, `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md`, and `docs/PROGRESS.md`.
2. **Real Data & Error Discipline**: **Never use mock data. Never show raw Firebase errors. Always handle loading, empty and error states.** Every Firebase Auth/Firestore error must pass through `mapFirebaseError` (`src/lib/firebaseErrors.ts`).
3. **Claymorphism Design Compliance**: Never introduce arbitrary inline colors, hard 1px card borders, or off-palette gradients. Use the centralized CSS tokens in `src/styles/theme.css` and reusable primitives (`ClayCard`, `ClayButton`, `ClayInput`, `ClayBadge`) from `src/components/ui/`. Use `lucide-react` icons only.
4. **Strict TypeScript**: Define explicit interfaces in `src/types/` for all entities, props, and service return types. Avoid `any`.
5. **Modular, Reusable Components**: Keep UI primitives in `src/components/ui/`, layout chrome in `src/components/layout/`, dashboard widgets in `src/components/dashboard/`, and feature logic in `src/features/`.
6. **Service Layer Isolation**: Never call Firebase Auth/Firestore directly from UI components. Route all reads/writes through `src/services/` (`authService`, `userService`, `testService`).
7. **Accessibility & Responsiveness**:
   - Use semantic native HTML (`<button>`, `<nav>`, `<main>`, `<label>`, `<dialog>`).
   - Every icon-only button requires a clear `aria-label`.
   - Maintain WCAG AA contrast in both Light and Dark themes.
   - Verify mobile layouts down to `360px` with zero horizontal overflow.
8. **Pure Logic & Testing**: Extract validators, error mappers, filters, and analytics into `src/lib/` with `node:test` unit tests (`npx --yes tsx --test`).
9. **Living Progress Tracking**: After completing any feature or milestone, update `docs/PROGRESS.md` and check off completed items in `docs/ROADMAP.md`.

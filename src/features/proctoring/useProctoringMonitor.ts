import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildAutoSubmitLimitReason,
  checkBlockedProctoringShortcut,
  computeIntegrityMetrics,
  VIOLATION_LABELS,
} from '../../lib/proctoring';
import { attemptService } from '../../services/attemptService';
import type {
  ProctoringPolicy,
  RiskLevel,
  TestAttempt,
  ViolationType,
} from '../../types';

export interface ActiveProctoringWarning {
  strikeNumber: number;
  maxStrikes: number;
  type: ViolationType;
  label: string;
  details?: string;
  questionNumber: number;
}

interface UseProctoringMonitorParams {
  enabled: boolean;
  policy: ProctoringPolicy;
  attempt: TestAttempt | null;
  currentQuestionNumber: number;
  isSubmitting: boolean;
  onAutoSubmitLimit: (reason: string) => void;
}

export interface ProctoringMonitorState {
  violationCount: number;
  maxStrikes: number;
  integrityScore: number;
  riskLevel: RiskLevel;
  isFullscreen: boolean;
  activeWarning: ActiveProctoringWarning | null;
  autoSubmittingReason: string | null;
  dismissWarning: () => void;
  requestFullscreen: () => Promise<boolean>;
  clearReloadGuard: () => void;
}

const SESSION_KEY_PREFIX = 'evalynx_active_proctored_attempt_';

export function useProctoringMonitor({
  enabled,
  policy,
  attempt,
  currentQuestionNumber,
  isSubmitting,
  onAutoSubmitLimit,
}: UseProctoringMonitorParams): ProctoringMonitorState {
  const maxStrikes = Math.max(1, policy.maxTabSwitches || 3);

  const [violationCount, setViolationCount] = useState<number>(attempt?.violationCount ?? 0);
  const [integrityScore, setIntegrityScore] = useState<number>(attempt?.integrityScore ?? 100);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(attempt?.riskLevel ?? 'low');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(
    typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false
  );
  const [activeWarning, setActiveWarning] = useState<ActiveProctoringWarning | null>(null);
  const [autoSubmittingReason, setAutoSubmittingReason] = useState<string | null>(null);

  const attemptRef = useRef<TestAttempt | null>(attempt);
  const policyRef = useRef<ProctoringPolicy>(policy);
  const questionNumberRef = useRef<number>(currentQuestionNumber);
  const isSubmittingRef = useRef<boolean>(isSubmitting);
  const onAutoSubmitLimitRef = useRef(onAutoSubmitLimit);

  const strikeCountRef = useRef<number>(attempt?.violationCount ?? 0);
  const recordedTypesRef = useRef<ViolationType[]>([]);
  const lastEventAtRef = useRef<Record<string, number>>({});
  const lastTabSwitchAtRef = useRef<number>(0);
  const autoTriggeredRef = useRef<boolean>(false);
  const initializedAttemptIdRef = useRef<string | null>(null);
  const mountTimestampRef = useRef<number>(Date.now());

  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  useEffect(() => {
    policyRef.current = policy;
  }, [policy]);

  useEffect(() => {
    questionNumberRef.current = currentQuestionNumber;
  }, [currentQuestionNumber]);

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    onAutoSubmitLimitRef.current = onAutoSubmitLimit;
  }, [onAutoSubmitLimit]);

  const clearReloadGuard = useCallback(() => {
    const activeAttempt = attemptRef.current;
    if (!activeAttempt || typeof window === 'undefined') return;
    try {
      window.sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${activeAttempt.id}`);
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const requestFullscreen = useCallback(async (): Promise<boolean> => {
    if (typeof document === 'undefined') return false;
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      return active;
    } catch {
      return false;
    }
  }, []);

  const recordViolation = useCallback(
    async (type: ViolationType, details?: string) => {
      const currentAttempt = attemptRef.current;
      const currentPolicy = policyRef.current;
      if (
        !enabled ||
        !currentAttempt ||
        currentAttempt.status !== 'in_progress' ||
        isSubmittingRef.current ||
        autoTriggeredRef.current
      ) {
        return;
      }

      const now = Date.now();
      const lastForType = lastEventAtRef.current[type] ?? 0;
      if (now - lastForType < 600) {
        return;
      }
      lastEventAtRef.current[type] = now;

      const nextStrike = strikeCountRef.current + 1;
      strikeCountRef.current = nextStrike;

      const nextTypes = [...recordedTypesRef.current, type];
      recordedTypesRef.current = nextTypes;

      const metrics = computeIntegrityMetrics(nextTypes.map((t) => ({ type: t })));
      const qNum = Math.max(1, questionNumberRef.current);
      const label = VIOLATION_LABELS[type];
      const limit = Math.max(1, currentPolicy.maxTabSwitches || 3);

      setViolationCount(nextStrike);
      setIntegrityScore(metrics.integrityScore);
      setRiskLevel(metrics.riskLevel);

      const reachedLimit = currentPolicy.autoSubmitOnLimit && nextStrike >= limit;

      if (reachedLimit) {
        autoTriggeredRef.current = true;
        const reason = buildAutoSubmitLimitReason(limit, label);
        setAutoSubmittingReason(reason);
        setActiveWarning(null);
        clearReloadGuard();

        try {
          await attemptService.logViolation({
            attemptId: currentAttempt.id,
            testId: currentAttempt.testId,
            testTitle: currentAttempt.testTitle,
            studentId: currentAttempt.studentId,
            studentName: currentAttempt.studentName,
            professorId: currentAttempt.professorId,
            type,
            details: details
              ? `${details} — reached monitoring limit (${nextStrike} of ${limit})`
              : `Reached monitoring limit (${nextStrike} of ${limit})`,
            questionNumber: qNum,
            strikeNumber: nextStrike,
            allViolationTypesSoFar: nextTypes,
          });
        } catch {
          // Proceed with auto-submit even if logging fails
        }

        onAutoSubmitLimitRef.current(reason);
        return;
      }

      setActiveWarning({
        strikeNumber: nextStrike,
        maxStrikes: limit,
        type,
        label,
        details,
        questionNumber: qNum,
      });

      void attemptService
        .logViolation({
          attemptId: currentAttempt.id,
          testId: currentAttempt.testId,
          testTitle: currentAttempt.testTitle,
          studentId: currentAttempt.studentId,
          studentName: currentAttempt.studentName,
          professorId: currentAttempt.professorId,
          type,
          details,
          questionNumber: qNum,
          strikeNumber: nextStrike,
          allViolationTypesSoFar: nextTypes,
        })
        .catch(() => {
          // Non-blocking: UI state already reflects the strike
        });
    },
    [enabled, clearReloadGuard]
  );

  // Hydrate existing violation count & types from Firestore on mount + detect mid-test reload
  useEffect(() => {
    if (!enabled || !attempt || attempt.status !== 'in_progress') return;
    if (initializedAttemptIdRef.current === attempt.id) return;
    initializedAttemptIdRef.current = attempt.id;
    mountTimestampRef.current = Date.now();

    let cancelled = false;

    const hydrateAndDetectReload = async () => {
      const existingViolations = await attemptService.listAttemptViolations(attempt.id);
      if (cancelled) return;

      const hydratedTypes = existingViolations.map((v) => v.type);
      const baseCount = Math.max(attempt.violationCount ?? 0, existingViolations.length);
      recordedTypesRef.current = hydratedTypes;
      strikeCountRef.current = baseCount;

      const metrics =
        hydratedTypes.length > 0
          ? computeIntegrityMetrics(hydratedTypes.map((t) => ({ type: t })))
          : {
              integrityScore: attempt.integrityScore ?? 100,
              riskLevel: attempt.riskLevel ?? 'low',
            };

      setViolationCount(baseCount);
      setIntegrityScore(metrics.integrityScore);
      setRiskLevel(metrics.riskLevel);

      // Detect if the student refreshed the page while the proctored attempt was already active
      const storageKey = `${SESSION_KEY_PREFIX}${attempt.id}`;
      let wasReloaded = false;
      try {
        wasReloaded = Boolean(window.sessionStorage.getItem(storageKey));
        window.sessionStorage.setItem(storageKey, String(Date.now()));
      } catch {
        wasReloaded = false;
      }

      if (wasReloaded) {
        void recordViolation(
          'page_reload',
          'Assessment page was reloaded during an active monitored session'
        );
      }
    };

    void hydrateAndDetectReload();

    return () => {
      cancelled = true;
    };
  }, [enabled, attempt, recordViolation]);

  // Attach browser monitoring listeners
  useEffect(() => {
    if (!enabled || !attempt || attempt.status !== 'in_progress') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        lastTabSwitchAtRef.current = Date.now();
        void recordViolation('tab_switch', 'Assessment tab became hidden');
      }
    };

    const handleWindowBlur = () => {
      // Avoid double-counting when a tab switch fires both visibilitychange and blur
      if (Date.now() - lastTabSwitchAtRef.current < 700) return;
      void recordViolation('window_blur', 'Browser window lost focus');
    };

    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active && policyRef.current.fullscreenRequired) {
        if (Date.now() - mountTimestampRef.current > 250) {
          void recordViolation('fullscreen_exit', 'Browser exited fullscreen mode');
        }
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      if (!policyRef.current.blockCopyPaste) return;
      e.preventDefault();
      void recordViolation('copy', 'Copy action blocked');
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (!policyRef.current.blockCopyPaste) return;
      e.preventDefault();
      void recordViolation('paste', 'Paste action blocked');
    };

    const handleCut = (e: ClipboardEvent) => {
      if (!policyRef.current.blockCopyPaste) return;
      e.preventDefault();
      void recordViolation('cut', 'Cut action blocked');
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (!policyRef.current.blockCopyPaste) return;
      e.preventDefault();
      void recordViolation('right_click', 'Context menu / right-click blocked');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const { blocked, shortcutLabel } = checkBlockedProctoringShortcut({
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
      });
      if (!blocked) return;

      const isClipboardShortcut =
        shortcutLabel.includes('+C') ||
        shortcutLabel.includes('+V') ||
        shortcutLabel.includes('+X');
      if (isClipboardShortcut && !policyRef.current.blockCopyPaste) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      void recordViolation('shortcut_blocked', `Blocked keyboard shortcut (${shortcutLabel})`);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmittingRef.current || autoTriggeredRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('paste', handlePaste, true);
    document.addEventListener('cut', handleCut, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('cut', handleCut, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, attempt, recordViolation]);

  const dismissWarning = useCallback(() => {
    setActiveWarning(null);
  }, []);

  return {
    violationCount,
    maxStrikes,
    integrityScore,
    riskLevel,
    isFullscreen,
    activeWarning,
    autoSubmittingReason,
    dismissWarning,
    requestFullscreen,
    clearReloadGuard,
  };
}

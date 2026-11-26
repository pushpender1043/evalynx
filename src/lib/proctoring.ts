import type { RiskLevel, ViolationType } from '../types';

export const VIOLATION_LABELS: Record<ViolationType, string> = {
  tab_switch: 'Switched browser tab',
  window_blur: 'Left assessment window',
  fullscreen_exit: 'Exited fullscreen mode',
  copy: 'Copy action blocked',
  paste: 'Paste action blocked',
  cut: 'Cut action blocked',
  right_click: 'Right-click menu blocked',
  shortcut_blocked: 'Restricted shortcut blocked',
  page_reload: 'Page reload attempted',
};

export const VIOLATION_PENALTIES: Record<ViolationType, number> = {
  tab_switch: 22,
  window_blur: 15,
  fullscreen_exit: 20,
  page_reload: 25,
  copy: 12,
  paste: 15,
  cut: 12,
  shortcut_blocked: 12,
  right_click: 8,
};

export interface IntegrityComputation {
  integrityScore: number;
  riskLevel: RiskLevel;
  violationCount: number;
  tabSwitchCount: number;
  primaryReason: string;
}

export function classifyIntegrityScoreToRisk(integrityScore: number): RiskLevel {
  if (integrityScore < 55) return 'high';
  if (integrityScore < 85) return 'medium';
  return 'low';
}

export function computeIntegrityMetrics(
  violations: Array<{ type: ViolationType; label?: string }>
): IntegrityComputation {
  if (violations.length === 0) {
    return {
      integrityScore: 100,
      riskLevel: 'low',
      violationCount: 0,
      tabSwitchCount: 0,
      primaryReason: 'No monitoring flags recorded',
    };
  }

  let penalty = 0;
  let tabSwitchCount = 0;
  const counts = new Map<ViolationType, number>();

  for (const v of violations) {
    penalty += VIOLATION_PENALTIES[v.type] ?? 10;
    if (v.type === 'tab_switch' || v.type === 'window_blur') {
      tabSwitchCount += 1;
    }
    counts.set(v.type, (counts.get(v.type) ?? 0) + 1);
  }

  const integrityScore = Math.max(0, Math.min(100, 100 - penalty));
  const riskLevel = classifyIntegrityScoreToRisk(integrityScore);

  // Pick the highest-impact violation type as primary reason
  let topType: ViolationType = violations[0].type;
  let topScore = -1;
  counts.forEach((count, type) => {
    const score = count * (VIOLATION_PENALTIES[type] ?? 10);
    if (score > topScore) {
      topScore = score;
      topType = type;
    }
  });

  const topCount = counts.get(topType) ?? 1;
  const baseLabel = VIOLATION_LABELS[topType];
  const primaryReason = topCount > 1 ? `${baseLabel} (${topCount}x)` : baseLabel;

  return {
    integrityScore,
    riskLevel,
    violationCount: violations.length,
    tabSwitchCount,
    primaryReason,
  };
}

export interface ShortcutCheckInput {
  key: string;
  code?: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export function checkBlockedProctoringShortcut(
  input: ShortcutCheckInput
): { blocked: boolean; shortcutLabel: string } {
  const keyLower = (input.key || '').toLowerCase();
  const code = input.code || '';
  const mod = input.ctrlKey || input.metaKey;

  if (keyLower === 'f12' || code === 'F12') {
    return { blocked: true, shortcutLabel: 'F12 (DevTools)' };
  }

  if (keyLower === 'printscreen' || code === 'PrintScreen') {
    return { blocked: true, shortcutLabel: 'PrintScreen' };
  }

  if (mod && input.shiftKey && ['i', 'j', 'c'].includes(keyLower)) {
    return { blocked: true, shortcutLabel: `Ctrl+Shift+${keyLower.toUpperCase()}` };
  }

  if (mod && !input.altKey) {
    if (keyLower === 'c') return { blocked: true, shortcutLabel: 'Ctrl+C' };
    if (keyLower === 'v') return { blocked: true, shortcutLabel: 'Ctrl+V' };
    if (keyLower === 'x') return { blocked: true, shortcutLabel: 'Ctrl+X' };
    if (keyLower === 'p') return { blocked: true, shortcutLabel: 'Ctrl+P' };
    if (keyLower === 'u') return { blocked: true, shortcutLabel: 'Ctrl+U' };
  }

  return { blocked: false, shortcutLabel: '' };
}

export function buildAutoSubmitLimitReason(limit: number, lastViolationLabel: string): string {
  return `Auto-submitted after reaching the monitoring warning limit (${limit} of ${limit}). Latest event: ${lastViolationLabel}.`;
}

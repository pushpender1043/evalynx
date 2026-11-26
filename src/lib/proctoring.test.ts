import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAutoSubmitLimitReason,
  checkBlockedProctoringShortcut,
  classifyIntegrityScoreToRisk,
  computeIntegrityMetrics,
} from './proctoring';

test('computeIntegrityMetrics returns 100 and low risk for zero violations', () => {
  const result = computeIntegrityMetrics([]);
  assert.equal(result.integrityScore, 100);
  assert.equal(result.riskLevel, 'low');
  assert.equal(result.violationCount, 0);
  assert.equal(result.tabSwitchCount, 0);
});

test('computeIntegrityMetrics penalizes violations and escalates risk level accurately', () => {
  const lowRes = computeIntegrityMetrics([{ type: 'right_click' }]);
  assert.equal(lowRes.integrityScore, 92);
  assert.equal(lowRes.riskLevel, 'low');

  const medRes = computeIntegrityMetrics([{ type: 'tab_switch' }, { type: 'copy' }]);
  assert.equal(medRes.integrityScore, 66);
  assert.equal(medRes.riskLevel, 'medium');
  assert.equal(medRes.tabSwitchCount, 1);

  const highRes = computeIntegrityMetrics([
    { type: 'tab_switch' },
    { type: 'fullscreen_exit' },
    { type: 'page_reload' },
  ]);
  assert.equal(highRes.integrityScore, 33);
  assert.equal(highRes.riskLevel, 'high');
  assert.equal(highRes.violationCount, 3);
  assert.equal(classifyIntegrityScoreToRisk(highRes.integrityScore), 'high');
});

test('checkBlockedProctoringShortcut detects copy, paste, print, DevTools, and PrintScreen', () => {
  assert.equal(
    checkBlockedProctoringShortcut({
      key: 'c',
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
    }).blocked,
    true
  );
  assert.equal(
    checkBlockedProctoringShortcut({
      key: 'v',
      ctrlKey: false,
      metaKey: true,
      shiftKey: false,
      altKey: false,
    }).blocked,
    true
  );
  assert.equal(
    checkBlockedProctoringShortcut({
      key: 'p',
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
    }).blocked,
    true
  );
  assert.equal(
    checkBlockedProctoringShortcut({
      key: 'F12',
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
    }).blocked,
    true
  );
  assert.equal(
    checkBlockedProctoringShortcut({
      key: 'PrintScreen',
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
    }).blocked,
    true
  );
  assert.equal(
    checkBlockedProctoringShortcut({
      key: 'a',
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
    }).blocked,
    false
  );
});

test('buildAutoSubmitLimitReason includes limit and triggering event', () => {
  const msg = buildAutoSubmitLimitReason(3, 'Switched browser tab');
  assert.match(msg, /3 of 3/);
  assert.match(msg, /Switched browser tab/);
});

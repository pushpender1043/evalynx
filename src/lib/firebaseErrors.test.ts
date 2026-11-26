import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AuthMappedError,
  extractFirebaseErrorCode,
  isUnauthorizedDomainError,
  mapFirebaseError,
  shouldFallbackToRedirect,
} from './firebaseErrors';

test('extractFirebaseErrorCode reads code property and Firebase message pattern', () => {
  assert.equal(extractFirebaseErrorCode({ code: 'auth/wrong-password' }), 'auth/wrong-password');
  assert.equal(
    extractFirebaseErrorCode(new Error('Firebase: Error (auth/unauthorized-domain).')),
    'auth/unauthorized-domain'
  );
  assert.equal(extractFirebaseErrorCode(new Error('Plain message')), null);
  assert.equal(extractFirebaseErrorCode(null), null);
});

test('isUnauthorizedDomainError identifies auth/unauthorized-domain cleanly', () => {
  assert.equal(isUnauthorizedDomainError({ code: 'auth/unauthorized-domain' }), true);
  assert.equal(
    isUnauthorizedDomainError(new AuthMappedError('Friendly msg', 'auth/unauthorized-domain')),
    true
  );
  assert.equal(
    isUnauthorizedDomainError(new Error('Firebase: Error (auth/unauthorized-domain).')),
    true
  );
  assert.equal(isUnauthorizedDomainError({ code: 'auth/wrong-password' }), false);
});

test('mapFirebaseError translates known Firebase Auth and Firestore errors to friendly text', () => {
  const cases: Array<[string, string]> = [
    ['auth/unauthorized-domain', 'Authorized domains'],
    ['auth/wrong-password', 'Incorrect email or password'],
    ['auth/invalid-credential', 'Incorrect email or password'],
    ['auth/user-not-found', 'No account found'],
    ['auth/email-already-in-use', 'already exists'],
    ['auth/weak-password', 'at least 6 characters'],
    ['auth/too-many-requests', 'Too many attempts'],
    ['auth/network-request-failed', 'Network error'],
    ['auth/popup-blocked', 'blocked the sign-in popup'],
    ['permission-denied', 'Firestore security rules'],
  ];

  for (const [code, expectedSubstring] of cases) {
    const mapped = mapFirebaseError({ code });
    assert.ok(
      mapped.includes(expectedSubstring),
      `Expected "${mapped}" to include "${expectedSubstring}" for code ${code}`
    );
    assert.equal(/Firebase:\s*Error/i.test(mapped), false);
    assert.equal(/auth\/[a-z-]+/i.test(mapped), false);
  }
});

test('mapFirebaseError never leaks raw Firebase Error strings on unknown codes', () => {
  const raw = new Error('Firebase: Error (auth/some-obscure-internal-code).');
  const mapped = mapFirebaseError(raw);
  assert.equal(mapped, 'Something went wrong. Please try again.');
  assert.equal(/Firebase:/i.test(mapped), false);
});

test('shouldFallbackToRedirect returns true only for supported popup failures on first attempt', () => {
  assert.equal(shouldFallbackToRedirect({ code: 'auth/popup-blocked' }, false), true);
  assert.equal(shouldFallbackToRedirect({ code: 'auth/unauthorized-domain' }, false), true);
  assert.equal(
    shouldFallbackToRedirect({ code: 'auth/operation-not-supported-in-this-environment' }, false),
    true
  );
  assert.equal(shouldFallbackToRedirect({ code: 'auth/popup-closed-by-user' }, false), false);
  assert.equal(shouldFallbackToRedirect({ code: 'auth/unauthorized-domain' }, true), false);
});

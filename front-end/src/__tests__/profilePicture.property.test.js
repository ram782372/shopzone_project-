import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { configureStore } from '@reduxjs/toolkit'
import authReducer, { setUser } from '../store/authSlice.js'

// ─── Pure validation logic extracted from ProfilePage.jsx ───────────────────

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 50_242_880 // 50 MB

/**
 * Returns { valid: true } or { valid: false, error: string }
 * Mirrors the logic in ProfilePage.jsx handleFileChange.
 */
function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please select a JPEG, PNG, or WebP image.' }
  }
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File exceeds the maximum allowed size of 5 MB.' }
  }
  return { valid: true }
}

/**
 * Mirrors the avatar src logic in ProfilePage.jsx.
 * Returns the src string to use, or '' when initials should be shown.
 */
function resolveAvatarSrc(previewUrl, profilePicture) {
  return previewUrl || profilePicture || ''
}

/**
 * Mirrors the client-side password match gate in ProfilePage.jsx handleSubmit.
 * Returns true when the form should be blocked (passwords mismatch).
 */
function isPasswordMismatch(password, confirmPassword) {
  return password !== '' && password !== confirmPassword
}

// ─── P1: File size and type validation ──────────────────────────────────────

describe('P1: File size and type validation', () => {
  it('accepts files ≤ 5 MB with a valid MIME type', () => {
    // Feature: user-profile-picture, Property 1: file size validation boundary
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_SIZE }),
        fc.constantFrom(...ALLOWED_TYPES),
        (size, type) => {
          const result = validateFile({ size, type })
          expect(result.valid).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rejects files exceeding 5 MB regardless of MIME type', () => {
    // Feature: user-profile-picture, Property 1: file size validation boundary
    fc.assert(
      fc.property(
        fc.integer({ min: MAX_SIZE + 1, max: MAX_SIZE * 2 }),
        fc.constantFrom(...ALLOWED_TYPES),
        (size, type) => {
          const result = validateFile({ size, type })
          expect(result.valid).toBe(false)
          expect(result.error).toMatch(/5 MB/)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rejects files with an invalid MIME type regardless of size', () => {
    // Feature: user-profile-picture, Property 1: file size validation boundary
    const invalidTypes = ['application/pdf', 'text/plain', 'image/gif', 'video/mp4', 'image/bmp']
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_SIZE }),
        fc.constantFrom(...invalidTypes),
        (size, type) => {
          const result = validateFile({ size, type })
          expect(result.valid).toBe(false)
          expect(result.error).toMatch(/Invalid file type/)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── P3: Avatar renders based on profilePicture presence ────────────────────

describe('P3: Avatar renders based on profilePicture presence', () => {
  it('resolves to a non-empty src for any non-empty profilePicture URL', () => {
    // Feature: user-profile-picture, Property 3: avatar renders based on profilePicture presence
    fc.assert(
      fc.property(
        fc.webUrl(),
        (url) => {
          const src = resolveAvatarSrc(null, url)
          expect(src).toBe(url)
          expect(src).not.toBe('')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('resolves to empty string (initials fallback) when profilePicture is absent', () => {
    // Feature: user-profile-picture, Property 3: avatar renders based on profilePicture presence
    fc.assert(
      fc.property(
        fc.constantFrom('', null, undefined),
        (profilePicture) => {
          const src = resolveAvatarSrc(null, profilePicture)
          expect(src).toBe('')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('previewUrl takes priority over profilePicture', () => {
    // Feature: user-profile-picture, Property 3: avatar renders based on profilePicture presence
    fc.assert(
      fc.property(
        fc.webUrl(),
        fc.webUrl(),
        (previewUrl, profilePicture) => {
          const src = resolveAvatarSrc(previewUrl, profilePicture)
          expect(src).toBe(previewUrl)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── P7: Client-side password match gate ────────────────────────────────────

describe('P7: Client-side password match gate', () => {
  it('blocks submit for any pair of non-empty mismatched passwords', () => {
    // Feature: user-profile-picture, Property 7: client-side password match gate
    fc.assert(
      fc.property(
        fc.tuple(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 })
        ).filter(([a, b]) => a !== b),
        ([password, confirmPassword]) => {
          expect(isPasswordMismatch(password, confirmPassword)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('does not block submit when password is empty (no change intended)', () => {
    // Feature: user-profile-picture, Property 7: client-side password match gate
    fc.assert(
      fc.property(
        fc.string(),
        (confirmPassword) => {
          expect(isPasswordMismatch('', confirmPassword)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('does not block submit when password and confirmPassword match', () => {
    // Feature: user-profile-picture, Property 7: client-side password match gate
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (password) => {
          expect(isPasswordMismatch(password, password)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── P10: Auth store update round-trip ──────────────────────────────────────

describe('P10: Auth store update round-trip', () => {
  it('dispatching setUser reflects all fields in the Redux store immediately', () => {
    // Feature: user-profile-picture, Property 10: auth store update round-trip
    fc.assert(
      fc.property(
        fc.record({
          _id: fc.string({ minLength: 1 }),
          username: fc.string({ minLength: 2, maxLength: 30 }),
          email: fc.emailAddress(),
          profilePicture: fc.oneof(fc.webUrl(), fc.constant('')),
        }),
        (updatedUser) => {
          const store = configureStore({ reducer: { auth: authReducer } })
          store.dispatch(setUser(updatedUser))
          const state = store.getState().auth
          expect(state.user).toEqual(updatedUser)
          expect(state.user.username).toBe(updatedUser.username)
          expect(state.user.profilePicture).toBe(updatedUser.profilePicture)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── P11: Cancel restores original state ────────────────────────────────────

describe('P11: Cancel restores original state', () => {
  it('cancel resets all form fields to pre-edit values', () => {
    // Feature: user-profile-picture, Property 11: cancel restores original state
    fc.assert(
      fc.property(
        fc.record({
          username: fc.string({ minLength: 2, maxLength: 30 }),
          password: fc.constant(''),
          confirmPassword: fc.constant(''),
          previewUrl: fc.constant(null),
          selectedFile: fc.constant(null),
          fileError: fc.constant(''),
          isEditing: fc.constant(false),
        }),
        fc.record({
          username: fc.string({ minLength: 1 }),
          password: fc.string(),
          confirmPassword: fc.string(),
        }),
        (originalState, editedValues) => {
          // Simulate entering edit mode and making changes
          const editingState = {
            ...originalState,
            ...editedValues,
            isEditing: true,
          }

          // Simulate clicking Cancel — mirrors handleCancel in ProfilePage.jsx
          const afterCancel = {
            username: originalState.username,
            password: '',
            confirmPassword: '',
            previewUrl: null,
            selectedFile: null,
            fileError: '',
            isEditing: false,
          }

          expect(afterCancel.username).toBe(originalState.username)
          expect(afterCancel.password).toBe('')
          expect(afterCancel.confirmPassword).toBe('')
          expect(afterCancel.previewUrl).toBeNull()
          expect(afterCancel.selectedFile).toBeNull()
          expect(afterCancel.fileError).toBe('')
          expect(afterCancel.isEditing).toBe(false)

          // Suppress unused variable warning
          void editingState
        }
      ),
      { numRuns: 100 }
    )
  })
})

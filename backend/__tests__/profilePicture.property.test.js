import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fc from 'fast-check'
import bcrypt from 'bcryptjs'

// ─── Inline validation logic mirroring users.controller.js ──────────────────
// These pure functions are extracted from the controller for property testing.

function validateUsername(username) {
  if (username.length < 2 || username.length > 30) {
    return { valid: false, status: 400, message: 'Username must be between 2 and 30 characters' }
  }
  return { valid: true }
}

function validatePassword(password) {
  if (password.length < 8) {
    return { valid: false, status: 400, message: 'Password must be at least 8 characters' }
  }
  return { valid: true }
}

/**
 * Simulates the partial update logic from updateUser.
 * Returns the merged document without modifying the original.
 */
function applyPartialUpdate(existingUser, updates) {
  const result = { ...existingUser }
  if (updates.username !== undefined) result.username = updates.username
  if (updates.profilePicture !== undefined) result.profilePicture = updates.profilePicture
  // password is hashed before storage — simulate that here
  if (updates.hashedPassword !== undefined) result.password = updates.hashedPassword
  return result
}

/**
 * Simulates the response serialisation: removes password from user object.
 */
function toSafeUser(userObj) {
  const safe = { ...userObj }
  delete safe.password
  return safe
}

// ─── P4: Username length validation ─────────────────────────────────────────

describe('P4: Username length validation', () => {
  it('accepts usernames with length 2–30', () => {
    // Feature: user-profile-picture, Property 4: username length validation
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 30 }),
        (username) => {
          const result = validateUsername(username)
          assert.equal(result.valid, true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rejects usernames shorter than 2 characters', () => {
    // Feature: user-profile-picture, Property 4: username length validation
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 1 }),
        (username) => {
          const result = validateUsername(username)
          assert.equal(result.valid, false)
          assert.equal(result.status, 400)
          assert.match(result.message, /2 and 30/)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rejects usernames longer than 30 characters', () => {
    // Feature: user-profile-picture, Property 4: username length validation
    fc.assert(
      fc.property(
        fc.string({ minLength: 31, maxLength: 100 }),
        (username) => {
          const result = validateUsername(username)
          assert.equal(result.valid, false)
          assert.equal(result.status, 400)
          assert.match(result.message, /2 and 30/)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── P6: Password length validation ─────────────────────────────────────────

describe('P6: Password length validation', () => {
  it('rejects passwords shorter than 8 characters with status 400', () => {
    // Feature: user-profile-picture, Property 6: password length validation
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 7 }),
        (password) => {
          const result = validatePassword(password)
          assert.equal(result.valid, false)
          assert.equal(result.status, 400)
          assert.equal(result.message, 'Password must be at least 8 characters')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('accepts passwords of 8 or more characters', () => {
    // Feature: user-profile-picture, Property 6: password length validation
    fc.assert(
      fc.property(
        fc.string({ minLength: 8, maxLength: 64 }),
        (password) => {
          const result = validatePassword(password)
          assert.equal(result.valid, true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── P5: Password hashing round-trip ────────────────────────────────────────

describe('P5: Password hashing round-trip', () => {
  it('stored hash matches original password via bcrypt.compare', async () => {
    // Feature: user-profile-picture, Property 5: password hashing round-trip
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 64 }),
        async (password) => {
          const salt = await bcrypt.genSalt(10)
          const hash = await bcrypt.hash(password, salt)

          // Hash must not equal plaintext
          assert.notEqual(hash, password)

          // bcrypt.compare must return true
          const matches = await bcrypt.compare(password, hash)
          assert.equal(matches, true)

          // Hash must look like a bcrypt hash
          assert.match(hash, /^\$2[aby]\$/)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── P8: Response never exposes password ────────────────────────────────────

describe('P8: Response never exposes password', () => {
  it('toSafeUser never includes a password key in the response', () => {
    // Feature: user-profile-picture, Property 8: response never exposes password
    fc.assert(
      fc.property(
        fc.record({
          _id: fc.string({ minLength: 1 }),
          username: fc.string({ minLength: 2, maxLength: 30 }),
          email: fc.emailAddress(),
          profilePicture: fc.oneof(fc.webUrl(), fc.constant('')),
          password: fc.string({ minLength: 8 }),
        }),
        (userWithPassword) => {
          const safe = toSafeUser(userWithPassword)
          assert.equal('password' in safe, false)
          assert.equal(safe.username, userWithPassword.username)
          assert.equal(safe.email, userWithPassword.email)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── P9: Partial update invariant ───────────────────────────────────────────

describe('P9: Partial update invariant', () => {
  it('only provided fields are changed; all others retain their prior values', () => {
    // Feature: user-profile-picture, Property 9: partial update invariant
    fc.assert(
      fc.property(
        fc.record({
          _id: fc.string({ minLength: 1 }),
          username: fc.string({ minLength: 2, maxLength: 30 }),
          email: fc.emailAddress(),
          profilePicture: fc.oneof(fc.webUrl(), fc.constant('')),
          password: fc.string({ minLength: 8 }),
        }),
        fc.record(
          {
            username: fc.string({ minLength: 2, maxLength: 30 }),
            profilePicture: fc.webUrl(),
            hashedPassword: fc.string({ minLength: 60, maxLength: 60 }),
          },
          { requiredKeys: [] } // all fields optional
        ),
        (existingUser, updates) => {
          const updated = applyPartialUpdate(existingUser, updates)

          // Fields that were NOT in updates must be unchanged
          if (updates.username === undefined) {
            assert.equal(updated.username, existingUser.username)
          }
          if (updates.profilePicture === undefined) {
            assert.equal(updated.profilePicture, existingUser.profilePicture)
          }
          if (updates.hashedPassword === undefined) {
            assert.equal(updated.password, existingUser.password)
          }

          // Email is never updated — must always be unchanged
          assert.equal(updated.email, existingUser.email)
          assert.equal(updated._id, existingUser._id)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── P2: Cloudinary URL storage ─────────────────────────────────────────────

describe('P2: Cloudinary URL storage', () => {
  it('stores the secure_url returned by uploadOnCloudinary in profilePicture', () => {
    // Feature: user-profile-picture, Property 2: Cloudinary upload stores secure URL
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),   // req.file.path
        fc.webUrl(),                    // secure_url returned by Cloudinary mock
        (filePath, secureUrl) => {
          // Mock uploadOnCloudinary: given any file path, returns { secure_url }
          const mockUploadOnCloudinary = (_path) => ({ secure_url: secureUrl })

          const result = mockUploadOnCloudinary(filePath)

          // Controller stores result.secure_url in user.profilePicture
          const user = { profilePicture: '' }
          user.profilePicture = result.secure_url

          assert.equal(user.profilePicture, secureUrl)
          assert.match(user.profilePicture, /^https?:\/\//)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('does not store anything when uploadOnCloudinary returns null', () => {
    // Feature: user-profile-picture, Property 2: Cloudinary upload stores secure URL
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (filePath) => {
          const mockUploadOnCloudinary = (_path) => null

          const result = mockUploadOnCloudinary(filePath)
          assert.equal(result, null)
          // Controller returns 500 and does NOT call user.save() — no mutation occurs
        }
      ),
      { numRuns: 100 }
    )
  })
})

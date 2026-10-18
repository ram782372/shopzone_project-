import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { PassThrough } from 'node:stream'
import cloudinary from '../config/cloudinary.config.js'
import { uploadOnCloudinary } from '../utils/cloudinary.utils.js'

// Offline tests for the refactored uploadOnCloudinary (memoryStorage streaming).
// No real Cloudinary credentials are required — cloudinary.uploader.upload_stream
// is stubbed with a node:stream PassThrough whose `finish` event invokes the
// Cloudinary callback, mirroring how the real uploader signals completion.

const SECURE_URL = 'https://res.cloudinary.com/test/image/upload/v123/sample.jpg'

describe('uploadOnCloudinary (memoryStorage streaming)', () => {
  let originalUploadStream

  before(() => {
    originalUploadStream = cloudinary.uploader.upload_stream
  })

  after(() => {
    cloudinary.uploader.upload_stream = originalUploadStream
  })

  it('streams a buffer to Cloudinary and returns { secure_url } on success', async () => {
    // Feature: user-profile-photo, upload helper streams buffer and stores secure_url
    cloudinary.uploader.upload_stream = (_options, cb) => {
      const stream = new PassThrough()
      stream.on('finish', () => cb(null, { secure_url: SECURE_URL }))
      return stream
    }

    const result = await uploadOnCloudinary(Buffer.from('hello'))
    assert.ok(result)
    assert.equal(result.secure_url, SECURE_URL)
    assert.match(result.secure_url, /^https?:\/\//)
  })

  it('resolves to null when no buffer is provided', async () => {
    // Feature: user-profile-photo, upload helper guards against missing buffer
    const result = await uploadOnCloudinary(undefined)
    assert.equal(result, null)
  })

  it('resolves to null when Cloudinary returns an error', async () => {
    // Feature: user-profile-photo, upload helper returns null on failure
    cloudinary.uploader.upload_stream = (_options, cb) => {
      const stream = new PassThrough()
      stream.on('finish', () => cb(new Error('upload failed')))
      return stream
    }

    const result = await uploadOnCloudinary(Buffer.from('hello'))
    assert.equal(result, null)
  })
})

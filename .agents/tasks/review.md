# Direct-to-Cloudinary profile photo streaming with route auth

The change replaces multer `diskStorage` with `memoryStorage` and streams the in-memory file buffer to Cloudinary through `upload_stream`, so profile photos no longer land in `backend/uploads/`. The `PUT /api/auth/update/:id` route now requires a Bearer token via `verifyToken` plus an ownership guard in the controller, and `ProfilePage.jsx` sends that token while keeping the existing `dispatch(setUser(...))` that re-renders the avatar without a reload. A new offline test stubs `upload_stream` to cover the streaming/URL contract.

**Watch for:** an expired or invalid token now makes the profile-update request hang instead of returning 401, because the route newly depends on the pre-existing `verifyToken` middleware whose `catch` only logs and never responds. Also, `memoryStorage` buffers the whole file in RAM (capped at 5 MB), and the happy path against real Cloudinary is structurally wired but not exercised end-to-end.

**Verdict**: APPROVED

## High-level view

The upload mechanism is the core of the change. Multer now keeps the file in memory (`memoryStorage`) instead of writing it to disk, and `uploadOnCloudinary` was refactored from "upload a file path then `unlinkSync` it" to "pipe a buffer into `cloudinary.uploader.upload_stream`". No `fs` import remains in the upload path, so nothing is written to `backend/uploads/`, and the controller still assigns `user.profilePicture = cloudinaryResult.secure_url` and returns it.

Auth was added where there was none. `verifyToken` is inserted into the route before multer, so an unauthenticated request is rejected before the file is even buffered. The controller rejects any request whose decoded `req.user.id` does not match `req.params.id`; the login JWT is signed as `{ id: user._id }` and the frontend sends the logged-in user's own id, so a self-edit satisfies the guard and a cross-user edit returns a clean 403.

The frontend side is a small, targeted addition: `ProfilePage.jsx` reads `state.auth.token` and attaches `Authorization: Bearer <token>` to the existing multipart PUT, with an early return if the token is missing. It also switches the base URL from a hardcoded `http://localhost:5000` to `import.meta.env.VITE_API_URL`, matching the other pages. The existing `dispatch(setUser(res.data.user))` updates the avatar in place — `setUser` only writes `state.auth.user`, so the avatar refreshes without a reload and the token survives. Because `.env` points at a deployed backend, this frontend behavior only takes effect once that backend is redeployed with this commit.

Testing is offline by design. The new `cloudinaryUpload.test.js` stubs `upload_stream` with a `PassThrough` and asserts the helper returns `secure_url` on success and `null` on missing-buffer and on error; the pre-existing property test is unchanged. What is not covered is the live route: the real Cloudinary round-trip, the `verifyToken` → multer → controller wiring, and the oversized-file path are all untested at runtime.

<details>
<summary>Issues (4)</summary>

1. **Expired-token hang on the update route (likely)** — `verifyToken`'s `catch` only `console.log(err)` and neither responds nor calls `next()`, so after the 1-day token expiry the profile PUT hangs forever instead of returning 401. Pre-existing in the shared middleware, now reachable because the route requires auth. Surface a 401 in the catch (or scope a follow-up) so the failure mode is a clean rejection, not a hang.
2. **Oversized file returns 500, not 413 (confirmed)** — `memoryStorage`'s `limits.fileSize` emits a MulterError when the 5 MB cap is exceeded; `errorMiddleware` does not treat it as an `ApiError`, so it returns status 500 with the MulterError message rather than 413. The frontend already caps at 5 MB, so this is a backstop only, but the status code misrepresents the condition.
3. **Whole file buffered in RAM (likely)** — `memoryStorage` holds the entire upload in memory for the request lifetime; the 5 MB limit bounds a single request but RAM scales with concurrent uploads. Fine for a profile-photo feature, worth noting if upload concurrency grows.
4. **Live upload path untested (confirmed)** — The streaming/URL contract is verified with a stubbed `upload_stream`, but no test exercises real Cloudinary, the `verifyToken` → multer → controller chain, or the oversized-file branch. The plan records manual end-to-end as not run; treat that as the remaining verification step before shipping.

</details>

<details>
<summary>Details</summary>

### From disk to memory-buffered Cloudinary stream

The previous flow wrote the file to `backend/uploads/` via `multer.diskStorage`, then uploaded `req.file.path` and `unlinkSync`'d it. The refactor collapses that into one in-memory hop:

```
multer.memoryStorage()  ->  req.file.buffer (Buffer, ≤5MB)
        ->  uploadOnCloudinary(buffer)
              ->  Readable.from(buffer).pipe(cloudinary.uploader.upload_stream(...))
              ->  callback resolves with { secure_url } (or null)
        ->  user.profilePicture = result.secure_url  ->  user.save()
```

`cloudinary.utils.js` drops the `fs` import and all `unlinkSync` cleanup and resolves the promise from the `upload_stream` callback — `null` on error, the result object on success. `Readable.from(fileBuffer)` emits the entire buffer as a single `Buffer` chunk (verified by spot-check), so it pipes into `upload_stream` as one chunk rather than byte-by-byte. The controller's `uploadOnCloudinary(req.file.buffer)` uses the buffer `memoryStorage` exposes, not a path, and a `null` result still throws the 500 `ApiError`, so a failed upload does not persist a stale or empty `profilePicture`.

### Auth gate and ownership guard on the update route

The route became `updateLimiter, verifyToken, upload.single('profilePicture'), updateUser`. `verifyToken` decodes the Bearer token and sets `req.user = { id, iat, exp }`; the JWT is signed as `{ id: user._id }` in the login controller, so `req.user.id` is the user's Mongo id as a string. The controller's ownership guard, `if (String(req.user?.id) !== String(req.params.id)) throw new ApiError(403, ...)`, lines up with that: the frontend PUTs to `/update/${user.id}` where `user.id` comes from the login response's `id: user._id`, so the owner matches and a mismatch returns a clean 403.

The failure mode that does not get a clean response is an expired or malformed token. `verifyToken`'s `catch` does `console.log(err)` and falls through — no `res`, no `next()` — so the request hangs. That bug predates this change and lives in a middleware shared with the order routes, so it is out of scope to fix here, but it is now reachable on the profile route for the first time: before this diff the route had no auth, so the hang was never in this path. After token expiry a user clicking "Save Changes" sees the spinner indefinitely.

### Test coverage and gaps

The new `cloudinaryUpload.test.js` stubs `cloudinary.uploader.upload_stream` to return a `PassThrough` whose `finish` event fires the Cloudinary callback, and asserts three things: a buffer resolves to an object whose `secure_url` matches, `undefined` resolves to `null`, and a callback error resolves to `null`. The `before`/`after` restore the original method, so it runs fully offline and does not leak the stub.

What is not tested: nothing exercises the real Cloudinary SDK or the route integration (`verifyToken` → multer → controller → `user.save()`). The new test stubs the very thing the refactor depends on, so a regression in how `upload_stream` is invoked (wrong options, wrong stream wiring) would not be caught if it still happened to satisfy the stub. The oversized-file branch (`LIMIT_FILE_SIZE`) has no coverage. The plan explicitly records manual end-to-end as not run, so the live upload is verified structurally, not behaviorally.

</details>

<details>
<summary>File map</summary>

- `backend/config/multer.config.js` — `diskStorage` + `mkdirSync` replaced with `memoryStorage` and a 5 MB `fileSize` limit; `fs`/`path` imports removed.
- `backend/utils/cloudinary.utils.js` — refactored to stream a buffer via `upload_stream` instead of uploading a file path; `fs` import and `unlinkSync` cleanup removed; returns the result object or `null`.
- `backend/controllers/auth.controller.js` — `verifyToken` inserted into the `/update/:id` route before multer.
- `backend/controllers/users.controller.js` — ownership guard added; upload call changed from `req.file.path` to `req.file.buffer`; `profilePicture` assignment and response shape unchanged.
- `backend/__tests__/cloudinaryUpload.test.js` (new) — offline test stubbing `upload_stream` to verify the streaming/URL contract and null-on-failure behavior.
- `backend/package.json` — `test` script runs both test files.
- `front-end/src/pages/ProfilePage.jsx` — reads `state.auth.token`, sends `Authorization: Bearer`, guards on missing token, switches the base URL to `VITE_API_URL`.

Full diff: `git show 1853513`.

</details>

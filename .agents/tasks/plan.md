# Implementation Plan — Direct-to-Cloudinary profile photo uploads

## Current state (confirmed by reading the code)

The backend does **NOT** stream to Cloudinary today. The flow is disk-first:

- `backend/config/multer.config.js` uses `multer.diskStorage` writing into `backend/uploads/` (it even `mkdirSync`s the folder).
- `backend/controllers/auth.controller.js` wires the route as `authController.put("/update/:id", updateLimiter, upload.single('profilePicture'), usersController.updateUser)` — **no `verifyToken`** (anyone can hit it).
- `backend/controllers/users.controller.js` `updateUser` calls `uploadOnCloudinary(req.file.path)` — `req.file.path` is the disk path multer just wrote.
- `backend/utils/cloudinary.utils.js` `uploadOnCloudinary(localFilePath)` calls `cloudinary.uploader.upload(localFilePath)` then `fs.unlinkSync` to delete the temp file. So the file hits local disk before Cloudinary.
- Evidence: `backend/uploads/1776436468756-D.jpg` (70 KB) is present next to `.gitkeep`.
- `backend/__tests__/profilePicture.property.test.js` is fully self-contained: inline pure functions + an inline mock of `uploadOnCloudinary`. It imports neither the real controller, multer, nor the real cloudinary. Its "P2" intent is "controller stores the `secure_url` returned by the upload helper." It already runs offline.

Frontend today:

- `front-end/src/pages/ProfilePage.jsx` already sends multipart/form-data via `axios.put(`${VITE_API_URL}/api/auth/update/${user.id}`, formData, { withCredentials: true })` with field name `profilePicture`, and already does `dispatch(setUser(res.data.user))`.
- It sends **no** `Authorization: Bearer` header (only the cookie via `withCredentials`).
- `useAuth()` (AuthContext) is a thin wrapper over the Redux `authSlice`; the Navbar reads `user.profilePicture` from it. So `dispatch(setUser(...))` already updates the Navbar avatar. The `auth` slice (incl. `token`) is persisted to localStorage via redux-persist (`store.js`), so `state.auth.token` survives reloads. The established token-in-header pattern already exists in `CheckoutPage.jsx` (`useSelector((s) => state.auth.token)` → `Authorization: Bearer ${token}`).

## Decisions

1. **Upload mechanism: multer `memoryStorage` + `cloudinary.uploader.upload_stream`** (the "alternative if simpler" path), NOT `multer-storage-cloudinary`. Rationale: it reuses the existing Cloudinary config AND the existing `uploadOnCloudinary` helper (refactored for streaming) — satisfying "don't create a parallel Cloudinary setup" and "reuse the helper." It needs **no new dependency** (memoryStorage is built into the already-installed multer ^2.1.1), so there is nothing to pin or `npm install`. `multer-storage-cloudinary` would make `uploadOnCloudinary` dead code for this flow, contradicting the reuse requirement.
2. **Field name: `profilePicture`** (confirmed in frontend `formData.append('profilePicture', selectedFile)` and backend `upload.single('profilePicture')`). Kept as-is.
3. **Route stays `PUT /api/auth/update/:id`** (existing). The task's "POST ... as multipart/form-data" is satisfied by sending a multipart/form-data body on the existing PUT; keeping PUT avoids changing the route method.
4. **Auth: add `verifyToken` to the `/update/:id` route** (required by the task). Also add a minimal **ownership guard** in the controller (`req.user.id` must equal `req.params.id`, else 403) so the new auth is cohesive — a logged-in user must not edit another user's profile. This is safe: the frontend always sends the logged-in user's own id. Do **not** modify `verifytoken.middleware.js` (it is shared with the order routes; its pre-existing catch that logs-and-hangs on an invalid token is out of scope — note as a known limitation).
5. **Frontend: add `Authorization: Bearer <token>`** (token from Redux `state.auth.token`, same pattern as `CheckoutPage.jsx`). Keep the existing `withCredentials: true` and the existing `dispatch(setUser(res.data.user))` (that already updates the AuthContext user → Navbar avatar). **No new api file** — matches the existing inline-axios pattern used by `LoginPage`/`RegisterPage`/`CheckoutPage`.
6. **Test approach:** the existing property test is untouched (it already runs offline and its intent is preserved — the controller still stores the helper's `secure_url`). Add a **new** offline test that stubs `cloudinary.uploader.upload_stream` (via a `PassThrough` stream) and verifies the refactored helper streams a buffer and returns `secure_url` / `null`. Update the backend `test` script to run both test files. This satisfies "mock `cloudinary.v2.uploader` so it runs offline."
7. **Stop writing to disk, but do not delete** `backend/uploads/` or `.gitkeep`. Leave the stale `1776436468756-D.jpg` as-is (non-destructive). Add `limits: { fileSize: 5_242_880 }` to multer because memoryStorage buffers the whole file in RAM and the frontend already caps uploads at 5 MB.

---

## Plan

- [ ] 1. Backend: replace disk-based profile-photo upload with direct-to-Cloudinary streaming (storage layer + offline test).
      Refactor `uploadOnCloudinary` so it streams a Buffer to Cloudinary instead of uploading a local file path: drop the `fs` import and all `unlinkSync` cleanup, rename the param `localFilePath` → `fileBuffer`, and use `cloudinary.uploader.upload_stream({ resource_type: 'auto' }, (err, result) => err ? resolve(null) : resolve(result))` with `Readable.from(fileBuffer).pipe(stream)` (`import { Readable } from 'stream'`). Keep the return contract (the Cloudinary result object on success, `null` on failure) and the export name `uploadOnCloudinary`. Switch `backend/config/multer.config.js` from `diskStorage` to `multer.memoryStorage()` and remove the `fs`/`path`/`uploadDir`/`mkdirSync` code; add `limits: { fileSize: 5_242_880 }` to the `multer({ storage, limits })` call. Add a new offline test `backend/__tests__/cloudinaryUpload.test.js` (node:test + assert) that imports `cloudinary` from `config/cloudinary.config.js` and `uploadOnCloudinary` from the util, stubs `cloudinary.uploader.upload_stream` to return a `node:stream` `PassThrough` whose `finish` event calls the callback with `{ secure_url: 'https://res.cloudinary.com/...' }`, and asserts: (a) `uploadOnCloudinary(Buffer.from('x'))` resolves to an object whose `secure_url` matches; (b) `uploadOnCloudinary(undefined)` resolves to `null`; (c) when the stub's callback is invoked with an `Error`, `uploadOnCloudinary(Buffer)` resolves to `null`. Restore the original method afterward. Update `backend/package.json` `test` script to run both files: `node --test __tests__/profilePicture.property.test.js __tests__/cloudinaryUpload.test.js`.
      Files: `backend/utils/cloudinary.utils.js`, `backend/config/multer.config.js`, `backend/__tests__/cloudinaryUpload.test.js` (new), `backend/package.json`
      Verify: `cd backend && npm test` — the new `cloudinaryUpload` tests AND the existing `profilePicture.property` tests both pass, fully offline (no Cloudinary credentials required).

- [ ] 2. Backend: wire auth into the profile-update route and pass the in-memory buffer to the controller.
      In `backend/controllers/auth.controller.js`, import `verifyToken` from `../middlewares/verifytoken.middleware.js` and insert it into the update route before the multer middleware: `authController.put("/update/:id", updateLimiter, verifyToken, upload.single('profilePicture'), usersController.updateUser)`. In `backend/controllers/users.controller.js` `updateUser`, add an ownership guard at the top: if `String(req.user?.id) !== String(req.params.id)` throw `new ApiError(403, "You can only update your own profile")`. Change the upload call from `uploadOnCloudinary(req.file.path)` to `uploadOnCloudinary(req.file.buffer)` (memoryStorage exposes the buffer, not a path). Keep everything else: still throw the 500 `ApiError` when the result is null, still assign `user.profilePicture = cloudinaryResult.secure_url`, still `user.save()`, still return the `{ user: { id, username, email, profilePicture, createdAt } }` object.
      Files: `backend/controllers/auth.controller.js`, `backend/controllers/users.controller.js`
      Verify: `cd backend && npm test` passes. Manual end-to-end (needs running server + real Cloudinary creds in `backend/.env`): log in, `PUT /api/auth/update/<your-id>` with `Authorization: Bearer <token>` and a photo in the `profilePicture` multipart field; confirm the response `user.profilePicture` is a `res.cloudinary.com` URL and that **no new file** appears in `backend/uploads/`.

- [ ] 3. Frontend: send the auth token with the profile update so the auth-gated route accepts it.
      In `front-end/src/pages/ProfilePage.jsx`, add `useSelector` to the react-redux import and read the token: `const token = useSelector((state) => state.auth.token)`. In `handleSubmit`, pass an auth header on the existing `axios.put` call alongside the existing `withCredentials: true`: `headers: { Authorization: \`Bearer ${token}\` }`. Leave the rest of the flow unchanged — `formData.append('profilePicture', selectedFile)` (field name already correct) and `dispatch(setUser(res.data.user))` (already updates the AuthContext user, so the Navbar avatar and profile page re-render immediately without a full reload). Guard against a missing token by falling back to the existing error path if `token` is falsy (e.g. set `setError('Not authenticated. Please log in again.')` and return before the request).
      Files: `front-end/src/pages/ProfilePage.jsx`
      Verify: `cd front-end && npm test` passes (the existing frontend property tests are pure-function/reducer tests and do not import `ProfilePage.jsx` or axios, so they stay green). `cd front-end && npm run build` succeeds.

## Notes / out of scope

- `verifytoken.middleware.js` is left unchanged. It is shared by the order routes; its `catch` block only `console.log(err)` and neither sends a response nor calls `next()`, so an expired/invalid token makes the request hang. This is a pre-existing bug, not introduced here, and is outside this task's scope (the happy path with a valid token works). Flagged for a separate fix if desired.
- End-to-end runtime only becomes coherent after items 2 and 3 are both applied: item 2 makes the route require a Bearer token, and item 3 makes the frontend send it. The automated tests stay green throughout because they do not exercise the live route.
- No new npm dependency is added; no `npm install` is required.

---

## Verification record (run after implementation)

### Backend — `cd backend && npm test`
Command run: `npm test` (script = `node --test __tests__/profilePicture.property.test.js __tests__/cloudinaryUpload.test.js`).
Result: **PASS** — `tests 13, pass 13, fail 0` (exit 0).
- New `uploadOnCloudinary (memoryStorage streaming)` suite: 3/3 pass:
  - streams a buffer to Cloudinary and returns `{ secure_url }` on success ✔
  - resolves to `null` when no buffer is provided ✔
  - resolves to `null` when Cloudinary returns an error ✔ (the `❌ Cloudinary upload error message: upload failed` lines in the output are the expected logs from this failure-path test, not a real failure)
- Existing `P2/P4/P5/P6/P8/P9` suites: 10/10 pass — original intent preserved, runs fully offline (no Cloudinary credentials, cloudinary.uploader.upload_stream stubbed via a `PassThrough`).

### Frontend — `cd front-end && npm run build`
Result: **PASS** — exit 0 (`✓ built in 668ms`, `dist/` produced).

### Frontend — `cd front-end && npm run lint`
Result: 3 errors / 1 warning — **all pre-existing**, all in files NOT touched by this task and explicitly out of scope:
- `src/context/Authcontext.jsx:21` react-refresh/only-export-components
- `src/context/Searchcontext.jsx:15` react-refresh/only-export-components
- `src/pages/HomePage.jsx:28` react-hooks/set-state-in-effect + `:32` exhaustive-deps warning
- `src/pages/ProfilePage.jsx` (the only frontend file changed): **0 errors / 0 warnings**. No new lint errors introduced.

### Disk-write audit (profile-upload code path)
Grepped backend for `diskStorage|unlinkSync|writeFile|uploads|fs.mkdirSync|fileURLToPath`:
- `config/multer.config.js` → only mentions in comments; uses `multer.memoryStorage()` (NO diskStorage).
- `utils/cloudinary.utils.js` → no `fs` import, no `unlinkSync`; streams `Readable.from(fileBuffer).pipe(cloudinary.uploader.upload_stream(...))`.
- `controllers/users.controller.js` → uses `uploadOnCloudinary(req.file.buffer)` (in-memory buffer, no `req.file.path`).
- The only remaining `fileURLToPath`/`path` is in `app.js` (generic `__dirname` setup for the express app), which is NOT in the profile-upload path and writes nothing to `backend/uploads/`.
- `backend/uploads/` and `backend/uploads/.gitkeep` left intact; no new files written there (stale `1776436468756-D.jpg` left as-is, non-destructive).

### Manual end-to-end (NOT run — requires live server + real Cloudinary creds)
Not executed here. Steps for the caller: log in, `PUT /api/auth/update/<your-id>` with `Authorization: Bearer <token>` and a photo in the `profilePicture` multipart field; expect `res.data.user.profilePicture` to be a `res.cloudinary.com` URL and no new file in `backend/uploads/`. The automated (offline) tests cover the streaming/URL contract; the live route integration is structurally wired (verifyToken added to route, frontend sends Bearer token).

### Known limitation (pre-existing, out of scope)
`verifytoken.middleware.js` `catch` block only `console.log(err)` and neither sends a response nor calls `next()`, so an invalid/expired token makes the request hang. This predates this task and is shared with the order routes. The happy path with a valid token works.


# RAG Chatbot Diagnosis — `Rag-implement`

> Investigation only. No code was changed in this step. All findings are grounded in files actually read: `package.json`, `index.js`, `data.json`, `public/{index.html,script.js,style.css}`, `.env` (key names only), `.gitignore`, and `package-lock.json`.
>
> **Secrets policy:** only `.env` key NAMES were read. No secret values are reproduced anywhere in this document.

## How the project is wired today

- ESM project (`"type": "module"`). Entry: `index.js`. Start script: `nodemon index.js` (`package.json`).
- `index.js` builds a single LangChain retrieval chain at boot and exposes `POST /api/chat`. The static frontend in `public/` is served by `express.static("public")` and calls `/api/chat` with axios (loaded from a CDN in `index.html`).
- Knowledge base: `data.json` → `{ products: [ ... ] }`. Each product has `id, title, description, category, price, discountPercentage, rating, stock, tags, brand, sku, ... , images, thumbnail`. ~30+ products (file truncated on read; shape is consistent).

## Environment findings (blockers the coder must handle first)

1. **`node_modules` is effectively empty / broken.** Only an empty `@langchain` scoped folder exists; none of the declared deps (cors, dotenv, express, hnswlib-node, @langchain/*, etc.) are installed. `npm install` was never completed successfully. The server cannot start as-is.
2. **`package.json` and `package-lock.json` are out of sync.** `package.json` declares `dotenv ^16.4.5` but `package-lock.json` root deps say `^17.3.1`. Use `npm install` (which reconciles the lock), **not** `npm ci` (which would fail on the mismatch).
3. **`.env` is missing `GOOGLE_API_KEY`.** The `.env` key names present are: `PORT, MONGO_URL, CLOUD_NAME, CLOUD_API, CLOUDINARY_API_SECRET, JWT_SECRET, EXPIRES_IN`. These look copied from the ShopZone project (cloudinary/mongo/jwt) and are unused by this RAG. `index.js` requires `GOOGLE_API_KEY` and calls `process.exit(1)` when it is absent (lines 31–34), so **the server crashes immediately on boot**. This is the single biggest blocker for the smoke test.
4. **`hnswlib-node` is a native module (build risk on Windows).** If its native build / prebuilt binary fails to load, fall back to `MemoryVectorStore` from `@langchain/community/vectorstores/memory` (already a transitive option via `@langchain/community`). See plan item 2.
5. **Two transformers packages are declared** (`@huggingface/transformers ^3.8.1` and `@xenova/transformers ^2.17.2`). `@langchain/community`'s `HuggingFaceTransformersEmbeddings` will use one of them; redundancy is a minor compatibility surface, not a blocker. Leaving as-is.
6. **Embedding model downloads on first run.** `Xenova/all-MiniLM-L6-v2` (~tens of MB) is fetched from the HuggingFace Hub on first boot — the smoke test must allow extra time on first start and requires internet.

## Component-by-component assessment (the 12 RAG components)

| # | Component | Status | Evidence in `index.js` |
|---|-----------|--------|------------------------|
| 1 | Document loading from knowledge source | **Present** | Lines 36–39: `fs.readFileSync("./data.json")`, `JSON.parse`, `products = jsonData.products \|\| []`. |
| 2 | Chunking (chunk size + overlap) | **Missing** | Documents are built one-per-product (lines 42–59) and passed straight into `HNSWLib.fromDocuments` (line 68). No text splitter. (For this dataset each product is a small atomic unit, so a splitter should use a generous chunk size to keep products whole — see plan item 3.) |
| 3 | Real embeddings (not fake/hashed) | **Present** | Lines 64–66: `HuggingFaceTransformersEmbeddings({ modelName: "Xenova/all-MiniLM-L6-v2" })`. Real sentence embeddings. (Downloads on first run.) |
| 4 | Vector store with similarity search | **Present** | Lines 68–69: `HNSWLib.fromDocuments` + `asRetriever`. HNSWLib performs ANN similarity search. (Native-build risk — see finding 4.) |
| 5 | Top-k retrieval per query | **Present** | Line 69: `asRetriever({ k: 3 })`. |
| 6 | Context injection into the LLM prompt | **Present** | Lines 77–87: `systemTemplate` embeds `Context: {context}`; `createStuffDocumentsChain` fills `{context}` with retrieved docs. |
| 7 | LLM call with system+context+question template | **Present (minor issue)** | Lines 72–97: `ChatGoogleGenerativeAI`, `ChatPromptTemplate.fromMessages([["system",...],["human","{input}"]])`, `createStuffDocumentsChain`, `createRetrievalChain`. **Issue:** model is hard-coded `"gemini-2.5-flash"` (line 73) while the comment on line 71 says to use `gemini-1.5-flash` — comment contradicts code. Not configurable via env. |
| 8 | Conversation memory (per session) | **Missing** | `POST /api/chat` (lines 103–132) invokes `retrievalChain.invoke({ input: message })` (lines 119–121) with no session id and no history. Every request is stateless. (Note: `createRetrievalChain` natively accepts a `chat_history` input key — memory can be added cleanly; see plan item 3.) |
| 9 | Source citation | **Missing** | Response sends only `{ answer: response.answer }` (line 122). The retrieved documents (`response.context`, a `Document[]` confirmed by the LangChain JS `createRetrievalChain` signature) are discarded. Frontend `script.js` renders only `answer`. |
| 10 | Error handling | **Partial** | Missing key → `process.exit(1)` (lines 31–34) — too harsh, blocks boot + smoke test. Missing `message` → 400 (lines 105–107) ✓. Not initialized → 503 (lines 109–116) ✓. LLM failure → 500 (lines 123–131) ✓. **Not handled:** empty retrieval (no explicit guard), `req.body`/`message` type validation, and the no-API-key case (no fallback path). |
| 11 | CORS + POST /chat (or /ask) endpoint | **Present** | `cors()` (line 23); `POST /api/chat` (line 103). Frontend calls `/api/chat` (`public/script.js`). **No health endpoint** for smoke testing. |
| 12 | Streaming response | **Missing (not required)** | Nice-to-have per the task. **Deferred** to keep scope tight. |

## Frontend (`public/`) findings

- `index.html`: chat UI shell; loads `axios` from a CDN (`https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js`) and `script.js`. Needs internet in the browser.
- `script.js`: `appendMessage(sender, text, isBot)` renders text only; `showTypingIndicator`/`removeTypingIndicator`; on submit, `axios.post("/api/chat", { message })` then renders `response.data.answer` or `error`. **No `sessionId` sent; no sources rendered.**
- `style.css`: glassmorphism chat styling; no styles for a sources list (needs adding).

## Critical blockers (must fix before the pipeline can run)

1. Run `npm install` (node_modules is empty + lock out of sync). **PREREQUISITE for everything.**
2. Stop `process.exit(1)` on missing `GOOGLE_API_KEY`; make the LLM optional so the server boots and retrieval works without a key (needed for the no-key smoke test). Create `.env.example` with a `GOOGLE_API_KEY` placeholder.
3. Decide vector store: keep `HNSWLib` if the native module loads, else switch to `MemoryVectorStore` (`@langchain/community/vectorstores/memory`).

## Gaps to implement (summary → see `plan.md`)

- Add a chunking stage (item 3 of plan).
- Make the LLM optional + model name configurable; graceful boot (item 3).
- Per-session conversation memory via `chat_history` (item 3).
- Source citation: return `response.context` as `sources`; enrich document metadata with `price, brand, sku, rating, availabilityStatus` (item 3).
- LLM-less fallback answer assembled from retrieved chunks so retrieval is provable without a key (item 3).
- `GET /api/health` + tighter request validation + empty-retrieval guard (item 3).
- Frontend: send a persistent `sessionId` and render `sources` (item 5).

## Out of scope / notes

- Streaming is intentionally deferred (nice-to-have).
- Do **not** add a test framework — `package.json` `test` is a stub and the task says manual smoke test of `/api/chat` is sufficient.
- Do **not** touch `backend/` or `front-end/` folders (owned by the concurrent ShopZone workflow). Stay inside `Rag-implement/`.
- Never echo/commit `.env` secret values; `.gitignore` already ignores `.env` and `node_modules`.

import dotenv from "dotenv";
import fs from "fs";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { createRetrievalChain } from "@langchain/classic/chains/retrieval";
import { createStuffDocumentsChain } from "@langchain/classic/chains/combine_documents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// The retriever is always built so retrieval works even without an API key.
// The retrieval chain (which calls the LLM) is only built when a key is present.
let retriever;
let retrievalChain;
let isInitialized = false;
let llmReady = false;

// Per-session short-term conversation memory: sessionId -> BaseMessage[].
const sessionHistories = new Map();
const MAX_HISTORY = 10;

// Gemini model selection. gemini-2.5-flash* was shut down by Google on
// ~Oct 16, 2026; the generally-available replacement is gemini-3.8-flash. If a
// resolved (env-provided) model is a known-shutdown 2.5 flash variant, substitute
// the GA model so an outdated .env value does not break answer generation.
const GA_GEMINI_FLASH = "gemini-3.8-flash";
const SHUTDOWN_GEMINI_MODELS = new Set([
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
]);
const requestedGeminiModel = process.env.GEMINI_MODEL || GA_GEMINI_FLASH;
const GEMINI_MODEL = SHUTDOWN_GEMINI_MODELS.has(requestedGeminiModel)
  ? GA_GEMINI_FLASH
  : requestedGeminiModel;
if (GEMINI_MODEL !== requestedGeminiModel) {
  console.warn(
    `Warning: requested model "${requestedGeminiModel}" is shut down; ` +
      `using GA replacement "${GEMINI_MODEL}" instead. ` +
      `Update GEMINI_MODEL in .env to remove this warning.`,
  );
}

/**
 * Map retrieved documents to a deduplicated, citation-friendly source list.
 * @param {Array<import("@langchain/core/documents").Document>} docs
 */
function buildSources(docs) {
  const seen = new Set();
  const sources = [];
  for (const doc of docs || []) {
    const m = doc.metadata || {};
    if (m.id == null) continue;
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    sources.push({
      id: m.id,
      title: m.title,
      category: m.category,
      price: m.price,
      brand: m.brand,
    });
  }
  return sources;
}

/**
 * Assemble a readable answer from retrieved chunks when no LLM is configured.
 * Proves the retrieval path works without an API key.
 * @param {Array<import("@langchain/core/documents").Document>} docs
 */
function buildFallbackAnswer(docs) {
  const lines = docs.map((d) => {
    const m = d.metadata || {};
    const price = m.price != null ? `$${m.price}` : "price unavailable";
    const brand = m.brand ? ` by ${m.brand}` : "";
    return `- ${m.title}${brand} — ${m.category || "uncategorized"}, ${price}`;
  });
  return [
    "The LLM is not configured (no GOOGLE_API_KEY), so I can't generate a natural answer.",
    "Here are the most relevant products I found for your query:",
    ...lines,
  ].join("\n");
}

async function initializeRAG() {
  console.log("Loading and parsing data.json...");
  const rawData = fs.readFileSync("./data.json", "utf-8");
  const jsonData = JSON.parse(rawData);
  const products = jsonData.products || [];

  console.log(`Processing ${products.length} products into documents...`);
  const documents = products.map((product) => {
    const content = `Product Name: ${product.title}
Brand: ${product.brand}
Category: ${product.category}
Description: ${product.description}
Price: $${product.price}
Rating: ${product.rating} / 5
Availability: ${product.availabilityStatus || "Unknown"}
Tags: ${product.tags ? product.tags.join(", ") : "None"}`;

    return new Document({
      pageContent: content,
      metadata: {
        id: product.id,
        category: product.category,
        title: product.title,
        price: product.price,
        brand: product.brand,
        sku: product.sku,
        rating: product.rating,
        availabilityStatus: product.availabilityStatus,
      },
    });
  });

  // Chunking stage. Each product doc is small (~600-800 chars), so a generous
  // chunk size keeps whole products in a single chunk (no retrieval-quality
  // loss) while still adding the chunking step. Metadata is preserved per chunk.
  console.log("Chunking documents...");
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 100,
  });
  const chunks = await splitter.splitDocuments(documents);
  console.log(`Produced ${chunks.length} chunks from ${documents.length} products.`);

  console.log(
    "Initializing in-memory vector store with HuggingFace Embeddings...",
  );
  const embeddings = new HuggingFaceTransformersEmbeddings({
    modelName: "Xenova/all-MiniLM-L6-v2",
  });

  const vectorStore = await MemoryVectorStore.fromDocuments(chunks, embeddings);
  retriever = vectorStore.asRetriever({ k: 3 });

  // Build the LLM-backed retrieval chain only when a key is available.
  if (!process.env.GOOGLE_API_KEY) {
    console.warn(
      "Warning: GOOGLE_API_KEY is not set. Answer generation is disabled, " +
        "but retrieval still works and the server is usable.",
    );
    isInitialized = true;
    return;
  }

  const llm = new ChatGoogleGenerativeAI({
    model: GEMINI_MODEL,
    temperature: 0.3,
  });

  const systemTemplate = `You are a helpful and knowledgeable shopping assistant for our e-commerce store.
Use the following pieces of retrieved context to answer the question.
If the answer is not in the context, say that you don't know or don't have information on that product.
Use the product names, prices, and descriptions exactly as they appear in the documentation. Keep the answer concise.

Context: {context}`;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemTemplate],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
  ]);

  const combineDocsChain = await createStuffDocumentsChain({
    llm,
    prompt,
  });

  retrievalChain = await createRetrievalChain({
    retriever,
    combineDocsChain,
  });

  llmReady = true;
  isInitialized = true;
  console.log("RAG system initialized successfully (LLM enabled).");
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", initialized: isInitialized, llmReady });
});

app.post("/api/chat", async (req, res) => {
  // Validate the request body and message up front.
  if (!req.body || typeof req.body.message !== "string" || !req.body.message.trim()) {
    return res.status(400).json({ error: "Message is required" });
  }

  if (!isInitialized) {
    return res.status(503).json({
      error: "RAG system is still initializing. Please try again in a moment.",
    });
  }

  const message = req.body.message.trim();
  const sessionId = (req.body.sessionId && String(req.body.sessionId)) || "default";

  try {
    let answer;
    let sources;

    if (!llmReady) {
      // LLM-less fallback: prove retrieval works without an API key.
      const docs = await retriever.invoke(message);
      if (!docs || docs.length === 0) {
        return res.json({
          answer: "I couldn't find any relevant products for that.",
          sources: [],
        });
      }
      answer = buildFallbackAnswer(docs);
      sources = buildSources(docs);
    } else {
      // Full RAG path: retrieve context, then let the LLM answer with memory.
      const history = sessionHistories.get(sessionId) || [];
      const response = await retrievalChain.invoke({
        input: message,
        chat_history: history,
      });

      const contextDocs = response.context || [];
      if (contextDocs.length === 0) {
        return res.json({
          answer: "I couldn't find any relevant products for that.",
          sources: [],
        });
      }

      answer = response.answer;
      sources = buildSources(contextDocs);
    }

    // Persist short-term conversation memory for this session.
    const history = sessionHistories.get(sessionId) || [];
    history.push(new HumanMessage(message));
    history.push(new AIMessage(answer));
    // Keep only the most recent messages to bound memory usage.
    sessionHistories.set(
      sessionId,
      history.slice(history.length - MAX_HISTORY * 2),
    );

    res.json({ answer, sources });
  } catch (error) {
    console.error("Error generating response:", error);
    res.status(500).json({
      error:
        "Failed to generate response. Check your API key and network connection.",
    });
  }
});

// Catch malformed JSON request bodies (body-parser SyntaxError) and return a
// clean JSON 400 instead of Express's default HTML stack-trace page.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, async () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  await initializeRAG();
  console.log("✅ Chatbot ready for queries.");
});

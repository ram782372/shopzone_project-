const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// Persistent per-browser session id so the backend can keep conversation memory.
let sessionId = "default";
try {
  sessionId = localStorage.getItem("rag-session-id");
  if (!sessionId) {
    sessionId =
      (crypto && crypto.randomUUID) ? crypto.randomUUID() : "default";
    localStorage.setItem("rag-session-id", sessionId);
  }
} catch (e) {
  sessionId = "default";
}

function appendMessage(sender, text, isBot = false, sources = null) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isBot ? "bot-message" : "user-message"}`;

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Build the message content via DOM to avoid injecting unescaped source text.
  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";

  const p = document.createElement("p");
  p.innerHTML = text; // bot text uses simple markup from the server fallback; keep existing behavior
  contentDiv.appendChild(p);

  // Render a compact sources list under the bot message when provided.
  if (sources && Array.isArray(sources) && sources.length) {
    const srcWrap = document.createElement("div");
    srcWrap.className = "sources";
    const label = document.createElement("span");
    label.className = "sources-label";
    label.textContent = "Sources:";
    srcWrap.appendChild(label);

    const ul = document.createElement("ul");
    sources.forEach((s) => {
      const li = document.createElement("li");
      const title = document.createElement("span");
      title.className = "source-title";
      title.textContent = s.title || `Product #${s.id}`;
      li.appendChild(title);
      if (s.price != null) {
        const price = document.createElement("span");
        price.className = "source-price";
        price.textContent = ` — $${s.price}`;
        li.appendChild(price);
      }
      ul.appendChild(li);
    });
    srcWrap.appendChild(ul);
    contentDiv.appendChild(srcWrap);
  }

  const time = document.createElement("span");
  time.className = "time";
  time.textContent = timeStr;
  contentDiv.appendChild(time);

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = isBot ? "🤖" : "👤";

  messageDiv.appendChild(avatar);
  messageDiv.appendChild(contentDiv);

  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function showTypingIndicator() {
  const indicatorDiv = document.createElement("div");
  indicatorDiv.className = "message bot-message typing-indicator-container";
  indicatorDiv.id = "typing-indicator";

  indicatorDiv.innerHTML = `
        <div class="avatar">🤖</div>
        <div class="message-content">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;

  chatWindow.appendChild(indicatorDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById("typing-indicator");
  if (indicator) {
    indicator.remove();
  }
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  // Append user message
  appendMessage("User", message, false);
  userInput.value = "";

  // Show bot typing
  showTypingIndicator();

  try {
    const response = await axios.post("/api/chat", { message, sessionId });
    removeTypingIndicator();

    if (response.data.answer) {
      appendMessage("Bot", response.data.answer, true, response.data.sources);
    } else if (response.data.error) {
      appendMessage("Bot", `Error: ${response.data.error}`, true);
    }
  } catch (error) {
    removeTypingIndicator();
    console.error("Error:", error);
    const errorMsg =
      error.response?.data?.error ||
      "Sorry, something went wrong. Make sure the server is running.";
    appendMessage("Bot", errorMsg, true);
  }
});

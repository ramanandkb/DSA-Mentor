const API_URL = "https://dsa-mentor-kohl.vercel.app/chat";

const TOPICS = [
  ["Arrays", "Contiguous storage & indexing"],
  ["Strings", "Pattern matching & manipulation"],
  ["Linked Lists", "Pointers & traversal"],
  ["Stacks & Queues", "LIFO / FIFO structures"],
  ["Hashing", "O(1) lookups"],
  ["Recursion", "Break problems into subproblems"],
  ["Binary Search", "O(log n) searching"],
  ["Trees & BSTs", "Hierarchical structures"],
  ["Graphs", "BFS, DFS, shortest paths"],
  ["Dynamic Programming", "Optimal substructure"],
];

const els = {
  landing: document.getElementById("landing"),
  app: document.getElementById("app"),
  sidebar: document.getElementById("sidebar"),
  chatList: document.getElementById("chat-list"),
  sidebarTopics: document.getElementById("sidebar-topics"),
  topicGrid: document.getElementById("topic-grid"),
  messages: document.getElementById("messages"),
  emptyState: document.getElementById("empty-state"),
  chatArea: document.getElementById("chat-area"),
  composer: document.getElementById("composer"),
  input: document.getElementById("composer-input"),
  sendBtn: document.getElementById("send-btn"),
  modeSelect: document.getElementById("mode-select"),
};

let state = { sessions: {}, activeId: null };

function loadState() {
  try {
    const raw = localStorage.getItem("dsa-mentor-sessions");
    if (raw) state.sessions = JSON.parse(raw);
  } catch (e) { /* corrupt storage, start fresh */ }
}
function saveState() {
  try { localStorage.setItem("dsa-mentor-sessions", JSON.stringify(state.sessions)); }
  catch (e) { /* storage unavailable */ }
}

function openApp(prefillPrompt) {
  els.landing.classList.add("hidden");
  els.app.classList.remove("hidden");
  if (!state.activeId) newChat();
  renderChatList();
  if (prefillPrompt) {
    els.input.value = prefillPrompt;
    autoGrow();
    updateSendState();
  }
}
function backToLanding() {
  els.app.classList.add("hidden");
  els.landing.classList.remove("hidden");
}

function newChat() {
  const id = "chat_" + Date.now();
  state.sessions[id] = { id, title: "New chat", messages: [] };
  state.activeId = id;
  saveState();
  renderChatList();
  renderMessages();
}

function renderChatList() {
  els.chatList.innerHTML = "";
  Object.values(state.sessions).reverse().forEach(s => {
    const li = document.createElement("li");
    li.textContent = s.title;
    if (s.id === state.activeId) li.classList.add("active");
    li.onclick = () => { state.activeId = s.id; renderChatList(); renderMessages(); };
    els.chatList.appendChild(li);
  });
}

function currentSession() { return state.sessions[state.activeId]; }

function renderMessages() {
  const session = currentSession();
  els.messages.innerHTML = "";
  const hasMessages = session && session.messages.length > 0;
  els.emptyState.classList.toggle("hidden", hasMessages);
  if (!hasMessages) return;
  session.messages.forEach(m => appendMessageEl(m.role, m.content, false));
  els.chatArea.scrollTop = els.chatArea.scrollHeight;
}

// Minimal markdown: fenced code blocks + inline code + paragraphs
function renderMarkdown(text) {

  marked.setOptions({
    breaks: true,
    gfm: true
  });

  const html = marked.parse(text);

  const temp = document.createElement("div");
  temp.innerHTML = html;

  temp.querySelectorAll("pre code").forEach((block) => {

    const className = block.className || "";

    const match = className.match(/language-(\w+)/);

    const language = match ? match[1] : null;

    try {

      if (language && hljs.getLanguage(language)) {

        block.innerHTML = hljs.highlight(
          block.textContent,
          {
            language: language
          }
        ).value;

      } else {

        // If language is missing/unknown,
        // automatically detect the language.
        block.innerHTML = hljs.highlightAuto(
          block.textContent
        ).value;

      }

    } catch (error) {

      console.warn(
        "Syntax highlighting failed:",
        error
      );

      // Keep the original code instead of breaking the chat.
      block.textContent = block.textContent;

    }

  });

  return temp.innerHTML;
}

function appendMessageEl(role, content, animate = true) {
  const wrap = document.createElement("div");
  wrap.className = `message ${role}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = role === "ai" ? renderMarkdown(content) : `<p>${content.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`;
  wrap.appendChild(bubble);

  if (role === "ai" && animate) {
    const actions = document.createElement("div");
    actions.className = "suggested-actions";
    ["Explain more", "Give an example", "Show dry run", "Analyze complexity"].forEach(label => {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.onclick = () => sendMessage(label);
      actions.appendChild(btn);
    });
    bubble.appendChild(actions);
  }

  els.messages.appendChild(wrap);
  els.emptyState.classList.add("hidden");
  els.chatArea.scrollTop = els.chatArea.scrollHeight;
  return wrap;
}

function showTyping() {
  const wrap = document.createElement("div");
  wrap.className = "message ai";
  wrap.id = "typing-indicator";
  wrap.innerHTML = `<div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>`;
  els.messages.appendChild(wrap);
  els.chatArea.scrollTop = els.chatArea.scrollHeight;
}
function hideTyping() {
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
}

function showError(retryFn) {
  const banner = document.createElement("div");
  banner.className = "error-banner";
  banner.innerHTML = `<span>Unable to connect to DSA Mentor. Please check your connection and try again.</span>`;
  const retry = document.createElement("button");
  retry.textContent = "Retry";
  retry.onclick = () => { banner.remove(); retryFn(); };
  banner.appendChild(retry);
  els.messages.appendChild(banner);
  els.chatArea.scrollTop = els.chatArea.scrollHeight;
}

async function sendMessage(text) {

  const session = currentSession();

  if (!text || !session) return;

  session.messages.push({
    role: "user",
    content: text
  });

  if (session.title === "New chat") {
    session.title = text.slice(0, 40);
  }

  saveState();
  renderChatList();

  appendMessageEl("user", text);

  els.input.value = "";

  autoGrow();
  updateSendState();

  showTyping();

  try {

    console.log("Sending message:", text);

    const res = await fetch(API_URL, {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        message: text,
        session_id: session.id,
        mode: els.modeSelect.value
      })

    });


    console.log("HTTP status:", res.status);


    if (!res.ok) {

      const errorText = await res.text();

      console.error(
        "Backend error:",
        errorText
      );

      throw new Error(
        `Backend returned ${res.status}`
      );
    }


    const data = await res.json();

    console.log("Backend response:", data);


    hideTyping();


    session.messages.push({
      role: "ai",
      content: data.response
    });


    saveState();


    console.log("Rendering AI response...");

    appendMessageEl(
      "ai",
      data.response
    );


    console.log("AI response rendered successfully.");

  } catch (err) {

    hideTyping();

    console.error(
      "FRONTEND ERROR:",
      err
    );

    showError(() => sendMessage(text));
  }
}

function autoGrow() {
  els.input.style.height = "auto";
  els.input.style.height = Math.min(els.input.scrollHeight, 160) + "px";
}
function updateSendState() {
  els.sendBtn.disabled = els.input.value.trim().length === 0;
}
function renderTopics() {
  els.topicGrid.innerHTML = "";
  els.sidebarTopics.innerHTML = "";

  TOPICS.forEach(([name, desc]) => {

    // Landing page topic card
    const card = document.createElement("button");

    card.className = "topic-chip";

    card.innerHTML = `
      ${name}
      <span>${desc}</span>
    `;

    card.addEventListener("click", () => {
      openApp();
      sendMessage(
        `Teach me about ${name} with a simple example.`
      );
    });

    els.topicGrid.appendChild(card);


    // Sidebar topic
    const li = document.createElement("li");

    li.textContent = name;

    li.addEventListener("click", () => {
      openApp();
      sendMessage(
        `Teach me about ${name} with a simple example.`
      );
    });

    els.sidebarTopics.appendChild(li);
  });
}

// ---- wiring ----
document.getElementById("start-learning").onclick = () => openApp();
document.getElementById("landing-open-app").onclick = () => openApp();
document.getElementById("explore-topics").onclick = () => document.querySelector(".topics").scrollIntoView({ behavior: "smooth" });
document.getElementById("back-to-landing").onclick = backToLanding;
document.getElementById("new-chat").onclick = newChat;
document.getElementById("clear-chat").onclick = () => {
  const session = currentSession();
  if (session) { session.messages = []; saveState(); renderMessages(); }
};
document.getElementById("menu-toggle").onclick = () => els.sidebar.classList.toggle("open");

document.querySelectorAll(".prompt-card").forEach(card => {
  card.onclick = () => sendMessage(card.dataset.prompt);
});

els.input.addEventListener("input", () => { autoGrow(); updateSendState(); });
els.input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!els.sendBtn.disabled) sendMessage(els.input.value.trim());
  }
});
els.composer.addEventListener("submit", e => {
  e.preventDefault();
  if (!els.sendBtn.disabled) sendMessage(els.input.value.trim());
});

loadState();
renderTopics();

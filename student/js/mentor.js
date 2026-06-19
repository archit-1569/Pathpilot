/**
 * PathPilot AI – AI Mentor chat controller (Phase 7)
 * Handles auth guard, chat history loading, message sending,
 * typing indicator, markdown rendering, and UI interactions.
 */
(function () {
  "use strict";

  // ── Auth guard ─────────────────────────────────────────────── //
  if (!getToken()) {
    window.location.href = "login.html";
    return;
  }

  // ── DOM refs ───────────────────────────────────────────────── //
  const chatBody = document.getElementById("chatBody");
  const chatInner = document.getElementById("chatInner");
  const chatWelcome = document.getElementById("chatWelcome");
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");
  const newChatBtn = document.getElementById("newChatBtn");
  const userAvatar = document.getElementById("userAvatar");
  const userGreeting = document.getElementById("userGreeting");
  const themeToggle = document.getElementById("themeToggle");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  const logoutBtn = document.getElementById("logoutBtn");
  const toast = document.getElementById("toast");
  const chips = document.querySelectorAll(".chip-btn");

  // ── State ──────────────────────────────────────────────────── //
  let isSending = false;

  // ── Toast ──────────────────────────────────────────────────── //
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  // ── Theme ──────────────────────────────────────────────────── //
  if (localStorage.getItem("pathpilot-theme") === "dark") {
    document.body.classList.add("dark");
  }
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(
      "pathpilot-theme",
      document.body.classList.contains("dark") ? "dark" : "light",
    );
  });

  // ── Sidebar toggle ─────────────────────────────────────────── //
  sidebarToggle.addEventListener("click", () =>
    sidebar.classList.toggle("open"),
  );
  document.addEventListener("click", (e) => {
    if (
      sidebar.classList.contains("open") &&
      !sidebar.contains(e.target) &&
      e.target !== sidebarToggle
    ) {
      sidebar.classList.remove("open");
    }
  });

  // ── Logout ─────────────────────────────────────────────────── //
  logoutBtn.addEventListener("click", () => {
    clearSession();
    window.location.href = "login.html";
  });

  // ── Populate user info ─────────────────────────────────────── //
  function populateUserInfo() {
    const user = getStoredUser();
    const name = user?.name || user?.email?.split("@")[0] || "User";
    const initial = name.charAt(0).toUpperCase();
    userAvatar.textContent = initial;
    userGreeting.textContent = name;
  }

  // ── Markdown-lite renderer ─────────────────────────────────── //
  function renderMarkdown(text) {
    let html = escHtml(text);

    // Tables: |col|col| rows
    html = html.replace(/(\|[^\n]+\|\n?)+/g, (table) => {
      const rows = table
        .trim()
        .split("\n")
        .filter((r) => r.trim());
      if (rows.length < 2) return table;
      const header = rows[0]
        .split("|")
        .filter((c) => c.trim())
        .map((c) => `<th>${c.trim()}</th>`)
        .join("");
      const separator = rows[1]; // skip separator row
      const bodyRows = rows
        .slice(2)
        .map((row) => {
          const cells = row
            .split("|")
            .filter((c) => c.trim())
            .map((c) => `<td>${c.trim()}</td>`)
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");
      return `<table><thead><tr>${header}</tr></thead><tbody>${bodyRows}</tbody></table>`;
    });

    // Blockquotes
    html = html.replace(/^&gt;\s?(.+)$/gm, "<blockquote>$1</blockquote>");

    // Bold **text**
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    // Italic _text_
    html = html.replace(/_(.+?)_/g, "<em>$1</em>");

    // Inline code `code`
    html = html.replace(/`(.+?)`/g, "<code>$1</code>");

    // Bullet lists  - item  or  • item
    html = html.replace(/^[-•]\s+(.+)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");

    // Numbered lists  1. item
    html = html.replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>");

    // Line breaks → paragraphs (double newline)
    html = html.replace(/\n\n+/g, "</p><p>");
    html = html.replace(/\n/g, "<br>");
    html = `<p>${html}</p>`;

    // Clean empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, "");

    return html;
  }

  // ── Escape HTML ────────────────────────────────────────────── //
  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Format time ────────────────────────────────────────────── //
  function formatTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // ── Render a message bubble ────────────────────────────────── //
  function renderMessage(role, content, createdAt) {
    const row = document.createElement("div");
    row.className = `message-row ${role}`;

    const storedUser = getStoredUser();
    const userInitial = (storedUser?.email || "U").charAt(0).toUpperCase();

    const avatarHtml =
      role === "assistant"
        ? `<div class="msg-avatar assistant-avatar">🧭</div>`
        : `<div class="msg-avatar user-avatar">${userInitial}</div>`;

    const bubbleContent =
      role === "assistant"
        ? renderMarkdown(content)
        : `<p>${escHtml(content)}</p>`;

    const timeStr = createdAt
      ? formatTime(createdAt)
      : formatTime(new Date().toISOString());

    row.innerHTML = `
      ${avatarHtml}
      <div class="msg-content-wrapper">
        <div class="msg-bubble">${bubbleContent}</div>
        <div class="msg-time">${timeStr}</div>
      </div>
    `;

    return row;
  }

  // ── Show typing indicator ──────────────────────────────────── //
  function showTyping() {
    removeTyping();
    const row = document.createElement("div");
    row.className = "typing-row";
    row.id = "typingIndicator";
    row.innerHTML = `
      <div class="msg-avatar assistant-avatar">🧭</div>
      <div class="typing-bubble">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    chatInner.appendChild(row);
    scrollToBottom();
  }

  function removeTyping() {
    const el = document.getElementById("typingIndicator");
    if (el) el.remove();
  }

  // ── Scroll to bottom ───────────────────────────────────────── //
  function scrollToBottom(smooth = true) {
    chatBody.scrollTo({
      top: chatBody.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }

  // ── Hide welcome screen ────────────────────────────────────── //
  function hideWelcome() {
    if (chatWelcome && chatWelcome.parentNode) {
      chatWelcome.remove();
    }
  }

  // ── Load chat history ──────────────────────────────────────── //
  async function loadHistory() {
    try {
      const data = await getChatHistory();
      const messages = data?.messages || [];
      if (messages.length === 0) return;

      hideWelcome();

      messages.forEach((msg) => {
        chatInner.appendChild(
          renderMessage(msg.role, msg.content, msg.created_at),
        );
      });

      scrollToBottom(false);
    } catch (err) {
      console.warn("Could not load chat history:", err.message);
    }
  }

  // ── Send a message ─────────────────────────────────────────── //
  async function sendMessage(text) {
    if (!text.trim() || isSending) return;
    isSending = true;
    setSendState(true);

    hideWelcome();

    // Append user bubble immediately
    chatInner.appendChild(renderMessage("user", text.trim()));
    chatInput.value = "";
    autoResizeTextarea();
    scrollToBottom();

    // Show typing
    showTyping();
    scrollToBottom();

    try {
      const resp = await sendChatMessage(text.trim());
      removeTyping();
      chatInner.appendChild(
        renderMessage("assistant", resp.content, resp.created_at),
      );
      scrollToBottom();
    } catch (err) {
      removeTyping();
      chatInner.appendChild(
        renderMessage(
          "assistant",
          "⚠️ Sorry, I had trouble responding. Please try again in a moment.",
          null,
        ),
      );
      scrollToBottom();
    } finally {
      isSending = false;
      setSendState(false);
      chatInput.focus();
    }
  }

  // ── Send button state ──────────────────────────────────────── //
  function setSendState(busy) {
    sendBtn.disabled = busy || chatInput.value.trim().length === 0;
  }

  // ── Auto-resize textarea ───────────────────────────────────── //
  function autoResizeTextarea() {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + "px";
  }

  // ── Input events ───────────────────────────────────────────── //
  chatInput.addEventListener("input", () => {
    autoResizeTextarea();
    sendBtn.disabled = chatInput.value.trim().length === 0 || isSending;
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatInput.value);
    }
  });

  sendBtn.addEventListener("click", () => sendMessage(chatInput.value));

  // ── Suggested chip clicks ──────────────────────────────────── //
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const msg = chip.dataset.msg;
      chatInput.value = msg;
      autoResizeTextarea();
      setSendState(false);
      sendMessage(msg);
    });
  });

  // ── New Chat button ────────────────────────────────────────── //
  newChatBtn.addEventListener("click", async () => {
    if (isSending) return;
    if (
      !confirm("Start a new chat? Your current conversation will be cleared.")
    )
      return;

    try {
      await clearChatHistory();
      // Clear all messages and restore welcome screen
      chatInner.innerHTML = `
        <div class="chat-welcome" id="chatWelcome">
          <div class="chat-welcome-avatar">🧭</div>
          <h2>Your AI Career Mentor</h2>
          <p>Ask me anything about your career path — I know your profile, your skill gaps, and the best learning routes for your goals.</p>
          <div class="suggested-chips" id="suggestedChips">
            <button class="chip-btn" data-msg="What career suits me best?">🎯 Best career for me</button>
            <button class="chip-btn" data-msg="What skills am I missing for my top career?">📊 My skill gaps</button>
            <button class="chip-btn" data-msg="Show me my learning roadmap">🗺️ My roadmap</button>
            <button class="chip-btn" data-msg="What government exams should I consider?">📝 Exam guidance</button>
            <button class="chip-btn" data-msg="How can I improve my profile?">✨ Profile tips</button>
            <button class="chip-btn" data-msg="Tell me about Data Scientist / ML Engineer">🎓 Career details</button>
          </div>
        </div>
      `;
      // Re-wire chip buttons after DOM rebuild
      chatInner.querySelectorAll(".chip-btn").forEach((chip) => {
        chip.addEventListener("click", () => {
          const msg = chip.dataset.msg;
          chatInput.value = msg;
          autoResizeTextarea();
          setSendState(false);
          sendMessage(msg);
        });
      });
      showToast("New chat started ✦");
    } catch (err) {
      showToast("Could not clear chat: " + err.message);
    }
  });

  // ── Boot ───────────────────────────────────────────────────── //
  populateUserInfo();
  loadHistory();
  chatInput.focus();
})();

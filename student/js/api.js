const API_URL = "http://localhost:8001/api/v1";

function getToken() {
  return localStorage.getItem("pathpilot-token");
}

function setSession(data) {
  localStorage.setItem("pathpilot-token", data.access_token);
  localStorage.setItem("pathpilot-user", JSON.stringify(data.user));
}

function clearSession() {
  localStorage.removeItem("pathpilot-token");
  localStorage.removeItem("pathpilot-user");
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("pathpilot-user") || "null");
  } catch {
    return null;
  }
}

async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    if (path !== "/auth/login") {
      clearSession();
      const reason = data && data.detail === "User is unavailable" ? "deleted" : "expired";
      window.location.href = `login.html?reason=${reason}`;
      throw new Error("Session expired. Redirecting to login...");
    }
  }

  if (!response.ok) throw new Error(data.detail || "Something went wrong");
  return data;
}

function showMessage(element, text, type = "error") {
  element.textContent = text;
  element.className = `message show ${type}`;
}

function setBusy(button, busy, label = "Please wait...") {
  if (!button.dataset.label) button.dataset.label = button.textContent;
  button.disabled = busy;
  button.textContent = busy ? label : button.dataset.label;
}

// ── Phase 3 helpers ───────────────────────────────────────────── //

/** Run the recommendation engine for the current user (fresh run). */
async function refreshRecommendations() {
  return apiRequest("/recommendations", { method: "POST" });
}

/** Fetch the most recently saved recommendation set. */
async function getRecommendations() {
  return apiRequest("/recommendations/me");
}

/** List all career clusters from the knowledge base. */
async function getCareers() {
  return apiRequest("/careers");
}

/** Get skill-gap analysis for a specific career name. */
async function getSkillGap(careerName) {
  return apiRequest(`/skill-gaps?career=${encodeURIComponent(careerName)}`);
}

/** Fetch the current user's profile. */
async function getMyProfile() {
  return apiRequest("/profiles/me");
}

// ── Phase 7 helpers (AI Mentor Chat) ──────────────────────────── //

/**
 * Send a message to the AI Mentor.
 * @param {string} message
 * @returns {Promise<{id, role, content, created_at}>}
 */
async function sendChatMessage(message) {
  return apiRequest("/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

/** Fetch the last 50 chat messages for the current user. */
async function getChatHistory() {
  return apiRequest("/chat/history");
}

/** Clear all chat messages for the current user. */
async function clearChatHistory() {
  return apiRequest("/chat/history", { method: "DELETE" });
}

// ── Phase 8 helpers (Resume Analyzer) ─────────────────────────── //

/**
 * Analyze a resume text against a target career.
 * @param {string} resume_text
 * @param {string} target_career
 */
async function analyzeResume(resume_text, target_career) {
  return apiRequest("/resume/analyze", {
    method: "POST",
    body: JSON.stringify({ resume_text, target_career }),
  });
}

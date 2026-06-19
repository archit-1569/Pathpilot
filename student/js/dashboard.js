/**
 * PathPilot AI – Dashboard controller (Phase 3)
 * Handles auth guard, data loading, career card rendering,
 * skill-gap analysis, and all interactive UI on dashboard.html.
 */
(function () {
  "use strict";

  // ── Auth guard ────────────────────────────────────────────────── //
  if (!getToken()) {
    window.location.href = "login.html";
    return;
  }

  // ── DOM refs ──────────────────────────────────────────────────── //
  const careerGrid = document.getElementById("careerGrid");
  const matchBadge = document.getElementById("matchBadge");
  const heroTitle = document.getElementById("heroTitle");
  const heroSub = document.getElementById("heroSub");
  const userAvatar = document.getElementById("userAvatar");
  const userGreeting = document.getElementById("userGreeting");
  const refreshBtn = document.getElementById("refreshBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const themeToggle = document.getElementById("themeToggle");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  const errorBanner = document.getElementById("errorBanner");
  const errorTitle = document.getElementById("errorTitle");
  const errorMsg = document.getElementById("errorMsg");
  const toast = document.getElementById("toast");
  const careerSelectorList = document.getElementById("careerSelectorList");
  const gapDetail = document.getElementById("gapDetail");

  // Stats
  const skillCount = document.getElementById("skillCount");
  const interestCount = document.getElementById("interestCount");
  const cgpaDisplay = document.getElementById("cgpaDisplay");
  const certCount = document.getElementById("certCount");

  // ── Toast utility ─────────────────────────────────────────────── //
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  // ── Theme ─────────────────────────────────────────────────────── //
  if (localStorage.getItem("pathpilot-theme") === "dark") {
    document.body.classList.add("dark");
  }
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("pathpilot-theme", isDark ? "dark" : "light");
  });

  // ── Mobile sidebar toggle ─────────────────────────────────────── //
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

  // ── Logout ────────────────────────────────────────────────────── //
  logoutBtn.addEventListener("click", () => {
    clearSession();
    window.location.href = "login.html";
  });

  // ── Populate user info ────────────────────────────────────────── //
  function populateUserInfo(profile) {
    const name =
      profile?.name || getStoredUser()?.email?.split("@")[0] || "there";
    const initial = name.charAt(0).toUpperCase();
    userAvatar.textContent = initial;
    userGreeting.textContent = name;
    heroTitle.textContent = `Hi ${name.split(" ")[0]}, here are your top career matches`;

    skillCount.textContent = (profile?.skills || []).length;
    interestCount.textContent = (profile?.interests || []).length;
    cgpaDisplay.textContent = profile?.cgpa ? `${profile.cgpa}` : "—";
    certCount.textContent = (profile?.certifications || []).filter(
      Boolean,
    ).length;
  }

  // ── Render career cards ───────────────────────────────────────── //
  function renderCareerCards(results) {
    careerGrid.innerHTML = "";

    if (!results || results.length === 0) {
      careerGrid.innerHTML = `<p style="color:var(--muted);font-size:13px;grid-column:1/-1">
        No career matches found. Please update your profile with more skills and interests.</p>`;
      matchBadge.textContent = "0 matches";
      return;
    }

    matchBadge.textContent = `${results.length} matches found`;

    results.forEach((item, idx) => {
      const card = document.createElement("article");
      card.className = `career-card${idx === 0 ? " top-match" : ""}`;
      card.dataset.career = item.career_name;

      const matchPct = Math.round(item.match_pct);
      const matchedSkills = (item.matched_skills || []).slice(0, 5);
      const skillGaps = (item.skill_gaps || []).slice(0, 4);

      card.innerHTML = `
        <span class="career-rank">#${item.rank || idx + 1}</span>
        <h3>${escHtml(item.career_name)}</h3>
        <p class="career-desc">${escHtml(item.description)}</p>

        <div class="match-bar-row">
          <span class="match-bar-label">Match score</span>
          <span class="match-pct-label">${matchPct}%</span>
        </div>
        <div class="match-bar-track">
          <div class="match-bar-fill" data-pct="${matchPct}"></div>
        </div>

        ${
          matchedSkills.length
            ? `
          <span class="chip-label">✓ You already have</span>
          <div class="chip-row">
            ${matchedSkills.map((s) => `<span class="chip have">${escHtml(s)}</span>`).join("")}
          </div>`
            : ""
        }

        ${
          skillGaps.length
            ? `
          <span class="chip-label">↗ Skills to build</span>
          <div class="chip-row">
            ${skillGaps.map((s) => `<span class="chip need">${escHtml(s)}</span>`).join("")}
          </div>`
            : ""
        }

        <button class="view-gap-btn" data-career="${escHtml(item.career_name)}">
          <svg viewBox="0 0 24 24" width="12" style="flex-shrink:0"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
          Full skill gap analysis
        </button>
      `;

      careerGrid.appendChild(card);

      // Animate bar after a tick
      requestAnimationFrame(() => {
        setTimeout(
          () => {
            const fill = card.querySelector(".match-bar-fill");
            if (fill) fill.style.width = `${matchPct}%`;
          },
          100 + idx * 120,
        );
      });

      // Wire gap button
      card.querySelector(".view-gap-btn").addEventListener("click", () => {
        loadSkillGap(item.career_name);
        document
          .getElementById("gaps-panel")
          .scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  // ── Render selector items ─────────────────────────────────────── //
  function renderSelectorItems(results) {
    careerSelectorList.innerHTML = "";
    (results || []).forEach((item) => {
      const btn = document.createElement("button");
      btn.className = "selector-item";
      btn.textContent = item.career_name;
      btn.dataset.career = item.career_name;
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".selector-item")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        loadSkillGap(item.career_name);
      });
      careerSelectorList.appendChild(btn);
    });
  }

  // ── Load skill gap ────────────────────────────────────────────── //
  async function loadSkillGap(careerName) {
    // Highlight selector
    document.querySelectorAll(".selector-item").forEach((b) => {
      b.classList.toggle("active", b.dataset.career === careerName);
    });

    gapDetail.innerHTML = `
      <div class="gap-placeholder"><span style="animation:spin 1s linear infinite;display:inline-block">↗</span><p>Analysing gap…</p></div>`;

    try {
      const gap = await getSkillGap(careerName);

      const haveHtml = (gap.you_have || []).length
        ? gap.you_have
            .map((s) => `<span class="chip have">${escHtml(s)}</span>`)
            .join("")
        : `<span style="color:var(--muted);font-size:11px">None yet — keep adding skills to your profile.</span>`;

      const needHtml = (gap.you_need || []).length
        ? gap.you_need
            .map((s) => `<span class="chip need">${escHtml(s)}</span>`)
            .join("")
        : `<span style="color:var(--muted);font-size:11px">You've covered the key skills! 🎉</span>`;

      gapDetail.innerHTML = `
        <h3 class="gap-career-name">${escHtml(gap.career_name)}</h3>
        <p class="gap-career-desc">${escHtml(gap.description)}</p>
        <div class="gap-coverage">
          <span class="coverage-pct">${gap.coverage_pct}%</span>
          <div class="coverage-label">
            <strong>Skills covered</strong>
            ${gap.you_have.length} of ${gap.total_required_skills} typical skills matched
          </div>
        </div>
        <div class="gap-columns">
          <div>
            <p class="gap-col-title have">✓ You have</p>
            <div class="chip-row">${haveHtml}</div>
          </div>
          <div>
            <p class="gap-col-title need">↗ You need</p>
            <div class="chip-row">${needHtml}</div>
          </div>
        </div>`;
    } catch (err) {
      gapDetail.innerHTML = `<div class="gap-placeholder"><span>⚠</span><p>${escHtml(err.message)}</p></div>`;
    }
  }

  // ── Show error ────────────────────────────────────────────────── //
  function showError(title, msg) {
    errorBanner.style.display = "flex";
    errorTitle.textContent = title;
    errorMsg.textContent = msg;
    careerGrid.innerHTML = "";
    matchBadge.textContent = "—";
  }

  // ── Load everything ───────────────────────────────────────────── //
  async function loadDashboard(forceRefresh = false) {
    errorBanner.style.display = "none";
    refreshBtn.classList.toggle("loading", forceRefresh);

    try {
      // Load profile and recommendations in parallel
      const [profile, recData] = await Promise.all([
        getMyProfile().catch(() => null),
        forceRefresh ? refreshRecommendations() : getRecommendations(),
      ]);

      populateUserInfo(profile);

      const results = recData?.results || [];
      renderCareerCards(results);
      renderSelectorItems(results);

      // Auto-load gap for top match
      if (results.length > 0) {
        loadSkillGap(results[0].career_name);
      }
    } catch (err) {
      if (
        err.message.toLowerCase().includes("401") ||
        err.message.toLowerCase().includes("unauthorized")
      ) {
        clearSession();
        window.location.href = "login.html";
        return;
      }
      showError("Could not load recommendations", err.message);
    } finally {
      refreshBtn.classList.remove("loading");
    }
  }

  // ── Refresh button ────────────────────────────────────────────── //
  refreshBtn.addEventListener("click", async () => {
    showToast("Running fresh analysis…");
    await loadDashboard(true);
    showToast("Matches updated! ✦");
  });

  // ── Escape HTML helper ────────────────────────────────────────── //
  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Boot ──────────────────────────────────────────────────────── //
  loadDashboard();
})();

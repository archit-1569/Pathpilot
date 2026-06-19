// roadmap.js — Personalized Learning Roadmap
const careerSelect = document.getElementById("careerSelect");
const loadBtn = document.getElementById("loadBtn");
const loadingIndicator = document.getElementById("loadingIndicator");
const roadmapContent = document.getElementById("roadmapContent");

async function init() {
  try {
    const careers = await apiRequest("/careers");
    careers
      .sort((a, b) => a.career_name.localeCompare(b.career_name))
      .forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.career_name;
        opt.textContent = c.career_name;
        careerSelect.appendChild(opt);
      });

    // Auto-load from URL param
    const urlParams = new URLSearchParams(window.location.search);
    const targetCareer = urlParams.get("career");
    if (targetCareer) {
      careerSelect.value = targetCareer;
      loadRoadmap(targetCareer);
    }
  } catch (error) {
    console.error("Failed to load careers:", error);
  }
}

loadBtn.addEventListener("click", () => {
  if (careerSelect.value) {
    const url = new URL(window.location);
    url.searchParams.set("career", careerSelect.value);
    window.history.pushState({}, "", url);
    loadRoadmap(careerSelect.value);
  }
});

async function loadRoadmap(careerName) {
  roadmapContent.style.display = "none";
  loadingIndicator.style.display = "block";

  try {
    const data = await apiRequest(
      `/roadmaps?career=${encodeURIComponent(careerName)}`,
    );

    // Update ring
    document.getElementById("roadmapPct").textContent =
      Math.round(data.completion_pct) + "%";
    document.getElementById("roadmapRing").style.strokeDasharray =
      `${data.completion_pct}, 100`;

    // Stats
    document.getElementById("roadmapTitle").textContent = data.career_name;
    document.getElementById("roadmapAcquired").textContent =
      data.acquired_skills;
    document.getElementById("roadmapTotal").textContent = data.total_skills;
    document.getElementById("roadmapDesc").textContent = data.description;

    // Stages
    const stagesEl = document.getElementById("roadmapStages");
    stagesEl.innerHTML = "";

    data.stages.forEach((stage, idx) => {
      const card = document.createElement("div");
      card.className = `roadmap-stage-card ${stage.completed ? "completed" : ""}`;

      const skillsHTML = (stage.skills || [])
        .map(
          (skill) => `
        <span class="skill-chip ${skill.acquired ? "acquired" : "pending"}">
          <span class="skill-icon">${skill.acquired ? "✓" : "○"}</span>
          ${skill.name}
        </span>
      `,
        )
        .join("");

      card.innerHTML = `
        <div class="stage-header">
          <div class="stage-num">${idx + 1}</div>
          <div class="stage-title">
            <h3>${stage.stage}: ${stage.title}</h3>
            <p>${stage.skills.length} skills in this stage</p>
          </div>
        </div>
        <div class="stage-skills">${skillsHTML || "<p style='opacity:0.6;font-size:14px;'>No skills listed.</p>"}</div>
      `;
      stagesEl.appendChild(card);
    });

    loadingIndicator.style.display = "none";
    roadmapContent.style.display = "block";
  } catch (error) {
    loadingIndicator.textContent = "Error: " + error.message;
  }
}

init();

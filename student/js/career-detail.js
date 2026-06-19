// career-detail.js
const urlParams = new URLSearchParams(window.location.search);
const careerName = urlParams.get("career");

if (!careerName) {
  document.getElementById("loadingIndicator").style.display = "none";
  document.getElementById("errorState").style.display = "block";
} else {
  loadDetails(careerName);
}

async function loadDetails(name) {
  try {
    const data = await apiRequest(`/careers/${encodeURIComponent(name)}`);

    document.getElementById("loadingIndicator").style.display = "none";
    document.getElementById("careerContent").style.display = "block";

    // Header
    document.getElementById("cName").textContent = data.career_name;
    document.getElementById("cOverview").textContent =
      data.overview || data.description || "Detailed overview not available.";

    // Stats
    document.getElementById("cSalary").textContent =
      data.salary_range || "Varies";
    document.getElementById("cEligibility").textContent =
      data.eligibility || "Degree / Relevant Experience";
    document.getElementById("cGrowth").textContent =
      data.career_growth || "Strong Potential";

    // Responsibilities
    const respList = document.getElementById("cResponsibilities");
    if (data.responsibilities && data.responsibilities.length) {
      data.responsibilities.forEach((r) => {
        const li = document.createElement("li");
        li.textContent = r;
        respList.appendChild(li);
      });
    } else {
      respList.innerHTML =
        "<li class='muted'>Standard industry responsibilities apply.</li>";
    }

    // Roadmap
    const roadmapContainer = document.getElementById("cRoadmap");
    if (data.learning_roadmap && data.learning_roadmap.length) {
      data.learning_roadmap.forEach((r) => {
        const stage = document.createElement("div");
        stage.className = "roadmap-stage";
        stage.innerHTML = `
          <h4>${r.stage}: ${r.title || ""}</h4>
          <p>Key skills: <strong>${(r.skills || []).join(", ")}</strong></p>
        `;
        roadmapContainer.appendChild(stage);
      });
    } else {
      roadmapContainer.innerHTML =
        "<p class='muted'>Specific learning roadmap not available yet.</p>";
    }

    // Industries
    const indContainer = document.getElementById("cIndustries");
    if (data.industries && data.industries.length) {
      data.industries.forEach((i) => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = i;
        indContainer.appendChild(span);
      });
    } else {
      indContainer.innerHTML = "<span class='muted'>Various sectors</span>";
    }

    // Skills
    const skillsContainer = document.getElementById("cSkills");
    if (data.typical_skills && data.typical_skills.length) {
      data.typical_skills.slice(0, 10).forEach((s) => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = s;
        skillsContainer.appendChild(span);
      });
    }

    // Gap Link
    document.getElementById("cGapLink").href =
      `skill-gap.html?career=${encodeURIComponent(data.career_name)}`;
  } catch (error) {
    document.getElementById("loadingIndicator").style.display = "none";
    document.getElementById("errorState").style.display = "block";
  }
}

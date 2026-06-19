// skill-gap.js
const careerSelect = document.getElementById("careerSelect");
const analyzeBtn = document.getElementById("analyzeBtn");
const loadingIndicator = document.getElementById("loadingIndicator");
const resultsSection = document.getElementById("resultsSection");

// Init
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

    // Check URL
    const urlParams = new URLSearchParams(window.location.search);
    const targetCareer = urlParams.get("career");
    if (targetCareer) {
      careerSelect.value = targetCareer;
      runAnalysis(targetCareer);
    }
  } catch (error) {
    console.error("Failed to load careers for dropdown", error);
  }
}

analyzeBtn.addEventListener("click", () => {
  if (careerSelect.value) {
    // update url without reloading
    const url = new URL(window.location);
    url.searchParams.set("career", careerSelect.value);
    window.history.pushState({}, "", url);
    runAnalysis(careerSelect.value);
  }
});

async function runAnalysis(careerName) {
  resultsSection.style.display = "none";
  loadingIndicator.style.display = "block";
  loadingIndicator.textContent = "Analyzing your profile...";

  try {
    // Needs token because get_skill_gaps requires CurrentUser
    const data = await apiRequest(
      `/skill-gaps?career=${encodeURIComponent(careerName)}`,
    );

    // Populate Results
    document.getElementById("rCareerName").textContent = data.career_name;
    document.getElementById("rHaveCount").textContent = data.you_have.length;
    document.getElementById("rTotalCount").textContent =
      data.total_required_skills;

    // Circle
    document.getElementById("coverageText").textContent =
      Math.round(data.coverage_pct) + "%";
    document.getElementById("coverageRing").style.strokeDasharray =
      `${data.coverage_pct}, 100`;

    // Sequence
    const seqList = document.getElementById("sequenceList");
    seqList.innerHTML = "";
    if (data.learning_sequence && data.learning_sequence.length) {
      data.learning_sequence.forEach((skill) => {
        const div = document.createElement("div");
        div.className = "seq-item";
        div.textContent = skill;
        seqList.appendChild(div);
      });
    } else if (data.you_need.length) {
      data.you_need.forEach((skill) => {
        const div = document.createElement("div");
        div.className = "seq-item";
        div.textContent = skill;
        seqList.appendChild(div);
      });
    } else {
      seqList.innerHTML =
        "<p class='muted'>You have all the core skills for this career!</p>";
    }

    // Matrix
    const impHigh = document.getElementById("impHigh");
    const impMed = document.getElementById("impMed");
    const impLow = document.getElementById("impLow");
    impHigh.innerHTML = "";
    impMed.innerHTML = "";
    impLow.innerHTML = "";

    if (data.skill_importance) {
      Object.entries(data.skill_importance).forEach(([skill, level]) => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = skill;
        if (level === "High") impHigh.appendChild(span);
        else if (level === "Medium") impMed.appendChild(span);
        else impLow.appendChild(span);
      });
    }

    if (!impHigh.hasChildNodes())
      impHigh.innerHTML = "<span class='muted'>None</span>";
    if (!impMed.hasChildNodes())
      impMed.innerHTML = "<span class='muted'>None</span>";
    if (!impLow.hasChildNodes())
      impLow.innerHTML = "<span class='muted'>None</span>";

    // You Have
    const haveList = document.getElementById("rHaveList");
    haveList.innerHTML = "";
    if (data.you_have && data.you_have.length) {
      data.you_have.forEach((s) => {
        const span = document.createElement("span");
        span.className = "tag done";
        span.textContent = s;
        haveList.appendChild(span);
      });
    } else {
      haveList.innerHTML =
        "<p class='muted'>No overlapping skills found on your profile.</p>";
    }

    loadingIndicator.style.display = "none";
    resultsSection.style.display = "block";
  } catch (error) {
    loadingIndicator.textContent = "Error: " + error.message;
  }
}

init();

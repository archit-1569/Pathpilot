// exam-detail.js — Exam detail page
const urlParams = new URLSearchParams(window.location.search);
const examName = urlParams.get("exam");

const CATEGORY_CLASSES = {
  "Civil Services": "cat-Civil Services",
  Banking: "cat-Banking",
  Engineering: "cat-Engineering",
  Defence: "cat-Defence",
  Railways: "cat-Railways",
  Teaching: "cat-Teaching",
  SSC: "cat-SSC",
};

if (!examName) {
  document.getElementById("loadingIndicator").style.display = "none";
  document.getElementById("errorState").style.display = "block";
} else {
  loadExam(examName);
}

async function loadExam(name) {
  try {
    const data = await apiRequest(`/exams/${encodeURIComponent(name)}`);
    document.title = `${data.exam_name} | PathPilot AI`;
    document.getElementById("loadingIndicator").style.display = "none";
    document.getElementById("examContent").style.display = "block";

    // Header
    document.getElementById("eName").textContent = data.exam_name;

    const catBadge = document.getElementById("eCatBadge");
    catBadge.textContent = data.category;
    catBadge.className = `cat-badge ${CATEGORY_CLASSES[data.category] || ""}`;

    const diffBadge = document.getElementById("eDiffBadge");
    diffBadge.textContent = data.difficulty_level;
    diffBadge.className = `diff-badge diff-${data.difficulty_level}`;

    // Stats
    document.getElementById("eEligibility").textContent = data.eligibility;
    document.getElementById("eAge").textContent = data.age_limit;
    document.getElementById("eSalary").textContent = data.salary_range;

    // Selection Process
    const processEl = document.getElementById("eProcess");
    (data.selection_process || []).forEach((step, idx) => {
      const div = document.createElement("div");
      div.className = "step";
      div.innerHTML = `<span class="step-num">${idx + 1}</span><span class="step-label">${step}</span>`;
      processEl.appendChild(div);
    });

    // Syllabus
    const syllabusEl = document.getElementById("eSyllabus");
    const topics = data.syllabus
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    topics.forEach((topic) => {
      const span = document.createElement("span");
      span.className = "syllabus-tag";
      span.textContent = topic;
      syllabusEl.appendChild(span);
    });

    // Job Roles
    const jobRolesEl = document.getElementById("eJobRoles");
    (data.job_roles || []).forEach((role) => {
      const li = document.createElement("li");
      li.textContent = role;
      jobRolesEl.appendChild(li);
    });
  } catch (error) {
    document.getElementById("loadingIndicator").style.display = "none";
    document.getElementById("errorState").style.display = "block";
  }
}

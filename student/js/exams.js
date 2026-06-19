// exams.js — Exam Guide explorer
const loadingIndicator = document.getElementById("loadingIndicator");
const examsGrid = document.getElementById("examsGrid");
const noResults = document.getElementById("noResults");
const searchInput = document.getElementById("searchInput");

let allExams = [];
let activeCategory = "";

const CATEGORY_CLASSES = {
  "Civil Services": "cat-Civil Services",
  Banking: "cat-Banking",
  Engineering: "cat-Engineering",
  Defence: "cat-Defence",
  Railways: "cat-Railways",
  Teaching: "cat-Teaching",
  SSC: "cat-SSC",
};

async function loadExams() {
  try {
    allExams = await apiRequest("/exams");
    const countEl = document.getElementById("examCount");
    if (countEl) {
      countEl.textContent = allExams.length;
    }
    renderExams(allExams);
  } catch (error) {
    loadingIndicator.textContent = "Failed to load exams: " + error.message;
  }
}

function renderExams(exams) {
  loadingIndicator.style.display = "none";
  examsGrid.innerHTML = "";

  if (exams.length === 0) {
    examsGrid.style.display = "none";
    noResults.style.display = "block";
    return;
  }

  noResults.style.display = "none";
  examsGrid.style.display = "grid";

  exams.forEach((e) => {
    const link = document.createElement("a");
    link.className = "exam-card";
    link.href = `exam-detail.html?exam=${encodeURIComponent(e.exam_name)}`;

    const catClass = CATEGORY_CLASSES[e.category] || "cat-badge";
    const diffClass = `diff-${e.difficulty_level}`;

    link.innerHTML = `
      <div class="exam-card-header">
        <h3>${e.exam_name}</h3>
        <span class="cat-badge ${catClass}">${e.category}</span>
      </div>
      <p class="exam-eligibility">Eligibility: ${e.eligibility}</p>
      <div class="exam-card-footer">
        <span class="diff-badge ${diffClass}">${e.difficulty_level}</span>
        <span class="exam-arrow">→</span>
      </div>
    `;
    examsGrid.appendChild(link);
  });
}

function filterAndRender() {
  const query = searchInput.value.toLowerCase().trim();
  let filtered = allExams;

  if (activeCategory) {
    filtered = filtered.filter((e) => e.category === activeCategory);
  }
  if (query) {
    filtered = filtered.filter(
      (e) =>
        e.exam_name.toLowerCase().includes(query) ||
        (e.job_roles || []).some((r) => r.toLowerCase().includes(query)) ||
        e.eligibility.toLowerCase().includes(query),
    );
  }
  renderExams(filtered);
}

// Category filter chips
document.getElementById("filterChips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document
    .querySelectorAll(".chip")
    .forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");
  activeCategory = chip.dataset.category;
  filterAndRender();
});

searchInput.addEventListener("input", filterAndRender);

loadExams();

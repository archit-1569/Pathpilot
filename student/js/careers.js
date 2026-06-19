// careers.js
const loadingIndicator = document.getElementById("loadingIndicator");
const careersGrid = document.getElementById("careersGrid");
const noResults = document.getElementById("noResults");
const searchInput = document.getElementById("searchInput");

let allCareers = [];

async function loadCareers() {
  try {
    allCareers = await apiRequest("/careers");
    renderCareers(allCareers);
  } catch (error) {
    loadingIndicator.textContent = "Failed to load careers: " + error.message;
  }
}

function renderCareers(careers) {
  loadingIndicator.style.display = "none";
  careersGrid.innerHTML = "";

  if (careers.length === 0) {
    careersGrid.style.display = "none";
    noResults.style.display = "block";
    return;
  }

  noResults.style.display = "none";
  careersGrid.style.display = "grid";

  careers.forEach((c) => {
    const card = document.createElement("a");
    card.className = "career-card-link";
    card.href = `career-detail.html?career=${encodeURIComponent(c.career_name)}`;

    // Default description if none
    const desc = c.overview || c.description || "Explore this career path.";

    card.innerHTML = `
      <h3>${c.career_name}</h3>
      <p class="c-desc">${desc}</p>
      <div class="c-stats">
        <span>${c.typical_skills.length} core skills</span>
      </div>
    `;
    careersGrid.appendChild(card);
  });
}

searchInput.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    renderCareers(allCareers);
    return;
  }

  const filtered = allCareers.filter((c) => {
    const nameMatch = c.career_name.toLowerCase().includes(query);
    const skillMatch = c.typical_skills.some((s) =>
      s.toLowerCase().includes(query),
    );
    return nameMatch || skillMatch;
  });

  renderCareers(filtered);
});

loadCareers();

if (!getToken()) location.href = "login.html";

const form = document.querySelector("#profileForm");
const message = document.querySelector("#message");
const fields = [
  "name",
  "age",
  "gender",
  "educationLevel",
  "stream",
  "cgpa",
  "skills",
  "interests",
  "certifications",
  "careerGoals",
];

function list(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
function setValue(id, value) {
  document.querySelector(`#${id}`).value = Array.isArray(value)
    ? value.join(", ")
    : (value ?? "");
}
function updateProgress() {
  const completed = fields.filter((id) =>
    document.querySelector(`#${id}`).value.trim(),
  ).length;
  const percent = Math.round((completed / fields.length) * 100);
  document.querySelector("#progressLabel").textContent =
    `Profile completion: ${percent}%`;
  document
    .querySelector("#progressBar")
    .style.setProperty("--progress", `${percent}%`);
}

async function loadProfile() {
  try {
    const profile = await apiRequest("/profiles/me");
    setValue("name", profile.name);
    setValue("age", profile.age);
    setValue("gender", profile.gender);
    setValue("educationLevel", profile.education_level);
    setValue("stream", profile.stream);
    setValue("cgpa", profile.cgpa);
    setValue("skills", profile.skills);
    setValue("interests", profile.interests);
    setValue("certifications", profile.certifications);
    setValue("careerGoals", profile.career_goals);
    updateProgress();
  } catch (error) {
    if (error.message.includes("token")) {
      clearSession();
      location.href = "login.html";
    } else showMessage(message, error.message);
  }
}

form.addEventListener("input", updateProgress);
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector(".primary-button");
  setBusy(button, true, "Saving...");
  const payload = {
    name: document.querySelector("#name").value,
    age: document.querySelector("#age").value
      ? Number(document.querySelector("#age").value)
      : null,
    gender: document.querySelector("#gender").value || null,
    education_level: document.querySelector("#educationLevel").value || null,
    stream: document.querySelector("#stream").value || null,
    cgpa: document.querySelector("#cgpa").value
      ? Number(document.querySelector("#cgpa").value)
      : null,
    skills: list(document.querySelector("#skills").value),
    interests: list(document.querySelector("#interests").value),
    certifications: list(document.querySelector("#certifications").value),
    career_goals: document.querySelector("#careerGoals").value || null,
  };
  try {
    await apiRequest("/profiles/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    // Store the updated name so the home page header chip shows the right value
    const stored = JSON.parse(localStorage.getItem("pathpilot-user") || "{}");
    stored.name = payload.name;
    localStorage.setItem("pathpilot-user", JSON.stringify(stored));

    // Redirect immediately to home page
    window.location.replace("http://localhost:8000/index.html");
  } catch (error) {
    showMessage(message, error.message);
  } finally {
    setBusy(button, false);
  }
});

document.querySelector("#logoutButton").addEventListener("click", () => {
  clearSession();
  location.href = "login.html";
});
document.querySelector("#deleteButton").addEventListener("click", async () => {
  if (!confirm("Delete your PathPilot account permanently?")) return;
  try {
    await apiRequest("/profiles/me", { method: "DELETE" });
    clearSession();
    location.href = "index.html";
  } catch (error) {
    showMessage(message, error.message);
  }
});
loadProfile();

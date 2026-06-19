(function () {
  "use strict";

  if (!getToken()) {
    window.location.href = "login.html";
    return;
  }

  // ── DOM refs ───────────────────────────────────────────────── //
  const userAvatar = document.getElementById("userAvatar");
  const userGreeting = document.getElementById("userGreeting");
  const themeToggle = document.getElementById("themeToggle");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  const logoutBtn = document.getElementById("logoutBtn");
  const toast = document.getElementById("toast");

  const targetCareer = document.getElementById("targetCareer");
  const resumeText = document.getElementById("resumeText");
  const analyzeBtn = document.getElementById("analyzeBtn");

  const dropZone = document.getElementById("dropZone");
  const resumeFile = document.getElementById("resumeFile");
  const fileNameText = document.getElementById("fileNameText");

  const resultsPanel = document.getElementById("resultsPanel");
  const scoreCircle = document.getElementById("scoreCircle");
  const missingSkills = document.getElementById("missingSkills");
  const feedbackList = document.getElementById("feedbackList");

  // ── Toast ──────────────────────────────────────────────────── //
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  // ── Theme & Sidebar & Logout ───────────────────────────────── //
  if (localStorage.getItem("pathpilot-theme") === "dark")
    document.body.classList.add("dark");
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(
      "pathpilot-theme",
      document.body.classList.contains("dark") ? "dark" : "light",
    );
  });
  sidebarToggle.addEventListener("click", () =>
    sidebar.classList.toggle("open"),
  );
  logoutBtn.addEventListener("click", () => {
    clearSession();
    window.location.href = "login.html";
  });

  // ── Populate user info ─────────────────────────────────────── //
  function populateUserInfo() {
    const user = getStoredUser();
    const name = user?.name || user?.email?.split("@")[0] || "User";
    userAvatar.textContent = name.charAt(0).toUpperCase();
    userGreeting.textContent = name;
  }

  // ── Load Careers ───────────────────────────────────────────── //
  async function loadCareers() {
    try {
      const data = await getCareers();
      targetCareer.innerHTML = '<option value="">Select a career...</option>';
      data.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.career_name;
        opt.textContent = c.career_name;
        targetCareer.appendChild(opt);
      });
      const recs = await getRecommendations();
      if (recs?.results?.length > 0)
        targetCareer.value = recs.results[0].career_name;
    } catch (err) {
      console.warn("Could not load careers:", err);
    }
  }

  // ── PDF File Handling ──────────────────────────────────────── //
  async function extractTextFromPDF(file) {
    try {
      showToast("Reading PDF...");
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ");
        fullText += pageText + "\n";
      }
      return fullText;
    } catch (e) {
      console.error(e);
      throw new Error(
        "Could not parse PDF file. Ensure it is a valid text-based PDF.",
      );
    }
  }

  async function extractTextFromImage(file) {
    try {
      showToast("Running OCR on image. This may take a moment...");
      // Tesseract.recognize handles File objects directly
      const result = await Tesseract.recognize(file, "eng");
      return result.data.text;
    } catch (e) {
      console.error(e);
      throw new Error("Could not extract text from the image.");
    }
  }

  async function handleFile(file) {
    if (!file) return;
    fileNameText.textContent = file.name;
    try {
      let text = "";
      if (file.type === "application/pdf") {
        text = await extractTextFromPDF(file);
        showToast(
          "PDF parsed successfully. You can edit the text before analyzing.",
        );
      } else if (file.type.startsWith("image/")) {
        text = await extractTextFromImage(file);
        showToast(
          "Image parsed successfully. You can edit the text before analyzing.",
        );
      } else {
        return showToast("Please upload a PDF or an Image (JPG/PNG).");
      }
      resumeText.value = text;
    } catch (err) {
      showToast(err.message);
    }
  }

  // Drag and Drop Events
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
  resumeFile.addEventListener("change", (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });

  // ── Analyze Resume ─────────────────────────────────────────── //
  analyzeBtn.addEventListener("click", async () => {
    const career = targetCareer.value;
    const text = resumeText.value.trim();

    if (!career) return showToast("Please select a target career.");
    if (!text) return showToast("Please paste or upload your resume text.");

    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = "Analyzing...";
    resultsPanel.style.display = "none";

    try {
      const res = await analyzeResume(text, career);

      // Score
      scoreCircle.textContent = res.score;
      scoreCircle.className = "score-circle"; // reset
      if (res.score >= 80) scoreCircle.classList.add("good");
      else if (res.score >= 50) scoreCircle.classList.add("medium");
      else scoreCircle.classList.add("poor");

      // Missing Skills
      missingSkills.innerHTML = "";
      if (res.missing_skills.length === 0) {
        missingSkills.innerHTML =
          "<span style='color: var(--mint)'>No missing keywords!</span>";
      } else {
        res.missing_skills.forEach((skill) => {
          const s = document.createElement("span");
          s.className = "pill pill-outline";
          s.textContent = skill;
          missingSkills.appendChild(s);
        });
      }

      // Feedback
      feedbackList.innerHTML = "";
      res.formatting_feedback.forEach((fb) => {
        const li = document.createElement("li");
        li.textContent = fb;
        feedbackList.appendChild(li);
      });

      resultsPanel.style.display = "block";
      resultsPanel.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      showToast(err.message || "Error analyzing resume");
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="20"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        Analyze Resume
      `;
    }
  });

  // ── Boot ───────────────────────────────────────────────────── //
  populateUserInfo();
  loadCareers();
})();

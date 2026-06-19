const body = document.body;
const themeButton = document.querySelector("#themeButton");
const menuButton = document.querySelector("#menuButton");
const mobileNav = document.querySelector("#mobileNav");
const searchModal = document.querySelector("#searchModal");
const searchButton = document.querySelector("#searchButton");
const closeSearch = document.querySelector("#closeSearch");
const globalSearch = document.querySelector("#globalSearch");
const searchItems = [...document.querySelectorAll(".search-results button")];
const toast = document.querySelector("#toast");

const savedTheme = localStorage.getItem("pathpilot-theme");
if (savedTheme === "dark") body.classList.add("dark");

// ── Auth-state: populate user chip from data attributes set in <head> ── //
// (CSS already handles show/hide via html.is-authed; JS just fills text)
(function populateUserChip() {
  var root = document.documentElement;
  if (!root.classList.contains("is-authed")) return;
  var nameEl = document.getElementById("headerUserName");
  var avatarEl = document.getElementById("headerUserAvatar");
  if (nameEl) nameEl.textContent = root.dataset.userName || "My account";
  if (avatarEl) avatarEl.textContent = root.dataset.userInitial || "U";
})();

themeButton.addEventListener("click", () => {
  body.classList.toggle("dark");
  localStorage.setItem(
    "pathpilot-theme",
    body.classList.contains("dark") ? "dark" : "light",
  );
});

menuButton.addEventListener("click", () => {
  const isOpen = mobileNav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

document.querySelectorAll(".mobile-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    mobileNav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  });
});

function setSearch(open) {
  searchModal.classList.toggle("open", open);
  searchModal.setAttribute("aria-hidden", String(!open));
  if (open) setTimeout(() => globalSearch.focus(), 150);
}

searchButton.addEventListener("click", () => setSearch(true));
closeSearch.addEventListener("click", () => setSearch(false));
searchModal.addEventListener("click", (event) => {
  if (event.target === searchModal) setSearch(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setSearch(false);
  if ((event.ctrlKey || event.metaKey) && event.key === "k") {
    event.preventDefault();
    setSearch(true);
  }
});

globalSearch.addEventListener("input", (event) => {
  const term = event.target.value.toLowerCase();
  searchItems.forEach((item) => {
    item.hidden = !item.textContent.toLowerCase().includes(term);
  });
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

searchItems.forEach((item) => {
  item.addEventListener("click", () => {
    setSearch(false);
    showToast(
      `${item.querySelector("strong").textContent} is planned for a later phase.`,
    );
  });
});

document.querySelector("#demoButton").addEventListener("click", () => {
  document.querySelector("#journey").scrollIntoView({ behavior: "smooth" });
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 },
);

document
  .querySelectorAll(".reveal")
  .forEach((element) => observer.observe(element));

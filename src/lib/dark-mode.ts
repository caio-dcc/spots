export function initializeDarkMode() {
  // Verificar preferência salva
  const savedMode = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  const isDark = savedMode ? savedMode === "dark" : prefersDark;

  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  return isDark;
}

export function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  return isDark;
}

export function isDarkMode() {
  return document.documentElement.classList.contains("dark");
}

(function() {
  try {
    const theme = localStorage.getItem('spotme_dark_mode');
    if (theme === 'true') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch (e) {}
})();

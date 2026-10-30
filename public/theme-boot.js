// Theme initialization script - runs BEFORE React renders
(function () {
  try {
    const stored = localStorage.getItem('theme');
    const isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches) || !stored;

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
    // Default to dark on any error
    document.documentElement.classList.add('dark');
  }
})();

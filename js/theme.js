/**
 * STUDYSHARE — THEME CONTROLLER
 * Supports Dark & Light modes with system preference auto-detection,
 * localStorage persistence, and Three.js visual synchronization.
 */

(function () {
  'use strict';

  const THEME_KEY = 'studyshare_theme';

  function getPreferredTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    // Respect system preference on first visit (Requirement #12)
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);

    // Update any theme toggle button icons on the page
    const toggleButtons = document.querySelectorAll('.theme-toggle-btn');
    toggleButtons.forEach(btn => {
      btn.innerHTML = theme === 'dark' 
        ? '<i class="fas fa-sun"></i>' 
        : '<i class="fas fa-moon"></i>';
      btn.setAttribute('title', theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    });

    // Dispatch global event for Three.js and dynamic canvases
    window.dispatchEvent(new CustomEvent('studyshare:theme-changed', {
      detail: { theme }
    }));
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
  }

  // Initialize theme immediately on load
  const initialTheme = getPreferredTheme();
  applyTheme(initialTheme);

  // Expose to window
  window.StudyShareTheme = {
    getTheme: () => document.documentElement.getAttribute('data-theme') || 'dark',
    toggle: toggleTheme,
    set: applyTheme
  };

  // Wire up listeners once DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    const toggleButtons = document.querySelectorAll('.theme-toggle-btn');
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', toggleTheme);
    });

    // Watch for device system theme changes if user hasn't explicitly saved
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
        if (!localStorage.getItem(THEME_KEY)) {
          applyTheme(e.matches ? 'light' : 'dark');
        }
      });
    }
  });
})();

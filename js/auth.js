/**
 * STUDYSHARE — OPEN ACCESS SESSION CONTROLLER
 * 
 * Open Access Architecture:
 * - NO login or registration system
 * - NO passwords or account creation
 * - Remembers user's optional public display name locally for convenient uploads & tips
 * - All platform features are openly accessible to every student
 */

(function () {
  'use strict';

  const DISPLAY_NAME_KEY = 'studyshare_display_name';

  function getDisplayName() {
    return localStorage.getItem(DISPLAY_NAME_KEY) || '';
  }

  function setDisplayName(name) {
    if (name && name.trim()) {
      localStorage.setItem(DISPLAY_NAME_KEY, name.trim());
    }
  }

  // Get initials from display name
  function getInitials(name) {
    if (!name) return 'GP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Backwards-compatible session helper for open access
  window.StudyShareAuth = {
    // Open access — all users are directly welcomed
    isAuthenticated: () => true,
    isAdmin: () => false,

    getDisplayName,
    setDisplayName,
    getInitials,

    getUser() {
      const name = getDisplayName();
      return {
        id: 'student-open',
        name: name || 'Student Contributor',
        avatar: getInitials(name || 'Student')
      };
    },

    // Clear any navbar auth buttons (No login / registration)
    renderNavAuth() {
      const authContainer = document.getElementById('navbar-auth-section');
      if (authContainer) {
        authContainer.innerHTML = '';
      }
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    window.StudyShareAuth.renderNavAuth();
  });
})();

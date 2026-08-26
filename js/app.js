/**
 * STUDYSHARE — GLOBAL APPLICATION ENGINE
 * Utility methods, Toast notifications, Mobile Navigation & Bottom Bar Controller,
 * and Animated Counters.
 */

(function () {
  'use strict';

  // Create toast container if not already in document
  function ensureToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  // Toast Notification
  function showToast(message, type = 'info', duration = 3500) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} toast-enter`;

    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';
    if (type === 'warning') iconClass = 'fa-exclamation-triangle';

    toast.innerHTML = `
      <i class="fas ${iconClass} toast-icon"></i>
      <div style="flex: 1; line-height: 1.4;">${message}</div>
      <button style="color: var(--text-muted); padding: 0.4rem; min-width: 36px; min-height: 36px;" aria-label="Close">
        <i class="fas fa-times"></i>
      </button>
    `;

    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => removeToast(toast));

    container.appendChild(toast);

    setTimeout(() => {
      removeToast(toast);
    }, duration);
  }

  function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 250);
  }

  // Animated Counter for Hero and Stats Section
  function animateCounter(el, target, duration = 1600) {
    if (!el) return;
    const targetNum = Number(target) || 0;
    if (targetNum === 0) {
      el.textContent = '0';
      return;
    }

    const startTime = performance.now();
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.floor(ease * targetNum);
      el.textContent = currentVal.toLocaleString() + (targetNum > 500 ? '+' : '');

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = targetNum.toLocaleString() + (targetNum > 500 ? '+' : '');
      }
    }
    requestAnimationFrame(update);
  }

  // Mobile Menu Drawer & Backdrop Controller (Requirement #3)
  function initMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const menu = document.querySelector('.nav-menu');
    if (!menu) return;

    // Create backdrop overlay if not present
    let backdrop = document.querySelector('.mobile-menu-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'mobile-menu-backdrop';
      document.body.appendChild(backdrop);
    }

    function openMenu() {
      menu.classList.add('open');
      backdrop.classList.add('active');
      document.body.classList.add('menu-open');
      if (toggle) toggle.innerHTML = '<i class="fas fa-times"></i>';
    }

    function closeMenu() {
      menu.classList.remove('open');
      backdrop.classList.remove('active');
      document.body.classList.remove('menu-open');
      if (toggle) toggle.innerHTML = '<i class="fas fa-bars"></i>';
    }

    if (toggle) {
      toggle.addEventListener('click', () => {
        if (menu.classList.contains('open')) {
          closeMenu();
        } else {
          openMenu();
        }
      });
    }

    backdrop.addEventListener('click', closeMenu);

    // Close menu when tapping any link inside
    menu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    // Wire up trigger from mobile bottom bar if present
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('.mobile-menu-trigger');
      if (trigger) {
        e.preventDefault();
        if (menu.classList.contains('open')) {
          closeMenu();
        } else {
          openMenu();
        }
      }
    });
  }

  // Mobile Bottom Action Bar Controller (Requirement #16)
  function initMobileBottomBar() {
    // Only inject if not already in document
    let bar = document.querySelector('.mobile-bottom-bar');
    if (!bar) {
      bar = document.createElement('nav');
      bar.className = 'mobile-bottom-bar';
      bar.setAttribute('aria-label', 'Mobile Quick Navigation');
      bar.innerHTML = `
        <a href="index.html" class="bottom-bar-item" data-page="home">
          <i class="fas fa-home"></i>
          <span>Home</span>
        </a>
        <a href="notes.html" class="bottom-bar-item" data-page="notes">
          <i class="fas fa-compass"></i>
          <span>Explore</span>
        </a>
        <a href="upload.html" class="bottom-bar-item" data-page="upload">
          <i class="fas fa-cloud-upload-alt"></i>
          <span>Upload</span>
        </a>
        <a href="profile.html" class="bottom-bar-item" data-page="profile">
          <i class="fas fa-bookmark"></i>
          <span>Saved</span>
        </a>
        <button type="button" class="bottom-bar-item mobile-menu-trigger" aria-label="Open Navigation Menu">
          <i class="fas fa-bars"></i>
          <span>Menu</span>
        </button>
      `;
      document.body.appendChild(bar);
    }

    // Highlight active bottom item
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const items = bar.querySelectorAll('.bottom-bar-item');
    items.forEach(item => {
      const href = item.getAttribute('href');
      if (href && (href === currentPath || (currentPath === '' && href === 'index.html'))) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  // Highlight Current Nav Item
  function highlightCurrentNav() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPath || (currentPath === '' && href === 'index.html')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // URL Query Parameters Helper
  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  // Format File Size
  function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  // Format date readable
  function formatDate(isoString) {
    if (!isoString) return 'Recent';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoString;
    }
  }

  // Device helper
  function isMobileDevice() {
    return window.innerWidth < 768 || ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  }

  // Expose to window
  window.StudyShareApp = {
    showToast,
    animateCounter,
    getQueryParam,
    formatBytes,
    formatDate,
    isMobileDevice
  };

  document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initMobileBottomBar();
    highlightCurrentNav();
  });
})();

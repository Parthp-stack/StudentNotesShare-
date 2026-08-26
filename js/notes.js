/**
 * STUDYSHARE — NOTES EXPLORER & CARD RENDERING ENGINE
 * GPJ 2023–2026 Notes Hub
 * 
 * Open Access Architecture:
 * - Dynamic rendering of note cards
 * - Instant client-side search across keywords, subject, title, and tags
 * - Multi-factor semester, subject, and category filtering
 * - One-click bookmarking in local browser storage (NO login required)
 * - Friendly empty states: "No notes uploaded yet. Be the first student to contribute."
 */

(function () {
  'use strict';

  let allNotes = [];
  let currentFilters = {
    search: '',
    semester: 'all',
    subject: 'all',
    category: 'all',
    sort: 'newest'
  };

  // Render a single note card HTML
  function renderNoteCard(note) {
    const isBookmarked = window.StudyShareDB ? window.StudyShareDB.isBookmarked(note.id) : false;
    const semClass = `badge-${note.semester ? note.semester.toLowerCase() : 'co3k'}`;

    return `
      <div class="note-card" data-note-id="${note.id}">
        <div class="note-card-top">
          <div class="note-badges-group">
            <span class="badge ${semClass}">
              <i class="fas fa-graduation-cap"></i> ${note.semester || 'GPJ'}
            </span>
            <span class="badge badge-neutral">
              ${note.subject || 'General'}
            </span>
            <span class="badge badge-category">
              ${note.category || 'Notes'}
            </span>
          </div>
          <button class="btn-bookmark-action ${isBookmarked ? 'bookmarked' : ''}" 
                  data-action="bookmark" 
                  data-note-id="${note.id}"
                  title="${isBookmarked ? 'Remove Bookmark' : 'Save Bookmark to Browser'}"
                  aria-label="Bookmark Note">
            <i class="${isBookmarked ? 'fas' : 'far'} fa-bookmark"></i>
          </button>
        </div>

        <h3 class="note-title">
          <a href="note-view.html?id=${note.id}">${note.title}</a>
        </h3>

        <p class="note-description">
          ${note.description || 'Study material contributed by GPJ students for exam revision and academic support.'}
        </p>

        <div class="note-uploader-bar">
          <div class="uploader-info">
            <span class="uploader-avatar">${note.uploaderAvatar || 'GP'}</span>
            <span>${note.uploaderName || 'Student'}</span>
          </div>
          <span><i class="far fa-calendar-alt"></i> ${window.StudyShareApp ? window.StudyShareApp.formatDate(note.uploadDate) : note.uploadDate}</span>
        </div>

        <div class="note-metrics-row">
          <div class="metric-badge" title="Downloads">
            <i class="fas fa-download" style="color: var(--brand-emerald);"></i>
            <span class="count-val">${note.downloadCount || 0}</span> downloads
          </div>
          <div class="metric-badge" title="Helpful votes">
            <i class="fas fa-heart" style="color: var(--brand-rose);"></i>
            <span class="count-val">${note.helpfulCount || 0}</span> helpful
          </div>
          <div class="metric-badge" title="File Type">
            <i class="far fa-file-pdf" style="color: var(--brand-primary);"></i>
            <span>${note.fileSize || note.fileType?.toUpperCase() || 'Document'}</span>
          </div>
        </div>

        <div class="note-actions-row">
          <a href="note-view.html?id=${note.id}" class="btn btn-secondary btn-sm">
            <i class="far fa-eye"></i> Preview
          </a>
          <button class="btn btn-primary btn-sm" data-action="download" data-note-id="${note.id}">
            <i class="fas fa-download"></i> Download
          </button>
        </div>
      </div>
    `;
  }

  // Filter & Sort Engine
  function applyFiltersAndRender() {
    const container = document.getElementById('notes-grid-container');
    const emptyState = document.getElementById('notes-empty-state');
    const resultCountEl = document.getElementById('notes-results-count');

    if (!container) return;

    let filtered = [...allNotes];

    // 1. Search Query
    if (currentFilters.search.trim()) {
      const q = currentFilters.search.toLowerCase().trim();
      filtered = filtered.filter(n => {
        const titleMatch = n.title && n.title.toLowerCase().includes(q);
        const descMatch = n.description && n.description.toLowerCase().includes(q);
        const subjMatch = n.subject && n.subject.toLowerCase().includes(q);
        const courseMatch = n.course && n.course.toLowerCase().includes(q);
        const yearMatch = n.academicYear && n.academicYear.toLowerCase().includes(q);
        const matMatch = (n.materialType || n.category) && (n.materialType || n.category).toLowerCase().includes(q);
        const uploaderMatch = n.uploaderName && n.uploaderName.toLowerCase().includes(q);
        const tagsMatch = n.tags && n.tags.some(t => t.toLowerCase().includes(q));
        return titleMatch || descMatch || subjMatch || courseMatch || yearMatch || matMatch || uploaderMatch || tagsMatch;
      });
    }

    // 2. Semester Filter
    if (currentFilters.semester !== 'all') {
      filtered = filtered.filter(n => (n.semester || '').toUpperCase() === currentFilters.semester.toUpperCase());
    }

    // 3. Subject Filter
    if (currentFilters.subject !== 'all') {
      filtered = filtered.filter(n => (n.subject || '').toLowerCase() === currentFilters.subject.toLowerCase());
    }

    // 4. Category Filter
    if (currentFilters.category !== 'all') {
      filtered = filtered.filter(n => (n.category || '').toLowerCase() === currentFilters.category.toLowerCase());
    }

    // 5. Sorting
    filtered.sort((a, b) => {
      if (currentFilters.sort === 'downloads') {
        return (b.downloadCount || 0) - (a.downloadCount || 0);
      } else if (currentFilters.sort === 'helpful') {
        return (b.helpfulCount || 0) - (a.helpfulCount || 0);
      } else {
        return new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0);
      }
    });

    // Update results count indicator
    if (resultCountEl) {
      resultCountEl.textContent = `${filtered.length} resource${filtered.length === 1 ? '' : 's'} available`;
    }

    // Render cards or empty state
    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 1.5rem; grid-column: 1 / -1; background: var(--bg-surface); border: 1px dashed var(--border-subtle); border-radius: var(--radius-lg);">
          <div style="width: 4.5rem; height: 4.5rem; border-radius: 50%; background: rgba(56, 189, 248, 0.1); color: var(--brand-primary); display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1.25rem;">
            <i class="fas fa-folder-open"></i>
          </div>
          <h3 style="font-size: 1.4rem; font-weight: 700; margin-bottom: 0.5rem;">No notes uploaded yet.</h3>
          <p style="color: var(--text-secondary); max-width: 420px; margin: 0 auto 1.5rem;">
            Be the first student to contribute.
          </p>
          <a href="upload.html" class="btn btn-primary btn-glow">
            <i class="fas fa-cloud-upload-alt"></i> Upload Notes Now
          </a>
        </div>
      `;
      if (emptyState) emptyState.style.display = 'none';
    } else {
      if (emptyState) emptyState.style.display = 'none';
      container.innerHTML = filtered.map(renderNoteCard).join('');
    }
  }

  // Handle Card Clicks (Open Bookmarks & Downloads)
  function setupCardEventDelegation() {
    const container = document.getElementById('notes-grid-container');
    if (!container) return;

    container.addEventListener('click', async (e) => {
      const bookmarkBtn = e.target.closest('[data-action="bookmark"]');
      if (bookmarkBtn) {
        e.preventDefault();
        e.stopPropagation();
        const noteId = bookmarkBtn.getAttribute('data-note-id');
        const isNowBookmarked = window.StudyShareDB.toggleBookmark(noteId);
        bookmarkBtn.classList.toggle('bookmarked', isNowBookmarked);
        bookmarkBtn.querySelector('i').className = isNowBookmarked ? 'fas fa-bookmark' : 'far fa-bookmark';
        window.StudyShareApp.showToast(
          isNowBookmarked ? 'Note saved to your browser bookmarks!' : 'Note removed from bookmarks.',
          'info'
        );
        return;
      }

      const downloadBtn = e.target.closest('[data-action="download"]');
      if (downloadBtn) {
        e.preventDefault();
        const noteId = downloadBtn.getAttribute('data-note-id');
        const note = allNotes.find(n => n.id === noteId);
        if (note) {
          await triggerDownload(note, downloadBtn);
        }
      }
    });
  }

  // Trigger File Download & Count Increment (Downloads ORIGINAL file from Supabase Storage)
  async function triggerDownload(note, triggerElement) {
    if (!note) return;

    const downloadURL = note.publicUrl || note.downloadURL || note.fileUrl;
    const fileName = note.fileName || `${(note.title || 'study-material').replace(/[^a-zA-Z0-9._-]/g, '_')}.${note.fileType || 'pdf'}`;

    // 1. Atomically increment global download count in database
    if (window.StudyShareDB && note.id) {
      try {
        await window.StudyShareDB.incrementDownload(note.id);
        note.downloadCount = (Number(note.downloadCount) || 0) + 1;
        if (triggerElement) {
          const card = triggerElement.closest('.note-card');
          if (card) {
            const downloadMetric = card.querySelector('.metric-badge .count-val');
            if (downloadMetric) downloadMetric.textContent = note.downloadCount;
          }
        }
      } catch (err) {
        console.warn('[StudyShare] incrementDownload error:', err);
      }
    }

    if (!downloadURL) {
      window.StudyShareApp.showToast('Original file is unavailable for download.', 'error');
      return;
    }

    console.log('[StudyShare] Download started for original file:', fileName);

    // 2. Fetch original blob to force download with preserved filename
    try {
      let originalHTML = '';
      if (triggerElement) {
        triggerElement.disabled = true;
        originalHTML = triggerElement.innerHTML;
        triggerElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
      }

      const response = await fetch(downloadURL, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(link);
      }, 1500);

      window.StudyShareApp.showToast(`Downloaded original file: ${fileName}`, 'success');

      if (triggerElement) {
        triggerElement.disabled = false;
        triggerElement.innerHTML = originalHTML;
      }
    } catch (fetchErr) {
      console.warn('[StudyShare] Direct blob fetch failed (likely CORS), using direct anchor fallback:', fetchErr);
      // Fallback: direct window download retaining original cloud URL
      const link = document.createElement('a');
      link.href = downloadURL;
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.StudyShareApp.showToast(`Downloading original file: ${fileName}`, 'info');

      if (triggerElement) {
        triggerElement.disabled = false;
        triggerElement.innerHTML = '<i class="fas fa-download"></i> Download';
      }
    }
  }

  // Populate Subject Dropdown based on chosen Semester
  function populateSubjectDropdown(selectedSemester) {
    const subjectSelect = document.getElementById('filter-subject');
    if (!subjectSelect) return;

    const cfg = window.STUDYSHARE_CONFIG || {};
    let subjects = [];

    if (!selectedSemester || selectedSemester === 'all') {
      if (cfg.semesters) {
        cfg.semesters.forEach(s => {
          subjects.push(...s.subjects);
        });
      }
    } else {
      const sem = cfg.semesters ? cfg.semesters.find(s => s.code.toUpperCase() === selectedSemester.toUpperCase()) : null;
      if (sem) subjects = sem.subjects;
    }

    subjectSelect.innerHTML = '<option value="all">All Subjects</option>' +
      subjects.map(sub => `<option value="${sub.code}">${sub.code} - ${sub.name}</option>`).join('');
  }

  // Initialize Explorer Page Controls (Real-time Cloud Sync)
  async function initExplorerPage() {
    if (window.StudyShareDB) {
      window.StudyShareDB.subscribeToNotes((notes) => {
        allNotes = notes;
        applyFiltersAndRender();
      });
    }

    const urlSem = window.StudyShareApp.getQueryParam('semester');
    const urlSubj = window.StudyShareApp.getQueryParam('subject');
    const urlCat = window.StudyShareApp.getQueryParam('category');
    const urlSearch = window.StudyShareApp.getQueryParam('q');

    if (urlSem) currentFilters.semester = urlSem.toUpperCase();
    if (urlSubj) currentFilters.subject = urlSubj;
    if (urlCat) currentFilters.category = urlCat;
    if (urlSearch) currentFilters.search = urlSearch;

    const searchInput = document.getElementById('search-notes-input');
    const clearBtn = document.getElementById('clear-search-btn');
    if (searchInput) {
      if (currentFilters.search) {
        searchInput.value = currentFilters.search;
        if (clearBtn) clearBtn.style.display = 'block';
      }
      searchInput.addEventListener('input', (e) => {
        currentFilters.search = e.target.value;
        if (clearBtn) clearBtn.style.display = e.target.value ? 'block' : 'none';
        applyFiltersAndRender();
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        currentFilters.search = '';
        clearBtn.style.display = 'none';
        applyFiltersAndRender();
      });
    }

    const semButtons = document.querySelectorAll('.sem-tab-btn');
    semButtons.forEach(btn => {
      const semVal = btn.getAttribute('data-semester');
      if (semVal.toUpperCase() === currentFilters.semester.toUpperCase()) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
      btn.addEventListener('click', () => {
        semButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilters.semester = semVal;
        populateSubjectDropdown(semVal);
        currentFilters.subject = 'all';
        applyFiltersAndRender();
      });
    });

    populateSubjectDropdown(currentFilters.semester);

    const subjectSelect = document.getElementById('filter-subject');
    if (subjectSelect) {
      if (currentFilters.subject !== 'all') subjectSelect.value = currentFilters.subject;
      subjectSelect.addEventListener('change', (e) => {
        currentFilters.subject = e.target.value;
        applyFiltersAndRender();
      });
    }

    const categorySelect = document.getElementById('filter-category');
    if (categorySelect) {
      if (currentFilters.category !== 'all') categorySelect.value = currentFilters.category;
      categorySelect.addEventListener('change', (e) => {
        currentFilters.category = e.target.value;
        applyFiltersAndRender();
      });
    }

    const sortSelect = document.getElementById('filter-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        currentFilters.sort = e.target.value;
        applyFiltersAndRender();
      });
    }

    setupCardEventDelegation();
    applyFiltersAndRender();
  }

  // Expose
  window.StudyShareNotes = {
    init: initExplorerPage,
    renderCard: renderNoteCard,
    triggerDownload: triggerDownload,
    getNotesList: () => allNotes
  };
})();

/**
 * STUDYSHARE — NOTE DETAIL & IN-BROWSER PREVIEW CONTROLLER
 * 
 * Open Access Architecture:
 * - Direct access without login
 * - In-browser document preview
 * - Helpful votes and bookmarking saved locally
 * - Transparent activity tracking
 * - Open reporting of educational materials
 */

(function () {
  'use strict';

  let currentNote = null;

  // Generate clean in-browser document view
  function generateSimulatedDocumentHTML(note) {
    // If uploaded file is an image, preview image directly
    const fileUrl = note.downloadURL || note.fileUrl;
    const fileType = (note.fileType || '').toLowerCase();

    // 1. Original Image Preview
    if (fileUrl && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileType)) {
      return `
        <div style="text-align: center; padding: 1.5rem; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          <img src="${fileUrl}" alt="${note.title}" style="max-width: 100%; max-height: 650px; border-radius: var(--radius-sm); box-shadow: 0 4px 16px rgba(0,0,0,0.2);">
        </div>
      `;
    }

    // 2. Original PDF Embedded Preview
    if (fileUrl && fileType === 'pdf') {
      return `
        <div style="width: 100%; border-radius: var(--radius-md); overflow: hidden; background: #0f172a; border: 1px solid rgba(56, 189, 248, 0.25); box-shadow: 0 4px 20px rgba(0,0,0,0.35);">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1.25rem; background: rgba(15, 23, 42, 0.95); border-bottom: 1px solid rgba(255,255,255,0.1); flex-wrap: wrap; gap: 0.5rem;">
            <div style="font-size: 0.88rem; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fas fa-file-pdf"></i>
              <span>${note.fileName || 'Original Document'}</span>
            </div>
            <a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 0.35rem 0.85rem;">
              <i class="fas fa-external-link-alt"></i> Open Fullscreen
            </a>
          </div>
          <iframe src="${fileUrl}#toolbar=1" style="width: 100%; height: 600px; border: none;" title="${note.title}"></iframe>
        </div>
      `;
    }

    // 3. Document Frame for DOCX, PPTX, ZIP and other educational files
    return `
      <div class="simulated-doc-preview">
        <div class="doc-watermark">StudyShare • GPJ 2023-2026 Hub • Educational Resource</div>
        <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 1.5rem; margin-bottom: 2rem;">
          <h1 style="color: #0f172a; font-size: 1.85rem; font-weight: 800; line-height: 1.3; margin-bottom: 0.5rem;">
            ${note.title}
          </h1>
          <div style="display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.85rem; color: #64748b;">
            <span><strong>Course:</strong> Government Polytechnic Jintur (GPJ)</span>
            <span><strong>Semester:</strong> ${note.semester}</span>
            <span><strong>Subject:</strong> ${note.subject}</span>
            <span><strong>Category:</strong> ${note.category}</span>
          </div>
        </div>

        <div style="background: #f8fafc; border-left: 4px solid #38bdf8; padding: 1.25rem; border-radius: 4px; margin-bottom: 2rem;">
          <h3 style="color: #0369a1; font-size: 1rem; font-weight: 700; margin-bottom: 0.35rem;">Resource Overview</h3>
          <p style="color: #334155; font-size: 0.95rem; line-height: 1.6; margin: 0;">
            ${note.description}
          </p>
        </div>

        <div style="margin-bottom: 2rem;">
          <h2 style="color: #0f172a; font-size: 1.3rem; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; margin-bottom: 1rem;">
            Document Details & Key Points
          </h2>
          <ul style="padding-left: 1.5rem; color: #334155; line-height: 1.8; font-size: 0.95rem;">
            <li>Original file: <strong>${note.fileName || 'Original Document'}</strong> (${note.fileSize || 'Standard file'}).</li>
            <li>Contributed by student <strong>${note.uploaderName || 'Student'}</strong> for GPJ 2023–2026.</li>
            <li>Subject curriculum: <strong>${note.subject}</strong> (${note.semester}).</li>
            <li>Category: <strong>${note.category}</strong>.</li>
            <li>Tags: ${(note.tags || []).map(t => '#' + t).join(' ')}</li>
          </ul>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 1.25rem; margin-top: 2rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; color: #166534; font-weight: 700; margin-bottom: 0.25rem;">
            <i class="fas fa-hand-holding-heart"></i>
            Peer Learning Spirit
          </div>
          <p style="color: #15803d; font-size: 0.875rem; margin: 0;">
            “Share Knowledge. Help Someone Learn.” Have useful notes? Upload them and help someone succeed!
          </p>
        </div>
      </div>
    `;
  }

  // Setup Report Modal (NO LOGIN REQUIRED)
  function setupReportModal(note) {
    const reportBtn = document.getElementById('report-note-btn');
    const modalBackdrop = document.getElementById('report-modal-backdrop');
    const closeBtn = document.getElementById('close-report-modal-btn');
    const cancelBtn = document.getElementById('cancel-report-btn');
    const form = document.getElementById('report-note-form');
    const reporterNameInput = document.getElementById('report-reporter-name');

    if (!reportBtn || !modalBackdrop) return;

    reportBtn.addEventListener('click', () => {
      if (reporterNameInput) {
        reporterNameInput.value = localStorage.getItem('studyshare_display_name') || '';
      }
      modalBackdrop.style.display = 'flex';
    });

    const closeModal = () => {
      modalBackdrop.style.display = 'none';
      if (form) form.reset();
    };

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const reasonRadio = form.querySelector('input[name="report-reason"]:checked');
      const additionalInfo = form.querySelector('#report-details')?.value || '';
      const reporterName = reporterNameInput?.value.trim() || 'Anonymous Student';

      if (!reasonRadio) {
        window.StudyShareApp.showToast('Please select a reason for reporting.', 'warning');
        return;
      }

      try {
        await window.StudyShareDB.submitReport({
          noteId: note.id,
          noteTitle: note.title,
          reason: reasonRadio.value,
          additionalInfo: additionalInfo.trim(),
          reporterName: reporterName,
          uploaderName: note.uploaderName
        });

        closeModal();
        window.StudyShareApp.showToast('Report submitted. The administrator console has recorded this notification.', 'info');
      } catch (err) {
        window.StudyShareApp.showToast(err.message, 'error');
      }
    });
  }

  // Initialize Page
  async function initNoteView() {
    const noteId = window.StudyShareApp.getQueryParam('id');
    if (!noteId) {
      window.location.href = 'notes.html';
      return;
    }

    currentNote = await window.StudyShareDB.getNoteById(noteId);
    if (!currentNote) {
      window.StudyShareApp.showToast('Note resource not found.', 'error');
      setTimeout(() => { window.location.href = 'notes.html'; }, 1500);
      return;
    }

    // Record view in transparent activity log
    await window.StudyShareDB.recordActivity(`Someone viewed ${currentNote.subject} Notes: "${currentNote.title}"`, 'view');

    // Populate Titles and Badges
    document.title = `${currentNote.title} — StudyShare`;
    const titleEl = document.getElementById('note-detail-title');
    if (titleEl) titleEl.textContent = currentNote.title;

    const descEl = document.getElementById('note-detail-description');
    if (descEl) descEl.textContent = currentNote.description;

    const semBadgeEl = document.getElementById('note-sem-badge');
    if (semBadgeEl) {
      semBadgeEl.className = `badge badge-${currentNote.semester ? currentNote.semester.toLowerCase() : 'co3k'}`;
      semBadgeEl.innerHTML = `<i class="fas fa-graduation-cap"></i> ${currentNote.semester}`;
    }

    const subjBadgeEl = document.getElementById('note-subject-badge');
    if (subjBadgeEl) subjBadgeEl.textContent = currentNote.subject;

    const catBadgeEl = document.getElementById('note-category-badge');
    if (catBadgeEl) catBadgeEl.textContent = currentNote.category;

    // Populate Sidebar Meta
    const uploaderEl = document.getElementById('note-uploader-name');
    if (uploaderEl) uploaderEl.textContent = currentNote.uploaderName || 'Student';

    const uploaderAvatarEl = document.getElementById('note-uploader-avatar');
    if (uploaderAvatarEl) uploaderAvatarEl.textContent = currentNote.uploaderAvatar || 'GP';

    const dateEl = document.getElementById('note-upload-date');
    if (dateEl) dateEl.textContent = window.StudyShareApp.formatDate(currentNote.uploadDate);

    const sizeEl = document.getElementById('note-file-size');
    if (sizeEl) sizeEl.textContent = currentNote.fileSize || currentNote.fileType?.toUpperCase() || 'Educational Document';

    const dlCountEl = document.getElementById('note-download-count');
    if (dlCountEl) dlCountEl.textContent = currentNote.downloadCount || 0;

    const helpfulCountEl = document.getElementById('note-helpful-count');
    if (helpfulCountEl) helpfulCountEl.textContent = currentNote.helpfulCount || 0;

    // Tags
    const tagsContainer = document.getElementById('note-tags-container');
    if (tagsContainer && currentNote.tags) {
      tagsContainer.innerHTML = currentNote.tags.map(t => 
        `<span class="badge badge-neutral" style="font-size: 0.7rem;">#${t}</span>`
      ).join('');
    }

    // In-browser preview
    const previewContainer = document.getElementById('note-preview-wrapper');
    if (previewContainer) {
      previewContainer.innerHTML = generateSimulatedDocumentHTML(currentNote);
    }

    // Download Button & Open Original Link
    const downloadBtn = document.getElementById('note-download-btn');
    const openOriginalBtn = document.getElementById('note-open-original-btn');
    const rawFileUrl = currentNote.downloadURL || currentNote.fileUrl;

    if (openOriginalBtn && rawFileUrl) {
      openOriginalBtn.href = rawFileUrl;
      openOriginalBtn.style.display = 'inline-flex';
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', async () => {
        await window.StudyShareNotes.triggerDownload(currentNote, downloadBtn);
        if (dlCountEl) dlCountEl.textContent = currentNote.downloadCount;
      });
    }

    // Helpful Button (Open Access — NO login required)
    const helpfulBtn = document.getElementById('toggle-helpful-btn');
    if (helpfulBtn) {
      const hasVoted = window.StudyShareDB.hasUserVotedHelpful(currentNote.id);
      if (hasVoted) helpfulBtn.classList.add('active');

      helpfulBtn.addEventListener('click', async () => {
        const res = await window.StudyShareDB.toggleHelpful(currentNote.id);
        currentNote.helpfulCount = Math.max(0, (currentNote.helpfulCount || 0) + res.delta);
        if (helpfulCountEl) helpfulCountEl.textContent = currentNote.helpfulCount;
        helpfulBtn.classList.toggle('active', res.hasVoted);
        window.StudyShareApp.showToast(
          res.hasVoted ? 'Marked as helpful! Thank you for the feedback.' : 'Helpful vote removed.',
          'info'
        );
      });
    }

    // Bookmark Button (Open Access — NO login required)
    const bookmarkBtn = document.getElementById('note-bookmark-btn');
    if (bookmarkBtn) {
      const isSaved = window.StudyShareDB.isBookmarked(currentNote.id);
      if (isSaved) {
        bookmarkBtn.classList.add('btn-primary');
        bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i> Saved in Bookmarks';
      }

      bookmarkBtn.addEventListener('click', () => {
        const saved = window.StudyShareDB.toggleBookmark(currentNote.id);
        if (saved) {
          bookmarkBtn.className = 'btn btn-primary';
          bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i> Saved in Bookmarks';
          window.StudyShareApp.showToast('Note added to your browser bookmarks!', 'success');
        } else {
          bookmarkBtn.className = 'btn btn-secondary btn-sm';
          bookmarkBtn.style.flex = '1';
          bookmarkBtn.innerHTML = '<i class="far fa-bookmark"></i> Bookmark';
          window.StudyShareApp.showToast('Removed from your bookmarks.', 'info');
        }
      });
    }

    // Setup Report Modal
    setupReportModal(currentNote);

    // 3-Word Student Tips & Reactions Engine
    if (window.StudyShareTips) {
      window.StudyShareTips.setupTipsUI(currentNote, () => {
        // Callback when tips change
      });
    }
  }

  window.StudyShareNoteView = {
    init: initNoteView
  };
})();

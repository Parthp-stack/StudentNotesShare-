/**
 * STUDYSHARE — SUPABASE CLOUD UPLOAD CONTROLLER
 * GPJ 2023–2026 Notes Hub
 * "Share Knowledge. Help Someone Learn."
 * 
 * Free Supabase Cloud Architecture:
 * - NO login or account required
 * - Requires only contributor name
 * - Preserves original file, original filename, and MIME type (.pdf, .docx, .pptx, images, .zip)
 * - Maximum 50MB file size limit enforced (Supabase Free tier)
 * - Streams original file directly to Supabase Storage 'notes' bucket
 * - Writes note metadata row into Supabase PostgreSQL 'notes' table
 * - If database insert fails, cleans up orphaned storage file
 * - Shows exact success message: "Upload successful — your material is now available to other students."
 */

(function () {
  'use strict';

  let selectedFile = null;

  function initUploadPage() {
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('note-file-input');
    const form = document.getElementById('upload-note-form');
    const nameInput = document.getElementById('upload-uploader-name');
    const semSelect = document.getElementById('upload-semester');
    const subjSelect = document.getElementById('upload-subject');
    const catSelect = document.getElementById('upload-category');
    const progressWrapper = document.getElementById('upload-progress-wrapper');
    const progressBar = document.getElementById('upload-progress-fill');
    const progressText = document.getElementById('upload-progress-percent');
    const fileInfoBox = document.getElementById('selected-file-info');

    // Check Supabase status
    checkSupabaseStatus();

    // Pre-fill contributor display name from localStorage if available
    if (nameInput) {
      const savedName = localStorage.getItem('studyshare_display_name') || '';
      if (savedName) nameInput.value = savedName;
    }

    // Populate Categories
    const cfg = window.STUDYSHARE_CONFIG || {};
    if (catSelect && cfg.categories) {
      catSelect.innerHTML = cfg.categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    // Populate Subjects based on selected Semester
    function updateSubjects() {
      if (!subjSelect) return;
      const semVal = semSelect ? semSelect.value : 'CO3K';
      const semObj = cfg.semesters ? cfg.semesters.find(s => s.code === semVal) : null;
      if (semObj) {
        subjSelect.innerHTML = semObj.subjects.map(sub => 
          `<option value="${sub.code}">${sub.code} — ${sub.name}</option>`
        ).join('') + '<option value="Other">Other / General</option>';
      } else {
        subjSelect.innerHTML = '<option value="General Resources">General Resources</option>';
      }
    }

    if (semSelect) {
      semSelect.addEventListener('change', updateSubjects);
      updateSubjects();
    }

    // Drag & Drop Handlers
    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('dragover');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
          handleFileSelected(files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleFileSelected(e.target.files[0]);
        }
      });
    }

    // File selection validation
    function handleFileSelected(file) {
      const allowedExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'webp', 'zip', 'txt'];
      const ext = file.name.split('.').pop().toLowerCase();

      if (!allowedExtensions.includes(ext)) {
        window.StudyShareApp.showToast(`Unsupported file type (.${ext}). Supported formats: PDF, DOCX, PPTX, Images, and ZIP.`, 'error');
        return;
      }

      // 50MB Supabase Free Tier Limit (Requirement #23)
      if (file.size > 50 * 1024 * 1024) {
        window.StudyShareApp.showToast('File is too large. Maximum supported size is 50 MB.', 'error');
        return;
      }

      selectedFile = file;

      if (fileInfoBox) {
        fileInfoBox.style.display = 'flex';
        fileInfoBox.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.75rem; width: 100%;">
            <i class="far fa-file-alt" style="font-size: 1.5rem; color: var(--brand-primary);"></i>
            <div style="flex: 1; overflow: hidden;">
              <div style="font-weight: 700; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${file.name}</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary);">${window.StudyShareApp.formatBytes(file.size)} • ${ext.toUpperCase()} (Original File)</div>
            </div>
            <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: var(--brand-emerald);"><i class="fas fa-check"></i> Ready</span>
          </div>
        `;
      }

      // Auto-populate Title if currently blank
      const titleInput = document.getElementById('upload-title');
      if (titleInput && !titleInput.value.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        titleInput.value = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      }
    }

    // Manage Supabase Connection State & Setup Modal (Requirement #21)
    function checkSupabaseStatus() {
      const modal = document.getElementById('supabase-config-modal');
      const closeBtn = document.getElementById('close-supabase-modal-btn');
      const cancelBtn = document.getElementById('cancel-supabase-modal-btn');
      const saveBtn = document.getElementById('btn-save-supabase-config');
      const clearBtn = document.getElementById('btn-clear-supabase-config');
      const urlInput = document.getElementById('supabase-url-input');
      const keyInput = document.getElementById('supabase-key-input');
      const formContainer = document.querySelector('.glass-panel');

      function openModal() {
        if (modal) {
          modal.style.display = 'flex';
          const currentConfig = window.StudyShareDB.getActiveConfig();
          if (currentConfig.url && urlInput) urlInput.value = currentConfig.url;
          if (currentConfig.anonKey && keyInput) keyInput.value = currentConfig.anonKey;
        }
      }

      function closeModal() {
        if (modal) modal.style.display = 'none';
      }

      if (closeBtn) closeBtn.addEventListener('click', closeModal);
      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) closeModal();
        });
      }

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const url = urlInput?.value?.trim();
          const anonKey = keyInput?.value?.trim();

          if (!url || !anonKey) {
            window.StudyShareApp.showToast('Please enter both Supabase URL and Publishable Key.', 'warning');
            return;
          }

          if (!url.startsWith('https://')) {
            window.StudyShareApp.showToast('Supabase URL must start with https://', 'error');
            return;
          }

          window.StudyShareDB.saveConfigOverride({ url, anonKey });
        });
      }

      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          window.StudyShareDB.clearConfigOverride();
        });
      }

      if (formContainer && !document.getElementById('supabase-status-banner')) {
        const banner = document.createElement('div');
        banner.id = 'supabase-status-banner';

        if (window.StudyShareDB.isConfigured()) {
          // Connected state (Requirement #21)
          banner.style.cssText = 'background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 12px; padding: 0.85rem 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;';
          banner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.65rem; color: #34d399; font-size: 0.88rem; font-weight: 700;">
              <i class="fas fa-check-circle"></i> Supabase Cloud Connected
            </div>
            <button type="button" id="btn-edit-supabase-config" class="btn btn-outline btn-sm" style="font-size: 0.75rem; padding: 0.25rem 0.65rem;">
              <i class="fas fa-cog"></i> Settings
            </button>
          `;
          formContainer.parentNode.insertBefore(banner, formContainer);
          document.getElementById('btn-edit-supabase-config')?.addEventListener('click', openModal);
        } else {
          // Unconnected guidance
          banner.style.cssText = 'background: rgba(234, 179, 8, 0.12); border: 1px solid rgba(234, 179, 8, 0.35); border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;';
          banner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <i class="fas fa-bolt" style="color: #eab308; font-size: 1.35rem;"></i>
              <div>
                <strong style="color: #facc15; font-size: 0.9rem;">Supabase Connection Needed</strong>
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.15rem;">
                  Add your Supabase credentials to <code>js/config.js</code> or configure below to enable global multi-device sync.
                </div>
              </div>
            </div>
            <button type="button" id="btn-open-supabase-modal" class="btn btn-secondary btn-sm" style="font-size: 0.8rem;">
              <i class="fas fa-plug"></i> Connect Supabase
            </button>
          `;
          formContainer.parentNode.insertBefore(banner, formContainer);
          document.getElementById('btn-open-supabase-modal')?.addEventListener('click', openModal);
        }
      }
    }

    // Form Submission
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const uploaderName = document.getElementById('upload-uploader-name')?.value.trim();
        const title = document.getElementById('upload-title')?.value.trim();
        const description = document.getElementById('upload-description')?.value.trim();
        const semester = document.getElementById('upload-semester')?.value || 'CO3K';
        const subject = document.getElementById('upload-subject')?.value || 'General';
        const category = document.getElementById('upload-category')?.value || 'Notes';
        const tagsRaw = document.getElementById('upload-tags')?.value.trim();

        if (!uploaderName) {
          window.StudyShareApp.showToast('Please enter your name as the contributor.', 'warning');
          document.getElementById('upload-uploader-name')?.focus();
          return;
        }

        if (!selectedFile) {
          window.StudyShareApp.showToast('Please select or drag a file to upload.', 'warning');
          return;
        }

        if (!title || !description) {
          window.StudyShareApp.showToast('Please provide both title and description.', 'warning');
          return;
        }

        // Check if Supabase is configured
        if (!window.StudyShareDB.isConfigured()) {
          window.StudyShareApp.showToast('Unable to connect to StudyShare database. Please configure Supabase credentials.', 'error');
          return;
        }

        // Remember name in browser
        localStorage.setItem('studyshare_display_name', uploaderName);

        const tags = tagsRaw
          ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
          : [subject, semester, category];

        const submitBtn = document.getElementById('submit-upload-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading Original File to Supabase Storage...';
        }

        if (progressWrapper) progressWrapper.style.display = 'block';

        try {
          console.log('[StudyShare] Upload started for:', selectedFile.name);

          // 1. Upload original file to Supabase Storage 'notes' bucket
          const { storagePath, publicUrl } = await window.StudyShareDB.uploadFileToStorage(
            selectedFile,
            {
              uploaderName,
              academicYear: '2023–2026',
              semester,
              subject,
              materialType: category
            },
            (percent) => {
              const rounded = Math.floor(percent);
              if (progressBar) progressBar.style.width = rounded + '%';
              if (progressText) {
                progressText.textContent = `${rounded}% (${rounded < 100 ? 'Uploading to Supabase Storage...' : 'Saving note to database...'})`;
              }
            }
          );

          // 2. Insert row into Supabase PostgreSQL 'notes' table
          const newNote = {
            title,
            description,
            academicYear: '2023–2026',
            semester,
            course: 'Government Polytechnic Jintur (GPJ)',
            subject,
            materialType: category,
            category,
            tags,
            fileName: selectedFile.name,
            fileType: selectedFile.name.split('.').pop().toLowerCase(),
            fileSize: window.StudyShareApp.formatBytes(selectedFile.size),
            storagePath,
            publicUrl,
            downloadURL: publicUrl,
            uploaderName
          };

          const noteId = await window.StudyShareDB.createNote(newNote);

          // 3. Exact success message (Requirement #10)
          window.StudyShareApp.showToast('Upload successful — your material is now available to other students.', 'success');

          setTimeout(() => {
            window.location.href = `note-view.html?id=${noteId}`;
          }, 1200);
        } catch (err) {
          console.error('[StudyShare] Upload process error:', err);
          window.StudyShareApp.showToast(err.message || 'File upload failed.', 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Publish Educational Resource';
          }
          if (progressWrapper) progressWrapper.style.display = 'none';
        }
      });
    }
  }

  window.StudyShareUpload = {
    init: initUploadPage
  };

  document.addEventListener('DOMContentLoaded', initUploadPage);
})();

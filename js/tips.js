/**
 * STUDYSHARE — STUDENT TIPS & PROTOTYPE ANTI-TAMPERING SYSTEM
 * 
 * Open Access Architecture:
 * - Enforces strict 3-word rule for peer study tips.
 * - Requires only display name (no passwords, emails, or personal data).
 * - Implements prototype edit tokens stored locally in the student's browser.
 * - Blocks unauthorized edit attempts with clear warning:
 *   "⚠ Unauthorized modification attempt."
 * - Logs safe technical security events (safe audit only — NO GPS, NO surveillance).
 */

(function () {
  'use strict';

  // Count words accurately
  function countWords(str) {
    if (!str) return 0;
    const tokens = str.trim().split(/\s+/).filter(w => w.length > 0);
    return tokens.length;
  }

  // Validate exact 3 words
  function isExactlyThreeWords(str) {
    return countWords(str) === 3;
  }

  // Generate random temporary edit token
  function generateEditToken() {
    return 'tok_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
  }

  // Render Security Alert Modal for Unauthorized Attempt
  function showSecurityAlertModal(eventDetails) {
    let modalEl = document.getElementById('security-alert-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'security-alert-modal';
      modalEl.className = 'security-modal-backdrop';
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="security-modal" role="alertdialog" aria-modal="true" aria-labelledby="sec-modal-title">
        <div class="security-alert-icon" style="background: rgba(244, 63, 94, 0.15); color: var(--brand-rose); border: 2px solid rgba(244, 63, 94, 0.3);">
          <i class="fas fa-shield-alt"></i>
        </div>
        <h3 id="sec-modal-title" class="security-modal-title" style="color: var(--brand-rose);">
          ⚠ Unauthorized modification attempt.
        </h3>
        <p class="security-modal-message">
          <strong>Operation Blocked:</strong> You do not possess the valid temporary edit token required to modify or delete this student's tip. A prototype security event has been logged for monitoring.
        </p>
        <div class="security-audit-details" style="background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-md); font-family: var(--font-mono); font-size: 0.775rem; line-height: 1.6; margin-bottom: 1.25rem; border: 1px solid var(--border-subtle);">
          <div><strong>ATTEMPT TYPE:</strong> ${eventDetails.attemptedAction}</div>
          <div><strong>TARGET TIP:</strong> ${eventDetails.targetTipId}</div>
          <div><strong>TARGET NOTE:</strong> ${eventDetails.targetNoteId}</div>
          <div><strong>ANONYMOUS SESSION:</strong> ${eventDetails.anonymousSessionId || 'anon-session'}</div>
          <div><strong>TIMESTAMP:</strong> ${eventDetails.timestamp}</div>
          <div><strong>STATUS:</strong> Blocked & Audited (Safe Technical Parameters)</div>
        </div>
        <div style="font-size: 0.775rem; color: var(--text-muted); margin-bottom: 1.25rem; line-height: 1.4;">
          <em>Admin Monitoring: Administrator security logging using safe application parameters. No GPS, device tracking, or personal surveillance is used.</em>
        </div>
        <button id="close-security-modal-btn" class="btn btn-primary" style="width: 100%;">
          Acknowledge & Close
        </button>
      </div>
    `;

    modalEl.classList.add('active');

    document.getElementById('close-security-modal-btn')?.addEventListener('click', () => {
      modalEl.classList.remove('active');
    });
  }

  // Record tampering event in database and show alert
  async function triggerAntiTamperingAlert(noteId, tipId, attemptedAction = 'UNAUTHORIZED_TIP_MUTATION') {
    const anonSession = window.StudyShareDB ? window.StudyShareDB.getAnonymousSessionId() : 'anon-session';

    const eventPayload = {
      attemptedAction: attemptedAction,
      targetTipId: tipId,
      targetNoteId: noteId,
      timestamp: new Date().toISOString(),
      anonymousSessionId: anonSession,
      details: 'Blocked attempt to modify student tip without valid browser edit token.'
    };

    // Log to DB
    if (window.StudyShareDB) {
      await window.StudyShareDB.recordSecurityEvent(eventPayload);
    }

    // Show warning modal
    showSecurityAlertModal(eventPayload);
  }

  // Render Tips List for a Note
  function renderTipsList(note, containerEl) {
    if (!containerEl) return;
    const tips = note.tips || [];

    if (tips.length === 0) {
      containerEl.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
          <i class="far fa-comment-dots" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
          No student tips yet. Be the first to leave an encouraging 3-word revision tip!
        </div>
      `;
      return;
    }

    containerEl.innerHTML = tips.map(tip => {
      const hasEditToken = window.StudyShareDB ? window.StudyShareDB.hasEditTokenForTip(tip) : false;

      return `
        <div class="tip-card" data-tip-id="${tip.id}">
          <div class="tip-content-col">
            <div class="tip-text-quote">“${tip.content}”</div>
            <div class="tip-author-meta">
              <span><i class="fas fa-user-circle"></i> ${tip.authorName || 'Student'}</span>
              <span>•</span>
              <span><i class="far fa-clock"></i> ${window.StudyShareApp ? window.StudyShareApp.formatDate(tip.createdAt) : tip.createdAt}</span>
              ${hasEditToken ? '<span class="badge" style="background: rgba(56, 189, 248, 0.15); color: var(--brand-primary); font-size: 0.65rem;">Your Tip (Edit Token Active)</span>' : ''}
            </div>
          </div>
          <div class="tip-actions-col">
            ${hasEditToken ? `
              <button class="btn-tip-action" data-action="edit-tip" data-tip-id="${tip.id}" title="Edit your tip with your local edit token">
                <i class="fas fa-edit"></i> Edit
              </button>
              <button class="btn-tip-action" data-action="delete-tip" data-tip-id="${tip.id}" style="color: var(--brand-rose);" title="Delete your tip">
                <i class="fas fa-trash-alt"></i>
              </button>
            ` : `
              <button class="btn-tip-tamper-test" data-action="simulate-tamper" data-tip-id="${tip.id}" title="Security Feature Demo: Test unauthorized edit attempt without edit token">
                <i class="fas fa-shield-alt"></i> Test Unauthorized Edit
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  // Setup Event Handlers for Tips on Note View Page
  function setupTipsUI(note, onTipChangedCallback) {
    const authorInput = document.getElementById('tip-author-name');
    const tipInput = document.getElementById('new-tip-input');
    const wordCountBadge = document.getElementById('tip-word-counter');
    const submitBtn = document.getElementById('submit-tip-btn');
    const tipsContainer = document.getElementById('note-tips-list');

    // Pre-fill author name from localStorage if available
    if (authorInput) {
      const savedName = localStorage.getItem('studyshare_display_name') || '';
      if (savedName) authorInput.value = savedName;
    }

    if (tipInput && wordCountBadge) {
      tipInput.addEventListener('input', () => {
        const words = countWords(tipInput.value);
        wordCountBadge.textContent = `${words}/3 words`;

        if (words === 3) {
          wordCountBadge.className = 'word-count-badge valid';
          wordCountBadge.textContent = '3/3 words (Valid ✓)';
          if (submitBtn) submitBtn.removeAttribute('disabled');
        } else {
          wordCountBadge.className = 'word-count-badge invalid';
          if (words < 3) {
            wordCountBadge.textContent = `${words}/3 words (Need ${3 - words} more)`;
          } else {
            wordCountBadge.textContent = `${words}/3 words (${words - 3} too many)`;
          }
          if (submitBtn) submitBtn.setAttribute('disabled', 'true');
        }
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const authorName = (authorInput?.value || '').trim();
        if (!authorName) {
          window.StudyShareApp.showToast('Please enter your name as the contributor.', 'warning');
          if (authorInput) authorInput.focus();
          return;
        }

        const text = (tipInput?.value || '').trim();
        if (!isExactlyThreeWords(text)) {
          window.StudyShareApp.showToast('Tip must be exactly 3 words (e.g. "Very useful notes").', 'error');
          return;
        }

        // Save display name for subsequent interactions
        localStorage.setItem('studyshare_display_name', authorName);

        // Generate temporary edit token stored in student's browser
        const editToken = generateEditToken();

        const newTip = {
          id: 'tip-' + Date.now(),
          authorName: authorName,
          content: text,
          createdAt: new Date().toISOString(),
          editToken: editToken
        };

        submitBtn.setAttribute('disabled', 'true');
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';

        try {
          await window.StudyShareDB.addTip(note.id, newTip);
          if (!note.tips) note.tips = [];
          note.tips.unshift(newTip);

          if (tipInput) tipInput.value = '';
          if (wordCountBadge) {
            wordCountBadge.className = 'word-count-badge';
            wordCountBadge.textContent = '0/3 words';
          }
          renderTipsList(note, tipsContainer);
          window.StudyShareApp.showToast('Your 3-word tip has been published! Local edit token saved in your browser.', 'success');
          if (onTipChangedCallback) onTipChangedCallback();
        } catch (err) {
          window.StudyShareApp.showToast(err.message, 'error');
        } finally {
          submitBtn.removeAttribute('disabled');
          submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Share 3-Word Tip';
        }
      });
    }

    // Delegated actions for edit, delete, and test unauthorized edit
    if (tipsContainer) {
      tipsContainer.addEventListener('click', async (e) => {
        const tamperBtn = e.target.closest('[data-action="simulate-tamper"]');
        if (tamperBtn) {
          const tipId = tamperBtn.getAttribute('data-tip-id');
          await triggerAntiTamperingAlert(note.id, tipId, 'UNAUTHORIZED_TIP_MUTATION');
          return;
        }

        const deleteBtn = e.target.closest('[data-action="delete-tip"]');
        if (deleteBtn) {
          const tipId = deleteBtn.getAttribute('data-tip-id');
          const tokens = JSON.parse(localStorage.getItem('studyshare_tip_tokens') || '{}');
          const editToken = tokens[tipId];

          if (!editToken) {
            await triggerAntiTamperingAlert(note.id, tipId, 'UNAUTHORIZED_TIP_DELETE');
            return;
          }

          if (confirm('Are you sure you want to remove your 3-word tip?')) {
            try {
              await window.StudyShareDB.deleteTip(note.id, tipId, editToken);
              note.tips = note.tips.filter(t => t.id !== tipId);
              renderTipsList(note, tipsContainer);
              window.StudyShareApp.showToast('Your tip was deleted.', 'info');
              if (onTipChangedCallback) onTipChangedCallback();
            } catch (err) {
              if (err.message.includes('SECURITY_VIOLATION')) {
                await triggerAntiTamperingAlert(note.id, tipId, 'UNAUTHORIZED_TIP_DELETE');
              } else {
                window.StudyShareApp.showToast(err.message, 'error');
              }
            }
          }
          return;
        }

        const editBtn = e.target.closest('[data-action="edit-tip"]');
        if (editBtn) {
          const tipId = editBtn.getAttribute('data-tip-id');
          const tip = note.tips.find(t => t.id === tipId);
          const tokens = JSON.parse(localStorage.getItem('studyshare_tip_tokens') || '{}');
          const editToken = tokens[tipId];

          if (!tip || !editToken) {
            await triggerAntiTamperingAlert(note.id, tipId, 'UNAUTHORIZED_TIP_MUTATION');
            return;
          }

          const updated = prompt('Edit your 3-word tip (must be EXACTLY 3 words):', tip.content);
          if (updated === null) return;

          if (!isExactlyThreeWords(updated)) {
            alert('Tip must contain EXACTLY three words (e.g. "Best exam revision").');
            return;
          }

          try {
            await window.StudyShareDB.updateTip(note.id, tipId, updated.trim(), editToken);
            tip.content = updated.trim();
            renderTipsList(note, tipsContainer);
            window.StudyShareApp.showToast('Your tip was updated successfully!', 'success');
            if (onTipChangedCallback) onTipChangedCallback();
          } catch (err) {
            if (err.message.includes('SECURITY_VIOLATION')) {
              await triggerAntiTamperingAlert(note.id, tipId, 'UNAUTHORIZED_TIP_MUTATION');
            } else {
              window.StudyShareApp.showToast(err.message, 'error');
            }
          }
        }
      });
    }

    renderTipsList(note, tipsContainer);
  }

  window.StudyShareTips = {
    countWords,
    isExactlyThreeWords,
    renderTipsList,
    setupTipsUI,
    triggerAntiTamperingAlert
  };
})();

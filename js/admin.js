/**
 * STUDYSHARE — ADMIN DASHBOARD CONTROLLER
 * 
 * Administration & Monitoring:
 * - Computes dynamic KPI metrics from database
 * - Transparent recent activity logging (non-sensitive application events)
 * - Safe technical security event audits (no hidden surveillance, no GPS, no fingerprinting)
 * - Content moderation (delete note, dismiss report)
 */

(function () {
  'use strict';

  let currentTab = 'notes';

  async function initAdminDashboard() {
    // 1. Fetch live data from database
    const notes = await window.StudyShareDB.getNotes();
    const reports = await window.StudyShareDB.getReports();
    const secEvents = await window.StudyShareDB.getSecurityEvents();
    const activities = await window.StudyShareDB.getRecentActivity();

    // 2. Compute Dynamic KPI Metrics (Initially 0)
    const totalDownloads = notes.reduce((acc, curr) => acc + (curr.downloadCount || 0), 0);
    const totalTips = notes.reduce((acc, curr) => acc + (curr.tips ? curr.tips.length : 0), 0);

    const kpiNotesEl = document.getElementById('kpi-total-notes');
    if (kpiNotesEl) kpiNotesEl.textContent = notes.length.toString();

    const kpiUploadsEl = document.getElementById('kpi-total-uploads');
    if (kpiUploadsEl) kpiUploadsEl.textContent = notes.length.toString();

    const kpiDownloadsEl = document.getElementById('kpi-total-downloads');
    if (kpiDownloadsEl) kpiDownloadsEl.textContent = totalDownloads.toLocaleString();

    const kpiTipsEl = document.getElementById('kpi-total-tips');
    if (kpiTipsEl) kpiTipsEl.textContent = totalTips.toString();

    const kpiReportsEl = document.getElementById('kpi-active-reports');
    if (kpiReportsEl) kpiReportsEl.textContent = reports.filter(r => r.status === 'pending').length.toString();

    const kpiSecEventsEl = document.getElementById('kpi-security-events');
    if (kpiSecEventsEl) kpiSecEventsEl.textContent = secEvents.length.toString();

    const tabNotesCount = document.getElementById('kpi-tab-notes-count');
    if (tabNotesCount) tabNotesCount.textContent = notes.length.toString();

    const tabActivityCount = document.getElementById('kpi-tab-activity-count');
    if (tabActivityCount) tabActivityCount.textContent = activities.length.toString();

    const tabReportsCount = document.getElementById('kpi-tab-reports-count');
    if (tabReportsCount) tabReportsCount.textContent = reports.length.toString();

    const tabSecCount = document.getElementById('kpi-tab-sec-count');
    if (tabSecCount) tabSecCount.textContent = secEvents.length.toString();

    // 3. Render Canvas Charts
    renderSemesterDistributionChart(notes);
    renderCategoryDistributionChart(notes);

    // 4. Tab Navigation
    const tabButtons = document.querySelectorAll('.admin-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.getAttribute('data-tab');

        document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
        const activeContent = document.getElementById(`tab-content-${currentTab}`);
        if (activeContent) activeContent.style.display = 'block';
      });
    });

    // 5. Render Tables
    renderNotesTable(notes);
    renderActivityTable(activities);
    renderReportsTable(reports);
    renderSecurityEventsTable(secEvents);
  }

  // Chart 1: Notes per Semester
  function renderSemesterDistributionChart(notes) {
    const canvas = document.getElementById('chart-semester-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width = canvas.parentElement.clientWidth || 400;
    const height = canvas.height = 240;
    ctx.clearRect(0, 0, width, height);

    const semesters = ['CO3K', 'CO4K', 'CO5K', 'CO6K'];
    const counts = semesters.map(sem => notes.filter(n => (n.semester || '').toUpperCase() === sem).length);
    const colors = ['#38bdf8', '#818cf8', '#a855f7', '#10b981'];

    // If empty database, display clean status message
    if (notes.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '500 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('0 notes in repository. Upload notes to see distribution.', width / 2, height / 2);
      return;
    }

    const maxVal = Math.max(...counts, 4);
    const barWidth = Math.min(50, (width - 80) / semesters.length - 20);
    const chartBottom = height - 40;
    const chartHeight = height - 70;

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = chartBottom - (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();
    }

    semesters.forEach((sem, idx) => {
      const count = counts[idx];
      const barHeight = (count / maxVal) * chartHeight;
      const x = 50 + idx * ((width - 70) / semesters.length);
      const y = chartBottom - barHeight;

      ctx.fillStyle = colors[idx];
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, Math.max(barHeight, 3), [6, 6, 0, 0]);
      } else {
        ctx.rect(x, y, barWidth, Math.max(barHeight, 3));
      }
      ctx.fill();

      // Label below
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(sem, x + barWidth / 2, height - 15);

      // Count above bar
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText(count.toString(), x + barWidth / 2, y - 8);
    });
  }

  // Chart 2: Category Breakdown
  function renderCategoryDistributionChart(notes) {
    const canvas = document.getElementById('chart-category-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width = canvas.parentElement.clientWidth || 400;
    const height = canvas.height = 240;
    ctx.clearRect(0, 0, width, height);

    if (notes.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '500 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No categories active yet.', width / 2, height / 2);
      return;
    }

    const catCounts = {};
    notes.forEach(n => {
      const c = n.category || 'Notes';
      catCounts[c] = (catCounts[c] || 0) + 1;
    });

    const entries = Object.entries(catCounts).slice(0, 5);
    const total = entries.reduce((acc, curr) => acc + curr[1], 0);
    const colors = ['#38bdf8', '#818cf8', '#a855f7', '#10b981', '#f59e0b'];

    const centerX = width / 3;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 25;

    let startAngle = -Math.PI / 2;
    entries.forEach(([cat, val], i) => {
      const sliceAngle = (val / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      startAngle += sliceAngle;
    });

    // Donut hole
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.55, 0, 2 * Math.PI);
    ctx.fillStyle = '#0e1424';
    ctx.fill();

    // Legend
    let legendY = 40;
    entries.forEach(([cat, val], i) => {
      const color = colors[i % colors.length];
      ctx.fillStyle = color;
      ctx.fillRect(width * 0.62, legendY, 12, 12);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '500 12px Inter, sans-serif';
      ctx.textAlign = 'left';
      const shortName = cat.length > 14 ? cat.substring(0, 12) + '..' : cat;
      ctx.fillText(`${shortName} (${val})`, width * 0.62 + 20, legendY + 10);
      legendY += 32;
    });
  }

  // Tab 1: Uploaded Notes Management Table
  function renderNotesTable(notes) {
    const tableBody = document.getElementById('admin-notes-table-body');
    if (!tableBody) return;

    if (notes.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2.5rem; color:var(--text-muted);">No notes uploaded yet. Database starts clean.</td></tr>';
      return;
    }

    tableBody.innerHTML = notes.map(note => `
      <tr>
        <td>
          <div style="font-weight: 700;">${note.title}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${note.subject} • ${note.category}</div>
        </td>
        <td><span class="badge badge-${note.semester ? note.semester.toLowerCase() : 'co3k'}">${note.semester}</span></td>
        <td>${note.uploaderName || 'Student'}</td>
        <td><i class="fas fa-download" style="color: var(--brand-emerald);"></i> ${note.downloadCount || 0}</td>
        <td>${window.StudyShareApp ? window.StudyShareApp.formatDate(note.uploadDate) : note.uploadDate}</td>
        <td>
          <div style="display: flex; gap: 0.5rem;">
            <a href="note-view.html?id=${note.id}" class="btn btn-secondary btn-sm" title="View Note">
              <i class="fas fa-external-link-alt"></i>
            </a>
            <button class="btn btn-danger btn-sm" data-action="delete-note-admin" data-note-id="${note.id}" title="Remove Educational Material">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    tableBody.querySelectorAll('[data-action="delete-note-admin"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const noteId = btn.getAttribute('data-note-id');
        if (confirm('Are you sure you want to remove this educational material from the hub?')) {
          await window.StudyShareDB.deleteNote(noteId);
          window.StudyShareApp.showToast('Resource removed from repository.', 'info');
          initAdminDashboard();
        }
      });
    });
  }

  // Tab 2: Transparent Recent Activity Table (Requirement #9)
  function renderActivityTable(activities) {
    const tableBody = document.getElementById('admin-activity-table-body');
    if (!tableBody) return;

    if (!activities || activities.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 2.5rem; color:var(--text-muted);">No recent activity recorded yet. Explore, upload notes, or leave tips to see activity here.</td></tr>';
      return;
    }

    tableBody.innerHTML = activities.map(act => {
      let icon = 'fas fa-info-circle';
      let iconColor = 'var(--brand-primary)';
      if (act.type === 'upload') { icon = 'fas fa-cloud-upload-alt'; iconColor = 'var(--brand-emerald)'; }
      if (act.type === 'download') { icon = 'fas fa-download'; iconColor = 'var(--brand-emerald)'; }
      if (act.type === 'tip') { icon = 'fas fa-comment-dots'; iconColor = 'var(--brand-secondary)'; }
      if (act.type === 'security') { icon = 'fas fa-shield-alt'; iconColor = 'var(--brand-rose)'; }
      if (act.type === 'delete') { icon = 'fas fa-trash-alt'; iconColor = 'var(--brand-rose)'; }
      if (act.type === 'report') { icon = 'fas fa-flag'; iconColor = 'var(--brand-amber)'; }

      return `
        <tr>
          <td style="width: 40px; text-align: center;">
            <i class="${icon}" style="color: ${iconColor}; font-size: 1.1rem;"></i>
          </td>
          <td>
            <div style="font-weight: 600; font-size: 0.9rem;">${act.text}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Event Type: ${act.type} • Safe Technical Log</div>
          </td>
          <td style="font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap;">
            ${window.StudyShareApp ? window.StudyShareApp.formatDate(act.timestamp) : act.timestamp}
          </td>
        </tr>
      `;
    }).join('');
  }

  // Tab 3: Reported Material Review Table
  function renderReportsTable(reports) {
    const tableBody = document.getElementById('admin-reports-table-body');
    if (!tableBody) return;

    if (reports.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2.5rem; color:var(--text-muted);">No pending reports. All clear!</td></tr>';
      return;
    }

    tableBody.innerHTML = reports.map(r => `
      <tr>
        <td>
          <div style="font-weight: 700;">${r.noteTitle || 'Educational Resource'}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Note ID: ${r.noteId}</div>
        </td>
        <td>
          <span class="badge" style="background: rgba(244, 63, 94, 0.15); color: var(--brand-rose);">
            ${r.reason}
          </span>
          <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
            ${r.additionalInfo || 'No details provided'}
          </div>
        </td>
        <td>${r.reporterName || 'Anonymous Student'}</td>
        <td>${window.StudyShareApp ? window.StudyShareApp.formatDate(r.timestamp) : r.timestamp}</td>
        <td>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-success btn-sm" data-action="dismiss-report" data-rep-id="${r.id}">
              <i class="fas fa-check"></i> Dismiss
            </button>
            <button class="btn btn-danger btn-sm" data-action="delete-reported-note" data-note-id="${r.noteId}" data-rep-id="${r.id}">
              <i class="fas fa-trash"></i> Remove Note
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    tableBody.querySelectorAll('[data-action="dismiss-report"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const repId = btn.getAttribute('data-rep-id');
        await window.StudyShareDB.resolveReport(repId, 'dismissed');
        window.StudyShareApp.showToast('Report dismissed.', 'info');
        initAdminDashboard();
      });
    });

    tableBody.querySelectorAll('[data-action="delete-reported-note"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const noteId = btn.getAttribute('data-note-id');
        const repId = btn.getAttribute('data-rep-id');
        if (confirm('Remove this reported note from the hub?')) {
          await window.StudyShareDB.deleteNote(noteId);
          await window.StudyShareDB.resolveReport(repId, 'note_deleted');
          window.StudyShareApp.showToast('Reported material removed from hub.', 'info');
          initAdminDashboard();
        }
      });
    });
  }

  // Tab 4: Security Events Audit Log Table (Requirement #3, #7, #8)
  function renderSecurityEventsTable(events) {
    const tableBody = document.getElementById('admin-security-table-body');
    if (!tableBody) return;

    if (events.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2.5rem; color:var(--text-muted);">No security violations detected. System normal.</td></tr>';
      return;
    }

    tableBody.innerHTML = events.map(evt => `
      <tr>
        <td>
          <span class="badge" style="background: rgba(244, 63, 94, 0.15); color: var(--brand-rose); border: 1px solid rgba(244, 63, 94, 0.3);">
            <i class="fas fa-shield-alt"></i> ${evt.attemptedAction}
          </span>
        </td>
        <td>
          <div style="font-family: var(--font-mono); font-size: 0.75rem;">Tip ID: ${evt.targetTipId}</div>
          <div style="font-family: var(--font-mono); font-size: 0.725rem; color: var(--text-muted);">Note ID: ${evt.targetNoteId}</div>
        </td>
        <td>
          <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: var(--brand-amber);">
            BLOCKED & AUDITED
          </span>
        </td>
        <td>
          <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-secondary);">
            ${evt.anonymousSessionId || 'anon-session'}
          </div>
          <div style="font-size: 0.7rem; color: var(--text-muted);">Safe technical parameter</div>
        </td>
        <td style="font-size: 0.8rem; color: var(--text-secondary);">${window.StudyShareApp ? window.StudyShareApp.formatDate(evt.timestamp) : evt.timestamp}</td>
      </tr>
    `).join('');
  }

  window.StudyShareAdmin = {
    init: initAdminDashboard
  };
})();

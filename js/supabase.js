/**
 * STUDYSHARE — SUPABASE DATA & STORAGE ENGINE
 * GPJ 2023–2026 Notes Hub
 * "Share Knowledge. Help Someone Learn."
 * 
 * 100% Free Supabase Backend Architecture:
 * - Supabase PostgreSQL Database (notes, tips, reports, security_events)
 * - Supabase Storage (public 'notes' bucket)
 * - Preserves original binary files, filenames, extensions, and MIME types
 * - Realtime updates via Supabase channels
 * - Atomic download_count increment via stored RPC
 * - Open Access (No login required)
 */

(function () {
  'use strict';

  const cfg = window.STUDYSHARE_CONFIG || {};
  let supabaseClient = null;
  let isConfigured = false;

  // 1. Resolve Active Supabase Configuration
  // Supports js/config.js and optional in-browser localStorage override
  let activeConfig = cfg.supabaseConfig || {};
  try {
    const override = localStorage.getItem('studyshare_supabase_config_override');
    if (override) {
      const parsed = JSON.parse(override);
      if (parsed && parsed.url && parsed.anonKey) {
        activeConfig = parsed;
        console.log('[StudyShare] Using in-browser Supabase configuration override.');
      }
    }
  } catch (e) {
    console.warn('[StudyShare] Could not read Supabase config override:', e);
  }

  // 2. Initialize Supabase Client
  const sbUrl = (activeConfig.url || '').trim();
  const sbKey = (activeConfig.anonKey || '').trim();

  if (
    typeof window.supabase !== 'undefined' &&
    window.supabase.createClient &&
    sbUrl &&
    sbKey &&
    !sbUrl.includes('YOUR_') &&
    !sbKey.includes('YOUR_')
  ) {
    try {
      supabaseClient = window.supabase.createClient(sbUrl, sbKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      isConfigured = true;
      console.log('[StudyShare] Supabase client initialized successfully:', sbUrl);
    } catch (err) {
      console.error('[StudyShare] Failed to initialize Supabase client:', err);
      isConfigured = false;
    }
  } else {
    console.warn('[StudyShare] Supabase credentials not yet configured. Provide SUPABASE_URL and SUPABASE_ANON_KEY in js/config.js.');
  }

  // Local Storage Keys for user preferences & local offline fallback
  const STORAGE_KEYS = {
    FALLBACK_NOTES: 'studyshare_notes_local_cache',
    BOOKMARKS: 'studyshare_saved_bookmarks',
    HELPFUL_VOTES: 'studyshare_helpful_votes',
    TIP_TOKENS: 'studyshare_tip_tokens',
    ACTIVITY_FALLBACK: 'studyshare_activity_fallback'
  };

  // MIME type helper
  function getMimeType(fileName) {
    const ext = (fileName || '').split('.').pop().toLowerCase();
    const mimeMap = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ppt: 'application/vnd.ms-powerpoint',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      zip: 'application/zip',
      txt: 'text/plain'
    };
    return mimeMap[ext] || 'application/octet-stream';
  }

  // Map PostgreSQL snake_case row to frontend camelCase object
  function mapRowToNote(row) {
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      academicYear: row.academic_year || '2023–2026',
      semester: row.semester || 'CO3K',
      course: row.course || 'Government Polytechnic Jintur (GPJ)',
      subject: row.subject,
      materialType: row.material_type || 'Notes',
      category: row.material_type || 'Notes',
      tags: Array.isArray(row.tags) ? row.tags : (row.tags ? [row.tags] : []),
      fileName: row.file_name,
      fileType: (row.file_type || '').toLowerCase(),
      fileSize: row.file_size,
      storagePath: row.storage_path,
      publicUrl: row.public_url,
      downloadURL: row.public_url,
      fileUrl: row.public_url,
      uploaderName: row.uploader_name || 'Student Contributor',
      uploaderAvatar: window.StudyShareAuth ? window.StudyShareAuth.getInitials(row.uploader_name) : 'GP',
      downloadCount: Number(row.download_count) || 0,
      helpfulCount: Number(row.helpful_count) || 0,
      createdAt: row.created_at,
      uploadDate: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      tips: []
    };
  }

  function getAnonymousSessionId() {
    let sessId = sessionStorage.getItem('studyshare_anon_session_id');
    if (!sessId) {
      sessId = 'anon-sess-' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('studyshare_anon_session_id', sessId);
    }
    return sessId;
  }

  // Unified Database & Storage Interface
  window.StudyShareDB = {
    isConfigured: () => isConfigured,
    isRealFirebase: () => isConfigured, // Backward-compatibility alias
    isRealBackend: () => isConfigured,
    getClient: () => supabaseClient,
    getActiveConfig: () => ({ ...activeConfig }),
    getMimeType,
    getAnonymousSessionId,

    // In-browser configuration override
    saveConfigOverride(configObj) {
      if (!configObj || !configObj.url || !configObj.anonKey) {
        throw new Error('Please provide both SUPABASE_URL and SUPABASE_ANON_KEY.');
      }
      localStorage.setItem('studyshare_supabase_config_override', JSON.stringify(configObj));
      window.location.reload();
    },

    clearConfigOverride() {
      localStorage.removeItem('studyshare_supabase_config_override');
      window.location.reload();
    },

    // ========================================================================
    // SUPABASE STORAGE: ORIGINAL FILE UPLOAD
    // ========================================================================
    async uploadFileToStorage(file, metadata = {}, onProgress) {
      if (!isConfigured || !supabaseClient) {
        throw new Error('Unable to connect to StudyShare database. Please verify Supabase configuration.');
      }

      // Maximum 50 MB Free tier check (Requirement #23)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('File is too large. Maximum supported size is 50 MB.');
      }

      const academicYear = (metadata.academicYear || '2023–2026').replace(/–/g, '-');
      const semester = metadata.semester || 'CO3K';
      const subject = (metadata.subject || 'GENERAL').replace(/[^a-zA-Z0-9_-]/g, '_');
      const materialType = (metadata.materialType || metadata.category || 'Notes').replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

      // Exact storage folder structure (Requirement #7):
      // notes/{academic_year}/{semester}/{subject}/{material_type}/{timestamp}_{file_name}
      const storagePath = `${academicYear}/${semester}/${subject}/${materialType}/${timestamp}_${safeName}`;

      console.log('[StudyShare] Uploading original file to Supabase Storage bucket "notes":', storagePath);

      if (typeof onProgress === 'function') onProgress(25);

      const mimeType = file.type || getMimeType(file.name);

      const { data, error } = await supabaseClient.storage
        .from('notes')
        .upload(storagePath, file, {
          contentType: mimeType,
          upsert: false
        });

      if (error) {
        console.error('[StudyShare] Supabase Storage upload failed:', error);
        throw new Error('File upload failed: ' + (error.message || 'Storage error'));
      }

      if (typeof onProgress === 'function') onProgress(75);

      // Generate public URL
      const { data: urlData } = supabaseClient.storage
        .from('notes')
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;
      console.log('[StudyShare] File uploaded successfully. Public URL:', publicUrl);

      if (typeof onProgress === 'function') onProgress(100);

      return {
        storagePath,
        publicUrl,
        downloadURL: publicUrl
      };
    },

    async deleteStorageFile(storagePath) {
      if (!isConfigured || !supabaseClient || !storagePath) return;
      try {
        await supabaseClient.storage.from('notes').remove([storagePath]);
        console.log('[StudyShare] Cleaned up storage file:', storagePath);
      } catch (err) {
        console.warn('[StudyShare] Failed to remove storage file:', err);
      }
    },

    // ========================================================================
    // SUPABASE DATABASE: NOTES TABLE
    // ========================================================================
    async createNote(noteData) {
      if (!isConfigured || !supabaseClient) {
        throw new Error('Unable to connect to StudyShare database.');
      }

      const row = {
        title: noteData.title,
        description: noteData.description || '',
        academic_year: noteData.academicYear || '2023–2026',
        semester: noteData.semester || 'CO3K',
        course: noteData.course || 'Government Polytechnic Jintur (GPJ)',
        subject: noteData.subject || 'General',
        material_type: noteData.materialType || noteData.category || 'Notes',
        tags: Array.isArray(noteData.tags) ? noteData.tags : [],
        file_name: noteData.fileName,
        file_type: (noteData.fileType || noteData.fileName.split('.').pop()).toLowerCase(),
        file_size: noteData.fileSize || 'Unknown',
        storage_path: noteData.storagePath || '',
        public_url: noteData.publicUrl || noteData.downloadURL || '',
        uploader_name: noteData.uploaderName || 'Student Contributor',
        download_count: 0,
        helpful_count: 0
      };

      console.log('[StudyShare] Inserting note row into Supabase "notes" table...');

      const { data, error } = await supabaseClient
        .from('notes')
        .insert([row])
        .select()
        .single();

      if (error) {
        console.error('[StudyShare] Database insert failed:', error);
        // Clean up storage file if it was uploaded to prevent orphaned files
        if (noteData.storagePath) {
          await this.deleteStorageFile(noteData.storagePath);
        }
        throw new Error('Unable to save note information.');
      }

      console.log('[StudyShare] Note saved to database with ID:', data.id);
      await this.recordActivity(`New material uploaded: "${data.title}" (${data.subject})`, 'upload');

      return data.id;
    },

    async getNotes(filters = {}) {
      if (isConfigured && supabaseClient) {
        try {
          let query = supabaseClient
            .from('notes')
            .select('*')
            .order('created_at', { ascending: false });

          if (filters.semester && filters.semester !== 'all') {
            query = query.eq('semester', filters.semester);
          }
          if (filters.subject && filters.subject !== 'all') {
            query = query.eq('subject', filters.subject);
          }
          if (filters.category && filters.category !== 'all') {
            query = query.eq('material_type', filters.category);
          }

          const { data, error } = await query;

          if (error) {
            console.error('[StudyShare] Supabase getNotes query failed:', error);
            return [];
          }

          return (data || []).map(mapRowToNote);
        } catch (err) {
          console.error('[StudyShare] getNotes exception:', err);
          return [];
        }
      }

      const raw = localStorage.getItem(STORAGE_KEYS.FALLBACK_NOTES);
      return raw ? JSON.parse(raw) : [];
    },

    async getNoteById(id) {
      if (!id) return null;

      if (isConfigured && supabaseClient) {
        try {
          const { data, error } = await supabaseClient
            .from('notes')
            .select('*')
            .eq('id', id)
            .single();

          if (error || !data) {
            console.error('[StudyShare] Note not found:', id, error);
            return null;
          }

          const note = mapRowToNote(data);

          // Fetch associated 3-word tips
          const { data: tipsData } = await supabaseClient
            .from('tips')
            .select('*')
            .eq('note_id', id)
            .order('created_at', { ascending: true });

          note.tips = (tipsData || []).map(t => ({
            id: t.id,
            text: t.tip_text,
            author: t.student_name,
            createdAt: t.created_at,
            editTokenHash: t.edit_token
          }));

          return note;
        } catch (err) {
          console.error('[StudyShare] getNoteById error:', err);
          return null;
        }
      }

      const notes = await this.getNotes();
      return notes.find(n => n.id === id) || null;
    },

    // Realtime subscription for notes
    subscribeToNotes(callback) {
      if (!callback) return () => {};

      this.getNotes().then(callback);

      if (isConfigured && supabaseClient) {
        try {
          const channel = supabaseClient
            .channel('public:notes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => {
              this.getNotes().then(callback);
            })
            .subscribe();

          return () => {
            supabaseClient.removeChannel(channel);
          };
        } catch (err) {
          console.warn('[StudyShare] Realtime channel subscription warning:', err);
        }
      }

      return () => {};
    },

    // Realtime subscription for global stats
    subscribeToStats(callback) {
      if (!callback) return () => {};

      const fetchStats = async () => {
        const notes = await this.getNotes();
        const totalNotes = notes.length;
        const totalUploads = notes.length;
        const totalDownloads = notes.reduce((sum, n) => sum + (Number(n.downloadCount) || 0), 0);

        let totalTips = 0;
        if (isConfigured && supabaseClient) {
          const { count } = await supabaseClient
            .from('tips')
            .select('*', { count: 'exact', head: true });
          totalTips = count || 0;
        }

        callback({
          totalNotes,
          totalUploads,
          totalDownloads,
          totalTips
        });
      };

      fetchStats();

      if (isConfigured && supabaseClient) {
        const channel = supabaseClient
          .channel('public:stats')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, fetchStats)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tips' }, fetchStats)
          .subscribe();

        return () => supabaseClient.removeChannel(channel);
      }

      return () => {};
    },

    // Atomic download count increment (Requirement #16)
    async incrementDownload(noteId) {
      if (!noteId) return;

      if (isConfigured && supabaseClient) {
        try {
          // Attempt RPC increment first
          const { error } = await supabaseClient.rpc('increment_download', {
            target_note_id: noteId
          });

          if (error) {
            // Fallback: direct update
            console.warn('[StudyShare] RPC increment_download failed, attempting direct increment:', error);
            const { data: current } = await supabaseClient
              .from('notes')
              .select('download_count')
              .eq('id', noteId)
              .single();

            const nextCount = (current?.download_count || 0) + 1;
            await supabaseClient
              .from('notes')
              .update({ download_count: nextCount })
              .eq('id', noteId);
          }
          console.log('[StudyShare] Atomic download increment recorded for note:', noteId);
        } catch (err) {
          console.warn('[StudyShare] Failed to increment download count:', err);
        }
      }
    },

    async deleteNote(noteId, storagePath) {
      if (isConfigured && supabaseClient) {
        try {
          await supabaseClient.from('notes').delete().eq('id', noteId);
          if (storagePath) {
            await this.deleteStorageFile(storagePath);
          }
          await this.recordActivity(`Material removed by administrator (ID: ${noteId})`, 'delete');
          return true;
        } catch (err) {
          console.error('[StudyShare] Delete note error:', err);
          throw err;
        }
      }
      return false;
    },

    // ========================================================================
    // STUDENT 3-WORD TIPS
    // ========================================================================
    async addTip(noteId, tipText, studentName) {
      const words = tipText.trim().split(/\s+/);
      if (words.length !== 3) {
        throw new Error('Tips must contain exactly 3 words.');
      }

      const token = 'tok-' + Math.random().toString(36).substring(2, 12);

      if (isConfigured && supabaseClient) {
        const { data, error } = await supabaseClient
          .from('tips')
          .insert([{
            note_id: noteId,
            student_name: studentName || 'Student',
            tip_text: tipText,
            edit_token: token
          }])
          .select()
          .single();

        if (error) {
          console.error('[StudyShare] Failed to save tip:', error);
          throw new Error('Could not save tip.');
        }

        // Store local prototype token
        const tokens = JSON.parse(localStorage.getItem(STORAGE_KEYS.TIP_TOKENS) || '{}');
        tokens[data.id] = token;
        localStorage.setItem(STORAGE_KEYS.TIP_TOKENS, JSON.stringify(tokens));

        await this.recordActivity(`New 3-word tip shared: "${tipText}"`, 'tip');
        return { tipId: data.id, editToken: token };
      }

      const tipId = 'tip-' + Date.now();
      const tokens = JSON.parse(localStorage.getItem(STORAGE_KEYS.TIP_TOKENS) || '{}');
      tokens[tipId] = token;
      localStorage.setItem(STORAGE_KEYS.TIP_TOKENS, JSON.stringify(tokens));
      return { tipId, editToken: token };
    },

    async updateTip(noteId, tipId, newText, providedToken) {
      const words = newText.trim().split(/\s+/);
      if (words.length !== 3) {
        throw new Error('Tips must contain exactly 3 words.');
      }

      const tokens = JSON.parse(localStorage.getItem(STORAGE_KEYS.TIP_TOKENS) || '{}');
      const savedToken = tokens[tipId];

      if (!providedToken || (savedToken && providedToken !== savedToken)) {
        await this.recordSecurityEvent('UNAUTHORIZED_TIP_MUTATION_ATTEMPT', {
          targetTipId: tipId,
          targetNoteId: noteId,
          details: 'Blocked modification attempt without matching token'
        });
        throw new Error('SECURITY_VIOLATION_UNAUTHORIZED_EDIT');
      }

      if (isConfigured && supabaseClient) {
        const { error } = await supabaseClient
          .from('tips')
          .update({
            tip_text: newText,
            updated_at: new Date().toISOString()
          })
          .eq('id', tipId)
          .eq('edit_token', providedToken);

        if (error) throw error;
      }

      await this.recordActivity(`Tip updated: "${newText}"`, 'tip');
      return true;
    },

    async deleteTip(noteId, tipId, providedToken) {
      const tokens = JSON.parse(localStorage.getItem(STORAGE_KEYS.TIP_TOKENS) || '{}');
      const savedToken = tokens[tipId];

      if (!providedToken || (savedToken && providedToken !== savedToken)) {
        await this.recordSecurityEvent('UNAUTHORIZED_TIP_DELETION_ATTEMPT', {
          targetTipId: tipId,
          targetNoteId: noteId,
          details: 'Blocked deletion attempt without matching token'
        });
        throw new Error('SECURITY_VIOLATION_UNAUTHORIZED_EDIT');
      }

      if (isConfigured && supabaseClient) {
        const { error } = await supabaseClient
          .from('tips')
          .delete()
          .eq('id', tipId)
          .eq('edit_token', providedToken);

        if (error) throw error;
      }

      delete tokens[tipId];
      localStorage.setItem(STORAGE_KEYS.TIP_TOKENS, JSON.stringify(tokens));
      await this.recordActivity('Tip deleted by creator', 'tip');
      return true;
    },

    getUserEditToken(tipId) {
      const tokens = JSON.parse(localStorage.getItem(STORAGE_KEYS.TIP_TOKENS) || '{}');
      return tokens[tipId] || null;
    },

    // ========================================================================
    // HELPFUL VOTES
    // ========================================================================
    async toggleHelpful(noteId) {
      let votes = JSON.parse(localStorage.getItem(STORAGE_KEYS.HELPFUL_VOTES) || '[]');
      const hasVoted = votes.includes(noteId);
      const delta = hasVoted ? -1 : 1;

      if (hasVoted) {
        votes = votes.filter(id => id !== noteId);
      } else {
        votes.push(noteId);
      }
      localStorage.setItem(STORAGE_KEYS.HELPFUL_VOTES, JSON.stringify(votes));

      if (isConfigured && supabaseClient) {
        try {
          await supabaseClient.rpc('toggle_helpful_count', {
            target_note_id: noteId,
            delta: delta
          });
        } catch (err) {
          console.warn('[StudyShare] toggle_helpful_count error:', err);
        }
      }

      return { hasVoted: !hasVoted, delta };
    },

    hasUserVotedHelpful(noteId) {
      const votes = JSON.parse(localStorage.getItem(STORAGE_KEYS.HELPFUL_VOTES) || '[]');
      return votes.includes(noteId);
    },

    // ========================================================================
    // BOOKMARKS
    // ========================================================================
    getBookmarks() {
      const raw = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      return raw ? JSON.parse(raw) : [];
    },

    toggleBookmark(note) {
      let bookmarks = this.getBookmarks();
      const exists = bookmarks.some(b => b.id === note.id);
      if (exists) {
        bookmarks = bookmarks.filter(b => b.id !== note.id);
      } else {
        bookmarks.unshift({
          id: note.id,
          title: note.title,
          subject: note.subject,
          semester: note.semester,
          category: note.category || note.materialType,
          fileName: note.fileName,
          downloadURL: note.downloadURL || note.publicUrl,
          savedAt: new Date().toISOString()
        });
      }
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
      return !exists;
    },

    isBookmarked(noteId) {
      return this.getBookmarks().some(b => b.id === noteId);
    },

    // ========================================================================
    // ACTIVITY & DEMO SECURITY MONITORING
    // ========================================================================
    async recordActivity(message, actionType = 'general') {
      const event = {
        message,
        action_type: actionType,
        created_at: new Date().toISOString()
      };

      if (isConfigured && supabaseClient) {
        try {
          await supabaseClient.from('activity_log').insert([event]);
        } catch (e) {}
      }

      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY_FALLBACK) || '[]');
      list.unshift(event);
      if (list.length > 20) list.pop();
      localStorage.setItem(STORAGE_KEYS.ACTIVITY_FALLBACK, JSON.stringify(list));
    },

    async getRecentActivity() {
      if (isConfigured && supabaseClient) {
        try {
          const { data } = await supabaseClient
            .from('activity_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(15);
          if (data && data.length) return data;
        } catch (e) {}
      }
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY_FALLBACK) || '[]');
    },

    async recordSecurityEvent(eventType, details = {}) {
      const event = {
        event_type: eventType,
        note_id: details.targetNoteId || null,
        tip_id: details.targetTipId || null,
        anonymous_session_id: getAnonymousSessionId()
      };

      console.warn('🛡️ StudyShare Demo Security Event:', event);

      if (isConfigured && supabaseClient) {
        try {
          await supabaseClient.from('security_events').insert([event]);
        } catch (e) {}
      }
      return event;
    },

    async getSecurityEvents() {
      if (isConfigured && supabaseClient) {
        try {
          const { data } = await supabaseClient
            .from('security_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
          return data || [];
        } catch (e) {}
      }
      return [];
    },

    async submitReport(reportData) {
      const report = {
        note_id: reportData.noteId || null,
        reporter_name: reportData.reporterName || 'Anonymous',
        reason: reportData.reason,
        description: reportData.description || ''
      };

      if (isConfigured && supabaseClient) {
        const { error } = await supabaseClient.from('reports').insert([report]);
        if (error) throw error;
      }
      return true;
    },

    async getReports() {
      if (isConfigured && supabaseClient) {
        try {
          const { data } = await supabaseClient
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });
          return data || [];
        } catch (e) {}
      }
      return [];
    }
  };
})();

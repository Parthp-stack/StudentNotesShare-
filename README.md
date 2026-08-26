# StudyShare — GPJ 2023–2026 Notes Hub

<p align="center">
  <img src="https://img.shields.io/badge/StudyShare-GPJ%202023--2026-38bdf8?style=for-the-badge&logo=atom&logoColor=white" alt="StudyShare Badge">
  <img src="https://img.shields.io/badge/Access-No%20Login%20Required-10b981?style=for-the-badge" alt="Open Access">
  <img src="https://img.shields.io/badge/Three.js-3D%20Spatial%20Web-black?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js">
  <img src="https://img.shields.io/badge/Supabase-Database%20%7C%20Storage-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/Frontend-HTML5%20%2F%20CSS3%20%2F%20Vanilla%20ES6+-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="Vanilla JS">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License MIT">
</p>

> **“Share Knowledge. Help Someone Learn.”**  
> *A community-powered educational repository built for Government Polytechnic Jintur (GPJ) Diploma Computer Engineering students (2023–2026 batch).*  
> **Open Student Access — No login or account required.**

---

## 🌟 Overview & Core Principles

**StudyShare** is an open, modern educational platform designed for Government Polytechnic Jintur (GPJ) students to share and access diploma study materials.

### Key Architectural Pillars:
1. **Open Student Access (No Login Required)**
   - No login page, no registration page, and no password barriers.
   - Any student can open the platform to browse, search, preview, download, and upload notes immediately.
   - When uploading notes or writing a tip, students only provide a display name (e.g. `Your Name: [ Enter your name ]`). No emails, passwords, phone numbers, or private data are collected.

2. **Clean Initial Content State (0 Dummy Records)**
   - Starts with a completely empty repository: **0 notes, 0 demo users, 0 tips, 0 bookmarks, 0 reports, 0 security events, 0 downloads**.
   - No hard-coded fake notes or dummy profiles. Initial notes are added organically by contributors.

3. **Three-Word Tip System & Temporary Browser Edit Tokens**
   - Students can write peer study tips validated to contain **EXACTLY THREE WORDS** (e.g. *“Very useful notes”*, *“Best exam revision”*, *“Easy to understand”*, *“Great practical examples”*).
   - Tip ownership is protected via a secure temporary edit token stored locally in the student's browser. Only the browser holding that token can edit or delete the tip.

4. **Unauthorized Edit Interception & Safe Demo Security Audits**
   - Attempting to edit or delete another student's tip without a valid edit token triggers an immediate block:
     > `⚠ Unauthorized modification attempt.`
   - A demonstration security event is logged using only safe technical parameters (attempt type, target tip ID, timestamp, anonymous session ID).
   - **No Secret Tracking**: No GPS collection, no device fingerprinting, and no physical surveillance claims.

5. **Admin Only Access & Administrative Oversight**
   - Labeled **“Admin Only”** in navigation bars.
   - Restricted access page (`admin.html`) indicating faculty/administrative access.
   - Transparent access and security event monitoring without secret tracking.

6. **Interactive 3D Three.js Visualizations**
   - Hero 3D curriculum network and fullscreen 3D Study Space with orbital controls.
   - Preserves complete MSBTE K-Scheme academic structure (CO3K, CO4K, CO5K, CO6K).

---

## 🏛️ Academic Structure (GPJ MSBTE K-Scheme)

StudyShare organizes resources according to the Government Polytechnic Jintur diploma curriculum:

```
                    STUDYSHARE (GPJ ROOT)
                              |
        ---------------------------------------------
        |               |             |             |
      CO3K            CO4K          CO5K          CO6K
        |               |             |             |
   +-- DBMS        +-- DCN       +-- ACN       +-- Machine Learning
   +-- DTE         +-- Java      +-- OSY       +-- Management
   +-- DSU         +-- MIC       +-- Software  +-- NIS
   +-- OOPS                          Testing
```

### Supported Resource Categories
- Lecture & Handwritten Notes
- Programming Language Cheat Sheets (C++, Java, Python, SQL)
- Previous Year Question Papers (MSBTE)
- Practical Files & Lab Manuals
- Important Examination Questions
- Assignments & Term Work
- Placement & Technical Interview Material
- Capstone Projects
- Useful Educational Resources & Student Contributions

---

## 💻 Project Structure

```
├── index.html            # Homepage with hero 3D tree, open messaging, live counters
├── intro.html            # Startup Purpose Window with 4–5s 3D intro & auto-transition
├── notes.html            # Notes Explorer with real-time multi-filter and search
├── note-view.html        # In-browser document preview, 3-word tips, report modal
├── upload.html           # Drag & drop upload form (asks only for Contributor Name)
├── study-space.html      # Immersive fullscreen 3D Three.js study environment
├── profile.html          # Saved Bookmarks & local contributions workspace
├── admin.html            # Admin Only access restriction page
├── login.html            # Redirects to index.html (no authentication required)
├── supabase_schema.sql  # Supabase PostgreSQL schema, RLS policies, & storage setup
├── css/
│   ├── themes.css        # Cyber Blue design tokens & dark/light palettes
│   ├── style.css         # Component styling & layouts
│   ├── animations.css    # Transitions & micro-interactions
│   ├── responsive.css    # Mobile, tablet, & desktop media queries
│   └── intro.css         # Startup Experience & Purpose Window styles
└── js/
    ├── config.js         # MSBTE K-Scheme syllabus & Supabase configuration
    ├── theme.js          # Dark / Light theme toggle & localStorage persistence
    ├── intro.js          # Startup Experience Purpose Window & 3D intro controller
    ├── supabase.js       # Supabase Database, Storage, Realtime, & Open Access engine
    ├── auth.js           # Session helper for display name (no login/passwords)
    ├── tips.js           # Exact 3-word validation, edit tokens, security alert modal
    ├── upload.js         # Drag-and-drop file upload & local persistence
    ├── notes.js          # Note card rendering, search, filters, download handler
    ├── note-view.js      # Note details, simulated preview, helpful votes, reporting
    ├── study-space.js    # Three.js 3D study space scene, controls, & audio hum
    ├── three-scene.js    # Three.js hero academic tree for landing page
    ├── admin.js          # Admin dashboard controller, dynamic KPIs, charts, activity log
    └── app.js            # Global utilities, toast notifications, formatting helpers
```

---

## 🛠️ Getting Started & Local Development

### Option 1: Direct File Opening
Since StudyShare uses vanilla web standards, you can run it directly:
1. Double-click `index.html` to open in any modern browser (Chrome, Edge, Firefox, Safari).

### Option 2: Local HTTP Server (Recommended)
Using Python:
```bash
python -m http.server 8000
```
Or using Node.js `npx serve`:
```bash
npx serve .
```
Then navigate to `http://localhost:8000`.

---

## 🔒 Open Access Data & Privacy

- **No Passwords or Credentials**: Users are never asked for passwords, emails, phone numbers, or addresses.
- **Local Browser Tokens**: When a student shares a 3-word tip, a cryptographic token is saved in their browser (`studyshare_tip_tokens`) to authorize edits and deletions.
- **Zero Surveillance**: Prototype security logs record only safe technical audit fields (`attemptType`, `targetTipId`, `timestamp`, `anonymousSessionId`). Absolutely no GPS or secret device fingerprinting is used.
- **Transparent Activity Log**: Displays non-sensitive events (views, uploads, downloads, tips, and blocked edits) for full open visibility.

---

## 📄 License

This project is licensed under the MIT License — open for academic collaboration and learning.

/**
 * STUDYSHARE — CONFIGURATION & ACADEMIC DATA
 * GPJ 2023-2026 Notes Hub
 * 
 * Contains academic syllabus, categories, initial seed data,
 * and Supabase project configuration.
 */

window.STUDYSHARE_CONFIG = {
  appName: "StudyShare",
  subtitle: "GPJ 2023–2026 Notes Hub",
  motto: "Share Knowledge. Help Someone Learn.",
  tagline: "A community-powered notes hub for Diploma students.",

  // Supabase Configuration
  // Provide your Supabase project URL and anon/public key.
  // Obtain these from Supabase Dashboard > Project Settings > API
  supabaseConfig: {
    url: "",
    anonKey: ""
  },

  // Academic Structure: GPJ Computer Engineering (CO3K - CO6K)
  semesters: [
    {
      code: "CO3K",
      title: "Semester 3 (CO-3K)",
      color: "#38bdf8",
      subjects: [
        { code: "DBMS", name: "Database Management System", icon: "database" },
        { code: "DTE", name: "Digital Techniques", icon: "cpu" },
        { code: "DSU", name: "Data Structures Using C", icon: "folder-tree" },
        { code: "OOPS", name: "Object Oriented Programming (C++)", icon: "code" }
      ]
    },
    {
      code: "CO4K",
      title: "Semester 4 (CO-4K)",
      color: "#818cf8",
      subjects: [
        { code: "DCN", name: "Data Communication & Computer Networks", icon: "network" },
        { code: "Java", name: "Java Programming", icon: "coffee" },
        { code: "MIC", name: "Microprocessor & Interfacing", icon: "microchip" }
      ]
    },
    {
      code: "CO5K",
      title: "Semester 5 (CO-5K)",
      color: "#a855f7",
      subjects: [
        { code: "ACN", name: "Advanced Computer Networks", icon: "wifi" },
        { code: "OSY", name: "Operating Systems", icon: "terminal" },
        { code: "Software Testing", name: "Software Testing", icon: "check-circle" }
      ]
    },
    {
      code: "CO6K",
      title: "Semester 6 (CO-6K)",
      color: "#10b981",
      subjects: [
        { code: "Machine Learning", name: "Machine Learning", icon: "brain" },
        { code: "Management", name: "Management Principles", icon: "briefcase" },
        { code: "NIS", name: "Network & Information Security", icon: "shield" }
      ]
    }
  ],

  // Resource Categories
  categories: [
    "Notes",
    "Programming Language Cheat Sheets",
    "Previous Question Papers",
    "Practical Files",
    "Important Questions",
    "Study Material",
    "Lab Manuals",
    "Assignments",
    "Interview Preparation",
    "Placement Material",
    "Projects",
    "Useful Educational Resources",
    "Other Student Contributions"
  ],

  // Initial Database State: Clean & Empty (0 notes, 0 demo users)
  // Notes and student contributions are added directly by students.
  initialNotes: [],

  // No demo users
  demoUsers: []
};


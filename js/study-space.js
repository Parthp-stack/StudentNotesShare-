/**
 * STUDYSHARE — IMMERSIVE 3D / VR STUDY SPACE
 * Fullscreen Three.js learning environment with OrbitControls,
 * cluster focus, node inspector HUD, and Web Audio ambient hum.
 */

(function () {
  'use strict';

  let scene, camera, renderer, controls;
  let nodesGroup, linesGroup, starsGroup;
  let raycaster, mouse;
  let interactiveNodes = [];
  let audioContext = null;
  let isSoundOn = false;
  let synthGain = null;

  const SEMESTER_CLUSTERS = {
    CO3K: { pos: [-12, 2, -5], color: 0x38bdf8, name: "Semester 3 (CO-3K)" },
    CO4K: { pos: [-4, 6, 8], color: 0x818cf8, name: "Semester 4 (CO-4K)" },
    CO5K: { pos: [6, -3, -8], color: 0xa855f7, name: "Semester 5 (CO-5K)" },
    CO6K: { pos: [14, 4, 4], color: 0x10b981, name: "Semester 6 (CO-6K)" }
  };

  async function initStudySpace() {
    const container = document.getElementById('study-space-canvas-container');
    if (!container) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070a13, 0.015);

    // Camera
    camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 10, 30);

    // Renderer with mobile battery and GPU optimization
    const isMobile = width < 768;
    renderer = new THREE.WebGLRenderer({ antialias: !isMobile });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    container.appendChild(renderer.domElement);

    // OrbitControls
    if (typeof THREE.OrbitControls !== 'undefined') {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxDistance = 75;
      controls.minDistance = 6;
    }

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);

    const light1 = new THREE.PointLight(0x38bdf8, 2, 80);
    light1.position.set(0, 20, 20);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xa855f7, 2, 80);
    light2.position.set(0, -20, -20);
    scene.add(light2);

    // Groups
    nodesGroup = new THREE.Group();
    linesGroup = new THREE.Group();
    starsGroup = new THREE.Group();

    scene.add(starsGroup);
    scene.add(linesGroup);
    scene.add(nodesGroup);

    // Build Environment
    createStarfield();
    buildSpaceNodes();

    // Raycaster
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    setupInteractions();
    setupAudioSynth();
    setupHUDButtons();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
  }

  // Starfield
  function createStarfield() {
    const starCount = window.innerWidth < 768 ? 250 : 800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 150;
      positions[i + 1] = (Math.random() - 0.5) * 150;
      positions[i + 2] = (Math.random() - 0.5) * 150;

      colors[i] = 0.4 + Math.random() * 0.6;
      colors[i + 1] = 0.6 + Math.random() * 0.4;
      colors[i + 2] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 0.7
    });

    const stars = new THREE.Points(geometry, material);
    starsGroup.add(stars);
  }

  // Build Floating Nodes & Connections
  function buildSpaceNodes() {
    const cfg = window.STUDYSHARE_CONFIG || {};

    // Center Core Hub
    createSpaceNode({
      title: "STUDYSHARE HUB",
      subtitle: "GPJ 2023-2026 Central Core",
      type: "core",
      semester: "ALL",
      color: 0x38bdf8,
      size: 2.5,
      pos: [0, 0, 0]
    });

    cfg.semesters.forEach(sem => {
      const cluster = SEMESTER_CLUSTERS[sem.code];
      if (!cluster) return;

      // Semester Core
      createSpaceNode({
        title: sem.code,
        subtitle: sem.title,
        type: "semester",
        semester: sem.code,
        color: cluster.color,
        size: 1.8,
        pos: cluster.pos
      });

      // Connect Center to Semester
      drawSpaceLine([0, 0, 0], cluster.pos, cluster.color);

      // Subject satellites
      sem.subjects.forEach((subj, sIdx) => {
        const angle = (sIdx / sem.subjects.length) * Math.PI * 2;
        const radius = 4.2;
        const subPos = [
          cluster.pos[0] + Math.cos(angle) * radius,
          cluster.pos[1] + (Math.sin(angle) * 1.5),
          cluster.pos[2] + Math.sin(angle) * radius
        ];

        createSpaceNode({
          title: subj.code,
          subtitle: subj.name,
          type: "subject",
          semester: sem.code,
          subjectCode: subj.code,
          color: cluster.color,
          size: 1.2,
          pos: subPos
        });

        // Connect Semester to Subject
        drawSpaceLine(cluster.pos, subPos, cluster.color);
      });
    });
  }

  function createSpaceNode(data) {
    const group = new THREE.Group();
    group.position.set(...data.pos);

    // Sphere
    const geom = new THREE.SphereGeometry(data.size * 0.5, 28, 28);
    const mat = new THREE.MeshStandardMaterial({
      color: data.color,
      roughness: 0.2,
      metalness: 0.8,
      emissive: data.color,
      emissiveIntensity: 0.4
    });
    const sphere = new THREE.Mesh(geom, mat);
    group.add(sphere);

    // Pulsing Outer Aura Ring
    const ringGeom = new THREE.RingGeometry(data.size * 0.65, data.size * 0.72, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: data.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    sphere.userData = {
      ...data,
      parentGroup: group
    };

    interactiveNodes.push(sphere);
    nodesGroup.add(group);
  }

  function drawSpaceLine(p1, p2, color) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...p1),
      new THREE.Vector3(...p2)
    ]);
    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.35,
      linewidth: 1
    });
    const line = new THREE.Line(geometry, material);
    linesGroup.add(line);
  }

  // Interactivity
  function setupInteractions() {
    window.addEventListener('mousemove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('click', (e) => {
      // Don't trigger if clicked on UI
      if (e.target.closest('.hud-glass-card') || e.target.closest('.node-inspector-drawer') || e.target.closest('.space-semester-filter')) {
        return;
      }

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveNodes);

      if (intersects.length > 0) {
        const clickedNode = intersects[0].object;
        openNodeInspector(clickedNode.userData);
        focusCameraOn(clickedNode.userData.pos);
      }
    });
  }

  // Camera Smooth Movement
  function focusCameraOn(targetPos) {
    if (!controls) return;
    const offset = 8;
    const targetCamPos = {
      x: targetPos[0],
      y: targetPos[1] + 3,
      z: targetPos[2] + offset
    };

    let progress = 0;
    const startCamPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    const startTarget = { x: controls.target.x, y: controls.target.y, z: controls.target.z };

    function step() {
      progress += 0.04;
      const ease = 1 - Math.pow(1 - progress, 3);

      camera.position.x = startCamPos.x + (targetCamPos.x - startCamPos.x) * ease;
      camera.position.y = startCamPos.y + (targetCamPos.y - startCamPos.y) * ease;
      camera.position.z = startCamPos.z + (targetCamPos.z - startCamPos.z) * ease;

      controls.target.x = startTarget.x + (targetPos[0] - startTarget.x) * ease;
      controls.target.y = startTarget.y + (targetPos[1] - startTarget.y) * ease;
      controls.target.z = startTarget.z + (targetPos[2] - startTarget.z) * ease;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
    step();
  }

  // Open 3D Node Details Drawer
  async function openNodeInspector(data) {
    const drawer = document.getElementById('node-inspector-drawer');
    if (!drawer) return;

    const titleEl = document.getElementById('inspector-title');
    const semEl = document.getElementById('inspector-sem-badge');
    const notesListEl = document.getElementById('inspector-notes-list');
    const explorerLinkEl = document.getElementById('inspector-explorer-link');

    if (titleEl) titleEl.textContent = data.title;
    if (semEl) {
      semEl.textContent = data.subtitle;
      semEl.className = `badge badge-${(data.semester || 'co3k').toLowerCase()}`;
    }

    if (explorerLinkEl) {
      if (data.subjectCode) {
        explorerLinkEl.href = `notes.html?semester=${data.semester}&subject=${encodeURIComponent(data.subjectCode)}`;
      } else if (data.semester !== 'ALL') {
        explorerLinkEl.href = `notes.html?semester=${data.semester}`;
      } else {
        explorerLinkEl.href = 'notes.html';
      }
    }

    // Find notes for this node
    if (notesListEl && window.StudyShareDB) {
      const allNotes = await window.StudyShareDB.getNotes();
      let matched = allNotes;

      if (data.type === 'subject') {
        matched = allNotes.filter(n => (n.subject || '').toLowerCase() === data.subjectCode.toLowerCase());
      } else if (data.type === 'semester') {
        matched = allNotes.filter(n => (n.semester || '').toUpperCase() === data.semester.toUpperCase());
      }

      if (matched.length === 0) {
        notesListEl.innerHTML = `
          <div style="text-align: center; padding: 1.5rem 1rem; background: rgba(255, 255, 255, 0.04); border-radius: var(--radius-md); border: 1px dashed rgba(255, 255, 255, 0.15);">
            <i class="far fa-folder-open" style="font-size: 1.75rem; color: #38bdf8; margin-bottom: 0.5rem; display: block;"></i>
            <div style="font-weight: 700; color: #f8fafc; font-size: 0.95rem; margin-bottom: 0.25rem;">No notes uploaded yet.</div>
            <div style="color: #94a3b8; font-size: 0.825rem; margin-bottom: 1rem;">Be the first student to contribute.</div>
            <a href="upload.html" class="btn btn-primary btn-sm" style="font-size: 0.8rem;">
              <i class="fas fa-cloud-upload-alt"></i> Contribute Notes
            </a>
          </div>
        `;
      } else {
        notesListEl.innerHTML = matched.slice(0, 4).map(n => `
          <a href="note-view.html?id=${n.id}" class="inspector-note-link">
            <div style="font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px;">${n.title}</div>
            <i class="fas fa-chevron-right" style="font-size: 0.75rem; color: var(--brand-primary);"></i>
          </a>
        `).join('');
      }
    }

    drawer.classList.add('active');
  }

  // Ambient Web Audio Hum (Futuristic sci-fi spatial sound)
  function setupAudioSynth() {
    const soundToggle = document.getElementById('sound-toggle-btn');
    if (!soundToggle) return;

    soundToggle.addEventListener('click', () => {
      if (!audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioCtx();

        // Oscillator for pleasant cyber hum
        const osc = audioContext.createOscillator();
        const filter = audioContext.createBiquadFilter();
        synthGain = audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, audioContext.currentTime); // A2 note

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, audioContext.currentTime);

        synthGain.gain.setValueAtTime(0.08, audioContext.currentTime);

        osc.connect(filter);
        filter.connect(synthGain);
        synthGain.connect(audioContext.destination);

        osc.start();
        isSoundOn = true;
        soundToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
        soundToggle.setAttribute('title', 'Mute Ambient Audio');
      } else {
        if (isSoundOn) {
          synthGain.gain.setValueAtTime(0, audioContext.currentTime);
          isSoundOn = false;
          soundToggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
          soundToggle.setAttribute('title', 'Unmute Ambient Audio');
        } else {
          synthGain.gain.setValueAtTime(0.08, audioContext.currentTime);
          isSoundOn = true;
          soundToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
          soundToggle.setAttribute('title', 'Mute Ambient Audio');
        }
      }
    });
  }

  // Setup HUD Buttons (Semesters, Drawer close, Reset Camera)
  function setupHUDButtons() {
    document.getElementById('close-drawer-btn')?.addEventListener('click', () => {
      document.getElementById('node-inspector-drawer')?.classList.remove('active');
    });

    document.getElementById('reset-camera-btn')?.addEventListener('click', () => {
      focusCameraOn([0, 0, 0]);
    });

    const semButtons = document.querySelectorAll('.space-sem-btn');
    semButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        semButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const semCode = btn.getAttribute('data-semester');
        if (semCode === 'ALL') {
          focusCameraOn([0, 0, 0]);
        } else if (SEMESTER_CLUSTERS[semCode]) {
          focusCameraOn(SEMESTER_CLUSTERS[semCode].pos);
        }
      });
    });
  }

  function animate() {
    requestAnimationFrame(animate);

    if (controls) controls.update();

    // Gentle rotation of the whole galaxy & nodes
    nodesGroup.rotation.y += 0.0006;
    linesGroup.rotation.y += 0.0006;
    starsGroup.rotation.y += 0.0002;

    renderer.render(scene, camera);
  }

  window.StudySpace = {
    init: initStudySpace
  };
})();

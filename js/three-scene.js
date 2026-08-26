/**
 * STUDYSHARE — 3D ACADEMIC TREE VISUALIZATION (Three.js)
 * Mobile-First & Responsive Adaptation:
 * - Dynamic camera framing for mobile screens (320px–767px)
 * - Auto-optimized particle count & resolution based on device capability
 * - Touch drag rotation (single finger) and pinch zoom (two fingers)
 * - Bi-directional 2D / 3D Fallback Mode toggle
 * - Respects prefers-reduced-motion
 */

(function () {
  'use strict';

  let scene, camera, renderer, container;
  let nodesGroup, linesGroup, particlesGroup;
  let raycaster, mouse;
  let hoveredNode = null;
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  let initialPinchDistance = null;
  let targetRotation = { x: 0.15, y: -0.2 };
  let currentRotation = { x: 0.15, y: -0.2 };
  let animId = null;
  let is2DMode = false;

  // Node Color Scheme
  const COLORS = {
    root: 0x38bdf8,
    co3k: 0x38bdf8,
    co4k: 0x818cf8,
    co5k: 0xa855f7,
    co6k: 0x10b981,
    line: 0x475569,
    lineGlow: 0x38bdf8
  };

  // Node Data Hierarchy
  const ACADEMIC_GRAPH = {
    title: "STUDYSHARE",
    type: "root",
    color: COLORS.root,
    size: 2.2,
    pos: [0, 1.8, 0],
    children: [
      {
        title: "CO3K",
        type: "semester",
        color: COLORS.co3k,
        size: 1.6,
        pos: [-5.5, 0.4, -1.2],
        subjects: [
          { name: "DBMS", fullName: "Database Management System", pos: [-7.8, -1.8, -1.5] },
          { name: "DTE", fullName: "Digital Techniques", pos: [-6.8, -2.6, 0.4] },
          { name: "DSU", fullName: "Data Structures Using C", pos: [-5.2, -2.8, -2.2] },
          { name: "OOPS", fullName: "Object Oriented Programming (C++)", pos: [-4.2, -2.4, 0.8] }
        ]
      },
      {
        title: "CO4K",
        type: "semester",
        color: COLORS.co4k,
        size: 1.6,
        pos: [-1.8, 0.2, 2.0],
        subjects: [
          { name: "DCN", fullName: "Data Communication & Networks", pos: [-2.6, -2.2, 3.4] },
          { name: "Java", fullName: "Java Programming", pos: [-1.2, -2.5, 2.2] },
          { name: "MIC", fullName: "Microprocessor & Interfacing", pos: [-0.2, -2.2, 3.8] }
        ]
      },
      {
        title: "CO5K",
        type: "semester",
        color: COLORS.co5k,
        size: 1.6,
        pos: [2.2, 0.3, -1.5],
        subjects: [
          { name: "ACN", fullName: "Advanced Computer Networks", pos: [1.2, -2.3, -3.0] },
          { name: "OSY", fullName: "Operating Systems", pos: [2.6, -2.6, -2.4] },
          { name: "Software Testing", fullName: "Software Testing", pos: [3.8, -2.2, -1.2] }
        ]
      },
      {
        title: "CO6K",
        type: "semester",
        color: COLORS.co6k,
        size: 1.6,
        pos: [5.8, 0.5, 1.2],
        subjects: [
          { name: "Machine Learning", fullName: "Machine Learning", pos: [4.6, -2.4, 2.6] },
          { name: "Management", fullName: "Management Principles", pos: [6.2, -2.6, 1.8] },
          { name: "NIS", fullName: "Network & Information Security", pos: [7.6, -2.1, 2.2] }
        ]
      }
    ]
  };

  const interactiveMeshObjects = [];

  function getOptimalCameraZ(width) {
    if (width < 360) return 27;
    if (width < 480) return 24;
    if (width < 768) return 21;
    if (width < 1024) return 19;
    return 17;
  }

  function initHeroScene() {
    container = document.getElementById('hero-3d-canvas-container');
    if (!container) return;

    // Check WebGL availability
    if (!window.WebGLRenderingContext) {
      show2DFallback();
      return;
    }

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 320;
    const isMobile = width < 768;

    // Scene
    scene = new THREE.Scene();

    // Camera with dynamic framing for mobile
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.5, getOptimalCameraZ(width));

    // Renderer with mobile pixel ratio cap to conserve battery
    renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.shadowMap.enabled = false;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x38bdf8, 1.6, 50);
    pointLight1.position.set(5, 10, 10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xa855f7, 1.2, 50);
    pointLight2.position.set(-8, -5, -5);
    scene.add(pointLight2);

    // Groups
    nodesGroup = new THREE.Group();
    linesGroup = new THREE.Group();
    particlesGroup = new THREE.Group();

    scene.add(linesGroup);
    scene.add(nodesGroup);
    scene.add(particlesGroup);

    // Build Graph
    buildAcademicGraph();

    // Subtle floating particles (less on mobile)
    buildParticleStarfield(isMobile ? 120 : 350);

    // Raycaster & interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    setupInteractions();
    animate();

    // Handle Window Resize
    window.addEventListener('resize', onWindowResize);

    // Setup 2D Fallback toggle button if present
    const toggle2DBtn = document.getElementById('toggle-hero-2d-btn');
    if (toggle2DBtn) {
      toggle2DBtn.addEventListener('click', toggle2DView);
    }
  }

  // Create visual node sphere with glowing outer ring
  function createNodeMesh(title, subTitle, type, color, size, pos, extraData = {}) {
    const group = new THREE.Group();
    group.position.set(pos[0], pos[1], pos[2]);

    const isMobile = window.innerWidth < 768;
    const segs = isMobile ? 16 : 24;

    // Core Sphere
    const geom = new THREE.SphereGeometry(size * 0.45, segs, segs);
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.25,
      metalness: 0.7,
      emissive: color,
      emissiveIntensity: 0.35
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.userData = {
      title,
      subTitle,
      type,
      extraData,
      originalColor: color
    };

    group.add(mesh);
    interactiveMeshObjects.push(mesh);

    // Outer Glow Ring for Semesters and Root
    if (type === 'root' || type === 'semester') {
      const ringGeom = new THREE.RingGeometry(size * 0.6, size * 0.75, segs);
      const ringMat = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    return group;
  }

  function createConnectingLine(pos1, pos2, color = COLORS.line) {
    const points = [
      new THREE.Vector3(pos1[0], pos1[1], pos1[2]),
      new THREE.Vector3(pos2[0], pos2[1], pos2[2])
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.35,
      linewidth: 1
    });
    return new THREE.Line(geometry, material);
  }

  function buildAcademicGraph() {
    const rootNode = createNodeMesh(
      ACADEMIC_GRAPH.title,
      "GPJ 2023–2026 Hub",
      ACADEMIC_GRAPH.type,
      ACADEMIC_GRAPH.color,
      ACADEMIC_GRAPH.size,
      ACADEMIC_GRAPH.pos,
      { code: "ROOT" }
    );
    nodesGroup.add(rootNode);

    ACADEMIC_GRAPH.children.forEach(sem => {
      const semNode = createNodeMesh(
        sem.title,
        sem.title + " Curriculum",
        sem.type,
        sem.color,
        sem.size,
        sem.pos,
        { semester: sem.title }
      );
      nodesGroup.add(semNode);

      const semLine = createConnectingLine(ACADEMIC_GRAPH.pos, sem.pos, sem.color);
      linesGroup.add(semLine);

      sem.subjects.forEach(subj => {
        const subjNode = createNodeMesh(
          subj.name,
          subj.fullName,
          "subject",
          sem.color,
          1.0,
          subj.pos,
          { semester: sem.title, subject: subj.name }
        );
        nodesGroup.add(subjNode);

        const subjLine = createConnectingLine(sem.pos, subj.pos, 0x64748b);
        linesGroup.add(subjLine);
      });
    });
  }

  function buildParticleStarfield(count = 350) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 50;
      positions[i + 1] = (Math.random() - 0.5) * 50;
      positions[i + 2] = (Math.random() - 0.5) * 50;

      colors[i] = 0.2 + Math.random() * 0.4;
      colors[i + 1] = 0.6 + Math.random() * 0.4;
      colors[i + 2] = 0.95;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.45
    });

    const particleSystem = new THREE.Points(geometry, material);
    particlesGroup.add(particleSystem);
  }

  function setupInteractions() {
    const dom = renderer.domElement;

    // Mouse drag
    dom.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    dom.addEventListener('mousemove', (e) => {
      const rect = dom.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        targetRotation.y += deltaX * 0.006;
        targetRotation.x += deltaY * 0.006;
        targetRotation.x = Math.max(-0.6, Math.min(0.6, targetRotation.x));

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }

      checkIntersection();
    });

    // Touch Support for mobile (1 finger drag, 2 fingers pinch zoom)
    dom.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        isDragging = false;
        initialPinchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    dom.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - previousMousePosition.x;
        const deltaY = e.touches[0].clientY - previousMousePosition.y;

        targetRotation.y += deltaX * 0.008;
        targetRotation.x += deltaY * 0.008;
        targetRotation.x = Math.max(-0.6, Math.min(0.6, targetRotation.x));

        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2 && initialPinchDistance) {
        const currentDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const diff = initialPinchDistance - currentDistance;
        camera.position.z += diff * 0.05;
        camera.position.z = Math.max(12, Math.min(32, camera.position.z));
        initialPinchDistance = currentDistance;
      }
    }, { passive: true });

    dom.addEventListener('touchend', () => {
      isDragging = false;
      initialPinchDistance = null;
    });

    // Click / Tap Navigation
    dom.addEventListener('click', () => {
      if (hoveredNode) {
        const data = hoveredNode.userData;
        if (data.type === 'semester') {
          window.location.href = `notes.html?semester=${data.extraData.semester}`;
        } else if (data.type === 'subject') {
          window.location.href = `notes.html?semester=${data.extraData.semester}&subject=${encodeURIComponent(data.extraData.subject)}`;
        } else if (data.type === 'root') {
          window.location.href = 'notes.html';
        }
      }
    });

    // Zoom on wheel
    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      camera.position.z += e.deltaY * 0.01;
      camera.position.z = Math.max(12, Math.min(30, camera.position.z));
    }, { passive: false });
  }

  function checkIntersection() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveMeshObjects);
    const tooltipPill = document.getElementById('hero-3d-tooltip');

    if (intersects.length > 0) {
      const topIntersect = intersects[0].object;

      if (hoveredNode !== topIntersect) {
        if (hoveredNode) {
          hoveredNode.parent.scale.set(1, 1, 1);
        }
        hoveredNode = topIntersect;
        hoveredNode.parent.scale.set(1.25, 1.25, 1.25);
        document.body.style.cursor = 'pointer';

        if (tooltipPill) {
          tooltipPill.innerHTML = `
            <i class="fas fa-cube" style="color: var(--brand-primary);"></i>
            <span><strong>${hoveredNode.userData.title}</strong> — ${hoveredNode.userData.subTitle} (Tap to explore)</span>
          `;
        }
      }
    } else {
      if (hoveredNode) {
        hoveredNode.parent.scale.set(1, 1, 1);
        hoveredNode = null;
        document.body.style.cursor = 'default';

        if (tooltipPill) {
          tooltipPill.innerHTML = `
            <i class="fas fa-hand-pointer"></i>
            <span>Touch & drag to rotate • Tap node to view notes</span>
          `;
        }
      }
    }
  }

  function animate() {
    animId = requestAnimationFrame(animate);

    // Reduced motion check
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
      currentRotation.x += (targetRotation.x - currentRotation.x) * 0.08;
      currentRotation.y += (targetRotation.y - currentRotation.y) * 0.08;

      if (!isDragging) {
        targetRotation.y += 0.0012;
      }

      nodesGroup.rotation.y = currentRotation.y;
      nodesGroup.rotation.x = currentRotation.x;
      linesGroup.rotation.y = currentRotation.y;
      linesGroup.rotation.x = currentRotation.x;

      particlesGroup.rotation.y += 0.0004;
    }

    renderer.render(scene, camera);
  }

  function onWindowResize() {
    if (!container || !renderer || !camera) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.position.z = getOptimalCameraZ(width);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function toggle2DView() {
    is2DMode = !is2DMode;
    const fallbackEl = document.getElementById('tree-fallback-view');
    const canvasCard = document.getElementById('hero-canvas-card');
    const toggleBtn = document.getElementById('toggle-hero-2d-btn');

    if (is2DMode) {
      if (fallbackEl) fallbackEl.classList.add('active');
      if (canvasCard) canvasCard.classList.add('hide-canvas');
      if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-cube"></i> Switch to 3D Space';
    } else {
      if (fallbackEl) fallbackEl.classList.remove('active');
      if (canvasCard) canvasCard.classList.remove('hide-canvas');
      if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-sitemap"></i> 2D Academic View';
      onWindowResize();
    }
  }

  function show2DFallback() {
    toggle2DView();
  }

  window.StudyShare3D = {
    init: initHeroScene,
    toggle2D: toggle2DView,
    showFallback: show2DFallback
  };
})();

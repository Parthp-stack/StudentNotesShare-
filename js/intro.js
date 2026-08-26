/**
 * STUDYSHARE — STARTUP EXPERIENCE & INTRO PURPOSE WINDOW CONTROLLER
 * GPJ 2023–2026 Notes Hub
 * 
 * Final Manual Workflow:
 * - Full-screen introductory Purpose Window on first visit
 * - Waits INDEFINITELY for the student to read the purpose
 * - NO automatic 4–5 second redirect
 * - Prominent, touch-friendly "Next →" button (48–56px height)
 * - On clicking "Next →": shows a short 1.2s loading transition
 *   ("Preparing your Study Space...") with 3D animation, then smoothly
 *   fades out to reveal index.html
 * - Returning visitor preference stored in localStorage
 */

(function () {
  'use strict';

  const INTRO_SEEN_KEY = 'studyshare_intro_seen';
  const INTRO_SKIP_KEY = 'studyshare_intro_skip';
  const LOADING_TRANSITION_MS = 1200; // 1.2 second loading transition after clicking Next

  let introOverlay;
  let progressContainer;
  let progressBar;
  let statusText;
  let nextBtn;
  let skipCheckbox;
  let isTransitioning = false;
  let isDismissed = false;

  // Three.js Intro Scene Variables
  let introScene, introCamera, introRenderer, introAnimId;
  let introObjectsGroup, introParticlesGroup;

  function initStartupIntro() {
    introOverlay = document.getElementById('startup-intro-overlay');
    if (!introOverlay) return;

    progressContainer = document.getElementById('intro-progress-container');
    progressBar = document.getElementById('intro-progress-fill');
    statusText = document.getElementById('intro-status-text');
    nextBtn = document.getElementById('btn-enter-studyshare');
    skipCheckbox = document.getElementById('intro-skip-checkbox');

    // Check if user explicitly requested intro via URL query: ?intro=1
    const urlParams = new URLSearchParams(window.location.search);
    const forceIntro = urlParams.get('intro') === '1';

    // Check returning visitor state
    const hasSeenIntro = localStorage.getItem(INTRO_SEEN_KEY);
    const hasSkippedFuture = localStorage.getItem(INTRO_SKIP_KEY) === 'true';

    if (!forceIntro && hasSeenIntro && hasSkippedFuture) {
      // Returning visitor who chose to skip future intros
      introOverlay.style.display = 'none';
      return;
    }

    // Initialize the 3D academic visualization & wait indefinitely for the user to click Next
    initIntro3D();
    setupEventListeners();
  }

  function setupEventListeners() {
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleNextClick();
      });
    }

    if (skipCheckbox) {
      skipCheckbox.addEventListener('change', () => {
        localStorage.setItem(INTRO_SKIP_KEY, skipCheckbox.checked ? 'true' : 'false');
      });
    }

    // Keyboard support: Enter key or Space bar triggers Next
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !isTransitioning && !isDismissed && introOverlay && introOverlay.style.display !== 'none') {
        // Only if not typing in an input
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
        e.preventDefault();
        handleNextClick();
      }
    });
  }

  // Triggered exclusively when user clicks "Next →"
  function handleNextClick() {
    if (isTransitioning || isDismissed) return;
    isTransitioning = true;

    // Save seen state in localStorage
    localStorage.setItem(INTRO_SEEN_KEY, 'true');
    if (skipCheckbox && skipCheckbox.checked) {
      localStorage.setItem(INTRO_SKIP_KEY, 'true');
    }

    // Show optional short loading transition (Requirement #4)
    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.innerHTML = `
        <span>Preparing your Study Space…</span>
        <i class="fas fa-circle-notch fa-spin" style="font-size: 1rem;"></i>
      `;
      nextBtn.style.background = 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)';
    }

    if (progressContainer) {
      progressContainer.style.display = 'block';
    }
    if (statusText) {
      statusText.textContent = 'Preparing your Study Space…';
    }

    // Animate the progress bar from 0% to 100% over ~1.2s
    const startTime = performance.now();
    function animateTransition(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / LOADING_TRANSITION_MS, 1);
      const percent = Math.floor(progress * 100);

      if (progressBar) {
        progressBar.style.width = percent + '%';
      }

      if (progress < 1) {
        requestAnimationFrame(animateTransition);
      } else {
        dismissIntro();
      }
    }

    requestAnimationFrame(animateTransition);
  }

  function dismissIntro() {
    if (isDismissed) return;
    isDismissed = true;

    // Smooth fade out + scale up transition
    if (introOverlay) {
      introOverlay.classList.add('dismissed');

      setTimeout(() => {
        introOverlay.style.display = 'none';
        cleanupIntro3D();

        // If running on standalone intro.html, navigate to index.html
        if (window.location.pathname.endsWith('intro.html')) {
          window.location.href = 'index.html';
          return;
        }

        // Dispatch event in case homepage components want to trigger entrance
        window.dispatchEvent(new CustomEvent('studyshare:intro-completed'));
      }, 650);
    }
  }

  // --------------------------------------------------------------------------
  // Three.js 3D Academic Visualization for Intro Backdrop
  // --------------------------------------------------------------------------
  function initIntro3D() {
    const canvasContainer = document.getElementById('intro-3d-canvas');
    if (!canvasContainer || typeof THREE === 'undefined') {
      showIntro2DFallback();
      return;
    }

    if (!window.WebGLRenderingContext) {
      showIntro2DFallback();
      return;
    }

    try {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width < 768;

      introScene = new THREE.Scene();
      introCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      introCamera.position.set(0, 1.2, isMobile ? 18 : 13);

      introRenderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
      introRenderer.setSize(width, height);
      introRenderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
      canvasContainer.appendChild(introRenderer.domElement);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
      introScene.add(ambientLight);

      const light1 = new THREE.PointLight(0x38bdf8, 2, 40);
      light1.position.set(6, 8, 8);
      introScene.add(light1);

      const light2 = new THREE.PointLight(0xa855f7, 1.8, 40);
      light2.position.set(-6, -6, -6);
      introScene.add(light2);

      // Groups
      introObjectsGroup = new THREE.Group();
      introParticlesGroup = new THREE.Group();
      introScene.add(introObjectsGroup);
      introScene.add(introParticlesGroup);

      buildIntroAcademicMeshes(isMobile);
      buildIntroParticles(isMobile ? 100 : 260);

      animateIntro3D();

      window.addEventListener('resize', onIntroResize);
    } catch (err) {
      console.warn('Three.js intro setup warning:', err);
      showIntro2DFallback();
    }
  }

  function buildIntroAcademicMeshes(isMobile) {
    const segments = isMobile ? 12 : 20;

    // 1. Center Floating 3D Book / Binder Model
    const bookGroup = new THREE.Group();

    // Book Covers (Blue & Purple)
    const coverGeom = new THREE.BoxGeometry(2.4, 3.2, 0.15);
    const coverMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.6,
      roughness: 0.2,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35
    });
    const frontCover = new THREE.Mesh(coverGeom, coverMat);
    frontCover.position.set(0, 0, 0.1);
    bookGroup.add(frontCover);

    // Book Pages (Glow White)
    const pageGeom = new THREE.BoxGeometry(2.2, 3.0, 0.25);
    const pageMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.4,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.15
    });
    const pages = new THREE.Mesh(pageGeom, pageMat);
    bookGroup.add(pages);

    // Back Cover
    const backCover = new THREE.Mesh(coverGeom, coverMat);
    backCover.position.set(0, 0, -0.15);
    bookGroup.add(backCover);

    bookGroup.rotation.y = -0.35;
    bookGroup.rotation.x = 0.25;
    introObjectsGroup.add(bookGroup);

    // 2. Orbital Academic Nodes (CO3K, CO4K, CO5K, CO6K)
    const semColors = [0x38bdf8, 0x818cf8, 0xa855f7, 0x10b981];
    const radius = isMobile ? 4.2 : 5.4;

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (i % 2 === 0 ? 0.8 : -0.8);

      const sphereGeom = new THREE.SphereGeometry(0.55, segments, segments);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: semColors[i],
        emissive: semColors[i],
        emissiveIntensity: 0.45,
        roughness: 0.3
      });
      const node = new THREE.Mesh(sphereGeom, sphereMat);
      node.position.set(x, y, z);
      introObjectsGroup.add(node);

      // Orbital Ring connecting nodes
      const ringGeom = new THREE.RingGeometry(0.7, 0.85, segments);
      const ringMat = new THREE.MeshBasicMaterial({
        color: semColors[i],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.set(x, y, z);
      ring.rotation.x = Math.PI / 2;
      introObjectsGroup.add(ring);
    }

    // 3. Glowing Global Orbital Ring
    const orbitGeom = new THREE.TorusGeometry(radius, 0.04, 8, 48);
    const orbitMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35
    });
    const orbit = new THREE.Mesh(orbitGeom, orbitMat);
    orbit.rotation.x = Math.PI / 2.3;
    introObjectsGroup.add(orbit);
  }

  function buildIntroParticles(count) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 35;
      positions[i + 1] = (Math.random() - 0.5) * 25;
      positions[i + 2] = (Math.random() - 0.5) * 25;

      colors[i] = 0.2 + Math.random() * 0.4;
      colors[i + 1] = 0.6 + Math.random() * 0.4;
      colors[i + 2] = 0.95;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.55
    });

    const particles = new THREE.Points(geometry, material);
    introParticlesGroup.add(particles);
  }

  function animateIntro3D() {
    if (isDismissed) return;

    introAnimId = requestAnimationFrame(animateIntro3D);

    const time = performance.now() * 0.001;

    if (introObjectsGroup) {
      introObjectsGroup.rotation.y += 0.0035;
      introObjectsGroup.position.y = Math.sin(time * 1.4) * 0.22;
    }

    if (introParticlesGroup) {
      introParticlesGroup.rotation.y += 0.0008;
    }

    if (introRenderer && introScene && introCamera) {
      introRenderer.render(introScene, introCamera);
    }
  }

  function onIntroResize() {
    if (!introRenderer || !introCamera) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    introCamera.aspect = width / height;
    introCamera.position.z = width < 768 ? 18 : 13;
    introCamera.updateProjectionMatrix();
    introRenderer.setSize(width, height);
  }

  function showIntro2DFallback() {
    const fallbackIcon = document.getElementById('intro-2d-fallback-icon');
    if (fallbackIcon) {
      fallbackIcon.style.display = 'flex';
    }
  }

  function cleanupIntro3D() {
    if (introAnimId) {
      cancelAnimationFrame(introAnimId);
    }
    window.removeEventListener('resize', onIntroResize);
    if (introRenderer && introRenderer.domElement && introRenderer.domElement.parentNode) {
      introRenderer.domElement.parentNode.removeChild(introRenderer.domElement);
    }
  }

  // Replay Functionality (can be called from navbar or footer)
  function replayIntro() {
    isDismissed = false;
    isTransitioning = false;
    if (introOverlay) {
      introOverlay.style.display = 'flex';
      introOverlay.classList.remove('dismissed');

      if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.innerHTML = '<span>Next &rarr;</span>';
        nextBtn.style.background = '';
      }
      if (progressContainer) {
        progressContainer.style.display = 'none';
      }
      if (progressBar) {
        progressBar.style.width = '0%';
      }

      initIntro3D();
    }
  }

  // Expose to window
  window.StudyShareIntro = {
    replay: replayIntro,
    dismiss: dismissIntro,
    next: handleNextClick
  };

  // Run immediately on DOM load
  document.addEventListener('DOMContentLoaded', initStartupIntro);
})();

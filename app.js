/**
 * epay IT — Presentation Display
 * Parses PPTX files client-side, extracts slide content, and plays them in a loop.
 */

// ===== Constants =====
const DB_NAME = 'epayITDB';
const DB_VERSION = 1;
const STORE_NAME = 'slides';
const SETTINGS_KEY = 'epayit_settings';
const ACCESS_CODE = '121314';

// ===== State =====
const state = {
  slides: [],          // Array of { type: 'image'|'canvas'|'html', data: ... }
  currentIndex: 0,
  isPlaying: false,
  timer: null,
  progressTimer: null,
  progressStart: 0,
  controlsTimeout: null,
  settings: {
    duration: 5,
    transition: 'fade',
    speed: 800,
    bgColor: '#0a0a0f',
    fitMode: 'contain',
  },
};

// ===== DOM Elements =====
const dom = {};

function cacheDom() {
  // Login
  dom.loginScreen = document.getElementById('login-screen');
  dom.loginPassword = document.getElementById('login-password');
  dom.loginError = document.getElementById('login-error');
  dom.btnLogin = document.getElementById('btn-login');
  // Upload
  dom.uploadScreen = document.getElementById('upload-screen');
  dom.slideshowScreen = document.getElementById('slideshow-screen');
  dom.dropZone = document.getElementById('drop-zone');
  dom.fileInput = document.getElementById('file-input');
  dom.uploadProgress = document.getElementById('upload-progress');
  dom.progressFilename = document.getElementById('progress-filename');
  dom.progressPercent = document.getElementById('progress-percent');
  dom.progressFill = document.getElementById('progress-fill');
  dom.progressStatus = document.getElementById('progress-status');
  dom.existingSlides = document.getElementById('existing-slides');
  dom.existingCount = document.getElementById('existing-count');
  dom.btnPlayExisting = document.getElementById('btn-play-existing');
  dom.btnReplace = document.getElementById('btn-replace');
  dom.btnClear = document.getElementById('btn-clear');
  dom.slideContainer = document.getElementById('slide-container');
  dom.slideCurrent = document.getElementById('slide-current');
  dom.slideNext = document.getElementById('slide-next');
  dom.progressBar = document.getElementById('slide-progress-fill');
  dom.currentNum = document.getElementById('current-slide-num');
  dom.totalNum = document.getElementById('total-slides-num');
  dom.controlsOverlay = document.getElementById('controls-overlay');
  dom.btnPrev = document.getElementById('btn-prev');
  dom.btnPause = document.getElementById('btn-pause');
  dom.btnNext = document.getElementById('btn-next');
  dom.btnFullscreen = document.getElementById('btn-fullscreen');
  dom.btnSettings = document.getElementById('btn-settings');
  dom.btnBack = document.getElementById('btn-back');
  dom.iconPause = document.getElementById('icon-pause');
  dom.iconPlay = document.getElementById('icon-play');
  dom.settingsPanel = document.getElementById('settings-panel');
  dom.btnCloseSettings = document.getElementById('btn-close-settings');
  dom.slideDuration = document.getElementById('slide-duration');
  dom.durationValue = document.getElementById('duration-value');
  dom.transitionType = document.getElementById('transition-type');
  dom.transitionSpeed = document.getElementById('transition-speed');
  dom.speedValue = document.getElementById('speed-value');
  dom.bgColor = document.getElementById('bg-color');
  dom.fitMode = document.getElementById('fit-mode');
}

// ===== IndexedDB =====
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function saveSlides(slides) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.clear();
  slides.forEach(slide => store.add(slide));
  return new Promise((resolve) => { tx.oncomplete = resolve; });
}

async function loadSlides() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const req = store.getAll();
  return new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result || []);
  });
}

async function clearSlides() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  return new Promise((resolve) => { tx.oncomplete = resolve; });
}

// ===== Settings Persistence =====
function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (saved) Object.assign(state.settings, saved);
  } catch (e) { /* ignore */ }
}

// ===== Toast =====
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ===== Progress Helpers =====
function showProgress(filename) {
  dom.uploadProgress.classList.remove('hidden');
  dom.progressFilename.textContent = filename;
  dom.progressPercent.textContent = '0%';
  dom.progressFill.style.width = '0%';
  dom.progressStatus.textContent = 'Processing slides…';
}

function updateProgress(percent, status) {
  dom.progressPercent.textContent = `${Math.round(percent)}%`;
  dom.progressFill.style.width = `${percent}%`;
  if (status) dom.progressStatus.textContent = status;
}

function hideProgress() {
  dom.uploadProgress.classList.add('hidden');
}

// ===== File Handling =====
async function handleFiles(files) {
  if (!files || files.length === 0) return;

  const file = files[0];
  const ext = file.name.split('.').pop().toLowerCase();

  showProgress(file.name);

  try {
    let slides = [];

    if (ext === 'pptx') {
      slides = await parsePPTX(file);
    } else if (ext === 'pdf') {
      slides = await parsePDF(file);
    } else if (['png', 'jpg', 'jpeg'].includes(ext)) {
      // Multiple image files
      slides = await parseImages(files);
    } else {
      showToast('Unsupported file format. Use PPTX, PDF, or images.', 'error');
      hideProgress();
      return;
    }

    if (slides.length === 0) {
      showToast('No slides could be extracted from this file.', 'error');
      hideProgress();
      return;
    }

    updateProgress(90, 'Saving slides…');
    state.slides = slides;
    await saveSlides(slides);

    updateProgress(100, 'Done!');
    showToast(`Loaded ${slides.length} slide${slides.length > 1 ? 's' : ''}`, 'success');

    setTimeout(() => {
      hideProgress();
      updateExistingUI();
      startSlideshow();
    }, 500);

  } catch (err) {
    console.error('File processing error:', err);
    showToast('Error processing file: ' + err.message, 'error');
    hideProgress();
  }
}

// ===== PPTX Parser =====
async function parsePPTX(file) {
  if (typeof JSZip === 'undefined') {
    showToast('JSZip library not loaded. Please check your internet connection.', 'error');
    return [];
  }

  updateProgress(10, 'Reading PPTX file…');
  const arrayBuffer = await file.arrayBuffer();

  let zip;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch (e) {
    showToast('Invalid PPTX file — could not read as ZIP archive.', 'error');
    console.error('JSZip error:', e);
    return [];
  }

  updateProgress(20, 'Extracting slides…');

  // Get slide order from presentation.xml
  const slideOrder = await getSlideOrder(zip);
  if (slideOrder.length === 0) {
    showToast('No slides found in this PPTX file.', 'error');
    return [];
  }

  const slides = [];

  // Extract all media files (images) from ppt/media/
  const mediaFiles = {};
  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (path.startsWith('ppt/media/') && !zipEntry.dir) {
      try {
        const blob = await zipEntry.async('blob');
        const url = URL.createObjectURL(blob);
        const name = path.split('/').pop();
        mediaFiles[name] = url;
      } catch (e) {
        console.warn('Could not extract media file:', path, e);
      }
    }
  }

  // Process each slide
  for (let i = 0; i < slideOrder.length; i++) {
    const slideFile = slideOrder[i];
    const progress = 20 + (i / slideOrder.length) * 65;
    updateProgress(progress, `Processing slide ${i + 1} of ${slideOrder.length}…`);

    try {
      const slideData = await extractSlideContent(zip, slideFile, mediaFiles);
      if (slideData) {
        slides.push(slideData);
      }
    } catch (e) {
      console.warn(`Could not process slide ${i + 1}:`, e);
    }
  }

  // Fallback: if no slide content was extracted, use all media images as slides
  if (slides.length === 0 && Object.keys(mediaFiles).length > 0) {
    const sortedMedia = Object.entries(mediaFiles).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [, url] of sortedMedia) {
      try {
        const imgData = await blobUrlToDataUrl(url);
        slides.push({ type: 'image', data: imgData });
      } catch (e) {
        console.warn('Could not convert media to data URL:', e);
      }
    }
  }

  return slides;
}

async function getSlideOrder(zip) {
  // Fallback function to find slides by filename pattern
  function findSlidesByFilename() {
    return Object.keys(zip.files)
      .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)/)[1]);
        const numB = parseInt(b.match(/slide(\d+)/)[1]);
        return numA - numB;
      });
  }

  const presXml = zip.file('ppt/presentation.xml');
  if (!presXml) return findSlidesByFilename();

  try {
    const text = await presXml.async('text');
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');

    // Try to get sldId nodes (may be namespaced)
    let sldIdNodes = doc.querySelectorAll('sldId');
    if (sldIdNodes.length === 0) {
      // Try with namespace
      sldIdNodes = doc.getElementsByTagNameNS('*', 'sldId');
    }

    if (!sldIdNodes || sldIdNodes.length === 0) {
      return findSlidesByFilename();
    }

    // Parse relationships file
    const relsFile = zip.file('ppt/_rels/presentation.xml.rels');
    if (!relsFile) return findSlidesByFilename();

    const relsText = await relsFile.async('text');
    const relsDoc = parser.parseFromString(relsText, 'application/xml');
    const rels = {};
    const relNodes = relsDoc.querySelectorAll('Relationship');
    if (relNodes.length === 0) {
      // Try with namespace
      const nsRelNodes = relsDoc.getElementsByTagNameNS('*', 'Relationship');
      for (const rel of nsRelNodes) {
        rels[rel.getAttribute('Id')] = rel.getAttribute('Target');
      }
    } else {
      relNodes.forEach(rel => {
        rels[rel.getAttribute('Id')] = rel.getAttribute('Target');
      });
    }

    const slideFiles = [];
    for (const node of sldIdNodes) {
      const rId = node.getAttribute('r:id') ||
        node.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      if (rId && rels[rId]) {
        const target = rels[rId];
        const fullPath = target.startsWith('/') ? target.slice(1) : 'ppt/' + target;
        if (zip.file(fullPath)) {
          slideFiles.push(fullPath);
        }
      }
    }

    return slideFiles.length > 0 ? slideFiles : findSlidesByFilename();
  } catch (e) {
    console.warn('Error parsing presentation.xml:', e);
    return findSlidesByFilename();
  }
}

async function extractSlideContent(zip, slidePath, mediaFiles) {
  const slideFile = zip.file(slidePath);
  if (!slideFile) return null;

  const text = await slideFile.async('text');
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');

  // Get slide relationships for images
  const slideNum = slidePath.match(/slide(\d+)/)?.[1];
  const relsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
  const relsFile = zip.file(relsPath);

  let imageRels = {};
  if (relsFile) {
    try {
      const relsText = await relsFile.async('text');
      const relsDoc = parser.parseFromString(relsText, 'application/xml');
      let relNodes = relsDoc.querySelectorAll('Relationship');
      if (relNodes.length === 0) {
        relNodes = relsDoc.getElementsByTagNameNS('*', 'Relationship');
      }
      for (const rel of relNodes) {
        const type = rel.getAttribute('Type') || '';
        if (type.includes('image')) {
          const target = rel.getAttribute('Target');
          const filename = target.split('/').pop();
          imageRels[rel.getAttribute('Id')] = filename;
        }
      }
    } catch (e) {
      console.warn('Error parsing slide rels:', e);
    }
  }

  // Extract all text content using getElementsByTagNameNS for robust namespace handling
  const texts = [];
  const allTextNodes = doc.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main', 't');
  if (allTextNodes.length === 0) {
    // Fallback: try without namespace
    const fallbackNodes = doc.querySelectorAll('t');
    for (const t of fallbackNodes) {
      const content = t.textContent.trim();
      if (content) texts.push(content);
    }
  } else {
    for (const t of allTextNodes) {
      const content = t.textContent.trim();
      if (content) texts.push(content);
    }
  }

  // Try to identify title vs body text
  let title = '';
  let bodyTexts = [];

  const spNodes = doc.getElementsByTagNameNS('*', 'sp');
  for (const sp of spNodes) {
    // Check for placeholder type to identify title shapes
    let isTitle = false;
    const phNodes = sp.getElementsByTagNameNS('*', 'ph');
    for (const ph of phNodes) {
      const type = ph.getAttribute('type');
      if (type === 'title' || type === 'ctrTitle') {
        isTitle = true;
        break;
      }
    }

    // Get text from this shape
    const spTexts = [];
    const tNodes = sp.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main', 't');
    const fallbackTNodes = tNodes.length > 0 ? tNodes : sp.querySelectorAll('t');
    for (const t of fallbackTNodes) {
      if (t.textContent.trim()) spTexts.push(t.textContent.trim());
    }

    if (isTitle && spTexts.length > 0 && !title) {
      title = spTexts.join(' ');
    } else if (spTexts.length > 0) {
      bodyTexts.push(spTexts.join(' '));
    }
  }

  // If we couldn't identify title from placeholders, use first text
  if (!title && texts.length > 0) {
    title = texts[0];
    bodyTexts = texts.slice(1);
  }

  // Collect all images for this slide
  let slideImages = [];
  for (const [relId, filename] of Object.entries(imageRels)) {
    if (mediaFiles[filename]) {
      try {
        const imgData = await blobUrlToDataUrl(mediaFiles[filename]);
        slideImages.push(imgData);
      } catch (e) {
        console.warn('Could not convert image:', filename, e);
      }
    }
  }

  const slideImage = slideImages.length > 0 ? slideImages[0] : null;

  // If we have an image but no text, just use the image
  if (slideImage && !title && bodyTexts.length === 0) {
    return { type: 'image', data: slideImage };
  }

  // If we have text content, render it as HTML
  if (title || bodyTexts.length > 0) {
    return {
      type: 'html',
      data: {
        title: title,
        body: bodyTexts.join('\n'),
        image: slideImage,
      },
    };
  }

  // Image only
  if (slideImage) {
    return { type: 'image', data: slideImage };
  }

  return null;
}

// ===== PDF Parser =====
async function parsePDF(file) {
  if (typeof pdfjsLib === 'undefined') {
    showToast('PDF.js library not loaded. Please check your connection.', 'error');
    return [];
  }

  updateProgress(10, 'Reading PDF file…');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const slides = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const progress = 10 + (i / pdf.numPages) * 75;
    updateProgress(progress, `Rendering page ${i} of ${pdf.numPages}…`);

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    slides.push({ type: 'image', data: canvas.toDataURL('image/jpeg', 0.92) });
  }

  return slides;
}

// ===== Image Parser =====
async function parseImages(files) {
  const slides = [];
  const fileArr = Array.from(files).filter(f => /\.(png|jpe?g)$/i.test(f.name));

  for (let i = 0; i < fileArr.length; i++) {
    const progress = 10 + (i / fileArr.length) * 75;
    updateProgress(progress, `Processing image ${i + 1} of ${fileArr.length}…`);

    const dataUrl = await readFileAsDataURL(fileArr[i]);
    slides.push({ type: 'image', data: dataUrl });
  }

  return slides;
}

// ===== Utility =====
function readFileAsDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

async function blobUrlToDataUrl(blobUrl) {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

// ===== Slide Rendering =====
function renderSlide(slideData, container) {
  container.innerHTML = '';
  container.className = 'slide';

  if (!slideData) return;

  if (slideData.type === 'image') {
    const img = document.createElement('img');
    img.src = slideData.data;
    img.alt = 'Slide';
    img.draggable = false;

    if (state.settings.fitMode === 'cover') {
      container.classList.add('fit-cover');
    }

    container.appendChild(img);
  } else if (slideData.type === 'html') {
    const render = document.createElement('div');
    render.className = 'slide-render';

    if (slideData.data.title) {
      const h = document.createElement('div');
      h.className = 'slide-title';
      h.textContent = slideData.data.title;
      render.appendChild(h);
    }

    if (slideData.data.body) {
      const p = document.createElement('div');
      p.className = 'slide-body';
      p.textContent = slideData.data.body;
      render.appendChild(p);
    }

    if (slideData.data.image) {
      const img = document.createElement('img');
      img.src = slideData.data.image;
      img.className = 'slide-image';
      img.draggable = false;
      render.appendChild(img);
    }

    container.appendChild(render);
  }
}

// ===== Slideshow Engine =====
function startSlideshow() {
  if (state.slides.length === 0) return;

  switchScreen('slideshow');
  state.currentIndex = 0;
  state.isPlaying = true;

  // Apply settings
  dom.slideContainer.style.background = state.settings.bgColor;

  // Render first slide
  renderSlide(state.slides[0], dom.slideCurrent);
  dom.slideCurrent.classList.add('active');
  dom.slideNext.classList.remove('active');

  updateSlideCounter();
  updatePlayPauseIcon();
  startAutoPlay();
}

function updateSlideCounter() {
  dom.currentNum.textContent = state.currentIndex + 1;
  dom.totalNum.textContent = state.slides.length;
}

function startAutoPlay() {
  stopAutoPlay();
  if (!state.isPlaying || state.slides.length <= 1) return;

  const duration = state.settings.duration * 1000;
  state.progressStart = Date.now();

  // Animate progress bar
  state.progressTimer = setInterval(() => {
    const elapsed = Date.now() - state.progressStart;
    const pct = Math.min((elapsed / duration) * 100, 100);
    dom.progressBar.style.width = `${pct}%`;
  }, 50);

  state.timer = setTimeout(() => {
    goToNextSlide();
  }, duration);
}

function stopAutoPlay() {
  clearTimeout(state.timer);
  clearInterval(state.progressTimer);
  state.timer = null;
  state.progressTimer = null;
  dom.progressBar.style.width = '0%';
}

function goToNextSlide() {
  const nextIndex = (state.currentIndex + 1) % state.slides.length;
  transitionToSlide(nextIndex);
}

function goToPrevSlide() {
  const prevIndex = (state.currentIndex - 1 + state.slides.length) % state.slides.length;
  transitionToSlide(prevIndex);
}

function transitionToSlide(newIndex) {
  if (newIndex === state.currentIndex) return;
  stopAutoPlay();

  const transition = state.settings.transition;
  const speed = state.settings.speed;

  // Prepare next slide
  renderSlide(state.slides[newIndex], dom.slideNext);

  // Set transition speed
  dom.slideCurrent.style.transitionDuration = `${speed}ms`;
  dom.slideNext.style.transitionDuration = `${speed}ms`;

  // Add transition classes
  dom.slideCurrent.className = `slide active transition-${transition}`;
  dom.slideNext.className = `slide transition-${transition}`;

  // Trigger reflow
  void dom.slideNext.offsetHeight;

  // Animate
  dom.slideCurrent.classList.remove('active');
  dom.slideCurrent.classList.add(`exit-${transition}`);
  dom.slideNext.classList.add('active');

  // After transition, swap
  setTimeout(() => {
    // Swap references
    const temp = dom.slideCurrent;
    dom.slideCurrent = dom.slideNext;
    dom.slideNext = temp;

    // Reset old slide
    dom.slideNext.className = 'slide';
    dom.slideNext.innerHTML = '';
    dom.slideNext.style.transitionDuration = '';
    dom.slideCurrent.style.transitionDuration = '';

    state.currentIndex = newIndex;
    updateSlideCounter();

    if (state.isPlaying) {
      startAutoPlay();
    }
  }, speed + 50);
}

function togglePlayPause() {
  state.isPlaying = !state.isPlaying;
  updatePlayPauseIcon();

  if (state.isPlaying) {
    startAutoPlay();
  } else {
    stopAutoPlay();
  }
}

function updatePlayPauseIcon() {
  dom.iconPause.classList.toggle('hidden', !state.isPlaying);
  dom.iconPlay.classList.toggle('hidden', state.isPlaying);
}

// ===== Screen Management =====
function switchScreen(screen) {
  dom.loginScreen.classList.toggle('active', screen === 'login');
  dom.uploadScreen.classList.toggle('active', screen === 'upload');
  dom.slideshowScreen.classList.toggle('active', screen === 'slideshow');
}

// ===== Authentication =====
function handleLogin() {
  const password = dom.loginPassword.value;
  if (password === ACCESS_CODE) {
    dom.loginError.classList.add('hidden');
    switchScreen('upload');
  } else {
    dom.loginError.classList.remove('hidden');
    // Re-trigger shake animation
    dom.loginError.style.animation = 'none';
    void dom.loginError.offsetHeight;
    dom.loginError.style.animation = '';
    dom.loginPassword.value = '';
    dom.loginPassword.focus();
  }
}

// ===== Controls Visibility =====
let mouseTimeout;

function showControls() {
  dom.controlsOverlay.classList.add('visible');
  clearTimeout(mouseTimeout);
  mouseTimeout = setTimeout(hideControls, 3000);
}

function hideControls() {
  dom.controlsOverlay.classList.remove('visible');
}

// ===== Fullscreen =====
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => { });
  } else {
    document.exitFullscreen().catch(() => { });
  }
}

// ===== Existing Slides UI =====
function updateExistingUI() {
  if (state.slides.length > 0) {
    dom.existingSlides.classList.remove('hidden');
    dom.existingCount.textContent = `${state.slides.length} slide${state.slides.length > 1 ? 's' : ''} loaded`;
  } else {
    dom.existingSlides.classList.add('hidden');
  }
}

// ===== Event Binding =====
function bindEvents() {
  // Drop zone
  dom.dropZone.addEventListener('click', () => dom.fileInput.click());

  dom.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dom.dropZone.classList.add('drag-over');
  });

  dom.dropZone.addEventListener('dragleave', () => {
    dom.dropZone.classList.remove('drag-over');
  });

  dom.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dom.dropZone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });

  dom.fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  });

  // Existing slides actions
  dom.btnPlayExisting.addEventListener('click', () => startSlideshow());
  dom.btnReplace.addEventListener('click', () => dom.fileInput.click());
  dom.btnClear.addEventListener('click', async () => {
    await clearSlides();
    state.slides = [];
    updateExistingUI();
    showToast('All slides cleared', 'info');
  });

  // Slideshow controls
  dom.btnPrev.addEventListener('click', () => { goToPrevSlide(); showControls(); });
  dom.btnNext.addEventListener('click', () => { goToNextSlide(); showControls(); });
  dom.btnPause.addEventListener('click', () => { togglePlayPause(); showControls(); });
  dom.btnFullscreen.addEventListener('click', () => { toggleFullscreen(); showControls(); });

  dom.btnBack.addEventListener('click', () => {
    stopAutoPlay();
    state.isPlaying = false;
    switchScreen('upload');
  });

  // Controls hover/touch
  dom.slideshowScreen.addEventListener('mousemove', showControls);
  dom.slideshowScreen.addEventListener('touchstart', showControls, { passive: true });

  // Settings
  dom.btnSettings.addEventListener('click', () => {
    dom.settingsPanel.classList.toggle('hidden');
    showControls();
  });

  dom.btnCloseSettings.addEventListener('click', () => {
    dom.settingsPanel.classList.add('hidden');
  });

  dom.slideDuration.addEventListener('input', (e) => {
    state.settings.duration = parseInt(e.target.value);
    dom.durationValue.textContent = `${e.target.value}s`;
    saveSettings();
    if (state.isPlaying) { stopAutoPlay(); startAutoPlay(); }
  });

  dom.transitionType.addEventListener('change', (e) => {
    state.settings.transition = e.target.value;
    saveSettings();
  });

  dom.transitionSpeed.addEventListener('input', (e) => {
    state.settings.speed = parseInt(e.target.value);
    dom.speedValue.textContent = `${(e.target.value / 1000).toFixed(1)}s`;
    saveSettings();
  });

  dom.bgColor.addEventListener('change', (e) => {
    state.settings.bgColor = e.target.value;
    dom.slideContainer.style.background = e.target.value;
    saveSettings();
  });

  dom.fitMode.addEventListener('change', (e) => {
    state.settings.fitMode = e.target.value;
    saveSettings();
    // Re-render current slide with new fit
    if (state.slides.length > 0) {
      renderSlide(state.slides[state.currentIndex], dom.slideCurrent);
      dom.slideCurrent.classList.add('active');
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (dom.slideshowScreen.classList.contains('active')) {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          goToNextSlide();
          showControls();
          break;
        case 'ArrowLeft':
          goToPrevSlide();
          showControls();
          break;
        case 'Escape':
          if (!dom.settingsPanel.classList.contains('hidden')) {
            dom.settingsPanel.classList.add('hidden');
          } else if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            stopAutoPlay();
            state.isPlaying = false;
            switchScreen('upload');
          }
          break;
        case 'p':
          togglePlayPause();
          showControls();
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
    }
  });
}

// ===== Apply Settings to UI =====
function applySettingsToUI() {
  dom.slideDuration.value = state.settings.duration;
  dom.durationValue.textContent = `${state.settings.duration}s`;
  dom.transitionType.value = state.settings.transition;
  dom.transitionSpeed.value = state.settings.speed;
  dom.speedValue.textContent = `${(state.settings.speed / 1000).toFixed(1)}s`;
  dom.bgColor.value = state.settings.bgColor;
  dom.fitMode.value = state.settings.fitMode;
}

// ===== Init =====
async function init() {
  cacheDom();
  loadSettings();
  applySettingsToUI();
  bindEvents();

  // Login events
  dom.btnLogin.addEventListener('click', handleLogin);
  dom.loginPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  // Load existing slides from IndexedDB
  try {
    const saved = await loadSlides();
    if (saved && saved.length > 0) {
      state.slides = saved;
      updateExistingUI();
    }
  } catch (e) {
    console.warn('Could not load saved slides:', e);
  }
}

document.addEventListener('DOMContentLoaded', init);

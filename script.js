/* =========================
   CONFIGURATION OPTIMISÉE
========================= */
const CONFIG = {
  particleCount: 80,
  particleSpeed: 1.0,
  connectionDistance: 150,
  hiddenFrameThrottle: 15,
  resizeDebounce: 150,
  maxVelocity: 3.5,
  cardAnimationDelay: 120,
  particleOpacityRange: [0.3, 0.7],
  lineOpacityMax: 0.18,
  glowEffect: true
};

/* =========================
   PARTICLE CLASS OPTIMISÉE
========================= */
class Particle {
  constructor(canvas, width, height) {
    const DPR = Math.max(1, window.devicePixelRatio || 1);
    const w = width || canvas.width / DPR;
    const h = height || canvas.height / DPR;
    
    this.radius = Math.random() * 2.5 + 0.8;
    
    const margin = this.radius + 8;
    this.x = margin + Math.random() * (w - margin * 2);
    this.y = margin + Math.random() * (h - margin * 2);
    
    const speed = CONFIG.particleSpeed * (0.7 + Math.random() * 0.6);
    const angle = Math.random() * Math.PI * 2;
    
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    
    const [minOp, maxOp] = CONFIG.particleOpacityRange;
    this.opacity = minOp + Math.random() * (maxOp - minOp);
    this.pulseSpeed = 0.5 + Math.random() * 1.5;
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  update(dt, time) {
    this.x += this.vx * 60 * dt;
    this.y += this.vy * 60 * dt;
    
    // Effet de pulsation subtile
    if (CONFIG.glowEffect) {
      const [minOp, maxOp] = CONFIG.particleOpacityRange;
      this.opacity = minOp + (maxOp - minOp) * (0.5 + 0.5 * Math.sin(time * this.pulseSpeed + this.pulsePhase));
    }
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    
    // Gradient radial pour effet de lueur
    if (CONFIG.glowEffect) {
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2);
      gradient.addColorStop(0, `rgba(91, 209, 255, ${this.opacity})`);
      gradient.addColorStop(0.5, `rgba(91, 209, 255, ${this.opacity * 0.6})`);
      gradient.addColorStop(1, `rgba(91, 209, 255, 0)`);
      ctx.fillStyle = gradient;
      ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
    } else {
      ctx.fillStyle = `rgba(91, 209, 255, ${this.opacity})`;
    }
    
    ctx.fill();
  }
}

/* =========================
   PARTICLE SYSTEM OPTIMISÉ
========================= */
class ParticleSystem {
  constructor(canvasId, cardIds = []) {
    this.canvas = document.getElementById(canvasId);
    
    if (!this.canvas) {
      console.warn(`Canvas introuvable: #${canvasId}`);
      return;
    }
    
    this.ctx = this.canvas.getContext('2d', { 
      alpha: true,
      desynchronized: true // Améliore les performances
    });
    
    this.particles = [];
    this.cardElements = cardIds
      .map(id => document.getElementById(id))
      .filter(Boolean);
      
    this.cards = [];
    this.last = performance.now();
    this.time = 0;
    this.hiddenFrameCount = 0;
    this.animationId = null;
    this.isLowPowerMode = false;
    
    this._onResize = this._onResize.bind(this);
    this._animate = this._animate.bind(this);
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
    
    this.init();
  }

  init() {
    this._detectPerformanceMode();
    this._resizeCanvas();
    this._createParticles();
    this.updateCardsFromDOM();
    
    window.addEventListener('resize', this._onResize);
    document.addEventListener('visibilitychange', this._onVisibilityChange);
    
    if (this.cardElements.length && window.ResizeObserver) {
      this._cardObserver = new ResizeObserver(() => this.updateCardsFromDOM());
      this.cardElements.forEach(el => this._cardObserver.observe(el));
    }
    
    this.animationId = requestAnimationFrame(this._animate);
  }

  _detectPerformanceMode() {
    // Détection du mode basse consommation
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;
    const hasLowCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
    
    this.isLowPowerMode = isMobile || hasLowMemory || hasLowCores;
    
    if (this.isLowPowerMode) {
      CONFIG.particleCount = Math.min(CONFIG.particleCount, 40);
      CONFIG.connectionDistance = 120;
      CONFIG.glowEffect = false;
    }
  }

  _onVisibilityChange() {
    if (document.hidden) {
      console.log('🔇 Page cachée - Animation ralentie');
    } else {
      console.log('🔊 Page visible - Animation normale');
      this.last = performance.now(); // Reset timer
    }
  }

  _onResize() {
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => {
      const DPR = Math.max(1, window.devicePixelRatio || 1);
      const oldW = this.canvas.width / DPR;
      const oldH = this.canvas.height / DPR;
      
      this._resizeCanvas();
      
      const newW = this.canvas.width / DPR;
      const newH = this.canvas.height / DPR;
      
      const scaleX = newW / oldW;
      const scaleY = newH / oldH;
      
      this.particles.forEach(p => {
        p.x = Math.min(newW - p.radius * 2, Math.max(p.radius * 2, p.x * scaleX));
        p.y = Math.min(newH - p.radius * 2, Math.max(p.radius * 2, p.y * scaleY));
      });
      
      this.updateCardsFromDOM();
    }, CONFIG.resizeDebounce);
  }

  _resizeCanvas() {
    const DPR = Math.max(1, window.devicePixelRatio || 1);
    
    this.canvas.width = Math.round(window.innerWidth * DPR);
    this.canvas.height = Math.round(window.innerHeight * DPR);
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    
    this.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  updateCardsFromDOM() {
    this.cards = this.cardElements.map(el => {
      const rect = el.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      };
    });
  }

  _createParticles() {
    this.particles.length = 0;
    let target = CONFIG.particleCount;
    
    if (this.isLowPowerMode) {
      target = Math.min(target, 30);
    }
    
    const DPR = Math.max(1, window.devicePixelRatio || 1);
    const w = this.canvas.width / DPR;
    const h = this.canvas.height / DPR;
    
    for (let i = 0; i < target; i++) {
      this.particles.push(new Particle(this.canvas, w, h));
    }
  }

  _drawConnections() {
    const ctx = this.ctx;
    const distMax = CONFIG.connectionDistance;
    const distMaxSq = distMax * distMax;
    const list = this.particles;

    // Optimisation avec grille spatiale
    const cell = Math.max(80, distMax);
    const DPR = Math.max(1, window.devicePixelRatio || 1);
    const widthCss = this.canvas.width / DPR;
    const heightCss = this.canvas.height / DPR;
    const cols = Math.max(1, Math.ceil(widthCss / cell));
    const rows = Math.max(1, Math.ceil(heightCss / cell));
    const buckets = Array.from({ length: cols * rows }, () => []);

    // Distribution des particules dans la grille
    for (const p of list) {
      const cx = Math.min(cols - 1, Math.max(0, Math.floor(p.x / cell)));
      const cy = Math.min(rows - 1, Math.max(0, Math.floor(p.y / cell)));
      buckets[cy * cols + cx].push(p);
    }

    // Dessin des connexions optimisé
    for (let by = 0; by < rows; by++) {
      for (let bx = 0; bx < cols; bx++) {
        const bucket = buckets[by * cols + bx];
        if (!bucket.length) continue;

        for (let i = 0; i < bucket.length; i++) {
          const A = bucket[i];
          
          // Ne vérifier que les cellules adjacentes
          for (let ny = Math.max(0, by - 1); ny <= Math.min(rows - 1, by + 1); ny++) {
            for (let nx = Math.max(0, bx - 1); nx <= Math.min(cols - 1, bx + 1); nx++) {
              const nb = buckets[ny * cols + nx];
              if (!nb || !nb.length) continue;

              for (let j = 0; j < nb.length; j++) {
                const B = nb[j];
                if (A === B) continue;

                const dx = A.x - B.x;
                const dy = A.y - B.y;
                const d2 = dx * dx + dy * dy;

                if (d2 < distMaxSq && d2 > 1) {
                  const dist = Math.sqrt(d2);
                  const alpha = CONFIG.lineOpacityMax * (1 - dist / distMax);
                  
                  ctx.beginPath();
                  ctx.moveTo(A.x, A.y);
                  ctx.lineTo(B.x, B.y);
                  
                  // Gradient pour les lignes en mode haute qualité
                  if (CONFIG.glowEffect && !this.isLowPowerMode) {
                    const gradient = ctx.createLinearGradient(A.x, A.y, B.x, B.y);
                    gradient.addColorStop(0, `rgba(91, 209, 255, ${alpha * A.opacity})`);
                    gradient.addColorStop(1, `rgba(91, 209, 255, ${alpha * B.opacity})`);
                    ctx.strokeStyle = gradient;
                  } else {
                    ctx.strokeStyle = `rgba(91, 209, 255, ${alpha})`;
                  }
                  
                  ctx.lineWidth = 1;
                  ctx.stroke();
                }
              }
            }
          }
        }
      }
    }
  }

  _animate(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;

    // Throttling quand la page est cachée
    if (document.hidden) {
      this.hiddenFrameCount++;
      if (this.hiddenFrameCount % CONFIG.hiddenFrameThrottle !== 0) {
        this.animationId = requestAnimationFrame(this._animate);
        return;
      }
    } else {
      this.hiddenFrameCount = 0;
    }

    const DPR = Math.max(1, window.devicePixelRatio || 1);
    this.ctx.clearRect(0, 0, this.canvas.width / DPR, this.canvas.height / DPR);

    // Dessin des connexions
    this._drawConnections();

    // Mise à jour et dessin des particules
    for (const p of this.particles) {
      p.update(dt, this.time);
      this._clampVelocity(p);
      this._constrainParticle(p);
      p.draw(this.ctx);
    }

    this.animationId = requestAnimationFrame(this._animate);
  }

  _clampVelocity(p) {
    if (!isFinite(p.vx) || !isFinite(p.vy)) {
      p.vx = (Math.random() - 0.5) * 0.5;
      p.vy = (Math.random() - 0.5) * 0.5;
    }
    
    const m = CONFIG.maxVelocity;
    p.vx = Math.max(-m, Math.min(m, p.vx));
    p.vy = Math.max(-m, Math.min(m, p.vy));
  }

  _constrainParticle(p) {
    const DPR = Math.max(1, window.devicePixelRatio || 1);
    const w = this.canvas.width / DPR;
    const h = this.canvas.height / DPR;
    const margin = p.radius + 2;
    
    // Rebonds sur les bords
    if (p.x <= margin) {
      p.x = margin;
      p.vx = Math.abs(p.vx) * 0.85;
    } else if (p.x >= w - margin) {
      p.x = w - margin;
      p.vx = -Math.abs(p.vx) * 0.85;
    }
    
    if (p.y <= margin) {
      p.y = margin;
      p.vy = Math.abs(p.vy) * 0.85;
    } else if (p.y >= h - margin) {
      p.y = h - margin;
      p.vy = -Math.abs(p.vy) * 0.85;
    }

    // Collision avec les cartes
    const pad = 5;
    for (const r of this.cards) {
      if (!r) continue;
      
      const { left, top, right, bottom } = r;
      
      // Trouve le point le plus proche sur la carte
      const nx = Math.max(left, Math.min(p.x, right));
      const ny = Math.max(top, Math.min(p.y, bottom));
      const dx = p.x - nx;
      const dy = p.y - ny;
      const d2 = dx * dx + dy * dy;
      const minDist = p.radius + pad;
      
      if (d2 < minDist * minDist && d2 > 0) {
        const dist = Math.sqrt(d2);
        const overlap = minDist - dist;
        const ndx = dx / dist;
        const ndy = dy / dist;
        
        // Déplace la particule hors de la carte
        p.x += ndx * overlap;
        p.y += ndy * overlap;
        
        // Réflexion de la vélocité
        const dotProduct = p.vx * ndx + p.vy * ndy;
        p.vx = (p.vx - 2 * dotProduct * ndx) * 0.9;
        p.vy = (p.vy - 2 * dotProduct * ndy) * 0.9;
      }
    }
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    if (this._cardObserver) this._cardObserver.disconnect();
    if (this._resizeTimer) clearTimeout(this._resizeTimer);
  }
}

/* =========================
   MODAL MANAGER
========================= */
class ModalManager {
  constructor() {
    this.modal = document.getElementById('betaModal');
    this.openTriggers = document.querySelectorAll('.open-beta-modal');
    this.closeTriggers = document.querySelectorAll('.close, .close-btn');
    this.titleElement = document.getElementById('betaTitle');
    this.featureNameElement = document.getElementById('betaFeatureName');
    this.lastFocusedElement = null;
    
    this.init();
  }

  init() {
    if (!this.modal) {
      console.warn('Modale Beta introuvable.');
      return;
    }

    // Ouverture de la modale
    this.openTriggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        this.lastFocusedElement = document.activeElement;
        
        const title = trigger.dataset.modalTitle || "Fonctionnalité";
        const featureName = trigger.dataset.modalTitle || "Cette page";
        
        if (this.titleElement) this.titleElement.textContent = title;
        if (this.featureNameElement) this.featureNameElement.textContent = featureName;
        
        this.open();
      });
    });

    // Fermeture de la modale
    this.closeTriggers.forEach(btn => {
      btn.addEventListener('click', () => this.close());
    });

    // Clic sur l'overlay
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // Touche Échap
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display === 'block') {
        this.close();
      }
    });

    // Gestion du focus trap
    this.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        this._handleTabKey(e);
      }
    });
  }

  _handleTabKey(e) {
    const focusableElements = this.modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const focusableArray = Array.from(focusableElements);
    const firstElement = focusableArray[0];
    const lastElement = focusableArray[focusableArray.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }

  open() {
    this.modal.style.display = 'flex';
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
      const firstFocusable = this.modal.querySelector('.close, .close-btn');
      if (firstFocusable) firstFocusable.focus();
    }, 100);
  }

  close() {
    this.modal.style.display = 'none';
    this.modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    
    // Restaure le focus
    if (this.lastFocusedElement) {
      this.lastFocusedElement.focus();
      this.lastFocusedElement = null;
    }
  }
}

/* =========================
   CARD ANIMATOR
========================= */
class CardAnimator {
  constructor() {
    this.cards = document.querySelectorAll('.card');
    this.init();
  }

  init() {
    this.setupObserver();
    this.setupKeyboardNavigation();
    this.setupCardButtons();
    this.setupHoverEffects();
  }

  setupObserver() {
    const options = {
      threshold: 0.15,
      rootMargin: '0px 0px -80px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('show-card');
          }, index * CONFIG.cardAnimationDelay);
          observer.unobserve(entry.target);
        }
      });
    }, options);

    this.cards.forEach(card => {
      card.style.opacity = '0';
      observer.observe(card);
    });
  }

  setupKeyboardNavigation() {
    this.cards.forEach(card => {
      card.setAttribute('tabindex', '0');
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const button = card.querySelector('button');
          if (button) button.click();
        }
      });
    });
  }

  setupCardButtons() {
    document.querySelectorAll('.card button[data-link]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const href = btn.getAttribute('data-link');
        if (href) {
          // Effet de transition avant navigation
          btn.style.transform = 'scale(0.95)';
          setTimeout(() => {
            window.location.href = href;
          }, 150);
        }
      });
    });
  }

  setupHoverEffects() {
    this.cards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.willChange = 'transform';
      });

      card.addEventListener('mouseleave', () => {
        card.style.willChange = 'auto';
      });
    });
  }
}

/* =========================
   PERFORMANCE OPTIMIZER
========================= */
class PerformanceOptimizer {
  constructor() {
    this.init();
  }

  init() {
    this.preloadCriticalResources();
    this.handleReducedMotion();
    this.optimizeScrollPerformance();
    this.lazyLoadImages();
    this.prefetchLinks();
  }

  preloadCriticalResources() {
    const comingSoonLinks = document.querySelectorAll('button[data-link="coming-soon.html"]');
    if (comingSoonLinks.length > 0) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = 'coming-soon.html';
      document.head.appendChild(link);
    }
  }

  handleReducedMotion() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const updateMotionPreference = (matches) => {
      if (matches) {
        document.body.classList.add('reduced-motion');
        CONFIG.glowEffect = false;
      } else {
        document.body.classList.remove('reduced-motion');
      }
    };
    
    updateMotionPreference(prefersReducedMotion.matches);
    
    prefersReducedMotion.addEventListener('change', (e) => {
      updateMotionPreference(e.matches);
    });
  }

  optimizeScrollPerformance() {
    let ticking = false;
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      if (!ticking) {
        window.requestAnimationFrame(() => {
          this._handleScroll(scrollTop, lastScrollTop);
          lastScrollTop = scrollTop;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  _handleScroll(scrollTop, lastScrollTop) {
    // Ajoute une classe selon la direction du scroll
    if (scrollTop > lastScrollTop && scrollTop > 100) {
      document.body.classList.add('scrolling-down');
      document.body.classList.remove('scrolling-up');
    } else if (scrollTop < lastScrollTop) {
      document.body.classList.add('scrolling-up');
      document.body.classList.remove('scrolling-down');
    }
  }

  lazyLoadImages() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }

  prefetchLinks() {
    const links = document.querySelectorAll('a[href^="Minecraft/"]');
    links.forEach(link => {
      link.addEventListener('mouseenter', () => {
        const prefetchLink = document.createElement('link');
        prefetchLink.rel = 'prefetch';
        prefetchLink.href = link.href;
        document.head.appendChild(prefetchLink);
      }, { once: true });
    });
  }
}

/* =========================
   ERROR HANDLER
========================= */
class ErrorHandler {
  constructor() {
    this.errors = [];
    this.init();
  }

  init() {
    window.addEventListener('error', (e) => {
      this.logError('Erreur globale', e.error);
    });

    window.addEventListener('unhandledrejection', (e) => {
      this.logError('Promise rejetée', e.reason);
    });
  }

  logError(type, error) {
    const errorInfo = {
      type,
      message: error?.message || error,
      stack: error?.stack,
      timestamp: new Date().toISOString()
    };
    
    this.errors.push(errorInfo);
    console.error(`❌ ${type}:`, errorInfo);

    // Limite le stockage des erreurs
    if (this.errors.length > 10) {
      this.errors.shift();
    }
  }

  getErrors() {
    return this.errors;
  }
}

/* =========================
   UTILITIES
========================= */
const Utils = {
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  animate(element, keyframes, options) {
    if ('animate' in element) {
      return element.animate(keyframes, options);
    }
    return null;
  }
};

/* =========================
   APPLICATION PRINCIPALE
========================= */
class App {
  constructor() {
    this.modules = {};
    this.startTime = performance.now();
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
    } else {
      this.start();
    }
  }

  start() {
    try {
      console.log('🚀 Initialisation de Multi-hub...');
      
      // Initialisation des modules
      this.modules.particleSystem = new ParticleSystem('particles', [
        'card-mc',
        'card-phasmo',
        'card-scp',
        'card-outils'
      ]);
      
      this.modules.modalManager = new ModalManager();
      this.modules.cardAnimator = new CardAnimator();
      this.modules.performanceOptimizer = new PerformanceOptimizer();
      this.modules.errorHandler = new ErrorHandler();
      
      // Marque l'app comme chargée
      document.body.classList.add('js-loaded');
      
      const loadTime = performance.now() - this.startTime;
      console.log(`✅ Multi-hub initialisé en ${loadTime.toFixed(2)}ms`);
      
      // Analytics de performance
      this._logPerformanceMetrics();
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
      this.modules.errorHandler?.logError('Initialisation', error);
    }
  }

  _logPerformanceMetrics() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          console.log('📊 Métriques de performance:', {
            'DOM Content Loaded': `${navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart}ms`,
            'Load Complete': `${navigation.loadEventEnd - navigation.loadEventStart}ms`,
            'Total Time': `${navigation.loadEventEnd}ms`
          });
        }
      }, 0);
    }
  }

  destroy() {
    console.log('🔥 Destruction de l\'application...');
    
    if (this.modules.particleSystem?.destroy) {
      this.modules.particleSystem.destroy();
    }
    
    Object.keys(this.modules).forEach(key => {
      this.modules[key] = null;
    });
  }
}

/* =========================
   INITIALISATION GLOBALE
========================= */
const app = new App();

/* =========================
   EXPORT GLOBAL
========================= */
if (typeof window !== 'undefined') {
  window.MultiHub = {
    app,
    version: '3.0.0',
    config: CONFIG,
    utils: Utils,
    getErrors: () => app.modules.errorHandler?.getErrors() || []
  };
  
  console.log('%c✨ Multi-hub v3.0.0', 'color: #5bd1ff; font-size: 16px; font-weight: bold;');
  console.log('%cOptimisé pour les performances et l\'accessibilité', 'color: #9fb6cc; font-size: 12px;');
}

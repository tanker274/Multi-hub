/* =========================
   CONFIGURATION
========================= */
const CONFIG = {
  particleCount: 70,
  particleSpeed: 0.9,
  connectionDistance: 140,
  hiddenFrameThrottle: 12,
  resizeDebounce: 140,
  maxVelocity: 3,
  cardAnimationDelay: 100
};

/* =========================
   PARTICLE CLASS
========================= */
class Particle {
  constructor(canvas, width, height) {
    const DPR = Math.max(1, window.devicePixelRatio || 1);
    const w = width || canvas.width / DPR;
    const h = height || canvas.height / DPR;
    
    this.radius = Math.random() * 2.2 + 0.6;
    
    const margin = this.radius + 5;
    this.x = margin + Math.random() * (w - margin * 2);
    this.y = margin + Math.random() * (h - margin * 2);
    
    const speed = CONFIG.particleSpeed * (0.6 + Math.random() * 0.8);
    const angle = Math.random() * Math.PI * 2;
    
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.opacity = Math.random() * 0.5 + 0.25;
  }

  update(dt) {
    this.x += this.vx * 60 * dt;
    this.y += this.vy * 60 * dt;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    // Couleur harmonisée avec --accent-color (#5bd1ff)
    ctx.fillStyle = `rgba(91, 209, 255, ${this.opacity})`;
    ctx.fill();
  }
}

/* =========================
   PARTICLE SYSTEM
========================= */
class ParticleSystem {
  constructor(canvasId, cardIds = []) {
    this.canvas = document.getElementById(canvasId);
    
    if (!this.canvas) {
      console.warn(`Canvas introuvable: #${canvasId}`);
      return;
    }
    
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.particles = [];
    
    this.cardElements = cardIds
      .map(id => document.getElementById(id))
      .filter(Boolean);
      
    this.cards = [];
    this.last = performance.now();
    this.hiddenFrameCount = 0;
    this.animationId = null;
    
    this._onResize = this._onResize.bind(this);
    this._animate = this._animate.bind(this);
    
    this.init();
  }

  init() {
    this._resizeCanvas();
    this._createParticles();
    this.updateCardsFromDOM();
    
    window.addEventListener('resize', this._onResize);
    
    if (this.cardElements.length && window.ResizeObserver) {
      this._cardObserver = new ResizeObserver(() => this.updateCardsFromDOM());
      this.cardElements.forEach(el => this._cardObserver.observe(el));
    }
    
    this.animationId = requestAnimationFrame(this._animate);
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
        p.x = Math.min(newW - p.radius, Math.max(p.radius, p.x * scaleX));
        p.y = Math.min(newH - p.radius, Math.max(p.radius, p.y * scaleY));
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
    this.cards = this.cardElements.map(el => el.getBoundingClientRect());
  }

  _createParticles() {
    this.particles.length = 0;
    let target = CONFIG.particleCount;
    
    if (navigator.deviceMemory && navigator.deviceMemory < 2) {
      target = Math.min(target, 10);
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

    const cell = Math.max(60, distMax);
    const DPR = Math.max(1, window.devicePixelRatio || 1);
    const widthCss = this.canvas.width / DPR;
    const heightCss = this.canvas.height / DPR;
    const cols = Math.max(1, Math.ceil(widthCss / cell));
    const rows = Math.max(1, Math.ceil(heightCss / cell));
    const buckets = Array.from({ length: cols * rows }, () => []);

    for (const p of list) {
      const cx = Math.min(cols - 1, Math.max(0, Math.floor(p.x / cell)));
      const cy = Math.min(rows - 1, Math.max(0, Math.floor(p.y / cell)));
      buckets[cy * cols + cx].push(p);
    }

    for (let by = 0; by < rows; by++) {
      for (let bx = 0; bx < cols; bx++) {
        const bucket = buckets[by * cols + bx];
        if (!bucket.length) continue;

        for (let i = 0; i < bucket.length; i++) {
          const A = bucket[i];
          
          for (let ny = Math.max(0, by - 1); ny <= Math.min(rows - 1, by + 1); ny++) {
            for (let nx = Math.max(0, bx - 1); nx <= Math.min(cols - 1, bx + 1); nx++) {
              const nb = buckets[ny * cols + nx];
              if (!nb) continue;

              for (let j = 0; j < nb.length; j++) {
                const B = nb[j];
                if (A === B) continue;

                const dx = A.x - B.x;
                const dy = A.y - B.y;
                const d2 = dx * dx + dy * dy;

                if (d2 < distMaxSq) {
                  const alpha = 0.12 * (1 - d2 / distMaxSq);
                  ctx.beginPath();
                  ctx.moveTo(A.x, A.y);
                  ctx.lineTo(B.x, B.y);
                  ctx.strokeStyle = `rgba(91, 209, 255, ${alpha})`;
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

    this._drawConnections();

    for (const p of this.particles) {
      p.update(dt);
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
    const margin = p.radius;
    
    if (p.x <= margin) {
      p.x = margin;
      p.vx = Math.abs(p.vx) * 0.8; 
    } else if (p.x >= w - margin) {
      p.x = w - margin;
      p.vx = -Math.abs(p.vx) * 0.8;
    }
    if (p.y <= margin) {
      p.y = margin;
      p.vy = Math.abs(p.vy) * 0.8;
    } else if (p.y >= h - margin) {
      p.y = h - margin;
      p.vy = -Math.abs(p.vy) * 0.8;
    }

    const pad = 2; 
    for (const r of this.cards) {
      if (!r) continue;
      
      const left = r.left;
      const top = r.top;
      const right = r.left + r.width;
      const bottom = r.top + r.height;
      
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
        
        p.x += ndx * overlap;
        p.y += ndy * overlap;
        
        const dotProduct = p.vx * ndx + p.vy * ndy;
        p.vx = (p.vx - 2 * dotProduct * ndx) * 0.9;
        p.vy = (p.vy - 2 * dotProduct * ndy) * 0.9;
      }
    }
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this._onResize);
    if (this._cardObserver) this._cardObserver.disconnect();
    if (this._resizeTimer) clearTimeout(this._resizeTimer);
  }
}

/* =========================
   MODAL MANAGER (Pour liens Bêta Nav)
========================= */
class ModalManager {
  constructor() {
    this.modal = document.getElementById('betaModal');
    this.openTriggers = document.querySelectorAll('.open-beta-modal');
    this.closeTriggers = document.querySelectorAll('.close, .close-btn');
    this.titleElement = document.getElementById('betaTitle');
    this.featureNameElement = document.getElementById('betaFeatureName');
    
    this.init();
  }

  init() {
    if (!this.modal) {
      console.warn('Modale Bêta introuvable.');
      return;
    }

    this.openTriggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const title = trigger.dataset.modalTitle || "Fonctionnalité";
        const featureName = trigger.dataset.modalTitle || "Cette page";
        
        if (this.titleElement) this.titleElement.textContent = title;
        if (this.featureNameElement) this.featureNameElement.textContent = featureName;
        
        this.open();
      });
    });

    this.closeTriggers.forEach(btn => {
      btn.addEventListener('click', (e) => {
          if (e.target.closest('.modal')) {
              this.close();
          }
      });
    });

    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display === 'block') {
        this.close();
      }
    });
  }

  open() {
    this.modal.style.display = 'block';
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
  }
}

/* =========================
   CARD ANIMATOR
========================= */
class CardAnimator {
  constructor() {
    this.cards = document.querySelectorAll('article');
    this.init();
  }

  init() {
    this.setupObserver();
    this.setupKeyboardNavigation();
    // 🔥 MODIFIÉ : Réactivation du gestionnaire de clic pour les cartes
    this.setupCardButtons();
  }

  setupObserver() {
    const options = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
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

    this.cards.forEach(card => observer.observe(card));
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

  // 🔥 MODIFIÉ : Cette fonction est restaurée pour gérer les liens data-link
  setupCardButtons() {
    document.querySelectorAll('article button[data-link]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Empêche le clic de se propager à la carte
        const href = btn.getAttribute('data-link');
        if (href) {
          window.location.href = href;
        }
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
  }

  preloadCriticalResources() {
    // 🔥 MODIFIÉ : Précharge 'coming-soon.html' car il est réutilisé
    const hasComingSoonLink = document.querySelector('button[data-link="coming-soon.html"]');
    if (hasComingSoonLink) {
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
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
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
};

/* =========================
   ERROR HANDLER
========================= */
class ErrorHandler {
  constructor() {
    this.init();
  }

  init() {
    window.addEventListener('error', (e) => {
      console.error('Erreur globale:', e.error);
    });
    window.addEventListener('unhandledrejection', (e) => {
      console.error('Promise rejetée:', e.reason);
    });
  }
}

/* =========================
   APPLICATION
========================= */
class App {
  constructor() {
    this.modules = {};
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
      // Le bug de collision des particules est toujours corrigé
      this.modules.particleSystem = new ParticleSystem('particles', [
        'card-mc', 
        'card-phasmo', 
        'card-scp', 
        'card-vip'
      ]);
      
      this.modules.modalManager = new ModalManager(); // Gère la modale bêta
      this.modules.cardAnimator = new CardAnimator(); // Gère les cartes (y compris le clic vers coming-soon)
      this.modules.performanceOptimizer = new PerformanceOptimizer();
      this.modules.errorHandler = new ErrorHandler();
      
      document.body.classList.add('js-loaded');
      console.log('✅ Multi-hub initialisé avec succès (Logique Hybride)');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
    }
  }

  destroy() {
    if (this.modules.particleSystem && this.modules.particleSystem.destroy) {
      this.modules.particleSystem.destroy();
    }
  }
}

/* =========================
   INITIALISATION
========================= */
const app = new App();

/* =========================
   EXPORT GLOBAL
========================= */
if (typeof window !== 'undefined') {
  window.MultiHub = {
    app,
    version: '2.0.2-Hybrid', // Version mise à jour
    config: CONFIG,
    utils: Utils
  };
}
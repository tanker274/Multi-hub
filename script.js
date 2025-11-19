/* =========================
   CONFIG
   ========================= */
const CONFIG = {
  particleCount: 70,          // nombre cible (s'ajuste si mémoire faible)
  particleSpeed: 0.9,         // vitesse de base
  connectionDistance: 140,    // distance de connexion visuelle
  hiddenFrameThrottle: 12,    // dessiner 1 frame sur N si onglet caché
  resizeDebounce: 140,        // ms pour debounce resize
  maxVelocity: 3              // clamp vitesse pour éviter runaway
};

/* =========================
   PARTICLE SYSTEM
   ========================= */
class ParticleSystem {
  constructor(canvasId, cardIds = ['cardLeft', 'cardRight']) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) throw new Error('Canvas introuvable: #' + canvasId);
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.particles = [];
    this.cardElements = cardIds.map(id => document.getElementById(id)).filter(Boolean);
    this.cards = [];            // stocke DOMRect des cartes
    this.last = performance.now();
    this.hiddenFrameCount = 0;
    this._onResize = this._onResize.bind(this);
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
    requestAnimationFrame(t => this._animate(t));
  }

  _onResize() {
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => {
      this._resizeCanvas();
      this.updateCardsFromDOM();
    }, CONFIG.resizeDebounce);
  }

  _resizeCanvas() {
    const DPR = Math.max(1, window.devicePixelRatio || 1);
    // canvas.width/height en pixels device ; style en CSS pixels
    this.canvas.width = Math.round(window.innerWidth * DPR);
    this.canvas.height = Math.round(window.innerHeight * DPR);
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  updateCardsFromDOM() {
    // getBoundingClientRect renvoie en CSS pixels (même repère que canvas style size)
    this.cards = this.cardElements.map(el => el.getBoundingClientRect());
  }

  _createParticles() {
    this.particles.length = 0;
    let target = CONFIG.particleCount;
    if (navigator.deviceMemory && navigator.deviceMemory < 2) target = Math.min(target, 36);
    for (let i = 0; i < target; i++) this.particles.push(new Particle(this.canvas));
  }

  _drawConnections() {
    const ctx = this.ctx;
    const distMax = CONFIG.connectionDistance;
    const distMaxSq = distMax * distMax;
    const list = this.particles;

    // grille spatiale
    const cell = Math.max(60, distMax);
    const DPR = Math.max(1, window.devicePixelRatio || 1);
    const widthCss = this.canvas.width / DPR;
    const heightCss = this.canvas.height / DPR;
    const cols = Math.max(1, Math.ceil(widthCss / cell));
    const rows = Math.max(1, Math.ceil(heightCss / cell));
    const buckets = new Array(cols * rows);
    for (let i = 0; i < buckets.length; i++) buckets[i] = [];

    for (const p of list) {
      const cx = Math.min(cols - 1, Math.max(0, Math.floor(p.x / cell)));
      const cy = Math.min(rows - 1, Math.max(0, Math.floor(p.y / cell)));
      buckets[cy * cols + cx].push(p);
    }

    // pour chaque bucket, check voisins
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
                const dx = A.x - B.x, dy = A.y - B.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < distMaxSq) {
                  const alpha = 0.12 * (1 - d2 / distMaxSq);
                  ctx.beginPath();
                  ctx.moveTo(A.x, A.y);
                  ctx.lineTo(B.x, B.y);
                  ctx.strokeStyle = 'rgba(114,243,232,' + alpha + ')';
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

  update() {
    this.x += this.vx;
    this.y += this.vy;

    // Rebondir aux bords avec une petite marge
    if (this.x < -10 || this.x > this.canvas.width + 10) this.vx *= -1;
    if (this.y < -10 || this.y > this.canvas.height + 10) this.vy *= -1;
    
    // Forcer les particules à rester dans les limites
    this.x = Math.max(-10, Math.min(this.canvas.width + 10, this.x));
    this.y = Math.max(-10, Math.min(this.canvas.height + 10, this.y));
  }
  _animate(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;

    if (document.hidden) {
      this.hiddenFrameCount++;
      if (this.hiddenFrameCount % CONFIG.hiddenFrameThrottle !== 0) {
        requestAnimationFrame(t => this._animate(t));
        return;
      }
    } else {
      this.hiddenFrameCount = 0;
    }

    const DPR = Math.max(1, window.devicePixelRatio || 1);
    // clear in CSS coords (we setTransform with DPR)
    this.ctx.clearRect(0, 0, this.canvas.width / DPR, this.canvas.height / DPR);

    this._drawConnections();

    for (const p of this.particles) {
      p.update(dt);
      this._clampVelocity(p);
      this._constrainParticle(p);
      p.draw(this.ctx);
    }

    requestAnimationFrame(t => this._animate(t));
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
    // canvas dims in CSS pixels
    const DPR = Math.max(1, window.devicePixelRatio || 1);
    const w = this.canvas.width / DPR;
    const h = this.canvas.height / DPR;

    // bounds bounce (keeps particle strictly inside)
    if (p.x - p.radius < 0) { p.x = p.radius; p.vx = Math.abs(p.vx); }
    else if (p.x + p.radius > w) { p.x = w - p.radius; p.vx = -Math.abs(p.vx); }
    if (p.y - p.radius < 0) { p.y = p.radius; p.vy = Math.abs(p.vy); }
    else if (p.y + p.radius > h) { p.y = h - p.radius; p.vy = -Math.abs(p.vy); }

    // circle-rect collisions (cards are DOMRect in page/CSS coords)
    const pad = 0.6;
    for (const r of this.cards) {
      if (!r) continue;
      const left = r.left, top = r.top, right = r.left + r.width, bottom = r.top + r.height;
      const nx = Math.max(left, Math.min(p.x, right));
      const ny = Math.max(top, Math.min(p.y, bottom));
      const dx = p.x - nx, dy = p.y - ny;
      const d2 = dx * dx + dy * dy;
      const minDist = p.radius + pad;
      if (d2 < minDist * minDist) {
        // resolve on dominant axis
        if (Math.abs(dx) > Math.abs(dy)) {
          if (p.x < nx) { p.x = left - minDist; p.vx = -Math.abs(p.vx); }
          else { p.x = right + minDist; p.vx = Math.abs(p.vx); }
          p.vx *= 0.98;
        } else {
          if (p.y < ny) { p.y = top - minDist; p.vy = -Math.abs(p.vy); }
          else { p.y = bottom + minDist; p.vy = Math.abs(p.vy); }
          p.vy *= 0.98;
        }
      }
    }
  }

  updateCardsFromDOM() {
    this.cards = this.cardElements.map(el => el.getBoundingClientRect());
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    if (this._cardObserver) this._cardObserver.disconnect();
  }
}

/* =========================
   PARTICLE
   ========================= */
class Particle {
  constructor(canvas) {
    const DPR = Math.max(1, window.devicePixelRatio || 1);
    const w = canvas.width / DPR;
    const h = canvas.height / DPR;
    this.radius = Math.random() * 2.2 + 0.6;
    this.x = Math.random() * (w - this.radius * 2) + this.radius;
    this.y = Math.random() * (h - this.radius * 2) + this.radius;
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
    ctx.fillStyle = 'rgba(114,243,232,' + this.opacity + ')';
    ctx.fill();
  }
}

/* =========================
   INIT
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
  const ps = new ParticleSystem('particles', ['cardLeft', 'cardRight']);
});

// =========================
// GESTION DES MODALES
// =========================
class ModalManager {
  constructor() {
    this.modals = {
      login: document.getElementById('loginModal'),
      contact: document.getElementById('contactModal')
    };
    
    this.triggers = {
      login: document.getElementById('openLogin'),
      contact: document.getElementById('openContact')
    };
    
    this.init();
  }

  init() {
    // Ouvrir les modales
    Object.keys(this.triggers).forEach(key => {
      if (this.triggers[key]) {
        this.triggers[key].addEventListener('click', (e) => {
          e.preventDefault();
          this.open(this.modals[key]);
        });
      }
    });

    // Fermer via bouton close
    document.querySelectorAll('.close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal, .modal-full');
        this.close(modal);
      });
    });

    // Fermer en cliquant à l'extérieur
    Object.values(this.modals).forEach(modal => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            this.close(modal);
          }
        });
      }
    });

    // Fermer avec Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        Object.values(this.modals).forEach(modal => this.close(modal));
      }
    });
  }

  open(modal) {
    if (!modal) return;
    
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Focus sur le premier élément interactif
    setTimeout(() => {
      const firstFocusable = modal.querySelector('button:not(:disabled), input:not(:disabled)');
      if (firstFocusable) firstFocusable.focus();
    }, 100);
  }

  close(modal) {
    if (!modal) return;
    
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = 'auto';
  }
}

// =========================
// ANIMATION DES CARTES
// =========================
class CardAnimator {
  constructor() {
    this.cards = document.querySelectorAll('article');
    this.init();
  }
  init() {
    this.setupObserver();
    this.setupKeyboardNavigation();
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
    document.querySelectorAll('article button[data-link]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const href = btn.getAttribute('data-link');
        if (href) {
          window.location.href = href;
        }
      });
    });
  }
}

// =========================
// GESTION DES PERFORMANCES
// =========================
class PerformanceOptimizer {
  constructor() {
    this.init();
  }

  init() {
    // Préchargement des ressources critiques
    this.preloadCriticalResources();
    
    // Détection de la préférence de mouvement réduit
    this.handleReducedMotion();
    
    // Optimisation du scroll
    this.optimizeScrollPerformance();
  }

  preloadCriticalResources() {
    // Précharger la page coming-soon
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = 'coming-soon.html';
    document.head.appendChild(link);
  }

  handleReducedMotion() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    if (prefersReducedMotion.matches) {
      document.body.classList.add('reduced-motion');
    }

    prefersReducedMotion.addEventListener('change', (e) => {
      if (e.matches) {
        document.body.classList.add('reduced-motion');
      } else {
        document.body.classList.remove('reduced-motion');
      }
    });
  }

  optimizeScrollPerformance() {
    let ticking = false;
    
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Optimisations de scroll ici si nécessaire
          ticking = false;
        });
        ticking = true;
      }
    });
  }
}

// =========================
// UTILITAIRES
// =========================
const Utils = {
  // Débounce pour les événements fréquents
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle pour limiter la fréquence d'exécution
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

  // Vérifier si un élément est visible
  isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }
};

// =========================
// GESTION DES ERREURS
// =========================
class ErrorHandler {
  constructor() {
    this.init();
  }

  init() {
    window.addEventListener('error', (e) => {
      console.error('Erreur globale:', e.error);
      // Ici vous pourriez envoyer l'erreur à un service de monitoring
    });

    window.addEventListener('unhandledrejection', (e) => {
      console.error('Promise rejetée:', e.reason);
    });
  }
}

// =========================
// INITIALISATION
// =========================
class App {
  constructor() {
    this.init();
  }

  init() {
    // Vérifier que le DOM est chargé
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
    } else {
      this.start();
    }
  }

  start() {
    try {
      // Initialiser tous les modules
      this.particleSystem = new ParticleSystem('particles');
      this.modalManager = new ModalManager();
      this.cardAnimator = new CardAnimator();
      this.performanceOptimizer = new PerformanceOptimizer();
      this.errorHandler = new ErrorHandler();
      
      // Logger le démarrage réussi
      console.log('✅ Multi-hub initialisé avec succès');
      
      // Ajouter une classe au body pour indiquer que le JS est chargé
      document.body.classList.add('js-loaded');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
    }
  }
}

// Démarrer l'application
const app = new App();

// =========================
// EXPORT POUR DEBUGGING
// =========================
if (typeof window !== 'undefined') {
  window.MultiHub = {
    app,
    version: '2.0.0',
    config: CONFIG,
    utils: Utils
  };
}



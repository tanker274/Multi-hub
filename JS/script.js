/* =========================
   CONFIGURATION
========================= */
const CONFIG = {
  particleCount: 60,
  particleSpeed: 0.8,
  connectionDistance: 140,
  maxVelocity: 2.5
};

/* =========================
   PARTICLE CLASS
========================= */
class Particle {
  constructor(canvas) {
    const w = canvas.width;
    const h = canvas.height;
    
    this.radius = Math.random() * 2 + 0.5;
    this.x = this.radius + Math.random() * (w - this.radius * 2);
    this.y = this.radius + Math.random() * (h - this.radius * 2);
    
    const speed = CONFIG.particleSpeed * (0.5 + Math.random() * 0.5);
    const angle = Math.random() * Math.PI * 2;
    
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.opacity = 0.3 + Math.random() * 0.4;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
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
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.particles = [];
    this.cardElements = cardIds.map(id => document.getElementById(id)).filter(Boolean);
    this.cards = [];
    
    this._resizeCanvas();
    this._createParticles();
    this.updateCardsFromDOM();
    
    window.addEventListener('resize', () => this._onResize());
    this._animate();
  }

  _onResize() {
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => {
      const oldW = this.canvas.width;
      const oldH = this.canvas.height;
      
      this._resizeCanvas();
      
      const scaleX = this.canvas.width / oldW;
      const scaleY = this.canvas.height / oldH;
      
      this.particles.forEach(p => {
        p.x *= scaleX;
        p.y *= scaleY;
      });
      
      this.updateCardsFromDOM();
    }, 150);
  }

  _resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  updateCardsFromDOM() {
    this.cards = this.cardElements.map(el => el.getBoundingClientRect());
  }

  _createParticles() {
    this.particles = [];
    for (let i = 0; i < CONFIG.particleCount; i++) {
      this.particles.push(new Particle(this.canvas));
    }
  }

  _drawConnections() {
    const distMax = CONFIG.connectionDistance;
    const distMaxSq = distMax * distMax;

    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const A = this.particles[i];
        const B = this.particles[j];
        const dx = A.x - B.x;
        const dy = A.y - B.y;
        const d2 = dx * dx + dy * dy;

        if (d2 < distMaxSq) {
          const dist = Math.sqrt(d2);
          const alpha = 0.15 * (1 - dist / distMax);
          
          this.ctx.beginPath();
          this.ctx.moveTo(A.x, A.y);
          this.ctx.lineTo(B.x, B.y);
          this.ctx.strokeStyle = `rgba(91, 209, 255, ${alpha})`;
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        }
      }
    }
  }

  _animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this._drawConnections();
    
    for (const p of this.particles) {
      p.update();
      this._constrainParticle(p);
      p.draw(this.ctx);
    }
    
    requestAnimationFrame(() => this._animate());
  }

  _constrainParticle(p) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const margin = p.radius + 2;
    
    // Rebonds sur les bords
    if (p.x <= margin || p.x >= w - margin) {
      p.vx *= -0.85;
      p.x = Math.max(margin, Math.min(w - margin, p.x));
    }
    
    if (p.y <= margin || p.y >= h - margin) {
      p.vy *= -0.85;
      p.y = Math.max(margin, Math.min(h - margin, p.y));
    }

    // Collision avec les cartes
    for (const rect of this.cards) {
      const nx = Math.max(rect.left, Math.min(p.x, rect.right));
      const ny = Math.max(rect.top, Math.min(p.y, rect.bottom));
      const dx = p.x - nx;
      const dy = p.y - ny;
      const d2 = dx * dx + dy * dy;
      const minDist = p.radius + 5;
      
      if (d2 < minDist * minDist && d2 > 0) {
        const dist = Math.sqrt(d2);
        const overlap = minDist - dist;
        const ndx = dx / dist;
        const ndy = dy / dist;
        
        p.x += ndx * overlap;
        p.y += ndy * overlap;
        
        const dotProduct = p.vx * ndx + p.vy * ndy;
        p.vx = (p.vx - 2 * dotProduct * ndx) * 0.8;
        p.vy = (p.vy - 2 * dotProduct * ndy) * 0.8;
      }
    }
    
    // Limite de vélocité
    const max = CONFIG.maxVelocity;
    p.vx = Math.max(-max, Math.min(max, p.vx));
    p.vy = Math.max(-max, Math.min(max, p.vy));
  }
}

/* =========================
   MODAL MANAGER
========================= */
class ModalManager {
  constructor() {
    this.modal = document.getElementById('betaModal');
    if (!this.modal) return;
    
    this.featureNameElement = document.getElementById('betaFeatureName');
    
    // Ouverture
    document.querySelectorAll('.open-beta-modal').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const featureName = trigger.dataset.modalTitle || "Cette page";
        if (this.featureNameElement) {
          this.featureNameElement.textContent = featureName;
        }
        this.open();
      });
    });

    // Fermeture
    document.querySelectorAll('.close').forEach(btn => {
      btn.addEventListener('click', () => this.close());
    });

    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display === 'flex') {
        this.close();
      }
    });
  }

  open() {
    this.modal.style.display = 'flex';
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
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
    this.cards = document.querySelectorAll('.card');
    this._setupObserver();
    this._setupButtons();
  }

  _setupObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('show-card');
          }, index * 120);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    this.cards.forEach(card => {
      card.style.opacity = '0';
      observer.observe(card);
    });
  }

  _setupButtons() {
    document.querySelectorAll('.card button[data-link]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const href = btn.getAttribute('data-link');
        if (href) window.location.href = href;
      });
    });
  }
}

/* =========================
   INITIALISATION
========================= */
document.addEventListener('DOMContentLoaded', () => {
  new ParticleSystem('particles', ['card-mc', 'card-phasmo', 'card-scp', 'card-outils']);
  new ModalManager();
  new CardAnimator();
  
  console.log('✅ Multi-hub initialisé');
});
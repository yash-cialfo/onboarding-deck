/**
 * deck-stage.js
 * Custom element that powers the <deck-stage> slide deck.
 * Recreated to match the API expected by index.html:
 *   - Renders slides as a full-screen presenter deck
 *   - Sets data-deck-active on the current slide (CSS animations key off this)
 *   - Fires a 'slidechange' CustomEvent on itself whenever the slide changes
 *   - Keyboard: ← → (and ArrowLeft/ArrowRight), click to advance
 *   - Touch: swipe left/right
 */
class DeckStage extends HTMLElement {
  constructor() {
    super();
    this._idx = 0;
    this._slides = [];
    this._transitioning = false;
  }

  connectedCallback() {
    // Gather slides
    this._slides = Array.from(this.querySelectorAll(':scope > section'));
    if (!this._slides.length) return;

    // Base styles on the host element
    Object.assign(this.style, {
      display:        'block',
      position:       'relative',
      width:          '100%',
      height:         '100vh',
      overflow:       'hidden',
      background:     '#000',
    });

    // Style every slide: stacked, full-size, hidden by default
    this._slides.forEach((s, i) => {
      Object.assign(s.style, {
        position:   'absolute',
        inset:      '0',
        width:      '100%',
        height:     '100%',
        overflow:   'hidden',
        opacity:    '0',
        transition: 'opacity 0.45s cubic-bezier(0.16,1,0.3,1)',
        pointerEvents: 'none',
      });
    });

    // Navigation UI
    this._buildNav();

    // Show first slide
    this._goto(0, true);

    // Keyboard
    this._onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault(); this.next();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault(); this.prev();
      }
    };
    window.addEventListener('keydown', this._onKey);

    // Click to advance (ignore clicks on links/buttons)
    this._onClick = (e) => {
      if (e.target.closest('a, button, input, select, textarea')) return;
      this.next();
    };
    this.addEventListener('click', this._onClick);

    // Touch swipe
    let tx = 0;
    this.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
    this.addEventListener('touchend',   (e) => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 40) dx < 0 ? this.next() : this.prev();
    });
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this._onKey);
  }

  _buildNav() {
    const nav = document.createElement('div');
    Object.assign(nav.style, {
      position:       'fixed',
      bottom:         '24px',
      left:           '50%',
      transform:      'translateX(-50%)',
      zIndex:         '9999',
      display:        'flex',
      alignItems:     'center',
      gap:            '12px',
      background:     'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(10px)',
      borderRadius:   '999px',
      padding:        '8px 18px',
      userSelect:     'none',
    });

    const btn = (label, action) => {
      const b = document.createElement('button');
      b.textContent = label;
      Object.assign(b.style, {
        background:   'none',
        border:       'none',
        color:        '#fff',
        fontSize:     '20px',
        cursor:       'pointer',
        padding:      '4px 8px',
        opacity:      '0.8',
        lineHeight:   '1',
      });
      b.addEventListener('click', (e) => { e.stopPropagation(); action(); });
      return b;
    };

    this._prevBtn  = btn('←', () => this.prev());
    this._counter  = document.createElement('span');
    Object.assign(this._counter.style, { color: 'rgba(255,255,255,0.7)', fontSize: '13px', minWidth: '56px', textAlign: 'center' });
    this._nextBtn  = btn('→', () => this.next());

    nav.append(this._prevBtn, this._counter, this._nextBtn);
    document.body.appendChild(nav);
    this._nav = nav;
  }

  _goto(idx, instant = false) {
    const slides = this._slides;
    if (idx < 0 || idx >= slides.length) return;

    const prev = slides[this._idx];
    const next = slides[idx];

    // Remove active from old slide
    if (prev && prev !== next) {
      prev.removeAttribute('data-deck-active');
      prev.style.opacity = '0';
      prev.style.pointerEvents = 'none';
    }

    this._idx = idx;

    // Activate new slide
    if (instant) next.style.transition = 'none';
    next.style.opacity      = '1';
    next.style.pointerEvents = '';
    next.setAttribute('data-deck-active', '');

    // Restore transition after instant set
    if (instant) requestAnimationFrame(() => { next.style.transition = ''; });

    // Update counter
    if (this._counter) {
      this._counter.textContent = `${idx + 1} / ${slides.length}`;
    }
    if (this._prevBtn) this._prevBtn.style.opacity = idx === 0 ? '0.3' : '0.8';
    if (this._nextBtn) this._nextBtn.style.opacity = idx === slides.length - 1 ? '0.3' : '0.8';

    // Fire event (used by JS in index.html for animations)
    this.dispatchEvent(new CustomEvent('slidechange', {
      bubbles: true,
      detail: { slide: next, index: idx },
    }));
  }

  next() { this._goto(Math.min(this._idx + 1, this._slides.length - 1)); }
  prev() { this._goto(Math.max(this._idx - 1, 0)); }
  goto(n) { this._goto(n); }
}

customElements.define('deck-stage', DeckStage);

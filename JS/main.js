(() => {
  const body = document.body;
  const header = document.querySelector('header');
  const currentPath = window.location.pathname.replace(/\\/g, '/').toLowerCase();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mark document as JS-enabled so CSS can activate enhanced states.
  body.classList.add('js-enhanced');

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const normalizePath = (value) => String(value || '').replace(/\\/g, '/').toLowerCase();

  // Local Python API endpoint. Keep in one place so it's easy to change later.
  const API_BASE = 'http://127.0.0.1:5000';

  const postJson = async (path, payload) => {
    try {
      await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch {
      // Silent fail: website should still work even if backend is not running.
    }
  };

  // Global reading progress bar at the top of the page.
  const progress = document.createElement('div');
  progress.className = 'js-progress';
  document.body.appendChild(progress);

  function initSupportWidget() {
    // Floating support chat shown on every page.
    const supportWidget = document.createElement('div');
    supportWidget.className = 'support-agent';
    supportWidget.innerHTML = `
      <div class="support-agent-panel" id="supportAgentPanel">
        <div class="support-agent-head">
          <div class="support-agent-meta">
            <span class="support-agent-avatar">A</span>
            <div>
              <strong>Aleks</strong>
              <small>Support Agent</small>
            </div>
          </div>
          <button class="support-agent-close" type="button" aria-label="Close support">×</button>
        </div>
        <div class="support-agent-body">
          <div class="support-agent-messages" id="supportAgentMessages">
            <div class="support-msg agent">Hi there. Need help with your order or device today?</div>
          </div>
          <div class="support-agent-quick">
            <button type="button" class="support-quick">Can I return my order?</button>
            <button type="button" class="support-quick">My order is on hold</button>
            <button type="button" class="support-quick">Payment issue</button>
          </div>
          <div class="support-agent-actions">
            <input type="text" id="supportAgentInput" placeholder="Write a message..." aria-label="Message support" />
            <button class="support-agent-send" id="supportAgentSend" type="button">Send</button>
          </div>
        </div>
      </div>
      <button class="support-agent-toggle" id="supportAgentToggle" type="button" aria-label="Open support chat">
        <img class="support-agent-toggle-icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/chat-dots-fill.svg" alt="" aria-hidden="true" />
      </button>
    `;
    document.body.appendChild(supportWidget);

    const panel = qs('#supportAgentPanel', supportWidget);
    const toggleButton = qs('#supportAgentToggle', supportWidget);
    const closeButton = qs('.support-agent-close', supportWidget);
    const messages = qs('#supportAgentMessages', supportWidget);
    const input = qs('#supportAgentInput', supportWidget);
    const sendButton = qs('#supportAgentSend', supportWidget);
    const quickButtons = qsa('.support-quick', supportWidget);

    const getSupportReply = (text) => {
      const normalized = text.toLowerCase();
      if (normalized.includes('return')) return 'Yes. Returns are available within 30 days from delivery.';
      if (normalized.includes('hold')) return 'Order hold usually means payment verification. Support can release it in minutes.';
      if (normalized.includes('payment')) return 'Try another card or contact your bank, then message us with order ID.';
      return 'I can help with orders, returns, payments, and device setup. What do you need?';
    };

    const addMessage = (text, type) => {
      if (!messages) return;
      const row = document.createElement('div');
      row.className = `support-msg ${type}`;
      row.textContent = text;
      messages.appendChild(row);
      messages.scrollTop = messages.scrollHeight;
    };

    const sendMessage = () => {
      const userText = input?.value.trim();
      if (!userText) return;

      addMessage(userText, 'user');
      postJson('/api/feedback', {
        message: userText,
        page: window.location.pathname
      });

      if (input) input.value = '';

      setTimeout(() => addMessage(getSupportReply(userText), 'agent'), 400);
    };

    // Auto-open once per session so it feels helpful, not spammy.
    const supportSeen = sessionStorage.getItem('nuvio_support_seen') === '1';
    if (!supportSeen) {
      setTimeout(() => {
        panel?.classList.add('show');
        sessionStorage.setItem('nuvio_support_seen', '1');
      }, 1800);
    }

    toggleButton?.addEventListener('click', () => panel?.classList.toggle('show'));
    closeButton?.addEventListener('click', () => panel?.classList.remove('show'));
    sendButton?.addEventListener('click', sendMessage);

    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') sendMessage();
    });

    quickButtons.forEach((button) => {
      button.addEventListener('click', () => {
        if (input) input.value = button.textContent || '';
        sendMessage();
      });
    });
  }

  function initActiveNav() {
    // Highlight current nav item based on current path.
    const navLinks = qsa('header ul li a').filter((link) => {
      const href = link.getAttribute('href');
      return href && href !== '#';
    });

    const isHome =
      currentPath.endsWith('/index.html') ||
      currentPath.endsWith('/nuvio/') ||
      currentPath.endsWith('/nuvio');

    navLinks.forEach((link) => {
      const href = normalizePath(link.getAttribute('href'));
      const listItem = link.closest('li');
      const cleanHref = href.replace(/^\.\//, '');
      const fileName = href.split('/').pop();

      const isMatch =
        (isHome && (href.endsWith('index.html') || href === './' || href === '../index.html')) ||
        currentPath.endsWith(cleanHref) ||
        (currentPath.includes('/pages/') && href.includes('/pages/') && fileName && currentPath.endsWith(fileName));

      if (isMatch && listItem && !listItem.classList.contains('nav-logo')) {
        listItem.classList.add('nav-active');
      }
    });
  }

  function initHeaderEffects() {
    // Add shadow + update progress width while scrolling.
    const updateHeader = () => {
      if (!header) return;

      header.classList.toggle('is-scrolled', window.scrollY > 8);

      const scrollTop = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const percent = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
      progress.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    };

    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

  function initSmoothHashScroll() {
    // Smooth-scroll only for valid same-page anchors.
    qsa('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (event) => {
        const targetId = anchor.getAttribute('href');
        if (!targetId || targetId === '#') return;

        const target = qs(targetId);
        if (!target) return;

        event.preventDefault();
        target.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start'
        });
      });
    });
  }

  function initRevealOnScroll() {
    // Progressive reveal for page sections and cards.
    const revealSelectors = [
      'section',
      '.feature',
      '.product-card',
      '.acc-card',
      '.os-feature-card',
      '.profile-card',
      '.bag-item',
      '.suggestion-card',
      '.os-spec-row'
    ];

    const revealTargets = qsa(revealSelectors.join(','));
    revealTargets.forEach((el) => el.classList.add('js-reveal-target'));

    if (!('IntersectionObserver' in window)) {
      revealTargets.forEach((el) => el.classList.add('js-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('js-visible');
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -24px 0px' }
    );

    revealTargets.forEach((el) => observer.observe(el));
  }

  function initButtonFeedback() {
    // Toast + ripple feedback for buy/add buttons.
    const shopButtons = qsa('button').filter((button) => {
      const text = (button.textContent || '').trim().toLowerCase();
      return text.includes('add to bag') || text === 'buy';
    });

    let toast;
    let toastTimer;

    const showToast = (message) => {
      if (!toast) {
        toast = document.createElement('div');
        toast.className = 'js-toast';
        document.body.appendChild(toast);
      }

      toast.textContent = message;
      toast.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1200);
    };

    shopButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const card = button.closest('.product-card, .acc-card, .suggestion-card, .bag-item');
        const label = (qs('h3', card || undefined)?.textContent || 'Item').trim();
        showToast(`${label} added`);
      });

      button.addEventListener('click', (event) => {
        const rect = button.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'js-ripple';
        ripple.style.left = `${event.clientX - rect.left}px`;
        ripple.style.top = `${event.clientY - rect.top}px`;
        button.appendChild(ripple);
        window.setTimeout(() => ripple.remove(), 450);
      });
    });
  }

  function initImageLoadReveal() {
    // Fade images in when loaded (excluding small nav/system icons).
    const images = qsa('main img:not(.icon):not(.logo):not(.device-icon)');
    images.forEach((image) => {
      image.classList.add('js-img');

      if (image.complete) {
        image.classList.add('js-img-loaded');
        return;
      }

      image.addEventListener('load', () => image.classList.add('js-img-loaded'), { once: true });
    });
  }

  function initMagneticButtons() {
    if (prefersReducedMotion) return;

    // Slight cursor-follow movement for tactile button feel.
    const magneticButtons = qsa('button:not(.support-agent-close):not(.support-agent-send):not(.support-quick), .btn-buy, .btn-checkout');
    magneticButtons.forEach((button) => {
      button.addEventListener('mousemove', (event) => {
        const rect = button.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        button.style.transform = `translate(${x * 3}px, ${y * 3}px)`;
      });

      button.addEventListener('mouseleave', () => {
        button.style.transform = '';
      });
    });
  }

  function initShoppingBag() {
    // Shopping bag updates: quantity, remove item, and totals.
    const bagItemsWrap = qs('.bag-items');
    const subtotalNode = qs('.summary-row span');
    const taxNode = qs('.summary-row:nth-child(3) span:last-child');
    const totalNode = qs('.summary-row.total span:last-child');

    if (!bagItemsWrap || !subtotalNode || !taxNode || !totalNode) return;

    const parseMoney = (text) => Number(String(text).replace(/[^0-9.]/g, '')) || 0;
    const formatMoney = (value) => `$${value.toFixed(2).replace(/\.00$/, '')}`;

    const recalcTotals = () => {
      const rows = qsa('.bag-item', bagItemsWrap);
      let subtotal = 0;
      let itemCount = 0;

      rows.forEach((row) => {
        const price = parseMoney(qs('.bag-item-price', row)?.textContent);
        const qty = Number(qs('.bag-item-qty span', row)?.textContent) || 1;
        subtotal += price * qty;
        itemCount += qty;
      });

      const tax = subtotal * 0.08;
      const total = subtotal + tax;

      subtotalNode.textContent = formatMoney(subtotal);
      taxNode.textContent = formatMoney(tax);
      totalNode.textContent = formatMoney(total);

      const subtotalLabel = qs('.summary-row span');
      if (subtotalLabel) {
        subtotalLabel.textContent = `Subtotal (${itemCount} item${itemCount === 1 ? '' : 's'})`;
      }
    };

    bagItemsWrap.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const row = target.closest('.bag-item');
      if (!row) return;

      if (target.classList.contains('qty-btn')) {
        const qtyNode = qs('.bag-item-qty span', row);
        if (!qtyNode) return;

        const isMinus = target.textContent?.includes('−') || target.textContent?.includes('-');
        const currentQty = Number(qtyNode.textContent) || 1;
        const nextQty = isMinus ? Math.max(1, currentQty - 1) : currentQty + 1;

        qtyNode.textContent = String(nextQty);
        recalcTotals();
      }

      if (target.classList.contains('bag-remove')) {
        event.preventDefault();
        row.remove();
        recalcTotals();
      }
    });

    recalcTotals();
  }

  function initBackendTracking() {
    // Track one page view per page load with a tiny session id in sessionStorage.
    let sessionId = sessionStorage.getItem('nuvio_session_id');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem('nuvio_session_id', sessionId);
    }

    postJson('/api/track', {
      page: window.location.pathname,
      session_id: sessionId
    });
  }

  initBackendTracking();
  initSupportWidget();
  initActiveNav();
  initHeaderEffects();
  initSmoothHashScroll();
  initRevealOnScroll();
  initButtonFeedback();
  initImageLoadReveal();
  initMagneticButtons();
  initShoppingBag();
})();

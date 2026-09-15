// ============================================
// CONFIGURAÇÕES & CHECKOUT REDIRECTION ENGINE
// ============================================
const CONFIG = {
  CHECKOUT_BASICO: 'https://pay.kiwify.com.br/SEU_CHECKOUT_BASICO',
  CHECKOUT_UPGRADE: 'https://pay.kiwify.com.br/SEU_CHECKOUT_UPGRADE_30',
  CHECKOUT_COMPLETO: 'https://pay.kiwify.com.br/SEU_CHECKOUT_COMPLETO',
  CHECKOUT_DOWNSELL: 'https://pay.kiwify.com.br/SEU_CHECKOUT_DOWNSELL',
  OPEN_IN_NEW_TAB: false // true: abre nova aba | false: redirecionamento direto (maior conversão)
};

/**
 * Força o redirecionamento imediato para o checkout com disparo de Pixel e propagação de UTMs
 * @param {string} plan - 'basico' | 'upgrade' | 'completo' | 'downsell' | url direta
 * @param {Event} [event] - Evento de clique
 */
function redirectToCheckout(plan, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const isCompleto = plan === 'completo' || (typeof plan === 'string' && plan.includes('COMPLETO'));
  const isUpgrade = plan === 'upgrade' || (typeof plan === 'string' && plan.includes('UPGRADE'));
  const isDownsell = plan === 'downsell' || (typeof plan === 'string' && plan.includes('DOWNSELL'));
  
  let targetUrl = (plan && plan.startsWith('http')) 
    ? plan 
    : (isCompleto 
        ? CONFIG.CHECKOUT_COMPLETO 
        : (isUpgrade 
            ? CONFIG.CHECKOUT_UPGRADE 
            : (isDownsell ? CONFIG.CHECKOUT_DOWNSELL : CONFIG.CHECKOUT_BASICO)));
    
  const planName = isCompleto 
    ? 'Plano Completo (R$ 37) - Atlas Visual de Microbiologia de Alimentos' 
    : (isUpgrade 
        ? 'Plano Premium Upgrade (R$ 30) - Atlas Visual de Microbiologia de Alimentos' 
        : (isDownsell 
            ? 'Plano Essencial / Downsell (R$ 19) - Atlas Visual de Microbiologia de Alimentos' 
            : 'Plano Básico (R$ 27) - Atlas Visual de Microbiologia de Alimentos'));
  const planPrice = isCompleto ? 37.00 : (isUpgrade ? 30.00 : (isDownsell ? 19.00 : 27.00));
  const planId = isCompleto ? 'plano_completo' : (isUpgrade ? 'plano_upgrade_30' : (isDownsell ? 'plano_downsell' : 'plano_basico'));

  // 1. Disparo do Meta Pixel InitiateCheckout
  if (typeof window.fbq === 'function') {
    try {
      window.fbq('track', 'InitiateCheckout', {
        content_name: planName,
        content_category: 'Infoproduto / Ebook',
        content_ids: [planId],
        value: planPrice,
        currency: 'BRL'
      });
    } catch (err) {
      console.warn('Pixel tracking notice:', err);
    }
  }

  // 2. Preservação de UTMs e parâmetros de rastreamento da URL atual
  let finalUrl = targetUrl;
  if (window.location.search && window.location.search.length > 1) {
    const currentParams = new URLSearchParams(window.location.search);
    try {
      const urlObj = new URL(targetUrl);
      currentParams.forEach((val, key) => {
        urlObj.searchParams.set(key, val);
      });
      finalUrl = urlObj.toString();
    } catch (e) {
      finalUrl += (targetUrl.includes('?') ? '&' : '?') + window.location.search.substring(1);
    }
  }

  // 3. Forçamento de Redirecionamento (window.location.href / window.open)
  if (CONFIG.OPEN_IN_NEW_TAB) {
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  } else {
    window.location.href = finalUrl;
  }
}

// ============================================
// UPGRADE MODAL ENGINE (R$ 27 -> R$ 30 BUMP)
// ============================================
const upgradeModal = document.getElementById('upgrade-modal');
const upgradeCloseBtn = document.getElementById('upgrade-close-btn');
const upgradeBackdrop = document.getElementById('upgrade-backdrop');
const btnUpgradeAccept = document.getElementById('btn-upgrade-accept');
const btnUpgradeDecline = document.getElementById('btn-upgrade-decline');

function openUpgradeModal() {
  if (upgradeModal) {
    upgradeModal.classList.add('open');
    upgradeModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
}

function closeUpgradeModal() {
  if (upgradeModal) {
    upgradeModal.classList.remove('open');
    upgradeModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

if (upgradeCloseBtn) upgradeCloseBtn.addEventListener('click', closeUpgradeModal);
if (upgradeBackdrop) upgradeBackdrop.addEventListener('click', closeUpgradeModal);

if (btnUpgradeAccept) {
  btnUpgradeAccept.addEventListener('click', function(e) {
    redirectToCheckout('upgrade', e);
  });
}

if (btnUpgradeDecline) {
  btnUpgradeDecline.addEventListener('click', function(e) {
    closeUpgradeModal();
    redirectToCheckout('basico', e);
  });
}

// Global Event Delegation para Checkout e Navegação
document.addEventListener('click', function(e) {
  // A. Botões de Checkout
  const checkoutBtn = e.target.closest('[data-plan], .plan-cta, a[href*="kiwify"], a[href*="payt"], a[href*="checkout"]');
  if (checkoutBtn && !checkoutBtn.closest('#upgrade-modal')) {
    const plan = checkoutBtn.getAttribute('data-plan') || (checkoutBtn.href && checkoutBtn.href.includes('COMPLETO') ? 'completo' : (checkoutBtn.href && checkoutBtn.href.includes('DOWNSELL') ? 'downsell' : 'basico'));
    
    // Intercepta clique no Plano Básico para abrir modal de upgrade
    if (plan === 'basico' || (checkoutBtn.href && checkoutBtn.href.includes('BASICO'))) {
      e.preventDefault();
      e.stopPropagation();
      openUpgradeModal();
      return;
    }

    redirectToCheckout(plan, e);
    return;
  }

  // B. Âncoras internas (#oferta, #amostra, etc.)
  const anchor = e.target.closest('a[href^="#"]');
  if (anchor) {
    const hash = anchor.getAttribute('href');
    if (hash && hash.length > 1) {
      const targetEl = document.querySelector(hash);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth' });
        if (window.history && window.history.pushState) {
          window.history.pushState(null, null, hash);
        }
      }
    }
  }
});

// Dynamic Year
const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// FAQ Accordion Icon Toggle Animation
document.querySelectorAll('.faq-item').forEach(details => {
  details.addEventListener('toggle', () => {
    const icon = details.querySelector('.faq-icon');
    if (icon) {
      icon.textContent = details.open ? '−' : '+';
    }
  });
});

// ============================================
// LIGHTBOX ZOOM MODAL FOR INFINITE MARQUEE CARDS
// ============================================
const lightbox = document.getElementById('lightbox-modal');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxClose = document.querySelector('.lightbox-close-btn');
const lightboxBackdrop = document.querySelector('.lightbox-backdrop');
let isLightboxOpen = false;

document.addEventListener('click', function(e) {
  const card = e.target.closest('.marquee-page-item, .marquee-card');
  if (card && lightbox) {
    const src = card.getAttribute('data-src') || card.querySelector('img')?.src;
    if (lightboxImg && src) lightboxImg.src = src;
    if (lightboxCaption) lightboxCaption.textContent = '';
    
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    isLightboxOpen = true;
  }
});

function closeLightbox() {
  if (lightbox) {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    isLightboxOpen = false;
  }
}

if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
if (lightboxBackdrop) lightboxBackdrop.addEventListener('click', closeLightbox);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeLightbox();
    closeUpgradeModal();
  }
});

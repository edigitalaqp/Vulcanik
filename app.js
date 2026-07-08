/* ============================================
   VULKANIC SOFT PERU – APP LOGIC v2
   ============================================ */

var state = {
  products: [],
  settings: { whatsapp: '32466458677', storeName: 'Vulkanic Soft Peru', adminPassword: 'vulkanic2025', firebaseConfig: null, cloudinaryName: '', cloudinaryPreset: '' },
  adminAuthenticated: false,
  editingProductId: null,
  db: null,
  unsubscribe: null,
  currentPage: 'inicio',
  searchQuery: '',
  productPage: 1,
  productsPerPage: 9
};

document.addEventListener('DOMContentLoaded', function () {
  loadSettingsFromStorage();
  initNavigation();
  initLavaParticles();
  initProductsParticles();
  initContactParticles();
  bindEvents();
  updateWhatsAppLinks();
  initFirebase();
  if (window.location.hash === '#ownerVulkanic') {
    history.replaceState(null, '', window.location.pathname);
    openAdmin();
  }
});

window.addEventListener('hashchange', function () {
  if (window.location.hash === '#ownerVulkanic') {
    history.replaceState(null, '', window.location.pathname);
    openAdmin();
  }
});

function loadSettingsFromStorage() {
  var s = localStorage.getItem('vk_settings');
  if (s) { try { state.settings = Object.assign({}, state.settings, JSON.parse(s)); } catch (e) { } }
}
function saveSettingsToStorage() { localStorage.setItem('vk_settings', JSON.stringify(state.settings)); }

function loadLocalProducts() {
  var s = localStorage.getItem('vk_products');
  if (s) { try { state.products = JSON.parse(s); } catch (e) { state.products = []; } }
  if (state.products.length === 0) loadSampleProducts();
  else { renderProducts(); renderAdminProductList(); }
}
function saveLocalProducts() { localStorage.setItem('vk_products', JSON.stringify(state.products)); }

function initFirebase(config) {
  var cfg = config || state.settings.firebaseConfig;
  if (!cfg) { loadLocalProducts(); updateFirebaseStatusUI(false); return; }
  try {
    if (firebase.apps.length > 0) firebase.apps.forEach(function (a) { a.delete(); });
    firebase.initializeApp(cfg);
    var db = firebase.firestore();
    state.db = db;
    startFirestoreListener(db);
    updateFirebaseStatusUI(true);
  } catch (err) {
    updateFirebaseStatusUI(false);
    showToast('Error Firebase. Modo local.', 'error');
    loadLocalProducts();
  }
}

function startFirestoreListener(db) {
  if (state.unsubscribe) state.unsubscribe();
  state.unsubscribe = db.collection('products').orderBy('createdAt', 'asc').onSnapshot(
    function (snapshot) {
      state.products = snapshot.docs.map(function (doc) { return Object.assign({ id: doc.id }, doc.data()); });
      renderProducts(); renderAdminProductList();
    },
    function (err) {
      showToast('Error Firestore.', 'error'); state.db = null; updateFirebaseStatusUI(false); loadLocalProducts();
    }
  );
}

function updateFirebaseStatusUI(connected) {
  var dot = document.getElementById('firebaseStatusDot'), text = document.getElementById('firebaseStatusText');
  if (!dot || !text) return;
  if (connected) { dot.style.background = '#22c55e'; dot.style.boxShadow = '0 0 8px #22c55e'; text.textContent = 'Conectado'; text.style.color = '#22c55e'; }
  else { dot.style.background = '#f59e0b'; dot.style.boxShadow = '0 0 8px #f59e0b'; text.textContent = 'Sin conectar'; text.style.color = '#f59e0b'; }
}

function loadSampleProducts() {
  state.products = [
    { id: 'sp1', name: 'Windows 11 Pro', category: 'Sistema Operativo', price: 35, oldPrice: 65, description: 'Licencia original de Windows 11 Pro con activacion permanente.', features: ['Activacion permanente', 'Para 1 PC', 'Soporte tecnico incluido'], emoji: '🖥', imageUrl: '', featured: true },
    { id: 'sp2', name: 'Microsoft Office 365', category: 'Suite Ofimatica', price: 45, oldPrice: 80, description: 'Suite completa de Microsoft Office con Word, Excel, PowerPoint.', features: ['Word, Excel, PowerPoint', 'Teams y OneDrive', '1 TB almacenamiento'], emoji: '📊', imageUrl: '', featured: false },
    { id: 'sp3', name: 'Antivirus Premium', category: 'Seguridad', price: 25, oldPrice: 50, description: 'Proteccion total contra virus y malware en tiempo real.', features: ['Proteccion en tiempo real', 'Anti-ransomware', '1 año de vigencia'], emoji: '🛡', imageUrl: '', featured: false },
    { id: 'sp4', name: 'Adobe Creative Cloud', category: 'Diseno', price: 55, oldPrice: 120, description: 'Acceso completo a todas las aplicaciones de Adobe.', features: ['Photoshop + Illustrator', 'Premiere Pro', '100 GB almacenamiento'], emoji: '🎨', imageUrl: '', featured: true },
    { id: 'sp5', name: 'VPN Premium Anual', category: 'Privacidad', price: 20, oldPrice: 40, description: 'Navega con total privacidad y seguridad.', features: ['Servidores en 60 paises', 'Sin limite', 'Soporte 24/7'], emoji: '🔐', imageUrl: '', featured: false },
    { id: 'sp6', name: 'Streaming Premium', category: 'Entretenimiento', price: 15, oldPrice: 30, description: 'Acceso a plataformas en calidad 4K Ultra HD.', features: ['Calidad 4K', 'Sin anuncios', '30 dias garantia'], emoji: '🎬', imageUrl: '', featured: false }
  ];
  saveLocalProducts(); renderProducts(); renderAdminProductList();
}

function initNavigation() {
  var toggle = document.getElementById('navToggle'), links = document.getElementById('navLinks');
  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    var isOpen = toggle.classList.toggle('open');
    links.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', isOpen);
  });
  document.addEventListener('click', function (e) {
    var nav = document.getElementById('navbar');
    if (nav && !nav.contains(e.target)) { toggle.classList.remove('open'); links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
  });
  document.querySelectorAll('[data-page]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      navigateToPage(btn.getAttribute('data-page'));
      toggle.classList.remove('open'); links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

function navigateToPage(pageId) {
  if (state.currentPage === pageId) return;
  var cur = document.getElementById('page-' + state.currentPage), tgt = document.getElementById('page-' + pageId);
  if (!tgt) return;
  if (cur) { cur.classList.remove('page-active'); cur.classList.add('page-exit'); }
  document.querySelectorAll('.nav-link').forEach(function (l) { l.classList.toggle('active', l.getAttribute('data-page') === pageId); });
  setTimeout(function () { if (cur) cur.classList.remove('page-exit'); tgt.scrollTop = 0; tgt.classList.add('page-active'); state.currentPage = pageId; }, 10);
}

function initParticles(id, count, opacity) {
  var container = document.getElementById(id); if (!container) return;
  var colors = ['#ff5500', '#ff7733', '#ffaa00', '#ffcc44', '#ff3300'];
  for (var i = 0; i < count; i++) {
    var p = document.createElement('div'); p.className = 'lava-particle';
    var size = Math.random() * 6 + 3, color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = 'width:' + size + 'px;height:' + size + 'px;background:' + color + ';box-shadow:0 0 ' + (size * 2) + 'px ' + color + ';left:' + (Math.random() * 100) + '%;animation-duration:' + (8 + Math.random() * 8) + 's;animation-delay:' + ((i * 0.4) % 10) + 's;' + (opacity ? 'opacity:' + opacity + ';' : '');
    container.appendChild(p);
  }
}
function initLavaParticles() { initParticles('lavaParticles', 25, 0); }
function initContactParticles() { initParticles('contactParticles', 15, 0.3); }
function initProductsParticles() { initParticles('productsParticles', 15, 0.25); }

function renderProducts(filterCategory) {
  filterCategory = filterCategory || 'all';
  var grid = document.getElementById('productsGrid'), empty = document.getElementById('emptyState'), pag = document.getElementById('productsPagination');
  if (!grid || !empty) return;
  var q = (state.searchQuery || '').toLowerCase().trim();
  var filtered = filterCategory === 'all' ? state.products : state.products.filter(function (p) { return p.category === filterCategory; });
  if (q) filtered = filtered.filter(function (p) { return (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q); });
  renderCategoryFilters(filterCategory);
  if (filtered.length === 0) { grid.innerHTML = ''; if (pag) pag.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  var total = Math.ceil(filtered.length / state.productsPerPage);
  if (state.productPage > total) state.productPage = 1;
  var start = (state.productPage - 1) * state.productsPerPage;
  var paged = filtered.slice(start, start + state.productsPerPage);
  grid.innerHTML = paged.map(function (p, i) { return productCardHTML(p, i); }).join('');
  grid.querySelectorAll('.product-card').forEach(function (c, i) { c.style.animationDelay = (i * 0.07) + 's'; });
  renderPagination(total, pag);
}

function renderPagination(total, container) {
  if (!container) return;
  if (total <= 1) { container.innerHTML = ''; return; }
  var cur = state.productPage;
  var h = '<div class="pagination-wrap">';
  h += '<button class="page-btn' + (cur === 1 ? ' disabled' : '') + '" id="pagePrev"' + (cur === 1 ? ' disabled' : '') + ' aria-label="Anterior"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg></button>';
  var range = [];
  for (var i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= cur - 1 && i <= cur + 1)) range.push(i);
    else if (range[range.length - 1] !== '...') range.push('...');
  }
  range.forEach(function (p) {
    if (p === '...') h += '<span class="page-ellipsis">...</span>';
    else h += '<button class="page-btn page-num' + (p === cur ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>';
  });
  h += '<button class="page-btn' + (cur === total ? ' disabled' : '') + '" id="pageNext"' + (cur === total ? ' disabled' : '') + ' aria-label="Siguiente"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg></button>';
  h += '<span class="page-info">Pag. ' + cur + ' / ' + total + '</span></div>';
  container.innerHTML = h;
  container.querySelectorAll('.page-num').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.productPage = parseInt(btn.dataset.page);
      var af = document.querySelector('.filter-btn.active');
      renderProducts(af ? af.dataset.category : 'all');
      document.getElementById('productsGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  var prev = document.getElementById('pagePrev'), next = document.getElementById('pageNext');
  if (prev) prev.addEventListener('click', function () { if (state.productPage > 1) { state.productPage--; var af = document.querySelector('.filter-btn.active'); renderProducts(af ? af.dataset.category : 'all'); document.getElementById('productsGrid').scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
  if (next) next.addEventListener('click', function () { if (state.productPage < total) { state.productPage++; var af = document.querySelector('.filter-btn.active'); renderProducts(af ? af.dataset.category : 'all'); document.getElementById('productsGrid').scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
}

function renderCategoryFilters(cur) {
  cur = cur || 'all';
  var container = document.getElementById('categoryFilters'); if (!container) return;
  var cats = ['Todos'].concat(Array.from(new Set(state.products.map(function (p) { return p.category; }))));
  container.innerHTML = cats.map(function (c) { var v = c === 'Todos' ? 'all' : c; return '<button class="filter-btn' + (cur === v ? ' active' : '') + '" data-category="' + v + '">' + c + '</button>'; }).join('');
  container.querySelectorAll('.filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      container.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active'); state.productPage = 1; renderProducts(btn.dataset.category);
    });
  });
}

function productCardHTML(p, i) {
  var media = p.imageUrl
    ? '<img src="' + escAttr(p.imageUrl) + '" alt="' + escAttr(p.name) + '" class="product-img" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.removeProperty(\'display\')" /><div class="product-emoji" style="display:none">' + (p.emoji || '📦') + '</div>'
    : '<div class="product-emoji">' + (p.emoji || '📦') + '</div>';
  var feats = (p.features || []).slice(0, 3).map(function (f) { return '<li class="product-feature">' + escHtml(f) + '</li>'; }).join('');
  var waIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
  return '<div class="product-card" onclick="openProductModal(\'' + p.id + '\')" style="animation-delay:' + (i * 0.07) + 's;">' + (p.featured ? '<div class="product-badge-featured">Destacado</div>' : '') + '<div class="product-card-top">' + media + '</div><div class="product-card-body"><div class="product-category">' + escHtml(p.category) + '</div><h3 class="product-name">' + escHtml(p.name) + '</h3><p class="product-desc">' + escHtml(p.description) + '</p><ul class="product-features">' + feats + '</ul><div class="product-footer"><div class="product-price-box">' + (p.oldPrice ? '<span class="product-old-price">S/ ' + Number(p.oldPrice).toFixed(2) + '</span>' : '') + '<span class="product-price">S/ ' + Number(p.price).toFixed(2) + '</span></div><button class="btn btn-primary btn-sm" onclick="event.stopPropagation();buyNow(\'' + p.id + '\')">' + waIcon + 'Comprar</button></div></div></div>';
}

function openProductModal(productId) {
  var p = state.products.find(function (x) { return x.id === productId; }); if (!p) return;
  var modal = document.getElementById('productModal'), body = document.getElementById('modalBody');
  var feats = p.features || [];
  var imgH = p.imageUrl ? '<img src="' + escAttr(p.imageUrl) + '" alt="' + escAttr(p.name) + '" class="modal-product-img" onerror="this.style.display=\'none\'" />'
    : '<div class="modal-product-emoji">' + (p.emoji || '📦') + '</div>';
  var waIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
  body.innerHTML = '<div class="modal-product-header">' + imgH + '<div class="modal-product-meta"><div class="modal-product-category">' + escHtml(p.category) + '</div><div class="modal-product-name">' + escHtml(p.name) + '</div></div></div><p class="modal-product-desc">' + escHtml(p.description) + '</p>' + (feats.length ? '<div class="modal-features"><h4>Caracteristicas</h4><ul class="modal-feature-list">' + feats.map(function (f) { return '<li>' + escHtml(f) + '</li>'; }).join('') + '</ul></div>' : '') + '<div class="modal-purchase"><div class="modal-price-display">' + (p.oldPrice ? '<span class="modal-old-price">S/ ' + Number(p.oldPrice).toFixed(2) + '</span>' : '') + '<span class="modal-price">S/ ' + Number(p.price).toFixed(2) + '</span></div><button class="btn btn-primary" onclick="buyNow(\'' + p.id + '\');closeProductModal();">' + waIcon + 'Comprar por WhatsApp</button></div>';
  modal.classList.add('open');
}

function closeProductModal() { document.getElementById('productModal').classList.remove('open'); }

function buyNow(productId) {
  var p = state.products.find(function (x) { return x.id === productId; }); if (!p) return;
  var msg = encodeURIComponent('Hola! Quiero comprar:\n\n*' + p.name + '*\nPrecio: S/ ' + Number(p.price).toFixed(2) + '\nCategoria: ' + p.category + '\n\nPodrias ayudarme?');
  window.open('https://wa.me/' + state.settings.whatsapp + '?text=' + msg, '_blank');
}

function updateWhatsAppLinks() { var wl = document.getElementById('whatsappLink'); if (wl) wl.href = 'https://wa.me/' + state.settings.whatsapp; }

function initContactForm() {
  var form = document.getElementById('contactForm'); if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('contactName').value.trim(), msg = document.getElementById('contactMsg').value.trim();
    if (!name || !msg) { showToast('Completa todos los campos', 'error'); return; }
    var text = encodeURIComponent('Hola! Soy *' + name + '*\n\n' + msg + '\n\n_Mensaje desde Vulkanic Soft Peru_');
    window.open('https://wa.me/' + state.settings.whatsapp + '?text=' + text, '_blank');
    form.reset(); showToast('Abriendo WhatsApp...', 'success');
  });
}

/* ─── TOTP ─── */
function getTotpSecret() { return localStorage.getItem('vk_totp_secret') || null; }
function saveTotpSecret(s) { localStorage.setItem('vk_totp_secret', s); }
function isTotpConfigured() { return !!getTotpSecret(); }

function generateTotpSecret() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', secret = '';
  var arr = new Uint8Array(32); crypto.getRandomValues(arr);
  arr.forEach(function (b) { secret += chars[b % 32]; }); return secret;
}

function verifyTotp(secret, token) {
  try {
    var totp = new OTPAuth.TOTP({ issuer: 'Vulkanic', label: 'Admin', algorithm: 'SHA1', digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) });
    return totp.validate({ token: token.replace(/\s/g, ''), window: 10 }) !== null;
  } catch (e) { return false; }
}

function showTotpSetup(secret) {
  var totp = new OTPAuth.TOTP({ issuer: 'Vulkanic Soft Peru', label: 'Admin', algorithm: 'SHA1', digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) });
  document.getElementById('totpSecretDisplay').textContent = 'Clave manual: ' + secret;
  document.getElementById('adminAuth').style.display = 'none';
  document.getElementById('adminTotpSetup').style.display = 'block';
  var qr = document.getElementById('totpQrContainer'); qr.innerHTML = '';
  var canvas = document.createElement('canvas');
  QRCode.toCanvas(canvas, totp.toString(), { width: 180, margin: 2, color: { dark: '#ffffff', light: '#111111' } }, function (err) {
    if (!err) qr.appendChild(canvas);
    else qr.innerHTML = '<small style="color:var(--tx-3)">Usa la clave manual: ' + secret + '</small>';
  });
}

function openAdmin() {
  document.getElementById('adminOverlay').classList.add('open');
  if (!state.adminAuthenticated) {
    document.getElementById('adminTotpSetup').style.display = 'none';
    document.getElementById('adminAuth').style.display = 'block';
    document.getElementById('adminMain').style.display = 'none';
    var tg = document.getElementById('totpCodeGroup');
    if (tg) tg.style.display = isTotpConfigured() ? 'block' : 'none';
  }
  document.getElementById('settingsWhatsapp').value = state.settings.whatsapp || '';
  document.getElementById('settingsStoreName').value = state.settings.storeName || '';
  document.getElementById('settingsCloudinaryName').value = state.settings.cloudinaryName || '';
  document.getElementById('settingsCloudinaryPreset').value = state.settings.cloudinaryPreset || '';
  if (state.settings.firebaseConfig) document.getElementById('settingsFirebaseConfig').value = JSON.stringify(state.settings.firebaseConfig, null, 2);
  updateFirebaseStatusUI(!!state.db);
}

function closeAdmin() { document.getElementById('adminOverlay').classList.remove('open'); }

function renderAdminProductList() {
  var list = document.getElementById('adminProductsList'); if (!list) return;
  var mode = state.db ? 'Firebase' : 'Local';
  if (state.products.length === 0) { list.innerHTML = '<div class="admin-mode-badge">' + mode + '</div><p style="color:var(--tx-3);text-align:center;padding:24px">No hay productos.</p>'; return; }
  list.innerHTML = '<div class="admin-mode-badge">' + mode + '</div>' + state.products.map(function (p) {
    return '<div class="admin-product-item" id="admin-item-' + p.id + '"><div class="admin-product-thumb">' + (p.imageUrl ? '<img src="' + escAttr(p.imageUrl) + '" alt="' + escAttr(p.name) + '" onerror="this.style.display=\'none\'"/>' : '<span>' + (p.emoji || '📦') + '</span>') + '</div><div class="admin-product-info"><div class="admin-product-name">' + escHtml(p.name) + '</div><div class="admin-product-cat">' + escHtml(p.category) + ' · S/ ' + Number(p.price).toFixed(2) + '</div></div><div class="admin-product-actions"><button type="button" class="btn-icon" onclick="editProduct(\'' + p.id + '\')" title="Editar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button type="button" class="btn-icon danger" onclick="deleteProduct(\'' + p.id + '\')" title="Eliminar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></button></div></div>';
  }).join('');
}

function showProductForm(product) {
  product = product || null;
  var c = document.getElementById('productFormContainer'); c.style.display = 'block';
  state.editingProductId = product ? product.id : null;
  document.getElementById('productFormTitle').textContent = product ? 'Editar Producto' : 'Nuevo Producto';
  document.getElementById('productId').value = (product && product.id) || '';
  document.getElementById('prodName').value = (product && product.name) || '';
  document.getElementById('prodCategory').value = (product && product.category) || '';
  document.getElementById('prodPrice').value = (product && product.price) || '';
  document.getElementById('prodOldPrice').value = (product && product.oldPrice) || '';
  document.getElementById('prodDesc').value = (product && product.description) || '';
  document.getElementById('prodFeatures').value = ((product && product.features) || []).join('\n');
  document.getElementById('prodEmoji').value = (product && product.emoji) || '📦';
  document.getElementById('prodFeatured').checked = (product && product.featured) || false;
  var ii = document.getElementById('prodImage'), ip = document.getElementById('prodImagePreview'), ie = document.getElementById('prodImagePreviewImg'), fIn = document.getElementById('prodImageFile');
  if (ii) ii.value = (product && product.imageUrl) || '';
  if (fIn) fIn.value = '';
  if (product && product.imageUrl && ip && ie) { ie.src = product.imageUrl; ip.style.display = 'flex'; }
  else if (ip) ip.style.display = 'none';
  c.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideProductForm() {
  document.getElementById('productFormContainer').style.display = 'none';
  document.getElementById('productForm').reset();
  var ip = document.getElementById('prodImagePreview'); if (ip) ip.style.display = 'none';
  state.editingProductId = null;
}

window.editProduct = function (id) { var p = state.products.find(function (x) { return x.id === id; }); if (p) showProductForm(p); };

window.deleteProduct = async function (id) {
  if (!confirm('Eliminar este producto?')) return;
  if (state.db) { try { await state.db.collection('products').doc(id).delete(); showToast('Producto eliminado.', 'info'); } catch (err) { showToast('Error: ' + err.message, 'error'); } }
  else { state.products = state.products.filter(function (x) { return x.id !== id; }); saveLocalProducts(); renderProducts(); renderAdminProductList(); showToast('Eliminado', 'info'); }
};

async function saveProduct(e) {
  e.preventDefault();
  var name = document.getElementById('prodName').value.trim();
  var category = document.getElementById('prodCategory').value.trim();
  var price = parseFloat(document.getElementById('prodPrice').value);
  var oldPrice = parseFloat(document.getElementById('prodOldPrice').value) || null;
  var description = document.getElementById('prodDesc').value.trim();
  var fr = document.getElementById('prodFeatures').value.trim();
  var features = fr ? fr.split('\n').map(function (f) { return f.trim(); }).filter(Boolean) : [];
  var emoji = document.getElementById('prodEmoji').value.trim() || '📦';
  var featured = document.getElementById('prodFeatured').checked;
  var imageUrl = (document.getElementById('prodImage') ? document.getElementById('prodImage').value.trim() : '');
  if (!name || !category || isNaN(price)) { showToast('Completa los campos requeridos (*)', 'error'); return; }
  var pd = { name: name, category: category, price: price, oldPrice: oldPrice, description: description, features: features, emoji: emoji, imageUrl: imageUrl, featured: featured, updatedAt: new Date().toISOString() };
  if (state.db) {
    try {
      if (state.editingProductId) { await state.db.collection('products').doc(state.editingProductId).update(pd); showToast('Actualizado.', 'success'); }
      else { pd.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await state.db.collection('products').add(pd); showToast('Guardado.', 'success'); }
    } catch (err) { showToast('Error: ' + err.message, 'error'); return; }
  } else {
    if (state.editingProductId) { var idx = state.products.findIndex(function (x) { return x.id === state.editingProductId; }); if (idx !== -1) state.products[idx] = Object.assign({}, state.products[idx], pd); showToast('Actualizado.', 'success'); }
    else { pd.id = 'p_' + Date.now(); pd.createdAt = Date.now(); state.products.push(pd); showToast('Agregado.', 'success'); }
    saveLocalProducts(); renderProducts(); renderAdminProductList();
  }
  hideProductForm();
}

function saveSettingsForm(e) {
  e.preventDefault();
  var wa = document.getElementById('settingsWhatsapp').value.trim();
  var sn = document.getElementById('settingsStoreName').value.trim();
  var pw = document.getElementById('settingsPassword').value.trim();
  var fb = document.getElementById('settingsFirebaseConfig').value.trim();
  var cName = document.getElementById('settingsCloudinaryName').value.trim();
  var cPreset = document.getElementById('settingsCloudinaryPreset').value.trim();
  if (!wa) { showToast('WhatsApp requerido', 'error'); return; }
  state.settings.whatsapp = wa; if (sn) state.settings.storeName = sn; if (pw) state.settings.adminPassword = pw;
  state.settings.cloudinaryName = cName; state.settings.cloudinaryPreset = cPreset;
  if (fb) { try { var cl = fb.replace(/^const\s+\w+\s*=\s*/, '').replace(/;?\s*$/, ''); state.settings.firebaseConfig = JSON.parse(cl); } catch (err) { showToast('Firebase JSON invalido', 'error'); return; } }
  saveSettingsToStorage(); updateWhatsAppLinks();
  if (state.settings.firebaseConfig) initFirebase(state.settings.firebaseConfig);
  showToast('Configuracion guardada.', 'success'); document.getElementById('settingsPassword').value = '';
}

async function testFirebaseConnection() {
  var btn = document.getElementById('testFirebaseBtn'), fb = document.getElementById('settingsFirebaseConfig').value.trim();
  if (!fb) { showToast('Pega tu Firebase Config', 'error'); return; }
  btn.disabled = true; btn.textContent = 'Probando...';
  try {
    var cl = fb.replace(/^const\s+\w+\s*=\s*/, '').replace(/;?\s*$/, ''), cfg = JSON.parse(cl);
    if (firebase.apps.length > 0) await Promise.all(firebase.apps.map(function (a) { return a.delete(); }));
    firebase.initializeApp(cfg); var db = firebase.firestore();
    await db.collection('products').limit(1).get();
    state.db = db; state.settings.firebaseConfig = cfg; saveSettingsToStorage(); startFirestoreListener(db); updateFirebaseStatusUI(true); showToast('Firebase conectado.', 'success');
  } catch (err) { updateFirebaseStatusUI(false); showToast('Error: ' + err.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Probar Conexion'; }
}

function bindEvents() {
  document.getElementById('adminClose').addEventListener('click', closeAdmin);
  document.getElementById('adminOverlay').addEventListener('click', function (e) { if (e.target === document.getElementById('adminOverlay')) closeAdmin(); });

  document.getElementById('adminLoginBtn').addEventListener('click', function () {
    var pw = document.getElementById('adminPassword').value;
    var code = (document.getElementById('adminTotpCode') ? document.getElementById('adminTotpCode').value : '').trim();
    if (pw !== state.settings.adminPassword) { showToast('Contrasena incorrecta', 'error'); document.getElementById('adminPassword').value = ''; return; }
    if (isTotpConfigured() && !verifyTotp(getTotpSecret(), code)) { showToast('Codigo incorrecto o expirado', 'error'); if (document.getElementById('adminTotpCode')) document.getElementById('adminTotpCode').value = ''; return; }
    state.adminAuthenticated = true;
    document.getElementById('adminAuth').style.display = 'none'; document.getElementById('adminMain').style.display = 'block';
    updateFirebaseStatusUI(!!state.db);
    if (state.settings.firebaseConfig) document.getElementById('settingsFirebaseConfig').value = JSON.stringify(state.settings.firebaseConfig, null, 2);
    showToast('Acceso concedido.', 'success');
  });

  document.getElementById('adminPassword').addEventListener('keydown', function (e) { if (e.key === 'Enter') document.getElementById('adminLoginBtn').click(); });
  var tc = document.getElementById('adminTotpCode'); if (tc) tc.addEventListener('keydown', function (e) { if (e.key === 'Enter') document.getElementById('adminLoginBtn').click(); });

  var resetBtn = document.getElementById('resetTotpBtn');
  if (resetBtn) resetBtn.addEventListener('click', function () {
    if (!confirm('Generar nuevo QR? Deberas volver a escanear con Authy.')) return;
    var secret = generateTotpSecret(); showTotpSetup(secret); document.getElementById('totpSetupBtn')._pendingSecret = secret;
  });

  var setupBtn = document.getElementById('totpSetupBtn');
  var setupCodeInput = document.getElementById('totpSetupCode');
  if (setupBtn) setupBtn.addEventListener('click', function () {
    var secret = setupBtn._pendingSecret, code = setupCodeInput.value.trim();
    if (!secret) return;
    if (code.length !== 6) { showToast('El código debe tener 6 dígitos', 'error'); return; }
    if (!verifyTotp(secret, code)) { showToast('Codigo incorrecto. Revisa el QR.', 'error'); return; }
    saveTotpSecret(secret); showToast('Authenticator configurado.', 'success');
    document.getElementById('adminTotpSetup').style.display = 'none'; document.getElementById('adminAuth').style.display = 'block';
    var tg = document.getElementById('totpCodeGroup'); if (tg) tg.style.display = 'block';
    setupCodeInput.value = '';
  });
  if (setupCodeInput) setupCodeInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') setupBtn.click(); });

  document.querySelectorAll('.admin-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.admin-tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.admin-tab-content').forEach(function (c) { c.classList.remove('active'); });
      tab.classList.add('active'); document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  document.getElementById('addProductBtn').addEventListener('click', function () { showProductForm(); });
  document.getElementById('cancelProductBtn').addEventListener('click', hideProductForm);
  document.getElementById('productForm').addEventListener('submit', saveProduct);
  document.getElementById('settingsForm').addEventListener('submit', saveSettingsForm);
  document.getElementById('testFirebaseBtn').addEventListener('click', testFirebaseConnection);

  document.getElementById('modalClose').addEventListener('click', closeProductModal);
  document.getElementById('productModal').addEventListener('click', function (e) { if (e.target === document.getElementById('productModal')) closeProductModal(); });

  initContactForm();

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeProductModal(); if (state.adminAuthenticated) closeAdmin(); } });

  var si = document.getElementById('productSearch'), sc = document.getElementById('searchClear');
  if (si) { si.addEventListener('input', function () { state.searchQuery = si.value; sc.style.display = si.value ? 'flex' : 'none'; state.productPage = 1; var af = document.querySelector('.filter-btn.active'); renderProducts(af ? af.dataset.category : 'all'); }); }
  if (sc) { sc.addEventListener('click', function () { si.value = ''; state.searchQuery = ''; sc.style.display = 'none'; si.focus(); state.productPage = 1; var af = document.querySelector('.filter-btn.active'); renderProducts(af ? af.dataset.category : 'all'); }); }

  var imgIn = document.getElementById('prodImage'), imgPrev = document.getElementById('prodImagePreview'), imgEl = document.getElementById('prodImagePreviewImg'), clrBtn = document.getElementById('clearImageBtn'), imgFile = document.getElementById('prodImageFile');
  var uploadZone = document.getElementById('uploadZone'), uploadProgressContainer = document.getElementById('uploadProgressContainer'), uploadProgressBar = document.getElementById('uploadProgressBar');

  function handleFileUpload(f) {
    if (!f) return;
    if (!state.settings.cloudinaryName || !state.settings.cloudinaryPreset) {
      showToast('Configura Cloudinary en Ajustes primero', 'error');
      return;
    }
    
    uploadZone.classList.add('uploading');
    uploadProgressContainer.style.display = 'block';
    uploadProgressBar.style.width = '0%';
    
    var formData = new FormData();
    formData.append('file', f);
    formData.append('upload_preset', state.settings.cloudinaryPreset);
    
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + state.settings.cloudinaryName + '/image/upload', true);
    
    xhr.upload.onprogress = function(e) {
      if (e.lengthComputable) {
        var percentComplete = (e.loaded / e.total) * 100;
        uploadProgressBar.style.width = percentComplete + '%';
      }
    };
    
    xhr.onload = function() {
      uploadZone.classList.remove('uploading');
      uploadProgressContainer.style.display = 'none';
      if (xhr.status === 200) {
        var response = JSON.parse(xhr.responseText);
        imgIn.value = response.secure_url;
        imgEl.src = response.secure_url;
        imgPrev.style.display = 'flex';
        showToast('Imagen subida correctamente', 'success');
      } else {
        showToast('Error. Revisa tu Configuración de Cloudinary.', 'error');
      }
    };
    
    xhr.onerror = function() {
      uploadZone.classList.remove('uploading');
      uploadProgressContainer.style.display = 'none';
      showToast('Error de red al subir', 'error');
    };
    
    xhr.send(formData);
  }

  if (uploadZone && imgFile) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
      uploadZone.addEventListener(eventName, function(e) { e.preventDefault(); e.stopPropagation(); }, false);
    });
    ['dragenter', 'dragover'].forEach(function(eventName) {
      uploadZone.addEventListener(eventName, function() { uploadZone.classList.add('dragover'); }, false);
    });
    ['dragleave', 'drop'].forEach(function(eventName) {
      uploadZone.addEventListener(eventName, function() { uploadZone.classList.remove('dragover'); }, false);
    });
    uploadZone.addEventListener('drop', function(e) {
      var dt = e.dataTransfer;
      if (dt.files && dt.files.length > 0) handleFileUpload(dt.files[0]);
    });
    imgFile.addEventListener('change', function(e) {
      if (e.target.files && e.target.files.length > 0) handleFileUpload(e.target.files[0]);
    });
  }

  if (clrBtn && imgIn && imgPrev && imgEl) { clrBtn.addEventListener('click', function () { imgIn.value = ''; if (imgFile) imgFile.value = ''; imgPrev.style.display = 'none'; imgEl.src = ''; }); }
  if (imgEl) imgEl.addEventListener('error', function () { imgPrev.style.display = 'none'; });
}

function showToast(msg, type) {
  type = type || 'info';
  var c = document.getElementById('toastContainer');
  var icons = { success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>', error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>', info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' };
  var t = document.createElement('div'); t.className = 'toast ' + type; t.innerHTML = '<span>' + (icons[type] || icons.info) + '</span> ' + escHtml(msg); c.appendChild(t);
  setTimeout(function () { t.style.animation = 'toastOut .28s ease forwards'; setTimeout(function () { t.remove(); }, 280); }, 3500);
}

function escHtml(s) { if (!s && s !== 0) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function escAttr(s) { if (!s) return ''; return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

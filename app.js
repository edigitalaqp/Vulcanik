/* ============================================
   VULKANIC SUR PERU – APP LOGIC
   Firebase Firestore + localStorage fallback
   ============================================ */

// ─── STATE ──────────────────────────────────────────────────────────────────

let state = {
  products: [],
  settings: {
    whatsapp: '51987654321',
    storeName: 'Vulkanic Sur Peru',
    adminPassword: 'vulkanic2025',
    firebaseConfig: null
  },
  adminAuthenticated: false,
  editingProductId: null,
  db: null,           // Firestore instance
  unsubscribe: null   // Real-time listener
};

// ─── INIT ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadSettingsFromStorage();
  initNavbar();
  initLavaParticles();
  bindEvents();
  updateWhatsAppLinks();
  initFirebase();

  // Open admin if URL contains ?admin=1
  if (new URLSearchParams(window.location.search).get('admin') === '1') {
    openAdmin();
  }
});

// ─── SETTINGS STORAGE ────────────────────────────────────────────────────────

function loadSettingsFromStorage() {
  const savedSettings = localStorage.getItem('vk_settings');
  if (savedSettings) {
    try { state.settings = { ...state.settings, ...JSON.parse(savedSettings) }; }
    catch (e) { }
  }
}

function saveSettingsToStorage() {
  localStorage.setItem('vk_settings', JSON.stringify(state.settings));
}

// ─── LOCAL PRODUCTS (fallback when Firebase not configured) ──────────────────

function loadLocalProducts() {
  const saved = localStorage.getItem('vk_products');
  if (saved) {
    try { state.products = JSON.parse(saved); }
    catch (e) { state.products = []; }
  }
  if (state.products.length === 0) loadSampleProducts();
  else { renderProducts(); renderAdminProductList(); }
}

function saveLocalProducts() {
  localStorage.setItem('vk_products', JSON.stringify(state.products));
}

// ─── FIREBASE ─────────────────────────────────────────────────────────────────

function initFirebase(config = null) {
  const cfg = config || state.settings.firebaseConfig;
  if (!cfg) {
    loadLocalProducts();
    updateFirebaseStatusUI(false);
    return;
  }

  try {
    if (firebase.apps.length > 0) {
      firebase.apps.forEach(app => app.delete());
    }
    firebase.initializeApp(cfg);
    const db = firebase.firestore();
    state.db = db;
    startFirestoreListener(db);
    updateFirebaseStatusUI(true);
  } catch (err) {
    updateFirebaseStatusUI(false);
    showToast('Error al conectar Firebase. Usando modo local.', 'error');
    loadLocalProducts();
  }
}

function startFirestoreListener(db) {
  if (state.unsubscribe) state.unsubscribe();

  state.unsubscribe = db.collection('products')
    .orderBy('createdAt', 'asc')
    .onSnapshot(
      snapshot => {
        state.products = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        renderProducts();
        renderAdminProductList();
      },
      err => {
        showToast('Error al leer Firestore. Revisa las reglas de seguridad.', 'error');
        state.db = null;
        updateFirebaseStatusUI(false);
        loadLocalProducts();
      }
    );
}

function updateFirebaseStatusUI(connected) {
  const dot = document.getElementById('firebaseStatusDot');
  const text = document.getElementById('firebaseStatusText');
  if (!dot || !text) return;
  if (connected) {
    dot.style.background = '#22c55e';
    dot.style.boxShadow = '0 0 8px #22c55e';
    text.textContent = 'Conectado ✓';
    text.style.color = '#22c55e';
  } else {
    dot.style.background = '#f59e0b';
    dot.style.boxShadow = '0 0 8px #f59e0b';
    text.textContent = 'Sin conectar';
    text.style.color = '#f59e0b';
  }
}

// ─── SAMPLE PRODUCTS ─────────────────────────────────────────────────────────

function loadSampleProducts() {
  state.products = [
    {
      id: 'sp1',
      name: 'Windows 11 Pro',
      category: 'Sistema Operativo',
      price: 35,
      oldPrice: 65,
      description: 'Licencia original de Windows 11 Pro con activación permanente. La versión más avanzada del sistema operativo de Microsoft.',
      features: ['Activación permanente', 'Para 1 PC', 'Todas las ediciones', 'Soporte técnico incluido', 'Actualizaciones garantizadas'],
      emoji: '🖥️',
      featured: true
    },
    {
      id: 'sp2',
      name: 'Microsoft Office 365',
      category: 'Suite Ofimática',
      price: 45,
      oldPrice: 80,
      description: 'Suite completa de Microsoft Office con Word, Excel, PowerPoint, Teams y más. Acceso a todas las aplicaciones premium.',
      features: ['Word, Excel, PowerPoint', 'Teams y OneDrive', '1 TB almacenamiento', 'Actualizaciones automáticas', '5 dispositivos'],
      emoji: '📊',
      featured: false
    },
    {
      id: 'sp3',
      name: 'Antivirus Premium',
      category: 'Seguridad',
      price: 25,
      oldPrice: 50,
      description: 'Protección total contra virus, malware, ransomware y amenazas en tiempo real para tu PC y dispositivos móviles.',
      features: ['Protección en tiempo real', 'Anti-ransomware', 'VPN incluido', 'Multi-dispositivo', '1 año de vigencia'],
      emoji: '🛡️',
      featured: false
    },
    {
      id: 'sp4',
      name: 'Adobe Creative Cloud',
      category: 'Diseño',
      price: 55,
      oldPrice: 120,
      description: 'Acceso completo a todas las aplicaciones de Adobe: Photoshop, Illustrator, Premiere Pro, After Effects y más.',
      features: ['Photoshop + Illustrator', 'Premiere Pro', 'After Effects', '100 GB almacenamiento', 'Fonts premium'],
      emoji: '🎨',
      featured: true
    },
    {
      id: 'sp5',
      name: 'VPN Premium Anual',
      category: 'Privacidad',
      price: 20,
      oldPrice: 40,
      description: 'Navega con total privacidad y seguridad. Accede a contenido de todo el mundo sin restricciones.',
      features: ['Servidores en 60 países', 'Sin límite de velocidad', 'Sin registros de actividad', '6 dispositivos simultáneos', 'Soporte 24/7'],
      emoji: '🔐',
      featured: false
    },
    {
      id: 'sp6',
      name: 'Cuenta Streaming Premium',
      category: 'Entretenimiento',
      price: 15,
      oldPrice: 30,
      description: 'Disfruta del mejor entretenimiento con acceso a plataformas de streaming en calidad 4K Ultra HD.',
      features: ['Calidad 4K Ultra HD', 'Sin anuncios', 'Descargas offline', 'Múltiples perfiles', '30 días garantía'],
      emoji: '🎬',
      featured: false
    }
  ];
  saveLocalProducts();
  renderProducts();
  renderAdminProductList();
}

// ─── NAVBAR ──────────────────────────────────────────────────────────────────

function initNavbar() {
  const navbar = document.getElementById('navbar');
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
    updateActiveNavLink();
  });

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    links.classList.toggle('open');
  });

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('open');
      links.classList.remove('open');
    });
  });
}

function updateActiveNavLink() {
  const sections = ['inicio', 'productos', 'contacto'];
  const navLinks = document.querySelectorAll('.nav-link');
  let current = '';

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 120) current = id;
  });

  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
  });
}

// ─── LAVA PARTICLES ──────────────────────────────────────────────────────────

function initLavaParticles() {
  const container = document.getElementById('lavaParticles');
  const colors = ['#ff5500', '#ff7733', '#ffaa00', '#ffcc44', '#ff3300'];

  for (let i = 0; i < 25; i++) {
    const p = document.createElement('div');
    p.className = 'lava-particle';
    const size = Math.random() * 6 + 3;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const delay = (i * 0.4) % 10;
    const dur = 8 + Math.random() * 8;

    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      box-shadow: 0 0 ${size * 2}px ${color};
      left: ${Math.random() * 100}%;
      animation-duration: ${dur}s;
      animation-delay: ${delay}s;
    `;
    container.appendChild(p);
  }
}

// ─── RENDER PRODUCTS ─────────────────────────────────────────────────────────

function renderProducts(filterCategory = 'all') {
  const grid = document.getElementById('productsGrid');
  const emptyState = document.getElementById('emptyState');

  const filtered = filterCategory === 'all'
    ? state.products
    : state.products.filter(p => p.category === filterCategory);

  renderCategoryFilters(filterCategory);

  if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  grid.innerHTML = filtered.map((p, i) => productCardHTML(p, i)).join('');

  grid.querySelectorAll('.product-card').forEach((card, i) => {
    card.style.animationDelay = `${i * 0.07}s`;
  });
}

function renderCategoryFilters(currentFilter = 'all') {
  const container = document.getElementById('categoryFilters');
  const cats = ['Todos', ...new Set(state.products.map(p => p.category))];

  container.innerHTML = cats.map(cat => {
    const val = cat === 'Todos' ? 'all' : cat;
    return `<button class="filter-btn ${currentFilter === val ? 'active' : ''}" data-category="${val}">${cat}</button>`;
  }).join('');

  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProducts(btn.dataset.category);
    });
  });
}

function productCardHTML(p, index) {
  const features = (p.features || []).slice(0, 3);
  return `
    <div class="product-card" onclick="openProductModal('${p.id}')" style="animation-delay:${index * 0.07}s;">
      ${p.featured ? '<div class="product-badge-featured">Destacado</div>' : ''}
      <div class="product-card-top">
        <div class="product-emoji">${p.emoji || '📦'}</div>
      </div>
      <div class="product-card-body">
        <div class="product-category">${escHtml(p.category)}</div>
        <h3 class="product-name">${escHtml(p.name)}</h3>
        <p class="product-desc">${escHtml(p.description)}</p>
        <ul class="product-features">
          ${features.map(f => `<li class="product-feature">${escHtml(f)}</li>`).join('')}
        </ul>
        <div class="product-footer">
          <div class="product-price-box">
            ${p.oldPrice ? `<span class="product-old-price">S/ ${Number(p.oldPrice).toFixed(2)}</span>` : ''}
            <span class="product-price">S/ ${Number(p.price).toFixed(2)}</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); buyNow('${p.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Comprar
          </button>
        </div>
      </div>
    </div>
  `;
}

// ─── PRODUCT MODAL ───────────────────────────────────────────────────────────

function openProductModal(productId) {
  const p = state.products.find(x => x.id === productId);
  if (!p) return;

  const modal = document.getElementById('productModal');
  const body = document.getElementById('modalBody');
  const features = p.features || [];

  body.innerHTML = `
    <div class="modal-product-header">
      <div class="modal-product-emoji">${p.emoji || '📦'}</div>
      <div class="modal-product-meta">
        <div class="modal-product-category">${escHtml(p.category)}</div>
        <div class="modal-product-name">${escHtml(p.name)}</div>
      </div>
    </div>
    <p class="modal-product-desc">${escHtml(p.description)}</p>
    ${features.length ? `
      <div class="modal-features">
        <h4>Características incluidas</h4>
        <ul class="modal-feature-list">
          ${features.map(f => `<li>${escHtml(f)}</li>`).join('')}
        </ul>
      </div>
    ` : ''}
    <div class="modal-purchase">
      <div class="modal-price-display">
        ${p.oldPrice ? `<span class="modal-old-price">S/ ${Number(p.oldPrice).toFixed(2)}</span>` : ''}
        <span class="modal-price">S/ ${Number(p.price).toFixed(2)}</span>
      </div>
      <button class="btn btn-primary" onclick="buyNow('${p.id}'); closeProductModal();">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Comprar por WhatsApp
      </button>
    </div>
  `;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
  document.body.style.overflow = '';
}

// ─── BUY NOW → WHATSAPP ──────────────────────────────────────────────────────

function buyNow(productId) {
  const p = state.products.find(x => x.id === productId);
  if (!p) return;

  const msg = encodeURIComponent(
    `¡Hola! Quiero comprar:\n\n` +
    `*${p.name}*\n` +
    `Precio: S/ ${Number(p.price).toFixed(2)}\n` +
    `Categoría: ${p.category}\n\n` +
    `¿Podrías ayudarme con la compra?`
  );
  window.open(`https://wa.me/${state.settings.whatsapp}?text=${msg}`, '_blank');
}

function updateWhatsAppLinks() {
  const wl = document.getElementById('whatsappLink');
  if (wl) wl.href = `https://wa.me/${state.settings.whatsapp}`;
}

// ─── CONTACT FORM ────────────────────────────────────────────────────────────

function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('contactName').value.trim();
    const msg = document.getElementById('contactMsg').value.trim();

    if (!name || !msg) { showToast('Completa todos los campos', 'error'); return; }

    const text = encodeURIComponent(
      `¡Hola! Soy *${name}*\n\n${msg}\n\n_Mensaje enviado desde Vulkanic Sur Peru_`
    );
    window.open(`https://wa.me/${state.settings.whatsapp}?text=${text}`, '_blank');
    form.reset();
    showToast('Mensaje preparado. Abriendo WhatsApp...', 'success');
  });
}

// ─── ADMIN PANEL ─────────────────────────────────────────────────────────────

function openAdmin() {
  const overlay = document.getElementById('adminOverlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  if (!state.adminAuthenticated) {
    document.getElementById('adminAuth').style.display = 'block';
    document.getElementById('adminMain').style.display = 'none';
  }

  // Populate settings form
  document.getElementById('settingsWhatsapp').value = state.settings.whatsapp || '';
  document.getElementById('settingsStoreName').value = state.settings.storeName || '';

  // Populate Firebase config if saved
  if (state.settings.firebaseConfig) {
    document.getElementById('settingsFirebaseConfig').value =
      JSON.stringify(state.settings.firebaseConfig, null, 2);
  }

  // Update Firebase status indicator
  updateFirebaseStatusUI(!!state.db);
}

function closeAdmin() {
  document.getElementById('adminOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ─── ADMIN PRODUCT LIST ──────────────────────────────────────────────────────

function renderAdminProductList() {
  const list = document.getElementById('adminProductsList');
  if (!list) return;

  const mode = state.db ? 'Firebase' : 'Local';

  if (state.products.length === 0) {
    list.innerHTML = `
      <div class="admin-mode-badge">${mode}</div>
      <p style="color:var(--text-muted);font-size:0.9rem;text-align:center;padding:24px;">
        No hay productos. Agrega el primero →
      </p>`;
    return;
  }

  list.innerHTML = `<div class="admin-mode-badge">${mode}</div>` +
    state.products.map(p => `
      <div class="admin-product-item" id="admin-item-${p.id}">
        <div class="admin-product-emoji">${p.emoji || '📦'}</div>
        <div class="admin-product-info">
          <div class="admin-product-name">${escHtml(p.name)}</div>
          <div class="admin-product-cat">${escHtml(p.category)} · S/ ${Number(p.price).toFixed(2)}</div>
        </div>
        <div class="admin-product-actions">
          <button class="btn-icon" onclick="editProduct('${p.id}')" title="Editar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" onclick="deleteProduct('${p.id}')" title="Eliminar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      </div>
    `).join('');
}

// ─── PRODUCT CRUD ────────────────────────────────────────────────────────────

function showProductForm(product = null) {
  const container = document.getElementById('productFormContainer');
  container.style.display = 'block';
  state.editingProductId = product ? product.id : null;
  document.getElementById('productFormTitle').textContent = product ? 'Editar Producto' : 'Nuevo Producto';

  document.getElementById('productId').value = product?.id || '';
  document.getElementById('prodName').value = product?.name || '';
  document.getElementById('prodCategory').value = product?.category || '';
  document.getElementById('prodPrice').value = product?.price || '';
  document.getElementById('prodOldPrice').value = product?.oldPrice || '';
  document.getElementById('prodDesc').value = product?.description || '';
  document.getElementById('prodFeatures').value = (product?.features || []).join('\n');
  document.getElementById('prodEmoji').value = product?.emoji || '📦';
  document.getElementById('prodFeatured').checked = product?.featured || false;

  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideProductForm() {
  document.getElementById('productFormContainer').style.display = 'none';
  document.getElementById('productForm').reset();
  state.editingProductId = null;
}

function editProduct(id) {
  const p = state.products.find(x => x.id === id);
  if (p) showProductForm(p);
}

async function deleteProduct(id) {
  if (!confirm('¿Eliminar este producto?')) return;

  if (state.db) {
    // Firebase delete
    try {
      await state.db.collection('products').doc(id).delete();
      showToast('Producto eliminado.', 'info');
    } catch (err) {
      showToast('Error al eliminar: ' + err.message, 'error');
    }
  } else {
    // Local delete
    state.products = state.products.filter(x => x.id !== id);
    saveLocalProducts();
    renderProducts();
    renderAdminProductList();
    showToast('Producto eliminado', 'info');
  }
}

async function saveProduct(e) {
  e.preventDefault();

  const name = document.getElementById('prodName').value.trim();
  const category = document.getElementById('prodCategory').value.trim();
  const price = parseFloat(document.getElementById('prodPrice').value);
  const oldPrice = parseFloat(document.getElementById('prodOldPrice').value) || null;
  const description = document.getElementById('prodDesc').value.trim();
  const featuresRaw = document.getElementById('prodFeatures').value.trim();
  const features = featuresRaw ? featuresRaw.split('\n').map(f => f.trim()).filter(Boolean) : [];
  const emoji = document.getElementById('prodEmoji').value.trim() || '📦';
  const featured = document.getElementById('prodFeatured').checked;

  if (!name || !category || isNaN(price)) {
    showToast('Completa los campos requeridos (*)', 'error');
    return;
  }

  const productData = {
    name, category, price, oldPrice, description, features, emoji, featured,
    updatedAt: new Date().toISOString()
  };

  if (state.db) {
    // Firebase save
    try {
      if (state.editingProductId) {
        await state.db.collection('products').doc(state.editingProductId).update(productData);
        showToast('Producto actualizado.', 'success');
      } else {
        productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await state.db.collection('products').add(productData);
        showToast('Producto guardado.', 'success');
      }
    } catch (err) {
      showToast('Error al guardar: ' + err.message, 'error');
      return;
    }
  } else {
    // Local save
    if (state.editingProductId) {
      const idx = state.products.findIndex(x => x.id === state.editingProductId);
      if (idx !== -1) state.products[idx] = { ...state.products[idx], ...productData };
      showToast('Producto actualizado.', 'success');
    } else {
      state.products.push({ id: 'p_' + Date.now(), createdAt: Date.now(), ...productData });
      showToast('Producto agregado.', 'success');
    }
    saveLocalProducts();
    renderProducts();
    renderAdminProductList();
  }

  hideProductForm();
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────

function saveSettingsForm(e) {
  e.preventDefault();

  const whatsapp = document.getElementById('settingsWhatsapp').value.trim();
  const storeName = document.getElementById('settingsStoreName').value.trim();
  const password = document.getElementById('settingsPassword').value.trim();
  const fbRaw = document.getElementById('settingsFirebaseConfig').value.trim();

  if (!whatsapp) { showToast('El número de WhatsApp es requerido', 'error'); return; }

  state.settings.whatsapp = whatsapp;
  if (storeName) state.settings.storeName = storeName;
  if (password) state.settings.adminPassword = password;

  // Parse Firebase config
  if (fbRaw) {
    try {
      // Accept both plain object and const firebaseConfig = {...}
      const cleaned = fbRaw
        .replace(/^const\s+\w+\s*=\s*/, '')  // Remove "const x = "
        .replace(/;?\s*$/, '');               // Remove trailing semicolon
      const parsed = JSON.parse(cleaned);
      state.settings.firebaseConfig = parsed;
    } catch (err) {
      showToast('Firebase Config JSON inválido. Revisa el formato.', 'error');
      return;
    }
  }

  saveSettingsToStorage();
  updateWhatsAppLinks();

  // Re-init Firebase if config was provided
  if (state.settings.firebaseConfig) {
    initFirebase(state.settings.firebaseConfig);
  }

  showToast('Configuración guardada.', 'success');
  document.getElementById('settingsPassword').value = '';
}

// Test Firebase connection
async function testFirebaseConnection() {
  const btn = document.getElementById('testFirebaseBtn');
  const fbRaw = document.getElementById('settingsFirebaseConfig').value.trim();

  if (!fbRaw) {
    showToast('Pega primero tu Firebase Config', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Probando...';

  try {
    const cleaned = fbRaw
      .replace(/^const\s+\w+\s*=\s*/, '')
      .replace(/;?\s*$/, '');
    const cfg = JSON.parse(cleaned);

    // Clear existing apps
    if (firebase.apps.length > 0) {
      await Promise.all(firebase.apps.map(app => app.delete()));
    }

    firebase.initializeApp(cfg);
    const db = firebase.firestore();

    // Try a test read
    await db.collection('products').limit(1).get();

    state.db = db;
    state.settings.firebaseConfig = cfg;
    saveSettingsToStorage();
    startFirestoreListener(db);
    updateFirebaseStatusUI(true);
    showToast('Firebase conectado correctamente.', 'success');
  } catch (err) {
    updateFirebaseStatusUI(false);
    showToast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Probar Conexión';
  }
}

// ─── BIND EVENTS ─────────────────────────────────────────────────────────────

function bindEvents() {
  // Open Admin — now triggered by URL param, not navbar button
  const openAdminBtn = document.getElementById('openAdminBtn');
  if (openAdminBtn) {
    openAdminBtn.addEventListener('click', (e) => { e.preventDefault(); openAdmin(); });
  }

  // Close Admin
  document.getElementById('adminClose').addEventListener('click', closeAdmin);
  document.getElementById('adminOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('adminOverlay')) closeAdmin();
  });

  // Admin Login
  document.getElementById('adminLoginBtn').addEventListener('click', () => {
    const pw = document.getElementById('adminPassword').value;
    if (pw === state.settings.adminPassword) {
      state.adminAuthenticated = true;
      document.getElementById('adminAuth').style.display = 'none';
      document.getElementById('adminMain').style.display = 'block';
      updateFirebaseStatusUI(!!state.db);
      if (state.settings.firebaseConfig) {
        document.getElementById('settingsFirebaseConfig').value =
          JSON.stringify(state.settings.firebaseConfig, null, 2);
      }
      showToast('Acceso concedido.', 'success');
    } else {
      showToast('Contraseña incorrecta', 'error');
      document.getElementById('adminPassword').value = '';
    }
  });

  document.getElementById('adminPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('adminLoginBtn').click();
  });

  // Admin tabs
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // Add product button
  document.getElementById('addProductBtn').addEventListener('click', () => showProductForm());

  // Cancel product form
  document.getElementById('cancelProductBtn').addEventListener('click', hideProductForm);

  // Save product form
  document.getElementById('productForm').addEventListener('submit', saveProduct);

  // Settings form
  document.getElementById('settingsForm').addEventListener('submit', saveSettingsForm);

  // Test Firebase button
  document.getElementById('testFirebaseBtn').addEventListener('click', testFirebaseConnection);

  // Close product modal
  document.getElementById('modalClose').addEventListener('click', closeProductModal);
  document.getElementById('productModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('productModal')) closeProductModal();
  });

  // Contact form
  initContactForm();

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProductModal();
      if (state.adminAuthenticated) closeAdmin();
    }
  });

  // Scroll reveal
  initScrollReveal();
}

// ─── SCROLL REVEAL ───────────────────────────────────────────────────────────

function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.feature-item, .contact-card, .info-card').forEach(el => {
    observer.observe(el);
  });
}

// ─── TOAST ───────────────────────────────────────────────────────────────────

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const icons = {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
  };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || icons.info}</span> ${escHtml(message)}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ─── UTILS ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

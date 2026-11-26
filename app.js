/* ==========================================================================
   WanderLuxe Travel Agency — Main Application Logic (js/app.js)
   ========================================================================== */

let packages = [];
let bookings = [];
let users = [];
let currentUser = null;
let itineraryItems = [];
let reviews = [];
let wishlist = [];
let inquiries = [];

let selectedCategory = 'All';
let selectedGalleryCategory = 'All';
let activeLightboxIndex = 0;
let currentAdminTab = 'packages';

// ---------- Initialization ----------
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initDefaultDates();
  populateSelects();
  renderAuthUI();
  renderCategoryPills();
  renderDestinations();
  switchBookingTab('hotel');
  renderItinerary();
  renderGalleryFilters();
  renderGallery();
  renderReviews();

  if (window.lucide) {
    lucide.createIcons();
  }

  document.addEventListener('keydown', (e) => {
    const lb = document.getElementById('lightbox-modal');
    if (lb && !lb.classList.contains('hidden')) {
      if (e.key === 'Escape') closeModal('lightbox-modal');
      if (e.key === 'ArrowRight') stepLightbox(1);
      if (e.key === 'ArrowLeft') stepLightbox(-1);
    }
  });
});

function loadState() {
  packages = readStorage(STORAGE_KEYS.PACKAGES, SEED_PACKAGES);
  bookings = readStorage(STORAGE_KEYS.BOOKINGS, SEED_BOOKINGS);
  users = readStorage(STORAGE_KEYS.USERS, SEED_USERS);
  currentUser = readStorage(STORAGE_KEYS.CURRENT_USER, null);
  itineraryItems = readStorage(STORAGE_KEYS.ITINERARY, SEED_ITINERARY);
  reviews = readStorage(STORAGE_KEYS.REVIEWS, SEED_REVIEWS);
  wishlist = readStorage(STORAGE_KEYS.WISHLIST, ['pkg-kyoto']);
  inquiries = readStorage(STORAGE_KEYS.INQUIRIES, []);
}

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function initDefaultDates() {
  const today = new Date();
  const in14 = new Date(today.getTime() + 14 * 86400000);
  const in17 = new Date(today.getTime() + 17 * 86400000);
  const in30 = new Date(today.getTime() + 30 * 86400000);

  const fmt = (d) => d.toISOString().split('T')[0];
  const checkinEl = document.getElementById('hotel-checkin');
  const checkoutEl = document.getElementById('hotel-checkout');
  const departEl = document.getElementById('flight-depart-date');

  if (checkinEl && !checkinEl.value) checkinEl.value = fmt(in14);
  if (checkoutEl && !checkoutEl.value) checkoutEl.value = fmt(in17);
  if (departEl && !departEl.value) departEl.value = fmt(in30);
}

function populateSelects() {
  // Hotels dropdown
  const hotelSelect = document.getElementById('hotel-select');
  if (hotelSelect) {
    hotelSelect.innerHTML = HOTELS.map(
      (h) => `<option value="${h.id}">${escapeHtml(h.name)} — ${escapeHtml(h.city)} ($${h.nightlyRate}/nt)</option>`
    ).join('');
  }

  // Itinerary preset dropdown
  const itinPreset = document.getElementById('itinerary-preset-select');
  if (itinPreset) {
    itinPreset.innerHTML =
      '<option value="">Load Package Template...</option>' +
      packages.map((p) => `<option value="${p.id}">${escapeHtml(p.title)}</option>`).join('');
  }

  // Review destination dropdown
  const revDest = document.getElementById('review-destination');
  if (revDest) {
    revDest.innerHTML = packages
      .map((p) => `<option value="${escapeHtml(p.title)}">${escapeHtml(p.title)}</option>`)
      .join('');
  }
}

// ---------- Toast Notifications ----------
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const palette =
    type === 'error'
      ? 'bg-rose-600 text-white'
      : type === 'info'
      ? 'bg-navy text-white border border-white/15'
      : 'bg-tealbrand text-white';

  const toast = document.createElement('div');
  toast.className = `toast-enter pointer-events-auto px-4 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2.5 max-w-sm ${palette}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

// ---------- Modals & Navigation ----------
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  el.classList.add('flex');
  if (window.lucide) lucide.createIcons();
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('hidden');
  el.classList.remove('flex');
}

function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  if (menu) menu.classList.toggle('hidden');
}

// ---------- Authentication & Roles ----------
function renderAuthUI() {
  const desktopArea = document.getElementById('desktop-auth-area');
  const mobileArea = document.getElementById('mobile-auth-area');
  const navAdminBtn = document.getElementById('nav-admin-btn');
  const mobileAdminBtn = document.getElementById('mobile-admin-btn');

  const isAdmin = currentUser && currentUser.role === 'admin';
  if (navAdminBtn) {
    navAdminBtn.classList.toggle('hidden', !isAdmin);
    navAdminBtn.classList.toggle('flex', isAdmin);
  }
  if (mobileAdminBtn) {
    mobileAdminBtn.classList.toggle('hidden', !isAdmin);
    mobileAdminBtn.classList.toggle('flex', isAdmin);
  }

  if (currentUser) {
    const badge =
      currentUser.role === 'admin'
        ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40">Admin</span>'
        : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-tealbrand/25 text-teal-300">Traveler</span>';

    const html = `
      <button onclick="openProfileModal()" class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-medium transition">
        <i data-lucide="user-circle" class="w-4 h-4 text-teal-400"></i>
        <span>${escapeHtml(currentUser.name.split(' ')[0])}</span>
        ${badge}
      </button>
      <button onclick="handleLogout()" class="px-3 py-2 rounded-xl border border-white/15 hover:bg-white/10 text-xs font-semibold text-slate-300 transition">
        Log Out
      </button>
    `;
    if (desktopArea) desktopArea.innerHTML = html;
    if (mobileArea) mobileArea.innerHTML = html;
  } else {
    const html = `
      <button onclick="openAuthModal('login')" class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-white/10 transition">
        Log In
      </button>
      <button onclick="openAuthModal('register')" class="px-4 py-2 rounded-xl text-sm font-semibold bg-tealbrand hover:bg-tealbrand-dark text-white transition shadow-md shadow-tealbrand/20">
        Sign Up
      </button>
    `;
    if (desktopArea) desktopArea.innerHTML = html;
    if (mobileArea) mobileArea.innerHTML = html;
  }

  if (window.lucide) lucide.createIcons();
}

function openAuthModal(tab = 'login') {
  switchAuthTab(tab);
  openModal('auth-modal');
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  const loginTab = document.getElementById('auth-tab-login');
  const regTab = document.getElementById('auth-tab-register');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    regForm.classList.add('hidden');
    loginTab.className = 'px-4 py-2 rounded-xl text-sm font-bold bg-navy text-white';
    regTab.className = 'px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100';
  } else {
    regForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    regTab.className = 'px-4 py-2 rounded-xl text-sm font-bold bg-navy text-white';
    loginTab.className = 'px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100';
  }
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;

  const found = users.find((u) => u.email.toLowerCase() === email && u.password === password);
  if (!found) {
    showToast('Invalid credentials. Try the Traveler or Admin demo buttons.', 'error');
    return;
  }
  if (!found.active) {
    showToast('This account has been suspended by an administrator.', 'error');
    return;
  }

  currentUser = found;
  saveStorage(STORAGE_KEYS.CURRENT_USER, currentUser);
  renderAuthUI();
  closeModal('auth-modal');
  showToast(`Welcome back, ${currentUser.name}!`);
}

function quickDemoLogin(role) {
  const demoUser = users.find((u) => u.role === role) || SEED_USERS[role === 'admin' ? 1 : 0];
  currentUser = demoUser;
  saveStorage(STORAGE_KEYS.CURRENT_USER, currentUser);
  renderAuthUI();
  closeModal('auth-modal');
  showToast(`Signed in as ${demoUser.name} (${demoUser.role})`);
}

function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const password = document.getElementById('reg-password').value;

  if (users.some((u) => u.email.toLowerCase() === email)) {
    showToast('An account with that email already exists.', 'error');
    return;
  }

  const newUser = {
    id: 'usr-' + Date.now(),
    name,
    email,
    password,
    role: 'traveler',
    active: true,
  };
  users.push(newUser);
  saveStorage(STORAGE_KEYS.USERS, users);

  currentUser = newUser;
  saveStorage(STORAGE_KEYS.CURRENT_USER, currentUser);
  renderAuthUI();
  closeModal('auth-modal');
  showToast(`Account created! Welcome, ${name}.`);
}

function handleLogout() {
  currentUser = null;
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  renderAuthUI();
  showToast('You have been logged out.', 'info');
}

function openProfileModal() {
  if (!currentUser) return;
  const userBookings = bookings.filter(
    (b) => b.customerEmail.toLowerCase() === currentUser.email.toLowerCase() || currentUser.role === 'admin'
  );
  const savedPackages = packages.filter((p) => wishlist.includes(p.id));

  const container = document.getElementById('profile-modal-content');
  container.innerHTML = `
    <button onclick="closeModal('profile-modal')" class="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
      <i data-lucide="x" class="w-5 h-5"></i>
    </button>
    <div class="flex items-center gap-3 pb-4 border-b border-slate-100">
      <div class="w-12 h-12 rounded-2xl bg-tealbrand/15 text-tealbrand flex items-center justify-center font-display text-xl font-bold">
        ${escapeHtml(currentUser.name.charAt(0).toUpperCase())}
      </div>
      <div>
        <h3 class="font-display text-2xl font-bold text-navy">${escapeHtml(currentUser.name)}</h3>
        <p class="text-xs text-slate-500">${escapeHtml(currentUser.email)} • Role: <strong class="uppercase text-tealbrand">${escapeHtml(currentUser.role)}</strong></p>
      </div>
    </div>

    <div class="mt-5">
      <h4 class="font-bold text-sm uppercase tracking-wider text-slate-500 mb-3">My Bookings (${userBookings.length})</h4>
      ${
        userBookings.length
          ? `<div class="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              ${userBookings
                .map(
                  (b) => `
                <div class="p-3.5 rounded-xl bg-sand border border-sand-dark flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div>
                    <div class="font-semibold text-navy">${escapeHtml(b.itemName)}</div>
                    <div class="text-xs text-slate-500">${escapeHtml(b.type)} • Ref #${escapeHtml(b.id)} • Date: ${escapeHtml(b.date)} • ${b.guests} guest(s)</div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-navy">$${Number(b.total).toLocaleString()}</div>
                    <span class="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      b.status === 'Confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : b.status === 'Cancelled'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }">${escapeHtml(b.status)}</span>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>`
          : '<p class="text-sm text-slate-500 py-3">No bookings yet. Explore destinations or reserve a hotel/flight above.</p>'
      }
    </div>

    <div class="mt-6 pt-4 border-t border-slate-100">
      <h4 class="font-bold text-sm uppercase tracking-wider text-slate-500 mb-2.5">Saved Wishlist (${savedPackages.length})</h4>
      <div class="flex flex-wrap gap-2">
        ${
          savedPackages.length
            ? savedPackages
                .map(
                  (p) => `<button onclick="closeModal('profile-modal'); openPackageModal('${p.id}')" class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-tealbrand/15 text-xs font-semibold text-navy">${escapeHtml(p.title)}</button>`
                )
                .join('')
            : '<span class="text-xs text-slate-400">No saved packages yet.</span>'
        }
      </div>
    </div>
  `;
  openModal('profile-modal');
}

// ---------- Destinations, Search & Filter ----------
function handleHeroSearch(e) {
  e.preventDefault();
  const q = document.getElementById('hero-search-input').value.trim();
  const cat = document.getElementById('hero-category-select').value;
  document.getElementById('filter-search').value = q;
  selectedCategory = cat;
  renderCategoryPills();
  renderDestinations();
  document.getElementById('destinations').scrollIntoView({ behavior: 'smooth' });
}

function renderCategoryPills() {
  const categories = ['All', 'Beach', 'Mountain', 'Cultural', 'Adventure', 'Luxury'];
  const container = document.getElementById('category-pills');
  if (!container) return;

  container.innerHTML = categories
    .map((cat) => {
      const active = selectedCategory === cat;
      return `
        <button
          type="button"
          onclick="selectCategory('${cat}')"
          class="px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition ${
            active
              ? 'bg-tealbrand text-white shadow-sm'
              : 'bg-sand text-slate-700 hover:bg-sand-dark'
          }"
        >
          ${cat === 'All' ? 'All Destinations' : cat}
        </button>
      `;
    })
    .join('');
}

function selectCategory(cat) {
  selectedCategory = cat;
  renderCategoryPills();
  renderDestinations();
}

function updatePriceSliderLabel() {
  const val = Number(document.getElementById('filter-max-price').value);
  document.getElementById('price-slider-value').textContent = '$' + val.toLocaleString();
}

function resetFilters() {
  selectedCategory = 'All';
  document.getElementById('filter-search').value = '';
  document.getElementById('filter-max-price').value = 5000;
  document.getElementById('filter-duration').value = 'All';
  document.getElementById('filter-sort').value = 'featured';
  updatePriceSliderLabel();
  renderCategoryPills();
  renderDestinations();
}

function getFilteredPackages() {
  const query = (document.getElementById('filter-search')?.value || '').trim().toLowerCase();
  const maxPrice = Number(document.getElementById('filter-max-price')?.value || 10000);
  const duration = document.getElementById('filter-duration')?.value || 'All';
  const sort = document.getElementById('filter-sort')?.value || 'featured';

  let list = packages.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesPrice = Number(p.price) <= maxPrice;
    const matchesQuery =
      !query ||
      p.title.toLowerCase().includes(query) ||
      p.location.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query);

    let matchesDur = true;
    if (duration === 'short') matchesDur = p.durationDays <= 5;
    else if (duration === 'medium') matchesDur = p.durationDays >= 6 && p.durationDays <= 8;
    else if (duration === 'long') matchesDur = p.durationDays >= 9;

    return matchesCat && matchesPrice && matchesQuery && matchesDur;
  });

  if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
  else if (sort === 'rating-desc') list.sort((a, b) => b.rating - a.rating);

  return list;
}

function renderDestinations() {
  const grid = document.getElementById('destinations-grid');
  const countEl = document.getElementById('results-count');
  if (!grid) return;

  const list = getFilteredPackages();
  if (countEl) countEl.textContent = list.length;

  if (!list.length) {
    grid.innerHTML = `
      <div class="col-span-full bg-white rounded-2xl p-10 text-center border border-slate-200">
        <p class="font-display text-xl font-bold text-navy mb-2">No packages match your current filters</p>
        <p class="text-sm text-slate-500 mb-4">Try raising your maximum budget or clearing search keywords.</p>
        <button onclick="resetFilters()" class="px-5 py-2.5 rounded-xl bg-tealbrand text-white text-sm font-semibold">Reset Filters</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = list
    .map((pkg) => {
      const saved = wishlist.includes(pkg.id);
      return `
        <article class="travel-card bg-white rounded-2xl overflow-hidden border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div class="relative h-52 overflow-hidden">
              <img src="${escapeHtml(pkg.image)}" alt="${escapeHtml(pkg.title)}" class="w-full h-full object-cover" loading="lazy" />
              <span class="absolute top-3 left-3 px-3 py-1 rounded-full bg-navy/85 backdrop-blur-sm text-white text-xs font-semibold">
                ${escapeHtml(pkg.category)}
              </span>
              <button
                type="button"
                onclick="toggleWishlist('${pkg.id}')"
                title="${saved ? 'Remove from wishlist' : 'Save to wishlist'}"
                class="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow transition ${
                  saved ? 'text-rose-600' : 'text-slate-600'
                }"
              >
                <i data-lucide="heart" class="w-4 h-4 ${saved ? 'fill-current' : ''}"></i>
              </button>
            </div>

            <div class="p-5">
              <div class="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span class="flex items-center gap-1 font-medium text-tealbrand">
                  <i data-lucide="map-pin" class="w-3.5 h-3.5"></i>
                  ${escapeHtml(pkg.location)}
                </span>
                <span class="font-semibold text-amber-600">★ ${pkg.rating}</span>
              </div>

              <h3 class="font-display text-xl font-bold text-navy leading-snug mb-2">${escapeHtml(pkg.title)}</h3>
              <p class="text-sm text-slate-600 line-clamp-2 mb-4">${escapeHtml(pkg.description)}</p>

              <div class="flex items-center gap-4 text-xs text-slate-500 pt-3 border-t border-slate-100">
                <span class="flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5"></i> ${pkg.durationDays} Days</span>
                <span class="flex items-center gap-1"><i data-lucide="users" class="w-3.5 h-3.5"></i> ${pkg.spotsLeft} spots left</span>
              </div>
            </div>
          </div>

          <div class="px-5 pb-5 pt-2 flex items-center justify-between gap-3">
            <div>
              <span class="text-[11px] uppercase tracking-wider text-slate-400 block">From</span>
              <span class="font-display text-2xl font-bold text-navy">$${Number(pkg.price).toLocaleString()}</span>
              <span class="text-xs text-slate-500">/adult</span>
            </div>
            <button
              type="button"
              onclick="openPackageModal('${pkg.id}')"
              class="px-4 py-2.5 rounded-xl bg-navy hover:bg-tealbrand text-white text-xs sm:text-sm font-semibold transition"
            >
              View Details
            </button>
          </div>
        </article>
      `;
    })
    .join('');

  if (window.lucide) lucide.createIcons();
}

function toggleWishlist(pkgId) {
  if (wishlist.includes(pkgId)) {
    wishlist = wishlist.filter((id) => id !== pkgId);
    showToast('Removed from wishlist', 'info');
  } else {
    wishlist.push(pkgId);
    showToast('Saved to wishlist!');
  }
  saveStorage(STORAGE_KEYS.WISHLIST, wishlist);
  renderDestinations();
}

// ---------- Package Details & Live Calculator Modal ----------
function openPackageModal(pkgId) {
  const pkg = packages.find((p) => p.id === pkgId);
  if (!pkg) return;

  const container = document.getElementById('package-modal-content');
  container.innerHTML = `
    <button onclick="closeModal('package-modal')" class="absolute right-4 top-4 z-10 p-2 rounded-full bg-navy/80 text-white hover:bg-navy">
      <i data-lucide="x" class="w-5 h-5"></i>
    </button>

    <div class="h-60 sm:h-72 relative">
      <img src="${escapeHtml(pkg.image)}" alt="${escapeHtml(pkg.title)}" class="w-full h-full object-cover" />
      <div class="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/25 to-transparent flex items-end p-6 text-white">
        <div>
          <span class="text-xs font-bold uppercase tracking-widest text-teal-300">${escapeHtml(pkg.category)} • ${pkg.durationDays} Days</span>
          <h3 class="font-display text-2xl sm:text-3xl font-bold">${escapeHtml(pkg.title)}</h3>
          <p class="text-sm text-slate-200">${escapeHtml(pkg.location)} • ★ ${pkg.rating}</p>
        </div>
      </div>
    </div>

    <div class="p-6 sm:p-7 space-y-6">
      <p class="text-sm sm:text-base text-slate-600 leading-relaxed">${escapeHtml(pkg.description)}</p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div class="bg-sand rounded-xl p-4">
          <h4 class="font-bold text-xs uppercase tracking-wider text-tealbrand mb-2.5">What's Included</h4>
          <ul class="space-y-1.5 text-sm text-slate-700">
            ${pkg.inclusions.map((inc) => `<li class="flex items-start gap-2"><span class="text-tealbrand font-bold">✓</span><span>${escapeHtml(inc)}</span></li>`).join('')}
          </ul>
        </div>
        <div class="bg-slate-50 rounded-xl p-4 border border-slate-200/70">
          <h4 class="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2.5">Not Included</h4>
          <ul class="space-y-1.5 text-sm text-slate-600">
            ${pkg.exclusions.map((exc) => `<li class="flex items-start gap-2"><span class="text-slate-400">•</span><span>${escapeHtml(exc)}</span></li>`).join('')}
          </ul>
        </div>
      </div>

      <div>
        <h4 class="font-bold text-xs uppercase tracking-wider text-navy mb-2.5">Sample Day-by-Day Highlights</h4>
        <div class="space-y-2">
          ${(pkg.itinerary || [])
            .map(
              (item) => `
            <div class="p-3 rounded-xl border border-slate-200/80 flex items-start gap-3 text-sm">
              <span class="px-2.5 py-1 rounded-lg bg-navy text-white text-xs font-bold shrink-0">Day ${item.day}</span>
              <div>
                <div class="font-semibold text-navy">${escapeHtml(item.title)} <span class="text-xs font-normal text-slate-400">(${escapeHtml(item.time)})</span></div>
                <div class="text-xs text-slate-600 mt-0.5">${escapeHtml(item.notes)}</div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <!-- Calculator & Instant Package Booking -->
      <form onsubmit="handlePackageBooking(event, '${pkg.id}')" class="bg-sand rounded-2xl p-5 border border-sand-dark space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h4 class="font-display text-lg font-bold text-navy">Book This Package</h4>
          <span class="text-xs text-slate-500">Children (under 12) are 50% off</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Departure Date</label>
            <input id="pkg-book-date" type="date" required value="${new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0]}" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Adults ($${pkg.price})</label>
            <input id="pkg-adults" type="number" min="1" max="10" value="2" onchange="updatePackageCalc(${pkg.price})" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Children ($${Math.round(pkg.price * 0.5)})</label>
            <input id="pkg-children" type="number" min="0" max="8" value="0" onchange="updatePackageCalc(${pkg.price})" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm" />
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div>
            <span class="text-xs text-slate-500 block">Total Package Estimate</span>
            <span id="pkg-calc-total" class="font-display text-2xl font-bold text-navy">$${(pkg.price * 2).toLocaleString()}</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" onclick="importPackageToItinerary('${pkg.id}')" class="px-4 py-2.5 rounded-xl border border-navy text-navy hover:bg-navy/5 text-xs sm:text-sm font-semibold transition">
              Load to Planner
            </button>
            <button type="submit" class="px-5 py-2.5 rounded-xl bg-tealbrand hover:bg-tealbrand-dark text-white text-xs sm:text-sm font-semibold transition shadow-md">
              Confirm Package
            </button>
          </div>
        </div>
      </form>
    </div>
  `;

  openModal('package-modal');
}

function updatePackageCalc(basePrice) {
  const adults = Math.max(1, Number(document.getElementById('pkg-adults')?.value || 1));
  const children = Math.max(0, Number(document.getElementById('pkg-children')?.value || 0));
  const total = adults * basePrice + children * Math.round(basePrice * 0.5);
  const el = document.getElementById('pkg-calc-total');
  if (el) el.textContent = '$' + total.toLocaleString();
}

function handlePackageBooking(e, pkgId) {
  e.preventDefault();
  const pkg = packages.find((p) => p.id === pkgId);
  if (!pkg) return;

  const date = document.getElementById('pkg-book-date').value;
  const adults = Math.max(1, Number(document.getElementById('pkg-adults').value || 1));
  const children = Math.max(0, Number(document.getElementById('pkg-children').value || 0));
  const total = adults * pkg.price + children * Math.round(pkg.price * 0.5);

  const record = {
    id: 'WL-' + Math.floor(10000 + Math.random() * 90000),
    type: 'Tour Package',
    itemName: pkg.title,
    customerName: currentUser ? currentUser.name : 'Guest Traveler',
    customerEmail: currentUser ? currentUser.email : 'guest@wanderluxe.com',
    date,
    guests: adults + children,
    total,
    status: 'Confirmed',
  };

  bookings.unshift(record);
  saveStorage(STORAGE_KEYS.BOOKINGS, bookings);
  closeModal('package-modal');
  showToast(`Booked ${pkg.title} (Ref #${record.id})!`);
}

function importPackageToItinerary(pkgId) {
  const pkg = packages.find((p) => p.id === pkgId);
  if (!pkg || !pkg.itinerary) return;

  itineraryItems = pkg.itinerary.map((item, idx) => ({
    id: `it-${Date.now()}-${idx}`,
    day: item.day,
    time: item.time,
    title: item.title,
    notes: item.notes,
  }));
  saveStorage(STORAGE_KEYS.ITINERARY, itineraryItems);
  renderItinerary();
  closeModal('package-modal');
  showToast(`Loaded "${pkg.title}" into Itinerary Builder!`);
  document.getElementById('itinerary').scrollIntoView({ behavior: 'smooth' });
}

// ---------- Hotel & Flight Booking ----------
function switchBookingTab(tab) {
  const hotelPanel = document.getElementById('hotel-booking-panel');
  const flightPanel = document.getElementById('flight-booking-panel');
  const hotelBtn = document.getElementById('tab-hotel-btn');
  const flightBtn = document.getElementById('tab-flight-btn');

  if (tab === 'hotel') {
    hotelPanel.classList.remove('hidden');
    hotelPanel.classList.add('grid');
    flightPanel.classList.add('hidden');
    flightPanel.classList.remove('grid');
    hotelBtn.className = 'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-tealbrand text-white transition';
    flightBtn.className = 'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-300 hover:text-white transition';
    calculateHotelEstimate();
  } else {
    flightPanel.classList.remove('hidden');
    flightPanel.classList.add('grid');
    hotelPanel.classList.add('hidden');
    hotelPanel.classList.remove('grid');
    flightBtn.className = 'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-tealbrand text-white transition';
    hotelBtn.className = 'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-300 hover:text-white transition';
    calculateFlightEstimate();
  }
}

function calculateHotelEstimate() {
  const hotelId = document.getElementById('hotel-select')?.value;
  const hotel = HOTELS.find((h) => h.id === hotelId) || HOTELS[0];
  const [, multStr] = (document.getElementById('hotel-room-type')?.value || 'Standard|1').split('|');
  const mult = Number(multStr || 1);

  const inVal = document.getElementById('hotel-checkin')?.value;
  const outVal = document.getElementById('hotel-checkout')?.value;
  let nights = 3;
  if (inVal && outVal) {
    const diff = (new Date(outVal) - new Date(inVal)) / 86400000;
    if (diff > 0) nights = Math.round(diff);
  }

  const total = Math.round(hotel.nightlyRate * mult * nights);
  document.getElementById('hotel-nights-label').textContent = nights;
  document.getElementById('hotel-estimate-total').textContent = '$' + total.toLocaleString();

  const previewCard = document.getElementById('hotel-preview-card');
  if (previewCard) {
    previewCard.innerHTML = `
      <img src="${escapeHtml(hotel.image)}" alt="${escapeHtml(hotel.name)}" class="w-full h-52 object-cover" />
      <div class="p-6 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-teal-400">${escapeHtml(hotel.city)}</span>
          <span class="text-xs font-semibold text-amber-400">★ ${hotel.rating}</span>
        </div>
        <h3 class="font-display text-2xl font-bold text-white">${escapeHtml(hotel.name)}</h3>
        <p class="text-sm text-slate-300">Base rate: <strong class="text-white">$${hotel.nightlyRate}</strong> / night</p>
        <ul class="space-y-2 pt-2 border-t border-white/10 text-sm text-slate-300">
          ${hotel.perks.map((perk) => `<li class="flex items-center gap-2"><i data-lucide="sparkles" class="w-4 h-4 text-teal-400 shrink-0"></i><span>${escapeHtml(perk)}</span></li>`).join('')}
        </ul>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }
}

function handleHotelBooking(e) {
  e.preventDefault();
  const hotel = HOTELS.find((h) => h.id === document.getElementById('hotel-select').value) || HOTELS[0];
  const [roomName, multStr] = document.getElementById('hotel-room-type').value.split('|');
  const checkin = document.getElementById('hotel-checkin').value;
  const checkout = document.getElementById('hotel-checkout').value;
  const guests = Math.max(1, Number(document.getElementById('hotel-guests').value || 1));
  const guestName = document.getElementById('hotel-guest-name').value.trim();

  let nights = 3;
  const diff = (new Date(checkout) - new Date(checkin)) / 86400000;
  if (diff > 0) nights = Math.round(diff);

  const total = Math.round(hotel.nightlyRate * Number(multStr) * nights);
  const record = {
    id: 'HTL-' + Math.floor(10000 + Math.random() * 90000),
    type: 'Hotel Stay',
    itemName: `${hotel.name} (${roomName})`,
    customerName: guestName,
    customerEmail: currentUser ? currentUser.email : 'guest@wanderluxe.com',
    date: checkin,
    guests,
    total,
    status: 'Confirmed',
  };

  bookings.unshift(record);
  saveStorage(STORAGE_KEYS.BOOKINGS, bookings);
  showToast(`Hotel reserved! Confirmation #${record.id}`);
}

function calculateFlightEstimate() {
  const origin = document.getElementById('flight-origin')?.value || 'Origin';
  const dest = document.getElementById('flight-destination')?.value || 'Destination';
  const [, fareStr] = (document.getElementById('flight-cabin')?.value || 'Economy|540').split('|');
  const pax = Math.max(1, Number(document.getElementById('flight-passengers')?.value || 1));

  const total = Number(fareStr) * pax;
  document.getElementById('flight-estimate-total').textContent = '$' + total.toLocaleString();
  document.getElementById('preview-origin').textContent = origin;
  document.getElementById('preview-dest').textContent = dest;
}

function handleFlightBooking(e) {
  e.preventDefault();
  const origin = document.getElementById('flight-origin').value.trim();
  const dest = document.getElementById('flight-destination').value.trim();
  const departDate = document.getElementById('flight-depart-date').value;
  const [cabinName, fareStr] = document.getElementById('flight-cabin').value.split('|');
  const pax = Math.max(1, Number(document.getElementById('flight-passengers').value || 1));
  const passengerName = document.getElementById('flight-passenger-name').value.trim();

  const total = Number(fareStr) * pax;
  const record = {
    id: 'FLT-' + Math.floor(10000 + Math.random() * 90000),
    type: 'Flight',
    itemName: `${origin} → ${dest} (${cabinName})`,
    customerName: passengerName,
    customerEmail: currentUser ? currentUser.email : 'guest@wanderluxe.com',
    date: departDate,
    guests: pax,
    total,
    status: 'Confirmed',
  };

  bookings.unshift(record);
  saveStorage(STORAGE_KEYS.BOOKINGS, bookings);
  showToast(`Flight ticket issued! Ref #${record.id}`);
}

// ---------- Travel Itinerary Builder ----------
function loadPresetItinerary(pkgId) {
  if (!pkgId) return;
  importPackageToItinerary(pkgId);
  document.getElementById('itinerary-preset-select').value = '';
}

function addItineraryItem(e) {
  e.preventDefault();
  const day = Math.max(1, Number(document.getElementById('itin-day').value || 1));
  const time = document.getElementById('itin-time').value;
  const title = document.getElementById('itin-title').value.trim();
  const notes = document.getElementById('itin-notes').value.trim();

  itineraryItems.push({
    id: 'it-' + Date.now(),
    day,
    time,
    title,
    notes,
  });

  saveStorage(STORAGE_KEYS.ITINERARY, itineraryItems);
  document.getElementById('itin-title').value = '';
  document.getElementById('itin-notes').value = '';
  renderItinerary();
  showToast(`Added to Day ${day}`);
}

function deleteItineraryItem(id) {
  itineraryItems = itineraryItems.filter((item) => item.id !== id);
  saveStorage(STORAGE_KEYS.ITINERARY, itineraryItems);
  renderItinerary();
  showToast('Activity removed', 'info');
}

function renderItinerary() {
  const container = document.getElementById('itinerary-timeline');
  if (!container) return;

  if (!itineraryItems.length) {
    container.innerHTML = `
      <div class="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-sm">
        Your itinerary is currently empty. Add an activity on the left or pick a package template above.
      </div>
    `;
    return;
  }

  const grouped = itineraryItems.reduce((acc, item) => {
    acc[item.day] = acc[item.day] || [];
    acc[item.day].push(item);
    return acc;
  }, {});

  const days = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  container.innerHTML = days
    .map((dayNum) => {
      const items = grouped[dayNum].sort((a, b) => a.time.localeCompare(b.time));
      return `
        <div class="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/80">
          <div class="flex items-center gap-2.5 mb-4">
            <span class="px-3 py-1 rounded-lg bg-navy text-white text-xs font-bold uppercase tracking-wider">Day ${dayNum}</span>
            <span class="text-xs text-slate-400">${items.length} planned stop(s)</span>
          </div>
          <div class="space-y-3">
            ${items
              .map(
                (item) => `
              <div class="p-3.5 rounded-xl bg-sand/70 border border-sand-dark flex items-start justify-between gap-3">
                <div class="flex items-start gap-3">
                  <span class="text-xs font-bold text-tealbrand bg-tealbrand/10 px-2.5 py-1 rounded-lg shrink-0">${escapeHtml(item.time)}</span>
                  <div>
                    <div class="font-semibold text-navy text-sm sm:text-base">${escapeHtml(item.title)}</div>
                    ${item.notes ? `<div class="text-xs text-slate-600 mt-0.5">${escapeHtml(item.notes)}</div>` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onclick="deleteItineraryItem('${item.id}')"
                  title="Remove"
                  class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition no-print"
                >
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    })
    .join('');

  if (window.lucide) lucide.createIcons();
}

function exportItineraryTxt() {
  const grouped = itineraryItems.reduce((acc, item) => {
    acc[item.day] = acc[item.day] || [];
    acc[item.day].push(item);
    return acc;
  }, {});

  const lines = ['WANDERLUXE TRAVEL ITINERARY', '==============================', ''];
  Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((d) => {
      lines.push(`DAY ${d}`);
      grouped[d]
        .sort((a, b) => a.time.localeCompare(b.time))
        .forEach((i) => {
          lines.push(`  [${i.time}] ${i.title}${i.notes ? ' — ' + i.notes : ''}`);
        });
      lines.push('');
    });

  const blob = new Blob([lines.join('
')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wanderluxe-itinerary.txt';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Downloaded wanderluxe-itinerary.txt');
}

// ---------- Photo Gallery & Lightbox ----------
function renderGalleryFilters() {
  const cats = ['All', 'Beach', 'Mountain', 'Cultural', 'Adventure'];
  const el = document.getElementById('gallery-filters');
  if (!el) return;

  el.innerHTML = cats
    .map(
      (c) => `
    <button
      type="button"
      onclick="selectGalleryCategory('${c}')"
      class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
        selectedGalleryCategory === c ? 'bg-navy text-white' : 'bg-sand text-slate-700 hover:bg-sand-dark'
      }"
    >
      ${c}
    </button>
  `
    )
    .join('');
}

function selectGalleryCategory(cat) {
  selectedGalleryCategory = cat;
  renderGalleryFilters();
  renderGallery();
}

function getVisibleGalleryItems() {
  if (selectedGalleryCategory === 'All') return GALLERY_ITEMS;
  return GALLERY_ITEMS.filter((g) => g.category === selectedGalleryCategory);
}

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  const items = getVisibleGalleryItems();
  grid.innerHTML = items
    .map(
      (item, idx) => `
    <button
      type="button"
      onclick="openLightbox(${idx})"
      class="group relative h-56 rounded-2xl overflow-hidden text-left shadow-sm hover:shadow-xl transition"
    >
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy" />
      <div class="absolute inset-0 bg-gradient-to-t from-navy/80 via-transparent to-transparent opacity-90 flex flex-col justify-end p-4 text-white">
        <span class="text-[11px] uppercase tracking-wider text-teal-300 font-semibold">${escapeHtml(item.location)}</span>
        <span class="font-display text-base font-bold">${escapeHtml(item.title)}</span>
      </div>
    </button>
  `
    )
    .join('');
}

function openLightbox(idx) {
  activeLightboxIndex = idx;
  updateLightboxContent();
  openModal('lightbox-modal');
}

function stepLightbox(delta) {
  const items = getVisibleGalleryItems();
  if (!items.length) return;
  activeLightboxIndex = (activeLightboxIndex + delta + items.length) % items.length;
  updateLightboxContent();
}

function updateLightboxContent() {
  const items = getVisibleGalleryItems();
  const item = items[activeLightboxIndex];
  if (!item) return;
  document.getElementById('lightbox-img').src = item.image;
  document.getElementById('lightbox-title').textContent = item.title;
  document.getElementById('lightbox-caption').textContent = `${item.location} • ${item.category}`;
}

// ---------- Reviews & Ratings ----------
function renderReviews() {
  const listEl = document.getElementById('reviews-list');
  const avgEl = document.getElementById('avg-rating-display');
  const starsEl = document.getElementById('avg-rating-stars');
  const countEl = document.getElementById('review-count-label');
  if (!listEl) return;

  const avg = reviews.length
    ? (reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length).toFixed(1)
    : '5.0';

  if (avgEl) avgEl.textContent = avg;
  if (starsEl) starsEl.textContent = '★'.repeat(Math.round(Number(avg))) + '☆'.repeat(5 - Math.round(Number(avg)));
  if (countEl) countEl.textContent = `Based on ${reviews.length} review(s)`;

  listEl.innerHTML = reviews
    .map(
      (r) => `
    <article class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between gap-2 mb-2">
          <span class="text-amber-500 text-sm">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
          <span class="text-xs text-slate-400">${escapeHtml(r.date)}</span>
        </div>
        <p class="text-sm text-slate-700 leading-relaxed mb-4">"${escapeHtml(r.comment)}"</p>
      </div>
      <div class="pt-3 border-t border-slate-100">
        <div class="font-semibold text-navy text-sm">${escapeHtml(r.name)}</div>
        <div class="text-xs text-tealbrand">${escapeHtml(r.destination)}</div>
      </div>
    </article>
  `
    )
    .join('');
}

function handleReviewSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('review-name').value.trim();
  const destination = document.getElementById('review-destination').value;
  const rating = Number(document.getElementById('review-rating').value);
  const comment = document.getElementById('review-comment').value.trim();

  reviews.unshift({
    id: 'rev-' + Date.now(),
    name,
    destination,
    rating,
    date: 'Nov 2026',
    comment,
  });

  saveStorage(STORAGE_KEYS.REVIEWS, reviews);
  document.getElementById('review-name').value = '';
  document.getElementById('review-comment').value = '';
  renderReviews();
  showToast('Thank you! Your review has been published.');
}

// ---------- Contact Form ----------
function handleContactSubmit(e) {
  e.preventDefault();
  const inquiry = {
    id: 'INQ-' + Date.now(),
    name: document.getElementById('contact-name').value.trim(),
    email: document.getElementById('contact-email').value.trim(),
    subject: document.getElementById('contact-subject').value.trim(),
    message: document.getElementById('contact-message').value.trim(),
    createdAt: new Date().toISOString(),
  };

  inquiries.unshift(inquiry);
  saveStorage(STORAGE_KEYS.INQUIRIES, inquiries);
  e.target.reset();
  showToast('Inquiry received! Our travel team will reply shortly.');
}

// ---------- Admin Panel (Packages, Bookings, Users) ----------
function openAdminPanel() {
  if (!currentUser || currentUser.role !== 'admin') {
    showToast('Admin access required. Use "Switch to Admin Demo" in Log In.', 'error');
    openAuthModal('login');
    return;
  }
  currentAdminTab = 'packages';
  renderAdminTab();
  openModal('admin-modal');
}

function switchAdminTab(tab) {
  currentAdminTab = tab;
  ['packages', 'bookings', 'users'].forEach((t) => {
    const btn = document.getElementById('admin-tab-' + t);
    if (!btn) return;
    btn.className =
      t === tab
        ? 'px-4 py-2 rounded-xl text-sm font-semibold bg-navy text-white'
        : 'px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200';
  });
  renderAdminTab();
}

function renderAdminTab() {
  const container = document.getElementById('admin-content');
  if (!container) return;

  if (currentAdminTab === 'packages') {
    container.innerHTML = `
      <form onsubmit="adminAddPackage(event)" class="bg-sand rounded-2xl p-4 sm:p-5 border border-sand-dark grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <div class="lg:col-span-2">
          <label class="block text-xs font-semibold text-slate-600 mb-1">Package Title</label>
          <input id="adm-pkg-title" type="text" required placeholder="Swiss Alps Rail & Peaks" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Location</label>
          <input id="adm-pkg-loc" type="text" required placeholder="Zermatt, Switzerland" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Category</label>
          <select id="adm-pkg-cat" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm">
            <option value="Mountain">Mountain</option>
            <option value="Beach">Beach</option>
            <option value="Cultural">Cultural</option>
            <option value="Adventure">Adventure</option>
            <option value="Luxury">Luxury</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Price ($)</label>
          <input id="adm-pkg-price" type="number" min="200" step="50" value="2400" required class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm" />
        </div>
        <button type="submit" class="py-2 px-4 rounded-xl bg-tealbrand hover:bg-tealbrand-dark text-white text-sm font-semibold">
          + Add Package
        </button>
      </form>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th class="py-2.5 px-3">Package</th>
              <th class="py-2.5 px-3">Category</th>
              <th class="py-2.5 px-3">Days</th>
              <th class="py-2.5 px-3">Price</th>
              <th class="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${packages
              .map(
                (p) => `
              <tr>
                <td class="py-3 px-3 font-semibold text-navy">${escapeHtml(p.title)} <span class="block text-xs font-normal text-slate-400">${escapeHtml(p.location)}</span></td>
                <td class="py-3 px-3">${escapeHtml(p.category)}</td>
                <td class="py-3 px-3">${p.durationDays}d</td>
                <td class="py-3 px-3 font-semibold">$${Number(p.price).toLocaleString()}</td>
                <td class="py-3 px-3 text-right">
                  <button onclick="adminDeletePackage('${p.id}')" class="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold">Delete</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (currentAdminTab === 'bookings') {
    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th class="py-2.5 px-3">Ref</th>
              <th class="py-2.5 px-3">Traveler &amp; Item</th>
              <th class="py-2.5 px-3">Date</th>
              <th class="py-2.5 px-3">Total</th>
              <th class="py-2.5 px-3">Status</th>
              <th class="py-2.5 px-3 text-right">Manage</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${bookings
              .map(
                (b) => `
              <tr>
                <td class="py-3 px-3 font-mono text-xs font-bold">${escapeHtml(b.id)}</td>
                <td class="py-3 px-3">
                  <div class="font-semibold text-navy">${escapeHtml(b.itemName)}</div>
                  <div class="text-xs text-slate-500">${escapeHtml(b.customerName)} (${b.guests} pax)</div>
                </td>
                <td class="py-3 px-3 text-xs">${escapeHtml(b.date)}</td>
                <td class="py-3 px-3 font-semibold">$${Number(b.total).toLocaleString()}</td>
                <td class="py-3 px-3">
                  <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${
                    b.status === 'Confirmed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : b.status === 'Cancelled'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }">${escapeHtml(b.status)}</span>
                </td>
                <td class="py-3 px-3 text-right space-x-1">
                  <button onclick="adminUpdateBookingStatus('${b.id}', 'Confirmed')" class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold">Confirm</button>
                  <button onclick="adminUpdateBookingStatus('${b.id}', 'Cancelled')" class="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold">Cancel</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th class="py-2.5 px-3">User</th>
              <th class="py-2.5 px-3">Email</th>
              <th class="py-2.5 px-3">Role</th>
              <th class="py-2.5 px-3">Status</th>
              <th class="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${users
              .map(
                (u) => `
              <tr>
                <td class="py-3 px-3 font-semibold text-navy">${escapeHtml(u.name)}</td>
                <td class="py-3 px-3 text-slate-600">${escapeHtml(u.email)}</td>
                <td class="py-3 px-3">
                  <select onchange="adminChangeUserRole('${u.id}', this.value)" class="px-2 py-1 rounded-lg border border-slate-200 text-xs bg-white">
                    <option value="traveler" ${u.role === 'traveler' ? 'selected' : ''}>traveler</option>
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
                  </select>
                </td>
                <td class="py-3 px-3">
                  <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${
                    u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }">${u.active ? 'Active' : 'Suspended'}</span>
                </td>
                <td class="py-3 px-3 text-right">
                  <button onclick="adminToggleUserActive('${u.id}')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold">
                    ${u.active ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

function adminAddPackage(e) {
  e.preventDefault();
  const title = document.getElementById('adm-pkg-title').value.trim();
  const location = document.getElementById('adm-pkg-loc').value.trim();
  const category = document.getElementById('adm-pkg-cat').value;
  const price = Number(document.getElementById('adm-pkg-price').value);

  packages.unshift({
    id: 'pkg-' + Date.now(),
    title,
    location,
    category,
    durationDays: 6,
    price,
    rating: 4.8,
    spotsLeft: 8,
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
    description: `Curated ${category.toLowerCase()} journey through ${location} crafted by WanderLuxe specialists.`,
    inclusions: ['Boutique lodging', 'Local guide & transfers', 'Daily breakfast'],
    exclusions: ['International flights', 'Personal expenses'],
    itinerary: [
      { day: 1, time: '14:00', title: `Arrival in ${location}`, notes: 'Welcome briefing and hotel check-in.' },
      { day: 2, time: '09:00', title: 'Guided Signature Excursion', notes: 'Full-day discovery with local expert.' },
    ],
  });

  saveStorage(STORAGE_KEYS.PACKAGES, packages);
  populateSelects();
  renderDestinations();
  renderAdminTab();
  showToast(`Added package "${title}"`);
}

function adminDeletePackage(pkgId) {
  packages = packages.filter((p) => p.id !== pkgId);
  saveStorage(STORAGE_KEYS.PACKAGES, packages);
  populateSelects();
  renderDestinations();
  renderAdminTab();
  showToast('Package deleted', 'info');
}

function adminUpdateBookingStatus(bookingId, status) {
  bookings = bookings.map((b) => (b.id === bookingId ? { ...b, status } : b));
  saveStorage(STORAGE_KEYS.BOOKINGS, bookings);
  renderAdminTab();
  showToast(`Booking ${bookingId} marked as ${status}`);
}

function adminChangeUserRole(userId, role) {
  users = users.map((u) => (u.id === userId ? { ...u, role } : u));
  saveStorage(STORAGE_KEYS.USERS, users);
  if (currentUser && currentUser.id === userId) {
    currentUser.role = role;
    saveStorage(STORAGE_KEYS.CURRENT_USER, currentUser);
    renderAuthUI();
  }
  showToast('Updated user role');
}

function adminToggleUserActive(userId) {
  users = users.map((u) => (u.id === userId ? { ...u, active: !u.active } : u));
  saveStorage(STORAGE_KEYS.USERS, users);
  renderAdminTab();
  showToast('Updated user status');
}

// ---------- Security Helper ----------
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

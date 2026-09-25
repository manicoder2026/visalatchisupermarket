// public/js/app.js
// -----------------------------------------------------------------
// Shared code loaded on EVERY page:
//   - API_BASE constant
//   - Cart storage (browser localStorage - works for guests too)
//   - Toast notifications
//   - Header search + mobile menu behavior
//   - Small helper functions (formatPrice, escapeHtml, etc.)
// -----------------------------------------------------------------

const API_BASE = '/api';
const CART_STORAGE_KEY = 'vsm_cart';
const RECENTLY_VIEWED_KEY = 'vsm_recently_viewed';
const WISHLIST_KEY = 'vsm_wishlist';

// ---------------------------------------------------------
// CART STORAGE (guest cart lives in the browser, no login needed)
// Cart is stored as: [{ product_id, quantity }]
// ---------------------------------------------------------
function getCart() {
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartBadge();
}

function addToCart(productId, quantity) {
    const cart = getCart();
    const existing = cart.find(item => item.product_id === productId);

    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({ product_id: productId, quantity });
    }

    saveCart(cart);
}

function updateCartQuantity(productId, quantity) {
    let cart = getCart();
    if (quantity <= 0) {
        cart = cart.filter(item => item.product_id !== productId);
    } else {
        const item = cart.find(i => i.product_id === productId);
        if (item) item.quantity = quantity;
    }
    saveCart(cart);
}

function removeFromCart(productId) {
    const cart = getCart().filter(item => item.product_id !== productId);
    saveCart(cart);
}

function clearCart() {
    localStorage.removeItem(CART_STORAGE_KEY);
    updateCartBadge();
}

function getCartCount() {
    return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

function updateCartBadge() {
    const badge = document.querySelectorAll('.cart-count');
    const count = getCartCount();
    badge.forEach(b => {
        b.textContent = count;
        b.style.display = count > 0 ? 'flex' : 'none';
    });
}

// ---------------------------------------------------------
// RECENTLY VIEWED (stores up to 10 product IDs, newest first)
// ---------------------------------------------------------
function addRecentlyViewed(productId) {
    let list = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
    list = list.filter(id => id !== productId);
    list.unshift(productId);
    list = list.slice(0, 10);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list));
}

function getRecentlyViewed() {
    return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
}

// ---------------------------------------------------------
// WISHLIST (simple guest wishlist, list of product IDs)
// ---------------------------------------------------------
function getWishlist() {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');
}

function toggleWishlist(productId) {
    let list = getWishlist();
    if (list.includes(productId)) {
        list = list.filter(id => id !== productId);
    } else {
        list.push(productId);
    }
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
    return list.includes(productId);
}

// ---------------------------------------------------------
// TOAST NOTIFICATIONS
// ---------------------------------------------------------
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------
function formatPrice(value) {
    if (value == null) return '';
    return '₹' + Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function calculateDiscountPercent(price, offerPrice) {
    if (!offerPrice || offerPrice >= price) return 0;
    return Math.round(((price - offerPrice) / price) * 100);
}

// Builds a small placeholder block for products without an image
function productImageHtml(product, sizeClass) {
    if (product.image) {
        return `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.product_name)}" loading="lazy"
                 onerror="this.parentElement.innerHTML = getPlaceholderHtml();">`;
    }
    return getPlaceholderHtml();
}

function getPlaceholderHtml() {
    return `<div class="product-placeholder">
                <div class="ph-icon">🛒</div>
                <div>Product Image<br>Coming Soon</div>
            </div>`;
}

// Simple fetch wrapper that shows a toast on network/API errors
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, options);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || 'Something went wrong. Please try again.');
        }
        return data;
    } catch (err) {
        showToast(err.message || 'Network error. Please check your connection.', 'error');
        throw err;
    }
}

// ---------------------------------------------------------
// HEADER: mobile menu + search
// ---------------------------------------------------------
function initHeader() {
    updateCartBadge();

    // Mobile hamburger menu
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const mobileNav = document.querySelector('.mobile-nav');
    const mobileNavOverlay = document.querySelector('.mobile-nav-overlay');
    const mobileNavClose = document.querySelector('.mobile-nav-close');

    function openMobileNav(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (mobileNav) mobileNav.classList.add('open');
        if (mobileNavOverlay) mobileNavOverlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    function closeMobileNav(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (mobileNav) mobileNav.classList.remove('open');
        if (mobileNavOverlay) mobileNavOverlay.classList.remove('show');
        document.body.style.overflow = '';
    }

    if (hamburgerBtn) hamburgerBtn.onclick = openMobileNav;
    if (mobileNavClose) mobileNavClose.onclick = closeMobileNav;
    if (mobileNavOverlay) mobileNavOverlay.onclick = closeMobileNav;

    if (mobileNav) {
        mobileNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                closeMobileNav();
            });
        });
    }

    // Header search with live suggestions
    const searchInput = document.querySelector('.header-search input');
    const suggestionsBox = document.querySelector('.search-suggestions');
    let searchTimer = null;

    if (searchInput && suggestionsBox) {
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.trim();
            clearTimeout(searchTimer);

            if (q.length < 2) {
                suggestionsBox.classList.remove('show');
                suggestionsBox.innerHTML = '';
                return;
            }

            searchTimer = setTimeout(async () => {
                try {
                    const data = await apiRequest(`${API_BASE}/products/search?q=${encodeURIComponent(q)}`);
                    renderSearchSuggestions(data.products || []);
                } catch (e) { /* toast already shown */ }
            }, 300);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                window.location.href = `products.html?search=${encodeURIComponent(searchInput.value.trim())}`;
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.header-search')) {
                suggestionsBox.classList.remove('show');
            }
        });
    }

    function renderSearchSuggestions(products) {
        if (products.length === 0) {
            suggestionsBox.innerHTML = `<div class="search-suggestion-item"><span class="s-meta">No products found. Try another search.</span></div>`;
            suggestionsBox.classList.add('show');
            return;
        }

        suggestionsBox.innerHTML = products.slice(0, 8).map(p => `
            <div class="search-suggestion-item" onclick="window.location.href='products.html?product=${p.id}'">
                <span class="s-name">${escapeHtml(p.product_name)}</span>
                <span class="s-meta">${escapeHtml(p.category)}</span>
            </div>
        `).join('');
        suggestionsBox.classList.add('show');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeader);
} else {
    initHeader();
}

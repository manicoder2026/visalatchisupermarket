// public/js/home.js
// -----------------------------------------------------------------
// Loads dynamic content for the homepage:
// categories, today's offers, popular products, grocery essentials.
// Card rendering itself lives in product-cards.js (shared).
// -----------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadOffers();
    loadPopularProducts();
    loadEssentials();
});

async function loadCategories() {
    const grid = document.getElementById('categoryGrid');
    if (!grid) return;
    grid.innerHTML = Array(8).fill('<div class="skeleton skeleton-card" style="height:140px;"></div>').join('');

    try {
        const data = await apiRequest(`${API_BASE}/categories`);
        const categories = data.categories || [];

        if (categories.length === 0) {
            grid.innerHTML = `<p style="color:var(--text-muted);">No categories yet. Please check back soon.</p>`;
            return;
        }

        grid.innerHTML = categories.map(cat => `
            <a href="products.html?category=${encodeURIComponent(cat.name)}" class="category-card">
                <div class="category-icon">${cat.icon || '🛒'}</div>
                <div class="category-name">${escapeHtml(cat.name)}</div>
                <div class="category-count">${cat.product_count} products</div>
            </a>
        `).join('');
    } catch (e) {
        grid.innerHTML = `<p style="color:var(--text-muted);">Could not load categories right now.</p>`;
    }
}

async function loadOffers() {
    const grid = document.getElementById('offersGrid');
    if (!grid) return;
    grid.innerHTML = Array(4).fill('<div class="skeleton skeleton-card"></div>').join('');

    try {
        const data = await apiRequest(`${API_BASE}/products?onOffer=true&limit=8`);
        renderProductCards(grid, data.products || [], 'No offers available right now.');
    } catch (e) {
        grid.innerHTML = `<p style="color:var(--text-muted);">Could not load offers right now.</p>`;
    }
}

async function loadPopularProducts() {
    const grid = document.getElementById('popularGrid');
    if (!grid) return;
    grid.innerHTML = Array(4).fill('<div class="skeleton skeleton-card"></div>').join('');

    try {
        const data = await apiRequest(`${API_BASE}/products?limit=8&sort=name`);
        renderProductCards(grid, data.products || [], 'No products available yet.');
    } catch (e) {
        grid.innerHTML = `<p style="color:var(--text-muted);">Could not load products right now.</p>`;
    }
}

async function loadEssentials() {
    const grid = document.getElementById('essentialsGrid');
    if (!grid) return;
    grid.innerHTML = Array(4).fill('<div class="skeleton skeleton-card"></div>').join('');

    try {
        const data = await apiRequest(`${API_BASE}/products/category/Rice?limit=4`);
        let products = data.products || [];

        // Fall back to a general list if the "Rice" sample set is empty
        if (products.length === 0) {
            const fallback = await apiRequest(`${API_BASE}/products?limit=4`);
            products = fallback.products || [];
        }
        renderProductCards(grid, products, 'No products available yet.');
    } catch (e) {
        grid.innerHTML = `<p style="color:var(--text-muted);">Could not load products right now.</p>`;
    }
}

// public/js/products.js
// -----------------------------------------------------------------
// Logic for the product listing page: reads filters from the URL,
// loads the filter sidebar (categories/brands), fetches products
// from the API with pagination, and wires up sort/filter controls.
// -----------------------------------------------------------------

const state = {
    page: 1,
    category: null,
    brand: null,
    search: null,
    minPrice: null,
    maxPrice: null,
    inStock: false,
    onOffer: false,
    sort: 'popular'
};

document.addEventListener('DOMContentLoaded', () => {
    readStateFromUrl();
    loadFilterOptions();
    loadProducts();
    wireControls();
});

function readStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('category')) state.category = params.get('category');
    if (params.get('brand')) state.brand = params.get('brand');
    if (params.get('search')) state.search = params.get('search');
    if (params.get('onOffer') === 'true') state.onOffer = true;
    if (params.get('page')) state.page = parseInt(params.get('page'), 10) || 1;

    // Reflect the current search term into the header search box too
    if (state.search) {
        const input = document.getElementById('mainSearchInput');
        if (input) input.value = state.search;
    }

    updatePageHeading();
}

function updatePageHeading() {
    const title = document.getElementById('pageTitle');
    const subtitle = document.getElementById('pageSubtitle');

    if (state.search) {
        title.textContent = `Search results for "${state.search}"`;
        subtitle.textContent = 'Products matching your search';
    } else if (state.category) {
        title.textContent = state.category;
        subtitle.textContent = `Browse all products in ${state.category}`;
    } else if (state.onOffer) {
        title.textContent = "Today's Best Deals";
        subtitle.textContent = 'Products currently on offer';
    }
}

async function loadFilterOptions() {
    try {
        const [catData, brandData] = await Promise.all([
            apiRequest(`${API_BASE}/categories`),
            apiRequest(`${API_BASE}/products/brands`)
        ]);

        const categoryContainer = document.getElementById('categoryFilters');
        categoryContainer.innerHTML = (catData.categories || []).map(cat => `
            <label class="filter-option">
                <input type="radio" name="categoryFilter" value="${escapeHtml(cat.name)}" ${state.category === cat.name ? 'checked' : ''}>
                ${escapeHtml(cat.name)} <span style="color:var(--text-muted);">(${cat.product_count})</span>
            </label>
        `).join('') + `
            <label class="filter-option">
                <input type="radio" name="categoryFilter" value="" ${!state.category ? 'checked' : ''}> All Categories
            </label>
        `;

        const brandContainer = document.getElementById('brandFilters');
        const brands = (brandData.brands || []).slice(0, 15); // keep sidebar manageable
        brandContainer.innerHTML = brands.map(brand => `
            <label class="filter-option">
                <input type="radio" name="brandFilter" value="${escapeHtml(brand)}" ${state.brand === brand ? 'checked' : ''}>
                ${escapeHtml(brand)}
            </label>
        `).join('') + `
            <label class="filter-option">
                <input type="radio" name="brandFilter" value="" ${!state.brand ? 'checked' : ''}> All Brands
            </label>
        `;

        document.getElementById('onOfferFilter').checked = state.onOffer;
    } catch (e) { /* toast already shown */ }
}

async function loadProducts() {
    const grid = document.getElementById('productsGrid');
    const resultsCount = document.getElementById('resultsCount');
    grid.innerHTML = Array(8).fill('<div class="skeleton skeleton-card"></div>').join('');
    resultsCount.textContent = 'Loading...';

    try {
        let data;

        if (state.search) {
            data = await apiRequest(`${API_BASE}/products/search?q=${encodeURIComponent(state.search)}`);
            data.pagination = { page: 1, totalPages: 1, total: data.products.length };
        } else {
            const params = new URLSearchParams();
            params.set('page', state.page);
            params.set('sort', state.sort);
            if (state.category) params.set('category', state.category);
            if (state.brand) params.set('brand', state.brand);
            if (state.minPrice) params.set('minPrice', state.minPrice);
            if (state.maxPrice) params.set('maxPrice', state.maxPrice);
            if (state.inStock) params.set('inStock', 'true');
            if (state.onOffer) params.set('onOffer', 'true');

            data = await apiRequest(`${API_BASE}/products?${params.toString()}`);
        }

        renderProductCards(grid, data.products || [], 'No products found. Try another search.');
        resultsCount.textContent = `${data.pagination.total} product${data.pagination.total === 1 ? '' : 's'} found`;
        renderPagination(data.pagination);
    } catch (e) {
        grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Could not load products right now. Please try again.</p></div>`;
        resultsCount.textContent = '';
    }
}

function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    container.innerHTML = '';

    if (!pagination || pagination.totalPages <= 1) return;

    const { page, totalPages } = pagination;

    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = page <= 1;
    prevBtn.addEventListener('click', () => goToPage(page - 1));
    container.appendChild(prevBtn);

    // Show a reasonable window of page numbers around the current page
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);

    for (let i = start; i <= end; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        if (i === page) btn.classList.add('active');
        btn.addEventListener('click', () => goToPage(i));
        container.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = page >= totalPages;
    nextBtn.addEventListener('click', () => goToPage(page + 1));
    container.appendChild(nextBtn);
}

function goToPage(page) {
    state.page = page;
    loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function wireControls() {
    // Sort dropdown
    document.getElementById('sortSelect').addEventListener('change', (e) => {
        state.sort = e.target.value;
        state.page = 1;
        loadProducts();
    });

    // Apply filters button
    document.getElementById('applyFiltersBtn').addEventListener('click', () => {
        const categoryChecked = document.querySelector('input[name="categoryFilter"]:checked');
        const brandChecked = document.querySelector('input[name="brandFilter"]:checked');

        state.category = categoryChecked && categoryChecked.value ? categoryChecked.value : null;
        state.brand = brandChecked && brandChecked.value ? brandChecked.value : null;
        state.minPrice = document.getElementById('minPriceInput').value || null;
        state.maxPrice = document.getElementById('maxPriceInput').value || null;
        state.inStock = document.getElementById('inStockFilter').checked;
        state.onOffer = document.getElementById('onOfferFilter').checked;
        state.search = null; // switching to filter mode clears a text search
        state.page = 1;

        updatePageHeading();
        loadProducts();
        closeMobileFilters();
    });

    // Clear filters
    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
        state.category = null;
        state.brand = null;
        state.minPrice = null;
        state.maxPrice = null;
        state.inStock = false;
        state.onOffer = false;
        state.search = null;
        state.page = 1;

        document.getElementById('minPriceInput').value = '';
        document.getElementById('maxPriceInput').value = '';
        document.getElementById('inStockFilter').checked = false;
        document.getElementById('onOfferFilter').checked = false;

        loadFilterOptions();
        document.getElementById('pageTitle').textContent = 'All Products';
        document.getElementById('pageSubtitle').textContent = 'Browse our full range';
        loadProducts();
        closeMobileFilters();
    });

    // Mobile filter drawer toggle
    const sidebar = document.getElementById('filtersSidebar');
    document.getElementById('openFiltersBtn').addEventListener('click', () => {
        sidebar.classList.add('show-mobile');
        document.getElementById('closeFiltersBtn').style.display = 'block';
    });

    // A close button is only meaningful once the sidebar is shown as a drawer on mobile
    document.getElementById('closeFiltersBtn').addEventListener('click', closeMobileFilters);
}

function closeMobileFilters() {
    document.getElementById('filtersSidebar').classList.remove('show-mobile');
}

// public/js/product-modal.js
// -----------------------------------------------------------------
// Shared "product details" modal used on the homepage and the
// products listing page. Injects itself into the page on load.
// -----------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('productModal')) {
        const modal = document.createElement('div');
        modal.id = 'productModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-box">
                <button class="modal-close" onclick="closeProductModal()" aria-label="Close">×</button>
                <div id="productModalContent">
                    <div style="padding:60px; text-align:center;">Loading product...</div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeProductModal();
        });
    }

    // If the page was opened with ?product=ID (e.g. from search suggestions), open it directly
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product');
    if (productId) {
        openProductModal(parseInt(productId, 10));
    }
});

async function openProductModal(productId) {
    const modal = document.getElementById('productModal');
    const content = document.getElementById('productModalContent');
    modal.classList.add('show');
    content.innerHTML = `<div style="padding:60px; text-align:center;">Loading product...</div>`;

    try {
        const data = await apiRequest(`${API_BASE}/products/${productId}`);
        const p = data.product;
        const related = data.related || [];

        addRecentlyViewed(productId);

        const discount = calculateDiscountPercent(p.price, p.offer_price);
        const outOfStock = p.stock <= 0;

        content.innerHTML = `
            <div class="product-detail-grid">
                <div class="detail-image">
                    ${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.product_name)}" onerror="this.parentElement.innerHTML = getPlaceholderHtml();">` : getPlaceholderHtml()}
                </div>
                <div>
                    <h2 class="detail-title">${escapeHtml(p.product_name)}</h2>
                    <div class="detail-meta">${escapeHtml(p.brand || '')} ${p.unit ? '· ' + escapeHtml(p.unit) : ''}</div>
                    ${discount > 0 ? `<span class="badge-offer">${discount}% OFF</span>` : ''}
                    <div class="detail-price-row">
                        <span class="price-current">${formatPrice(p.offer_price || p.price)}</span>
                        ${p.offer_price ? `<span class="price-original">${formatPrice(p.price)}</span>` : ''}
                    </div>
                    <div class="stock-status ${outOfStock ? 'out' : 'in'}">${outOfStock ? 'Out of Stock' : '✓ Available'}</div>
                    ${p.description ? `<p class="detail-desc">${escapeHtml(p.description)}</p>` : ''}

                    ${outOfStock ? `
                        <div class="detail-actions">
                            <button class="btn btn-primary" disabled>Out of Stock</button>
                        </div>
                    ` : `
                        <div class="qty-selector" style="margin-top:14px;">
                            <button type="button" id="modalQtyMinus">−</button>
                            <span class="qty-value" id="modalQtyValue">1</span>
                            <button type="button" id="modalQtyPlus">+</button>
                        </div>
                        <div class="detail-actions">
                            <button class="btn btn-primary btn-lg" id="modalAddToCart">Add to Cart</button>
                            <button class="btn btn-secondary btn-lg" id="modalBuyNow">Buy Now</button>
                        </div>
                    `}
                </div>
            </div>

            ${related.length > 0 ? `
                <div class="related-products">
                    <h3>You may also like</h3>
                    <div class="product-grid" id="relatedGrid"></div>
                </div>
            ` : ''}
        `;

        if (!outOfStock) {
            document.getElementById('modalQtyMinus').addEventListener('click', () => {
                const el = document.getElementById('modalQtyValue');
                const val = parseInt(el.textContent, 10);
                if (val > 1) el.textContent = val - 1;
            });
            document.getElementById('modalQtyPlus').addEventListener('click', () => {
                const el = document.getElementById('modalQtyValue');
                el.textContent = parseInt(el.textContent, 10) + 1;
            });
            document.getElementById('modalAddToCart').addEventListener('click', () => {
                const qty = parseInt(document.getElementById('modalQtyValue').textContent, 10);
                addToCart(p.id, qty);
                showToast('Added to cart!');
            });
            document.getElementById('modalBuyNow').addEventListener('click', () => {
                const qty = parseInt(document.getElementById('modalQtyValue').textContent, 10);
                addToCart(p.id, qty);
                window.location.href = 'checkout.html';
            });
        }

        if (related.length > 0) {
            const relatedGrid = document.getElementById('relatedGrid');
            renderProductCards(relatedGrid, related, '');
        }
    } catch (err) {
        content.innerHTML = `<div style="padding:60px; text-align:center; color:var(--text-muted);">Sorry, this product could not be found.</div>`;
    }
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    modal.classList.remove('show');

    // Clean the ?product= param from the URL without reloading the page
    const url = new URL(window.location);
    url.searchParams.delete('product');
    window.history.replaceState({}, '', url);
}

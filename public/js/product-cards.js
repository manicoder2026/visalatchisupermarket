// public/js/product-cards.js
// -----------------------------------------------------------------
// Shared product card rendering - used by home.js, products.js and
// product-modal.js (for "related products"). No page-specific code
// or DOMContentLoaded listeners here, so it's safe to include on
// every page.
// -----------------------------------------------------------------

function renderProductCards(container, products, emptyMessage) {
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>${emptyMessage || 'No products found. Try another search.'}</p></div>`;
        return;
    }

    container.innerHTML = products.map(p => buildProductCardHtml(p)).join('');
    attachProductCardEvents(container);
}

function buildProductCardHtml(p) {
    const discount = calculateDiscountPercent(p.price, p.offer_price);
    const outOfStock = p.stock <= 0;
    const lowStock = p.stock > 0 && p.stock <= 5;

    return `
        <div class="product-card" data-id="${p.id}">
            ${discount > 0 ? `<span class="badge-offer product-badge-offer">${discount}% OFF</span>` : ''}
            ${lowStock ? `<span class="product-badge-lowstock">Only a few left</span>` : ''}
            <div class="product-image-wrap" onclick="openProductModal(${p.id})">
                ${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.product_name)}" loading="lazy" onerror="this.parentElement.innerHTML = getPlaceholderHtml();">` : getPlaceholderHtml()}
            </div>
            <div class="product-info">
                <div class="product-name" onclick="openProductModal(${p.id})">${escapeHtml(p.product_name)}</div>
                <div class="product-brand">${escapeHtml(p.brand || '')}</div>
                <div class="product-unit">${escapeHtml(p.unit || '')}</div>
                <div class="product-price-row">
                    <span class="price-current">${formatPrice(p.offer_price || p.price)}</span>
                    ${p.offer_price ? `<span class="price-original">${formatPrice(p.price)}</span>` : ''}
                </div>
                <div class="stock-status ${outOfStock ? 'out' : 'in'}">${outOfStock ? 'Out of Stock' : '✓ In Stock'}</div>
                <div class="product-actions">
                    ${outOfStock
                        ? `<button class="add-to-cart-btn" disabled>Out of Stock</button>`
                        : `<div class="qty-and-add">
                                <div class="qty-selector">
                                    <button class="qty-minus" type="button">−</button>
                                    <span class="qty-value">1</span>
                                    <button class="qty-plus" type="button">+</button>
                                </div>
                                <button class="add-to-cart-btn" type="button">Add to Cart</button>
                           </div>`
                    }
                </div>
            </div>
        </div>
    `;
}

function attachProductCardEvents(container) {
    container.querySelectorAll('.product-card').forEach(card => {
        const productId = parseInt(card.dataset.id, 10);
        const qtyValue = card.querySelector('.qty-value');
        const minusBtn = card.querySelector('.qty-minus');
        const plusBtn = card.querySelector('.qty-plus');
        const addBtn = card.querySelector('.add-to-cart-btn:not([disabled])');

        minusBtn && minusBtn.addEventListener('click', () => {
            const current = parseInt(qtyValue.textContent, 10);
            if (current > 1) qtyValue.textContent = current - 1;
        });

        plusBtn && plusBtn.addEventListener('click', () => {
            const current = parseInt(qtyValue.textContent, 10);
            qtyValue.textContent = current + 1;
        });

        addBtn && addBtn.addEventListener('click', () => {
            const qty = qtyValue ? parseInt(qtyValue.textContent, 10) : 1;
            addToCart(productId, qty);
            showToast('Added to cart!');
            animateAddToCart();
        });
    });
}

// Small pulse animation on the cart icon when an item is added
function animateAddToCart() {
    const cartIcon = document.querySelector('.icon-btn[aria-label="Cart"]');
    if (cartIcon) {
        cartIcon.style.transform = 'scale(1.25)';
        setTimeout(() => { cartIcon.style.transform = 'scale(1)'; }, 180);
    }
}

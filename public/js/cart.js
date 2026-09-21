// public/js/cart.js
// -----------------------------------------------------------------
// Cart page: the cart itself is stored in localStorage as
// [{ product_id, quantity }], so we fetch fresh product details
// (name, price, stock, image) from the API before rendering,
// to make sure prices/stock shown are always up to date.
// -----------------------------------------------------------------

document.addEventListener('DOMContentLoaded', loadCartPage);

async function loadCartPage() {
    const container = document.getElementById('cartContent');
    const cart = getCart();

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <div class="empty-icon">🛒</div>
                <h3>Your cart is empty</h3>
                <p style="color:var(--text-muted); margin:10px 0 20px;">Looks like you haven't added anything yet.</p>
                <a href="products.html" class="btn btn-primary btn-lg">Start Shopping</a>
            </div>
        `;
        return;
    }

    container.innerHTML = `<div class="skeleton skeleton-card" style="height:200px;"></div>`;

    try {
        // Fetch full product details for every item currently in the cart
        const productDetails = await Promise.all(
            cart.map(item => apiRequest(`${API_BASE}/products/${item.product_id}`).catch(() => null))
        );

        const cartItems = [];
        cart.forEach((item, index) => {
            const result = productDetails[index];
            if (result && result.product) {
                cartItems.push({ ...item, product: result.product });
            }
        });

        // Remove any items whose product no longer exists (e.g. discontinued)
        if (cartItems.length !== cart.length) {
            saveCart(cartItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })));
        }

        renderCart(cartItems);
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><p>Could not load your cart right now. Please try again.</p></div>`;
    }
}

function renderCart(cartItems) {
    const container = document.getElementById('cartContent');

    if (cartItems.length === 0) {
        loadCartPage(); // re-run to show the empty state
        return;
    }

    let subtotal = 0;
    const itemsHtml = cartItems.map(item => {
        const p = item.product;
        const unitPrice = p.offer_price || p.price;
        const lineTotal = unitPrice * item.quantity;
        subtotal += lineTotal;

        return `
            <div class="cart-item" data-id="${p.id}">
                <div class="cart-item-image">
                    ${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.product_name)}" onerror="this.parentElement.innerHTML = getPlaceholderHtml();">` : getPlaceholderHtml()}
                </div>
                <div>
                    <div class="cart-item-name">${escapeHtml(p.product_name)}</div>
                    <div class="cart-item-unit">${escapeHtml(p.unit || '')}</div>
                </div>
                <div class="qty-selector">
                    <button type="button" class="cart-qty-minus">−</button>
                    <span class="qty-value">${item.quantity}</span>
                    <button type="button" class="cart-qty-plus">+</button>
                </div>
                <div class="cart-item-price">${formatPrice(lineTotal)}</div>
                <button class="remove-btn" type="button">Remove</button>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="cart-layout">
            <div>${itemsHtml}</div>
            <div class="cart-summary">
                <h3>Order Summary</h3>
                <div class="summary-row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
                <div class="summary-row"><span>Delivery</span><span class="free-tag">FREE</span></div>
                <div class="summary-row total"><span>Total</span><span>${formatPrice(subtotal)}</span></div>
                <a href="checkout.html" class="btn btn-primary btn-block btn-lg" style="margin-top:14px;">Proceed to Order</a>
                <a href="products.html" class="btn btn-outline btn-block" style="margin-top:8px;">Continue Shopping</a>
            </div>
        </div>
    `;

    wireCartItemEvents();
}

function wireCartItemEvents() {
    document.querySelectorAll('.cart-item').forEach(row => {
        const productId = parseInt(row.dataset.id, 10);
        const qtyValueEl = row.querySelector('.qty-value');

        row.querySelector('.cart-qty-minus').addEventListener('click', () => {
            const newQty = parseInt(qtyValueEl.textContent, 10) - 1;
            updateCartQuantity(productId, newQty);
            loadCartPage();
        });

        row.querySelector('.cart-qty-plus').addEventListener('click', () => {
            const newQty = parseInt(qtyValueEl.textContent, 10) + 1;
            updateCartQuantity(productId, newQty);
            loadCartPage();
        });

        row.querySelector('.remove-btn').addEventListener('click', () => {
            removeFromCart(productId);
            showToast('Item removed from cart.');
            loadCartPage();
        });
    });
}

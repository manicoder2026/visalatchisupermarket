// public/js/checkout.js
// -----------------------------------------------------------------
// Loads the order summary from the cart, validates the delivery
// form, and submits the order to the API. No login required
// (guest checkout).
// -----------------------------------------------------------------

let currentCartItems = [];

document.addEventListener('DOMContentLoaded', async () => {
    const cart = getCart();

    if (cart.length === 0) {
        document.getElementById('checkoutContent').innerHTML = `
            <div class="empty-cart">
                <div class="empty-icon">🛒</div>
                <h3>Your cart is empty</h3>
                <p style="color:var(--text-muted); margin:10px 0 20px;">Add some products before checking out.</p>
                <a href="products.html" class="btn btn-primary btn-lg">Start Shopping</a>
            </div>
        `;
        return;
    }

    await loadOrderSummary(cart);
    document.getElementById('placeOrderBtn').addEventListener('click', submitOrder);

    // Only allow digits in phone and pincode fields
    document.getElementById('customer_phone').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    });
    document.getElementById('pincode').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
    });
});

async function loadOrderSummary(cart) {
    const productDetails = await Promise.all(
        cart.map(item => apiRequest(`${API_BASE}/products/${item.product_id}`).catch(() => null))
    );

    currentCartItems = [];
    cart.forEach((item, index) => {
        const result = productDetails[index];
        if (result && result.product) {
            currentCartItems.push({ ...item, product: result.product });
        }
    });

    let subtotal = 0;
    const summaryHtml = currentCartItems.map(item => {
        const p = item.product;
        const unitPrice = p.offer_price || p.price;
        const lineTotal = unitPrice * item.quantity;
        subtotal += lineTotal;
        return `<div class="mini-row"><span>${escapeHtml(p.product_name)} × ${item.quantity}</span><span>${formatPrice(lineTotal)}</span></div>`;
    }).join('');

    document.getElementById('orderSummaryMini').innerHTML = summaryHtml;
    document.getElementById('summarySubtotal').textContent = formatPrice(subtotal);
    document.getElementById('summaryTotal').textContent = formatPrice(subtotal);
}

function validateField(inputId, groupId, isValid) {
    const group = document.getElementById(groupId);
    if (isValid) {
        group.classList.remove('invalid');
    } else {
        group.classList.add('invalid');
    }
    return isValid;
}

function validateForm() {
    const name = document.getElementById('customer_name').value.trim();
    const phone = document.getElementById('customer_phone').value.trim();
    const street = document.getElementById('street').value.trim();
    const area = document.getElementById('area').value.trim();
    const city = document.getElementById('city').value.trim();
    const pincode = document.getElementById('pincode').value.trim();

    let valid = true;
    valid = validateField('customer_name', 'group_name', name.length > 0) && valid;
    valid = validateField('customer_phone', 'group_phone', /^\d{10}$/.test(phone)) && valid;
    valid = validateField('street', 'group_street', street.length > 0) && valid;
    valid = validateField('area', 'group_area', area.length > 0) && valid;
    valid = validateField('city', 'group_city', city.length > 0) && valid;
    valid = validateField('pincode', 'group_pincode', /^\d{6}$/.test(pincode)) && valid;

    return valid;
}

async function submitOrder() {
    if (!validateForm()) {
        showToast('Please fix the highlighted fields.', 'error');
        return;
    }

    if (currentCartItems.length === 0) {
        showToast('Your cart is empty.', 'error');
        return;
    }

    const btn = document.getElementById('placeOrderBtn');
    btn.disabled = true;
    btn.textContent = 'Placing Order...';

    const orderPayload = {
        customer_name: document.getElementById('customer_name').value.trim(),
        customer_phone: document.getElementById('customer_phone').value.trim(),
        house_number: document.getElementById('house_number').value.trim(),
        street: document.getElementById('street').value.trim(),
        area: document.getElementById('area').value.trim(),
        city: document.getElementById('city').value.trim(),
        pincode: document.getElementById('pincode').value.trim(),
        landmark: document.getElementById('landmark').value.trim(),
        delivery_instructions: document.getElementById('delivery_instructions').value.trim(),
        items: currentCartItems.map(item => ({ product_id: item.product.id, quantity: item.quantity }))
    };

    try {
        const data = await apiRequest(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });

        clearCart();
        window.location.href = `order-success.html?order=${data.order.order_number}`;
    } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Place Order';
        // apiRequest already showed a toast with the specific error message
    }
}

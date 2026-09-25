// public/js/my-orders.js
// -----------------------------------------------------------------
// Fetches and displays customer order history with live status badges
// -----------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    loadMyOrders();
});

async function loadMyOrders() {
    const container = document.getElementById('ordersContainer');
    const authStatus = document.getElementById('customerAuthStatus');
    const subtitle = document.getElementById('myOrdersSubtitle');

    const token = getCustomerToken();
    const info = getCustomerInfo();

    if (info && info.name) {
        subtitle.innerHTML = `Welcome back, <strong>${escapeHtml(info.name)}</strong>! Here is your order history.`;
        if (authStatus) {
            authStatus.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:13.5px; color:var(--text-muted);">Signed in as <strong>${escapeHtml(info.username || info.phone)}</strong></span>
                    <button class="btn btn-outline btn-sm" onclick="logoutCustomer()">Log Out</button>
                </div>
            `;
        }
    } else {
        if (authStatus) {
            authStatus.innerHTML = `
                <a href="admin.html" class="btn btn-primary btn-sm">Sign In / Register</a>
            `;
        }
    }

    try {
        let endpoint = `${API_BASE}/orders/my-orders`;
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else if (info && info.phone) {
            endpoint += `?phone=${encodeURIComponent(info.phone)}`;
        } else {
            // Check local storage for orders placed on this device
            const localOrders = JSON.parse(localStorage.getItem('vsm_placed_orders') || '[]');
            if (localOrders.length > 0) {
                renderLocalOrdersLookup(container, localOrders);
                return;
            } else {
                renderNotLoggedInState(container);
                return;
            }
        }

        const data = await apiRequest(endpoint, { headers });
        renderOrdersList(container, data.orders || []);
    } catch (err) {
        console.warn('Orders load failed:', err.message);
        renderNotLoggedInState(container);
    }
}

function renderOrdersList(container, orders) {
    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <div class="empty-orders-card">
                <div style="font-size:60px; margin-bottom:14px;">🛍️</div>
                <h3>No Orders Found</h3>
                <p style="color:var(--text-muted); margin:8px 0 20px;">You haven't placed any orders yet. Fresh groceries are waiting for you!</p>
                <a href="products.html" class="btn btn-primary btn-lg">Start Shopping Now</a>
            </div>
        `;
        return;
    }

    container.innerHTML = orders.map(order => {
        const statusClass = getStatusClass(order.status);
        const dateStr = formatDate(order.created_at);
        const items = order.items || [];

        return `
            <div class="my-order-card">
                <div class="my-order-head">
                    <div>
                        <div class="my-order-num">Order #${escapeHtml(order.order_number)}</div>
                        <div class="my-order-date">Placed on ${dateStr}</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span class="order-status-pill ${statusClass}">${escapeHtml(order.status)}</span>
                        <a href="order-tracking.html?order=${encodeURIComponent(order.order_number)}" class="btn btn-outline btn-sm">Track Live 🚚</a>
                    </div>
                </div>

                <div class="my-order-items">
                    ${items.map(item => `
                        <div class="my-order-item-row">
                            <span class="my-order-item-name">${escapeHtml(item.product_name)} <span style="color:var(--text-muted); font-size:12.5px;">(${escapeHtml(item.unit || '1 pc')})</span></span>
                            <span class="my-order-item-qty">Qty: ${item.quantity}</span>
                            <span class="my-order-item-price">${formatPrice(item.subtotal)}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="my-order-footer">
                    <div class="my-order-address">
                        📍 <strong>Delivery to:</strong> ${escapeHtml(order.customer_name)} (${escapeHtml(order.customer_phone)})<br>
                        ${escapeHtml([order.house_number, order.street, order.area, order.city, order.pincode].filter(Boolean).join(', '))}
                    </div>
                    <div class="my-order-total-box">
                        <span style="font-size:13px; color:var(--text-muted);">Total Amount</span>
                        <span class="my-order-total-val">${formatPrice(order.total)}</span>
                        <span style="font-size:11.5px; color:var(--green); font-weight:700;">FREE DELIVERY</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderNotLoggedInState(container) {
    container.innerHTML = `
        <div class="login-prompt-card">
            <div style="font-size:54px; margin-bottom:12px;">📦</div>
            <h2>View Your Orders</h2>
            <p style="color:var(--text-muted); max-width:440px; margin:8px auto 22px; font-size:15px;">
                Sign in to your Visalatchi account to see all your active and previous orders with live status updates.
            </p>
            <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
                <a href="admin.html" class="btn btn-primary btn-lg">Sign In / Register</a>
                <a href="products.html" class="btn btn-outline btn-lg">Browse Products</a>
            </div>

            <div style="margin-top:36px; padding-top:28px; border-top:1px solid var(--border); max-width:440px; margin-left:auto; margin-right:auto;">
                <h4 style="font-size:15px; margin-bottom:10px;">Placed an order as a guest?</h4>
                <div style="display:flex; gap:8px;">
                    <input type="text" id="quickLookupInput" placeholder="Enter Order ID e.g. VSM100245" style="flex:1; padding:10px 14px; border:1.5px solid var(--border); border-radius:8px;">
                    <button class="btn btn-secondary" onclick="handleQuickLookup()">Find</button>
                </div>
            </div>
        </div>
    `;
}

async function renderLocalOrdersLookup(container, localOrderNumbers) {
    container.innerHTML = `
        <div style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
            <p style="color:var(--text-muted);">Showing recent orders placed on this device.</p>
            <a href="admin.html" class="btn btn-outline btn-sm">Sign In to sync all orders</a>
        </div>
        <div id="localOrdersList">Loading...</div>
    `;

    try {
        const orderPromises = localOrderNumbers.map(num =>
            apiRequest(`${API_BASE}/orders/${encodeURIComponent(num)}`).catch(() => null)
        );
        const results = await Promise.all(orderPromises);
        const validOrders = results.filter(r => r && r.order).map(r => r.order);
        renderOrdersList(document.getElementById('localOrdersList'), validOrders);
    } catch (e) {
        renderNotLoggedInState(container);
    }
}

function handleQuickLookup() {
    const input = document.getElementById('quickLookupInput');
    const q = input ? input.value.trim().toUpperCase() : '';
    if (!q) {
        showToast('Please enter an Order ID.', 'error');
        return;
    }
    window.location.href = `order-tracking.html?order=${encodeURIComponent(q)}`;
}

function getStatusClass(status) {
    const s = (status || '').toLowerCase();
    if (s.includes('delivered')) return 'status-delivered';
    if (s.includes('delivery')) return 'status-delivery';
    if (s.includes('packing')) return 'status-packing';
    if (s.includes('confirmed')) return 'status-confirmed';
    if (s.includes('cancelled')) return 'status-cancelled';
    return 'status-pending';
}

function formatDate(isoStr) {
    if (!isoStr) return '';
    try {
        const d = new Date(isoStr);
        return d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return isoStr;
    }
}

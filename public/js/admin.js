// public/js/admin.js
// -----------------------------------------------------------------
// Powers the entire admin/staff dashboard (admin.html):
// login, dashboard stats, product management, CSV import/export,
// bulk updates, and order management / packing screen.
// -----------------------------------------------------------------

const ADMIN_TOKEN_KEY = 'vsm_admin_token';
const ADMIN_INFO_KEY = 'vsm_admin_info';

let productsPage = 1;

document.addEventListener('DOMContentLoaded', () => {
    if (getAdminToken()) {
        showDashboard();
    } else {
        showLogin();
    }

    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('loginPassword').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    const tabSignIn = document.getElementById('tabSignInBtn');
    const tabRegister = document.getElementById('tabRegisterBtn');
    const switchSignInLink = document.getElementById('switchSignInLink');
    const registerBtn = document.getElementById('registerBtn');
    const regPhone = document.getElementById('regPhone');

    if (tabSignIn) tabSignIn.addEventListener('click', () => switchAuthTab('signin'));
    if (tabRegister) tabRegister.addEventListener('click', () => switchAuthTab('register'));
    if (switchSignInLink) switchSignInLink.addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('signin'); });
    if (registerBtn) registerBtn.addEventListener('click', handleRegister);
    if (regPhone) {
        regPhone.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
        });
    }

    const regConfirmPass = document.getElementById('regConfirmPassword');
    if (regConfirmPass) {
        regConfirmPass.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleRegister();
        });
    }
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    const mobileLogout = document.getElementById('mobileLogoutBtn');
    if (mobileLogout) mobileLogout.addEventListener('click', handleLogout);

    const menuToggle = document.getElementById('adminMenuToggle');
    if (menuToggle) menuToggle.addEventListener('click', openAdminSidebar);

    const sidebarClose = document.getElementById('adminSidebarClose');
    if (sidebarClose) sidebarClose.addEventListener('click', closeAdminSidebar);

    const backdrop = document.getElementById('adminSidebarBackdrop');
    if (backdrop) backdrop.addEventListener('click', closeAdminSidebar);

    document.querySelectorAll('.admin-nav-item[data-view]').forEach(link => {
        link.addEventListener('click', () => switchView(link.dataset.view));
    });

    document.querySelectorAll('.admin-bottom-nav-item[data-view]').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    document.getElementById('addProductBtn').addEventListener('click', () => openProductFormModal());
    document.getElementById('productForm').addEventListener('submit', handleProductFormSubmit);

    let searchTimer = null;
    document.getElementById('productSearchInput').addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { productsPage = 1; loadProducts(); }, 300);
    });

    document.getElementById('importBtn').addEventListener('click', handleCsvImport);
    document.getElementById('exportBtn').addEventListener('click', handleCsvExport);
    document.getElementById('bulkPriceBtn').addEventListener('click', handleBulkPriceUpdate);
    document.getElementById('orderStatusFilter').addEventListener('change', loadOrders);
});

// ---------------------------------------------------------
// AUTH
// ---------------------------------------------------------
function getAdminToken() {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
}

function authHeaders() {
    return { 'Authorization': `Bearer ${getAdminToken()}` };
}

function showLogin() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');

    const info = JSON.parse(localStorage.getItem(ADMIN_INFO_KEY) || '{}');
    document.getElementById('adminUsername').textContent = info.username ? `Logged in as ${info.username}` : '';

    loadDashboardStats();
}

function switchAuthTab(tab) {
    const signInSection = document.getElementById('signInFormSection');
    const registerSection = document.getElementById('registerFormSection');
    const tabSignIn = document.getElementById('tabSignInBtn');
    const tabRegister = document.getElementById('tabRegisterBtn');

    if (tab === 'register') {
        if (signInSection) signInSection.classList.add('hidden');
        if (registerSection) registerSection.classList.remove('hidden');
        if (tabSignIn) tabSignIn.classList.remove('active');
        if (tabRegister) tabRegister.classList.add('active');
    } else {
        if (registerSection) registerSection.classList.add('hidden');
        if (signInSection) signInSection.classList.remove('hidden');
        if (tabRegister) tabRegister.classList.remove('active');
        if (tabSignIn) tabSignIn.classList.add('active');
    }
}

async function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showToast('Please enter both username and password.', 'error');
        return;
    }

    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
        const data = await apiRequest(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (data.role === 'admin') {
            localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
            localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(data.admin || data.user));
            showToast('Welcome back, Admin!');
            showDashboard();
        } else {
            // Customer logged in!
            setCustomerAuth(data.token, data.user);
            showToast(`Welcome back, ${data.user.name || data.user.username}!`);
            setTimeout(() => {
                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get('redirect') || 'my-orders.html';
                window.location.href = redirect;
            }, 800);
        }
    } catch (err) {
        // apiRequest already showed the error toast
    } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
}

async function handleRegister() {
    const name = document.getElementById('regName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm_password = document.getElementById('regConfirmPassword').value;

    if (!name) return showToast('Please enter your full name.', 'error');
    if (!phone || !/^\d{10}$/.test(phone)) return showToast('Please enter a valid 10-digit mobile number.', 'error');
    if (!username) return showToast('Please choose a username.', 'error');
    if (!password) return showToast('Please enter a password.', 'error');
    if (password.length < 4) return showToast('Password must be at least 4 characters.', 'error');

    // Security Rule 1: Same username and password avoided
    if (password.toLowerCase() === username.toLowerCase()) {
        return showToast('Password cannot be the same as your username.', 'error');
    }

    // Security Rule 2: Password confirmation mismatch
    if (password !== confirm_password) {
        return showToast('Passwords do not match. Please verify your password.', 'error');
    }

    const regBtn = document.getElementById('registerBtn');
    regBtn.disabled = true;
    regBtn.textContent = 'Creating Account...';

    try {
        const data = await apiRequest(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, username, password, confirm_password })
        });

        setCustomerAuth(data.token, data.user);
        showToast(data.message || 'Account created successfully!');
        setTimeout(() => {
            window.location.href = 'my-orders.html';
        }, 900);
    } catch (err) {
        // apiRequest showed the toast
    } finally {
        regBtn.disabled = false;
        regBtn.textContent = 'Create My Account';
    }
}

function handleLogout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_INFO_KEY);
    showLogin();
}

// If any admin API call fails due to an expired/invalid token, send the user back to login
async function adminApiRequest(url, options = {}) {
    try {
        return await apiRequest(url, {
            ...options,
            headers: { ...(options.headers || {}), ...authHeaders() }
        });
    } catch (err) {
        if (err.message && err.message.toLowerCase().includes('log')) {
            handleLogout();
        }
        throw err;
    }
}

function openAdminSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const backdrop = document.getElementById('adminSidebarBackdrop');
    if (sidebar) sidebar.classList.add('show-mobile');
    if (backdrop) backdrop.classList.add('show');
}

function closeAdminSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const backdrop = document.getElementById('adminSidebarBackdrop');
    if (sidebar) sidebar.classList.remove('show-mobile');
    if (backdrop) backdrop.classList.remove('show');
}

// ---------------------------------------------------------
// VIEW SWITCHING
// ---------------------------------------------------------
function switchView(viewId) {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');

    document.querySelectorAll('.admin-nav-item[data-view]').forEach(link => {
        link.classList.toggle('active', link.dataset.view === viewId);
    });

    document.querySelectorAll('.admin-bottom-nav-item[data-view]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewId);
    });

    closeAdminSidebar();

    const titles = {
        dashboardView: 'Dashboard',
        productsView: 'Product Management',
        importView: 'Import / Export',
        ordersView: 'Orders'
    };
    document.getElementById('adminPageTitle').textContent = titles[viewId] || 'Dashboard';

    if (viewId === 'productsView') loadProducts();
    if (viewId === 'ordersView') loadOrders();
    if (viewId === 'dashboardView') loadDashboardStats();
}

// ---------------------------------------------------------
// DASHBOARD STATS
// ---------------------------------------------------------
async function loadDashboardStats() {
    try {
        const data = await adminApiRequest(`${API_BASE}/admin/dashboard`);
        document.getElementById('statProducts').textContent = data.totalProducts;
        document.getElementById('statOrders').textContent = data.totalOrders;
        document.getElementById('statPending').textContent = data.pendingOrders;
        document.getElementById('statTodayOrders').textContent = data.todayOrders;
        document.getElementById('statTodaySales').textContent = formatPrice(data.todaySales);
    } catch (e) { /* toast already shown */ }
}

// ---------------------------------------------------------
// PRODUCT MANAGEMENT
// ---------------------------------------------------------
async function loadProducts() {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px;">Loading products...</td></tr>`;

    const q = document.getElementById('productSearchInput').value.trim();
    const params = new URLSearchParams({ page: productsPage, limit: 20 });
    if (q) params.set('q', q);

    try {
        const data = await adminApiRequest(`${API_BASE}/admin/products?${params.toString()}`);
        const products = data.products || [];

        if (products.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-muted);">No products found.</td></tr>`;
            document.getElementById('productsPagination').innerHTML = '';
            return;
        }

        tbody.innerHTML = products.map(p => `
            <tr>
                <td>${escapeHtml(p.product_code)}</td>
                <td>${escapeHtml(p.product_name)}</td>
                <td>${escapeHtml(p.category)}</td>
                <td>${escapeHtml(p.brand || '-')}</td>
                <td>${formatPrice(p.price)}</td>
                <td>${p.offer_price ? formatPrice(p.offer_price) : '-'}</td>
                <td>${p.stock}</td>
                <td><span class="status-pill status-${p.status === 'active' ? 'Confirmed' : 'Cancelled'}">${p.status}</span></td>
                <td>
                    <a class="action-link" onclick="openProductFormModal(${p.id})">Edit</a>
                    <a class="action-link danger" onclick="handleDeleteProduct(${p.id}, '${escapeHtml(p.product_name).replace(/'/g, "\\'")}')">Delete</a>
                </td>
            </tr>
        `).join('');

        renderProductsPagination(data.pagination);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-muted);">Could not load products.</td></tr>`;
    }
}

function renderProductsPagination(pagination) {
    const container = document.getElementById('productsPagination');
    container.innerHTML = '';
    if (!pagination || pagination.totalPages <= 1) return;

    for (let i = 1; i <= pagination.totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        if (i === pagination.page) btn.classList.add('active');
        btn.addEventListener('click', () => { productsPage = i; loadProducts(); });
        container.appendChild(btn);
    }
}

// Store the currently-open product's ID (for the image upload step)
let currentEditProductId = null;

function openProductFormModal(productId) {
    const overlay = document.getElementById('productModalOverlay');
    const form = document.getElementById('productForm');
    form.reset();
    currentEditProductId = productId || null;

    document.getElementById('productModalTitle').textContent = productId ? 'Edit Product' : 'Add Product';
    document.getElementById('imageUploadGroup').style.display = productId ? 'block' : 'none';

    if (productId) {
        // Load existing product details into the form
        adminApiRequest(`${API_BASE}/admin/products?q=`).then(() => {}); // no-op, product list already has data client-side normally
        loadProductIntoForm(productId);
    }

    overlay.classList.add('show');
}

async function loadProductIntoForm(productId) {
    try {
        // Reuse the public single-product endpoint for read (works for admin too since fields overlap)
        const data = await apiRequest(`${API_BASE}/products/${productId}`);
        const p = data.product;

        document.getElementById('editProductId').value = p.id;
        document.getElementById('f_product_code').value = p.product_code;
        document.getElementById('f_product_name').value = p.product_name;
        document.getElementById('f_category').value = p.category;
        document.getElementById('f_sub_category').value = p.sub_category || '';
        document.getElementById('f_brand').value = p.brand || '';
        document.getElementById('f_unit').value = p.unit || '';
        document.getElementById('f_price').value = p.price;
        document.getElementById('f_offer_price').value = p.offer_price || '';
        document.getElementById('f_stock').value = p.stock;
        document.getElementById('f_status').value = p.status;
        document.getElementById('f_description').value = p.description || '';
    } catch (e) {
        showToast('Could not load product details.', 'error');
        closeProductFormModal();
    }
}

function closeProductFormModal() {
    document.getElementById('productModalOverlay').classList.remove('show');
    currentEditProductId = null;
}

async function handleProductFormSubmit(e) {
    e.preventDefault();

    const payload = {
        product_code: document.getElementById('f_product_code').value.trim(),
        product_name: document.getElementById('f_product_name').value.trim(),
        category: document.getElementById('f_category').value.trim(),
        sub_category: document.getElementById('f_sub_category').value.trim(),
        brand: document.getElementById('f_brand').value.trim(),
        unit: document.getElementById('f_unit').value.trim(),
        price: document.getElementById('f_price').value,
        offer_price: document.getElementById('f_offer_price').value,
        stock: document.getElementById('f_stock').value,
        status: document.getElementById('f_status').value,
        description: document.getElementById('f_description').value.trim()
    };

    const editId = document.getElementById('editProductId').value;

    try {
        let productId = editId;

        if (editId) {
            await adminApiRequest(`${API_BASE}/admin/products/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            showToast('Product updated successfully.');
        } else {
            const result = await adminApiRequest(`${API_BASE}/admin/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            productId = result.id;
            showToast('Product added successfully.');
        }

        // If an image file was chosen, upload it now
        const imageInput = document.getElementById('f_image');
        if (imageInput.files.length > 0 && productId) {
            const formData = new FormData();
            formData.append('image', imageInput.files[0]);
            formData.append('product_code', payload.product_code);

            await adminApiRequest(`${API_BASE}/admin/products/${productId}/image`, {
                method: 'POST',
                body: formData
            });
        }

        closeProductFormModal();
        loadProducts();
        loadDashboardStats();
    } catch (err) {
        // apiRequest already showed the error toast
    }
}

async function handleDeleteProduct(productId, productName) {
    if (!confirm(`Remove "${productName}" from the store? This can be undone by editing the product's status back to Active.`)) {
        return;
    }

    try {
        await adminApiRequest(`${API_BASE}/admin/products/${productId}`, { method: 'DELETE' });
        showToast('Product removed.');
        loadProducts();
        loadDashboardStats();
    } catch (e) { /* toast already shown */ }
}

// ---------------------------------------------------------
// IMPORT / EXPORT
// ---------------------------------------------------------
async function handleCsvImport() {
    const fileInput = document.getElementById('csvFileInput');
    const resultsBox = document.getElementById('importResults');

    if (fileInput.files.length === 0) {
        showToast('Please choose a CSV file first.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    resultsBox.classList.remove('hidden');
    resultsBox.innerHTML = 'Importing... this may take a moment for large files.';

    try {
        const data = await adminApiRequest(`${API_BASE}/admin/import`, {
            method: 'POST',
            body: formData
        });

        let html = `<strong>${escapeHtml(data.message)}</strong>`;
        if (data.errors && data.errors.length > 0) {
            html += `<br><br><strong>Errors:</strong><br>` + data.errors.slice(0, 50).map(e => escapeHtml(e)).join('<br>');
            if (data.errors.length > 50) html += `<br>...and ${data.errors.length - 50} more.`;
        }
        resultsBox.innerHTML = html;

        showToast('Import finished.');
        loadDashboardStats();
    } catch (err) {
        resultsBox.innerHTML = 'Import failed. Please check the file and try again.';
    }
}

function handleCsvExport() {
    // Downloading a file needs the auth token, so we fetch it manually and trigger a save
    fetch(`${API_BASE}/admin/export`, { headers: authHeaders() })
        .then(res => res.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'visalatchi-products-export.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
        })
        .catch(() => showToast('Could not export products right now.', 'error'));
}

async function handleBulkPriceUpdate() {
    const category = document.getElementById('bulkPriceCategory').value.trim();
    const percent = document.getElementById('bulkPricePercent').value;

    if (!category || percent === '') {
        showToast('Please enter a category and a percentage change.', 'error');
        return;
    }

    try {
        const data = await adminApiRequest(`${API_BASE}/admin/products/bulk/price`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category, percentChange: percent })
        });
        showToast(data.message);
    } catch (e) { /* toast already shown */ }
}

// ---------------------------------------------------------
// ORDER MANAGEMENT
// ---------------------------------------------------------
async function loadOrders() {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px;">Loading orders...</td></tr>`;

    const status = document.getElementById('orderStatusFilter').value;
    const params = status ? `?status=${encodeURIComponent(status)}` : '';

    try {
        const data = await adminApiRequest(`${API_BASE}/admin/orders${params}`);
        const orders = data.orders || [];

        if (orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">No orders found.</td></tr>`;
            return;
        }

        tbody.innerHTML = orders.map(o => `
            <tr>
                <td>${escapeHtml(o.order_number)}</td>
                <td>${escapeHtml(o.customer_name)}</td>
                <td>${escapeHtml(o.customer_phone)}</td>
                <td>${formatPrice(o.total)}</td>
                <td>${new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                <td><span class="status-pill status-${o.status.replace(/\s/g, '-')}">${escapeHtml(o.status)}</span></td>
                <td><a class="action-link" onclick="openOrderModal(${o.id})">View / Pack</a></td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">Could not load orders.</td></tr>`;
    }
}

async function openOrderModal(orderId) {
    const overlay = document.getElementById('orderModalOverlay');
    const content = document.getElementById('orderModalContent');
    overlay.classList.add('show');
    content.innerHTML = '<p style="padding:20px;">Loading order...</p>';

    try {
        const data = await adminApiRequest(`${API_BASE}/admin/orders/${orderId}`);
        const order = data.order;
        const items = data.items;

        const statusOptions = ['Pending', 'Confirmed', 'Packing', 'Out for Delivery', 'Delivered', 'Cancelled'];

        content.innerHTML = `
            <h3>ORDER #${escapeHtml(order.order_number)}</h3>
            <p style="color:var(--text-muted); font-size:13px; margin-bottom:14px;">${new Date(order.created_at).toLocaleString('en-IN')}</p>

            <div style="font-size:14px; margin-bottom:6px;"><strong>Customer:</strong> ${escapeHtml(order.customer_name)}</div>
            <div style="font-size:14px; margin-bottom:6px;"><strong>Phone:</strong> ${escapeHtml(order.customer_phone)}</div>
            <div style="font-size:14px; margin-bottom:16px;">
                <strong>Delivery Address:</strong><br>
                ${escapeHtml(order.house_number || '')} ${escapeHtml(order.street)}, ${escapeHtml(order.area)},
                ${escapeHtml(order.city)} – ${escapeHtml(order.pincode)}
                ${order.landmark ? `<br>Landmark: ${escapeHtml(order.landmark)}` : ''}
                ${order.delivery_instructions ? `<br>Note: ${escapeHtml(order.delivery_instructions)}` : ''}
            </div>

            <hr style="border:none; border-top:1px solid var(--border); margin:14px 0;">
            <h4 style="margin-bottom:10px;">PRODUCTS</h4>
            ${items.map(item => `
                <label style="display:flex; align-items:center; gap:10px; font-size:14px; margin-bottom:10px;">
                    <input type="checkbox" class="pack-checkbox" data-item-id="${item.id}" ${item.is_packed ? 'checked' : ''} style="width:18px; height:18px;">
                    ${escapeHtml(item.product_name)} – ${escapeHtml(item.unit || '')} – Qty ${item.quantity}
                </label>
            `).join('')}

            <hr style="border:none; border-top:1px solid var(--border); margin:14px 0;">
            <div class="summary-row total"><span>TOTAL</span><span>${formatPrice(order.total)}</span></div>

            <div class="form-group" style="margin-top:16px;">
                <label>Order Status</label>
                <select id="orderStatusSelect" style="width:100%; padding:11px; border:1.5px solid var(--border); border-radius:8px;">
                    ${statusOptions.map(s => `<option value="${s}" ${s === order.status ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>
            <button class="btn btn-primary btn-block btn-lg" id="updateOrderStatusBtn" data-order-id="${order.id}">Update Status</button>
        `;

        // Wire up the packing checkboxes
        content.querySelectorAll('.pack-checkbox').forEach(cb => {
            cb.addEventListener('change', async () => {
                try {
                    await adminApiRequest(`${API_BASE}/admin/orders/${order.id}/items/${cb.dataset.itemId}/pack`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ is_packed: cb.checked })
                    });
                } catch (e) { /* toast already shown */ }
            });
        });

        document.getElementById('updateOrderStatusBtn').addEventListener('click', async () => {
            const newStatus = document.getElementById('orderStatusSelect').value;
            try {
                await adminApiRequest(`${API_BASE}/orders/${order.id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });
                showToast(`Order status updated to "${newStatus}".`);
                closeOrderModal();
                loadOrders();
                loadDashboardStats();
            } catch (e) { /* toast already shown */ }
        });
    } catch (e) {
        content.innerHTML = '<p style="padding:20px;">Could not load this order.</p>';
    }
}

function closeOrderModal() {
    document.getElementById('orderModalOverlay').classList.remove('show');
}

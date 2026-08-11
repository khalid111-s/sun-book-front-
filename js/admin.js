// =========================================
// Admin Panel: Products CRUD
// =========================================

const gateEl = document.getElementById('adminGate');
const deniedEl = document.getElementById('adminDenied');
const panelEl = document.getElementById('adminPanel');

let currentProducts = [];
let editingId = null;

function showGateMessage(html) {
    if (gateEl) gateEl.innerHTML = html;
}

// ---------- 1. التأكد إن المستخدم مسجل دخول وهو "admin" ----------
async function checkAdminAccess() {
    const token = localStorage.getItem('sunbook_token');

    if (!token) {
        localStorage.setItem('sunbook_redirect_after_login', 'admin.html');
        window.location.href = 'login.html';
        return;
    }

    try {
        const { data: user } = await api.getMe();
        if (user.role !== 'admin') {
            if (gateEl) gateEl.style.display = 'none';
            if (deniedEl) deniedEl.style.display = 'block';
            return;
        }

        if (gateEl) gateEl.style.display = 'none';
        if (panelEl) panelEl.style.display = 'block';
        initAdminPanel();
    } catch (err) {
        // التوكن غير صالح أو منتهي - نرجعه لصفحة الدخول
        localStorage.removeItem('sunbook_token');
        localStorage.setItem('sunbook_redirect_after_login', 'admin.html');
        window.location.href = 'login.html';
    }
}

// ---------- 2. تحميل جدول المنتجات ----------
async function loadProductsTable() {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';

    try {
        const { data } = await api.getProducts();
        currentProducts = data;

        if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="7">No products yet. Add your first one above.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(p => `
            <tr>
                <td><img src="${p.image}" alt="${p.title}" onerror="this.src='assets/sun-icon.png'"></td>
                <td>${p.title}</td>
                <td>LE ${Number(p.price).toFixed(2)}</td>
                <td>${p.type}</td>
                <td>${p.featured ? '<span class="admin-badge-yes">Yes</span>' : '—'}</td>
                <td>${p.order ?? 0}</td>
                <td>
                    <div class="admin-row-actions">
                        <button class="edit-btn" data-id="${p._id}">Edit</button>
                        <button class="delete-btn" data-id="${p._id}">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="color:#e05252;">Failed to load products: ${err.message}</td></tr>`;
    }
}

// ---------- 3. فورم الإضافة/التعديل ----------
function resetForm() {
    editingId = null;
    document.getElementById('productIdField').value = '';
    document.getElementById('fieldTitle').value = '';
    document.getElementById('fieldPrice').value = '';
    document.getElementById('fieldImage').value = '';
    document.getElementById('fieldType').value = 'physical';
    document.getElementById('fieldBadges').value = '';
    document.getElementById('fieldOrder').value = 0;
    document.getElementById('fieldDescription').value = '';
    document.getElementById('fieldFeatured').checked = false;
    document.getElementById('fieldInStock').checked = true;
    document.getElementById('formTitle').innerText = 'Add New Product';
    document.getElementById('submitBtn').innerText = 'Add Product';
    document.getElementById('cancelEditBtn').style.display = 'none';
    document.getElementById('formError').innerText = '';
}

function fillFormForEdit(product) {
    editingId = product._id;
    document.getElementById('productIdField').value = product._id;
    document.getElementById('fieldTitle').value = product.title;
    document.getElementById('fieldPrice').value = product.price;
    document.getElementById('fieldImage').value = product.image;
    document.getElementById('fieldType').value = product.type;
    document.getElementById('fieldBadges').value = (product.badges || []).join(', ');
    document.getElementById('fieldOrder').value = product.order ?? 0;
    document.getElementById('fieldDescription').value = product.description || '';
    document.getElementById('fieldFeatured').checked = !!product.featured;
    document.getElementById('fieldInStock').checked = product.inStock !== false;
    document.getElementById('formTitle').innerText = `Edit: ${product.title}`;
    document.getElementById('submitBtn').innerText = 'Save Changes';
    document.getElementById('cancelEditBtn').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function readFormData() {
    const badgesRaw = document.getElementById('fieldBadges').value.trim();
    return {
        title: document.getElementById('fieldTitle').value.trim(),
        price: parseFloat(document.getElementById('fieldPrice').value),
        image: document.getElementById('fieldImage').value.trim(),
        type: document.getElementById('fieldType').value,
        badges: badgesRaw ? badgesRaw.split(',').map(b => b.trim()).filter(Boolean) : [],
        order: parseInt(document.getElementById('fieldOrder').value) || 0,
        description: document.getElementById('fieldDescription').value.trim(),
        featured: document.getElementById('fieldFeatured').checked,
        inStock: document.getElementById('fieldInStock').checked,
    };
}

let revenueChartInstance = null;
let visitsChartInstance = null;
let ordersChartInstance = null;
let onlinePollInterval = null;

// ---------- 3. لوحة الإحصائيات (Dashboard) ----------
async function loadDashboardStats() {
    try {
        const [orderStatsRes, visitStatsRes, clickStatsRes, ordersListRes] = await Promise.all([
            api.getOrderStats(),
            api.getVisitStats(),
            api.getClickStats('add_to_cart'),
            api.getOrders(),
        ]);

        const orderStats = orderStatsRes.data;
        const visitStats = visitStatsRes.data;
        const clickStats = clickStatsRes.data;
        const orders = ordersListRes.data;

        document.getElementById('statTotalOrders').innerText = orderStats.totalOrders;
        document.getElementById('statTotalRevenue').innerText = `LE ${Number(orderStats.totalRevenue).toFixed(2)}`;
        document.getElementById('statUniqueVisitors').innerText = visitStats.totalUniqueVisitors;
        document.getElementById('statPageViews').innerText = visitStats.totalPageViews;
        document.getElementById('statReturningVisitors').innerText = visitStats.returningVisitors;
        document.getElementById('statNewVisitors').innerText = visitStats.newVisitors;

        const avgOrderValue = orderStats.totalOrders > 0 ? orderStats.totalRevenue / orderStats.totalOrders : 0;
        document.getElementById('statAvgOrderValue').innerText = `LE ${avgOrderValue.toFixed(2)}`;

        // نسبة وعدد السلة المتروكة: من كل الزوار اللي وصلوا لصفحة الـ checkout، كام واحد فعلاً خلّص طلب
        const cartAbandonmentEl = document.getElementById('statCartAbandonment');
        const abandonedCountEl = document.getElementById('statAbandonedCount');
        if (visitStats.checkoutVisitors > 0) {
            const abandonedCount = Math.max(0, visitStats.checkoutVisitors - orderStats.totalOrders);
            const abandonRate = (abandonedCount / visitStats.checkoutVisitors) * 100;
            cartAbandonmentEl.innerText = `${abandonRate.toFixed(0)}%`;
            abandonedCountEl.innerText = abandonedCount;
        } else {
            cartAbandonmentEl.innerText = '—';
            abandonedCountEl.innerText = '—';
        }

        // ---- أكتر المنتجات مبيعًا ----
        const topProductsBody = document.getElementById('topProductsBody');
        topProductsBody.innerHTML = orderStats.topProducts.length
            ? orderStats.topProducts.map(p => `
                <tr>
                    <td>${p.title}</td>
                    <td>${p.quantitySold}</td>
                    <td>LE ${Number(p.revenue).toFixed(2)}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="3">No orders yet.</td></tr>';

        // ---- أكتر المنتجات نقرًا على "Add to Cart" ----
        const topClickedBody = document.getElementById('topClickedBody');
        topClickedBody.innerHTML = clickStats.topClicked.length
            ? clickStats.topClicked.map(c => `<tr><td>${c.title}</td><td>${c.clicks}</td></tr>`).join('')
            : '<tr><td colspan="2">No clicks recorded yet.</td></tr>';

        // ---- الزوار حسب الدولة ----
        const topCountriesBody = document.getElementById('topCountriesBody');
        topCountriesBody.innerHTML = visitStats.topCountries.length
            ? visitStats.topCountries.map(c => `<tr><td>${c.country}</td><td>${c.visitors}</td></tr>`).join('')
            : '<tr><td colspan="2">No visits recorded yet.</td></tr>';

        // ---- مصادر الزيارات ----
        const topReferrersBody = document.getElementById('topReferrersBody');
        topReferrersBody.innerHTML = visitStats.topReferrers.length
            ? visitStats.topReferrers.map(r => `<tr><td>${r.referrer}</td><td>${r.visitors}</td></tr>`).join('')
            : '<tr><td colspan="2">No visits recorded yet.</td></tr>';

        // ---- الإيرادات حسب النوع ----
        const revenueByTypeBody = document.getElementById('revenueByTypeBody');
        const typeLabels = { physical: 'Physical Books', digital: 'Digital Books', booking: 'Sessions' };
        revenueByTypeBody.innerHTML = orderStats.revenueByType.length
            ? orderStats.revenueByType.map(t => `
                <tr><td>${typeLabels[t.type] || t.type}</td><td>LE ${Number(t.revenue).toFixed(2)}</td></tr>
            `).join('')
            : '<tr><td colspan="2">No revenue yet.</td></tr>';

        // ---- جدول الطلبات المفصّل ----
        const detailedOrdersBody = document.getElementById('detailedOrdersBody');
        detailedOrdersBody.innerHTML = orders.length
            ? orders.slice(0, 50).map(o => {
                const itemsSummary = o.items.map(i => `${i.title} ×${i.qty}`).join(', ');
                const accountName = o.user && o.user.name ? o.user.name : '—';
                return `
                    <tr>
                        <td>${new Date(o.createdAt).toLocaleDateString()}</td>
                        <td>${accountName}</td>
                        <td>${o.customerName}</td>
                        <td>${itemsSummary}</td>
                        <td>LE ${Number(o.totalAmount).toFixed(2)}</td>
                        <td>${o.country || 'Unknown'}</td>
                        <td>${o.status === 'paid' ? '<span class="admin-badge-yes">Paid</span>' : o.status}</td>
                    </tr>
                `;
            }).join('')
            : '<tr><td colspan="7">No orders yet.</td></tr>';

        // ---- رسوم بيانية ----
        renderRevenueChart(orderStats.dailyRevenue);
        renderVisitsChart(visitStats.dailyVisits);
        renderOrdersChart(orderStats.dailyRevenue); // نفس مصفوفة الإيرادات فيها عدد الطلبات لكل يوم كمان
    } catch (err) {
        console.error('Failed to load dashboard stats:', err);
    }
}

// ---------- عداد "الموجودين حاليًا" - بيتحدث لوحده كل 20 ثانية ----------
async function refreshOnlineCount() {
    try {
        const { data } = await api.getOnlineCount();
        const el = document.getElementById('statOnlineNow');
        if (el) el.innerText = data.online;
    } catch (err) {
        console.error('Failed to load online count:', err);
    }
}

function startOnlinePolling() {
    refreshOnlineCount();
    if (onlinePollInterval) clearInterval(onlinePollInterval);
    onlinePollInterval = setInterval(refreshOnlineCount, 20000);
}

function renderRevenueChart(dailyRevenue) {
    const canvas = document.getElementById('revenueChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = dailyRevenue.map(d => d.date.slice(5)); // MM-DD
    const data = dailyRevenue.map(d => d.revenue);

    if (revenueChartInstance) revenueChartInstance.destroy();

    revenueChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Revenue (LE)',
                data,
                borderColor: '#d8b056',
                backgroundColor: 'rgba(216,176,86,0.15)',
                fill: true,
                tension: 0.3,
                pointRadius: 2,
            }],
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#c4c4c4', maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#c4c4c4' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
            },
        },
    });
}

function renderVisitsChart(dailyVisits) {
    const canvas = document.getElementById('visitsChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = dailyVisits.map(d => d.date.slice(5));

    if (visitsChartInstance) visitsChartInstance.destroy();

    visitsChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Page Views',
                    data: dailyVisits.map(d => d.pageViews),
                    borderColor: '#6ea8fe',
                    backgroundColor: 'rgba(110,168,254,0.1)',
                    tension: 0.3,
                    pointRadius: 2,
                },
                {
                    label: 'Unique Visitors',
                    data: dailyVisits.map(d => d.visitors),
                    borderColor: '#d8b056',
                    backgroundColor: 'rgba(216,176,86,0.1)',
                    tension: 0.3,
                    pointRadius: 2,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#c4c4c4' } } },
            scales: {
                x: { ticks: { color: '#c4c4c4', maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#c4c4c4' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
            },
        },
    });
}

function renderOrdersChart(dailyRevenue) {
    const canvas = document.getElementById('ordersChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = dailyRevenue.map(d => d.date.slice(5));

    if (ordersChartInstance) ordersChartInstance.destroy();

    ordersChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Orders',
                data: dailyRevenue.map(d => d.orders),
                backgroundColor: 'rgba(216,176,86,0.5)',
            }],
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#c4c4c4', maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#c4c4c4', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
            },
        },
    });
}

// ---------- Export orders to CSV ----------
function downloadOrdersCSV(orders) {
    const headers = ['Date', 'Customer', 'Phone', 'Items', 'Total (LE)', 'Status'];
    const rows = orders.map(o => [
        new Date(o.createdAt).toLocaleString(),
        o.customerName,
        o.phone || '',
        o.items.map(i => `${i.title} x${i.qty}`).join(' | '),
        o.totalAmount,
        o.status,
    ]);

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sunbook-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ---------- 4. الأحداث ----------
function initTabs() {
    const buttons = document.querySelectorAll('.admin-tab-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.dataset.tab;
            document.getElementById('tabProducts').style.display = target === 'products' ? 'block' : 'none';
            document.getElementById('tabDashboard').style.display = target === 'dashboard' ? 'block' : 'none';
        });
    });
}

function initAdminPanel() {
    initTabs();
    loadProductsTable();
    loadDashboardStats();
    startOnlinePolling();

    document.getElementById('productForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('formError');
        errorEl.innerText = '';
        const payload = readFormData();

        if (!payload.title || Number.isNaN(payload.price) || !payload.image) {
            errorEl.innerText = 'Please fill in title, price and image path.';
            return;
        }

        try {
            if (editingId) {
                await api.updateProduct(editingId, payload);
            } else {
                await api.createProduct(payload);
            }
            resetForm();
            loadProductsTable();
        } catch (err) {
            errorEl.innerText = err.message || 'Something went wrong.';
        }
    });

    document.getElementById('cancelEditBtn').addEventListener('click', resetForm);

    document.getElementById('productsTableBody').addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
            const product = currentProducts.find(p => p._id === editBtn.dataset.id);
            if (product) fillFormForEdit(product);
        }

        if (deleteBtn) {
            const product = currentProducts.find(p => p._id === deleteBtn.dataset.id);
            if (!product) return;
            const confirmed = confirm(`Delete "${product.title}"? This can't be undone.`);
            if (!confirmed) return;
            try {
                await api.deleteProduct(deleteBtn.dataset.id);
                loadProductsTable();
            } catch (err) {
                alert('Failed to delete: ' + err.message);
            }
        }
    });

    document.getElementById('adminLogoutBtn').addEventListener('click', () => {
        localStorage.removeItem('sunbook_token');
        localStorage.removeItem('sunbook_username');
        localStorage.removeItem('sunbook_user_id');
        window.location.href = 'index.html';
    });

    document.getElementById('exportOrdersBtn').addEventListener('click', async (e) => {
        const btn = e.target;
        const originalText = btn.innerText;
        btn.innerText = 'Preparing...';
        btn.disabled = true;
        try {
            const { data: orders } = await api.getOrders();
            if (!orders.length) {
                alert('No orders to export yet.');
            } else {
                downloadOrdersCSV(orders);
            }
        } catch (err) {
            alert('Failed to export orders: ' + err.message);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });
}

document.addEventListener('DOMContentLoaded', checkAdminAccess);

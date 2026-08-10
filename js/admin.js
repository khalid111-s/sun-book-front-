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

// ---------- 4. الأحداث ----------
function initAdminPanel() {
    loadProductsTable();

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
}

document.addEventListener('DOMContentLoaded', checkAdminAccess);

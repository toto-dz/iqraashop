// ==========================================
// Admin UI Controllers
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

let lastKnownNewOrders = 0;
let ordersAlertTimer = null;

function initApp() {
    // Event Listeners
    document.querySelector('.menu-toggle')?.addEventListener('click', toggleSidebar);
    document.querySelector('.theme-toggle:not(#orderAlertsBtn)')?.addEventListener('click', toggleTheme);
    document.getElementById('orderAlertsBtn')?.addEventListener('click', async () => {
        await renderOrdersTable(true);
        switchView('ordersView');
    });
    document.getElementById('globalSearchInput')?.addEventListener('input', handleGlobalSearch);
    
    // Sidebar Navigation
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', (e) => {
            const viewId = e.currentTarget.getAttribute('data-view');
            switchView(viewId);
        });
    });

    // Close Modals
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    // Load Settings in Navbar
    const adminInfoSpan = document.querySelector('.admin-info span');
    if (adminInfoSpan) adminInfoSpan.textContent = 'مدير المتجر';
    
    // Setup Theme
    if (localStorage.getItem('admin_theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        const themeIcon = document.querySelector('.theme-toggle:not(#orderAlertsBtn) i');
        if (themeIcon) themeIcon.className = 'fas fa-sun';
    }

    // Form Submits
    const productForm = document.getElementById('productForm');
    if (productForm) productForm.addEventListener('submit', handleProductSubmit);
    
    const serviceForm = document.getElementById('serviceForm');
    if (serviceForm) serviceForm.addEventListener('submit', handleServiceSubmit);
    
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) categoryForm.addEventListener('submit', handleCategorySubmit);
    
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) settingsForm.addEventListener('submit', handleSettingsSubmit);

    // Initialize View
    switchView('dashboardView');
    startOrdersAlertPolling();
}

function toggleSidebar() {
    document.querySelector('.sidebar')?.classList.toggle('active');
}

function toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('admin_theme', 'light');
        const themeIcon = document.querySelector('.theme-toggle:not(#orderAlertsBtn) i');
        if (themeIcon) themeIcon.className = 'fas fa-moon';
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('admin_theme', 'dark');
        const themeIcon = document.querySelector('.theme-toggle:not(#orderAlertsBtn) i');
        if (themeIcon) themeIcon.className = 'fas fa-sun';
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

function handleGlobalSearch(e) {
    const query = String(e.target?.value || '').trim().toLowerCase();
    const activeView = document.querySelector('.view-section.active');
    if (!activeView) return;

    const rows = activeView.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = !query || text.includes(query) ? '' : 'none';
    });
}

function setNewOrdersCounter(count) {
    const counter = document.getElementById('newOrdersCounter');
    if (!counter) return;
    if (count > 0) {
        counter.style.display = 'inline-block';
        counter.textContent = String(count);
    } else {
        counter.style.display = 'none';
        counter.textContent = '0';
    }
}

async function refreshNewOrdersCounter() {
    try {
        const orders = await fetchOrders(true);
        const newOrders = orders.filter(o => o.status === 'pending').length;
        if (newOrders > lastKnownNewOrders && lastKnownNewOrders > 0) {
            alert('يوجد طلب جديد في النظام');
        }
        lastKnownNewOrders = newOrders;
        setNewOrdersCounter(newOrders);
    } catch (error) {
        console.error('Failed to refresh new orders counter', error);
    }
}

function startOrdersAlertPolling() {
    clearInterval(ordersAlertTimer);
    refreshNewOrdersCounter();
    ordersAlertTimer = setInterval(refreshNewOrdersCounter, 60000);
}

async function switchView(viewId) {
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (activeNav) activeNav.classList.add('active');

    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const activeView = document.getElementById(viewId);
    if (activeView) activeView.classList.add('active');

    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar')?.classList.remove('active');
    }

    try {
        if (viewId === 'dashboardView') await loadDashboardStats();
        if (viewId === 'productsView') await renderProductsTable();
        if (viewId === 'ordersView') await renderOrdersTable();
        if (viewId === 'servicesView') await renderServicesTable();
        if (viewId === 'categoriesView') await renderCategoriesTable();
        if (viewId === 'customersView') await renderCustomersTable();
        if (viewId === 'viewsView') await renderViewsTable();
        if (viewId === 'settingsView') loadSettingsForm();
    } catch (error) {
        alert(error.message);
    }
}

function previewImage(inputId, previewId) {
    const inputElement = document.getElementById(inputId);
    if (!inputElement) return;
    const url = inputElement.value;
    const previewContainer = document.getElementById(previewId);
    if (!previewContainer) return;
    if (url) {
        previewContainer.innerHTML = `<img src="${url}" style="max-width:100%;max-height:150px;border-radius:8px;border:1px solid var(--border-color);">`;
    } else {
        previewContainer.innerHTML = '';
    }
}

function addAdditionalImageInput(url = '') {
    const container = document.getElementById('additionalImagesContainer');
    if (!container) return;
    
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.gap = '10px';
    wrap.style.marginBottom = '10px';
    wrap.style.alignItems = 'flex-start';

    const inputId = 'addImg_' + Math.random().toString(36).substr(2, 9);
    const previewId = 'prev_' + inputId;

    wrap.innerHTML = `
        <div style="flex:1;">
            <input type="url" id="${inputId}" class="form-control" placeholder="رابط صورة إضافية" value="${escapeHTML(url)}" oninput="previewImage('${inputId}', '${previewId}')">
            <div class="uploaded-img-container" style="margin-top:5px;"><div id="${previewId}"></div></div>
        </div>
        <button type="button" class="action-btn delete" onclick="this.parentElement.remove()" style="margin-top: 5px;"><i class="fas fa-trash"></i></button>
    `;
    container.appendChild(wrap);

    if (url) {
        previewImage(inputId, previewId);
    }
}

function getAdditionalImagesStr() {
    const container = document.getElementById('additionalImagesContainer');
    if (!container) return '';
    const inputs = container.querySelectorAll('input[type="url"]');
    const urls = [];
    inputs.forEach(input => {
        if (input.value.trim()) urls.push(input.value.trim());
    });
    return urls.join('|');
}

// ==========================================
// Dashboard
// ==========================================

async function loadDashboardStats() {
    try {
        const stats = await fetchDashboardStats();
        const statProducts = document.getElementById('statTotalProducts');
        const statOrders = document.getElementById('statTotalOrders');
        const statCustomers = document.getElementById('statTotalCustomers');
        const statRevenue = document.getElementById('statRevenue');
        const statTotalViews = document.getElementById('statTotalViews');
        
        if (statProducts) statProducts.textContent = stats.products || 0;
        if (statOrders) statOrders.textContent = stats.orders || 0;
        if (statCustomers) statCustomers.textContent = stats.customers || 0;
        if (statRevenue) statRevenue.textContent = (stats.revenue || 0).toLocaleString('ar-DZ') + ' ' + getSettings().currency;
        if (statTotalViews) statTotalViews.textContent = stats.totalViews || 0;

        const orders = await fetchOrders();
        renderRecentOrders(orders);
    } catch (e) {
        console.error(e);
    }
}

function renderRecentOrders(orders) {
    const tbody = document.querySelector('#recentOrdersTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const recent = [...orders].reverse().slice(0, 5);
    recent.forEach(order => {
        tbody.innerHTML += `
            <tr>
                <td>${escapeHTML(order.id)}</td>
                <td>${escapeHTML(order.customer)}</td>
                <td>${parseFloat(order.total).toLocaleString('ar-DZ')}</td>
                <td><span class="badge ${getStatusClass(order.status)}">${escapeHTML(getOrderStatusLabel(order.status))}</span></td>
                <td>${escapeHTML(order.date)}</td>
            </tr>
        `;
    });
}

function getStatusClass(status) {
    const key = normalizeOrderStatus(status);
    if (key === 'pending') return 'new';
    if (key === 'processing') return 'processing';
    if (key === 'delivered') return 'delivered';
    if (key === 'canceled') return 'cancelled';
    return '';
}

// ==========================================
// Products
// ==========================================

async function renderProductsTable(force = false) {
    const tbody = document.querySelector('#productsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">جاري تحميل المنتجات...</td></tr>';
    try {
        const products = await fetchRealProducts(force);
        tbody.innerHTML = products.map(p => `
            <tr>
                <td>
                    <div class="product-cell">
                        <img src="${escapeHTML(p.img)}" onerror="this.style.display='none'">
                        <span>${escapeHTML(p.name)}</span>
                    </div>
                 </td>
                <td>${escapeHTML(p.cat)}</td>
                <td>${parseFloat(p.price).toLocaleString('ar-DZ')} دج</td>
                <td>${parseInt(p.stock) > 0 ? p.stock : '<span style="color:var(--danger)">نفذ</span>'}</td>
                <td>
                    ${parseFloat(p.discount) > 0 ? `<span class="badge" style="background:var(--danger);color:#fff">-${p.discount}%</span>` : ''}
                    ${p.tag ? `<span class="badge new">${escapeHTML(p.tag)}</span>` : ''}
                 </td>
                <td>
                    <button class="action-btn edit" onclick="editProduct('${p.id}')"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="deleteProduct('${p.id}')"><i class="fas fa-trash"></i></button>
                 </td>
            </tr>
        `).join('') || '<tr><td colspan="6" style="text-align:center;">لا توجد منتجات</td></tr>';
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;">${err.message}</td></tr>`;
    }
}

async function openProductModal() {
    const form = document.getElementById('productForm');
    if (form) form.reset();
    
    document.getElementById('productId').value = '';
    document.getElementById('pDiscount').value = '0';
    const pWorks = document.getElementById('pWorks');
    if (pWorks) pWorks.checked = false;
    
    document.getElementById('productModalTitle').textContent = 'إضافة منتج جديد';
    document.getElementById('pImg').value = '';
    document.getElementById('pImgView').value = '';
    
    const additionalContainer = document.getElementById('additionalImagesContainer');
    if (additionalContainer) additionalContainer.innerHTML = '';
    
    previewImage('pImg', 'previewMainImg');
    previewImage('pImgView', 'previewViewImg');

    await loadCategoriesSelect();
    document.getElementById('productModal').classList.add('active');
}

async function loadCategoriesSelect(selectedVal = '') {
    const sel = document.getElementById('pCat');
    if (!sel) return;
    sel.innerHTML = '<option value="">جاري التحميل...</option>';
    try {
        const cats = await fetchCategories();
        sel.innerHTML = cats.map(c => {
            const val = c && (c.id ?? c.key ?? c.ID ?? c.Key);
            return `<option value="${escapeHTML(val)}">${escapeHTML(c.name)}</option>`;
        }).join('');
        if (selectedVal) sel.value = selectedVal;
    } catch (e) {
        sel.innerHTML = '<option value="">خطأ في تحميل الأقسام</option>';
    }
}

async function handleProductSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
    }

    const payload = {
        id: document.getElementById('productId').value || ('p' + Date.now()),
        name: document.getElementById('pName').value,
        price: document.getElementById('pPrice').value,
        cat: document.getElementById('pCat').value,
        discount: document.getElementById('pDiscount').value,
        tag: document.getElementById('pTag').value,
        img: document.getElementById('pImg').value,
        img_view: document.getElementById('pImgView').value,
        desc: document.getElementById('pDesc').value,
        works: document.getElementById('pWorks').checked ? 'TRUE' : 'FALSE',
        imgs: getAdditionalImagesStr(),
        stock: document.getElementById('pStock').value
    };

    try {
        const isNew = payload.id.startsWith('p') && document.getElementById('productId').value === '';
        await apiFetch(isNew ? 'addProduct' : 'updateProduct', payload);
        closeAllModals();
        renderProductsTable(true);
    } catch (error) {
        alert(error.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> حفظ المنتج';
        }
    }
}

// ==========================================
// ███████╗██████╗ ██╗████████╗
// ██╔════╝██╔══██╗██║╚══██╔══╝
// █████╗  ██║  ██║██║   ██║   
// ██╔══╝  ██║  ██║██║   ██║   
// ███████╗██████╔╝██║   ██║   
// ╚══════╝╚═════╝ ╚═╝   ╚═╝   
// ==========================================
// التصحيح الأساسي هنا ↓↓↓

function editProduct(id) {
    const products = getData('admin_products');
    const p = products.find(x => x.id === id);
    if (!p) return;

    // الترتيب الصحيح حسب المصفوفة:
    // id, name, price, cat, discount, tag, img, img_view, desc, works, imgs, stock
    
    document.getElementById('productId').value = p.id || '';
    document.getElementById('pName').value = p.name || '';
    document.getElementById('pPrice').value = p.price || '';      // ✅ صحيح
    document.getElementById('pCat').value = p.cat || '';          // ✅ صحيح
    document.getElementById('pDiscount').value = p.discount || '0'; // ✅ صحيح
    document.getElementById('pTag').value = p.tag || '';          // ✅ صحيح
    document.getElementById('pImg').value = p.img || '';          // ✅ صحيح
    document.getElementById('pImgView').value = p.img_view || ''; // ✅ صحيح
    document.getElementById('pDesc').value = p.desc || '';        // ✅ صحيح
    
    const pWorks = document.getElementById('pWorks');
    if (pWorks) pWorks.checked = (p.works === 'TRUE' || p.works === true);
    
    document.getElementById('pStock').value = p.stock || '0';     // ✅ صحيح

    // معاينة الصور
    previewImage('pImg', 'previewMainImg');
    previewImage('pImgView', 'previewViewImg');

    // تعيين الصور الإضافية
    const additionalContainer = document.getElementById('additionalImagesContainer');
    if (additionalContainer) {
        additionalContainer.innerHTML = '';
        if (p.imgs) {
            p.imgs.split('|').filter(Boolean).forEach(url => {
                addAdditionalImageInput(url);
            });
        }
    }

    // تحميل التصنيفات واختيار التصنيف الصحيح
    loadCategoriesSelect(p.cat);

    document.getElementById('productModalTitle').textContent = 'تعديل المنتج';
    document.getElementById('productModal').classList.add('active');
}

// ==========================================

async function deleteProduct(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج نهائياً؟')) return;
    try {
        await apiFetch('deleteProduct', { id });
        renderProductsTable(true);
    } catch (e) {
        alert(e.message);
    }
}

// ==========================================
// Orders
// ==========================================

async function renderOrdersTable(force = false) {
    const tbody = document.querySelector('#ordersTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">جاري تحميل الطلبات...</td></tr>';
    try {
        const orders = await fetchOrders(force);
        tbody.innerHTML = orders.map(o => `
            <tr>
                <td>${escapeHTML(o.id)}</td>
                <td>${escapeHTML(o.customer)}</td>
                <td>${escapeHTML(o.phone)}</td>
                <td>${parseFloat(o.total).toLocaleString('ar-DZ')} دج</td>
                <td>
                    <select class="form-control" style="padding:5px; width:auto;" onchange="updateOrderStatus('${escapeHTML(o.id)}', this.value)">
                        ${ORDER_STATUSES.map(status => `<option value="${status}" ${o.status === status ? 'selected' : ''}>${escapeHTML(ORDER_STATUS_LABELS_AR[status])}</option>`).join('')}
                    </select>
                 </td>
                <td>${escapeHTML(o.date)}</td>
                <td>
                    <button class="action-btn edit" onclick="alert('تفاصيل الطلب: \\n${escapeHTML(o.products)}')"><i class="fas fa-eye"></i></button>
                 </td>
            </tr>
        `).reverse().join('') || '<tr><td colspan="7" style="text-align:center;">لا توجد طلبات</td></tr>';
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;">${err.message}</td></tr>`;
    }
}

async function updateOrderStatus(id, status) {
    const normalizedStatus = normalizeOrderStatus(status);
    try {
        await apiFetch('updateOrderStatus', { id, status: normalizedStatus });
        const cache = JSON.parse(localStorage.getItem('admin_orders') || '[]');
        const idx = cache.findIndex(o => o.id === id);
        if (idx > -1) cache[idx].status = normalizedStatus;
        localStorage.setItem('admin_orders', JSON.stringify(cache));
        localStorage.removeItem('admin_orders_meta');
        await renderOrdersTable(true);
        await refreshNewOrdersCounter();
    } catch (e) {
        alert(e.message);
        await renderOrdersTable(true);
    }
}

// ==========================================
// Services
// ==========================================

async function renderServicesTable(force = false) {
    const tbody = document.querySelector('#servicesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">جاري التحميل...</td></tr>';
    try {
        const items = await fetchServices(force);
        tbody.innerHTML = items.map(s => `
            <tr>
                <td>
                    <div class="product-cell">
                        ${s.image ? `<img src="${escapeHTML(s.image)}">` : `<i class="${escapeHTML(s.icon)}"></i>`}
                        <span>${escapeHTML(s.title)}</span>
                    </div>
                 </td>
                <td>${escapeHTML(s.description)}</td>
                <td>${escapeHTML(s.sort_order)}</td>
                <td>${s.active === 'TRUE' || s.active === true ? '<span class="badge delivered">مفعل</span>' : '<span class="badge cancelled">معطل</span>'}</td>
                <td>
                    <button class="action-btn edit" onclick="editService('${s.id}')"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="deleteService('${s.id}')"><i class="fas fa-trash"></i></button>
                 </td>
            </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center;">لا توجد خدمات</td></tr>';
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;">${err.message}</td></tr>`;
    }
}

function openServiceModal() {
    const form = document.getElementById('serviceForm');
    if (form) form.reset();
    document.getElementById('serviceId').value = '';
    document.getElementById('srvImage').value = '';
    previewImage('srvImage', 'previewServiceImg');
    document.getElementById('serviceModalTitle').textContent = 'إضافة خدمة';
    document.getElementById('serviceModal').classList.add('active');
}

async function handleServiceSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    const payload = {
        id: document.getElementById('serviceId').value || ('srv' + Date.now()),
        title: document.getElementById('srvTitle').value,
        description: document.getElementById('srvDesc').value,
        image: document.getElementById('srvImage').value,
        icon: document.getElementById('srvIcon').value,
        sort_order: document.getElementById('srvSort').value,
        active: document.getElementById('srvActive').checked ? 'TRUE' : 'FALSE'
    };

    try {
        const isUpdate = document.getElementById('serviceId').value;
        await apiFetch(isUpdate ? 'updateService' : 'addService', payload);
        closeAllModals();
        renderServicesTable(true);
    } catch (error) {
        alert(error.message);
    } finally {
        if (btn) btn.disabled = false;
    }
}

function editService(id) {
    const items = getData('admin_services');
    const s = items.find(x => x.id === id);
    if (!s) return;

    document.getElementById('serviceId').value = s.id;
    document.getElementById('srvTitle').value = s.title;
    document.getElementById('srvDesc').value = s.description;
    document.getElementById('srvIcon').value = s.icon;
    document.getElementById('srvSort').value = s.sort_order;
    document.getElementById('srvActive').checked = s.active === 'TRUE' || s.active === true;
    document.getElementById('srvImage').value = s.image || '';
    previewImage('srvImage', 'previewServiceImg');

    document.getElementById('serviceModalTitle').textContent = 'تعديل الخدمة';
    document.getElementById('serviceModal').classList.add('active');
}

async function deleteService(id) {
    if (!confirm('حذف هذه الخدمة؟')) return;
    try {
        await apiFetch('deleteService', { id });
        renderServicesTable(true);
    } catch (e) { alert(e.message); }
}

// ==========================================
// Categories
// ==========================================

async function renderCategoriesTable(force = false) {
    const tbody = document.querySelector('#categoriesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">جاري التحميل...</td></tr>';
    try {
        const items = await fetchCategories(force);
        tbody.innerHTML = items.map(c => `
            <tr>
                <td>${escapeHTML(c.id ?? c.key)}</td>
                <td>${escapeHTML(c.name)}</td>
                <td>
                    <button class="action-btn edit" onclick="editCategory('${c.id ?? c.key}')"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="deleteCategory('${c.id ?? c.key}')"><i class="fas fa-trash"></i></button>
                 </td>
            </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center;">لا توجد تصنيفات</td></tr>';
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;">${err.message}</td></tr>`;
    }
}

function openCategoryModal() {
    const form = document.getElementById('categoryForm');
    if (form) form.reset();
    document.getElementById('categoryId').value = '';
    document.getElementById('categoryModalTitle').textContent = 'إضافة تصنيف';
    document.getElementById('categoryModal').classList.add('active');
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    const idVal = document.getElementById('categoryId').value || document.getElementById('catKey')?.value;
    const payload = {
        id: idVal,
        name: document.getElementById('catName').value
    };

    try {
        const isUpdate = document.getElementById('categoryId').value;
        await apiFetch(isUpdate ? 'updateCategory' : 'addCategory', payload);
        closeAllModals();
        renderCategoriesTable(true);
    } catch (error) {
        alert(error.message);
    } finally {
        if (btn) btn.disabled = false;
    }
}

function editCategory(id) {
    const items = getData('admin_categories');
    const c = items.find(x => x.id === id || x.key === id);
    if (!c) return;

    document.getElementById('categoryId').value = c.id ?? c.key;
    const catKey = document.getElementById('catKey');
    if (catKey) catKey.value = c.id ?? c.key;
    document.getElementById('catName').value = c.name;

    document.getElementById('categoryModalTitle').textContent = 'تعديل التصنيف';
    document.getElementById('categoryModal').classList.add('active');
}

async function deleteCategory(id) {
    if (!confirm('حذف هذا التصنيف؟')) return;
    try {
        await apiFetch('deleteCategory', { id });
        renderCategoriesTable(true);
    } catch (e) { alert(e.message); }
}

// ==========================================
// Customers & Views
// ==========================================

async function renderCustomersTable() {
    const tbody = document.querySelector('#customersTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">جاري التحميل...</td></tr>';
    try {
        const orders = await fetchOrders();
        const customersMap = {};
        orders.forEach(o => {
            if (!customersMap[o.phone]) {
                customersMap[o.phone] = { name: o.customer, phone: o.phone, count: 0, total: 0 };
            }
            customersMap[o.phone].count += 1;
            customersMap[o.phone].total += parseFloat(o.total) || 0;
        });

        const customersList = Object.values(customersMap).sort((a,b) => b.total - a.total);
        tbody.innerHTML = customersList.map(c => `
            <tr>
                <td>${escapeHTML(c.name)}</td>
                <td>${escapeHTML(c.phone)}</td>
                <td>${c.count}</td>
                <td>${c.total.toLocaleString('ar-DZ')} دج</td>
            </tr>
        `).join('') || '<tr><td colspan="4" style="text-align:center;">لا يوجد عملاء</td></tr>';
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:red;">${err.message}</td></tr>`;
    }
}

async function renderViewsTable(force = false) {
    const tbody = document.querySelector('#viewsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">جاري تحميل إحصائيات المشاهدات...</td></tr>';
    try {
        const views = await fetchViews(force);
        const normalized = views.map(v => ({
            id: v['Product ID'] || v['product_id'] || v['productId'] || v['id'] || '',
            name: v['Product Name'] || v['productName'] || v['name'] || v['product_name'] || 'منتج غير معروف',
            viewsCount: parseInt(v['Views'] || v['views'] || v['viewCount'] || 0, 10),
            rating: v['Rating'] || v['rating'] || '0',
            count: v['Rating Count'] || v['ratingCount'] || v['reviews'] || '0'
        }));

        const sortedViews = normalized.sort((a, b) => b.viewsCount - a.viewsCount);

        tbody.innerHTML = sortedViews.map(v => `
            <tr>
                <td>${escapeHTML(v.id)}</td>
                <td>${escapeHTML(v.name)}</td>
                <td><span class="badge new" style="font-size:14px;"><i class="fas fa-eye"></i> ${v.viewsCount.toLocaleString('ar-DZ')}</span></td>
                <td><span style="color:var(--secondary)">★ ${escapeHTML(v.rating)}</span></td>
                <td>${escapeHTML(String(v.count))}</td>
            </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center;">لا توجد مشاهدات</td></tr>';
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;">${err.message}</td></tr>`;
    }
}

// ==========================================
// Settings
// ==========================================

function loadSettingsForm() {
    const s = getSettings();
    const sName = document.getElementById('sName');
    const sCurrency = document.getElementById('sCurrency');
    const sPhone = document.getElementById('sPhone');
    const sWhatsapp = document.getElementById('sWhatsapp');
    const sAddress = document.getElementById('sAddress');
    const sGasUrl = document.getElementById('sGasUrl');
    
    if (sName) sName.value = s.storeName || '';
    if (sCurrency) sCurrency.value = s.currency || 'دج';
    if (sPhone) sPhone.value = s.phone || '';
    if (sWhatsapp) sWhatsapp.value = s.whatsapp || '';
    if (sAddress) sAddress.value = s.address || '';
    if (sGasUrl) sGasUrl.value = s.gasApiUrl || '';
}

async function handleSettingsSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    const newSettings = {
        storeName: document.getElementById('sName')?.value || '',
        currency: document.getElementById('sCurrency')?.value || 'دج',
        phone: document.getElementById('sPhone')?.value || '',
        whatsapp: document.getElementById('sWhatsapp')?.value || '',
        address: document.getElementById('sAddress')?.value || '',
        gasApiUrl: document.getElementById('sGasUrl')?.value || '',
    };

    saveSettings(newSettings);
    
    if (newSettings.gasApiUrl) {
        try {
            await apiFetch('updateSettings', newSettings);
            alert('تم حفظ الإعدادات في الجهاز وفي قاعدة البيانات.');
        } catch (error) {
            alert('تم حفظ الإعدادات في الجهاز فقط. ' + error.message);
        }
    } else {
        alert('تم حفظ الإعدادات محلياً.');
    }

    if (btn) btn.disabled = false;
}
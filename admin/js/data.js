// ==========================================
// Centralized API and Data Management
// ==========================================

const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes
const ORDER_STATUSES = ['pending', 'processing', 'delivered', 'canceled'];
const ORDER_STATUS_LABELS_AR = {
    pending: 'جديد',
    processing: 'قيد المعالجة',
    delivered: 'تم التوصيل',
    canceled: 'ملغى'
};
const ALLOWED_API_ACTIONS = new Set([
    'addProduct', 'updateProduct', 'deleteProduct',
    'newOrder', 'updateOrderStatus',
    'addService', 'updateService', 'deleteService',
    'addCategory', 'updateCategory', 'deleteCategory',
    'updateReview', 'deleteReview',
    'recordView', 'incrementView',
    'contactMessage', 'updateSettings'
]);

// CSV URLs for fast reading (bypassing Apps Script quotas)
const CSV_URLS = {
    products: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTAa67zBZTQExpINm7B5qe0YGU5NhAEG0TaNiLwK1MT9TrYeZR3ofzonbMO7rGAEYCg4vtBwATKzRaL/pub?gid=0&single=true&output=csv",
    orders: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTAa67zBZTQExpINm7B5qe0YGU5NhAEG0TaNiLwK1MT9TrYeZR3ofzonbMO7rGAEYCg4vtBwATKzRaL/pub?gid=251389102&single=true&output=csv",
    services: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTAa67zBZTQExpINm7B5qe0YGU5NhAEG0TaNiLwK1MT9TrYeZR3ofzonbMO7rGAEYCg4vtBwATKzRaL/pub?gid=751163247&single=true&output=csv",
    views: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTAa67zBZTQExpINm7B5qe0YGU5NhAEG0TaNiLwK1MT9TrYeZR3ofzonbMO7rGAEYCg4vtBwATKzRaL/pub?gid=1862185571&single=true&output=csv",
    categories: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTAa67zBZTQExpINm7B5qe0YGU5NhAEG0TaNiLwK1MT9TrYeZR3ofzonbMO7rGAEYCg4vtBwATKzRaL/pub?gid=1946487932&single=true&output=csv"
};

function getSettings() {
    const stored = JSON.parse(localStorage.getItem('admin_settings')) || {};
    return {
        storeName: stored.storeName || 'إقرأ ماركت',
        phone: stored.phone || '',
        whatsapp: stored.whatsapp || '',
        address: stored.address || '',
        currency: stored.currency || 'دج',
        gasApiUrl: stored.gasApiUrl || ''
    };
}

function saveSettings(settings) {
    localStorage.setItem('admin_settings', JSON.stringify(settings));
}

function getApiUrl() {
    return getSettings().gasApiUrl || '';
}

// Universal API Fetcher (For POST / Writes)
async function apiFetch(action, payload = {}) {
    const apiUrl = getApiUrl();
    if (!apiUrl) {
        throw new Error("لم يتم إعداد رابط Google Apps Script في الإعدادات.");
    }

    if (!ALLOWED_API_ACTIONS.has(action)) {
        throw new Error(`إجراء API غير مسموح: ${action}`);
    }

    const params = new URLSearchParams();
    params.append('action', action);
    for (let key in payload) {
        params.append(key, payload[key]);
    }

    try {
        const response = await fetch(apiUrl, { method: 'POST', body: params });
        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'حدث خطأ غير معروف');
        return result;
    } catch (error) {
        console.error(`[API Error] ${action}:`, error);
        throw error;
    }
}

// Universal GET Fetcher (Fallback for sheets without CSV URLs)
async function apiGet(action) {
    const apiUrl = getApiUrl();
    if (!apiUrl) throw new Error("لم يتم إعداد رابط Google Apps Script في الإعدادات.");
    try {
        const response = await fetch(`${apiUrl}?action=${action}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'حدث خطأ في الجلب');
        return result.data;
    } catch (error) {
        console.error(`[API Error] GET ${action}:`, error);
        throw error;
    }
}

// --- CSV Fetching Logic (Fast Reads) ---

async function fetchCsvData(sheetName) {
    const url = CSV_URLS[sheetName];
    if (!url) return null; // No CSV URL, fallback to API
    
    const sources = [url, "https://api.allorigins.win/raw?url=" + encodeURIComponent(url)];
    const freshSources = buildFreshSourceList(sources);
    
    for (let i = 0; i < freshSources.length; i++) {
        try {
            const csvText = await fetchText(freshSources[i], 5000);
            const parsed = parseGenericCSV(csvText);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (error) {
            console.warn(`[CSV] Failed to fetch ${sheetName} from source ${i}`);
        }
    }
    throw new Error(`تعذر جلب بيانات ${sheetName} من روابط CSV`);
}

function buildFreshSourceList(sources) {
    const freshSources = [];
    sources.forEach(source => {
        const url = String(source || '').trim();
        if (!url) return;
        const freshUrl = url + (url.includes('?') ? '&' : '?') + '_=' + Date.now();
        freshSources.push(freshUrl);
    });
    return freshSources;
}

async function fetchText(url, timeoutMs) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
        const response = await fetch(url, { cache: "no-store", signal: controller ? controller.signal : undefined });
        if (!response.ok) throw new Error("HTTP " + response.status);
        return await response.text();
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

function parseGenericCSV(csv) {
    csv = String(csv || '').replace(/^\uFEFF/, '');
    const lines = csv.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = parseCSVLine(lines[0]).map(h => String(h || '').trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = cols[j] || '';
        }
        data.push(obj);
    }
    return data;
}

function parseCSVLine(text) {
    let result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
            if (inQuotes && text[i+1] === '"') { cur += '"'; i++; }
            else { inQuotes = !inQuotes; }
        } else if (c === ',' && !inQuotes) {
            result.push(cur); cur = '';
        } else {
            cur += c;
        }
    }
    result.push(cur);
    return result;
}

function normalizeKey(key) {
    return String(key || '').trim().toLowerCase().replace(/\s+/g, '');
}

function getValueByKeys(obj, keys) {
    if (!obj || typeof obj !== 'object') return '';
    for (const key of keys) {
        if (obj[key] != null && String(obj[key]).trim() !== '') {
            return obj[key];
        }
    }

    const normalized = Object.keys(obj).reduce((acc, k) => {
        acc[normalizeKey(k)] = obj[k];
        return acc;
    }, {});

    for (const key of keys) {
        const normalizedKey = normalizeKey(key);
        if (normalized[normalizedKey] != null && String(normalized[normalizedKey]).trim() !== '') {
            return normalized[normalizedKey];
        }
    }

    return '';
}

function parseNumericValue(value) {
    const raw = String(value || '').trim();
    if (!raw) return 0;
    let cleaned = raw.replace(/\s+/g, '');
    cleaned = cleaned.replace(/[^0-9,\.\-]/g, '');
    if (cleaned.includes('.') && cleaned.includes(',')) {
        if (cleaned.indexOf('.') < cleaned.indexOf(',')) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else {
            cleaned = cleaned.replace(/,/g, '');
        }
    } else {
        cleaned = cleaned.replace(/,/g, '.');
    }
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeOrderStatus(status) {
    const text = String(status || '').trim().toLowerCase();
    const map = {
        'new': 'pending',
        'جديد': 'pending',
        'pending': 'pending',
        'قيد الانتظار': 'pending',
        'processing': 'processing',
        'in progress': 'processing',
        'in_progress': 'processing',
        'قيد المعالجة': 'processing',
        'delivered': 'delivered',
        'completed': 'delivered',
        'done': 'delivered',
        'تم التوصيل': 'delivered',
        'cancelled': 'canceled',
        'canceled': 'canceled',
        'ملغى': 'canceled',
        'ملغي': 'canceled'
    };
    const normalized = map[text];
    return ORDER_STATUSES.includes(normalized) ? normalized : 'pending';
}

function getOrderStatusLabel(status) {
    const key = normalizeOrderStatus(status);
    return ORDER_STATUS_LABELS_AR[key] || ORDER_STATUS_LABELS_AR.pending;
}

function normalizeProductsText(value) {
    const text = String(value || '').replace(/\r/g, '').trim();
    if (!text) return '';
    return text.split(/\r?\n/).map(item => String(item).trim()).filter(Boolean).join('\n');
}

function getTodayOrderPrefix() {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `ORD-${yyyy}${mm}${dd}-`;
}

function isValidOrderId(value) {
    return /^ORD-\d{8}-\d{3}$/i.test(String(value || '').trim());
}

function assignMissingOrderIds(orders) {
    const prefix = getTodayOrderPrefix();
    const pattern = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\d{3})$', 'i');
    let seq = 0;

    orders.forEach(order => {
        const match = String(order.id || '').trim().match(pattern);
        if (match) {
            seq = Math.max(seq, parseInt(match[1], 10) || 0);
        }
    });

    return orders.map(order => {
        const currentId = String(order.id || '').trim();
        if (isValidOrderId(currentId)) {
            return order;
        }
        seq += 1;
        return { ...order, id: prefix + String(seq).padStart(3, '0') };
    });
}

function isLikelyDateString(value) {
    const text = String(value || '').trim();
    return /\d{1,2}:\d{2}(?::\d{2})?\s*[صم]?\s*\d{4}\/\d{2}\/\d{2}|^\d{4}\/\d{2}\/\d{2}/.test(text);
}

function isLikelyPhoneString(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return /^(?:212|213|0)?[567]\d{8}$/.test(digits) || /^(?:\+213)?[567]\d{8}$/.test(value);
}

function repairShiftedOrderRow(raw) {
    if (!raw || typeof raw !== 'object') return raw;

    const normalized = Object.keys(raw).reduce((acc, key) => {
        acc[normalizeKey(key)] = raw[key];
        return acc;
    }, {});

    const id = String(normalized.id || '').trim();
    const customer = String(normalized.customer || '').trim();

    if (id && isLikelyDateString(id) && customer && isLikelyPhoneString(normalized.phone || normalized.mobile || normalized.customer)) {
        return {
            ...raw,
            id: '',
            date: getValueByKeys(raw, ['id', 'date', 'التاريخ']) || raw.id,
            customer: getValueByKeys(raw, ['date', 'customer', 'name', 'الاسم', 'العميل']) || raw.date,
            phone: getValueByKeys(raw, ['customer', 'phone', 'mobile', 'الهاتف', 'رقم الهاتف']) || raw.customer,
            state: getValueByKeys(raw, ['phone', 'state', 'address', 'الولاية']) || raw.phone,
            city: getValueByKeys(raw, ['state', 'city', 'البلدية']) || raw.state,
            products: getValueByKeys(raw, ['city', 'products', 'items', 'المنتجات']) || raw.city,
            total: getValueByKeys(raw, ['products', 'total', 'المجموع', 'المجموع الكلي']) || raw.products,
            status: getValueByKeys(raw, ['total', 'status', 'الحالة']) || raw.total
        };
    }

    return raw;
}

// --- Specific Data Fetchers with Caching ---

async function fetchWithCache(cacheKey, fetchFunction, force = false) {
    const cached = localStorage.getItem(cacheKey);
    const meta = localStorage.getItem(`${cacheKey}_meta`);
    
    if (!force && cached && meta) {
        const parsedMeta = JSON.parse(meta);
        if (Date.now() - parsedMeta.savedAt < CACHE_MAX_AGE) {
            return JSON.parse(cached);
        }
    }

    try {
        const data = await fetchFunction();
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(`${cacheKey}_meta`, JSON.stringify({ savedAt: Date.now() }));
        return data;
    } catch (err) {
        if (cached) return JSON.parse(cached);
        return [];
    }
}

// Data Getters
async function fetchRealProducts(force = false) {
    return await fetchWithCache('admin_products', async () => {
        try {
            const csv = await fetchCsvData('products');
            if (Array.isArray(csv) && csv.length >= 0) return csv;
        } catch (_) { /* fallback to API */ }
        return await apiGet('getProducts');
    }, force);
}

async function fetchOrders(force = false) {
    const raw = await fetchWithCache('admin_orders', async () => {
        try {
            const csv = await fetchCsvData('orders');
            if (Array.isArray(csv)) return csv;
        } catch (_) { /* fallback to API */ }
        return await apiGet('getOrders');
    }, force);

    const normalizeOrder = (o) => {
        const repaired = repairShiftedOrderRow(o);
        const totalRaw = getValueByKeys(repaired, ['total', 'grandTotal', 'amount', 'المجموع', 'المجموع الكلي', 'order_total', 'order total']);
        const totalValue = parseNumericValue(totalRaw);
        const rawStatus = getValueByKeys(repaired, ['status', 'الحالة', 'order_status', 'order status']);
        const rawProducts = getValueByKeys(repaired, ['products', 'items', 'order_items', 'order items', 'المنتجات']);

        return {
            id: getValueByKeys(repaired, ['id', 'ID', 'رقم الطلب', 'order_id', 'order id', 'Order ID', 'Order']) || '',
            customer: getValueByKeys(repaired, ['customer', 'name', 'العميل', 'الاسم']) || '',
            phone: getValueByKeys(repaired, ['phone', 'mobile', 'رقم الهاتف', 'الهاتف']) || '',
            state: getValueByKeys(repaired, ['state', 'address', 'الولاية']) || '',
            city: getValueByKeys(repaired, ['city', 'البلدية']) || '',
            total: totalValue || 0,
            status: normalizeOrderStatus(rawStatus),
            date: getValueByKeys(repaired, ['date', 'التاريخ', 'order_date', 'order date']) || '',
            products: normalizeProductsText(rawProducts),
            grandTotal: totalRaw || ''
        };
    };

    const normalizedOrders = raw.map(normalizeOrder).map(o => ({
        ...o,
        total: o.total || parseNumericValue(o.grandTotal || '0') || 0
    })).filter(o => {
        const customer = String(o.customer).trim();
        const phone = String(o.phone).trim();
        const products = String(o.products).trim();
        const total = parseFloat(o.total);
        return customer && phone && products && !isNaN(total) && total > 0;
    });

    return assignMissingOrderIds(normalizedOrders);
}

async function fetchServices(force = false) {
    return await fetchWithCache('admin_services', async () => {
        try {
            const csv = await fetchCsvData('services');
            if (Array.isArray(csv)) return csv;
        } catch (_) { /* fallback to API */ }
        return await apiGet('getServices');
    }, force);
}

async function fetchViews(force = false) {
    return await fetchWithCache('admin_views', async () => {
        try {
            const csv = await fetchCsvData('views');
            if (Array.isArray(csv)) return csv;
        } catch (_) { /* fallback to API */ }
        return await apiGet('getViews');
    }, force);
}

async function fetchCategories(force = false) {
    return await fetchWithCache('admin_categories', async () => {
        try {
            const csv = await fetchCsvData('categories');
            if (Array.isArray(csv)) return csv;
        } catch (_) { /* fallback to API */ }
        return await apiGet('getCategories');
    }, force);
}

async function fetchReviews(force = false) {
    return await fetchWithCache('admin_reviews', () => apiGet('getReviews'), force);
}

async function fetchDashboardStats() {
    // If we have CSV access to everything needed for dashboard, we can calculate it locally to save API calls
    try {
        const products = await fetchRealProducts();
        const orders = await fetchOrders();
        const views = await fetchViews();
        
        const newOrders = orders.filter(o => o.status === 'pending').length;
        let revenue = 0;
        orders.filter(o => o.status === 'delivered').forEach(o => {
            revenue += parseFloat(o.total) || 0;
        });
        
        let totalViews = 0;
        views.forEach(v => {
            // Headers might be exported as `Views` or stored as `views` depending on CSV/API source.
            const raw = (v && typeof v === 'object')
                ? (v.views ?? v['views'] ?? v['Views'] ?? v['viewsCount'])
                : 0;
            totalViews += parseInt(raw, 10) || 0;
        });
        
        const customers = new Set(orders.map(o => o.customer)).size;
        
        return {
            products: products.length,
            orders: orders.length,
            newOrders,
            revenue,
            totalViews,
            customers
        };
    } catch (e) {
        // Fallback to API if CSV fails
        return await apiGet('getDashboardStats');
    }
}

// Utility functions for UI
function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str || '')));
    return div.innerHTML;
}

function getData(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
}

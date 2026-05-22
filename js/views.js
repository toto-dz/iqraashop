// js/views.js
function isMostViewed(product) {
    return !!product.isMostViewed || (parseInt(product.views, 10) || 0) >= 20;
}

function normalizeViewsPayload(payload) {
    if (!payload) return {};
    if (payload.views && typeof payload.views === 'object' && !Array.isArray(payload.views)) return payload.views;
    if (payload.data && typeof payload.data === 'object') return normalizeViewsPayload(payload.data);
    if (Array.isArray(payload)) {
        return payload.reduce((acc, row) => {
            const id = row.id || row.productId || row.product_id || row.ID;
            const views = row.views || row.viewCount || row.count || row.مشاهدات || row.الزيارات;
            if (id) acc[id] = parseInt(views, 10) || 0;
            return acc;
        }, {});
    }
    return {};
}

function applyProductViews(viewsMap) {
    /* ── IMPORTANT: ensure case-insensitive key lookup ─────────────────────────
       viewsMap / ratingsData keys are produced by normalizeSheetId() which
       lowercases IDs. Product IDs from parseCSV() are also lowercased, but
       using .toLowerCase() here provides a second safety net against any
       future code path that might introduce a non-lowercase ID. */
    if (!viewsMap || typeof viewsMap !== 'object') return;
    PRODS.forEach(product => {
        const data = viewsMap[String(product.id).toLowerCase()];
        console.log('Product ID:', product.id, '| Lowercase Key:', String(product.id).toLowerCase(), '| Data Found:', !!data, data);
        if (data) {
            const views = typeof data === 'object' ? parseInt(data.views, 10) : parseInt(data, 10);
            const ratingFromData = (typeof data === 'object' && data.rating != null) ? parseFloat(data.rating) : null;
            const ratingCountFromData = (typeof data === 'object' && data.ratingCount != null) ? parseInt(data.ratingCount, 10) : null;

            if (!Number.isNaN(views)) {
                product.views = views;
                product.rating = (ratingFromData !== null) ? ratingFromData : (product.rating != null ? parseFloat(product.rating) : ratingFromViews(views));
                product.ratingCount = (ratingCountFromData !== null) ? ratingCountFromData : (product.ratingCount || 0);
            } else {
                product.views = product.views || 0;
                product.rating = (ratingFromData !== null) ? ratingFromData : (product.rating != null ? parseFloat(product.rating) : null);
                product.ratingCount = (ratingCountFromData !== null) ? ratingCountFromData : 0;
            }
        }
    });
    markMostViewedProducts();
}

function markMostViewedProducts() {
    const sorted = [...PRODS]
        .filter(product => (parseInt(product.views, 10) || 0) > 0)
        .sort((a, b) => (b.views || 0) - (a.views || 0));
    const topIds = new Set(sorted.slice(0, 3).map(product => product.id));
    PRODS.forEach(product => {
        product.isMostViewed = topIds.has(product.id) && (parseInt(product.views, 10) || 0) >= 5;
    });
}

async function fetchProductViews() {
    try {

        console.log('[Views] Fetching product views...');

        const response = await fetch(
            GOOGLE_SHEETS_RATINGS_URL,
            { cache: "no-store" }
        );

        if (!response.ok) {
            throw new Error(
                "فشل جلب المشاهدات: " + response.status
            );
        }

        const text = await response.text();

        const ratingsData = parseRatingsCSV(text);

        console.log(
            '[Views] Ratings Loaded:',
            ratingsData
        );

        applyProductViews(ratingsData);

        // ✅ إعادة رسم الكروت بعد تحديث المشاهدات
        renderProds(PRODS);

        // ✅ إعادة رسم قسم الأعمال
        renderWorks();

        // ✅ تحديث المودال إن كان مفتوحاً
        if (currentProduct) {
            updateModalRating(currentProduct);
        }

        console.log(
            '[Views] Product views applied successfully'
        );

    } catch (error) {

        console.error(
            "Error fetching product views:",
            error
        );

    }
}

async function trackProductView(product) {
    if (!product || !product.id) return;
    const key = String(product.id);

    viewedProducts[key] = Date.now();
    localStorage.setItem('iqra_viewed_products', JSON.stringify(viewedProducts));

    product.views = (parseInt(product.views, 10) || 0) + 1;
    product.rating = ratingFromViews(product.views);
    markMostViewedProducts();
    updateModalRating(product);
    refreshCurrentProductLists();

    const formData = new FormData();
    formData.append('action', 'recordView');
    formData.append('productId', product.id);
    formData.append('productName', product.name || '');

    try {
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: formData });
        const text = await response.text();
        if (!text) return;
        const payload = JSON.parse(text);
        const views = payload.views || payload.viewCount || payload.count;
        if (views !== undefined) {
            product.views = parseInt(views, 10) || product.views;
            if (payload.rating !== undefined) {
                product.rating = parseFloat(payload.rating) || product.rating;
            } else {
                product.rating = ratingFromViews(product.views);
            }
            product.ratingCount = (payload.ratingCount !== undefined) ? parseInt(payload.ratingCount, 10) || 0 : (product.ratingCount || 0);
            markMostViewedProducts();
            updateModalRating(product);
            refreshCurrentProductLists();
        }
    } catch (error) {
        console.error("Error recording product view:", error);
    }
}

async function refreshRatingsPeriodically() {
    try {
        const response = await fetch(GOOGLE_SHEETS_RATINGS_URL, { cache: "no-store" });
        if (!response.ok) throw new Error("فشل جلب التقييمات");
        const text = await response.text();
        const ratingsData = parseRatingsCSV(text);
        
        if (PRODS.length > 0) {
            mergeRatingsData(PRODS, ratingsData);
            refreshCurrentProductLists();
        }
    } catch (error) {
        console.error("Error refreshing ratings:", error);
    }
}

setInterval(() => {
    if (PRODS.length > 0) {
        refreshRatingsPeriodically();
    }
}, 300000); // 5 minutes

/* ═══════════════════════════════════════════════════════════════════
   renderTrending – Most-Viewed page
   Rule: a product must have views > 0 to appear on this page.
   Products that have never been viewed are excluded entirely.      */
function renderTrending() {
    const grid = document.getElementById('trendingGrid');
    if (!grid) return;

    /* ── Step 1: only products with views > 0 ─────────────────────── */
    const withViews = PRODS
        .map(p => ({ ...p, _v: parseInt(p.views, 10) || 0 }))
        .filter(p => p._v > 0);

    /* ── Step 2: sort descending by view count ────────────────────── */
    withViews.sort((a, b) => b._v - a._v);

    /* ── Step 3: render or show empty state ───────────────────────── */
    if (withViews.length === 0) {
        grid.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted)">
            <i class="fas fa-eye-slash" style="font-size:48px;opacity:.3;display:block;margin-bottom:16px"></i>
            <p style="font-size:16px;font-weight:600">لا توجد منتجات تمت مشاهدتها بعد</p>
            <p style="font-size:14px;margin-top:8px">ستظهر المنتجات هنا عندما يبدأ الزوار بمشاهدتها.</p>
          </div>`;
        return;
    }

    const inc = cart; // reuse existing cart array look-up

    grid.innerHTML = withViews.map(p => {
        const inCart   = inc.find(x => x.id === p.id);
        const safeId   = String(p.id).replace(/[^a-zA-Z0-9]/g, '_');
        const rating   = getProductRating(p);       // may be null for some items
        const ratingV  = rating != null ? rating : 0;
        const views    = p._v;

        const fallback = fallbackImage(safeId || p.name);
        const stars    = views > 0 ? generateStars(ratingV) : '';

        return `<div class="p-card" onclick="openModal('${p.id}')">
          <div class="p-img">
            <img src="${escapeHTML(p.img || fallback)}" alt="${escapeHTML(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='${fallback}';">
          </div>
          <div class="p-body">
            <div class="p-name">${escapeHTML(p.name)}</div>
            <div class="p-rating" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding:4px;background:#fef9e6;border-radius:6px;border:1px solid #fde68a;">
              <div style="display:flex;gap:2px;font-size:11px;color:#b8860b;align-items:center;">
                <span style="font-weight:bold;margin-left:4px;">${ratingV.toFixed(1)}</span> ${stars}
                <span style="font-size:10px;color:#b8860b;opacity:.7">(${p.ratingCount || 0})</span>
              </div>
              <span style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:4px;"><i class="fas fa-eye"></i> ${views.toLocaleString('ar-DZ')}</span>
            </div>
            <div class="p-pr-row"><div class="p-price">${p.price.toLocaleString('ar-DZ')} دج</div></div>
            <div class="p-actions">
              <button class="btn-add ${inCart ? 'added' : ''}" id="tab${safeId}" onclick="event.stopPropagation(); addCart('${p.id}')">
                <i class="fas ${inCart ? 'fa-check' : 'fa-cart-plus'}"></i> ${inCart ? 'تمت الإضافة' : 'أضف'}
              </button>
              <button class="btn-det" onclick="event.stopPropagation(); openModal('${p.id}')" aria-label="تفاصيل">
                <i class="fas fa-info-circle"></i>
              </button>
            </div>
          </div>
        </div>`;
    }).join('');
}

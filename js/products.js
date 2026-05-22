// js/products.js
function getProductBadge(product) {
    if (isMostViewed(product)) return '<div class="p-tag hot">الأكثر مشاهدة</div>';
    if (product.tag) return `<div class="p-tag">${escapeHTML(product.tag)}</div>`;
    return '';
}

function renderProductSkeleton(gridId = 'prodGrid', count = 8) {
    const grid = document.getElementById(gridId);
    if (!grid) {
        console.warn(`Grid element with id "${gridId}" not found`);
        return;
    }
    console.log(`Rendering skeleton for ${gridId}`);
    grid.innerHTML = Array.from({ length: count }, () => `
        <div class="p-card skeleton-card" aria-hidden="true">
            <div class="skeleton-img skeleton-shimmer"></div>
            <div class="p-body skeleton-body">
                <div class="skeleton-line skeleton-title skeleton-shimmer"></div>
                <div class="skeleton-line skeleton-short skeleton-shimmer"></div>
                <div class="skeleton-line skeleton-price skeleton-shimmer"></div>
                <div class="skeleton-actions">
                    <div class="skeleton-btn skeleton-shimmer"></div>
                    <div class="skeleton-icon skeleton-shimmer"></div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderProds(list) {
    const grid = document.getElementById('prodGrid');
    if (!grid) {
        console.warn('prodGrid element not found');
        return;
    }
    
    console.log(`Rendering ${list.length} products`);
    
    if (!list || list.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)"><i class="fas fa-search" style="font-size:40px;opacity:.3;margin-bottom:10px;display:block"></i><p style="font-weight:700">لا توجد منتجات مطابقة</p></div>';
        return;
    }
    
    grid.innerHTML = list.map(p => {
        const inc = cart.find(x => x.id === p.id);
        const safeId = String(p.id).replace(/[^a-zA-Z0-9]/g, '_');
        const rating = getProductRating(p);
        const ratingForDisplay = rating != null ? rating : 0;
        const views = parseInt(p.views, 10) || 0;
        const fallback = fallbackImage(safeId || p.name);

        const ratingStars = views > 0 ? generateStars(ratingForDisplay) : '';
        const viewsText = views > 0 ? `<span style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:4px;"><i class="fas fa-eye"></i> ${views.toLocaleString('ar-DZ')}</span>` : '';

        /* ── discount ── */
        const hasDiscount = p.discount && p.discount > 0;
        const finalPrice  = hasDiscount ? Math.round(p.price * (1 - p.discount / 100)) : p.price;
        const discountBadge = hasDiscount
            ? `<span style="background:var(--red-bg);color:var(--red);font-size:12px;font-weight:800;padding:3px 10px;border-radius:20px">-${p.discount}%</span>`
            : '';
        const oldPriceSpan = hasDiscount
            ? `<span style="font-size:13px;color:var(--text-muted);text-decoration:line-through;margin-right:8px">${p.price.toLocaleString('ar-DZ')} دج</span>`
            : '';

        /* ── stock ── */
        const stockText = (p.stock != null && p.stock !== '' && p.stock > 0)
            ? `<span style="font-size:11px;color:var(--text-muted)"><i class="fas fa-box" style="color:var(--gold);margin-left:4px"></i>متبقي ${p.stock} فقط</span>`
            : '';
        
        return `<div class="p-card" onclick="openModal('${p.id}')">
            <div class="p-img">
                <img src="${escapeHTML(p.img || fallback)}" alt="${escapeHTML(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='${fallback}';">
                ${getProductBadge(p)}
            </div>
            <div class="p-body">
                <div class="p-name">${escapeHTML(p.name)}</div>
                <div class="p-rating" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding:4px;background:#fef9e6;border-radius:6px;border:1px solid #fde68a;">
                    <div style="display:flex;gap:2px;font-size:11px;color:#b8860b;align-items:center;">
                        <span style="font-weight:bold;margin-left:4px;">${ratingForDisplay.toFixed(1)}</span> ${ratingStars}
                    </div>
                    ${viewsText}
                </div>
                <div class="p-pr-row">
                    <div class="p-price">
                        ${discountBadge}
                        ${oldPriceSpan}
                        ${finalPrice.toLocaleString('ar-DZ')} دج
                    </div>
                </div>
                ${stockText ? `<div style="display:flex;justify-content:flex-end;margin-top:-4px;margin-bottom:8px">${stockText}</div>` : ''}
                <div class="p-actions">
                    <button class="btn-add ${inc ? 'added' : ''}" id="ab${safeId}" onclick="event.stopPropagation(); addCart('${p.id}')">
                        <i class="fas ${inc ? 'fa-check' : 'fa-cart-plus'}"></i> ${inc ? 'تمت الإضافة' : 'أضف'}
                    </button>
                    <button class="btn-det" onclick="event.stopPropagation(); openModal('${p.id}')" aria-label="تفاصيل">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function renderWorks() {
    const works = PRODS.filter(p => p.works);
    const grid = document.getElementById('worksGrid');
    if (!grid) return;
    if (works.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px">لا توجد أعمال حالياً</div>';
        return;
    }
    grid.innerHTML = works.map(p => `
        <div class="p-card" onclick="openModal('${p.id}')">
            <div class="p-img">
                <img src="${escapeHTML(p.img || fallbackImage(p.name || 'work'))}" alt="${escapeHTML(p.name || 'منتج')}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImage('work')}';">
            </div>
            <div class="p-body">
                <div class="p-name">${p.name || 'بدون اسم'}</div>
            </div>
        </div>
    `).join('');
}

function setCat(el, c) {
    cat = c;
    document.querySelectorAll('.cat-a').forEach(a => a.classList.remove('active'));
    if (el && el.classList) el.classList.add('active');
    showView('homeView');
    applyFilters();
    const prodSec = document.getElementById('prodSec');
    if (prodSec) window.scrollTo({ top: prodSec.offsetTop - 120, behavior: 'smooth' });
}

function applyFilters() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        if (PRODS.length === 0) return;
        const q = document.getElementById('srchInput')?.value.trim().toLowerCase() || '';
        let list = cat === 'all' ? PRODS : PRODS.filter(p => p.cat === cat);
        if (q) list = list.filter(p => p.name.toLowerCase().includes(q));
        renderProds(list);
    }, 300);
}

function refreshCurrentProductLists() {
    if (!PRODS.length) return;
    const q = document.getElementById('srchInput')?.value.trim().toLowerCase() || '';
    let list = cat === 'all' ? PRODS : PRODS.filter(p => p.cat === cat);
    if (q) list = list.filter(p => p.name.toLowerCase().includes(q));
    renderProds(list);
    renderWorks();
}
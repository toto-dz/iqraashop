// js/sheets.js
const DEFAULT_SERVICES = [
    { title: "الطباعة الحرارية", desc: "طباعة سريعة وواضحة على مختلف المواد لضمان مظهر احترافي.", icon: "fa-print", button: "اطلب الخدمة" },
    { title: "النقش بالليزر", desc: "نقش دقيق على الخشب، الزجاج والمعادن لمنتجات تبرز بفخامة.", icon: "fa-fire", button: "اطلب الخدمة" },
    { title: "تغليف الهدايا", desc: "تغليف أنيق وجذاب يجعل من هديتك تجربة لا تُنسى.", icon: "fa-gift", button: "اطلب الخدمة" },
    { title: "التكريمات", desc: "جوائز وشهادات أنيقة تُعد بأفضل خامات وجودة طباعة عالية.", icon: "fa-trophy", button: "اطلب الخدمة" },
    { title: "التصميم والطباعة", desc: "تصميم احترافي وطباعته على المنتجات والمطبوعات التجارية.", icon: "fa-pencil-ruler", button: "اطلب الخدمة" }
];

const DEFAULT_PRODUCTS = [
    { id: 'fallback_school', name: 'باقة أدوات مدرسية', price: 2450, cat: 'school', tag: 'متوفر', img: fallbackImage('school'), images: [fallbackImage('school')], desc: 'منتج تجريبي يظهر عند تعذر الاتصال بجدول المنتجات.', works: false, views: 0, rating: 4.6 },
    { id: 'fallback_gift', name: 'علبة هدية مخصصة', price: 3200, cat: 'gifts', tag: 'هدية', img: fallbackImage('gift'), images: [fallbackImage('gift')], desc: 'يمكن استبداله بمنتجك من Google Sheets عند عودة الاتصال.', works: true, views: 0, rating: 4.7 },
    { id: 'fallback_print', name: 'طباعة حرارية على كوب', price: 1400, cat: 'print', tag: 'خدمة', img: fallbackImage('print'), images: [fallbackImage('print')], desc: 'خدمة طباعة حرارية بجودة عالية.', works: true, views: 0, rating: 4.5 },
    { id: 'fallback_award', name: 'درع تكريم خشبي', price: 5800, cat: 'awards', tag: 'فاخر', img: fallbackImage('award'), images: [fallbackImage('award')], desc: 'درع تكريم مناسب للمدارس والشركات.', works: false, views: 0, rating: 4.8 }
];
function parseCSV(csv) {
    /* ── IMPORTANT: product IDs are always stored in lowercase ──────────────────
       Google Sheets typically returns IDs in mixed/uppercase case (e.g. ABC001),
       while parseRatingsCSV() and view records use lowercase keys (abc001).
       Lowercasing here guarantees that product IDs match across all data sources. */
    try {
        csv = String(csv || '').replace(/^\uFEFF/, '');

        const lines = csv
            .split(/\r?\n/)
            .filter(line => line.trim());

        if (lines.length < 2) {
            console.warn('[parseCSV] No rows found');
            return [];
        }

        const headers = parseCSVLine(lines[0])
            .map(h => String(h || '').trim().toLowerCase());

        const findCol = (...names) =>
            headers.findIndex(h => names.some(n => h === n));

        const idxId    = findCol('id');
        const idxName  = findCol('name');
        const idxPrice = findCol('price');
        const idxCat   = findCol('cat');
        const idxTag   = findCol('tag');
        const idxImg   = findCol('img');
        const idxDesc  = findCol('desc');
        const idxWorks = findCol('works');

        /* ── NEW COLUMNS ── */
        const idxDiscount    = findCol('discount');
        const idxImgView     = findCol('img_view');
        const idxImgs        = findCol('imgs');
        const idxStock       = findCol('stock');

        const products = [];

        for (let i = 1; i < lines.length; i++) {
            try {

                const cols = parseCSVLine(lines[i]);

                const id =
                    idxId > -1
                        ? String(cols[idxId] || '').trim().toLowerCase()
                        : '';

                const name =
                    idxName > -1
                        ? String(cols[idxName] || '').trim()
                        : '';

                if (!id || !name) {
                    console.warn(
                        '[parseCSV] Row skipped:',
                        i + 1,
                        'Missing ID or Name'
                    );
                    continue;
                }

                const image =
                    idxImg > -1
                        ? (extractImageUrls(cols[idxImg])[0] || '')
                        : '';

                const imgView =
                    idxImgView > -1
                        ? (extractImageUrls(cols[idxImgView])[0] || '')
                        : '';

                const extraImages =
                    idxImgs > -1
                        ? extractImageUrls(cols[idxImgs])
                        : [];

                const images = [
                    image,
                    imgView,
                    ...extraImages
                ].filter((url, index, arr) => url && arr.indexOf(url) === index);

                products.push({
                    id,
                    name,
                    price:
                        idxPrice > -1
                            ? parseSheetInteger(cols[idxPrice])
                            : 0,
                    cat:
                        idxCat > -1
                            ? normalizeProductCategory(cols[idxCat])
                            : 'all',
                    tag:
                        idxTag > -1
                            ? String(cols[idxTag] || '').trim()
                            : '',
                    img:
                        image ||
                        fallbackImage(name),
                    images: images.length ? images : [fallbackImage(name)],
                    desc:
                        idxDesc > -1
                            ? String(cols[idxDesc] || '').trim()
                            : '',
                    works:
                        idxWorks > -1
                            ? String(cols[idxWorks] || '')
                                .trim()
                                .toUpperCase() === 'TRUE'
                            : false,

                    /* ── NEW COLUMNS ── */
                    discount:
                        idxDiscount > -1 && cols[idxDiscount]
                            ? parseSheetDecimal(cols[idxDiscount])
                            : 0,
                    img_view: imgView,
                    imgs: extraImages,

                    stock:
                        idxStock > -1 && cols[idxStock]
                            ? parseSheetInteger(cols[idxStock])
                            : 0,

                    rating: 0,
                    ratingCount: 0,
                    views: 0
                });

            } catch (rowError) {
                console.error(
                    '[parseCSV] Row Error:',
                    rowError
                );
            }
        }

        console.log(
            '[parseCSV] Products Loaded:',
            products.length
        );

        return products;

    } catch (err) {
        console.error('[parseCSV] Fatal Error:', err);
        return [];
    }
}

function parseImagesCSV(csv) {
    csv = csv.replace(/^\uFEFF/, '');
    const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    const getColIndex = (keywords) => headers.findIndex(h => keywords.some(k => h.includes(k)));
    const idxId = getColIndex(['id', 'معرف']);
    const idxImage = getColIndex(['image', 'img', 'صورة', 'رابط']);
    const idxGroup = getColIndex(['group', 'مجموعة', 'cat', 'فئة']);

    return lines.slice(1).map((line) => {
        const cols = parseCSVLine(line);
        if (cols.length < 2) return null;
        const id = (idxId > -1 && cols[idxId]) ? normalizeSheetId(cols[idxId]) : "";
        const imageRaw = (idxImage > -1 && cols[idxImage]) ? cols[idxImage].trim() : "";
        const image = extractImageUrls(imageRaw)[0] || "";
        const group = (idxGroup > -1 && cols[idxGroup]) ? cols[idxGroup].trim() : "";
        if (!id || !image) return null;
        return { id, image, group };
    }).filter(Boolean);
}

function parseServicesCSV(csv) {
    csv = csv.replace(/^\uFEFF/, '');
    const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    const getColIndex = (keywords) => headers.findIndex(h => keywords.some(k => h.includes(k)));
    const idxTitle = getColIndex(['title', 'العنوان', 'خدمة', 'اسم']);
    const idxDesc = getColIndex(['desc', 'description', 'الوصف', 'تفاصيل']);
    const idxIcon = getColIndex(['icon', 'أيقونة', 'img']);
    const idxButton = getColIndex(['button', 'زر', 'اطلب', 'label']);
    const idxOrder = getColIndex(['order', 'ترتيب', 'priority']);

    return lines.slice(1).map((line, index) => {
        const cols = parseCSVLine(line);
        if (cols.length < 2) return null;
        const title = (idxTitle > -1 && cols[idxTitle]) ? cols[idxTitle].trim() : "";
        const desc = (idxDesc > -1 && cols[idxDesc]) ? cols[idxDesc].trim() : "";
        const icon = idxIcon > -1 ? normalizeServiceIcon(cols[idxIcon] || '') : 'fa-concierge-bell';
        const button = idxButton > -1 && (cols[idxButton] || '').trim() ? cols[idxButton].trim() : 'اطلب الخدمة';
        const order = idxOrder > -1 ? parseInt(cols[idxOrder], 10) || index : index;
        return { title, desc, icon, button, order };
    }).filter(Boolean).sort((a, b) => a.order - b.order);
}

async function fetchCSVFromSources(sources, timeoutMs = 10000) {
    const orderedSources = buildFreshCSVSourceList(sources);
    let lastError = null;

    for (let i = 0; i < orderedSources.length; i++) {
        const source = String(orderedSources[i] || '').trim();
        if (!source) continue;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            const response = await fetch(source, {
                cache: "no-store",
                headers: { "Cache-Control": "no-cache" },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error("فشل الاتصال: " + response.status);
            return await response.text();
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("فشل جلب البيانات");
}

function buildFreshCSVSourceList(sources) {
    const freshSources = [];

    sources.forEach(source => {
        const url = String(source || '').trim();
        if (!url || /r\.jina\.ai/i.test(url)) return;

        if (/allorigins/i.test(url)) {
            const target = getAllOriginsTarget(url);
            if (target) {
                freshSources.push(toFreshUrl(target));
                freshSources.push(toAllOriginsUrl(target));
            } else {
                freshSources.push(toFreshUrl(url));
            }
            return;
        }

        freshSources.push(toFreshUrl(url));
        freshSources.push(toAllOriginsUrl(url));
    });

    return [...new Set(freshSources)];
}

function toFreshUrl(url) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_=${Date.now()}`;
}

function toAllOriginsUrl(url) {
    return "https://api.allorigins.win/raw?url=" + encodeURIComponent(toFreshUrl(url));
}

function getAllOriginsTarget(url) {
    try {
        return new URL(url).searchParams.get('url') || '';
    } catch (error) {
        return '';
    }
}

function parseRatingsCSV(csv) {
    /* ── IMPORTANT: ratings/views map keys are always lowercase ─────────────────
       normalizeSheetId() trims AND lowercases the product ID before it is used
       as a key in the result object. This ensures a match with the lowercase
       product IDs produced by parseCSV() above. */
    csv = csv.replace(/^\uFEFF/, '');
    const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return {};

    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    const getColIndex = (keywords) => headers.findIndex(h => keywords.some(k => h.includes(k)));

    const idxId = getColIndex(['id', 'معرف', 'product_id', 'product']);
    const idxViews = getColIndex(['views', 'مشاهدات', 'زيارات', 'المشاهدات']);
    const idxRating = getColIndex(['rating', 'تقييم', 'التقييم', 'التقييمات']);
    const idxRatingCount = getColIndex(['rating count', 'rating_count', 'ratingcount', 'عدد التقييمات', 'reviews']);

    const result = {};
    lines.slice(1).forEach((line) => {
        const cols = parseCSVLine(line);
        if (cols.length < 2) return;
        const id = (idxId > -1 && cols[idxId]) ? normalizeSheetId(cols[idxId]) : "";
        const views = (idxViews > -1 && cols[idxViews]) ? parseInt(cols[idxViews], 10) || 0 : 0;
        const rating = (idxRating > -1 && cols[idxRating] != null && cols[idxRating] !== '') ? parseFloat(cols[idxRating]) || 0 : 0;
        const ratingCount = (idxRatingCount > -1 && cols[idxRatingCount] != null && cols[idxRatingCount] !== '') ? parseInt(cols[idxRatingCount], 10) || 0 : 0;
        if (id) {
            result[id] = { views, rating, ratingCount };
        }
    });
    return result;
}

async function fetchProducts() {
    console.log('[fetchProducts] STARTED');
    const grid = document.getElementById('prodGrid');
    const worksGridEl = document.getElementById('worksGrid');

    if (!grid) console.error('[fetchProducts] ERROR: prodGrid not found in DOM!');
    if (!worksGridEl) console.error('[fetchProducts] ERROR: worksGrid not found in DOM!');

    renderProductSkeleton('prodGrid', 8);
    renderProductSkeleton('worksGrid', 4);
    let lastError = null;

    const ratingsPromise = (async () => {
        console.log('[fetchProducts] Fetching ratings...');
        const ratingsText = await fetchCSVFromSources([
            GOOGLE_SHEETS_RATINGS_URL,
            "https://api.allorigins.win/raw?url=" + encodeURIComponent(GOOGLE_SHEETS_RATINGS_URL)
        ], 4000);
        const ratingsData = parseRatingsCSV(ratingsText);
        console.log('[fetchProducts] Ratings loaded:', Object.keys(ratingsData).length, 'entries');
        return ratingsData;
    })().catch(error => {
        console.error('[fetchProducts] Ratings fetch failed:', error.message);
        return {};
    });

    for (let i = 0; i < PRODUCT_CSV_SOURCES.length; i++) {
        const source = PRODUCT_CSV_SOURCES[i].trim();
        try {
            console.log('[fetchProducts] Trying source', i, ':', source.substring(0, 60) + '...');
            const csvText = await fetchCSVFromSources([
                source
            ], 5000);
            console.log('[fetchProducts] CSV fetched, size:', csvText.length, 'bytes');
            const parsed = parseCSV(csvText);
            console.log('[fetchProducts] Parsed products:', parsed.length);
            if (parsed.length > 0) {
                PRODS = parsed;
                console.log('[fetchProducts] PRODS =', PRODS.length, 'products. First 3:', PRODS.slice(0, 3).map(p => p.name));
                console.log('[fetchProducts] Product source used:', source);
                console.log('[fetchProducts] Matching محفظة rows:', PRODS.filter(p => String(p.name || '').includes('محفظة')));
                renderProds(PRODS);
                renderWorks();
                renderTrending(); // ✅ تحديث صفحة الأكثر مبيعاً بعد تحميل المنتجات
                ratingsPromise.then(ratingsData => {
                    mergeRatingsData(PRODS, ratingsData);
                    refreshCurrentProductLists();
                    renderTrending();
                });
                fetchImages();
                fetchProductViews(); // ✅ جلب المشاهدات لترتيب الأكثر مبيعاً
                console.log('[fetchProducts] DONE (success)');
                return;
            }
        } catch (error) {
            lastError = error;
            console.error('[fetchProducts] Source', i, 'failed:', error.message);
        }
    }

    // ─── FALLBACK: جميع المصادر فشلت ───
    console.warn('[fetchProducts] ALL SOURCES FAILED. Using fallback products.');
    console.warn('[fetchProducts] lastError:', lastError?.message);
    PRODS = DEFAULT_PRODUCTS.map(product => ({ ...product }));
    ratingsPromise.then(ratingsData => {
        mergeRatingsData(PRODS, ratingsData);
        refreshCurrentProductLists();
        renderTrending();
    });
    console.log('[fetchProducts] Fallback PRODS:', PRODS.length);
    renderProds(PRODS);
    renderWorks();
    renderTrending(); // ✅ تحديث صفحة الأكثر مبيعاً مع المنتجات الاحتياطية
    showToast('تعذر الاتصال بـ Google Sheets، تم عرض منتجات مؤقتة', 'info');
    console.log('[fetchProducts] DONE (fallback)');
}

async function fetchImages() {
    const sources = [
        GOOGLE_SHEETS_IMAGES_URL,
        "https://api.allorigins.win/raw?url=" + encodeURIComponent(GOOGLE_SHEETS_IMAGES_URL)
    ];
    let lastError = null;
    try {
        const csvText = await fetchCSVFromSources(sources);
        const parsed = parseImagesCSV(csvText);
        if (parsed.length > 0) {
            imagesRows = parsed;
            console.log('[Images] Loaded', imagesRows.length, 'image rows');
        }
    } catch (error) {
        console.error('[Images] Fetch failed:', error.message);
    }
}

async function fetchServices() {
    if (!SERVICE_CSV_SOURCES.length) {
        renderServices(DEFAULT_SERVICES);
        return;
    }
    let lastError = null;
    for (const source of SERVICE_CSV_SOURCES) {
        try {
            const csvText = await fetchCSVFromSources(source ? [source] : []);
            const parsed = parseServicesCSV(csvText);
            if (parsed.length) {
                renderServices(parsed);
                return;
            }
        } catch (error) { lastError = error; }
    }
    renderServices(DEFAULT_SERVICES);
}

function renderServices(list) {
    const el = document.getElementById('svcGrid');
    if (!el) return;
    if (!list.length) {
        el.innerHTML = '<p style="color:var(--text-muted);padding:20px;grid-column:1/-1">لا توجد خدمات حالياً</p>';
        return;
    }
    el.innerHTML = list.map((s, i) => `
        <div class="svc-card">
            <div class="svc-num">${String(i + 1).padStart(2, '0')}</div>
            <div class="svc-ico"><i class="fas ${s.icon}"></i></div>
            <div class="svc-tit">${escapeHTML(s.title)}</div>
            <div class="svc-dsc">${escapeHTML(s.desc)}</div>
            <button class="svc-btn" onclick="openWA('خدمة: ${escapeHTML(s.title)}')"><i class="fas fa-phone-alt"></i> ${escapeHTML(s.button)}</button>
        </div>
    `).join('');
}

function save() {
    const bs = (n) => {
        if (n < 1) return '0';
        const u = ['', 'K', 'M', 'B', 'T'];
        const i = Math.floor(Math.log10(n) / 3);
        return parseFloat((n / Math.pow(10, i * 3)).toFixed(1)) + u[i];
    };
    document.getElementById('vProd').textContent = bs(PRODS.length || DEFAULT_PRODUCTS.length);
    document.getElementById('vCust').textContent = bs(347);
    document.getElementById('vViews').textContent = bs(4820);
    document.getElementById('vDone').textContent = bs(812);
}

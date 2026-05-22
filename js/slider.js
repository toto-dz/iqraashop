// js/slider.js
let heroSliderItems = [];
let currentSlideIndex = 0;
let autoSlideInterval = null;
let autoSlideEnabled = true;

const sliderImagesData = [
    { id: 1, image: "https://res.cloudinary.com/dq38km9rc/image/upload/v1778328226/ChatGPT_Image_May_9_2026_01_03_19_PM_zivrrk.png", title: "منتج مميز 1", description: "جودة عالية وأسعار منافسة" },
    { id: 2, image: "https://res.cloudinary.com/dq38km9rc/image/upload/v1778325895/ChatGPT_Image_May_9_2026_12_24_42_PM_zcqmlp.png", title: "منتج مميز 2", description: "أفضل العروض الحصرية" },
    { id: 3, image: "https://res.cloudinary.com/dq38km9rc/image/upload/v1778325827/ChatGPT_Image_May_9_2026_12_21_33_PM_i7jdwr.png", title: "منتج مميز 3", description: "شحن سريع وأمان تام" },
    { id: 4, image: "https://res.cloudinary.com/dq38km9rc/image/upload/v1778325939/ChatGPT_Image_May_9_2026_12_25_29_PM_eoqaud.png", title: "منتج مميز 4", description: "خدمة عملاء متوفرة دائماً" },
    { id: 5, image: "https://res.cloudinary.com/dq38km9rc/image/upload/v1778327099/ChatGPT_Image_May_9_2026_12_41_21_PM_cmmzlk.png", title: "منتج مميز 5", description: "توصيل مجاني لجميع الولايات" }
];

function isLiteMobileSlider() {
    return window.innerWidth <= 640;
}

function initHeroSlider() {
    const sliderContainer = document.getElementById('heroSlider');
    const dotsContainer = document.getElementById('heroDots');
    if (!sliderContainer) return;
    sliderContainer.innerHTML = '';
    if (dotsContainer) dotsContainer.innerHTML = '';
    
    sliderImagesData.forEach((slide, index) => {
        const slideDiv = document.createElement('div');
        slideDiv.className = `slider-item ${index === 0 ? 'active' : ''}`;
        slideDiv.setAttribute('data-index', index);
        slideDiv.innerHTML = `
            <div class="slider-img-wrap">
                <img src="${slide.image}" alt="${slide.title}" loading="lazy" onerror="this.src='${fallbackImage('hero_' + index)}'">
                <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(0,0,0,0.82),rgba(0,0,0,0.1) 60%,transparent);padding:28px 22px 20px;z-index:3;">
                    <h3 style="color:#fff;margin:0 0 5px 0;font-size:17px;font-weight:800;text-shadow:0 2px 8px rgba(0,0,0,0.5);">${slide.title}</h3>
                    <p style="color:rgba(255,255,255,0.7);margin:0;font-size:12px;">${slide.description}</p>
                </div>
            </div>
            <div class="slider-reflection">
                <img src="${slide.image}" alt="" aria-hidden="true" loading="lazy" onerror="this.src='${fallbackImage('hero_ref_' + index)}'">
            </div>
        `;
        sliderContainer.appendChild(slideDiv);
        
        if (dotsContainer) {
            const dot = document.createElement('span');
            dot.className = index === 0 ? 'active' : '';
            dot.setAttribute('data-index', index);
            dot.addEventListener('click', () => goToSlide(index));
            dotsContainer.appendChild(dot);
        }
    });
    
    heroSliderItems = document.querySelectorAll('.slider-item');
    const prevBtn = document.querySelector('.slider-nav-arrow.prev');
    const nextBtn = document.querySelector('.slider-nav-arrow.next');
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    
    setupSliderEvents();
    startAutoSlide();
    updateSlideCounter();
    update3DPositions();
}

function goToSlide(index) {
    console.log('[Slider] goToSlide', index, 'items:', heroSliderItems.length);
    if (!heroSliderItems.length) return;
    if (index < 0) index = heroSliderItems.length - 1;
    if (index >= heroSliderItems.length) index = 0;
    currentSlideIndex = index;
    heroSliderItems.forEach((item, i) => { item.classList.toggle('active', i === index); });
    document.querySelectorAll('#heroDots span').forEach((dot, i) => { dot.classList.toggle('active', i === index); });
    updateSlideCounter();
    update3DPositions();
}

function update3DPositions() {
    if (!heroSliderItems.length) return;
    const liteMobile = isLiteMobileSlider();
    const total = heroSliderItems.length;
    const centerIndex = currentSlideIndex;
    heroSliderItems.forEach((item, index) => {
        let distance = index - centerIndex;
        if (distance > total / 2) distance -= total;
        if (distance < -total / 2) distance += total;
        const absDistance = Math.abs(distance);
        const depthLevels = liteMobile ? [0, 0, 0, 0, 0] : [0, -180, -420, -700, -1000];
        const scaleLevels = liteMobile ? [1, 0.78, 0.58, 0.44, 0.34] : [1.08, 0.78, 0.60, 0.46, 0.34];
        const rotateLevels = liteMobile ? [0, 0, 0, 0, 0] : [0, -38, -58, -72, -82];
        const spreadLevels = liteMobile ? [0, 180, 320, 440, 560] : [0, 320, 580, 800, 1050];
        const blurLevels = liteMobile ? [0, 0, 0.4, 0.8, 1.2] : [0, 0.5, 1.8, 3.2, 5];
        const tz = depthLevels[absDistance] || -700;
        const sc = scaleLevels[absDistance] || 0.30;
        const ry = distance > 0 ? rotateLevels[absDistance] : -rotateLevels[absDistance];
        const tx = distance > 0 ? spreadLevels[absDistance] : -spreadLevels[absDistance];
        const blur = blurLevels[absDistance] || 6;
        const zi = 100 - absDistance * 10;
        
        if (absDistance === 0) {
            item.style.transform = `translate(-50%, -50%) rotateY(0deg) scale(${liteMobile ? 1 : 1.08})`;
            item.style.opacity = '1';
            item.style.zIndex = '999';
            item.style.filter = `brightness(1) saturate(1) blur(0px)`;
        } else {
            item.style.transform = `translate(-50%, -50%) translateX(${tx}px) ${liteMobile ? '' : `translateZ(${tz}px)`} rotateY(${ry}deg) scale(${sc})`;
            item.style.opacity = '1';
            item.style.zIndex = zi;
            item.style.filter = `brightness(0.72) saturate(0.82) blur(${blur}px)`;
        }
    });
}

function nextSlide() { goToSlide(currentSlideIndex + 1); }
function prevSlide() { goToSlide(currentSlideIndex - 1); }

function updateSlideCounter() {
    const counterSpan = document.getElementById('currentIndex');
    if (counterSpan) counterSpan.textContent = String(currentSlideIndex + 1).padStart(2, '0');
}

function startAutoSlide() {
    if (isLiteMobileSlider()) return;
    if (autoSlideInterval) clearInterval(autoSlideInterval);
    if (!autoSlideEnabled) return;
    autoSlideInterval = setInterval(() => {
        if (autoSlideEnabled && document.getElementById('heroSlider')) nextSlide();
    }, 5000);
}

function stopAutoSlide() {
    if (autoSlideInterval) { clearInterval(autoSlideInterval); autoSlideInterval = null; }
}

function setupSliderEvents() {
    const slider = document.getElementById('heroSlider');
    if (!slider) return;
    let touchStartX = 0, touchEndX = 0, isDragging = false, startX = 0;
    slider.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].clientX; stopAutoSlide(); });
    slider.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].clientX;
        const diff = touchEndX - touchStartX;
        if (Math.abs(diff) > 50) { if (diff > 0) prevSlide(); else nextSlide(); }
        startAutoSlide();
    });
    slider.addEventListener('mousedown', (e) => {
        isDragging = true; startX = e.clientX; stopAutoSlide(); slider.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const diff = e.clientX - startX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) prevSlide(); else nextSlide();
            isDragging = false; slider.style.cursor = '';
        }
    });
    window.addEventListener('mouseup', () => {
        if (isDragging) { isDragging = false; slider.style.cursor = ''; startAutoSlide(); }
    });
    slider.addEventListener('mouseenter', stopAutoSlide);
    slider.addEventListener('mouseleave', startAutoSlide);
    window.addEventListener('resize', () => { setTimeout(() => update3DPositions(), 100); });
}

// Modal Slider
let currentModalProdId = null;
let modalGalleryImages = [];
let modalSlideIndex = 0;
let modalTouchStartX = 0;

// 🔧 تم إصلاح المشكلة: استخدام currentModalProdId بدلاً من currentProduct غير المعرّف
function openModal(id) {
    const p = PRODS.find(x => x.id === id);
    if (!p) return;
    currentModalProdId = id;
    const mImg = document.getElementById('mImg');
    const mName = document.getElementById('mName');
    const mPrice = document.getElementById('mPrice');
    const mCat = document.getElementById('mCat');
    const mDesc = document.getElementById('mDesc');
    const mQty = document.getElementById('mQty');
    const prodModal = document.getElementById('prodModal');

    if (mImg) {
        mImg.onerror = () => { mImg.onerror = null; mImg.src = fallbackImage(p.id || p.name); };
        mImg.src = p.img || fallbackImage(p.id || p.name);
    }
    if (mName) mName.textContent = p.name || 'اسم المنتج';
    if (mCat) mCat.textContent = p.cat || 'عام';

    /* ── Price with discount ── */
    const hasDiscount = p.discount && p.discount > 0;
    const finalPrice  = hasDiscount ? Math.round(p.price * (1 - p.discount / 100)) : p.price;
    if (mPrice) {
        mPrice.innerHTML = hasDiscount
            ? `<span style="text-decoration:line-through;color:var(--text-muted);font-size:15px;font-weight:400;margin-left:8px">${p.price.toLocaleString('ar-DZ')} دج</span>
               <span style="background:var(--red-bg);color:var(--red);font-size:12px;font-weight:800;padding:3px 10px;border-radius:20px;margin-left:8px">-${p.discount}%</span>
               <span>${finalPrice.toLocaleString('ar-DZ')} دج</span>`
            : `${p.price.toLocaleString('ar-DZ')} دج`;
    }

    /* ── Stock ── */
    const mStock = document.getElementById('mStock');
    if (mStock) {
        if ((p.stock != null && p.stock !== '' && p.stock > 0)) {
            mStock.innerHTML = `<span style="font-size:13px;color:var(--gold);display:flex;align-items:center;gap:6px;margin-bottom:8px"><i class="fas fa-box" style="color:var(--gold)"></i>متبقي ${p.stock} فقط</span>`;
        } else {
            mStock.innerHTML = '';
        }
    }
    updateModalRating(p);
    const desc = p.desc && p.desc.trim() ? p.desc : "وصف تفصيلي للمنتج سيظهر هنا.";
    if (mDesc) mDesc.textContent = desc;
    if (mQty) mQty.textContent = '1';
    buildModalGallery(p);
    trackProductView(p);
    if (prodModal) {
        prodModal.classList.add('active');
        history.pushState({ modal: true }, "");
        document.body.style.overflow = 'hidden';
    }
}

function getModalImages(product) {
    if (imagesRows.length > 0) {
        const filtered = imagesRows.filter(r => r.id === product.id).map(r => r.image);
        if (filtered.length) return filtered;
    }
    const images = [];
    if (Array.isArray(product.images) && product.images.length) {
        images.push(...product.images);
    } else {
        const keys = ['img', 'img_2', 'img_3', 'img_4', 'img_5'];
        keys.forEach(key => { if (product[key] && !images.includes(product[key])) images.push(product[key]); });
    }
    if (!images.length && product.img) images.push(product.img);
    if (!images.length) images.push(fallbackImage('image'));
    return images;
}

function buildModalGallery(product) {
    modalGalleryImages = getModalImages(product);
    modalSlideIndex = 0;
    const mainImg = document.getElementById('mImg');
    const thumbs = document.getElementById('modalThumbs');
    const counter = document.getElementById('modalSlideCounter');
    if (!mainImg || !thumbs || !counter) return;
    mainImg.src = modalGalleryImages[0];
    mainImg.alt = product.name || 'صورة المنتج';
    counter.textContent = `1 / ${modalGalleryImages.length}`;
    thumbs.innerHTML = '';
    modalGalleryImages.forEach((src, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'thumb-item' + (index === 0 ? ' active' : '');
        btn.dataset.index = index;
        const img = document.createElement('img');
        img.onerror = () => { img.onerror = null; img.src = fallbackImage(product.id || product.name || index); };
        img.src = src || fallbackImage(product.id || product.name || index);
        img.alt = product.name || 'صورة مصغرة';
        img.loading = 'lazy';
        btn.appendChild(img);
        btn.addEventListener('click', () => goModalSlide(index));
        thumbs.appendChild(btn);
    });
}

function goModalSlide(index) {
    const len = modalGalleryImages.length;
    if (!len) return;
    modalSlideIndex = (index + len) % len;
    const mainImg = document.getElementById('mImg');
    const counter = document.getElementById('modalSlideCounter');
    if (!mainImg || !counter) return;
    mainImg.style.opacity = '0';
    setTimeout(() => {
        mainImg.src = modalGalleryImages[modalSlideIndex] || fallbackImage(currentModalProdId || 'modal');
        mainImg.style.opacity = '1';
    }, 120);
    document.querySelectorAll('#modalThumbs .thumb-item').forEach((thumb, idx) => {
        thumb.classList.toggle('active', idx === modalSlideIndex);
    });
    counter.textContent = `${modalSlideIndex + 1} / ${len}`;
}

function goModalPrev() { goModalSlide(modalSlideIndex - 1); }
function goModalNext() { goModalSlide(modalSlideIndex + 1); }

function setupModalGalleryEvents() {
    const prevBtn = document.getElementById('modalPrev');
    const nextBtn = document.getElementById('modalNext');
    const slider = document.getElementById('modalSliderStage');
    if (prevBtn) prevBtn.addEventListener('click', goModalPrev);
    if (nextBtn) nextBtn.addEventListener('click', goModalNext);
    if (slider) {
        slider.addEventListener('touchstart', e => { modalTouchStartX = e.changedTouches[0].clientX; });
        slider.addEventListener('touchend', e => {
            const diff = modalTouchStartX - e.changedTouches[0].clientX;
            if (Math.abs(diff) < 50) return;
            if (diff > 0) goModalNext(); else goModalPrev();
        });
    }
}

// Call it once when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupModalGalleryEvents);
} else {
    setupModalGalleryEvents();
}

function closeModal() {
    const prodModal = document.getElementById('prodModal');
    if (prodModal) prodModal.classList.remove('active');
    document.body.style.overflow = '';
}

function mChQty(d) {
    const el = document.getElementById('mQty');
    if (!el) return;
    let val = parseInt(el.textContent) + d;
    if (val < 1) val = 1;
    if (val > 99) val = 99;
    el.textContent = val;
}

function addFromModal() {
    if (!currentModalProdId) return;
    const p = PRODS.find(x => x.id === currentModalProdId);
    if (!p) return;
    const mQty = document.getElementById('mQty');
    const qty = mQty ? parseInt(mQty.textContent) : 1;
    let ex = cart.find(x => x.id === p.id && !x.isGift);
    if (ex) {
        ex.qty += qty;
        showToast(`تم تحديث الكمية للمنتج`, 'info');
    } else {
        cart.push({ ...p, qty: qty, finalPrice: p.price, isGift: false });
        showToast(`أُضيف ${p.name} للسلة`, 'ok');
    }
    save();
    closeModal();
    const safeId = String(p.id).replace(/[^a-zA-Z0-9]/g, '_');
    const btn = document.getElementById(`ab${safeId}`);
    if (btn) {
        btn.className = 'btn-add added';
        btn.innerHTML = '<i class="fas fa-check"></i> تمت الإضافة';
    }
}

// 🔧 تم إصلاح المشكلة: استخدام currentModalProdId بدلاً من currentProduct غير المعرّف
function shareProduct() {
    if(!currentModalProdId) {
        showToast('لا يوجد منتج للمشاركة', 'err');
        return;
    }
    const product = PRODS.find(x => x.id === currentModalProdId);
    if(!product) {
        showToast('المنتج غير موجود', 'err');
        return;
    }
    const productLink = `${window.location.origin}${window.location.pathname}?product=${product.id}`;
    navigator.clipboard.writeText(productLink).then(() => { 
        showToast('تم نسخ رابط المنتج'); 
    }).catch(() => { 
        showToast('تعذر نسخ الرابط', 'err'); 
    });
}
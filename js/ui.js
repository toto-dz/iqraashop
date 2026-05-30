// js/ui.js
window._view = 'trending';
function showView(viewId) {
    const viewNames = { homeView: 'home', cartView: 'cart', worksView: 'works', servicesView: 'services', reviewsView: 'reviews', trendingView: 'trending', contactView: 'contact' };
    window._view = viewNames[viewId] || viewId;
    document.querySelectorAll('.view-section').forEach(view => {
        if (view.id === viewId) {
            view.style.display = 'block';
            requestAnimationFrame(() => view.classList.add('visible'));
        } else {
            view.classList.remove('visible');
            view.style.display = 'none';
        }
    });
    document.querySelectorAll('nav a[data-view], .dr-nav a[data-view]').forEach(link => {
        link.classList.toggle('active', link.dataset.view === viewId);
    });
    if (viewId === 'cartView') renderCart();
    if (viewId === 'reviewsView' && typeof fetchReviews === 'function') fetchReviews();
    if (viewId === 'trendingView') renderTrending();
    syncBar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goHome() { showView('homeView'); }
function goCart() { showView('cartView'); }

function showAllProducts() {
    cat = 'all';
    document.querySelectorAll('.cat-a').forEach(a => a.classList.remove('active'));
    const allBtn = document.querySelector('.cat-a[onclick*="all"]');
    if (allBtn) allBtn.classList.add('active');
    showView('homeView');
    applyFilters();
    setTimeout(() => {
        const prodSec = document.getElementById('prodSec');
        if (prodSec) window.scrollTo({ top: prodSec.offsetTop - 120, behavior: 'smooth' });
    }, 150);
}

async function submitContactForm(e) {
    e.preventDefault();
    const name = document.getElementById('contactName').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const message = document.getElementById('contactMessage').value.trim();
    if (!name || !phone || !email || !message) { showToast('يرجى ملء جميع الحقول', 'err'); return; }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...'; submitBtn.disabled = true; }

    // Send to Google Apps Script
    try {
        const formData = new FormData();
        formData.append('action', 'contactMessage');
        formData.append('name', name);
        formData.append('phone', phone);
        formData.append('email', email);
        formData.append('message', message);
        await fetch(SCRIPT_URL, { method: 'POST', body: formData });
    } catch (err) { console.log('Apps Script error:', err); }

    if (submitBtn) { submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> أرسل الرسالة'; submitBtn.disabled = false; }

    // Open WhatsApp
    const waMsg = `📩 *رسالة جديدة من الموقع*%0A%0A👤 الاسم: ${encodeURIComponent(name)}%0A📞 الهاتف: ${encodeURIComponent(phone)}%0A📧 البريد: ${encodeURIComponent(email)}%0A%0A💬 الرسالة:%0A${encodeURIComponent(message)}`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${waMsg}`, '_blank');
    showToast('تم إرسال رسالتك عبر واتساب ✓', 'ok');
    e.target.reset();
}

function openWA() { window.open(`https://wa.me/${WA_NUMBER}`, '_blank'); }

function openDrawer() {
    const drawer = document.getElementById('drawer');
    const ovl = document.getElementById('ovl');
    if (drawer) drawer.classList.add('open');
    if (ovl) ovl.classList.add('on');
    document.body.style.overflow = 'hidden';
}
function closeDrawer() {
    const drawer = document.getElementById('drawer');
    const ovl = document.getElementById('ovl');
    if (drawer) drawer.classList.remove('open');
    if (ovl) ovl.classList.remove('on');
    document.body.style.overflow = '';
}

let _tt;
function showToast(msg, type = 'ok') {
    clearTimeout(_tt);
    const el = document.getElementById('toast');
    const ic = document.getElementById('tIcon');
    const tMsg = document.getElementById('tMsg');
    if (!el || !ic || !tMsg) return;
    tMsg.textContent = msg;
    ic.className = type === 'err' ? 'fas fa-times-circle ti-err' : type === 'info' ? 'fas fa-info-circle ti-info' : 'fas fa-check-circle ti-ok';
    el.className = `toast show${type === 'err' ? ' err' : ''}`;
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => { el.className = 'toast'; }, 3200);
}

function syncBar() {
    const n = cart.reduce((a, b) => a + b.qty, 0);
    const bar = document.getElementById('mobBar');
    const mobTotal = document.getElementById('mobTotal');
    const mobCount = document.getElementById('mobCount');
    if (!bar) return;
    if ((window._view === 'home' || window._view === 'trending') && n > 0) {
        bar.style.display = 'block';
        document.body.classList.add('has-mob-bar');
        const t = cart.reduce((s, i) => s + i.finalPrice * i.qty, 0);
        if (mobTotal) mobTotal.textContent = t.toLocaleString('ar-DZ') + ' دج';
        if (mobCount) mobCount.textContent = n;
    } else {
        bar.style.display = 'none';
        document.body.classList.remove('has-mob-bar');
    }
}

function toggleSearch() {
    if (window.innerWidth > 640) return;
    const srch = document.querySelector('.srch');
    srch.classList.toggle('active');
    const input = srch.querySelector('input');
    if (srch.classList.contains('active')) setTimeout(() => { input.focus(); }, 150);
}

let catAutoIndex = 0;
let catAutoTimer = null;

function scrollToCatItem(index) {
    const items = Array.from(document.querySelectorAll('.cat-in .cat-a'));
    if (items.length === 0) return;
    const item = items[index % items.length];
    if (!item) return;
    items.forEach(el => el.classList.remove('auto-highlight'));
    item.classList.add('auto-highlight');
    item.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

function startCatAutoScroll() {
    if (window.innerWidth > 640) return;
    const items = document.querySelectorAll('.cat-in .cat-a');
    if (items.length <= 1) return;
    clearInterval(catAutoTimer);
    catAutoIndex = 0;
    scrollToCatItem(catAutoIndex);
    catAutoTimer = setInterval(() => {
        catAutoIndex = (catAutoIndex + 1) % items.length;
        scrollToCatItem(catAutoIndex);
    }, 3000);
}

function stopCatAutoScroll() {
    clearInterval(catAutoTimer);
    catAutoTimer = null;
    document.querySelectorAll('.cat-a.auto-highlight').forEach(el => el.classList.remove('auto-highlight'));
}

window.addEventListener('resize', () => {
    if (window.innerWidth <= 640) { if (!catAutoTimer) startCatAutoScroll(); }
    else { stopCatAutoScroll(); }
});

window.addEventListener('popstate', function () {
    const modal = document.getElementById('prodModal');
    if (modal && modal.classList.contains('active')) { closeModal(); }
    else {
        const policyModal = document.getElementById('policyModal');
        if (policyModal && policyModal.classList.contains('active')) { closePolicyModal(); }
    }
});

function renderServices(list = DEFAULT_SERVICES) {
    const grid = document.getElementById('servicesGrid');
    if (!grid) return;
    grid.innerHTML = list.map(service => `
        <div class="service-card">
            <div class="service-icon"><i class="fas ${escapeHTML(service.icon)}"></i></div>
            <h3>${escapeHTML(service.title)}</h3>
            <p>${escapeHTML(service.desc)}</p>
            <button class="btn-out-h" onclick="openWA();return false">${escapeHTML(service.button || 'اطلب الخدمة')}</button>
        </div>
    `).join('');
}

// Privacy & Terms Modal
function openPolicyModal(type) {
    const modal = document.getElementById('policyModal');
    const title = document.getElementById('policyTitle');
    const body = document.getElementById('policyBody');
    if (!modal || !title || !body) return;
    if (type === 'privacy') {
        title.textContent = 'سياسة الخصوصية';
        body.innerHTML = `
            <p>نحن في <strong>مكتبة إقرأ</strong> نلتزم بحماية خصوصيتك وبياناتك الشخصية.</p>
            <h4>المعلومات التي نجمعها</h4>
            <p>نقوم بجمع المعلومات التي تقدمها طوعًا عند تقديم الطلبات أو التواصل معنا، وتشمل: الاسم، رقم الهاتف، الولاية.</p>
            <h4>كيف نستخدم معلوماتك</h4>
            <p>تُستخدم بياناتك حصريًا لمعالجة طلباتك والتواصل معك بشأنها عبر واتساب أو الهاتف. لا نبيع أو نشارك بياناتك مع أطراف ثالثة.</p>
            <h4>تخزين البيانات</h4>
            <p>يتم تخزين بيانات الطلبات في Google Sheets الخاصة بنا بشكل آمن ومحمي. يتم الاحتفاظ بالبيانات لمدة سنة واحدة ثم يتم حذفها.</p>
            <h4>ملفات تعريف الارتباط (Cookies)</h4>
            <p>يستخدم الموقع التخزين المحلي (localStorage) لحفظ محتوى سلة التسوق فقط، ولا يتم مشاركة هذه البيانات مع أي طرف خارجي.</p>
            <h4>تواصل معنا</h4>
            <p>إذا كان لديك أي استفسار بشأن سياسة الخصوصية، تواصل معنا على: bkliqra@gmail.com</p>
        `;
    } else if (type === 'terms') {
        title.textContent = 'شروط الاستخدام';
        body.innerHTML = `
            <h4>قبول الشروط</h4>
            <p>باستخدامك لموقع مكتبة إقرأ، فإنك توافق على الالتزام بهذه الشروط والأحكام.</p>
            <h4>الطلبات والدفع</h4>
            <p>يتم تأكيد الطلبات عبر واتساب. الدفع يكون نقدًا عند الاستلام (COD). يحق لنا رفض أي طلب لا يستوفي الشروط.</p>
            <h4>الشحن والتوصيل</h4>
            <p>نوفر خدمة التوصيل لجميع ولايات الجزائر. مدة التوصيل بين 24 إلى 72 ساعة حسب الولاية. التوصيل مجاني.</p>
            <h4>الإرجاع والاستبدال</h4>
            <p>يمكن إرجاع المنتجات خلال 48 ساعة من الاستلام في حالة وجود عيب مصنعي أو عدم مطابقة الطلب. التواصل يكون عبر واتساب.</p>
            <h4>المنتجات</h4>
            <p>تحتفظ مكتبة إقرأ بحق تغيير الأسعار أو التوقف عن بيع أي منتج في أي وقت. الصور المعروضة للتوضيح فقط وقد تختلف قليلًا عن المنتج الفعلي.</p>
            <h4>الاتصال</h4>
            <p>ولاية الأغواط - بلدية الخنق | الهاتف: 0655752724 | البريد: bkliqra@gmail.com</p>
        `;
    } else if (type === 'sitemap') {
        title.textContent = 'خريطة الموقع';
        body.innerHTML = `
            <ul style="list-style:none;padding:0;line-height:2.5;">
                <li>🏠 <a href="#" onclick="closePolicyModal();goHome();return false">الرئيسية</a></li>
                <li>📦 <a href="#" onclick="closePolicyModal();showAllProducts();return false">المنتجات</a></li>
                <li>🖼️ <a href="#" onclick="closePolicyModal();showView('worksView');return false">من أعمالنا</a></li>
                <li>🔧 <a href="#" onclick="closePolicyModal();showView('servicesView');return false">خدماتنا</a></li>
                <li>📞 <a href="#" onclick="closePolicyModal();showView('contactView');return false">اتصل بنا</a></li>
                <li>🛒 <a href="#" onclick="closePolicyModal();goCart();return false">السلة</a></li>
                <li>💬 <a href="#" onclick="closePolicyModal();openWA();return false">تواصل عبر واتساب</a></li>
            </ul>
        `;
    }
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    history.pushState({ policyModal: true }, '');
}

function closePolicyModal() {
    const modal = document.getElementById('policyModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

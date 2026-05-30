// js/cart.js
function renderCart() {
    const wrap = document.getElementById('cartPrev');
    if (!wrap) return;
    if (!cart.length) {
        wrap.innerHTML = '<div class="cart-empty" style="text-align:center;padding:20px;color:var(--text-muted);"><i class="fas fa-shopping-cart" style="font-size:30px;margin-bottom:10px;"></i><p>السلة فارغة</p></div>';
        const sumQty = document.getElementById('sumQty');
        const sumTotal = document.getElementById('sumTotal');
        if (sumQty) sumQty.textContent = '0';
        if (sumTotal) sumTotal.textContent = '0 دج';
        syncBar(); return;
    }
    let tot = 0, qty = 0;
    wrap.innerHTML = cart.map(item => {
        const sub = item.finalPrice * item.qty;
        tot += sub; qty += item.qty;
        const giftNote = item.isGift ? '<span class="ci-opt">+ تغليف هدية</span>' : '';
        const safeId = String(item.id).replace(/[^a-zA-Z0-9]/g, '_');
        const uid = item.isGift ? '_g' : '';
        return `<div class="ci" id="ci${safeId}${uid}">
            <img src="${escapeHTML(item.img || fallbackImage(item.id || item.name))}" alt="${escapeHTML(item.name)}" onerror="this.onerror=null;this.src='${fallbackImage('cart')}';">
            <div class="ci-body">
                <div class="ci-name">${item.name}</div>
                ${giftNote}
                <div class="ci-each">${item.finalPrice.toLocaleString('ar-DZ')} دج / قطعة</div>
                <div class="qty-row">
                    <button class="qbtn" onclick="chQty('${item.id}',${item.isGift},-1)"><i class="fas fa-minus"></i></button>
                    <span class="qval" id="qv${safeId}${uid}">${item.qty}</span>
                    <button class="qbtn" onclick="chQty('${item.id}',${item.isGift},1)"><i class="fas fa-plus"></i></button>
                    <button class="del" onclick="delItem('${item.id}',${item.isGift})"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
            <div class="ci-sub" id="cs${safeId}${uid}">${sub.toLocaleString('ar-DZ')} دج</div>
        </div>`;
    }).join('');
    const sumQty = document.getElementById('sumQty');
    const sumTotal = document.getElementById('sumTotal');
    if (sumQty) sumQty.textContent = qty;
    if (sumTotal) sumTotal.textContent = tot.toLocaleString('ar-DZ') + ' دج';
    syncBar();
}

function addCart(id) {
    const p = PRODS.find(x => x.id === id);
    if (!p) return;
    const ex = cart.find(x => x.id === id && !x.isGift);
    if (ex) {
        ex.qty++;
        showToast(`كمية ${p.name} زادت`, 'info');
    } else {
        cart.push({ ...p, qty: 1, finalPrice: p.price, isGift: false });
        showToast(`أُضيف ${p.name} للسلة`, 'ok');
    }
    save();
    const safeId = String(id).replace(/[^a-zA-Z0-9]/g, '_');
    const b = document.getElementById(`ab${safeId}`);
    if (b) { b.className = 'btn-add added'; b.innerHTML = '<i class="fas fa-check"></i> تمت الإضافة'; }
}

function chQty(id, isGift, d) {
    const item = cart.find(x => x.id === id && !!x.isGift === !!isGift);
    if (!item) return;
    item.qty += d;
    if (item.qty <= 0) { delItem(id, isGift); return; }
    save();
    const safeId = String(id).replace(/[^a-zA-Z0-9]/g, '_');
    const uid = isGift ? '_g' : '';
    const qv = document.getElementById(`qv${safeId}${uid}`);
    const cs = document.getElementById(`cs${safeId}${uid}`);
    if (qv) qv.textContent = item.qty;
    if (cs) cs.textContent = (item.finalPrice * item.qty).toLocaleString('ar-DZ') + ' دج';
    refreshSummary();
}

function delItem(id, isGift) {
    const item = cart.find(x => x.id === id && !!x.isGift === !!isGift);
    if (!item) return;
    cart = cart.filter(x => !(x.id === id && !!x.isGift === !!isGift));
    save();
    const safeId = String(id).replace(/[^a-zA-Z0-9]/g, '_');
    const uid = isGift ? '_g' : '';
    const row = document.getElementById(`ci${safeId}${uid}`);
    if (row) {
        row.style.transition = '.22s ease';
        row.style.opacity = '0';
        row.style.transform = 'translateX(28px)';
        setTimeout(renderCart, 230);
    } else {
        renderCart();
    }
    const b = document.getElementById(`ab${safeId}`);
    const stillInCart = cart.find(x => x.id === id);
    if (b && !stillInCart) {
        b.className = 'btn-add'; b.innerHTML = '<i class="fas fa-cart-plus"></i> أضف للسلة';
    }
    showToast(`حُذف "${item.name}" من السلة`, 'err');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => {
        const el = document.getElementById('toast');
        if (el) el.className = 'toast';
    }, 3200);
}

function refreshSummary() {
    let tot = 0, qty = 0;
    cart.forEach(i => { tot += i.finalPrice * i.qty; qty += i.qty; });
    const sumQty = document.getElementById('sumQty');
    const sumTotal = document.getElementById('sumTotal');
    if (sumQty) sumQty.textContent = qty;
    if (sumTotal) sumTotal.textContent = tot.toLocaleString('ar-DZ') + ' دج';
    syncBar();
}

function save() {
    localStorage.setItem('iqra_v2', JSON.stringify(cart));
    const n = cart.reduce((a, b) => a + b.qty, 0);
    const badge = document.getElementById('badge');
    const drBadge = document.getElementById('drBadge');
    if (badge) badge.textContent = n;
    if (drBadge) drBadge.textContent = n;
    syncBar();
}

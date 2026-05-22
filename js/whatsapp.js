// js/whatsapp.js
async function sendOrderWhatsApp() {
    if (cart.length === 0) { showToast('السلة فارغة', 'err'); return; }
    const name = document.getElementById('fName').value.trim();
    const phone = document.getElementById('fPhone').value.trim();
    const state = document.getElementById('fState').value.trim();
    if (!name || !phone || !state) { showToast('يرجى ملء جميع البيانات', 'err'); return; }

    // Validate Algerian phone number
    const phoneClean = phone.replace(/\s/g, '');
    if (!/^(05|06|07)\d{8}$/.test(phoneClean)) {
        showToast('يرجى إدخال رقم هاتف جزائري صحيح (05/06/07...)', 'err');
        return;
    }

    let total = 0;
    let productsText = '';
    let waProducts = '';
    cart.forEach((item, index) => {
        const sub = item.finalPrice * item.qty;
        total += sub;
        productsText += `${item.name} × ${item.qty} | `;
        waProducts += `%0A${index + 1}. ${encodeURIComponent(item.name)}`;
        waProducts += `%0A   الكمية: ${item.qty} | السعر: ${sub.toLocaleString('ar-DZ')} دج%0A`;
    });

    // Record order in Google Apps Script
    const formData = new FormData();
    formData.append('action', 'newOrder');
    formData.append('name', name);
    formData.append('phone', phoneClean);
    formData.append('state', state);
    formData.append('products', productsText);
    formData.append('total', total);
    formData.append('orderDate', new Date().toLocaleString('ar-DZ'));

    const btn = document.getElementById('submitBtn');
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...'; btn.disabled = true; }

    try { await fetch(SCRIPT_URL, { method: 'POST', body: formData }); } catch (err) { console.log(err); }

    if (btn) { btn.innerHTML = '<i class="fas fa-check-circle"></i> إتمام الطلب'; btn.disabled = false; }

    // Build WhatsApp message
    let msg = `🛍️ *طلب جديد من مكتبة إقرأ*%0A`;
    msg += `━━━━━━━━━━━━━━━%0A`;
    msg += `👤 *الاسم:* ${encodeURIComponent(name)}%0A`;
    msg += `📞 *الهاتف:* ${encodeURIComponent(phoneClean)}%0A`;
    msg += `🏙️ *الولاية:* ${encodeURIComponent(state)}%0A`;
    msg += `━━━━━━━━━━━━━━━%0A`;
    msg += `🛒 *المنتجات:*%0A`;
    msg += waProducts;
    msg += `━━━━━━━━━━━━━━━%0A`;
    msg += `💰 *المجموع: ${total.toLocaleString('ar-DZ')} دج*%0A`;
    msg += `🚚 الشحن: مجاني 🎉%0A`;
    msg += `━━━━━━━━━━━━━━━%0A`;
    msg += `✅ الدفع عند الاستلام`;

    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
    showToast('تم تحويلك للواتساب لإتمام الطلب ✓', 'ok');

    cart = [];
    save();
    renderCart();
    document.getElementById('orderForm').reset();
    setTimeout(() => { goHome(); }, 1500);
}

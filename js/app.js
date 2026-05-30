// js/app.js
/* ── CONSTANTS & GLOBALS ── */
const WA_NUMBER = "213655752724";
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz0rYdQkY3MyaYw3Af7TYAEk0I9_eLNzhWf2Wdrzh-ryYwom1Ro_NcvsT1C3zAssnseZw/exec";
const GOOGLE_SHEETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTAa67zBZTQExpINm7B5qe0YGU5NhAEG0TaNiLwK1MT9TrYeZR3ofzonbMO7rGAEYCg4vtBwATKzRaL/pub?gid=0&single=true&output=csv";
const GOOGLE_SHEETS_IMAGES_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTAa67zBZTQExpINm7B5qe0YGU5NhAEG0TaNiLwK1MT9TrYeZR3ofzonbMO7rGAEYCg4vtBwATKzRaL/pub?gid=1315225138&single=true&output=csv";
const GOOGLE_SHEETS_SERVICES_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTAa67zBZTQExpINm7B5qe0YGU5NhAEG0TaNiLwK1MT9TrYeZR3ofzonbMO7rGAEYCg4vtBwATKzRaL/pub?gid=751163247&single=true&output=csv";
const GOOGLE_SHEETS_RATINGS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTAa67zBZTQExpINm7B5qe0YGU5NhAEG0TaNiLwK1MT9TrYeZR3ofzonbMO7rGAEYCg4vtBwATKzRaL/pub?gid=1862185571&single=true&output=csv";

const PRODUCT_CSV_SOURCES = [
    GOOGLE_SHEETS_CSV_URL,
    "https://api.allorigins.win/raw?url=" + encodeURIComponent(GOOGLE_SHEETS_CSV_URL)
];

const SERVICE_CSV_SOURCES = GOOGLE_SHEETS_SERVICES_URL ? [
    GOOGLE_SHEETS_SERVICES_URL,
    "https://api.allorigins.win/raw?url=" + encodeURIComponent(GOOGLE_SHEETS_SERVICES_URL)
] : [];

let PRODS = [];
let imagesRows = [];
let currentProduct = null;
let cart = JSON.parse(localStorage.getItem('iqra_v2') || '[]');
let viewedProducts = JSON.parse(localStorage.getItem('iqra_viewed_products') || '{}');
let cat = 'all';
let searchTimeout;

// تأكد من تحميل DOM أولاً
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded - initializing app");

    initHeroSlider();

    // ✅ عرض صفحة الأكثر مبيعاً مباشرة عند الفتح
    showView('trendingView');

    const params = new URLSearchParams(window.location.search);
    const pid = params.get('product');
    if (pid) {
        const waitProducts = setInterval(() => {
            if (PRODS.length > 0) {
                clearInterval(waitProducts);
                openModal(pid);
            }
        }, 300);
    }

    startCatAutoScroll();

    // بدء جلب البيانات
    fetchProducts();
    fetchServices();
    save();
});

// js/helpers.js
function fallbackImage(seed = 'product') {
    const label = String(seed || 'IQRA').replace(/[^a-zA-Z0-9_\-\u0600-\u06FF ]/g, '').slice(0, 18) || 'IQRA';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8f6ee"/><stop offset="1" stop-color="#d9eadf"/></linearGradient></defs><rect width="800" height="800" fill="url(#g)"/><circle cx="400" cy="330" r="120" fill="#2d6a4f" opacity=".13"/><path d="M270 455h260v36H270zM310 515h180v24H310z" fill="#2d6a4f" opacity=".45"/><text x="400" y="380" text-anchor="middle" font-family="Arial" font-size="48" font-weight="700" fill="#2d6a4f">${label}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function normalizeImageUrl(url) {
    let value = String(url || '').trim();
    if (!value) return '';
    value = value.replace(/^['"]|['"]$/g, '').replace(/&amp;/g, '&').trim();
    const driveFile = value.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
    if (driveFile) return `https://drive.google.com/uc?export=view&id=${driveFile[1]}`;
    const driveOpen = value.match(/[?&]id=([^&]+)/i);
    if (/drive\.google\.com/i.test(value) && driveOpen) {
        return `https://drive.google.com/uc?export=view&id=${driveOpen[1]}`;
    }
    if (value.startsWith('//')) return `https:${value}`;
    return value;
}

function parseSheetInteger(value) {
    const digits = String(value || '').replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : 0;
}

function parseSheetDecimal(value) {
    return parseFloat(String(value || '').replace(',', '.')) || 0;
}

function normalizeProductCategory(value) {
    const raw = String(value || '').trim();
    const normalized = raw
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/[ًٌٍَُِّْـ]/g, '')
        .replace(/\s+/g, ' ');

    const categoryMap = {
        school: ['school', 'ادوات مدرسيه', 'ادوات مكتبيه', 'مكتبي', 'مكتبي ومدرسي', 'مدرسي'],
        gifts: ['gifts', 'gift', 'هدايا', 'هدايا واكسسوارات', 'اكسسوارات'],
        religious: ['religious', 'منتجات دينيه', 'دينيه', 'دين'],
        awards: ['awards', 'تكريم وجوائز', 'تكريم', 'جوائز'],
        print: ['print', 'طباعه حراريه', 'طباعه', 'الطباعه الحراريه'],
        laser: ['laser', 'ليزر', 'خدمات الليزر', 'نقش ليزر'],
        deco: ['deco', 'ديكور', 'الديكور'],
        special: ['special', 'منتجات مميزه', 'مميزه']
    };

    for (const [code, labels] of Object.entries(categoryMap)) {
        if (labels.includes(normalized)) return code;
    }

    return raw || 'all';
}

function getCategoryLabel(value) {
    const labels = {
        all: 'الكل',
        school: 'أدوات مدرسية',
        gifts: 'هدايا',
        religious: 'منتجات دينية',
        awards: 'تكريم وجوائز',
        print: 'طباعة حرارية',
        laser: 'ليزر',
        deco: 'ديكور',
        special: 'منتجات مميزة'
    };
    return labels[normalizeProductCategory(value)] || value || 'عام';
}

function extractImageUrls(value) {
    const raw = String(value || '').trim();
    if (!raw) return [];
    const urlsFromFormula = raw.match(/https?:\/\/[^"'\s,)]+/g);
    if (urlsFromFormula && urlsFromFormula.length) {
        return urlsFromFormula.map(normalizeImageUrl).filter(Boolean);
    }
    return raw.split('|').map(part => normalizeImageUrl(part)).filter(Boolean);
}

function parseCSVLine(text) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') { current += '"'; i++; } else { inQuotes = false; }
            } else { current += char; }
        } else {
            if (char === '"') { inQuotes = true; } else if (char === ',') { result.push(current); current = ''; } else { current += char; }
        }
    }
    result.push(current);
    return result;
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function normalizeServiceIcon(icon) {
    const value = String(icon).trim();
    if (!value) return 'fa-concierge-bell';
    if (value.includes('fa-')) return value.replace(/^fas\s+/, '').replace(/^fa-solid\s+/, '');
    return `fa-${value}`;
}

function normalizeSheetId(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\u0600-\u06FF]+/g, '');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==========================================
// Security & Request Protection
// ==========================================

class SecurityManager {
    constructor() {
        this.requestsCache = {}; // لتتبع طلبات API
        this.rateLimitWindow = 60 * 1000; // دقيقة واحدة
        this.maxRequestsPerWindow = 30; // 30 طلب في الدقيقة
    }

    // ═══ التحقق من معدل الطلبات (Rate Limiting) ═══
    checkRateLimit(identifier = 'global') {
        const now = Date.now();
        
        if (!this.requestsCache[identifier]) {
            this.requestsCache[identifier] = [];
        }

        // تنظيف الطلبات القديمة
        this.requestsCache[identifier] = this.requestsCache[identifier].filter(
            time => now - time < this.rateLimitWindow
        );

        if (this.requestsCache[identifier].length >= this.maxRequestsPerWindow) {
            return {
                allowed: false,
                message: 'تم تجاوز عدد الطلبات المسموح',
                retryAfter: this.rateLimitWindow / 1000
            };
        }

        this.requestsCache[identifier].push(now);

        return {
            allowed: true,
            remaining: this.maxRequestsPerWindow - this.requestsCache[identifier].length
        };
    }

    // ═══ التحقق من صحة المدخلات ═══
    validateInput(data, schema) {
        for (const [key, rules] of Object.entries(schema)) {
            const value = data[key];

            // التحقق من المطلوب
            if (rules.required && !value) {
                return {
                    valid: false,
                    error: `${key} مطلوب`,
                    field: key
                };
            }

            // التحقق من النوع
            if (value && rules.type) {
                const actualType = Array.isArray(value) ? 'array' : typeof value;
                if (actualType !== rules.type) {
                    return {
                        valid: false,
                        error: `${key} يجب أن يكون ${rules.type}`,
                        field: key
                    };
                }
            }

            // التحقق من الطول
            if (value && rules.minLength && value.length < rules.minLength) {
                return {
                    valid: false,
                    error: `${key} يجب أن يكون على الأقل ${rules.minLength} حرف`,
                    field: key
                };
            }

            if (value && rules.maxLength && value.length > rules.maxLength) {
                return {
                    valid: false,
                    error: `${key} يجب ألا يتجاوز ${rules.maxLength} حرف`,
                    field: key
                };
            }

            // التحقق من القيمة الدنيا والعليا
            if (value && rules.min !== undefined && value < rules.min) {
                return {
                    valid: false,
                    error: `${key} يجب أن يكون على الأقل ${rules.min}`,
                    field: key
                };
            }

            if (value && rules.max !== undefined && value > rules.max) {
                return {
                    valid: false,
                    error: `${key} يجب ألا يتجاوز ${rules.max}`,
                    field: key
                };
            }

            // التحقق من التنسيق (regex)
            if (value && rules.pattern && !rules.pattern.test(value)) {
                return {
                    valid: false,
                    error: `${key} يجب أن يتطابق مع الصيغة المطلوبة`,
                    field: key
                };
            }

            // التحقق من القيم المسموحة
            if (value && rules.enum && !rules.enum.includes(value)) {
                return {
                    valid: false,
                    error: `${key} يجب أن تكون إحدى هذه القيم: ${rules.enum.join(', ')}`,
                    field: key
                };
            }
        }

        return { valid: true };
    }

    // ═══ تطهير المدخلات (منع XSS) ═══
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;

        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    // ═══ تشفير البيانات الحساسة ═══
    encryptData(data) {
        try {
            // استخدام btoa للتشفير البسيط (يجب استخدام مكتبة تشفير حقيقية في الإنتاج)
            return btoa(encodeURIComponent(JSON.stringify(data)));
        } catch (error) {
            console.error('Encryption error:', error);
            return null;
        }
    }

    // ═══ فك تشفير البيانات ═══
    decryptData(encrypted) {
        try {
            return JSON.parse(decodeURIComponent(atob(encrypted)));
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }

    // ═══ إنشاء توقيع الطلب (CSRF Protection) ═══
    generateCSRFToken() {
        const token = 'csrf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('csrf_token', token);
        return token;
    }

    // ═══ التحقق من توقيع CSRF ═══
    validateCSRFToken(token) {
        const stored = sessionStorage.getItem('csrf_token');
        return stored && stored === token;
    }

    // ═══ إرسال طلب API محمي ═══
    async secureRequest(url, options = {}) {
        try {
            // التحقق من معدل الطلبات
            const rateLimitCheck = this.checkRateLimit();
            if (!rateLimitCheck.allowed) {
                return {
                    success: false,
                    message: rateLimitCheck.message,
                    code: 'RATE_LIMIT_EXCEEDED'
                };
            }

            // إضافة التوكن إلى الطلب
            const session = auth.getSession();
            if (session) {
                options.headers = options.headers || {};
                options.headers['Authorization'] = `Bearer ${session.token}`;
            }

            // إضافة CSRF token
            if (!options.headers) options.headers = {};
            options.headers['X-CSRF-Token'] = this.generateCSRFToken();

            // إرسال الطلب
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    ...options.headers
                }
            });

            const data = await response.json();

            // تسجيل الطلب
            this.logRequest({
                url,
                method: options.method || 'GET',
                status: response.status,
                success: data.success
            });

            return data;

        } catch (error) {
            console.error('Secure request error:', error);
            return {
                success: false,
                message: 'خطأ في الطلب',
                code: 'REQUEST_ERROR'
            };
        }
    }

    // ═══ تسجيل الطلبات ═══
    logRequest(details) {
        try {
            const log = {
                timestamp: new Date().toISOString(),
                ...details,
                user: auth.getSession()?.username || 'unknown'
            };

            // إرسال للخادم
            fetch('https://script.google.com/macros/s/AKfycbwe6t9eGX6qxjP5KX77LF9-NrwrrjERlb5K_1lSXKl3_NMvNxh9hbgP3IxfW5vqlBh3Iw/exec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `action=logRequest&log=${encodeURIComponent(JSON.stringify(log))}`
            }).catch(e => console.warn('Request log failed:', e));

        } catch (error) {
            console.error('Error logging request:', error);
        }
    }

    // ═══ التحقق من الاتصال الآمن ═══
    requireHTTPS() {
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            console.warn('Not using HTTPS!');
            // يمكن إعادة التوجيه إلى HTTPS
        }
    }

    // ═══ تنظيف بيانات حساسة ═══
    clearSensitiveData() {
        // مسح كلمات المرور من الذاكرة
        sessionStorage.clear();
        // لا تمسح localStorage لأنه يحتوي على الجلسة
    }
}

// إنشاء مثيل عام
const security = new SecurityManager();

// التحقق من HTTPS عند التحميل
security.requireHTTPS();

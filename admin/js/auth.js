// ==========================================
// Admin Authentication System
// ==========================================

class AuthManager {
    constructor() {
        this.storageKey = 'admin_session';
        this.tokenKey = 'admin_token';
        this.failedAttemptsKey = 'admin_failed_attempts';
        this.lockoutDurationMs = 15 * 60 * 1000; // 15 دقيقة
        this.maxFailedAttempts = 5;
        this.sessionTimeoutMs = 60 * 60 * 1000; // ساعة واحدة
    }

    // ═══ تسجيل الدخول ═══
    async login(username, password) {
        try {
            // التحقق من الحظر المؤقت
            if (this.isLockedOut()) {
                return {
                    success: false,
                    message: 'تم حظر المحاولات مؤقتاً. حاول لاحقاً.',
                    code: 'ACCOUNT_LOCKED'
                };
            }

            // التحقق من بيانات المدخلات
            if (!this.validateInput(username, password)) {
                return {
                    success: false,
                    message: 'اسم المستخدم أو كلمة المرور غير صحيحة',
                    code: 'INVALID_CREDENTIALS'
                };
            }

            // التحقق من بيانات الدخول (من backend)
            const response = await this.verifyCredentials(username, password);
            
            if (!response.success) {
                this.recordFailedAttempt();
                return response;
            }

            // إنشاء توكن الجلسة
            const token = this.generateToken();
            const session = {
                token,
                username,
                role: response.role || 'admin',
                createdAt: Date.now(),
                expiresAt: Date.now() + this.sessionTimeoutMs,
                permissions: response.permissions || this.getDefaultPermissions()
            };

            // حفظ الجلسة
            localStorage.setItem(this.storageKey, JSON.stringify(session));
            localStorage.setItem(this.tokenKey, token);
            
            // مسح محاولات فاشلة
            localStorage.removeItem(this.failedAttemptsKey);

            // تسجيل الدخول
            this.logActivity('LOGIN_SUCCESS', { username });

            return {
                success: true,
                message: 'تم تسجيل الدخول بنجاح',
                token,
                user: { username, role: session.role }
            };

        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: 'حدث خطأ أثناء تسجيل الدخول',
                code: 'LOGIN_ERROR'
            };
        }
    }

    // ═══ التحقق من بيانات الدخول ═══
    async verifyCredentials(username, password) {
        try {
            const response = await fetch('https://script.google.com/macros/s/AKfycbwe6t9eGX6qxjP5KX77LF9-NrwrrjERlb5K_1lSXKl3_NMvNxh9hbgP3IxfW5vqlBh3Iw/exec', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `action=verifyAdmin&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
            });

            if (!response.ok) {
                console.error('Server returned non-OK status:', response.status, response.statusText);
                return {
                    success: false,
                    message: 'خطأ في الاتصال بالخادم',
                    code: 'SERVER_ERROR'
                };
            }

            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('Invalid JSON response from server:', parseError);
                return {
                    success: false,
                    message: 'استجابة الخادم غير صالحة',
                    code: 'INVALID_RESPONSE'
                };
            }

            return data;

        } catch (error) {
            console.error('Credentials verification error:', error);
            return {
                success: false,
                message: 'خطأ في الاتصال بالخادم',
                code: 'SERVER_ERROR'
            };
        }
    }

    // ═══ تسجيل الخروج ═══
    logout() {
        try {
            const session = this.getSession();
            if (session) {
                this.logActivity('LOGOUT', { username: session.username });
            }

            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.tokenKey);
            
            return { success: true, message: 'تم تسجيل الخروج بنجاح' };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, message: 'خطأ في تسجيل الخروج' };
        }
    }

    // ═══ الحصول على الجلسة الحالية ═══
    getSession() {
        try {
            const sessionStr = localStorage.getItem(this.storageKey);
            if (!sessionStr) return null;

            const session = JSON.parse(sessionStr);

            // التحقق من انتهاء الجلسة
            if (session.expiresAt < Date.now()) {
                this.logout();
                return null;
            }

            return session;
        } catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    }

    // ═══ التحقق من صحة التوكن ═══
    validateToken(token) {
        const session = this.getSession();
        return session && session.token === token;
    }

    // ═══ التحقق من الصلاحيات ═══
    hasPermission(permission) {
        const session = this.getSession();
        if (!session) return false;

        return session.permissions && session.permissions.includes(permission);
    }

    // ═══ التحقق من الدور ═══
    hasRole(role) {
        const session = this.getSession();
        if (!session) return false;

        return session.role === role;
    }

    // ═══ إعادة تنشيط الجلسة ═══
    refreshSession() {
        const session = this.getSession();
        if (!session) return false;

        session.expiresAt = Date.now() + this.sessionTimeoutMs;
        localStorage.setItem(this.storageKey, JSON.stringify(session));
        
        return true;
    }

    // ═══ دوال مساعدة ═══

    validateInput(username, password) {
        if (!username || !password) return false;
        if (username.length < 3 || password.length < 6) return false;
        if (!/^[a-zA-Z0-9_\-]+$/.test(username)) return false;
        return true;
    }

    generateToken() {
        return 'ADM_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    isLockedOut() {
        const attempts = this.getFailedAttempts();
        if (attempts.count >= this.maxFailedAttempts) {
            const timePassed = Date.now() - attempts.lastAttempt;
            return timePassed < this.lockoutDurationMs;
        }
        return false;
    }

    recordFailedAttempt() {
        let attempts = this.getFailedAttempts();
        attempts.count++;
        attempts.lastAttempt = Date.now();
        localStorage.setItem(this.failedAttemptsKey, JSON.stringify(attempts));
    }

    getFailedAttempts() {
        const str = localStorage.getItem(this.failedAttemptsKey);
        return str ? JSON.parse(str) : { count: 0, lastAttempt: 0 };
    }

    getDefaultPermissions() {
        return [
            'view_dashboard',
            'manage_products',
            'manage_orders',
            'manage_services',
            'manage_categories',
            'manage_customers',
            'manage_settings',
            'view_reports'
        ];
    }

    // ═══ تسجيل الأنشطة (للمراجعة الأمنية) ═══
    logActivity(action, details = {}) {
        try {
            const log = {
                timestamp: new Date().toISOString(),
                action,
                details,
                userAgent: navigator.userAgent,
                url: window.location.href
            };

            // إرسال إلى الخادم
            fetch('https://script.google.com/macros/s/AKfycby4fLeFl5CWXnqTmlugrcXIuAHzd2BOLs2naKARe5MpEvY0hkV3A8DTwErZFnxxhUwcYg/exec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `action=logAudit&log=${encodeURIComponent(JSON.stringify(log))}`
            }).catch(e => console.warn('Audit log failed:', e));

        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    // ═══ تغيير كلمة المرور ═══
    async changePassword(oldPassword, newPassword) {
        const session = this.getSession();
        if (!session) {
            return { success: false, message: 'غير مصرح' };
        }

        if (newPassword.length < 8) {
            return { success: false, message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' };
        }

        try {
            const response = await fetch('https://script.google.com/macros/s/AKfycby4fLeFl5CWXnqTmlugrcXIuAHzd2BOLs2naKARe5MpEvY0hkV3A8DTwErZFnxxhUwcYg/exec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `action=changePassword&username=${session.username}&oldPassword=${encodeURIComponent(oldPassword)}&newPassword=${encodeURIComponent(newPassword)}`
            });

            const data = await response.json();
            
            if (data.success) {
                this.logActivity('PASSWORD_CHANGED', { username: session.username });
            }

            return data;
        } catch (error) {
            return { success: false, message: 'خطأ في تغيير كلمة المرور' };
        }
    }
}

// إنشاء مثيل عام
const auth = new AuthManager();

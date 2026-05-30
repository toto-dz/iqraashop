// ==========================================
// Configuration File for Security System
// ==========================================
// استخدم هذا الملف لتخزين إعدادات الأمان

const SECURITY_CONFIG = {
  // ═══ إعدادات المصادقة ═══
  AUTH: {
    SESSION_TIMEOUT: 60 * 60 * 1000,        // 1 ساعة
    LOCKOUT_DURATION: 15 * 60 * 1000,       // 15 دقيقة
    MAX_FAILED_ATTEMPTS: 5,                 // محاولات قبل الحظر
    PASSWORD_MIN_LENGTH: 8,                 // الحد الأدنى لكلمة المرور
    USERNAME_MIN_LENGTH: 3,                 // الحد الأدنى للاسم
    SESSION_STORAGE_KEY: 'admin_session',
    TOKEN_STORAGE_KEY: 'admin_token',
    REMEMBER_STORAGE_KEY: 'admin_remember_username'
  },

  // ═══ إعدادات معدل الطلبات ═══
  RATE_LIMITING: {
    WINDOW: 60 * 1000,                      // دقيقة واحدة
    MAX_REQUESTS_PER_WINDOW: 30,            // 30 طلب في الدقيقة
    MAX_REQUESTS_PER_HOUR: 1000,            // 1000 طلب في الساعة
    CACHE_TTL: 21600                        // 6 ساعات
  },

  // ═══ إعدادات الصلاحيات ═══
  PERMISSIONS: {
    // الأدوار والصلاحيات
    ROLES: {
      admin: ['*'],  // صلاحيات كاملة
      manager: [
        'view_dashboard',
        'manage_products',
        'manage_orders',
        'manage_services',
        'view_customers',
        'view_reports'
      ],
      editor: [
        'manage_products',
        'manage_services',
        'manage_categories'
      ],
      viewer: [
        'view_dashboard',
        'view_reports'
      ]
    },

    // الصلاحيات المطلوبة لكل عملية
    REQUIRED: {
      'addProduct': 'manage_products',
      'updateProduct': 'manage_products',
      'deleteProduct': 'manage_products',
      'newOrder': 'manage_orders',
      'updateOrderStatus': 'manage_orders',
      'addService': 'manage_services',
      'deleteService': 'manage_services',
      'addCategory': 'manage_categories',
      'deleteCategory': 'manage_categories',
      'updateSettings': 'manage_settings',
      'getOrders': 'view_orders',
      'getCustomers': 'view_customers',
      'getReviews': 'manage_reviews'
    }
  },

  // ═══ إعدادات الحماية ═══
  SECURITY: {
    REQUIRE_HTTPS: true,                    // إجبار استخدام HTTPS
    ENABLE_CSRF: true,                      // تفعيل حماية CSRF
    ENABLE_XSS_PROTECTION: true,            // تفعيل حماية XSS
    ENABLE_RATE_LIMITING: true,             // تفعيل تحديد معدل الطلبات
    ENABLE_AUDIT_LOGGING: true,             // تفعيل التسجيل الأمني
    SANITIZE_INPUTS: true                   // تطهير المدخلات
  },

  // ═══ إعدادات التسجيل ═══
  LOGGING: {
    LOG_LEVEL: 'info',                      // 'debug', 'info', 'warn', 'error'
    LOG_TO_SERVER: true,                    // إرسال الأسجلات للخادم
    LOG_RETENTION_DAYS: 90,                 // احتفظ بالأسجلات 90 يوم
    LOG_SENSITIVE_DATA: false               // لا تسجل كلمات المرور
  },

  // ═══ إعدادات API ═══
  API: {
    TIMEOUT: 30000,                         // 30 ثانية
    RETRY_ATTEMPTS: 3,                      // عدد محاولات إعادة المحاولة
    RETRY_DELAY: 1000,                      // 1 ثانية بين المحاولات
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwe6t9eGX6qxjP5KX77LF9-NrwrrjERlb5K_1lSXKl3_NMvNxh9hbgP3IxfW5vqlBh3Iw/exec'
  },

  // ═══ إعدادات الواجهة ═══
  UI: {
    LOGIN_PAGE: 'login.html',
    ADMIN_PAGE: 'admin.html',
    REDIRECT_ON_UNAUTHORIZED: true,
    SHOW_LOGIN_FORM: true
  }
};

// ═══ تحقق من الإعدادات ═══
function validateSecurityConfig() {
  const checks = {
    AUTH: {
      'SESSION_TIMEOUT > 0': SECURITY_CONFIG.AUTH.SESSION_TIMEOUT > 0,
      'LOCKOUT_DURATION > 0': SECURITY_CONFIG.AUTH.LOCKOUT_DURATION > 0,
      'MAX_FAILED_ATTEMPTS > 0': SECURITY_CONFIG.AUTH.MAX_FAILED_ATTEMPTS > 0
    },
    RATE_LIMITING: {
      'WINDOW > 0': SECURITY_CONFIG.RATE_LIMITING.WINDOW > 0,
      'MAX_REQUESTS_PER_WINDOW > 0': SECURITY_CONFIG.RATE_LIMITING.MAX_REQUESTS_PER_WINDOW > 0
    }
  };

  let allValid = true;
  for (const [section, sectionChecks] of Object.entries(checks)) {
    for (const [check, result] of Object.entries(sectionChecks)) {
      if (!result) {
        console.warn(`⚠️ Config check failed: ${section}.${check}`);
        allValid = false;
      }
    }
  }

  return allValid;
}

// ═══ الحصول على إعداد معين ═══
function getConfig(path) {
  const parts = path.split('.');
  let value = SECURITY_CONFIG;
  
  for (const part of parts) {
    if (value && typeof value === 'object') {
      value = value[part];
    } else {
      return undefined;
    }
  }
  
  return value;
}

// ═══ تعديل إعداد معين ═══
function setConfig(path, value) {
  const parts = path.split('.');
  const lastPart = parts.pop();
  let obj = SECURITY_CONFIG;
  
  for (const part of parts) {
    if (!obj[part]) obj[part] = {};
    obj = obj[part];
  }
  
  obj[lastPart] = value;
}

// التحقق عند التحميل
if (document.readyState !== 'loading') {
  validateSecurityConfig();
} else {
  document.addEventListener('DOMContentLoaded', validateSecurityConfig);
}

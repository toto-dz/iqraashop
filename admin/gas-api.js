// ==========================================
// Google Apps Script - إقرأ ماركت API
// ==========================================
// انسخ هذا الكود وضعه في Google Apps Script (Extensions -> Apps Script من Google Sheets)
// ثم قم بنشره كـ Web App:
// 1. Deploy > New Deployment
// 2. Type: Web App
// 3. Execute as: Me
// 4. Who has access: Anyone
// 5. انسخ رابط الـ Web App وضعه في لوحة التحكم.

const SCRIPT_VERSION = "1.2.0";
const SHEET_NAMES = {
  products: "المنتجات",
  orders: "الطلبيات",
  services: "الخدمات",
  categories: "التصنيفات",
  reviews: "التقييمات",
  views: "المشاهدات",
  settings: "الإعدادات",
  contacts: "الرسائل"
};

const ALLOWED_STATUSES = ['pending', 'processing', 'delivered', 'canceled'];
const ORDER_HEADERS = ['id', 'date', 'customer', 'phone', 'state', 'city', 'products', 'total', 'status'];

function normalizeHeaderKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]+/g, '');
}

function normalizeOrderStatus(value) {
  const text = String(value || '').trim().toLowerCase();
  const map = {
    'new': 'pending',
    'جديد': 'pending',
    'pending': 'pending',
    'قيد الانتظار': 'pending',
    'processing': 'processing',
    'in progress': 'processing',
    'in_progress': 'processing',
    'قيد المعالجة': 'processing',
    'delivered': 'delivered',
    'completed': 'completed',
    'done': 'delivered',
    'تم التوصيل': 'delivered',
    'cancelled': 'canceled',
    'canceled': 'canceled',
    'ملغى': 'canceled',
    'ملغي': 'canceled'
  };
  return map[text] || 'pending';
}

function formatOrderProducts(value) {
  const text = String(value || '').replace(/\r/g, '').trim();
  if (!text) return '';
  return text.split(/\r?\n/).map(item => String(item).trim()).filter(Boolean).join('\n');
}

function ensureOrderHeaders(sheet) {
  const expected = ORDER_HEADERS;
  const lastCol = Math.max(sheet.getLastColumn(), expected.length);
  const current = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => normalizeHeaderKey(h));
  const mismatch = expected.some((header, index) => current[index] !== header);
  if (sheet.getLastRow() === 0 || mismatch) {
    sheet.getRange(1, 1, 1, expected.length).setValues([expected]);
  }
}

function findOrderColumnIndex(headers, keys) {
  const normalized = headers.map(h => normalizeHeaderKey(h));
  for (let i = 0; i < keys.length; i++) {
    const idx = normalized.indexOf(normalizeHeaderKey(keys[i]));
    if (idx !== -1) return idx;
  }
  return -1;
}

function generateOrderId(sheet) {
  const tz = sheet && sheet.getParent && sheet.getParent().getSpreadsheetTimeZone ? sheet.getParent().getSpreadsheetTimeZone() : 'GMT';
  const today = Utilities.formatDate(new Date(), tz, 'yyyyMMdd');
  const data = sheet.getDataRange().getValues();
  let seq = 0;
  const pattern = new RegExp('^ORD-' + today + '-(\\d{3})$', 'i');
  for (let i = 1; i < data.length; i++) {
    const current = String(data[i][0] || '').trim();
    const match = current.match(pattern);
    if (match) {
      seq = Math.max(seq, parseInt(match[1], 10) || 0);
    }
  }
  return 'ORD-' + today + '-' + String(seq + 1).padStart(3, '0');
}

function doPost(e) {
  try {
    if (!e || !e.parameter) {
      return createJsonResponse({ success: false, message: "No parameters provided" });
    }

    const action = e.parameter.action || '';
    const target = e.parameter.target; // products, orders, services, reviews, views, categories, settings

    if (action === "verifyAdmin") {
      return createJsonResponse(verifyAdminCredentials(e.parameter.username, e.parameter.password));
    } else if (action === "logAudit") {
      try {
        if (e.parameter.log) {
          const logEntry = JSON.parse(e.parameter.log);
          logSecurityEvent(logEntry.eventType || 'CLIENT_AUDIT', logEntry.details || logEntry);
        }
      } catch (auditError) {
        console.warn('Audit log parse error:', auditError);
      }
      return createJsonResponse({ success: true, message: 'Audit logged' });
    } else if (action === "addProduct" || action === "updateProduct") {
      return handleSaveItem(e.parameter, "products");
    } else if (action === "deleteProduct") {
      return handleDeleteItem(e.parameter, "products");
    } else if (action === "newOrder") {
      return handleNewOrder(e.parameter);
    } else if (action === "updateOrderStatus") {
      return handleUpdateOrderStatus(e.parameter);
    } else if (action === "addService" || action === "updateService") {
      return handleSaveItem(e.parameter, "services");
    } else if (action === "deleteService") {
      return handleDeleteItem(e.parameter, "services");
    } else if (action === "addCategory" || action === "updateCategory") {
      return handleSaveItem(e.parameter, "categories");
    } else if (action === "deleteCategory") {
      return handleDeleteItem(e.parameter, "categories");
    } else if (action === "updateReview") {
      return handleUpdateReview(e.parameter);
    } else if (action === "deleteReview") {
      return handleDeleteItem(e.parameter, "reviews");
    } else if (action === "incrementView" || action === "recordView") {
      return handleIncrementView(e.parameter);
    } else if (action === "contactMessage") {
      return handleContactMessage(e.parameter);
    } else if (action === "updateSettings") {
      return handleUpdateSettings(e.parameter);
    }

    return createJsonResponse({ success: false, message: "Unknown action" });

  } catch (error) {
    return createJsonResponse({ success: false, message: error.toString() });
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === "getProducts") return createJsonResponse({ success: true, data: getSheetData("products") });
    if (action === "getOrders") return createJsonResponse({ success: true, data: getSheetData("orders") });
    if (action === "getServices") return createJsonResponse({ success: true, data: getSheetData("services") });
    if (action === "getCategories") return createJsonResponse({ success: true, data: getSheetData("categories") });
    if (action === "getReviews") return createJsonResponse({ success: true, data: getSheetData("reviews") });
    if (action === "getViews") return createJsonResponse({ success: true, data: getSheetData("views") });
    if (action === "getSettings") return createJsonResponse({ success: true, data: getSettingsAsObject() });
    if (action === "getDashboardStats") return handleDashboardStats();

    return createJsonResponse({ success: false, message: "Unknown GET action" });
  } catch (error) {
    return createJsonResponse({ success: false, message: error.toString() });
  }
}

// ==========================================
// Handlers
// ==========================================

function handleSaveItem(params, sheetName) {
  const sheet = getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const id = String(params.id || "").trim();
  if (!id) return createJsonResponse({ success: false, message: "Missing id" });
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === String(id).toLowerCase()) {
      rowIndex = i + 1;
      break;
    }
  }

  const rowData = [];
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    rowData.push(params[header] !== undefined ? params[header] : "");
  }

  if (rowIndex > -1) {
    // Update
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    return createJsonResponse({ success: true, action: "updated", sheetName: sheetName, id: id });
  } else {
    // Add
    sheet.appendRow(rowData);
    return createJsonResponse({ success: true, action: "created", sheetName: sheetName, id: id });
  }
}

function handleDeleteItem(params, sheetName) {
  const sheet = getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const id = params.id;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === String(id).toLowerCase()) {
      sheet.deleteRow(i + 1);
      return createJsonResponse({ success: true, action: "deleted", sheetName: sheetName });
    }
  }
  return createJsonResponse({ success: false, message: "Item not found" });
}

function handleUpdateOrderStatus(params) {
  const sheet = getSheetByName("orders");
  ensureOrderHeaders(sheet);
  const data = sheet.getDataRange().getValues();
  const id = String(params.id || '').trim();
  const status = normalizeOrderStatus(String(params.status || "").trim());
  if (!ALLOWED_STATUSES.includes(status)) {
    return createJsonResponse({ success: false, message: "Invalid order status" });
  }

  const headers = data[0].map(h => String(h || '').trim());
  const idColIndex = findOrderColumnIndex(headers, ['id', 'order_id', 'orderid', 'رقم الطلب']);
  const statusColIndex = findOrderColumnIndex(headers, ['status', 'order_status', 'orderstatus', 'الحالة']);

  if (idColIndex === -1 || statusColIndex === -1) {
    return createJsonResponse({ success: false, message: "Status or ID column not found" });
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex] || '').trim() === id) {
      sheet.getRange(i + 1, statusColIndex + 1).setValue(status);
      return createJsonResponse({ success: true, action: "updated" });
    }
  }
  return createJsonResponse({ success: false, message: "Order not found" });
}

function handleUpdateReview(params) {
  const sheet = getSheetByName("reviews");
  const data = sheet.getDataRange().getValues();
  const id = params.id;
  const status = params.status;
  const statusColIndex = data[0].indexOf("status") + 1;

  if (statusColIndex === 0) return createJsonResponse({ success: false, message: "Status column not found" });

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.getRange(i + 1, statusColIndex).setValue(status);
      return createJsonResponse({ success: true, action: "updated" });
    }
  }
  return createJsonResponse({ success: false, message: "Review not found" });
}

function handleNewOrder(params) {
  const name = String(params.name || params.customer || '').trim();
  const phone = String(params.phone || '').trim();
  const products = formatOrderProducts(params.products || '');
  const totalRaw = String(params.total || '').trim();
  const orderDate = String(params.orderDate || params.date || new Date().toLocaleString('ar-DZ'));
  const status = normalizeOrderStatus(params.status || 'pending');
  const state = String(params.state || params.address || '').trim();
  const city = String(params.city || '').trim();

  const total = parseFloat(totalRaw);
  if (!name) return createJsonResponse({ success: false, message: "Order creation failed: name is required" });
  if (!phone || !/^(05|06|07)\d{8}$/.test(phone)) return createJsonResponse({ success: false, message: "Order creation failed: invalid phone" });
  if (!state) return createJsonResponse({ success: false, message: "Order creation failed: state/address is required" });
  if (!products) return createJsonResponse({ success: false, message: "Order creation failed: products are required" });
  if (!Number.isFinite(total) || total <= 0) return createJsonResponse({ success: false, message: "Order creation failed: invalid total" });

  const sheet = getSheetByName("orders");
  ensureOrderHeaders(sheet);
  const orderId = generateOrderId(sheet);
  if (!ALLOWED_STATUSES.includes(status)) {
    return createJsonResponse({ success: false, message: "Order creation failed: invalid status" });
  }

  sheet.appendRow([orderId, orderDate, name, phone, state, city, products, total, status]);
  return createJsonResponse({ success: true, action: "created", orderId: orderId });
}

function handleIncrementView(params) {
  const sheet = getSheetByName("views");
  const productId =
    params.product_id ||
    params.productId ||
    params.productID ||
    params.product ||
    params.id ||
    '';
  const productName = String(params.productName || params.name || '').trim();
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h || '').trim().toLowerCase());

  const idCol = headers.findIndex(h => ["product_id", "product id", "id", "product"].some(k => h === k || h.includes(k)));
  const viewsCol = headers.findIndex(h => ["views", "مشاهدات", "زيارات"].some(k => h === k || h.includes(k)));
  const nameCol = headers.findIndex(h => ["product_name", "product name", "name", "title"].some(k => h === k || h.includes(k)));

  const targetId = String(productId || '').toLowerCase();
  if (!targetId) {
    return createJsonResponse({ success: false, message: "Missing product_id" });
  }
  if (idCol < 0 || viewsCol < 0) {
    return createJsonResponse({ success: false, message: "Views sheet headers are invalid" });
  }

  let rowIndex = -1;
  let currentViews = 0;
  for (let i = 1; i < data.length; i++) {
    const currentId = String(data[i][idCol] || '').toLowerCase();
    if (currentId === targetId) {
      rowIndex = i + 1;
      currentViews = parseInt(data[i][viewsCol]) || 0;
      break;
    }
  }

  if (rowIndex > -1) {
    sheet.getRange(rowIndex, viewsCol + 1).setValue(currentViews + 1);
    if (nameCol > -1 && productName) {
      sheet.getRange(rowIndex, nameCol + 1).setValue(productName);
    }
  } else {
    const row = new Array(headers.length).fill('');
    row[idCol] = targetId;
    row[viewsCol] = 1;
    if (nameCol > -1 && productName) {
      row[nameCol] = productName;
    }
    sheet.appendRow(row);
  }

  const nextViews = rowIndex > -1 ? currentViews + 1 : 1;
  return createJsonResponse({ success: true, action: "incremented", views: nextViews });
}

function handleContactMessage(params) {
  const sheet = getSheetByName("contacts");
  const name = params.name || '';
  const phone = params.phone || '';
  const email = params.email || '';
  const message = params.message || '';
  const date = new Date().toISOString();

  sheet.appendRow([name, phone, email, message, date]);
  return createJsonResponse({ success: true, action: "saved" });
}

function handleUpdateSettings(params) {
  const sheet = getSheetByName("settings");
  // Assuming settings sheet has 2 columns: key, value
  const keys = Object.keys(params);
  // We can just clear and rewrite or update row by row
  // For simplicity, we just delete all except headers and rewrite
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).clearContent();
  }
  
  const rows = [];
  for (let k of keys) {
    if (k !== 'action') {
      rows.push([k, params[k]]);
    }
  }
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }
  
  return createJsonResponse({ success: true, action: "updated" });
}

function handleDashboardStats() {
  const products = getSheetData("products").length;
  const ordersData = getSheetData("orders");
  const orders = ordersData.length;
  const newOrders = ordersData.filter(o => normalizeOrderStatus(o.status) === "pending").length;
  
  let revenue = 0;
  ordersData.filter(o => normalizeOrderStatus(o.status) === "delivered").forEach(o => {
    revenue += parseFloat(o.total) || 0;
  });

  const viewsData = getSheetData("views");
  let totalViews = 0;
  viewsData.forEach(v => { totalViews += parseInt(v.views) || 0; });

  const customers = new Set(ordersData.map(o => o.customer)).size;

  return createJsonResponse({
    success: true,
    data: {
      products,
      orders,
      newOrders,
      revenue,
      totalViews,
      customers
    }
  });
}

// ==========================================
// Utils
// ==========================================

function getSheetByName(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mappedName = SHEET_NAMES[name] || name;
  const sheet = ss.getSheetByName(mappedName);
  if (!sheet) throw new Error("Required sheet not found: " + mappedName);
  return sheet;
}

function getSheetData(name) {
  const sheet = getSheetByName(name);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0];
  const result = [];

  for (let i = 1; i < data.length; i++) {
    let row = data[i];
    let obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    result.push(obj);
  }
  return result;
}

function getSettingsAsObject() {
  const sheet = getSheetByName("settings");
  const data = sheet.getDataRange().getValues();
  const obj = {};
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      obj[data[i][0]] = data[i][1];
    }
  }
  return obj;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}


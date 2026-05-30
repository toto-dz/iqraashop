// This public CSV URL is read-only. The website uses it to display products.
// Do not paste it in the admin panel as the Web App URL.
const PRODUCTS_PUBLIC_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTAa67zBZTQExpINm7B5qe0YGU5NhAEG0TaNiLwK1MT9TrYeZR3ofzonbMO7rGAEYCg4vtBwATKzRaL/pub?gid=0&single=true&output=csv';

// If this script is opened from Extensions > Apps Script inside the products
// spreadsheet, getActiveSpreadsheet() is used and this ID is not needed.
// If you run this as a standalone Apps Script, replace this with the real ID
// from the editable spreadsheet URL:
// https://docs.google.com/spreadsheets/d/REAL_SPREADSHEET_ID/edit
const SPREADSHEET_ID = '';
const PRODUCTS_SHEET_GID = 0;
const PRODUCTS_SHEET_NAMES = ['products', 'Products', 'المنتجات', 'منتجات'];
const PRODUCT_HEADERS = ['id', 'name', 'price', 'cat', 'discount', 'tag', 'img', 'img_view', 'desc', 'works', 'imgs', 'stock'];

function doPost(e) {
  try {
    const params = e.parameter || {};
    const action = String(params.action || '').trim();

    if (action === 'addProduct') return jsonResponse(upsertProduct_(params));
    if (action === 'deleteProduct') return jsonResponse(deleteProduct_(params));

    return jsonResponse({ success: false, message: 'Unknown action: ' + action });
  } catch (error) {
    return jsonResponse({ success: false, message: error.message });
  }
}

function upsertProduct_(params) {
  const sheet = getProductsSheet_();
  const headers = validateProductsHeaders_(sheet);
  const id = clean_(params.id) || ('p' + Date.now());
  const row = productToRow_(params, headers, id);
  const existingRow = findRowById_(sheet, headers, id);

  if (existingRow > 1) {
    sheet.getRange(existingRow, 1, 1, PRODUCT_HEADERS.length).setValues([row]);
    return { success: true, action: 'updated', id: id, rowNumber: existingRow, sheetName: sheet.getName() };
  }

  sheet.appendRow(row);
  return { success: true, action: 'created', id: id, rowNumber: sheet.getLastRow(), sheetName: sheet.getName() };
}

function deleteProduct_(params) {
  const sheet = getProductsSheet_();
  const headers = validateProductsHeaders_(sheet);
  const id = clean_(params.id);
  let rowNumber = id ? findRowById_(sheet, headers, id) : 0;

  if (rowNumber <= 1 && params.rowNumber) {
    const candidate = parseInt(params.rowNumber, 10);
    if (candidate > 1 && candidate <= sheet.getLastRow()) rowNumber = candidate;
  }

  if (rowNumber <= 1) rowNumber = findRowByProductFields_(sheet, headers, params);
  if (rowNumber <= 1) return { success: false, message: 'Product row not found in products sheet' };

  sheet.deleteRow(rowNumber);
  return { success: true, action: 'deleted', rowNumber: rowNumber, sheetName: sheet.getName() };
}

function getProductsSheet_() {
  const ss = getSpreadsheet_();

  for (const name of PRODUCTS_SHEET_NAMES) {
    const sheet = ss.getSheetByName(name);
    if (sheet) return sheet;
  }

  const byGid = ss.getSheets().find(sheet => sheet.getSheetId() === PRODUCTS_SHEET_GID);
  if (byGid) return byGid;

  throw new Error('Products sheet not found. Use a fixed sheet name like "المنتجات" only.');
}

function getSpreadsheet_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;

  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (error) {
    throw new Error('Open Apps Script from inside the products Google Sheet, or replace SPREADSHEET_ID with the real spreadsheet ID from the edit URL. The public CSV URL is read-only and cannot be used for add/delete.');
  }
}

function validateProductsHeaders_(sheet) {
  const headers = sheet
    .getRange(1, 1, 1, PRODUCT_HEADERS.length)
    .getValues()[0]
    .map(value => clean_(value).toLowerCase());

  const isValid = PRODUCT_HEADERS.every((header, index) => headers[index] === header);
  if (!isValid) {
    throw new Error('Products sheet headers must be exactly: ' + PRODUCT_HEADERS.join(', '));
  }

  return PRODUCT_HEADERS.slice();
}

function productToRow_(params, headers, id) {
  const values = {
    id: id,
    name: clean_(params.name),
    price: number_(params.price),
    cat: clean_(params.cat),
    discount: number_(params.discount),
    tag: clean_(params.tag),
    img: clean_(params.img),
    img_view: clean_(params.img_view),
    desc: clean_(params.desc),
    works: truthy_(params.works) ? 'TRUE' : 'FALSE',
    imgs: clean_(params.imgs),
    stock: number_(params.stock)
  };

  return headers.map(header => values[header] !== undefined ? values[header] : '');
}

function findRowById_(sheet, headers, id) {
  const idCol = headers.indexOf('id') + 1;
  if (!idCol || !id) return 0;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const values = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (clean_(values[i][0]).toLowerCase() === id.toLowerCase()) return i + 2;
  }
  return 0;
}

function findRowByProductFields_(sheet, headers, params) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const nameCol = headers.indexOf('name');
  const priceCol = headers.indexOf('price');
  const stockCol = headers.indexOf('stock');
  const imgCol = headers.indexOf('img');

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sameName = nameCol < 0 || clean_(row[nameCol]) === clean_(params.name);
    const samePrice = priceCol < 0 || number_(row[priceCol]) === number_(params.price);
    const sameStock = stockCol < 0 || number_(row[stockCol]) === number_(params.stock);
    const sameImg = imgCol < 0 || clean_(row[imgCol]) === clean_(params.img);

    if (sameName && samePrice && sameStock && sameImg) return i + 2;
  }
  return 0;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function clean_(value) {
  return String(value == null ? '' : value).trim();
}

function number_(value) {
  const digits = clean_(value).replace(/[^\d.]/g, '');
  return digits ? Number(digits) || 0 : 0;
}

function truthy_(value) {
  return ['true', '1', 'yes', 'on'].includes(clean_(value).toLowerCase());
}

/**
 * Excel & CSV Processing Service
 * Handles reading spreadsheets, sheet selection, complex workbook parsing,
 * header & data start row detection, summary row filtering (סה"כ),
 * category extraction & classification, formula error handling (#VALUE!, #REF!),
 * interactive mapping, data validation, duplicate checks, and multi-sheet Excel export.
 */

import { storage } from './storageAdapter.js';

export class ExcelService {

  /**
   * Parse uploaded file (.xlsx, .xls, .csv) into workbook object
   */
  async readWorkbook(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          if (typeof XLSX === 'undefined') {
            throw new Error('ספריית SheetJS (XLSX) אינה זמינה בדף');
          }
          const workbook = XLSX.read(data, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });
          resolve(workbook);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Auto-detect best normalized sheet name if present
   */
  findNormalizedSheetName(workbook) {
    if (!workbook || !workbook.SheetNames) return null;
    const names = workbook.SheetNames;
    const normalizedMatch = names.find(n => {
      const lower = n.trim().toLowerCase();
      return lower === 'import_transactions' || lower === 'transactions' || lower === 'תנועות' || lower === 'ייבוא_תנועות';
    });
    return normalizedMatch || names[0];
  }

  /**
   * Get raw sheet rows as 2D array [row0, row1, row2, ...]
   */
  getSheetRawData(workbook, sheetName) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  }

  /**
   * Smartly detect candidate header row index and data start row index in a sheet
   */
  detectHeaderAndDataRows(rawRows) {
    if (!rawRows || rawRows.length === 0) {
      return { headerRowIdx: 0, dataStartRowIdx: 1 };
    }

    let bestHeaderIdx = 0;
    let maxScore = -1;

    // Inspect first 25 rows
    const searchDepth = Math.min(25, rawRows.length);
    for (let r = 0; r < searchDepth; r++) {
      const row = rawRows[r];
      if (!row || !Array.isArray(row)) continue;

      let score = 0;
      row.forEach(cell => {
        const str = String(cell).trim().toLowerCase();
        if (str.includes('תאריך') || str.includes('date')) score += 3;
        if (str.includes('סכום') || str.includes('amount') || str.includes('חובה') || str.includes('זכות')) score += 3;
        if (str.includes('קטגוריה') || str.includes('category')) score += 2;
        if (str.includes('מי') || str.includes('אדם') || str.includes('person')) score += 2;
        if (str.includes('תיאור') || str.includes('עסק') || str.includes('הערה') || str.includes('description') || str.includes('note')) score += 2;
        if (str.includes('סוג') || str.includes('type')) score += 1;
      });

      if (score > maxScore && score >= 3) {
        maxScore = score;
        bestHeaderIdx = r;
      }
    }

    const dataStartRowIdx = Math.min(bestHeaderIdx + 1, rawRows.length - 1);
    return { headerRowIdx: bestHeaderIdx, dataStartRowIdx };
  }

  /**
   * Auto-detect matching column indices from header row
   */
  autoDetectColumns(headerRow) {
    const mapping = {
      dateCol: -1,
      amountCol: -1,
      categoryCol: -1,
      subcategoryCol: -1,
      typeCol: -1,
      descriptionCol: -1,
      personCol: -1
    };

    if (!headerRow || !Array.isArray(headerRow)) return mapping;

    headerRow.forEach((h, idx) => {
      const headerStr = String(h).trim().toLowerCase();

      // Date heuristics
      if (mapping.dateCol === -1 && (headerStr.includes('תאריך') || headerStr.includes('date'))) {
        mapping.dateCol = idx;
      }
      // Amount heuristics
      if (mapping.amountCol === -1 && (headerStr.includes('סכום') || headerStr.includes('amount') || headerStr.includes('חובה') || headerStr.includes('זכות'))) {
        mapping.amountCol = idx;
      }
      // Category heuristics
      if (mapping.categoryCol === -1 && (headerStr.includes('קטגוריה') || headerStr.includes('category') || headerStr.includes('ענף'))) {
        mapping.categoryCol = idx;
      }
      // Subcategory heuristics
      if (mapping.subcategoryCol === -1 && (headerStr.includes('תת קטגוריה') || headerStr.includes('תת-קטגוריה') || headerStr.includes('subcategory'))) {
        mapping.subcategoryCol = idx;
      }
      // Type heuristics
      if (mapping.typeCol === -1 && (headerStr.includes('סוג') || headerStr.includes('type'))) {
        mapping.typeCol = idx;
      }
      // Description heuristics
      if (mapping.descriptionCol === -1 && (headerStr.includes('תיאור') || headerStr.includes('עסק') || headerStr.includes('הערה') || headerStr.includes('description') || headerStr.includes('note'))) {
        mapping.descriptionCol = idx;
      }
      // Person heuristics
      if (mapping.personCol === -1 && (headerStr.includes('מי') || headerStr.includes('אדם') || headerStr.includes('גורם') || headerStr.includes('משתמש') || headerStr.includes('person'))) {
        mapping.personCol = idx;
      }
    });

    return mapping;
  }

  /**
   * Check if a row represents a summary / total row (סה"כ / Total)
   */
  isSummaryRow(row) {
    if (!row || !Array.isArray(row)) return false;
    return row.some(cell => {
      if (!cell) return false;
      const str = String(cell).trim().toLowerCase();
      return str.startsWith('סה"כ') || str.startsWith('סך הכל') || str.startsWith('סה״כ') ||
             str.startsWith('סיכום') || str.startsWith('total') || str.startsWith('summary') ||
             str === 'סהכ';
    });
  }

  /**
   * Extract unique categories found in the imported file data starting from dataStartRowIdx
   */
  extractUniqueCategories(rows, categoryColIdx, dataStartRowIdx = 1) {
    if (!rows || rows.length <= dataStartRowIdx || categoryColIdx < 0) return [];

    const dataRows = rows.slice(dataStartRowIdx);
    const categorySet = new Map();

    dataRows.forEach(row => {
      if (!row || this.isSummaryRow(row)) return;
      const rawVal = row[categoryColIdx];
      if (rawVal === undefined || rawVal === null) return;
      const strVal = String(rawVal).trim();
      
      // Skip empty strings, headers, or formula error strings
      if (!strVal || this.isFormulaError(strVal)) return;

      if (!categorySet.has(strVal)) {
        const classifiedKind = this.classifyCategoryKind(strVal);
        categorySet.set(strVal, {
          name: strVal,
          kind: classifiedKind,
          icon: this.getDefaultIconForKind(classifiedKind, strVal),
          color: this.getDefaultColorForKind(classifiedKind)
        });
      }
    });

    return Array.from(categorySet.values());
  }

  /**
   * Heuristic classifier: Classify category name into income, expense, or savings
   */
  classifyCategoryKind(catName) {
    const str = catName.toLowerCase();

    // Income keywords
    if (
      str.includes('משכורת') || str.includes('הכנסה') || str.includes('שכר') ||
      str.includes('עסק') || str.includes('בונוס') || str.includes('דיבידנד') ||
      str.includes('תשואה') || str.includes('קצבה') || str.includes('מענק') ||
      str.includes('salary') || str.includes('income') || str.includes('revenue')
    ) {
      return 'income';
    }

    // Savings keywords
    if (
      str.includes('חיסכון') || str.includes('קרן') || str.includes('השקע') ||
      str.includes('השתלמות') || str.includes('חירום') || str.includes('נופש') ||
      str.includes('חופשה') || str.includes('פנסיה') || str.includes('גמל') ||
      str.includes('savings') || str.includes('investment') || str.includes('fund')
    ) {
      return 'savings';
    }

    return 'expense';
  }

  getDefaultIconForKind(kind, name) {
    if (kind === 'income') return '💰';
    if (kind === 'savings') return '🐖';
    if (name.includes('סופר') || name.includes('מזון') || name.includes('אוכל')) return '🍔';
    if (name.includes('רכב') || name.includes('דלק')) return '🚘';
    if (name.includes('דיור') || name.includes('חשמל') || name.includes('שכר דירה')) return '🏠';
    return '📌';
  }

  getDefaultColorForKind(kind) {
    if (kind === 'income') return '#059669';
    if (kind === 'savings') return '#4f46e5';
    return '#3b82f6';
  }

  /**
   * Check if a string represents an Excel formula error
   */
  isFormulaError(val) {
    if (!val) return false;
    const str = String(val).trim().toUpperCase();
    return str.startsWith('#VALUE!') || str.startsWith('#REF!') || str.startsWith('#DIV/0!') ||
           str.startsWith('#N/A') || str.startsWith('#NAME?') || str.startsWith('#NULL!') || str.startsWith('#NUM!');
  }

  /**
   * Normalize and validate rows based on user column mapping, header offset, and data start offset
   */
  validateAndPrepareImportRows(rows, mapping, existingTransactions, categoryMap = {}, dataStartRowIdx = 1) {
    if (!rows || rows.length <= dataStartRowIdx) return [];

    const dataRows = rows.slice(dataStartRowIdx);
    const validatedRows = [];

    dataRows.forEach((row, idx) => {
      const realExcelRowIdx = dataStartRowIdx + idx + 1; // 1-indexed Excel row

      // Ignore empty or summary rows
      if (!row || row.every(cell => cell === '' || cell === null || cell === undefined) || this.isSummaryRow(row)) {
        return;
      }

      const rawDate = mapping.dateCol >= 0 ? row[mapping.dateCol] : '';
      const rawAmount = mapping.amountCol >= 0 ? row[mapping.amountCol] : '';
      const rawCategory = mapping.categoryCol >= 0 ? row[mapping.categoryCol] : '';
      const rawSubcategory = mapping.subcategoryCol >= 0 ? row[mapping.subcategoryCol] : '';
      const rawType = mapping.typeCol >= 0 ? row[mapping.typeCol] : '';
      const rawNote = mapping.descriptionCol >= 0 ? row[mapping.descriptionCol] : '';
      const rawPerson = mapping.personCol >= 0 ? row[mapping.personCol] : 'Вмести';

      const errors = [];

      // Formula error checks
      if (this.isFormulaError(rawDate)) errors.push('שגיאת נוסחה בתאריך (#VALUE!/#REF!)');
      if (this.isFormulaError(rawAmount)) errors.push('שגיאת נוסחה בסכום (#VALUE!/#REF!)');
      if (this.isFormulaError(rawCategory)) errors.push('שגיאת נוסחה בקטגוריה');

      const parsedDate = this.parseDate(rawDate);
      const parsedAmount = this.parseAmount(rawAmount);

      if (!parsedDate.valid && !this.isFormulaError(rawDate)) errors.push('תאריך לא תקין');
      if ((isNaN(parsedAmount) || parsedAmount === 0) && !this.isFormulaError(rawAmount)) errors.push('סכום לא חוקי');

      // Final Category Name resolution after mapping
      const originalCatStr = String(rawCategory || '🎈אחר').trim();
      const finalCategory = categoryMap[originalCatStr] ? categoryMap[originalCatStr].targetName : (originalCatStr || '🎈אחר');

      // Determine transaction type (income, expense, savings)
      let type = 'expense';
      if (categoryMap[originalCatStr]) {
        type = categoryMap[originalCatStr].kind || 'expense';
      } else {
        const typeStr = String(rawType).toLowerCase();
        if (typeStr.includes('הכנסה') || typeStr.includes('income') || (parsedAmount > 0 && originalCatStr.includes('משכורת'))) {
          type = 'income';
        } else if (typeStr.includes('חיסכון') || typeStr.includes('savings')) {
          type = 'savings';
        }
      }

      const absAmount = Math.abs(parsedAmount || 0);

      // Duplicate Check
      const isDuplicate = existingTransactions.some(existing => {
        return existing.date === parsedDate.isoDate &&
               Math.abs(existing.amount - absAmount) < 0.01 &&
               (existing.note || '').trim().toLowerCase() === String(rawNote).trim().toLowerCase();
      });

      validatedRows.push({
        rowIndex: realExcelRowIdx,
        date: parsedDate.isoDate || new Date().toISOString().split('T')[0],
        formattedDate: parsedDate.displayDate || rawDate,
        amount: absAmount,
        type,
        category: finalCategory,
        subcategory: String(rawSubcategory || '').trim(),
        note: String(rawNote || '').trim(),
        person: String(rawPerson || 'Вмести').trim(),
        isValid: errors.length === 0,
        isDuplicate,
        errors
      });
    });

    return validatedRows;
  }

  /**
   * Helper: Parse flexible date formats (ISO, DD/MM/YYYY, Excel date object/number)
   */
  parseDate(val) {
    if (!val) return { valid: false };

    if (val instanceof Date) {
      if (isNaN(val.getTime())) return { valid: false };
      const iso = val.toISOString().split('T')[0];
      return { valid: true, isoDate: iso, displayDate: iso };
    }

    const str = String(val).trim();
    // Match DD/MM/YYYY
    const ddmmyyyy = str.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})$/);
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, '0');
      const month = ddmmyyyy[2].padStart(2, '0');
      const year = ddmmyyyy[3];
      const isoDate = `${year}-${month}-${day}`;
      return { valid: true, isoDate, displayDate: `${day}/${month}/${year}` };
    }

    // Match YYYY-MM-DD
    const yyyymmdd = str.match(/^(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})$/);
    if (yyyymmdd) {
      const year = yyyymmdd[1];
      const month = yyyymmdd[2].padStart(2, '0');
      const day = yyyymmdd[3].padStart(2, '0');
      const isoDate = `${year}-${month}-${day}`;
      return { valid: true, isoDate, displayDate: `${day}/${month}/${year}` };
    }

    // Excel serial number
    if (!isNaN(str) && Number(str) > 30000 && Number(str) < 60000) {
      const dateObj = new Date((Number(str) - (25567 + 2)) * 86400 * 1000);
      const isoDate = dateObj.toISOString().split('T')[0];
      return { valid: true, isoDate, displayDate: isoDate };
    }

    return { valid: false };
  }

  /**
   * Helper: Parse amount string (removing ₪, $, commas)
   */
  parseAmount(val) {
    if (typeof val === 'number') return val;
    if (!val) return NaN;
    const cleaned = String(val).replace(/[₪$€,\s]/g, '');
    return parseFloat(cleaned);
  }

  /**
   * Export all application data to multi-sheet Excel file (.xlsx)
   */
  exportToExcel() {
    if (typeof XLSX === 'undefined') {
      alert('ספריית הייצוא לא נטענה. אנא נסה שוב.');
      return;
    }

    const transactions = storage.getTransactions();
    const categories = storage.getCategories();
    const goals = storage.getSavingsGoals();
    const settings = storage.getSettings();

    const wb = XLSX.utils.book_new();

    // Sheet 1: Transactions (IMPORT_TRANSACTIONS compatible format)
    const txData = transactions.map(t => ({
      'תאריך': t.date,
      'סכום': t.amount,
      'סוג': t.type === 'income' ? 'הכנסה' : t.type === 'savings' ? 'חיסכון' : 'הוצאה',
      'קטגוריה': t.category,
      'תת קטגוריה': t.subcategory || '',
      'תיאור / הערה': t.note,
      'מי': t.person
    }));
    const wsTx = XLSX.utils.json_to_sheet(txData);
    XLSX.utils.book_append_sheet(wb, wsTx, 'IMPORT_TRANSACTIONS');

    // Sheet 2: Categories
    const catData = categories.map(c => ({
      'שם קטגוריה': c.name,
      'סוג': c.kind === 'income' ? 'הכנסה' : c.kind === 'savings' ? 'חיסכון' : 'הוצאה',
      'אייקון': c.icon,
      'צבע': c.color,
      'סדר תצוגה': c.sortOrder,
      'פעילה': c.isActive ? 'כן' : 'לא'
    }));
    const wsCat = XLSX.utils.json_to_sheet(catData);
    XLSX.utils.book_append_sheet(wb, wsCat, 'קטגוריות');

    // Sheet 3: Savings Goals
    const goalData = goals.map(g => ({
      'שם יעד': g.name,
      'סכום יעד (₪)': g.targetAmount,
      'סכום נוכחי (₪)': g.currentAmount,
      'תאריך יעד': g.targetDate,
      'סטטוס': g.status,
      'אייקון': g.icon
    }));
    const wsGoals = XLSX.utils.json_to_sheet(goalData);
    XLSX.utils.book_append_sheet(wb, wsGoals, 'יעדי חיסכון');

    // Sheet 4: Summary Overview
    const summaryData = [
      { 'פרמטר': 'סך הכל תנועות במערכת', 'ערך': transactions.length },
      { 'פרמטר': 'סך הכל קטגוריות', 'ערך': categories.length },
      { 'פרמטר': 'מטבע מערכת', 'ערך': settings.currency },
      { 'פרמטר': 'תאריך ייצוא', 'ערך': new Date().toLocaleString('he-IL') }
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'סיכום');

    // Trigger download
    const filename = `תקציב_משפחתי_גיבוי_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  }
}

export const excelService = new ExcelService();



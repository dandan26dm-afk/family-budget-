/**
 * CSV / JSON Import & Export Service
 * Supports Hebrew UTF-8 BOM encoding for seamless Excel / Google Sheets compatibility.
 */

import { createTransaction, TYPE_LABELS, TRANSACTION_TYPES } from '../models/transaction.js';

export class DataExporterService {
  /**
   * Export array of transactions to Hebrew-friendly CSV file
   */
  exportToCSV(transactions, filename = `תקציב_משפחתי_${new Date().toISOString().slice(0, 10)}.csv`) {
    if (!transactions || transactions.length === 0) {
      alert('אין תנועות לייצוא.');
      return;
    }

    const headers = ['מזהה', 'תאריך', 'סכום', 'סוג', 'קטגוריה', 'אדם', 'חודש', 'שנה', 'הערה'];
    
    const rows = transactions.map(t => {
      const typeLabel = TYPE_LABELS[t.type] || t.type;
      const cleanNote = (t.note || '').replace(/"/g, '""'); // escape quotes
      return [
        t.id,
        t.date,
        t.amount,
        typeLabel,
        `"${t.category}"`,
        `"${t.person}"`,
        t.month,
        t.year,
        `"${cleanNote}"`
      ].join(',');
    });

    // UTF-8 BOM for Hebrew Excel compatibility
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    
    this.downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
  }

  /**
   * Export all data (Transactions, Goals, Settings) to JSON backup file
   */
  exportToJSON(data, filename = `גיבוי_תקציב_משפחתי_${new Date().toISOString().slice(0, 10)}.json`) {
    const jsonString = JSON.stringify(data, null, 2);
    this.downloadFile(jsonString, filename, 'application/json');
  }

  /**
   * Helper to trigger browser download
   */
  downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Parse CSV File text into transaction objects
   */
  parseCSV(csvText) {
    const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
    if (lines.length <= 1) return [];

    const headers = lines[0].replace('\uFEFF', '').split(',').map(h => h.trim().replace(/"/g, ''));
    const transactions = [];

    const typeReverseMap = {
      'הכנסה': TRANSACTION_TYPES.INCOME,
      'הוצאה': TRANSACTION_TYPES.EXPENSE,
      'חיסכון': TRANSACTION_TYPES.SAVINGS,
      'income': TRANSACTION_TYPES.INCOME,
      'expense': TRANSACTION_TYPES.EXPENSE,
      'savings': TRANSACTION_TYPES.SAVINGS
    };

    for (let i = 1; i < lines.length; i++) {
      // Regex to split by comma outside quotes
      const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
      if (!values || values.length < 3) continue;

      const cleanValues = values.map(v => v.trim().replace(/^"|"$/g, ''));

      // Look up column indices or fallback to standard positional order
      const dateVal = cleanValues[1] || cleanValues[0];
      const amountVal = parseFloat(cleanValues[2]) || 0;
      const typeRaw = cleanValues[3] || 'expense';
      const categoryVal = cleanValues[4] || 'אחר';
      const personVal = cleanValues[5] || 'משותף';
      const noteVal = cleanValues[8] || cleanValues[6] || '';

      const typeVal = typeReverseMap[typeRaw] || TRANSACTION_TYPES.EXPENSE;

      transactions.push(createTransaction({
        date: dateVal,
        amount: amountVal,
        type: typeVal,
        category: categoryVal,
        person: personVal,
        note: noteVal
      }));
    }

    return transactions;
  }
}

export const exporter = new DataExporterService();

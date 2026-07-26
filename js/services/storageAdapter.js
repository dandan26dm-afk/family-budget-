/**
 * StorageAdapter & Data Persistence Service
 * Manages LocalStorage, initial seed state, categories CRUD, savings goals CRUD, and import batches.
 */

import { createTransaction, DEFAULT_CATEGORIES, DEFAULT_PEOPLE, TRANSACTION_SOURCES } from '../models/transaction.js';

const STORAGE_KEYS = {
  TRANSACTIONS: 'fb_transactions_v4',
  SAVINGS_GOALS: 'fb_savings_goals_v4',
  SETTINGS: 'fb_settings_v4',
  CATEGORIES: 'fb_categories_v4',
  IMPORT_BATCHES: 'fb_import_batches_v4'
};


const DEFAULT_SETTINGS = {
  person1Name: 'Софа',
  person2Name: 'Даник',
  currency: '₪',
  monthlyIncomeTarget: 32000,
  monthlyBudgetLimit: 22000,
  defaultYear: 2026,
  defaultMonth: 7,
  exportFormat: 'xlsx',
  theme: 'light'
};


const DEFAULT_SAVINGS_GOALS = [
  { id: 'goal_1', name: '🏡חיסכון לדירה', targetAmount: 250000, currentAmount: 145000, category: '🏡חיסכון לדירה', targetDate: '2027-12-31', status: 'בביצוע', icon: '🏡' },
  { id: 'goal_2', name: 'חיסכון בתיק מסחר🏦', targetAmount: 80000, currentAmount: 48000, category: 'חיסכון בתיק מסחר🏦', targetDate: '2026-12-31', status: 'בביצוע', icon: '🏦' },
  { id: 'goal_3', name: '🚢✈️טיול גדול', targetAmount: 25000, currentAmount: 18500, category: '🚢✈️טיול גדול', targetDate: '2026-09-30', status: 'בביצוע', icon: '✈️' },
  { id: 'goal_4', name: 'חתונה בישראל (30k ש"ח מטרה)', targetAmount: 30000, currentAmount: 22000, category: 'חתונה בישראל (30k ש"ח מטרה)', targetDate: '2026-11-30', status: 'בביצוע', icon: '💍' },
  { id: 'goal_5', name: 'מטווח פעם בשנה + רשיון לנשק', targetAmount: 3500, currentAmount: 3500, category: 'מטווח פעם בשנה + רשיון לנשק', targetDate: '2025-10-31', status: 'הושלם', icon: '🎯' }
];


export class StorageService {
  constructor() {
    this.initStorage();
  }

  initStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
      this.saveTransactions([]);
    }

    if (!localStorage.getItem(STORAGE_KEYS.SAVINGS_GOALS)) {
      this.saveSavingsGoals(DEFAULT_SAVINGS_GOALS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.saveSettings(DEFAULT_SETTINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      this.saveCategories(DEFAULT_CATEGORIES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.IMPORT_BATCHES)) {
      this.saveImportBatches([]);
    }
  }

  // Transactions
  getTransactions() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading transactions from storage', e);
      return [];
    }
  }

  saveTransactions(transactions) {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
      console.error('Error saving transactions to storage', e);
    }
  }

  addTransaction(txData) {
    const tx = createTransaction(txData);
    const transactions = this.getTransactions();
    transactions.unshift(tx);
    this.saveTransactions(transactions);
    return tx;
  }

  addMultipleTransactions(txArray) {
    const newTxs = txArray.map(t => createTransaction(t));
    const transactions = this.getTransactions();
    const updated = [...newTxs, ...transactions];
    this.saveTransactions(updated);
    return newTxs;
  }

  updateTransaction(id, updatedFields) {
    const transactions = this.getTransactions();
    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      const updatedDate = updatedFields.date || transactions[index].date;
      const dateObj = new Date(updatedDate);
      const year = updatedFields.year || (isNaN(dateObj.getFullYear()) ? transactions[index].year : dateObj.getFullYear());
      const month = updatedFields.month || (isNaN(dateObj.getMonth()) ? transactions[index].month : dateObj.getMonth() + 1);

      transactions[index] = {
        ...transactions[index],
        ...updatedFields,
        month: parseInt(month, 10),
        year: parseInt(year, 10),
        amount: parseFloat(updatedFields.amount) || transactions[index].amount,
        updatedAt: new Date().toISOString()
      };
      this.saveTransactions(transactions);
      return transactions[index];
    }
    return null;
  }

  deleteTransaction(id) {
    let transactions = this.getTransactions();
    transactions = transactions.filter(t => t.id !== id);
    this.saveTransactions(transactions);
  }

  // Savings Goals
  getSavingsGoals() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SAVINGS_GOALS);
      return data ? JSON.parse(data) : DEFAULT_SAVINGS_GOALS;
    } catch (e) {
      return DEFAULT_SAVINGS_GOALS;
    }
  }

  saveSavingsGoals(goals) {
    localStorage.setItem(STORAGE_KEYS.SAVINGS_GOALS, JSON.stringify(goals));
  }

  addSavingsGoal(goal) {
    const goals = this.getSavingsGoals();
    const newGoal = {
      id: `goal_${Date.now()}`,
      status: 'בביצוע',
      icon: '🎯',
      ...goal,
      targetAmount: parseFloat(goal.targetAmount) || 0,
      currentAmount: parseFloat(goal.currentAmount) || 0
    };
    goals.push(newGoal);
    this.saveSavingsGoals(goals);
    return newGoal;
  }

  updateSavingsGoal(id, updatedFields) {
    const goals = this.getSavingsGoals();
    const idx = goals.findIndex(g => g.id === id);
    if (idx !== -1) {
      goals[idx] = { ...goals[idx], ...updatedFields };
      if (goals[idx].currentAmount >= goals[idx].targetAmount) {
        goals[idx].status = 'הושלם';
      }
      this.saveSavingsGoals(goals);
      return goals[idx];
    }
    return null;
  }

  deleteSavingsGoal(id) {
    const goals = this.getSavingsGoals().filter(g => g.id !== id);
    this.saveSavingsGoals(goals);
  }

  // Settings
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // Categories CRUD
  getCategories() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
    } catch (e) {
      return DEFAULT_CATEGORIES;
    }
  }

  saveCategories(categories) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }

  addCategory(catData) {
    const categories = this.getCategories();
    const newCat = {
      id: `cat_${Date.now()}`,
      name: catData.name,
      icon: catData.icon || '📌',
      kind: catData.kind || 'expense',
      color: catData.color || '#3b82f6',
      isActive: true,
      sortOrder: categories.length + 1
    };
    categories.push(newCat);
    this.saveCategories(categories);
    return newCat;
  }

  ensureCategoryExists(catData) {
    const categories = this.getCategories();
    const cleanName = String(catData.name).trim();
    const existing = categories.find(c => c.name.trim().toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      return existing;
    }
    return this.addCategory({
      name: cleanName,
      kind: catData.kind || 'expense',
      icon: catData.icon || '📌',
      color: catData.color || '#3b82f6'
    });
  }


  updateCategory(id, updatedFields) {
    const categories = this.getCategories();
    const idx = categories.findIndex(c => c.id === id);
    if (idx !== -1) {
      categories[idx] = { ...categories[idx], ...updatedFields };
      this.saveCategories(categories);
      return categories[idx];
    }
    return null;
  }

  deleteCategory(id) {
    const categories = this.getCategories().filter(c => c.id !== id);
    this.saveCategories(categories);
  }

  // Import Batches
  getImportBatches() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.IMPORT_BATCHES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveImportBatches(batches) {
    localStorage.setItem(STORAGE_KEYS.IMPORT_BATCHES, JSON.stringify(batches));
  }

  addImportBatch(batchInfo) {
    const batches = this.getImportBatches();
    const newBatch = {
      id: `batch_${Date.now()}`,
      importedAt: new Date().toISOString(),
      ...batchInfo
    };
    batches.unshift(newBatch);
    this.saveImportBatches(batches);
    return newBatch;
  }

  // Clear all data (Reset)
  clearAll(keepEmpty = false) {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fb_')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    if (keepEmpty) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.SAVINGS_GOALS, JSON.stringify(DEFAULT_SAVINGS_GOALS));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
      localStorage.setItem(STORAGE_KEYS.IMPORT_BATCHES, JSON.stringify([]));
    } else {
      this.initStorage();
    }
  }



  // Seed Data Generator for multi-year budget demo (2024, 2025, 2026)
  generateSeedData() {
    const seed = [
      // 2026 (July)
      { date: '2026-07-01', amount: 16500, type: 'income', category: 'משכורת סופיה', subcategory: 'הייטק', note: 'משכורת חודשית', person: 'Софа' },
      { date: '2026-07-01', amount: 14500, type: 'income', category: 'משכורת דניק', subcategory: 'פיתוח', note: 'משכורת חודשית', person: 'Даник' },
      { date: '2026-07-02', amount: 5200, type: 'expense', category: '🏠שכר דירה', note: 'חיוב שכר דירה חודשי', person: 'Вмести' },
      { date: '2026-07-03', amount: 1120, type: 'expense', category: '🍽🍔 אוכל בחוץ ובבית', subcategory: 'שופרסל', note: 'קניות סופר לבית', person: 'Софа' },
      { date: '2026-07-05', amount: 480, type: 'expense', category: '🚘 רכב (דלק וכדומה)', subcategory: 'דלק', note: 'תדלוק רכב', person: 'Даник' },
      { date: '2026-07-07', amount: 350, type: 'expense', category: 'בריאות🍏', note: 'תרופות וטיפולים', person: 'Софа' },
      { date: '2026-07-09', amount: 450, type: 'expense', category: 'אוכל בצבא || בעבודה🍔🍕', note: 'ארוחות צהריים בעבודה', person: 'Даник' },
      { date: '2026-07-10', amount: 4000, type: 'savings', category: '🏡חיסכון לדירה', note: 'הפקדה חודשית לדירה', person: 'Вмести' },
      { date: '2026-07-12', amount: 640, type: 'expense', category: '🎳🎭יציאות', note: 'קולנוע ומסעדה', person: 'Вмести' },
      { date: '2026-07-15', amount: 2500, type: 'savings', category: 'חיסכון בתיק מסחר🏦', note: 'הפקדה חודשית לתיק מסחר', person: 'Даник' },
      { date: '2026-07-18', amount: 1500, type: 'savings', category: '🚢✈️טיול גדול', note: 'חיסכון לטיול בקיץ', person: 'Вмести' },
      { date: '2026-07-20', amount: 320, type: 'expense', category: 'תשלומים', note: 'אינטרנט וחשבונות', person: 'Софа' },
      { date: '2026-07-21', amount: 580, type: 'expense', category: '🛒הוצאות מתנות ואירועים', note: 'מתנה ליום הולדת', person: 'Софа' },

      // 2026 (June)
      { date: '2026-06-01', amount: 16500, type: 'income', category: 'משכורת סופיה', note: 'משכורת יוני', person: 'Софа' },
      { date: '2026-06-01', amount: 14500, type: 'income', category: 'משכורת דניק', note: 'משכורת יוני', person: 'Даник' },
      { date: '2026-06-02', amount: 5200, type: 'expense', category: '🏠שכר דירה', note: 'שכר דירה יוני', person: 'Вмести' },
      { date: '2026-06-04', amount: 3600, type: 'expense', category: '🍽🍔 אוכל בחוץ ובבית', note: 'קניות מזון', person: 'Вмести' },
      { date: '2026-06-10', amount: 1800, type: 'expense', category: '🚘 רכב (דלק וכדומה)', note: 'טיפול תקופתי ברכב', person: 'Даник' },
      { date: '2026-06-15', amount: 4000, type: 'savings', category: '🏡חיסכון לדירה', note: 'חיסכון לדירה יוני', person: 'Вмести' },

      // 2025 Historical Data
      { date: '2025-12-01', amount: 15500, type: 'income', category: 'משכורת סופיה', note: 'משכורת 2025', person: 'Софа' },
      { date: '2025-12-01', amount: 13800, type: 'income', category: 'משכורת דניק', note: 'משכורת 2025', person: 'Даник' },
      { date: '2025-12-02', amount: 5000, type: 'expense', category: '🏠שכר דירה', note: 'שכר דירה 2025', person: 'Вмести' },
      { date: '2025-12-15', amount: 4200, type: 'expense', category: '🍽🍔 אוכל בחוץ ובבית', note: 'קניות סופר', person: 'Вмести' },
      { date: '2025-10-10', amount: 3500, type: 'savings', category: 'מטווח פעם בשנה + רשיון לנשק', note: 'חידוש רשיון ונשק', person: 'Даник' },

      // 2024 Historical Data
      { date: '2024-06-01', amount: 14500, type: 'income', category: 'משכורת סופיה', note: 'משכורת 2024', person: 'Софа' },
      { date: '2024-06-01', amount: 13000, type: 'income', category: 'משכורת דניק', note: 'משכורת 2024', person: 'Даник' },
      { date: '2024-06-05', amount: 4800, type: 'expense', category: '🏠שכר דירה', note: 'שכר דירה 2024', person: 'Вмести' }
    ];

    return seed.map(item => createTransaction(item));
  }
}

export const storage = new StorageService();



/**
 * Model definitions & constants for Family Budget App
 */

export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
  SAVINGS: 'savings',
  TRANSFER: 'transfer'
};

export const TYPE_LABELS = {
  [TRANSACTION_TYPES.INCOME]: 'הכנסה',
  [TRANSACTION_TYPES.EXPENSE]: 'הוצאה',
  [TRANSACTION_TYPES.SAVINGS]: 'חיסכון',
  [TRANSACTION_TYPES.TRANSFER]: 'העברה'
};

export const TRANSACTION_SOURCES = {
  MANUAL: 'manual',
  IMPORT: 'import',
  SYSTEM: 'system'
};

export const SOURCE_LABELS = {
  [TRANSACTION_SOURCES.MANUAL]: 'ידני',
  [TRANSACTION_SOURCES.IMPORT]: 'ייבוא',
  [TRANSACTION_SOURCES.SYSTEM]: 'מערכת'
};

export const DEFAULT_CATEGORIES = [
  // Income
  { id: 'cat_inc_1', name: 'משכורת סופיה', icon: '💰', kind: 'income', color: '#059669', isActive: true, sortOrder: 1 },
  { id: 'cat_inc_2', name: 'משכורת דניק', icon: '💰', kind: 'income', color: '#10b981', isActive: true, sortOrder: 2 },

  // Expenses
  { id: 'cat_exp_1', name: 'בריאות🍏', icon: '🍏', kind: 'expense', color: '#06b6d4', isActive: true, sortOrder: 3 },
  { id: 'cat_exp_2', name: '🍽🍔 אוכל בחוץ ובבית', icon: '🍔', kind: 'expense', color: '#f59e0b', isActive: true, sortOrder: 4 },
  { id: 'cat_exp_3', name: '🚘 רכב (דלק וכדומה)', icon: '🚘', kind: 'expense', color: '#ef4444', isActive: true, sortOrder: 5 },
  { id: 'cat_exp_4', name: '🏠שכר דירה', icon: '🏠', kind: 'expense', color: '#3b82f6', isActive: true, sortOrder: 6 },
  { id: 'cat_exp_5', name: '🎳🎭יציאות', icon: '🎭', kind: 'expense', color: '#8b5cf6', isActive: true, sortOrder: 7 },
  { id: 'cat_exp_6', name: '🎨📚📐 הוצאות לתואר', icon: '📚', kind: 'expense', color: '#ec4899', isActive: true, sortOrder: 8 },
  { id: 'cat_exp_7', name: 'תשלומים', icon: '💳', kind: 'expense', color: '#64748b', isActive: true, sortOrder: 9 },
  { id: 'cat_exp_8', name: 'הוצאות לחתונה', icon: '💍', kind: 'expense', color: '#f43f5e', isActive: true, sortOrder: 10 },
  { id: 'cat_exp_9', name: '🎈אחר', icon: '🎈', kind: 'expense', color: '#94a3b8', isActive: true, sortOrder: 11 },
  { id: 'cat_exp_10', name: 'אוכל בצבא || בעבודה🍔🍕', icon: '🍕', kind: 'expense', color: '#d97706', isActive: true, sortOrder: 12 },
  { id: 'cat_exp_11', name: '🛒הוצאות מתנות ואירועים', icon: '🛒', kind: 'expense', color: '#a855f7', isActive: true, sortOrder: 13 },

  // Savings / Goals
  { id: 'cat_sav_1', name: '🏡חיסכון לדירה', icon: '🏡', kind: 'savings', color: '#4f46e5', isActive: true, sortOrder: 14 },
  { id: 'cat_sav_2', name: 'חיסכון בתיק מסחר🏦', icon: '🏦', kind: 'savings', color: '#2563eb', isActive: true, sortOrder: 15 },
  { id: 'cat_sav_3', name: '🚢✈️טיול גדול', icon: '✈️', kind: 'savings', color: '#0284c7', isActive: true, sortOrder: 16 },
  { id: 'cat_sav_4', name: 'מתנות ואירועים', icon: '🎁', kind: 'savings', color: '#ec4899', isActive: true, sortOrder: 17 },
  { id: 'cat_sav_5', name: 'טיפול מאה / ביטוח לרכב+מקיף', icon: '🛡️', kind: 'savings', color: '#f59e0b', isActive: true, sortOrder: 18 },
  { id: 'cat_sav_6', name: 'חתונה בישראל (30k ש"ח מטרה)', icon: '💍', kind: 'savings', color: '#e11d48', isActive: true, sortOrder: 19 },
  { id: 'cat_sav_7', name: 'מטווח פעם בשנה + רשיון לנשק', icon: '🎯', kind: 'savings', color: '#7c3aed', isActive: true, sortOrder: 20 }
];

export const DEFAULT_PEOPLE = ['Софа', 'Даник', 'Вмести'];


export function createTransaction(data) {
  const dateObj = data.date ? new Date(data.date) : new Date();
  const year = data.year || (isNaN(dateObj.getFullYear()) ? new Date().getFullYear() : dateObj.getFullYear());
  const month = data.month || (isNaN(dateObj.getMonth()) ? new Date().getMonth() + 1 : dateObj.getMonth() + 1);

  return {
    id: data.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    date: data.date || dateObj.toISOString().split('T')[0],
    amount: parseFloat(data.amount) || 0,
    type: data.type || TRANSACTION_TYPES.EXPENSE,
    category: data.category || 'אחר',
    subcategory: data.subcategory || '',
    note: data.note || data.description || '',
    person: data.person || data.createdBy || DEFAULT_PEOPLE[2],
    source: data.source || TRANSACTION_SOURCES.MANUAL,
    month: parseInt(month, 10),
    year: parseInt(year, 10),
    batchId: data.batchId || null,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}


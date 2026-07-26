/**
 * Analytics and Budget Calculation Engine
 */

import { TRANSACTION_TYPES } from '../models/transaction.js';

export class AnalyticsService {
  /**
   * Filter transactions by month, year, category, person, type, search text
   */
  filterTransactions(transactions, filters = {}) {
    return transactions.filter(tx => {
      if (filters.year && filters.year !== 'all' && tx.year !== parseInt(filters.year, 10)) {
        return false;
      }
      if (filters.month && filters.month !== 'all' && tx.month !== parseInt(filters.month, 10)) {
        return false;
      }
      if (filters.category && filters.category !== 'all' && tx.category !== filters.category) {
        return false;
      }
      if (filters.person && filters.person !== 'all' && tx.person !== filters.person) {
        return false;
      }
      if (filters.type && filters.type !== 'all' && tx.type !== filters.type) {
        return false;
      }
      if (filters.search && filters.search.trim() !== '') {
        const query = filters.search.trim().toLowerCase();
        const noteMatch = (tx.note || '').toLowerCase().includes(query);
        const categoryMatch = (tx.category || '').toLowerCase().includes(query);
        const amountMatch = (tx.amount || '').toString().includes(query);
        const personMatch = (tx.person || '').toLowerCase().includes(query);
        if (!noteMatch && !categoryMatch && !amountMatch && !personMatch) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Calculate monthly financial KPIs
   */
  getMonthlySummary(transactions, month, year) {
    const monthTx = transactions.filter(t => t.month === parseInt(month, 10) && t.year === parseInt(year, 10));

    let totalIncome = 0;
    let totalExpense = 0;
    let totalSavings = 0;

    monthTx.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === TRANSACTION_TYPES.INCOME) {
        totalIncome += amt;
      } else if (t.type === TRANSACTION_TYPES.EXPENSE) {
        totalExpense += amt;
      } else if (t.type === TRANSACTION_TYPES.SAVINGS) {
        totalSavings += amt;
      }
    });

    const netBalance = totalIncome - totalExpense - totalSavings;

    // Calculate Rollover (Cumulative balance of prior months in the year)
    let rollover = 0;
    const priorMonthsTx = transactions.filter(t => t.year === parseInt(year, 10) && t.month < parseInt(month, 10));
    priorMonthsTx.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === TRANSACTION_TYPES.INCOME) rollover += amt;
      if (t.type === TRANSACTION_TYPES.EXPENSE) rollover -= amt;
      if (t.type === TRANSACTION_TYPES.SAVINGS) rollover -= amt;
    });

    return {
      totalIncome,
      totalExpense,
      totalSavings,
      netBalance,
      rollover,
      totalAvailable: netBalance + rollover,
      count: monthTx.length
    };
  }

  /**
   * Category breakdown of expenses for progress bars / charts
   */
  getCategoryBreakdown(transactions, month, year, person = 'all') {
    let filtered = transactions.filter(t => t.type === TRANSACTION_TYPES.EXPENSE);
    
    if (year !== 'all') filtered = filtered.filter(t => t.year === parseInt(year, 10));
    if (month !== 'all') filtered = filtered.filter(t => t.month === parseInt(month, 10));
    if (person !== 'all') filtered = filtered.filter(t => t.person === person);

    const categories = {};
    let grandTotal = 0;

    filtered.forEach(t => {
      const amt = Number(t.amount) || 0;
      grandTotal += amt;
      if (!categories[t.category]) {
        categories[t.category] = { amount: 0, count: 0 };
      }
      categories[t.category].amount += amt;
      categories[t.category].count += 1;
    });

    const sorted = Object.keys(categories).map(catName => {
      const amount = categories[catName].amount;
      const percentage = grandTotal > 0 ? ((amount / grandTotal) * 100).toFixed(1) : 0;
      return {
        name: catName,
        amount,
        count: categories[catName].count,
        percentage: Number(percentage)
      };
    }).sort((a, b) => b.amount - a.amount);

    return { items: sorted, grandTotal };
  }

  /**
   * Person breakdown for couple comparison (Partner 1 vs Partner 2 vs Shared)
   */
  getPersonBreakdown(transactions, month, year) {
    let filtered = transactions;
    if (year !== 'all') filtered = filtered.filter(t => t.year === parseInt(year, 10));
    if (month !== 'all') filtered = filtered.filter(t => t.month === parseInt(month, 10));

    const personStats = {};

    filtered.forEach(t => {
      const p = t.person || 'משותף';
      if (!personStats[p]) {
        personStats[p] = { income: 0, expense: 0, savings: 0 };
      }
      const amt = Number(t.amount) || 0;
      if (t.type === TRANSACTION_TYPES.INCOME) personStats[p].income += amt;
      if (t.type === TRANSACTION_TYPES.EXPENSE) personStats[p].expense += amt;
      if (t.type === TRANSACTION_TYPES.SAVINGS) personStats[p].savings += amt;
    });

    return personStats;
  }

  /**
   * Yearly overview matrix (12 months breakdown)
   */
  getYearlyMatrix(transactions, year) {
    const HEBREW_MONTHS = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];

    const monthsData = HEBREW_MONTHS.map((name, index) => {
      const monthNum = index + 1;
      const summary = this.getMonthlySummary(transactions, monthNum, year);
      return {
        monthNum,
        name,
        income: summary.totalIncome,
        expense: summary.totalExpense,
        savings: summary.totalSavings,
        balance: summary.netBalance
      };
    });

    const yearlyTotalIncome = monthsData.reduce((acc, m) => acc + m.income, 0);
    const yearlyTotalExpense = monthsData.reduce((acc, m) => acc + m.expense, 0);
    const yearlyTotalSavings = monthsData.reduce((acc, m) => acc + m.savings, 0);
    const yearlyNetBalance = yearlyTotalIncome - yearlyTotalExpense - yearlyTotalSavings;

    return {
      months: monthsData,
      totals: {
        income: yearlyTotalIncome,
        expense: yearlyTotalExpense,
        savings: yearlyTotalSavings,
        balance: yearlyNetBalance
      }
    };
  }
}

export const analytics = new AnalyticsService();

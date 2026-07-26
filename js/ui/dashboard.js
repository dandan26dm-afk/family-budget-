/**
 * Dashboard UI Renderer & Chart Integrator
 */

import { analytics } from '../services/analytics.js';
import { storage } from '../services/storageAdapter.js';
import { charts } from './charts.js';

export class DashboardRenderer {
  constructor(appRef) {
    this.app = appRef;
  }

  formatCurrency(num) {
    const formatted = Math.abs(num).toLocaleString('he-IL', {
      maximumFractionDigits: 0
    });
    return `${num < 0 ? '-' : ''}₪${formatted}`;
  }

  renderKPIs(month, year) {
    const transactions = storage.getTransactions();
    const summary = analytics.getMonthlySummary(transactions, month, year);

    document.getElementById('kpiIncome').textContent = this.formatCurrency(summary.totalIncome);
    document.getElementById('kpiExpense').textContent = this.formatCurrency(summary.totalExpense);
    
    const balanceElem = document.getElementById('kpiBalance');
    balanceElem.textContent = this.formatCurrency(summary.netBalance);
    balanceElem.style.color = summary.netBalance >= 0 ? 'var(--color-income)' : 'var(--color-expense)';

    const rolloverElem = document.getElementById('kpiRollover');
    if (rolloverElem) {
      rolloverElem.textContent = this.formatCurrency(summary.rollover);
    }
  }

  renderCategoryBreakdown(month, year, person = 'all') {
    const transactions = storage.getTransactions();
    const { items } = analytics.getCategoryBreakdown(transactions, month, year, person);
    const container = document.getElementById('categoryBreakdownContainer');

    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1.5rem;">אין הוצאות להצגה בחודש זה</div>`;
      return;
    }

    container.innerHTML = items.map(cat => `
      <div class="category-item">
        <div class="category-info">
          <span class="category-name">${cat.name} (${cat.percentage}%)</span>
          <span class="category-amount">${this.formatCurrency(cat.amount)}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${cat.percentage}%"></div>
        </div>
      </div>
    `).join('');

    // Also render visual Donut Chart
    charts.renderCategoryDonutChart('categoryDonutContainer', month, year, person);
  }

  renderPersonBreakdown(month, year) {
    const transactions = storage.getTransactions();
    const stats = analytics.getPersonBreakdown(transactions, month, year);
    const container = document.getElementById('personBreakdownContainer');
    if (!container) return;

    const people = Object.keys(stats);
    if (people.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1rem;">אין תנועות לסיכום לפי אדם</div>`;
      return;
    }

    container.innerHTML = people.map(p => {
      const item = stats[p];
      return `
        <div style="background: var(--bg-subtle); padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.875rem;">
          <div style="font-weight: 800; margin-bottom: 0.25rem;">${p}</div>
          <div style="display: flex; justify-content: space-between; color: var(--color-income);">
            <span>הכנסות:</span> <strong>${this.formatCurrency(item.income)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; color: var(--color-expense);">
            <span>הוצאות:</span> <strong>${this.formatCurrency(item.expense)}</strong>
          </div>
        </div>
      `;
    }).join('');
  }

  renderSavingsGoals() {
    const goals = storage.getSavingsGoals();
    const container = document.getElementById('savingsGoalsContainer');
    if (!container) return;

    if (goals.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1.5rem;">טרם הוגדרו יעדי חיסכון</div>`;
      return;
    }

    container.innerHTML = goals.map(goal => {
      const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
      return `
        <div style="background: var(--bg-subtle); padding: 1.125rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.6rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 800; font-size: 1.05rem;">${goal.icon || '🎯'} ${goal.name}</span>
            <span style="font-size: 0.85rem; background: var(--color-savings-bg); color: var(--color-savings); padding: 3px 10px; border-radius: 12px; font-weight: 800;">${pct}%</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--text-muted);">
            <span>נחסך: <strong style="color: var(--text-main); font-family: 'Rubik';">${this.formatCurrency(goal.currentAmount)}</strong></span>
            <span>יעד: <strong style="color: var(--text-main); font-family: 'Rubik';">${this.formatCurrency(goal.targetAmount)}</strong></span>
          </div>
          <div class="progress-track" style="height: 10px;">
            <div class="progress-fill" style="width: ${pct}%; background: linear-gradient(90deg, #6366f1, #4f46e5);"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderYearlyMatrix(year) {
    const transactions = storage.getTransactions();
    const { months, totals } = analytics.getYearlyMatrix(transactions, year);
    const container = document.getElementById('yearlyMatrixContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="yearly-matrix">
        ${months.map(m => `
          <div class="month-matrix-card">
            <div class="month-matrix-header">
              <span>${m.name}</span>
              <span style="color: ${m.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">
                ${this.formatCurrency(m.balance)}
              </span>
            </div>
            <div class="matrix-row">
              <span style="color: var(--text-muted)">הכנסות:</span>
              <span style="color: var(--color-income); font-weight: 700;">${this.formatCurrency(m.income)}</span>
            </div>
            <div class="matrix-row">
              <span style="color: var(--text-muted)">הוצאות:</span>
              <span style="color: var(--color-expense); font-weight: 700;">${this.formatCurrency(m.expense)}</span>
            </div>
            <div class="matrix-row">
              <span style="color: var(--text-muted)">חיסכון:</span>
              <span style="color: var(--color-savings); font-weight: 700;">${this.formatCurrency(m.savings)}</span>
            </div>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 1.5rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem; display: flex; flex-wrap: wrap; justify-content: space-around; gap: 1rem; text-align: center;">
        <div>
          <div style="font-size: 0.825rem; color: var(--text-muted); font-weight: 700;">סה"כ הכנסות שנת הדגמה</div>
          <div style="font-size: 1.5rem; font-weight: 900; color: var(--color-income); font-family: 'Rubik';">${this.formatCurrency(totals.income)}</div>
        </div>
        <div>
          <div style="font-size: 0.825rem; color: var(--text-muted); font-weight: 700;">סה"כ הוצאות שנתיות</div>
          <div style="font-size: 1.5rem; font-weight: 900; color: var(--color-expense); font-family: 'Rubik';">${this.formatCurrency(totals.expense)}</div>
        </div>
        <div>
          <div style="font-size: 0.825rem; color: var(--text-muted); font-weight: 700;">סה"כ נחסך השנה</div>
          <div style="font-size: 1.5rem; font-weight: 900; color: var(--color-savings); font-family: 'Rubik';">${this.formatCurrency(totals.savings)}</div>
        </div>
        <div>
          <div style="font-size: 0.825rem; color: var(--text-muted); font-weight: 700;">מאזן מצטבר שנתי</div>
          <div style="font-size: 1.5rem; font-weight: 900; color: ${totals.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}; font-family: 'Rubik';">${this.formatCurrency(totals.balance)}</div>
        </div>
      </div>
    `;
  }

  renderCharts(month, year, person) {
    charts.renderMonthlyTrendBadge('monthlyTrendBadgeContainer', month, year);
    charts.renderIncomeVsExpenseChart('incomeExpenseChartContainer', year);
  }
}

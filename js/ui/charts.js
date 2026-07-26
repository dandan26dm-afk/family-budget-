/**
 * Financial Charts Renderer Engine (High-End Rich Visualizations)
 * Zero external dependencies, 100% offline & GitHub Pages compatible.
 */

import { analytics } from '../services/analytics.js';
import { storage } from '../services/storageAdapter.js';

export class ChartsRenderer {
  formatCurrency(num) {
    return `₪${Math.abs(Math.round(num)).toLocaleString('he-IL')}`;
  }

  /**
   * Render Income vs Expense Monthly Bar Chart (Tall, Rich & Legible)
   */
  renderIncomeVsExpenseChart(containerId, year) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const transactions = storage.getTransactions();
    const { months } = analytics.getYearlyMatrix(transactions, year);

    let maxVal = 10000;
    months.forEach(m => {
      if (m.income > maxVal) maxVal = m.income;
      if (m.expense > maxVal) maxVal = m.expense;
    });

    const activeMonths = months.slice(0, 7);

    const barsHTML = activeMonths.map(m => {
      const incomeHeightPct = Math.round((m.income / maxVal) * 100);
      const expenseHeightPct = Math.round((m.expense / maxVal) * 100);

      return `
        <div class="bar-group-col">
          <div class="bar-pair-container">
            <!-- Income Bar -->
            <div class="bar-item income-bar" style="height: ${Math.max(10, incomeHeightPct)}%;">
              <span class="bar-value-label">${this.formatCurrency(m.income)}</span>
            </div>
            <!-- Expense Bar -->
            <div class="bar-item expense-bar" style="height: ${Math.max(10, expenseHeightPct)}%;">
              <span class="bar-value-label">${this.formatCurrency(m.expense)}</span>
            </div>
          </div>
          <span class="bar-month-label">${m.name}</span>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="chart-wrapper">
        <div class="chart-legend-top">
          <div class="legend-item"><span class="legend-dot income"></span> הכנסות חודשיות</div>
          <div class="legend-item"><span class="legend-dot expense"></span> הוצאות חודשיות</div>
        </div>
        <div class="bar-chart-container">
          ${barsHTML}
        </div>
      </div>
    `;
  }

  /**
   * Render Large Prominent Category Donut SVG Chart (280px Canvas)
   */
  renderCategoryDonutChart(containerId, month, year, person = 'all') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const transactions = storage.getTransactions();
    const { items, grandTotal } = analytics.getCategoryBreakdown(transactions, month, year, person);

    if (items.length === 0 || grandTotal === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem; font-weight: 600;">אין הוצאות להצגה בחודש זה</div>`;
      return;
    }

    const colors = [
      '#2563eb', '#10b981', '#f59e0b', '#ef4444',
      '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'
    ];

    let cumulativePercent = 0;
    const radius = 38;
    const circumference = 2 * Math.PI * radius;

    const svgSegments = items.slice(0, 8).map((item, index) => {
      const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -((cumulativePercent / 100) * circumference);
      cumulativePercent += item.percentage;

      return `
        <circle
          cx="50" cy="50" r="${radius}"
          fill="transparent"
          stroke="${colors[index % colors.length]}"
          stroke-width="18"
          stroke-dasharray="${strokeDasharray}"
          stroke-dashoffset="${strokeDashoffset}"
          style="transition: all 0.5s ease;"
        />
      `;
    }).join('');

    const legendHTML = items.slice(0, 8).map((item, index) => `
      <div class="donut-legend-card">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="width: 14px; height: 14px; border-radius: 4px; background: ${colors[index % colors.length]}; display: inline-block; flex-shrink: 0;"></span>
            <span style="font-weight: 800; font-size: 0.95rem;">${item.name}</span>
          </div>
          <span style="font-size: 0.8rem; background: var(--bg-subtle); color: var(--text-muted); padding: 2px 8px; border-radius: 10px; font-weight: 800;">${item.percentage}%</span>
        </div>
        <div style="font-family: 'Rubik', sans-serif; font-weight: 900; font-size: 1.1rem; color: var(--text-main); margin-top: 4px;">
          ${this.formatCurrency(item.amount)}
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="donut-widget-layout">
        <div class="donut-chart-svg-wrap">
          <svg viewBox="0 0 100 100" class="donut-svg">
            ${svgSegments}
          </svg>
          <div class="donut-center-text">
            <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 800;">סה"כ הוצאות</span>
            <span style="font-size: 1.5rem; font-weight: 900; color: var(--color-expense); font-family: 'Rubik', sans-serif; margin-top: 2px;">${this.formatCurrency(grandTotal)}</span>
          </div>
        </div>
        <div class="donut-legend-grid">
          ${legendHTML}
        </div>
      </div>
    `;
  }

  /**
   * Render Monthly Expense Comparison & Trend Badge
   */
  renderMonthlyTrendBadge(containerId, month, year) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const transactions = storage.getTransactions();
    const currSummary = analytics.getMonthlySummary(transactions, month, year);
    
    let prevM = parseInt(month, 10) - 1;
    let prevY = parseInt(year, 10);
    if (prevM < 1) {
      prevM = 12;
      prevY -= 1;
    }
    const prevSummary = analytics.getMonthlySummary(transactions, prevM, prevY);

    if (prevSummary.totalExpense === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    const diff = currSummary.totalExpense - prevSummary.totalExpense;
    const pct = Math.abs(Math.round((diff / prevSummary.totalExpense) * 100));

    if (diff < 0) {
      container.innerHTML = `
        <div class="trend-badge-card trend-good">
          <span style="font-size: 1.5rem;">🎉</span>
          <div>
            <strong>ההוצאות החודש נמוכות ב-${this.formatCurrency(Math.abs(diff))} (${pct}%-)</strong> בהשוואה לחודש הקודם!
          </div>
        </div>
      `;
    } else if (diff > 0) {
      container.innerHTML = `
        <div class="trend-badge-card trend-warning">
          <span style="font-size: 1.5rem;">⚠️</span>
          <div>
            <strong>ההוצאות החודש גבוהות ב-${this.formatCurrency(diff)} (${pct}%+)</strong> בהשוואה לחודש הקודם.
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="trend-badge-card trend-neutral">
          <span style="font-size: 1.5rem;">⚖️</span>
          <div>
            <strong>ההוצאות החודש שוות בדיוק</strong> להוצאות החודש הקודם.
          </div>
        </div>
      `;
    }
  }
}

export const charts = new ChartsRenderer();

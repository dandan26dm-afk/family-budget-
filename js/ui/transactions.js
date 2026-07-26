/**
 * Transactions Table & Mobile Adaptive Card Renderer
 */

import { storage } from '../services/storageAdapter.js';
import { analytics } from '../services/analytics.js';
import { TYPE_LABELS, TRANSACTION_TYPES, SOURCE_LABELS } from '../models/transaction.js';

export class TransactionsRenderer {
  constructor(appRef) {
    this.app = appRef;
    this.tableContainer = document.getElementById('transactionsTableBody');
    this.fullContainer = document.getElementById('fullTransactionsContainer');
    this.mobileCardContainer = document.getElementById('mobileTransactionsList');
    this.txCountElem = document.getElementById('txCountBadge');
  }

  formatCurrency(num) {
    return `₪${Number(num).toLocaleString('he-IL')}`;
  }

  getCategoryIcon(catName) {
    const categories = storage.getCategories();
    const cat = categories.find(c => c.name === catName);
    return cat ? (cat.icon || '📌') : '📌';
  }

  render(filters = {}) {
    const allTx = storage.getTransactions();
    const filteredTx = analytics.filterTransactions(allTx, filters);

    if (this.txCountElem) {
      this.txCountElem.textContent = `${filteredTx.length} תנועות`;
    }

    this.renderDesktopTable(filteredTx);
    this.renderFullTransactionsView(filteredTx);
    this.renderMobileCards(filteredTx);
    this.attachEvents();
  }

  renderDesktopTable(filteredTx) {
    if (!this.tableContainer) return;

    if (filteredTx.length === 0) {
      this.tableContainer.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            לא נמצאו תנועות התואמות את הסינון שנבחר.
          </td>
        </tr>
      `;
      return;
    }

    this.tableContainer.innerHTML = filteredTx.slice(0, 15).map(tx => {
      let badgeClass = 'badge-expense';
      if (tx.type === TRANSACTION_TYPES.INCOME) badgeClass = 'badge-income';
      if (tx.type === TRANSACTION_TYPES.SAVINGS) badgeClass = 'badge-savings';

      const typeText = TYPE_LABELS[tx.type] || tx.type;
      const icon = this.getCategoryIcon(tx.category);

      return `
        <tr data-id="${tx.id}">
          <td style="font-weight: 600; white-space: nowrap;">${tx.date}</td>
          <td style="font-weight: 800; font-family: 'Rubik', sans-serif; font-size: 0.95rem;">
            ${this.formatCurrency(tx.amount)}
          </td>
          <td>
            <span class="badge ${badgeClass}">${typeText}</span>
          </td>
          <td style="font-weight: 600;">${icon} ${tx.category}</td>
          <td>
            <span class="badge badge-person">${tx.person || 'משותף'}</span>
          </td>
          <td style="color: var(--text-muted); font-size: 0.85rem; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${tx.note || '-'}
          </td>
          <td style="white-space: nowrap; text-align: left;">
            <button class="btn btn-icon btn-edit-tx" title="עריכה" data-id="${tx.id}">✏️</button>
            <button class="btn btn-icon btn-delete-tx" title="מחיקה" data-id="${tx.id}" style="color: var(--color-expense);">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderFullTransactionsView(filteredTx) {
    if (!this.fullContainer) return;

    if (filteredTx.length === 0) {
      this.fullContainer.innerHTML = `
        <div style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          לא נמצאו תנועות ברשימה עבור הסינונים שנבחרו.
        </div>
      `;
      return;
    }

    this.fullContainer.innerHTML = `
      <div class="table-container">
        <table class="tx-table">
          <thead>
            <tr>
              <th>תאריך</th>
              <th>סכום</th>
              <th>סוג</th>
              <th>קטגוריה</th>
              <th>תת-קטגוריה</th>
              <th>תיאור / הערה</th>
              <th>אדם</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTx.map(tx => {
              let badgeClass = 'badge-expense';
              if (tx.type === TRANSACTION_TYPES.INCOME) badgeClass = 'badge-income';
              if (tx.type === TRANSACTION_TYPES.SAVINGS) badgeClass = 'badge-savings';

              const typeText = TYPE_LABELS[tx.type] || tx.type;
              const icon = this.getCategoryIcon(tx.category);

              return `
                <tr data-id="${tx.id}">
                  <td style="font-weight: 600; white-space: nowrap;">${tx.date}</td>
                  <td style="font-weight: 800; font-family: 'Rubik', sans-serif; font-size: 0.98rem;">
                    ${this.formatCurrency(tx.amount)}
                  </td>
                  <td><span class="badge ${badgeClass}">${typeText}</span></td>
                  <td style="font-weight: 700;">${icon} ${tx.category}</td>
                  <td style="color: var(--text-muted); font-size: 0.85rem;">${tx.subcategory || '-'}</td>
                  <td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tx.note || '-'}</td>
                  <td><span class="badge badge-person">${tx.person || 'משותף'}</span></td>
                  <td style="white-space: nowrap; text-align: left;">
                    <button class="btn btn-icon btn-edit-tx" title="עריכה" data-id="${tx.id}">✏️</button>
                    <button class="btn btn-icon btn-delete-tx" title="מחיקה" data-id="${tx.id}" style="color: var(--color-expense);">🗑️</button>
                  </td>
                </tr>
              `;
            }).join('')}

          </tbody>
        </table>
      </div>
    `;
  }

  renderMobileCards(filteredTx) {
    if (!this.mobileCardContainer) return;

    if (filteredTx.length === 0) {
      this.mobileCardContainer.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted); background: var(--bg-primary); border-radius: var(--radius-md);">
          לא נמצאו תנועות התואמות את הסינון.
        </div>
      `;
      return;
    }

    this.mobileCardContainer.innerHTML = filteredTx.map(tx => {
      const icon = this.getCategoryIcon(tx.category);
      let colorStyle = 'color: var(--color-expense);';
      if (tx.type === TRANSACTION_TYPES.INCOME) colorStyle = 'color: var(--color-income);';
      if (tx.type === TRANSACTION_TYPES.SAVINGS) colorStyle = 'color: var(--color-savings);';

      return `
        <div class="tx-card-mobile" data-id="${tx.id}">
          <div class="tx-mobile-right">
            <div class="tx-mobile-category-icon">${icon}</div>
            <div class="tx-mobile-details">
              <div class="tx-mobile-title">${tx.category}</div>
              <div class="tx-mobile-meta">
                <span>${tx.date}</span>
                <span>&bull;</span>
                <span>${tx.person || 'משותף'}</span>
                ${tx.note ? `<span>&bull; ${tx.note}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="tx-mobile-left">
            <div class="tx-mobile-amount" style="${colorStyle}">
              ${this.formatCurrency(tx.amount)}
            </div>
            <div style="display: flex; gap: 0.25rem;">
              <button class="btn-icon btn-edit-tx" data-id="${tx.id}" style="width: 32px; height: 32px; font-size: 0.8rem;">✏️</button>
              <button class="btn-icon btn-delete-tx" data-id="${tx.id}" style="width: 32px; height: 32px; font-size: 0.8rem; color: var(--color-expense);">🗑️</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  attachEvents() {
    document.querySelectorAll('.btn-edit-tx').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.dataset.id;
        const tx = storage.getTransactions().find(t => t.id === id);
        if (tx) {
          this.app.modalManager.openEditTransactionModal(tx);
        }
      });
    });

    document.querySelectorAll('.btn-delete-tx').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.dataset.id;
        if (confirm('האם למחוק תנועה זו?')) {
          storage.deleteTransaction(id);
          this.app.renderAll();
        }
      });
    });
  }
}


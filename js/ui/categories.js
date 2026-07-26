/**
 * Categories UI Renderer & Management Module
 */

import { storage } from '../services/storageAdapter.js';

export class CategoriesRenderer {
  constructor(app) {
    this.app = app;
  }

  render() {
    const container = document.getElementById('viewCategories');
    if (!container) return;

    const categories = storage.getCategories();
    const settings = storage.getSettings();

    const expenseCats = categories.filter(c => c.kind === 'expense' || c.type === 'expense');
    const incomeCats = categories.filter(c => c.kind === 'income' || c.type === 'income');
    const savingsCats = categories.filter(c => c.kind === 'savings' || c.type === 'savings');

    container.innerHTML = `
      <div class="widget-card">
        <div class="widget-header">
          <div>
            <h2 class="widget-title">🏷️ ניהול קטגוריות תקציב</h2>
            <div class="kpi-subtext" style="margin-top: 0.25rem;">
              הקטגוריות במערכת כולם ניתנות לעריכה דינמית! ניתן להוסיף, לשנות שמות, אייקונים, צבעים ולהפעיל/להקפיא.
            </div>
          </div>
          <button id="btnAddCategoryBtn" class="btn btn-primary">
            ➕ הוספת קטגוריה חדשה
          </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 2rem; margin-top: 1rem;">
          
          <!-- Expense Categories -->
          <div>
            <h3 style="font-size: 1.1rem; color: var(--color-expense); margin-bottom: 0.875rem; display: flex; align-items: center; gap: 0.5rem;">
              📉 קטגוריות הוצאות (${expenseCats.length})
            </h3>
            <div class="categories-grid">
              ${expenseCats.map(c => this.renderCategoryCard(c)).join('')}
            </div>
          </div>

          <!-- Income Categories -->
          <div>
            <h3 style="font-size: 1.1rem; color: var(--color-income); margin-bottom: 0.875rem; display: flex; align-items: center; gap: 0.5rem;">
              📈 קטגוריות הכנסות (${incomeCats.length})
            </h3>
            <div class="categories-grid">
              ${incomeCats.map(c => this.renderCategoryCard(c)).join('')}
            </div>
          </div>

          <!-- Savings Categories -->
          <div>
            <h3 style="font-size: 1.1rem; color: var(--color-savings); margin-bottom: 0.875rem; display: flex; align-items: center; gap: 0.5rem;">
              🐖 קטגוריות חיסכון (${savingsCats.length})
            </h3>
            <div class="categories-grid">
              ${savingsCats.map(c => this.renderCategoryCard(c)).join('')}
            </div>
          </div>

        </div>
      </div>
    `;

    this.attachEventListeners(container);
  }

  renderCategoryCard(cat) {
    const color = cat.color || '#3b82f6';
    const activeText = cat.isActive !== false ? 'פעיל' : 'מוקפא';
    const activeClass = cat.isActive !== false ? 'badge-income' : 'badge-expense';

    return `
      <div class="category-manage-card" data-id="${cat.id}">
        <div class="category-card-color-stripe" style="background-color: ${color};"></div>
        <div class="category-card-content">
          <div class="category-card-header">
            <span class="category-card-icon">${cat.icon || '📌'}</span>
            <span class="category-card-title">${cat.name}</span>
          </div>
          <div class="category-card-meta">
            <span class="badge ${activeClass}">${activeText}</span>
          </div>
          <div class="category-card-actions">
            <button class="btn-icon-small btnEditCategory" data-id="${cat.id}" title="עריכת קטגוריה">✏️</button>
            <button class="btn-icon-small btnDeleteCategory" data-id="${cat.id}" title="מחיקת קטגוריה">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners(container) {
    const btnAdd = container.querySelector('#btnAddCategoryBtn');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => this.openCategoryModal());
    }

    container.querySelectorAll('.btnEditCategory').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const cat = storage.getCategories().find(c => c.id === id);
        if (cat) this.openCategoryModal(cat);
      });
    });

    container.querySelectorAll('.btnDeleteCategory').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('האם אתה בטוח שברצונך למחוק קטגוריה זו?')) {
          storage.deleteCategory(id);
          this.app.populateCategoryFilter();
          this.render();
        }
      });
    });
  }

  openCategoryModal(categoryToEdit = null) {
    let modal = document.getElementById('catModal');
    if (!modal) {
      this.createCategoryModalHTML();
      modal = document.getElementById('catModal');
    }

    const titleEl = modal.querySelector('#catModalTitle');
    const form = modal.querySelector('#catForm');
    const idInput = modal.querySelector('#catIdInput');
    const nameInput = modal.querySelector('#catNameInput');
    const iconInput = modal.querySelector('#catIconInput');
    const kindInput = modal.querySelector('#catKindInput');
    const colorInput = modal.querySelector('#catColorInput');

    if (categoryToEdit) {
      titleEl.textContent = 'עריכת קטגוריה';
      idInput.value = categoryToEdit.id;
      nameInput.value = categoryToEdit.name;
      iconInput.value = categoryToEdit.icon || '📌';
      kindInput.value = categoryToEdit.kind || categoryToEdit.type || 'expense';
      colorInput.value = categoryToEdit.color || '#3b82f6';
    } else {
      titleEl.textContent = 'הוספת קטגוריה חדשה';
      idInput.value = '';
      nameInput.value = '';
      iconInput.value = '🛒';
      kindInput.value = 'expense';
      colorInput.value = '#3b82f6';
    }

    modal.classList.add('active');

    // Close handlers
    const closeBtns = modal.querySelectorAll('.modal-close-btn, .btn-cancel-modal');
    closeBtns.forEach(b => {
      b.onclick = () => modal.classList.remove('active');
    });

    form.onsubmit = (e) => {
      e.preventDefault();
      const id = idInput.value;
      const catData = {
        name: nameInput.value.trim(),
        icon: iconInput.value.trim() || '📌',
        kind: kindInput.value,
        color: colorInput.value
      };

      if (id) {
        storage.updateCategory(id, catData);
      } else {
        storage.addCategory(catData);
      }

      modal.classList.remove('active');
      this.app.populateCategoryFilter();
      this.app.renderAll();
      this.render();
    };
  }

  createCategoryModalHTML() {
    const modalHTML = `
      <div id="catModal" class="modal-backdrop">
        <div class="modal-window">
          <div class="modal-header">
            <h3 id="catModalTitle" class="modal-title">הוספת קטגוריה</h3>
            <button class="modal-close-btn">&times;</button>
          </div>
          <form id="catForm">
            <div class="modal-body">
              <input type="hidden" id="catIdInput">
              
              <div class="form-group">
                <label class="form-label" for="catNameInput">שם הקטגוריה</label>
                <input type="text" id="catNameInput" class="form-input" placeholder="כגון: מזון, חשמל, חוגים..." required>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.875rem;">
                <div class="form-group">
                  <label class="form-label" for="catKindInput">סוג קטגוריה</label>
                  <select id="catKindInput" class="form-select">
                    <option value="expense">📉 הוצאה</option>
                    <option value="income">📈 הכנסה</option>
                    <option value="savings">🐖 חיסכון</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label" for="catIconInput">אייקון (Emoji)</label>
                  <input type="text" id="catIconInput" class="form-input" placeholder="🛒" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="catColorInput">צבע ייצוגי</label>
                <input type="color" id="catColorInput" class="form-input" style="height: 44px; cursor: pointer;" value="#3b82f6">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-cancel-modal">ביטול</button>
              <button type="submit" class="btn btn-primary">שמירה</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
}

/**
 * Modal Manager - Handles transaction, category, goal modals and overlays
 */

import { storage } from '../services/storageAdapter.js';
import { TRANSACTION_TYPES } from '../models/transaction.js';

export class ModalManager {
  constructor(appRef) {
    this.app = appRef;
    this.txModal = document.getElementById('txModal');
    this.goalModal = document.getElementById('goalModal');
    this.txForm = document.getElementById('txForm');
    this.goalForm = document.getElementById('goalForm');
    this.currentEditingId = null;

    this.initEvents();
  }

  initEvents() {
    // Backdrop clicks to close
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.closeAll();
        }
      });
    });

    // Close buttons
    document.querySelectorAll('.modal-close-btn, .btn-cancel-modal').forEach(btn => {
      btn.addEventListener('click', () => this.closeAll());
    });

    // Type Toggle Buttons in Tx Modal
    const typeBtns = document.querySelectorAll('.type-selector-buttons .type-btn');
    typeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        typeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('txTypeInput').value = btn.dataset.type;
        this.updateCategoryDropdown(btn.dataset.type);
      });
    });

    // Form Submit
    if (this.txForm) {
      this.txForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleTxFormSubmit();
      });
    }

    if (this.goalForm) {
      this.goalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleGoalFormSubmit();
      });
    }

    // Keyboard Accessibility ESC
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAll();
    });
  }

  openAddTransactionModal() {
    this.currentEditingId = null;
    document.getElementById('txModalTitle').textContent = 'הוספת תנועה חדשה';
    this.txForm.reset();

    // Default today's date
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    document.getElementById('txDate').value = formattedDate;

    // Default type: Expense
    this.setTypeActive(TRANSACTION_TYPES.EXPENSE);
    
    // Fill categories and person options
    this.populateOptions();

    this.txModal.classList.add('active');
  }

  openEditTransactionModal(tx) {
    this.currentEditingId = tx.id;
    document.getElementById('txModalTitle').textContent = 'עריכת תנועה';
    this.populateOptions();

    document.getElementById('txDate').value = tx.date;
    document.getElementById('txAmount').value = tx.amount;
    document.getElementById('txTypeInput').value = tx.type;
    document.getElementById('txNote').value = tx.note || '';
    const subcatEl = document.getElementById('txSubcategory');
    if (subcatEl) subcatEl.value = tx.subcategory || '';
    const sourceEl = document.getElementById('txSource');
    if (sourceEl) sourceEl.value = tx.source || 'manual';

    this.setTypeActive(tx.type);
    this.updateCategoryDropdown(tx.type, tx.category);

    const personSelect = document.getElementById('txPerson');
    if (personSelect) personSelect.value = tx.person || 'משותף';

    this.txModal.classList.add('active');
  }

  openAddGoalModal(goalToEdit = null) {
    if (!this.goalModal) return;
    const titleEl = document.getElementById('goalModalTitle');
    const idInput = document.getElementById('goalIdInput');
    const nameInput = document.getElementById('goalNameInput');
    const targetInput = document.getElementById('goalTargetInput');
    const currentInput = document.getElementById('goalCurrentInput');
    const dateInput = document.getElementById('goalDateInput');
    const iconInput = document.getElementById('goalIconInput');

    if (goalToEdit) {
      titleEl.textContent = 'עריכת יעד חיסכון';
      idInput.value = goalToEdit.id;
      nameInput.value = goalToEdit.name;
      targetInput.value = goalToEdit.targetAmount;
      currentInput.value = goalToEdit.currentAmount;
      dateInput.value = goalToEdit.targetDate;
      iconInput.value = goalToEdit.icon || '🎯';
    } else {
      titleEl.textContent = 'הוספת יעד חיסכון חדש';
      idInput.value = '';
      nameInput.value = '';
      targetInput.value = '';
      currentInput.value = '0';
      dateInput.value = new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0];
      iconInput.value = '🎯';
    }

    this.goalModal.classList.add('active');
  }

  openImportExportModal() {
    this.app.switchView('importExport');
  }

  closeAll() {
    if (this.txModal) this.txModal.classList.remove('active');
    if (this.goalModal) this.goalModal.classList.remove('active');
    const catModal = document.getElementById('catModal');
    if (catModal) catModal.classList.remove('active');
    const mobileMenuModal = document.getElementById('mobileMenuModal');
    if (mobileMenuModal) mobileMenuModal.classList.remove('active');
  }


  setTypeActive(type) {
    document.querySelectorAll('.type-selector-buttons .type-btn').forEach(btn => {
      if (btn.dataset.type === type) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    document.getElementById('txTypeInput').value = type;
    this.updateCategoryDropdown(type);
  }

  populateOptions() {
    const settings = storage.getSettings();
    const personSelect = document.getElementById('txPerson');
    if (personSelect) {
      personSelect.innerHTML = `
        <option value="${settings.person1Name || 'Софа'}">${settings.person1Name || 'Софа'}</option>
        <option value="${settings.person2Name || 'Даник'}">${settings.person2Name || 'Даник'}</option>
        <option value="Вмести" selected>Вмести (משותף)</option>
      `;
    }
  }


  updateCategoryDropdown(type, selectedCategory = null) {
    const categories = storage.getCategories();
    const catSelect = document.getElementById('txCategory');
    if (!catSelect) return;

    const filtered = categories.filter(c => (c.kind || c.type) === type || !c.kind);
    
    catSelect.innerHTML = filtered.map(c => `
      <option value="${c.name}" ${selectedCategory === c.name ? 'selected' : ''}>
        ${c.icon || '📌'} ${c.name}
      </option>
    `).join('');

    if (!selectedCategory && filtered.length > 0) {
      catSelect.value = filtered[0].name;
    } else if (selectedCategory) {
      catSelect.value = selectedCategory;
    }
  }

  handleTxFormSubmit() {
    const date = document.getElementById('txDate').value;
    const amount = parseFloat(document.getElementById('txAmount').value);
    const type = document.getElementById('txTypeInput').value;
    const category = document.getElementById('txCategory').value;
    const person = document.getElementById('txPerson').value;
    const note = document.getElementById('txNote').value;
    const subcategory = document.getElementById('txSubcategory') ? document.getElementById('txSubcategory').value : '';
    const source = document.getElementById('txSource') ? document.getElementById('txSource').value : 'manual';

    if (!date || isNaN(amount) || amount <= 0) {
      alert('אנא הזן תאריך וסכום חיובי תקין.');
      return;
    }

    const dObj = new Date(date);
    const month = dObj.getMonth() + 1;
    const year = dObj.getFullYear();

    const txData = { date, amount, type, category, subcategory, person, note, source, month, year };

    if (this.currentEditingId) {
      storage.updateTransaction(this.currentEditingId, txData);
    } else {
      storage.addTransaction(txData);
    }

    this.closeAll();
    this.app.renderAll();
  }

  handleGoalFormSubmit() {
    const id = document.getElementById('goalIdInput').value;
    const goalData = {
      name: document.getElementById('goalNameInput').value.trim(),
      targetAmount: parseFloat(document.getElementById('goalTargetInput').value),
      currentAmount: parseFloat(document.getElementById('goalCurrentInput').value) || 0,
      targetDate: document.getElementById('goalDateInput').value,
      icon: document.getElementById('goalIconInput').value.trim() || '🎯'
    };

    if (!goalData.name || isNaN(goalData.targetAmount) || goalData.targetAmount <= 0) {
      alert('אנא הזן שם יעד וסכום יעד תקינים');
      return;
    }

    if (id) {
      storage.updateSavingsGoal(id, goalData);
    } else {
      storage.addSavingsGoal(goalData);
    }

    this.closeAll();
    this.app.renderAll();
  }
}

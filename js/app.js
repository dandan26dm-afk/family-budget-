/**
 * Main Application Controller & View Routing System
 */

import { storage } from './services/storageAdapter.js';
import { ModalManager } from './ui/modals.js';
import { DashboardRenderer } from './ui/dashboard.js';
import { TransactionsRenderer } from './ui/transactions.js';
import { CategoriesRenderer } from './ui/categories.js';
import { ImportExportRenderer } from './ui/importExport.js';
import { SettingsRenderer } from './ui/settings.js';

class FamilyBudgetApp {
  constructor() {
    this.currentView = 'dashboard'; // 'dashboard' | 'transactions' | 'categories' | 'savings' | 'importExport' | 'settings'
    
    const settings = storage.getSettings();
    this.selectedMonth = settings.defaultMonth || 7;
    this.selectedYear = settings.defaultYear || 2026;

    this.filters = {
      month: this.selectedMonth,
      year: this.selectedYear,
      category: 'all',
      person: 'all',
      type: 'all',
      search: ''
    };

    this.dashboardRenderer = new DashboardRenderer(this);
    this.transactionsRenderer = new TransactionsRenderer(this);
    this.categoriesRenderer = new CategoriesRenderer(this);
    this.importExportRenderer = new ImportExportRenderer(this);
    this.settingsRenderer = new SettingsRenderer(this);
    this.modalManager = new ModalManager(this);

    this.init();
  }

  init() {
    this.initTheme();
    this.populateCategoryFilter();
    this.initEventListeners();
    this.renderAll();
  }

  initTheme() {
    const savedTheme = localStorage.getItem('fb_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('fb_theme', next);
  }

  populateCategoryFilter() {
    const categories = storage.getCategories();
    const catSelect = document.getElementById('filterCategory');
    if (catSelect) {
      catSelect.innerHTML = `<option value="all">כל הקטגוריות</option>` +
        categories.map(c => `<option value="${c.name}">${c.icon || ''} ${c.name}</option>`).join('');
    }
  }

  initEventListeners() {
    // Theme toggle button
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Add Transaction CTAs
    document.querySelectorAll('#btnAddTransaction, #fabAddTransaction').forEach(btn => {
      if (btn) btn.addEventListener('click', () => this.modalManager.openAddTransactionModal());
    });

    // Add Savings Goal CTA
    const btnAddGoal = document.getElementById('btnAddGoalBtn');
    if (btnAddGoal) {
      btnAddGoal.addEventListener('click', () => this.modalManager.openAddGoalModal());
    }

    // Import/Export Modal CTA
    const importExportBtn = document.getElementById('btnImportExportModal');
    if (importExportBtn) {
      importExportBtn.addEventListener('click', () => this.switchView('importExport'));
    }

    // Month / Year Navigation Selectors
    const monthSelect = document.getElementById('selectMonth');
    const yearSelect = document.getElementById('selectYear');

    if (monthSelect) {
      monthSelect.value = this.selectedMonth;
      monthSelect.addEventListener('change', (e) => {
        this.selectedMonth = parseInt(e.target.value, 10);
        this.filters.month = this.selectedMonth;
        this.renderAll();
      });
    }

    if (yearSelect) {
      yearSelect.value = this.selectedYear;
      yearSelect.addEventListener('change', (e) => {
        this.selectedYear = parseInt(e.target.value, 10);
        this.filters.year = this.selectedYear;
        this.renderAll();
      });
    }

    // Quick Prev / Next Month Arrow Buttons
    const btnPrevMonth = document.getElementById('btnPrevMonth');
    if (btnPrevMonth) {
      btnPrevMonth.addEventListener('click', () => this.changeMonth(-1));
    }

    const btnNextMonth = document.getElementById('btnNextMonth');
    if (btnNextMonth) {
      btnNextMonth.addEventListener('click', () => this.changeMonth(1));
    }

    // Filters Bar
    ['filterPerson', 'filterCategory', 'filterType'].forEach(id => {
      const elem = document.getElementById(id);
      if (elem) {
        elem.addEventListener('change', (e) => {
          const key = id.replace('filter', '').toLowerCase();
          this.filters[key] = e.target.value;
          this.renderAll();
        });
      }
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.transactionsRenderer.render(this.filters);
      });
    }

    // Mobile More Menu Drawer
    const btnMobileMore = document.getElementById('btnMobileMoreMenu');
    const mobileMenuModal = document.getElementById('mobileMenuModal');
    if (btnMobileMore && mobileMenuModal) {
      btnMobileMore.addEventListener('click', () => {
        mobileMenuModal.classList.add('active');
      });

      mobileMenuModal.querySelectorAll('.mobile-menu-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          mobileMenuModal.classList.remove('active');
          if (btn.dataset.view) this.switchView(btn.dataset.view);
        });
      });
    }

    const btnMobileTheme = document.getElementById('btnMobileThemeToggle');
    if (btnMobileTheme) {
      btnMobileTheme.addEventListener('click', () => {
        this.toggleTheme();
        if (mobileMenuModal) mobileMenuModal.classList.remove('active');
      });
    }

    // Navigation (Sidebar & Mobile Nav)
    document.querySelectorAll('.sidebar-item, .nav-item-mobile[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (view) this.switchView(view);
      });
    });

  }

  changeMonth(delta) {
    let m = this.selectedMonth + delta;
    let y = this.selectedYear;
    if (m > 12) {
      m = 1;
      y += 1;
    } else if (m < 1) {
      m = 12;
      y -= 1;
    }

    this.selectedMonth = m;
    this.selectedYear = y;
    this.filters.month = m;
    this.filters.year = y;

    const monthSelect = document.getElementById('selectMonth');
    const yearSelect = document.getElementById('selectYear');
    if (monthSelect) monthSelect.value = m;
    if (yearSelect) yearSelect.value = y;

    this.renderAll();
  }

  switchView(viewName) {
    this.currentView = viewName;

    // Update Sidebar & Mobile Nav active classes
    document.querySelectorAll('.sidebar-item, .nav-item-mobile[data-view]').forEach(btn => {
      if (btn.dataset.view === viewName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Hide all view screens
    const viewIds = ['viewDashboard', 'viewTransactions', 'viewCategories', 'viewSavings', 'viewImportExport', 'viewSettings'];
    viewIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    // Show target view
    const targetMap = {
      dashboard: 'viewDashboard',
      transactions: 'viewTransactions',
      categories: 'viewCategories',
      savings: 'viewSavings',
      importExport: 'viewImportExport',
      settings: 'viewSettings'
    };

    const activeEl = document.getElementById(targetMap[viewName]);
    if (activeEl) activeEl.style.display = 'block';

    this.renderAll();
  }

  renderAll() {
    this.dashboardRenderer.renderKPIs(this.selectedMonth, this.selectedYear);
    this.dashboardRenderer.renderCategoryBreakdown(this.selectedMonth, this.selectedYear, this.filters.person);
    this.dashboardRenderer.renderPersonBreakdown(this.selectedMonth, this.selectedYear);
    this.dashboardRenderer.renderSavingsGoals();
    this.dashboardRenderer.renderCharts(this.selectedMonth, this.selectedYear, this.filters.person);

    this.transactionsRenderer.render(this.filters);

    if (this.currentView === 'categories') {
      this.categoriesRenderer.render();
    } else if (this.currentView === 'importExport') {
      this.importExportRenderer.render();
    } else if (this.currentView === 'settings') {
      this.settingsRenderer.render();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new FamilyBudgetApp();
});

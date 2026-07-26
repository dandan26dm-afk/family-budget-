/**
 * Settings UI Component
 */

import { storage } from '../services/storageAdapter.js';

export class SettingsRenderer {
  constructor(app) {
    this.app = app;
  }

  render() {
    const container = document.getElementById('viewSettings');
    if (!container) return;

    const settings = storage.getSettings();

    container.innerHTML = `
      <div class="widget-card">
        <div class="widget-header">
          <div>
            <h2 class="widget-title">⚙️ הגדרות מערכת והעדפות</h2>
            <div class="kpi-subtext" style="margin-top: 0.25rem;">
              הגדרת שמות בני הזוג, מטבע ראשי, יעד הכנסות ותקציב חודשי, ואיפוס נתונים.
            </div>
          </div>
        </div>

        <form id="settingsForm" style="margin-top: 1.5rem; max-width: 650px; display: flex; flex-direction: column; gap: 1.25rem;">
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label" for="settingPerson1">שם בן/בת זוג 1</label>
              <input type="text" id="settingPerson1" class="form-input" value="${settings.person1Name || 'בן זוג 1'}" required>
            </div>

            <div class="form-group">
              <label class="form-label" for="settingPerson2">שם בן/בת זוג 2</label>
              <input type="text" id="settingPerson2" class="form-input" value="${settings.person2Name || 'בן זוג 2'}" required>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label" for="settingCurrency">מטבע תצוגה</label>
              <select id="settingCurrency" class="form-select">
                <option value="₪" ${settings.currency === '₪' ? 'selected' : ''}>₪ - שקל חדש (ILS)</option>
                <option value="$" ${settings.currency === '$' ? 'selected' : ''}>$ - דולר ארה"ב (USD)</option>
                <option value="€" ${settings.currency === '€' ? 'selected' : ''}>€ - אירו (EUR)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="settingExportFormat">פורמט ייצוא ברירת מחדל</label>
              <select id="settingExportFormat" class="form-select">
                <option value="xlsx" ${settings.exportFormat === 'xlsx' ? 'selected' : ''}>Excel (.xlsx)</option>
                <option value="csv" ${settings.exportFormat === 'csv' ? 'selected' : ''}>CSV (.csv)</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label" for="settingIncomeTarget">יעד הכנסות חודשי משותף (₪)</label>
              <input type="number" id="settingIncomeTarget" class="form-input" value="${settings.monthlyIncomeTarget || 30000}" step="500">
            </div>

            <div class="form-group">
              <label class="form-label" for="settingBudgetLimit">תקרת הוצאות חודשית יעד (₪)</label>
              <input type="number" id="settingBudgetLimit" class="form-input" value="${settings.monthlyBudgetLimit || 22000}" step="500">
            </div>
          </div>

          <div style="margin-top: 1rem; display: flex; gap: 1rem; align-items: center;">
            <button type="submit" class="btn btn-primary" style="padding: 0.75rem 2rem;">
              💾 שמירת הגדרות
            </button>
          </div>

          <hr style="border: none; border-top: 1px solid var(--border-color); margin: 1.5rem 0 0.5rem 0;">

          <div>
            <h3 style="font-size: 1rem; color: var(--color-expense); margin-bottom: 0.5rem;">🚨 איפוס נתונים</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.875rem;">
              פעולה זו תאפס את כל התנועות והקטגוריות בדפדפן ותחזיר את נתוני ההדגמה הראשוניים.
            </p>
            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
              <button type="button" id="btnResetClean" class="btn btn-primary" style="background: #dc2626; border-color: #dc2626;">
                🧹 איפוס נקי מלא (ללא תנועות הדגמה - מוכן לייבוא)
              </button>

              <button type="button" id="btnResetAllData" class="btn btn-secondary" style="color: var(--color-expense); border-color: var(--color-expense-border);">
                🔄 איפוס והחזרת נתוני הדגמה
              </button>
            </div>
          </div>

        </form>
      </div>
    `;

    this.attachEventListeners(container);
  }

  attachEventListeners(container) {
    const form = container.querySelector('#settingsForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const updated = {
          person1Name: container.querySelector('#settingPerson1').value.trim(),
          person2Name: container.querySelector('#settingPerson2').value.trim(),
          currency: container.querySelector('#settingCurrency').value,
          exportFormat: container.querySelector('#settingExportFormat').value,
          monthlyIncomeTarget: parseFloat(container.querySelector('#settingIncomeTarget').value) || 30000,
          monthlyBudgetLimit: parseFloat(container.querySelector('#settingBudgetLimit').value) || 22000
        };

        storage.saveSettings(updated);
        alert('ההגדרות שנשמרו בהצלחה!');
        this.app.renderAll();
      });
    }

    const btnResetClean = container.querySelector('#btnResetClean');
    if (btnResetClean) {
      btnResetClean.addEventListener('click', () => {
        if (confirm('האם אינך רוצה שיהיו תנועות בכלל במערכת (איפוס נקי) כדי לייבא את הקובץ שלך?')) {
          storage.clearAll(true);
          alert('כל התנועות נמחקו בהצלחה! האפליקציה נקייה ומוכנה לייבוא הקובץ שלך.');
          window.location.reload();
        }
      });
    }

    const btnReset = container.querySelector('#btnResetAllData');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm('האם אישרת לאפס את הנתונים ולהחזיר את נתוני ההדגמה הראשוניים?')) {
          storage.clearAll(false);
          alert('הנתונים אופסו בהצלחה והוחזרו נתוני הדגמה!');
          window.location.reload();
        }
      });
    }
  }
}


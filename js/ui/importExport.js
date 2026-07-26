/**
 * Import & Export Wizard UI Component
 * Features complex sheet selection, IMPORT_TRANSACTIONS priority, raw sheet grid preview,
 * header & data start row selectors, column detection status badges, unique category extraction,
 * dynamic category mapping & creation, formula error validation (#VALUE!, #REF!),
 * preview table, duplicate detection, and multi-sheet Excel export.
 */

import { storage } from '../services/storageAdapter.js';
import { excelService } from '../services/excelImporter.js';

export class ImportExportRenderer {
  constructor(app) {
    this.app = app;
    this.currentWorkbook = null;
    this.currentSheetName = null;
    this.rawRows = [];
    this.headerRowIdx = 0;
    this.dataStartRowIdx = 1;
    this.columnMapping = {};
    this.extractedCategories = [];
    this.categoryMappingConfig = {};
    this.validatedRows = [];
  }

  render() {
    const container = document.getElementById('viewImportExport');
    if (!container) return;

    container.innerHTML = `
      <div class="widget-card">
        <div class="widget-header">
          <div>
            <h2 class="widget-title">📥 ייבוא וייצוא נתונים מ-Excel ו-CSV</h2>
            <div class="kpi-subtext" style="margin-top: 0.25rem;">
              תמיכה בקבצי Excel מורכבים (כותרות עליונות, סיכומים, נוסחאות), זיהוי שורות כותרת, זיהוי קטגוריות אוטומטי וייצוא מלא.
            </div>
          </div>
          <button id="btnTriggerExportExcel" class="btn btn-primary">
            📄 ייצא קובץ Excel מרובה-גיליונות
          </button>
        </div>

        <!-- Import Wizard Container -->
        <div class="import-wizard-container" style="margin-top: 1.5rem;">
          
          <!-- Step 1: File Upload Dropzone -->
          <div id="importStep1" class="wizard-step active">
            <h3 style="font-size: 1.05rem; margin-bottom: 0.75rem;">1. העלאת קובץ (Excel / CSV)</h3>
            
            <div id="dropzone" class="file-dropzone">
              <div class="dropzone-icon">📁</div>
              <div class="dropzone-title">לחץ או גרור קובץ Excel (.xlsx, .xls) או CSV לכאן</div>
              <div class="dropzone-subtext">תמיכה מלאה בקבצים מורכבים וגליונות מנורמלים (כגון IMPORT_TRANSACTIONS)</div>
              <input type="file" id="wizardFileInput" accept=".xlsx, .xls, .csv" style="display: none;">
            </div>
          </div>

          <!-- Step 2: Sheet Selector, Header Row Selector & Column Mapping -->
          <div id="importStep2" class="wizard-step" style="display: none; margin-top: 1.5rem;">
            <div class="widget-header">
              <h3 style="font-size: 1.05rem;">2. בחירת שורת כותרת ומיפוי עמודות</h3>
              <button id="btnBackToStep1" class="btn btn-secondary btn-sm">↩️ החלף קובץ</button>
            </div>

            <!-- Sheet Selector -->
            <div id="sheetSelectorRow" class="form-group" style="display: none; margin-top: 1rem;">
              <label class="form-label" for="sheetSelectDropdown">בחר גיליון בקובץ (Sheet):</label>
              <select id="sheetSelectDropdown" class="form-select" style="max-width: 350px;">
                <!-- Sheets options -->
              </select>
            </div>

            <!-- Row Index Controls for Header and Data Start -->
            <div style="background: var(--bg-subtle); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-top: 1rem;">
              
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
                <div class="form-group">
                  <label class="form-label">📍 שורת הכותרות בגיליון (Header Row):</label>
                  <select id="selectHeaderRow" class="form-select">
                    <!-- Dynamic row index options -->
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">🚀 שורת התחלת הנתונים (Data Start Row):</label>
                  <select id="selectDataStartRow" class="form-select">
                    <!-- Dynamic row index options -->
                  </select>
                </div>
              </div>

              <!-- Column Detection Badges Summary -->
              <div id="columnDetectionStatusBadges" style="margin-bottom: 1.25rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
                <!-- Injected status badges -->
              </div>

              <!-- Interactive Column Mapping Selectors -->
              <div style="font-weight: 700; margin-bottom: 0.75rem; color: var(--color-accent);">
                🔍 מיפוי עמודות מהשורה שנבחרה:
              </div>
              <div id="mappingGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem;">
                <!-- Column Selectors dynamically injected -->
              </div>

              <!-- Raw Sheet Preview Grid -->
              <div style="margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                  <span>👁️ תצוגת הגיליון הגולמי (Raw Sheet Grid):</span>
                  <span style="font-size: 0.78rem; color: var(--text-muted);">השתמש במספרי השורות כדי לבחור את שורת הכותרת הנכונה</span>
                </div>

                <div class="table-container" style="max-height: 250px; overflow-y: auto;">
                  <table class="tx-table" style="font-size: 0.8rem;">
                    <thead id="rawGridHeader">
                      <!-- Grid header -->
                    </thead>
                    <tbody id="rawGridBody">
                      <!-- Grid rows -->
                    </tbody>
                  </table>
                </div>
              </div>

              <div style="margin-top: 1.25rem; display: flex; justify-content: flex-end;">
                <button id="btnProceedToCategories" class="btn btn-primary">
                  🏷️ המשיכו לזיהוי ומיפוי קטגוריות ➔
                </button>
              </div>
            </div>
          </div>

          <!-- Step 2.5: Category Extraction & Adaptation -->
          <div id="importStepCategories" class="wizard-step" style="display: none; margin-top: 1.5rem;">
            <div class="widget-header">
              <div>
                <h3 style="font-size: 1.05rem;">2.5 זיהוי והתאמת קטגוריות מהקובץ</h3>
                <div class="kpi-subtext">המערכת חילצה את הקטגוריות הייחודיות הבאות מהקובץ. תוכל להגדיר להן סיווג או למיפות אותן לקטגוריות קיימות.</div>
              </div>
              <button id="btnBackToStep2" class="btn btn-secondary btn-sm">↩️ חזור למיפוי עמודות</button>
            </div>

            <div id="categoriesMappingContainer" style="margin-top: 1rem; display: flex; flex-direction: column; gap: 1rem;">
              <!-- Dynamically injected category mapping rows -->
            </div>

            <div style="margin-top: 1.25rem; display: flex; justify-content: flex-end;">
              <button id="btnProceedToPreview" class="btn btn-primary">
                🔍 תצוגה מקדימה ואימות תנועות ➔
              </button>
            </div>
          </div>

          <!-- Step 3: Data Preview & Validation -->
          <div id="importStep3" class="wizard-step" style="display: none; margin-top: 1.5rem;">
            <div class="widget-header">
              <h3 style="font-size: 1.05rem;">3. תצוגה מקדימה ואישור קליטה</h3>
              <button id="btnBackToCategories" class="btn btn-secondary btn-sm">↩️ חזור למיפוי קטגוריות</button>
            </div>

            <div id="importSummaryBadge" style="margin-top: 0.75rem;">
              <!-- Summary of valid / error / duplicate rows -->
            </div>

            <!-- Preview Table -->
            <div class="table-container" style="margin-top: 1rem; max-height: 400px; overflow-y: auto;">
              <table class="tx-table">
                <thead>
                  <tr>
                    <th># שורת Excel</th>
                    <th>תאריך</th>
                    <th>סכום</th>
                    <th>סוג</th>
                    <th>קטגוריה ממופה</th>
                    <th>תיאור / הערה</th>
                    <th>שיוך</th>
                    <th>סטטוס אימות</th>
                  </tr>
                </thead>
                <tbody id="previewTableBody">
                  <!-- Rows injected -->
                </tbody>
              </table>
            </div>

            <div style="margin-top: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem;">
                <input type="checkbox" id="chkSkipDuplicates" checked>
                <span>דילוג אוטומטי על תנועות כפולות שזוהו במערכת</span>
              </label>

              <button id="btnConfirmImport" class="btn btn-primary" style="padding: 0.75rem 2rem; font-size: 1.05rem;">
                ✅ אישור וקליטת תנועות למערכת
              </button>
            </div>
          </div>

          <!-- Past Import Batches Log -->
          <div style="margin-top: 3rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
            <h3 style="font-size: 1.1rem; margin-bottom: 0.875rem;">📜 היסטוריית ייבוא קבצים (Import Batches)</h3>
            <div id="importBatchesLog">
              <!-- Rendered import batches -->
            </div>
          </div>

        </div>
      </div>
    `;

    this.attachEventListeners(container);
    this.renderImportBatchesLog(container);
  }

  attachEventListeners(container) {
    const dropzone = container.querySelector('#dropzone');
    const fileInput = container.querySelector('#wizardFileInput');
    const btnExport = container.querySelector('#btnTriggerExportExcel');

    if (btnExport) {
      btnExport.addEventListener('click', () => excelService.exportToExcel());
    }

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          this.handleFileUpload(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleFileUpload(e.target.files[0]);
        }
      });
    }

    const btnBack1 = container.querySelector('#btnBackToStep1');
    if (btnBack1) {
      btnBack1.addEventListener('click', () => {
        container.querySelector('#importStep1').style.display = 'block';
        container.querySelector('#importStep2').style.display = 'none';
        container.querySelector('#importStepCategories').style.display = 'none';
        container.querySelector('#importStep3').style.display = 'none';
      });
    }

    const btnProceedCats = container.querySelector('#btnProceedToCategories');
    if (btnProceedCats) {
      btnProceedCats.addEventListener('click', () => this.generateCategoryMappingStep());
    }

    const btnBack2 = container.querySelector('#btnBackToStep2');
    if (btnBack2) {
      btnBack2.addEventListener('click', () => {
        container.querySelector('#importStep2').style.display = 'block';
        container.querySelector('#importStepCategories').style.display = 'none';
        container.querySelector('#importStep3').style.display = 'none';
      });
    }

    const btnBackCats = container.querySelector('#btnBackToCategories');
    if (btnBackCats) {
      btnBackCats.addEventListener('click', () => {
        container.querySelector('#importStepCategories').style.display = 'block';
        container.querySelector('#importStep3').style.display = 'none';
      });
    }

    const btnProceedPreview = container.querySelector('#btnProceedToPreview');
    if (btnProceedPreview) {
      btnProceedPreview.addEventListener('click', () => this.generatePreview());
    }

    const btnConfirm = container.querySelector('#btnConfirmImport');
    if (btnConfirm) {
      btnConfirm.addEventListener('click', () => this.executeImport());
    }
  }

  async handleFileUpload(file) {
    try {
      this.currentWorkbook = await excelService.readWorkbook(file);
      this.currentFileName = file.name;

      const sheetNames = this.currentWorkbook.SheetNames;
      if (!sheetNames || sheetNames.length === 0) {
        alert('הקובץ אינו מכיל גיליונות תקינים');
        return;
      }

      // Check for normalized sheet priority
      const bestSheet = excelService.findNormalizedSheetName(this.currentWorkbook);
      this.currentSheetName = bestSheet;

      const sheetDropdown = document.getElementById('sheetSelectDropdown');
      const sheetRow = document.getElementById('sheetSelectorRow');

      if (sheetNames.length > 1 && sheetDropdown) {
        sheetRow.style.display = 'block';
        sheetDropdown.innerHTML = sheetNames.map(name => `
          <option value="${name}" ${name === bestSheet ? 'selected' : ''}>
            ${name === bestSheet ? '⭐ ' + name + ' (גיליון מומלץ)' : name}
          </option>
        `).join('');
        
        sheetDropdown.onchange = (e) => {
          this.currentSheetName = e.target.value;
          this.loadSheetData();
        };
      } else if (sheetRow) {
        sheetRow.style.display = 'none';
      }

      this.loadSheetData();

      document.getElementById('importStep1').style.display = 'none';
      document.getElementById('importStep2').style.display = 'block';
    } catch (err) {
      console.error(err);
      alert(`שגיאה בקריאת הקובץ: ${err.message}`);
    }
  }

  loadSheetData() {
    this.rawRows = excelService.getSheetRawData(this.currentWorkbook, this.currentSheetName);
    if (!this.rawRows || this.rawRows.length === 0) {
      alert('הגיליון שנבחר ריק מנתונים');
      return;
    }

    // Auto detect candidate header and data start row
    const detected = excelService.detectHeaderAndDataRows(this.rawRows);
    this.headerRowIdx = detected.headerRowIdx;
    this.dataStartRowIdx = detected.dataStartRowIdx;

    this.renderRowIndexSelectors();
    this.renderRawGrid();
    this.renderColumnMappingAndBadges();
  }

  renderRowIndexSelectors() {
    const selHeader = document.getElementById('selectHeaderRow');
    const selDataStart = document.getElementById('selectDataStartRow');

    if (!selHeader || !selDataStart) return;

    const rowCount = Math.min(30, this.rawRows.length);
    const optionsHTML = Array.from({ length: rowCount }, (_, i) => {
      const sample = this.rawRows[i] ? this.rawRows[i].slice(0, 3).filter(Boolean).join(' | ') : 'שורה ריקה';
      return `<option value="${i}">שורה ${i+1}: ${sample.substring(0, 45)}</option>`;
    }).join('');

    selHeader.innerHTML = optionsHTML;
    selDataStart.innerHTML = optionsHTML;

    selHeader.value = this.headerRowIdx;
    selDataStart.value = this.dataStartRowIdx;

    selHeader.onchange = (e) => {
      this.headerRowIdx = parseInt(e.target.value, 10);
      if (this.dataStartRowIdx <= this.headerRowIdx) {
        this.dataStartRowIdx = Math.min(this.headerRowIdx + 1, this.rawRows.length - 1);
        selDataStart.value = this.dataStartRowIdx;
      }
      this.renderRawGrid();
      this.renderColumnMappingAndBadges();
    };

    selDataStart.onchange = (e) => {
      this.dataStartRowIdx = parseInt(e.target.value, 10);
      this.renderRawGrid();
      this.renderColumnMappingAndBadges();
    };
  }

  renderRawGrid() {
    const thead = document.getElementById('rawGridHeader');
    const tbody = document.getElementById('rawGridBody');
    if (!thead || !tbody) return;

    const previewRows = this.rawRows.slice(0, Math.min(15, this.rawRows.length));
    const maxCols = Math.min(10, Math.max(...previewRows.map(r => (r ? r.length : 0))));

    thead.innerHTML = `
      <tr>
        <th style="width: 70px; background: var(--bg-card);"># שורה</th>
        ${Array.from({ length: maxCols }, (_, i) => `<th>עמודה ${String.fromCharCode(65 + i)}</th>`).join('')}
      </tr>
    `;

    tbody.innerHTML = previewRows.map((row, idx) => {
      let isHeaderRow = idx === this.headerRowIdx;
      let isDataRow = idx >= this.dataStartRowIdx;
      let rowBg = 'transparent';
      if (isHeaderRow) rowBg = 'rgba(37, 99, 235, 0.15)';
      else if (isDataRow) rowBg = 'var(--bg-subtle)';

      return `
        <tr style="background-color: ${rowBg};">
          <td style="font-weight: 800; font-family: 'Rubik';">
            ${idx + 1} ${isHeaderRow ? '🔑 כותרת' : isDataRow ? '📄 נתון' : ''}
          </td>
          ${Array.from({ length: maxCols }, (_, cIdx) => {
            const cellVal = row && row[cIdx] !== undefined ? String(row[cIdx]).substring(0, 30) : '';
            return `<td style="${isHeaderRow ? 'font-weight: 800; color: var(--color-accent);' : ''}">${cellVal || '-'}</td>`;
          }).join('')}
        </tr>
      `;
    }).join('');
  }

  renderColumnMappingAndBadges() {
    const headerRow = this.rawRows[this.headerRowIdx] || [];
    const headers = headerRow.map(h => String(h).trim());
    this.autoMapping = excelService.autoDetectColumns(headers);

    // Badges Container
    const badgesContainer = document.getElementById('columnDetectionStatusBadges');
    if (badgesContainer) {
      const dateBadge = this.autoMapping.dateCol >= 0 
        ? `<span class="badge badge-income">✓ תאריך (עמודה ${String.fromCharCode(65 + this.autoMapping.dateCol)})</span>`
        : `<span class="badge badge-expense">⚠️ תאריך חסר</span>`;
      
      const amtBadge = this.autoMapping.amountCol >= 0 
        ? `<span class="badge badge-income">✓ סכום (עמודה ${String.fromCharCode(65 + this.autoMapping.amountCol)})</span>`
        : `<span class="badge badge-expense">⚠️ סכום חסר</span>`;

      const catBadge = this.autoMapping.categoryCol >= 0 
        ? `<span class="badge badge-income">✓ קטגוריה (עמודה ${String.fromCharCode(65 + this.autoMapping.categoryCol)})</span>`
        : `<span class="badge" style="background: #fef3c7; color: #b45309;">⚠️ קטגוריה (ידני)</span>`;

      const personBadge = this.autoMapping.personCol >= 0 
        ? `<span class="badge badge-income">✓ מי / אדם (עמודה ${String.fromCharCode(65 + this.autoMapping.personCol)})</span>`
        : `<span class="badge badge-person">מי: ברירת מחדל</span>`;

      badgesContainer.innerHTML = `${dateBadge} ${amtBadge} ${catBadge} ${personBadge}`;
    }

    const mappingGrid = document.getElementById('mappingGrid');
    if (!mappingGrid) return;

    const fields = [
      { key: 'dateCol', label: 'תאריך *', required: true },
      { key: 'amountCol', label: 'סכום (₪) *', required: true },
      { key: 'categoryCol', label: 'קטגוריה', required: false },
      { key: 'subcategoryCol', label: 'תת-קטגוריה', required: false },
      { key: 'typeCol', label: 'סוג תנועה (הכנסה/הוצאה)', required: false },
      { key: 'descriptionCol', label: 'תיאור / הערה', required: false },
      { key: 'personCol', label: 'מי / שיוך אדם', required: false }
    ];

    mappingGrid.innerHTML = fields.map(f => {
      const selectedIndex = this.autoMapping[f.key];
      const optionsHTML = `<option value="-1">-- לא ממופה --</option>` +
        headers.map((h, i) => `<option value="${i}" ${i === selectedIndex ? 'selected' : ''}>עמודה ${String.fromCharCode(65 + i)}: ${h || 'ללא כותרת'}</option>`).join('');

      return `
        <div class="form-group">
          <label class="form-label" style="font-size: 0.85rem;">${f.label}</label>
          <select class="form-select column-map-select" data-field="${f.key}">
            ${optionsHTML}
          </select>
        </div>
      `;
    }).join('');
  }

  generateCategoryMappingStep() {
    const selects = document.querySelectorAll('.column-map-select');
    this.columnMapping = {};
    selects.forEach(sel => {
      this.columnMapping[sel.dataset.field] = parseInt(sel.value, 10);
    });

    if (this.columnMapping.dateCol === -1 || this.columnMapping.amountCol === -1) {
      alert('אנא בחר לפחות עמודת תאריך ועמודת סכום');
      return;
    }

    // Extract unique categories from raw rows starting from dataStartRowIdx
    this.extractedCategories = excelService.extractUniqueCategories(
      this.rawRows,
      this.columnMapping.categoryCol,
      this.dataStartRowIdx
    );

    const existingSystemCategories = storage.getCategories();
    const container = document.getElementById('categoriesMappingContainer');
    if (!container) return;

    if (this.extractedCategories.length === 0) {
      container.innerHTML = `
        <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md); text-align: center; color: var(--text-muted);">
          לא נמצאה עמודת קטגוריה או שאין קטגוריות ייחודיות בקובץ. התנועות ישויכו לקטגוריה "🎈אחר".
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.875rem;">
          ${this.extractedCategories.map((cat, idx) => {
            const existingMatch = existingSystemCategories.find(c => c.name.trim().toLowerCase() === cat.name.trim().toLowerCase());
            
            return `
              <div class="category-map-row" style="background: var(--bg-subtle); padding: 0.875rem 1.125rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.875rem;">
                
                <div style="display: flex; align-items: center; gap: 0.5rem; min-width: 180px;">
                  <span style="font-size: 1.2rem;">📁</span>
                  <div>
                    <strong style="font-size: 0.95rem;">${cat.name}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">נמצא בקובץ</div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; flex: 1; justify-content: flex-end;">
                  <div class="form-group" style="margin: 0; min-width: 180px;">
                    <select class="form-select cat-map-action-select" data-orig="${cat.name}">
                      <option value="create_new" ${!existingMatch ? 'selected' : ''}>✨ צור כקטגוריה חדשה במערכת</option>
                      ${existingSystemCategories.map(c => `
                        <option value="existing_${c.name}" ${existingMatch && existingMatch.name === c.name ? 'selected' : ''}>
                          🔗 שייך לקטגוריה קיימת: ${c.icon || ''} ${c.name}
                        </option>
                      `).join('')}
                    </select>
                  </div>

                  <div class="cat-new-options" data-orig="${cat.name}" style="display: ${!existingMatch ? 'flex' : 'none'}; gap: 0.5rem; align-items: center;">
                    <select class="form-select cat-kind-select" data-orig="${cat.name}" style="width: 110px;">
                      <option value="expense" ${cat.kind === 'expense' ? 'selected' : ''}>📉 הוצאה</option>
                      <option value="income" ${cat.kind === 'income' ? 'selected' : ''}>📈 הכנסה</option>
                      <option value="savings" ${cat.kind === 'savings' ? 'selected' : ''}>🐖 חיסכון</option>
                    </select>

                    <input type="text" class="form-input cat-icon-input" data-orig="${cat.name}" value="${cat.icon}" style="width: 50px; text-align: center;" title="אייקון">
                    <input type="color" class="form-input cat-color-input" data-orig="${cat.name}" value="${cat.color}" style="width: 50px; padding: 2px; height: 44px;" title="צבע">
                  </div>
                </div>

              </div>
            `;
          }).join('')}
        </div>
      `;

      // Attach event listeners for action dropdown changes
      container.querySelectorAll('.cat-map-action-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const orig = e.target.dataset.orig;
          const optDiv = container.querySelector(`.cat-new-options[data-orig="${orig}"]`);
          if (optDiv) {
            optDiv.style.display = e.target.value === 'create_new' ? 'flex' : 'none';
          }
        });
      });
    }

    document.getElementById('importStep2').style.display = 'none';
    document.getElementById('importStepCategories').style.display = 'block';
  }

  generatePreview() {
    // Read user category mapping configuration
    this.categoryMappingConfig = {};
    const mapContainer = document.getElementById('categoriesMappingContainer');

    if (mapContainer) {
      this.extractedCategories.forEach(cat => {
        const actionSel = mapContainer.querySelector(`.cat-map-action-select[data-orig="${cat.name}"]`);
        const actionVal = actionSel ? actionSel.value : 'create_new';

        if (actionVal === 'create_new') {
          const kindSel = mapContainer.querySelector(`.cat-kind-select[data-orig="${cat.name}"]`);
          const iconInp = mapContainer.querySelector(`.cat-icon-input[data-orig="${cat.name}"]`);
          const colorInp = mapContainer.querySelector(`.cat-color-input[data-orig="${cat.name}"]`);

          this.categoryMappingConfig[cat.name] = {
            mode: 'create_new',
            targetName: cat.name,
            kind: kindSel ? kindSel.value : cat.kind,
            icon: iconInp ? iconInp.value.trim() : cat.icon,
            color: colorInp ? colorInp.value : cat.color
          };
        } else if (actionVal.startsWith('existing_')) {
          const targetName = actionVal.replace('existing_', '');
          const existingCat = storage.getCategories().find(c => c.name === targetName);
          this.categoryMappingConfig[cat.name] = {
            mode: 'map_existing',
            targetName: targetName,
            kind: existingCat ? existingCat.kind || existingCat.type : 'expense'
          };
        }
      });
    }

    const existingTx = storage.getTransactions();
    this.validatedRows = excelService.validateAndPrepareImportRows(
      this.rawRows,
      this.columnMapping,
      existingTx,
      this.categoryMappingConfig,
      this.dataStartRowIdx
    );

    const container = document.getElementById('viewImportExport');
    const tbody = container.querySelector('#previewTableBody');
    const summaryBadge = container.querySelector('#importSummaryBadge');
    const confirmBtn = container.querySelector('#btnConfirmImport');

    const validCount = this.validatedRows.filter(r => r.isValid && !r.isDuplicate).length;
    const dupCount = this.validatedRows.filter(r => r.isDuplicate).length;
    const errCount = this.validatedRows.filter(r => !r.isValid).length;

    summaryBadge.innerHTML = `
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <span class="badge badge-income">✓ ${validCount} שורות תקינות לקליטה</span>
        ${dupCount > 0 ? `<span class="badge" style="background: #fef3c7; color: #b45309;">⚠️ ${dupCount} כפילויות שזוהו</span>` : ''}
        ${errCount > 0 ? `<span class="badge badge-expense">✕ ${errCount} שורות לא תקינות (#VALUE! / תאריך / סכום)</span>` : ''}
      </div>
    `;

    confirmBtn.textContent = `✅ אישור וקליטת ${validCount} תנועות למערכת`;

    tbody.innerHTML = this.validatedRows.map(r => {
      let rowBg = 'transparent';
      let statusBadge = '<span class="badge badge-income">תקין</span>';

      if (!r.isValid) {
        rowBg = 'var(--color-expense-bg)';
        statusBadge = `<span class="badge badge-expense">שגיאה: ${r.errors.join(', ')}</span>`;
      } else if (r.isDuplicate) {
        rowBg = 'rgba(245, 158, 11, 0.12)';
        statusBadge = '<span class="badge" style="background: #fef3c7; color: #b45309;">אזהרת כפילות</span>';
      }

      return `
        <tr style="background-color: ${rowBg};">
          <td style="font-weight: 800; font-family: 'Rubik';">${r.rowIndex}</td>
          <td>${r.formattedDate}</td>
          <td style="font-weight: 700;">₪${r.amount.toLocaleString()}</td>
          <td>${r.type === 'income' ? '📈 הכנסה' : r.type === 'savings' ? '🐖 חיסכון' : '📉 הוצאה'}</td>
          <td style="font-weight: 700;">${r.category}</td>
          <td>${r.note || '-'}</td>
          <td><span class="badge badge-person">${r.person}</span></td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');

    document.getElementById('importStepCategories').style.display = 'none';
    document.getElementById('importStep3').style.display = 'block';
  }

  executeImport() {
    const chkSkipDuplicates = document.getElementById('chkSkipDuplicates');
    const skipDup = chkSkipDuplicates ? chkSkipDuplicates.checked : true;

    let rowsToImport = this.validatedRows.filter(r => r.isValid);
    if (skipDup) {
      rowsToImport = rowsToImport.filter(r => !r.isDuplicate);
    }

    if (rowsToImport.length === 0) {
      alert('אין תנועות תקינות לקליטה במערכת');
      return;
    }

    // 1. Create all newly mapped categories in storage
    let newCategoriesCreatedCount = 0;
    Object.values(this.categoryMappingConfig).forEach(cfg => {
      if (cfg.mode === 'create_new') {
        const created = storage.ensureCategoryExists({
          name: cfg.targetName,
          kind: cfg.kind,
          icon: cfg.icon,
          color: cfg.color
        });
        if (created) newCategoriesCreatedCount++;
      }
    });

    // 2. Save import batch record
    const batch = storage.addImportBatch({
      fileName: this.currentFileName || 'קובץ Excel/CSV',
      rowsTotal: this.validatedRows.length,
      rowsValid: rowsToImport.length,
      rowsInvalid: this.validatedRows.length - rowsToImport.length
    });

    // 3. Save transactions
    const txToSave = rowsToImport.map(r => ({
      date: r.date,
      amount: r.amount,
      type: r.type,
      category: r.category,
      subcategory: r.subcategory,
      note: r.note,
      person: r.person,
      source: 'import',
      batchId: batch.id
    }));

    storage.addMultipleTransactions(txToSave);

    alert(`הייבוא הושלם בהצלחה!\n• ${rowsToImport.length} תנועות נקלטו למערכת.\n• ${newCategoriesCreatedCount} קטגוריות חדשות נוצרו ועודכנו.`);

    // 4. Update UI everywhere dynamically
    this.app.populateCategoryFilter();
    this.app.renderAll();
    this.render();
  }

  renderImportBatchesLog(container) {
    const logContainer = container.querySelector('#importBatchesLog');
    if (!logContainer) return;

    const batches = storage.getImportBatches();
    if (!batches || batches.length === 0) {
      logContainer.innerHTML = `<div class="kpi-subtext">טרם בוצעו ייבואי קבצים במערכת.</div>`;
      return;
    }

    logContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        ${batches.map(b => `
          <div style="background: var(--bg-subtle); padding: 0.875rem 1.125rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <div style="font-weight: 700; font-size: 0.95rem;">📄 ${b.fileName}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">
                נקלט בתאריך: ${new Date(b.importedAt).toLocaleString('he-IL')}
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <span class="badge badge-income">✓ ${b.rowsValid} נקלטו</span>
              ${b.rowsInvalid > 0 ? `<span class="badge badge-expense">✕ ${b.rowsInvalid} שגיאות</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
}

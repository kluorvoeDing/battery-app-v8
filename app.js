        // Toggle Functions
        let isSidebarOpen = true;
        let isReportOpen = true;
        let isRateChartVisible = true; 
        // Debounce for resize
        let resizeTimeout;

        function toggleSidebar() {
            const sidebar = els.sidebarPanel;
            const expandBtn = els.sidebarExpandBtn;
            isSidebarOpen = !isSidebarOpen;
            
            if (isSidebarOpen) {
                sidebar.classList.remove('sidebar-collapsed');
                expandBtn.classList.add('hidden');
            } else {
                sidebar.classList.add('sidebar-collapsed');
                expandBtn.classList.remove('hidden');
            }
            
            setTimeout(() => {
                resizePreview();
                if(state.processedData) Plotly.Plots.resize('chartContainer');
            }, 300);
        }

        function toggleReport() {
            const report = els.reportPanel;
            const icon = els.reportToggleIcon;
            isReportOpen = !isReportOpen;

            if (isReportOpen) {
                report.classList.remove('report-collapsed');
                icon.style.transform = 'rotate(0deg)';
            } else {
                report.classList.add('report-collapsed');
                icon.style.transform = 'rotate(180deg)';
            }

            setTimeout(() => {
                resizePreview();
                if(state.processedData) Plotly.Plots.resize('chartContainer');
            }, 300);
        }

        function toggleRateChart() {
            isRateChartVisible = !isRateChartVisible;
            const btn = els.toggleRateBtn;
            btn.textContent = isRateChartVisible ? "開啟中" : "已隱藏";
            btn.className = isRateChartVisible ? 
                "bg-slate-200 text-slate-700 px-3 py-1 rounded text-xs font-bold hover:bg-slate-300 transition-colors" : 
                "bg-red-100 text-red-700 px-3 py-1 rounded text-xs font-bold hover:bg-red-200 transition-colors";
            
            if(state.processedData) renderCharts();
        }

        // --- NEW: Ratio Logic ---
        function updateAspectRatio(ratio) {
            const wInput = els.chartWidth;
            const hInput = els.chartHeight;
            const w = parseFloat(wInput.value);
            if (!isNaN(w) && w > 0) {
                hInput.value = (w / ratio).toFixed(1);
                resizePreview();
            }
        }

        // Reset Logic
        function resetApp() {
            const keepTemplate = confirm('是否保留目前模板設定（門檻/圖表/標記）？');
            state.files = [null, null];
            state.filesData = [null, null];
            state.wb = [null, null];
            state.mergedHeaders = [];
            state.processedData = null;
            state.reportData = null;
            if (!keepTemplate) {
                state.columnMap = { time1: -1, time2: -1, vol: -1, cur: -1, temps: [] };
                state.tempConfig = [];
                state.customAnnotations = [];
                state.customEvents = [];
            }

            els.fileInputs.forEach(inp => inp.value = '');
            els.pasteInputs.forEach(inp => inp.value = '');
            els.sheetSelects.forEach(sel => sel.innerHTML = '');
            els.sheetContainers.forEach(div => div.classList.add('hidden'));
            
            els.headerInputs.file[0].value = '';
            els.headerInputs.file[1].value = '';
            if (!keepTemplate) {
                els.thresholdVolDrop.value = '50';
                els.thresholdT1.value = '1';
                els.thresholdTtr.value = '10';
            }
            
            els.rangeVolMin.value = '0'; els.rangeVolMax.value = '5';
            els.rangeTempMin.value = '0'; els.rangeTempMax.value = '500';
            els.rangeCurMin.value = '0'; els.rangeCurMax.value = '50';
            els.rangeRateMin.value = '0'; els.rangeRateMax.value = '50';
            
            if (!keepTemplate) {
                els.annotationList.innerHTML = '';
                els.eventList.innerHTML = '';
                els.tempColorSection.innerHTML = '';
            }
            els.seriesRenameContainer.innerHTML = '';
            els.seriesRenameSection.classList.add('hidden');
            els.mappingSection.classList.add('hidden');
            els.reportPanel.classList.add('hidden');
            els.processBtn.disabled = true;

            isRateChartVisible = true;
            els.toggleRateBtn.textContent = "開啟中";
            els.toggleRateBtn.className = "bg-slate-200 text-slate-700 px-3 py-1 rounded text-xs font-bold hover:bg-slate-300 transition-colors";

            if (keepTemplate) {
                renderAnnotationList();
                renderEventList();
                renderTempColorInputs();
                renderRateSourceOptions();
                renderSeriesRenameInputs();
            }

            renderCharts(true);
        }

        function initAppState() {
            return {
                files: [null, null], filesData: [null, null], wb: [null, null], mergedHeaders: [], processedData: null, reportData: null,
                columnMap: { time1: -1, time2: -1, vol: -1, cur: -1, temps: [] },
                tempConfig: [],
                config: { downsample: 1, filterOutliers: true },
                inputMode: 'file',
                customAnnotations: [],
                customEvents: [],
                runHistory: [],
                templateMeta: null
            };
        }

        const state = initAppState();

        const PIXELS_PER_CM = 118; // 300 DPI approximation

        function initDomRefs() {
            const byId = (id) => document.getElementById(id);
            return {
                resetBtn: byId('resetBtn'),
                collapseSidebarBtn: byId('collapseSidebarBtn'),
                toggleReportBtn: byId('toggleReportBtn'),
                modeBtns: { file: byId('modeFileBtn'), paste: byId('modePasteBtn') },
                modeContents: { file: byId('modeFileContent'), paste: byId('modePasteContent') },
                fileInputs: [byId('fileInput1'), byId('fileInput2')],
                pasteInputs: [byId('pasteInput1'), byId('pasteInput2')],
                headerInputs: {
                    file: [byId('headerRowIndex1'), byId('headerRowIndex2')],
                    paste: [byId('headerRowIndex1_paste'), byId('headerRowIndex2_paste')]
                },
                sheetSelects: [byId('sheetSelect1'), byId('sheetSelect2')],
                sheetContainers: [byId('sheetSelectContainer1'), byId('sheetSelectContainer2')],
                encodingSelect: byId('encodingSelect'),
                downsampleSelect: byId('downsampleRate'),
                filterCheckbox: byId('filterOutliers'),
                processBtn: byId('processBtn'),
                chartContainer: byId('chartContainer'),
                mappingSection: byId('columnMappingSection'),
                f2TimeContainer: byId('f2TimeContainer'),
                mapSelects: { time1: byId('mapTime1'), time2: byId('mapTime2'), vol: byId('mapVol'), cur: byId('mapCur'), temp: byId('mapTemp') },
                applyMapBtn: byId('applyMappingBtn'),
                tempColorSection: byId('tempColorSection'),
                seriesRenameSection: byId('seriesRenameSection'),
                seriesRenameContainer: byId('seriesRenameContainer'),
                rateSourceSelect: byId('rateSource'),
                reportPanel: byId('reportPanel'),
                reportTableBody: byId('reportTableBody'),
                globalVolDrop: byId('globalVolDrop'),
                updateRangeBtn: byId('updateRangeBtn'),
                exportBtn: byId('exportImageBtn'),
                exportCsvBtn: byId('exportCsvBtn'),
                titleX: byId('titleX'), titleVol: byId('titleVol'), titleTemp: byId('titleTemp'), titleCur: byId('titleCur'), titleRate: byId('titleRate'),
                chartWidth: byId('chartWidth'), chartHeight: byId('chartHeight'),
                lockRatio: byId('lockRatio'),
                rangeTimeMin: byId('rangeTimeMin'), rangeTimeMax: byId('rangeTimeMax'),
                rangeVolMin: byId('rangeVolMin'), rangeVolMax: byId('rangeVolMax'),
                rangeTempMin: byId('rangeTempMin'), rangeTempMax: byId('rangeTempMax'),
                rangeCurMin: byId('rangeCurMin'), rangeCurMax: byId('rangeCurMax'),
                rangeRateMin: byId('rangeRateMin'), rangeRateMax: byId('rangeRateMax'),
                annotationInput: byId('annotationInput'), annotationSizeInput: byId('annotationSizeInput'),
                addAnnotationBtn: byId('addAnnotationBtn'), annotationList: byId('annotationList'),
                eventList: byId('eventList'), newEventTime: byId('newEventTime'), newEventLabel: byId('newEventLabel'), eventSizeInput: byId('eventSizeInput'), addEventBtn: byId('addEventBtn'),
                sidebarPanel: byId('sidebarPanel'), sidebarExpandBtn: byId('sidebarExpandBtn'),
                reportToggleIcon: byId('reportToggleIcon'), toggleRateBtn: byId('toggleRateBtn'),
                thresholdVolDrop: byId('thresholdVolDrop'), thresholdT1: byId('thresholdT1'), thresholdTtr: byId('thresholdTtr'),
                fontSizeSlider: byId('fontSizeSlider'), fontSizeDisplay: byId('fontSizeDisplay'),
                colorVol: byId('colorVol'), colorCur: byId('colorCur'), renameVol: byId('renameVol'), renameCur: byId('renameCur'),
                lineWidthSlider: byId('lineWidthSlider'), lineWidthDisplay: byId('lineWidthDisplay'),
                saveTemplateBtn: byId('saveTemplateBtn'), loadTemplateInput: byId('loadTemplateInput'),
                batchFilesInput: byId('batchFilesInput'), runBatchBtn: byId('runBatchBtn'), batchResult: byId('batchResult'),
                calcKpiBtn: byId('calcKpiBtn'), kpiResult: byId('kpiResult'),
                kpiCapacityAh: byId('kpiCapacityAh'), kpiNominalV: byId('kpiNominalV'), kpiMassG: byId('kpiMassG'),
                kpiLengthMm: byId('kpiLengthMm'), kpiWidthMm: byId('kpiWidthMm'), kpiHeightMm: byId('kpiHeightMm'),
                kpiCathodeUm: byId('kpiCathodeUm'), kpiAnodeUm: byId('kpiAnodeUm'), kpiSepUm: byId('kpiSepUm'),
                kpiTargetStackUm: byId('kpiTargetStackUm'), kpiToleranceUm: byId('kpiToleranceUm'),
                historyList: byId('historyList'), exportHistoryBtn: byId('exportHistoryBtn'), clearHistoryBtn: byId('clearHistoryBtn')
            };
        }

        const els = initDomRefs();

        window.addEventListener('load', () => { resizePreview(); renderCharts(true); });
        
        // Debounced Resize
        window.addEventListener('resize', () => { 
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                resizePreview();
            }, 100);
        });

        // Ratio Controls
        els.chartWidth.addEventListener('change', () => { 
            if(els.lockRatio.checked) {
                // Logic handled by manual input or buttons
            }
            resizePreview(); 
        });
        
        els.chartWidth.addEventListener('input', () => {
             if(els.lockRatio.checked) {
                 const w = parseFloat(els.chartWidth.value);
                 // If locking, we could calc H. But usually we let user type then calc.
                 // For now, simpler to rely on buttons for ratio or manual entry.
             }
        });

        // Ratio Buttons
        document.querySelectorAll('.ratio-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ratio = parseFloat(e.target.dataset.ratio);
                updateAspectRatio(ratio);
            });
        });

        els.chartHeight.addEventListener('change', () => { resizePreview(); });

        els.modeBtns.file.addEventListener('click', () => setInputMode('file'));
        els.modeBtns.paste.addEventListener('click', () => setInputMode('paste'));
        els.fileInputs.forEach((inp, idx) => inp.addEventListener('change', (e) => handleFileUpload(e, idx)));
        els.sheetSelects.forEach((sel, idx) => sel.addEventListener('change', () => parseFileContent(idx)));
        els.pasteInputs.forEach((txt, idx) => {
            txt.addEventListener('input', () => handleManualPaste(idx));
            txt.addEventListener('change', () => handleManualPaste(idx));
        });
        els.processBtn.addEventListener('click', () => { parseHeaders(); });
        els.applyMapBtn.addEventListener('click', () => { updateColumnMappingFromUI(true); processAndRender(); });
        els.updateRangeBtn.addEventListener('click', () => { if(state.processedData) { generateReports(state.processedData); renderCharts(); }});
        els.exportBtn.addEventListener('click', exportChart);
        els.exportCsvBtn.addEventListener('click', exportCSV);
        els.resetBtn.addEventListener('click', resetApp);
        els.collapseSidebarBtn.addEventListener('click', toggleSidebar);
        els.sidebarExpandBtn.addEventListener('click', toggleSidebar);
        els.toggleReportBtn.addEventListener('click', toggleReport);
        els.toggleRateBtn.addEventListener('click', toggleRateChart);
        
        els.rateSourceSelect.addEventListener('change', () => { if(state.processedData) renderCharts(); });
        [els.colorVol, els.colorCur, els.titleX, els.titleVol, els.titleTemp, els.titleCur, els.titleRate].forEach((node) => {
            node.addEventListener('change', () => { if(state.processedData) renderCharts(); });
        });
        
        els.fontSizeSlider.addEventListener('input', (e) => {
            els.fontSizeDisplay.textContent = e.target.value;
            if(state.processedData) renderCharts();
        });

        els.lineWidthSlider.addEventListener('input', (e) => {
            els.lineWidthDisplay.textContent = e.target.value;
            if(state.processedData) renderCharts();
        });

        // --- NEW FEATURES LISTENERS ---
        els.addAnnotationBtn.addEventListener('click', addFreeAnnotation);
        els.addEventBtn.addEventListener('click', addEventInputRow);
        els.saveTemplateBtn.addEventListener('click', saveTemplate);
        els.loadTemplateInput.addEventListener('change', loadTemplate);
        els.runBatchBtn.addEventListener('click', runBatchSummary);
        els.calcKpiBtn.addEventListener('click', calculateKpi);
        els.exportHistoryBtn.addEventListener('click', exportRunHistoryCSV);
        els.clearHistoryBtn.addEventListener('click', clearRunHistory);

        // --- PREVIEW RESIZE LOGIC ---
        function resizePreview() {
            const wrapper = document.getElementById('chartWrapper');
            const container = els.chartContainer;
            if (!wrapper || !container) return;

            const exportW_cm = parseFloat(els.chartWidth.value) || 16;
            const exportH_cm = parseFloat(els.chartHeight.value) || 8;
            const aspect = exportW_cm / exportH_cm;

            const pad = 32; 
            const availW = wrapper.clientWidth - pad;
            const availH = wrapper.clientHeight - pad;

            let w = availW;
            let h = w / aspect;

            if (h > availH) {
                h = availH;
                w = h * aspect;
            }

            container.style.width = `${w}px`;
            container.style.height = `${h}px`;
            
            if(container.data) {
                Plotly.Plots.resize(container);
            }
        }

        function setInputMode(mode) {
            state.inputMode = mode;
            if(mode === 'file') {
                els.modeBtns.file.className = els.modeBtns.file.className.replace('tab-inactive', 'tab-active');
                els.modeBtns.paste.className = els.modeBtns.paste.className.replace('tab-active', 'tab-inactive');
                els.modeContents.file.classList.remove('hidden');
                els.modeContents.paste.classList.add('hidden');
            } else {
                els.modeBtns.paste.className = els.modeBtns.paste.className.replace('tab-inactive', 'tab-active');
                els.modeBtns.file.className = els.modeBtns.file.className.replace('tab-active', 'tab-inactive');
                els.modeContents.paste.classList.remove('hidden');
                els.modeContents.file.classList.add('hidden');
            }
            checkFilesReady();
        }

        function handleFileUpload(e, fileIdx) {
            const file = e.target.files[0];
            if (!file) return;
            state.files[fileIdx] = file;
            const isExcel = file.name.match(/\.(xlsx|xlsm|xls)$/);
            const reader = new FileReader();
            if (isExcel) {
                reader.onload = (e) => {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {type: 'array'});
                    state.wb[fileIdx] = workbook;
                    els.sheetContainers[fileIdx].classList.remove('hidden');
                    els.sheetSelects[fileIdx].innerHTML = '';
                    workbook.SheetNames.forEach(sheet => els.sheetSelects[fileIdx].add(new Option(sheet, sheet)));
                    parseFileContent(fileIdx);
                };
                reader.readAsArrayBuffer(file);
            } else {
                els.sheetContainers[fileIdx].classList.add('hidden');
                state.wb[fileIdx] = null;
                reader.onload = (e) => {
                    const rows = e.target.result.split(/\r\n|\n/);
                    state.filesData[fileIdx] = { rawRows: rows };
                    autoDetectHeader(fileIdx);
                };
                reader.readAsText(file, els.encodingSelect.value);
            }
        }

        function handleManualPaste(fileIdx) {
            const text = els.pasteInputs[fileIdx].value;
            if (!text.trim()) { state.filesData[fileIdx] = null; return; }
            const rows = text.split(/\r\n|\n/);
            state.filesData[fileIdx] = { rawRows: rows };
            autoDetectHeader(fileIdx);
        }

        function parseFileContent(fileIdx) {
            if (state.wb[fileIdx]) {
                const sheetName = els.sheetSelects[fileIdx].value;
                const rows = XLSX.utils.sheet_to_csv(state.wb[fileIdx].Sheets[sheetName]).split(/\r\n|\n/);
                state.filesData[fileIdx] = { rawRows: rows };
                autoDetectHeader(fileIdx);
            }
        }

        function getHeaderInput(fileIdx) { return els.headerInputs[state.inputMode][fileIdx]; }

        function autoDetectHeader(fileIdx) {
            const rows = state.filesData[fileIdx].rawRows;
            let headerIndex = -1;
            const keywords = ['time', 'vol', 'temp', 'step', 'current', 'capacity', '時間', '電壓', '溫度'];
            for (let i = 0; i < Math.min(rows.length, 100); i++) {
                if (keywords.filter(k => rows[i].toLowerCase().includes(k)).length >= 2) { headerIndex = i; break; }
            }
            const inputEl = getHeaderInput(fileIdx);
            if(inputEl) inputEl.value = (headerIndex === -1 ? 0 : headerIndex) + 1;
            checkFilesReady();
        }

        function checkFilesReady() {
            if (state.filesData[0]) {
                els.processBtn.disabled = false;
                if(state.filesData[1]) els.f2TimeContainer.classList.remove('hidden');
                else els.f2TimeContainer.classList.add('hidden');
            } else {
                els.processBtn.disabled = true;
            }
        }

        function parseHeaders() {
            state.mergedHeaders = [];
            let hasError = false;
            state.filesData.forEach((fd, i) => {
                if(!fd || hasError) return;
                const inputEl = getHeaderInput(i);
                const rIdx = parseInt(inputEl.value, 10) - 1;
                if (Number.isNaN(rIdx) || rIdx < 0 || rIdx >= fd.rawRows.length) {
                    hasError = true;
                    alert(`F${i + 1} Header Row 超出資料範圍，請修正後再試。`);
                    return;
                }
                const row = fd.rawRows[rIdx];
                if (!row || !row.trim()) {
                    hasError = true;
                    alert(`F${i + 1} Header Row 為空白，請修正後再試。`);
                    return;
                }
                row.split(row.includes('	') ? '	' : ',').map(h => h.trim()).forEach((h, cIdx) => {
                    state.mergedHeaders.push({ label: `[F${i+1}] ${h}`, fileIdx: i, colIdx: cIdx, rawLabel: h });
                });
            });
            if (hasError || state.mergedHeaders.length === 0) return;
            populateDropdowns();
            autoMapColumns();
            els.mappingSection.classList.remove('hidden');
        }

        function populateDropdowns() {
            const createOpt = (mh, idx) => new Option(mh.label, idx);
            Object.values(els.mapSelects).forEach(sel => sel.innerHTML = '');
            els.mapSelects.cur.add(new Option('-- 無 (Hidden) --', '-1')); 
            state.mergedHeaders.forEach((mh, idx) => {
                if (mh.fileIdx === 0) els.mapSelects.time1.add(createOpt(mh, idx));
                if (mh.fileIdx === 1) els.mapSelects.time2.add(createOpt(mh, idx));
                els.mapSelects.vol.add(createOpt(mh, idx));
                els.mapSelects.cur.add(createOpt(mh, idx));
                els.mapSelects.temp.add(createOpt(mh, idx));
            });
        }

        function autoMapColumns() {
            const h = state.mergedHeaders;
            const find = (keys, fIdx = -1) => h.findIndex(mh => {
                if (fIdx !== -1 && mh.fileIdx !== fIdx) return false;
                return keys.some(k => mh.rawLabel.toLowerCase().includes(k));
            });
            els.mapSelects.time1.value = find(['time', 'test time', '時間'], 0);
            if(state.filesData[1]) els.mapSelects.time2.value = find(['time', 'test time'], 1);
            els.mapSelects.vol.value = find(['vol', 'voltage', 'v_', '電壓']);
            els.mapSelects.cur.value = find(['cur', 'current', 'amp', '電流']);
            const tempIndices = [];
            h.forEach((mh, idx) => {
                if (['temp', 'aux', 'deg', 't1', 't2', 'couple', '溫度'].some(k => mh.rawLabel.toLowerCase().includes(k))) tempIndices.push(idx);
            });
            Array.from(els.mapSelects.temp.options).forEach(opt => {
                if (tempIndices.includes(parseInt(opt.value))) opt.selected = true;
            });
            updateColumnMappingFromUI(true);
        }

        function updateColumnMappingFromUI(generateColors = false) {
            state.columnMap.time1 = parseInt(els.mapSelects.time1.value);
            state.columnMap.time2 = parseInt(els.mapSelects.time2.value);
            state.columnMap.vol = parseInt(els.mapSelects.vol.value);
            state.columnMap.cur = parseInt(els.mapSelects.cur.value);
            const selectedTemps = Array.from(els.mapSelects.temp.selectedOptions).map(opt => ({ idx: parseInt(opt.value), label: opt.text.replace(/^\[F\d+\]\s*/, '') }));
            if (generateColors) {
                // Revert to rainbow colors for temp series
                const defaultColors = ['#d62728', '#ff7f0e', '#9467bd', '#e377c2', '#8c564b', '#17becf', '#bcbd22'];
                state.tempConfig = selectedTemps.map((t, i) => ({ headerIdx: t.idx, label: t.label, color: defaultColors[i % defaultColors.length] }));
                renderTempColorInputs();
                renderRateSourceOptions();
                renderSeriesRenameInputs();
            } else {
                state.tempConfig.forEach(c => {
                    const match = selectedTemps.find(t => t.idx === c.headerIdx);
                    if(match) c.label = match.label;
                });
            }
            state.columnMap.temps = state.tempConfig.map(c => c.headerIdx);
        }

        function renderTempColorInputs() {
            els.tempColorSection.innerHTML = '<label class="text-[10px] text-slate-500 block border-b border-slate-200 pb-1 mb-1">溫度曲線顏色</label>';
            state.tempConfig.forEach((cfg, idx) => {
                const div = document.createElement('div');
                div.className = 'flex items-center gap-2 mb-1 bg-white border border-slate-300 p-1 rounded';
                div.innerHTML = `<input type="color" value="${cfg.color}" data-idx="${idx}" class="temp-color-picker w-5 h-5 rounded cursor-pointer border-none bg-transparent"><span class="text-[10px] text-slate-700 truncate w-32" title="${cfg.label}">${cfg.label}</span>`;
                els.tempColorSection.appendChild(div);
            });
            document.querySelectorAll('.temp-color-picker').forEach(pk => {
                pk.addEventListener('change', (e) => {
                    state.tempConfig[e.target.dataset.idx].color = e.target.value;
                    if(state.processedData) renderCharts();
                });
            });
        }

        function renderSeriesRenameInputs() {
            const container = els.seriesRenameContainer;
            container.innerHTML = '';
            container.innerHTML += `<div class="flex gap-1 items-center mb-1"><span class="w-8 text-[10px] text-slate-500">Vol:</span><input type="text" id="renameVol" value="Voltage" class="vdi-input w-full text-xs px-1 rounded"></div>`;
            if (state.columnMap.cur !== -1) container.innerHTML += `<div class="flex gap-1 items-center mb-1"><span class="w-8 text-[10px] text-slate-500">Cur:</span><input type="text" id="renameCur" value="Current" class="vdi-input w-full text-xs px-1 rounded"></div>`;
            state.tempConfig.forEach((cfg, idx) => {
                container.innerHTML += `<div class="flex gap-1 items-center mb-1"><span class="w-8 text-[10px] text-slate-500">T${idx+1}:</span><input type="text" id="renameTemp${idx}" value="${cfg.label}" data-idx="${idx}" class="vdi-input w-full text-xs px-1 rounded rename-temp"></div>`;
            });
            els.seriesRenameSection.classList.remove('hidden');
            container.querySelectorAll('input.rename-temp').forEach(inp => {
                inp.addEventListener('change', (e) => {
                    state.tempConfig[parseInt(e.target.dataset.idx)].label = e.target.value;
                    renderTempColorInputs();
                    if(state.processedData) { generateReports(state.processedData); renderCharts(); }
                });
            });
            container.querySelectorAll('input:not(.rename-temp)').forEach(inp => inp.addEventListener('change', () => { if(state.processedData) renderCharts(); }));
        }

        function renderRateSourceOptions() {
            els.rateSourceSelect.innerHTML = '<option value="max">Max Profile</option>';
            state.tempConfig.forEach((cfg, idx) => els.rateSourceSelect.add(new Option(cfg.label, idx.toString())));
        }

        // --- NEW FEATURES: OBJECT MANAGEMENT ---
        function addFreeAnnotation() {
            const text = els.annotationInput.value;
            const size = parseInt(els.annotationSizeInput.value) || 12;
            if (!text) return;
            const id = Date.now() + Math.random(); // Added random to avoid collision in same MS
            state.customAnnotations.push({ 
                id, 
                text: `<b>${text}</b>`, 
                x: 0.5, y: 0.5, 
                xref: 'paper', yref: 'paper', // Important: Paper reference allows moving outside axes
                size: size 
            });
            els.annotationInput.value = '';
            renderAnnotationList();
            renderCharts();
        }

        function removeAnnotation(id) {
            state.customAnnotations = state.customAnnotations.filter(a => a.id !== id);
            renderAnnotationList();
            renderCharts();
        }

        function renderAnnotationList() {
            els.annotationList.innerHTML = '';
            state.customAnnotations.forEach(a => {
                const el = document.createElement('div');
                // Updated Style for List Item (Flexbox, centered, border)
                el.className = 'flex items-center gap-1 py-1 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors';
                
                // Remove <b> tags for list display
                const displayText = a.text.replace(/<\/?b>/g, '');
                
                // Updated Inner HTML: Button on Left, Red, Bold
                el.innerHTML = `
                    <button class="text-red-500 hover:text-red-700 font-bold px-1.5 text-sm leading-none" onclick="window.removeAnnotation(${a.id})" title="刪除">×</button>
                    <span class="text-xs text-slate-700 flex-1 truncate" title="${displayText} (Size: ${a.size})">${displayText}</span>
                `;
                els.annotationList.appendChild(el);
            });
        }
        // Expose to global for onclick
        window.removeAnnotation = removeAnnotation;

        function addEventInputRow() {
            const t = parseFloat(els.newEventTime.value);
            const l = els.newEventLabel.value;
            const size = parseInt(els.eventSizeInput.value) || 12;
            if(isNaN(t) || !l) return;
            const id = Date.now() + Math.random(); // Added random
            state.customEvents.push({ id, time: t, label: l, size: size });
            els.newEventTime.value = ''; els.newEventLabel.value = '';
            renderEventList();
            renderCharts();
        }

        function removeEvent(id) {
            state.customEvents = state.customEvents.filter(e => e.id !== id);
            renderEventList();
            renderCharts();
        }

        function renderEventList() {
            els.eventList.innerHTML = '';
            state.customEvents.sort((a,b)=>a.time-b.time).forEach(e => {
                const el = document.createElement('div');
                el.className = 'flex items-center gap-1 py-1 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors';
                el.innerHTML = `
                    <button class="text-red-500 hover:text-red-700 font-bold px-1.5 text-sm leading-none" onclick="window.removeEvent(${e.id})" title="刪除">×</button>
                    <span class="text-xs text-slate-700 flex-1 truncate" title="${e.time}s: ${e.label} (Size: ${e.size || 12})">${e.time}s: ${e.label}</span>
                `;
                els.eventList.appendChild(el);
            });
        }
        window.removeEvent = removeEvent;

        // --- PROCESSING ---
        function processAndRender() {
            const result = window.AnalysisModule.processAndRender({ state, els, getHeaderInput, renderCharts });
            if (result && result.series) appendRunHistory(result);
            return result;
        }

        function calculateDerivative(time, values) {
            return window.AnalysisModule.calculateDerivative(time, values);
        }

        function generateReports(series) {
            return window.AnalysisModule.generateReports(series, { state, els });
        }

        function exportChart() {
            const gd = els.chartContainer;
            if (!gd || !state.processedData) return;

            // NEW LOGIC: Use Plotly's native 'scale' for high-res output
            // This ensures WYSIWYG (What You See Is What You Get) but sharper.
            // 1. Get Target Dimensions in Pixels (at 300 DPI)
            const w_cm = parseFloat(els.chartWidth.value) || 16;
            const h_cm = parseFloat(els.chartHeight.value) || 8;
            const targetW = Math.round(w_cm * PIXELS_PER_CM);
            
            // 2. Get Current Screen Dimensions
            const screenW = gd._fullLayout.width;
            
            // 3. Calculate Scale Factor
            // We want the output image to have 'targetW' pixels width.
            // Plotly's 'scale' parameter multiplies the current screen dimensions.
            const scaleFactor = targetW / screenW;

            // 4. Download with Scale
            // We do NOT set width/height explicitly to targetW/targetH because that changes layout (relative font sizes).
            // Instead we set width/height to *current* screen size and let 'scale' multiply it up.
            Plotly.downloadImage(gd, { 
                format: 'png', 
                width: gd._fullLayout.width, 
                height: gd._fullLayout.height, 
                scale: scaleFactor,
                filename: 'Battery_Report', 
                setBackground: 'white' 
            });
        }

        function exportCSV() {
            if (!state.processedData) return;
            const series = state.processedData;
            let csv = `=== Analysis Report ===\nOCV Drop (>50mV/1s), ${els.globalVolDrop.textContent}\n\nChannel,Trigger (T1),Runaway (Ttr),Max Temp\n`;
            
            if (state.reportData) {
                state.reportData.forEach(r => { 
                    const fmt = (e) => e ? `${e.val.toFixed(1)}C @ ${e.t.toFixed(0)}s (Rate: ${e.rate.toFixed(1)})` : '-'; 
                    csv += `${r.label},${fmt(r.t1)},${fmt(r.ttr)},${r.maxT.toFixed(1)}C\n`; 
                });
            }
            
            csv += "\n=== Processed Data ===\n";
            let headers = ["Time (s)", "Voltage (V)"]; if (series.cur.y.length) headers.push("Current (A)");
            series.temps.forEach((t, i) => headers.push(`${state.tempConfig[i].label} Temp (C)`, `${state.tempConfig[i].label} Rate (C/min)`));
            csv += headers.join(",") + "\n";
            const len = series.vol.x.length;
            for (let i = 0; i < len; i++) {
                let row = [series.vol.x[i].toFixed(2), series.vol.y[i].toFixed(4)];
                if (series.cur.y.length) row.push(series.cur.y[i] !== undefined ? series.cur.y[i].toFixed(3) : "");
                series.temps.forEach(t => row.push(t.y[i] !== undefined ? t.y[i].toFixed(2) : "", t.rate[i] !== undefined ? t.rate[i].toFixed(2) : ""));
                csv += row.join(",") + "\n";
            }
            const link = document.createElement("a");
            link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
            link.download = `Battery_Data_Export_${new Date().toISOString().slice(0,10)}.csv`;
            link.click();
        }


        function safeNumber(value) {
            const n = parseFloat(value);
            return Number.isFinite(n) ? n : null;
        }

        function calcWh(capacityAh, nominalV) {
            return capacityAh * nominalV;
        }

        function calcGravimetricEnergyDensity(wh, massG) {
            return wh / (massG / 1000);
        }

        function calcVolumetricEnergyDensity(wh, lengthMm, widthMm, heightMm) {
            const volumeL = (lengthMm * widthMm * heightMm) / 1e6;
            return wh / volumeL;
        }

        function validateThicknessStack(layers, targetTotalUm, toleranceUm) {
            const total = layers.reduce((sum, item) => sum + item.thicknessUm, 0);
            const diff = Math.abs(total - targetTotalUm);
            return { total, diff, pass: diff <= toleranceUm };
        }

        function calculateKpi() {
            const capacityAh = safeNumber(els.kpiCapacityAh.value);
            const nominalV = safeNumber(els.kpiNominalV.value);
            const massG = safeNumber(els.kpiMassG.value);
            const lengthMm = safeNumber(els.kpiLengthMm.value);
            const widthMm = safeNumber(els.kpiWidthMm.value);
            const heightMm = safeNumber(els.kpiHeightMm.value);
            const cathodeUm = safeNumber(els.kpiCathodeUm.value) || 0;
            const anodeUm = safeNumber(els.kpiAnodeUm.value) || 0;
            const sepUm = safeNumber(els.kpiSepUm.value) || 0;
            const targetStackUm = safeNumber(els.kpiTargetStackUm.value);
            const toleranceUm = safeNumber(els.kpiToleranceUm.value) ?? 20;

            if ([capacityAh, nominalV, massG, lengthMm, widthMm, heightMm, targetStackUm].some((v) => v === null)) {
                els.kpiResult.innerHTML = '<span class="text-red-700">請完整輸入 Ah/V/g/尺寸/目標厚度。</span>';
                return;
            }

            try {
                const wh = calcWh(capacityAh, nominalV);
                const grav = calcGravimetricEnergyDensity(wh, massG);
                const vol = calcVolumetricEnergyDensity(wh, lengthMm, widthMm, heightMm);
                const stack = validateThicknessStack([
                    { name: 'Cathode', thicknessUm: cathodeUm },
                    { name: 'Anode', thicknessUm: anodeUm },
                    { name: 'Separator', thicknessUm: sepUm }
                ], targetStackUm, toleranceUm);

                els.kpiResult.innerHTML = `
                    <div>Energy: <b>${wh.toFixed(3)} Wh</b></div>
                    <div>Wh/kg: <b>${grav.toFixed(2)}</b></div>
                    <div>Wh/L: <b>${vol.toFixed(2)}</b></div>
                    <div class="${stack.pass ? 'text-emerald-700' : 'text-red-700'}">
                        Stack: ${stack.total.toFixed(1)} μm (目標 ${targetStackUm.toFixed(1)} ± ${toleranceUm.toFixed(1)} μm)
                    </div>
                `;
            } catch (err) {
                els.kpiResult.innerHTML = `<span class="text-red-700">KPI 計算失敗: ${err.message}</span>`;
            }
        }

        function serializeState() {
            return {
                version: '1.0.0',
                createdAt: new Date().toISOString(),
                columnMap: state.columnMap,
                tempConfig: state.tempConfig,
                customEvents: state.customEvents,
                customAnnotations: state.customAnnotations,
                thresholds: {
                    volDrop: els.thresholdVolDrop.value,
                    t1: els.thresholdT1.value,
                    ttr: els.thresholdTtr.value
                },
                chart: {
                    titleX: els.titleX.value, titleVol: els.titleVol.value, titleTemp: els.titleTemp.value, titleCur: els.titleCur.value, titleRate: els.titleRate.value,
                    rangeTimeMin: els.rangeTimeMin.value, rangeTimeMax: els.rangeTimeMax.value,
                    rangeVolMin: els.rangeVolMin.value, rangeVolMax: els.rangeVolMax.value,
                    rangeTempMin: els.rangeTempMin.value, rangeTempMax: els.rangeTempMax.value,
                    rangeCurMin: els.rangeCurMin.value, rangeCurMax: els.rangeCurMax.value,
                    rangeRateMin: els.rangeRateMin.value, rangeRateMax: els.rangeRateMax.value,
                    lineWidth: els.lineWidthSlider.value, fontSize: els.fontSizeSlider.value,
                    colorVol: els.colorVol.value, colorCur: els.colorCur.value, rateSource: els.rateSourceSelect.value
                }
            };
        }

        function applyState(config) {
            if (!config || !config.columnMap || !config.chart || !config.thresholds) throw new Error('模板格式錯誤');
            state.columnMap = config.columnMap;
            state.tempConfig = Array.isArray(config.tempConfig) ? config.tempConfig : [];
            state.customEvents = Array.isArray(config.customEvents) ? config.customEvents : [];
            state.customAnnotations = Array.isArray(config.customAnnotations) ? config.customAnnotations : [];
            els.thresholdVolDrop.value = config.thresholds.volDrop ?? '50';
            els.thresholdT1.value = config.thresholds.t1 ?? '1';
            els.thresholdTtr.value = config.thresholds.ttr ?? '10';

            Object.entries(config.chart).forEach(([key, val]) => { if (els[key] && val !== undefined) els[key].value = val; });
            if (Array.isArray(state.mergedHeaders) && state.mergedHeaders.length) {
                populateDropdowns();
                updateColumnMappingFromUI(false);
            }
            renderAnnotationList();
            renderEventList();
            renderTempColorInputs();
            renderRateSourceOptions();
            renderSeriesRenameInputs();
            if (state.processedData) {
                generateReports(state.processedData);
                renderCharts();
            }
        }

        function saveTemplate() {
            try {
                const payload = serializeState();
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `battery-template-${new Date().toISOString().slice(0,10)}.battery-template.json`;
                link.click();
            } catch (err) {
                alert(`模板儲存失敗: ${err.message}`);
            }
        }

        function loadTemplate(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result);
                    applyState(data);
                    state.templateMeta = { fileName: file.name, loadedAt: new Date().toISOString() };
                } catch (err) {
                    alert(`模板載入失敗: ${err.message}`);
                } finally {
                    els.loadTemplateInput.value = '';
                }
            };
            reader.readAsText(file, 'UTF-8');
        }

        function parseBatchCsvText(text) {
            const rows = text.split(/\r\n|\n/).filter((row) => row.trim());
            if (!rows.length) throw new Error('CSV 無資料列');
            const header = rows[0].split(rows[0].includes('	') ? '	' : ',').map((s) => s.trim());
            const mergedHeaders = header.map((h, idx) => ({ label: `[F1] ${h}`, fileIdx: 0, colIdx: idx, rawLabel: h }));
            const hLower = header.map((h) => h.toLowerCase());
            const find = (keys) => hLower.findIndex((h) => keys.some((k) => h.includes(k)));
            const time1 = find(['time', '時間']);
            const vol = find(['vol', 'volt', '電壓']);
            if (time1 === -1 || vol === -1) throw new Error('找不到時間/電壓欄位');
            const cur = find(['cur', 'current', '電流']);
            const tempIndices = [];
            hLower.forEach((h, i) => { if (['temp', 't1', 't2', 'aux', '溫度'].some((k) => h.includes(k))) tempIndices.push(i); });
            if (!tempIndices.length) throw new Error('找不到溫度欄位');
            return {
                filesData: [{ rawRows: rows }, null],
                mergedHeaders,
                columnMap: { time1, time2: -1, vol, cur, temps: tempIndices },
                tempConfig: tempIndices.map((idx) => ({ headerIdx: idx, label: header[idx], color: '#d62728' })),
                headerRows: [1, 1],
                tempIndices
            };
        }

        async function runBatchSummary() {
            const files = Array.from(els.batchFilesInput.files || []);
            if (!files.length) {
                els.batchResult.textContent = '請先選擇至少一個 CSV。';
                return;
            }
            const rows = [];
            const errors = [];
            for (const file of files) {
                try {
                    const text = await file.text();
                    const parsed = parseBatchCsvText(text);
                    const series = window.AnalysisModule.analyzeRawDataset({
                        filesData: parsed.filesData,
                        mergedHeaders: parsed.mergedHeaders,
                        columnMap: parsed.columnMap,
                        tempConfig: parsed.tempConfig,
                        headerRows: parsed.headerRows,
                        downsample: parseInt(els.downsampleSelect.value) || 1,
                        filterOutliers: els.filterCheckbox.checked
                    });
                    const tempMax = series.maxTempProfile.length ? Math.max(...series.maxTempProfile) : 0;
                    const reportState = { tempConfig: parsed.tempConfig, reportData: [] };
                    const mockEls = { thresholdVolDrop: els.thresholdVolDrop, thresholdT1: els.thresholdT1, thresholdTtr: els.thresholdTtr, globalVolDrop: { textContent: '-' }, reportTableBody: { innerHTML: '' } };
                    const result = window.AnalysisModule.generateReports(series, { state: reportState, els: mockEls });
                    const first = reportState.reportData[0] || {};
                    let outlierCount = 0;
                    parsed.filesData[0].rawRows.slice(1).forEach((row) => {
                        const cells = row.split(row.includes('	') ? '	' : ',');
                        parsed.tempIndices.forEach((idx) => {
                            const val = parseFloat(cells[idx]);
                            if (Number.isFinite(val) && (val > 1300 || val < -100)) outlierCount += 1;
                        });
                    });
                    rows.push({
                        fileName: file.name,
                        maxTemp: tempMax,
                        t1: first.t1 ? first.t1.t : null,
                        ttr: first.ttr ? first.ttr.t : null,
                        ocvDropAt: result.volDropTime,
                        outlierCount,
                        length: series.vol.x.length
                    });
                } catch (err) {
                    errors.push(`${file.name}: ${err.message}`);
                }
            }

            if (!rows.length) {
                els.batchResult.innerHTML = `<span class='text-red-700'>批次失敗：${errors.join(' | ')}</span>`;
                return;
            }

            let csv = 'File,MaxTempC,T1_s,Ttr_s,OCVDrop_s,OutlierCount,DataLength\n';
            rows.forEach((r) => {
                csv += `${r.fileName},${(r.maxTemp ?? '').toString()},${r.t1 ?? ''},${r.ttr ?? ''},${r.ocvDropAt ?? ''},${r.outlierCount},${r.length}\n`;
            });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
            link.download = `batch_summary_${new Date().toISOString().slice(0,10)}.csv`;
            link.click();

            els.batchResult.innerHTML = `<span class='text-emerald-700'>完成 ${rows.length} 檔</span>${errors.length ? `<br><span class='text-red-700'>錯誤: ${errors.join(' | ')}</span>` : ''}`;
        }

        function appendRunHistory(processResult) {
            const summary = {
                id: Date.now() + Math.random(),
                timestamp: new Date().toISOString(),
                source: state.inputMode === 'file' ? (state.files.filter(Boolean).map((f) => f.name).join(' + ') || 'manual') : 'paste',
                thresholdVolDrop: parseFloat(els.thresholdVolDrop.value),
                thresholdT1: parseFloat(els.thresholdT1.value),
                thresholdTtr: parseFloat(els.thresholdTtr.value),
                ocvDrop: els.globalVolDrop.textContent,
                maxTemp: (state.reportData || []).length ? Math.max(...state.reportData.map((r) => r.maxT || 0)) : 0
            };
            state.runHistory.unshift(summary);
            state.runHistory = state.runHistory.slice(0, 50);
            renderRunHistory();
        }

        function renderRunHistory() {
            els.historyList.innerHTML = '';
            state.runHistory.forEach((item) => {
                const el = document.createElement('div');
                el.className = 'text-[10px] bg-white border border-slate-200 rounded p-1';
                el.innerHTML = `
                    <div class='flex justify-between'>
                        <span class='font-bold'>${item.source}</span>
                        <button class='text-red-600 font-bold' data-id='${item.id}'>×</button>
                    </div>
                    <div>${item.timestamp.slice(0,19).replace('T',' ')}</div>
                    <div>MaxT: ${item.maxTemp.toFixed(1)}°C | OCV: ${item.ocvDrop}</div>
                `;
                el.querySelector('button').addEventListener('click', () => removeRunHistory(item.id));
                els.historyList.appendChild(el);
            });
        }

        function removeRunHistory(id) {
            state.runHistory = state.runHistory.filter((item) => item.id !== id);
            renderRunHistory();
        }

        function clearRunHistory() {
            state.runHistory = [];
            renderRunHistory();
        }

        function exportRunHistoryCSV() {
            if (!state.runHistory.length) return;
            let csv = 'Timestamp,Source,ThresholdVolDrop,ThresholdT1,ThresholdTtr,MaxTemp,OCVDrop\n';
            state.runHistory.forEach((item) => {
                csv += `${item.timestamp},${item.source},${item.thresholdVolDrop},${item.thresholdT1},${item.thresholdTtr},${item.maxTemp},${item.ocvDrop}\n`;
            });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
            link.download = `run_history_${new Date().toISOString().slice(0,10)}.csv`;
            link.click();
        }

        function renderCharts(isEmpty = false) {
            return window.ChartModule.renderCharts({ state, els, isEmpty });
        }

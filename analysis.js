(function () {
  function processAndRender(ctx) {
            const { state, els, getHeaderInput, renderCharts } = ctx;
            const { columnMap, tempConfig, mergedHeaders, filesData } = state;
            const downsample = parseInt(els.downsampleSelect.value);
            
            if (columnMap.time1 === -1 || columnMap.vol === -1) { alert("請設定時間與電壓欄位"); return { series: null, report: null }; }

            const series = { vol:{x:[],y:[]}, cur:{x:[],y:[]}, temps: tempConfig.map(() => ({x:[], y:[]})), maxTempProfile: [], maxTempRate: [] };
            
            const parseFile = (fileIdx, colIndices, type) => {
                const fd = filesData[fileIdx];
                if (!fd) return;
                const inputEl = getHeaderInput(fileIdx);
                const headerRow = parseInt(inputEl.value) - 1;
                const timeColIdx = fileIdx === 0 ? mergedHeaders[columnMap.time1].colIdx : (columnMap.time2 !== -1 ? mergedHeaders[columnMap.time2].colIdx : -1);
                if (timeColIdx === -1) return;
                let t0 = null;
                for (let i = headerRow + 1; i < fd.rawRows.length; i += downsample) {
                    const row = fd.rawRows[i]; if(!row || !row.trim()) continue;
                    const cells = row.split(row.includes('\t') ? '\t' : ',');
                    let t = parseFloat(cells[timeColIdx]);
                    if (isNaN(t)) continue;
                    // Removed conv.t multiplication
                    if (t0 === null) t0 = t;
                    t -= t0;
                    colIndices.forEach(item => {
                        let val = parseFloat(cells[item.colIdx]);
                        // Removed conv.v and conv.c multiplications
                        if (type === 'temp' && els.filterCheckbox.checked && (isNaN(val) || val > 1300 || val < -100)) return;
                        item.target.x.push(t); item.target.y.push(isNaN(val) ? 0 : val);
                    });
                }
            };

            const f1Instr = [], f2Instr = [];
            const addInstr = (colIdx, target, type) => (mergedHeaders[colIdx].fileIdx === 0 ? f1Instr : f2Instr).push({ colIdx: mergedHeaders[colIdx].colIdx, target, type });
            
            addInstr(columnMap.vol, series.vol, 'vol');
            if(columnMap.cur !== -1) addInstr(columnMap.cur, series.cur, 'cur');
            tempConfig.forEach((cfg, i) => addInstr(cfg.headerIdx, series.temps[i], 'temp'));

            parseFile(0, f1Instr);
            if(filesData[1]) parseFile(1, f2Instr);

            // Calc Max Temp Profile
            for(let i=0; i<series.vol.x.length; i++) {
                let maxT = -Infinity;
                series.temps.forEach(t => {
                    if(t.y[i] !== undefined && t.y[i] > maxT) maxT = t.y[i];
                });
                series.maxTempProfile.push(maxT === -Infinity ? 0 : maxT);
            }
            // Calc Derivative
            series.maxTempRate = window.AnalysisModule.calculateDerivative(series.vol.x, series.maxTempProfile);
            series.temps.forEach(s => { s.rate = window.AnalysisModule.calculateDerivative(s.x, s.y); });
            
            state.processedData = series;

            let maxTime = Math.max((series.vol.x[series.vol.x.length-1]||0), ...series.temps.map(t=>t.x[t.x.length-1]||0));
            els.rangeTimeMin.value = 0;
            els.rangeTimeMax.value = Math.ceil(maxTime > 0 ? maxTime : 3600);

            const reportResult = window.AnalysisModule.generateReports(series, { state, els });
            renderCharts();
            els.reportPanel.classList.remove('hidden');
            return { series, report: reportResult };
        
  }

  function calculateDerivative(time, values) {

            const d = [];
            for (let i = 0; i < time.length; i++) {
                if (i === 0) d.push(0);
                else {
                    const dt = time[i] - time[i-1];
                    const rate = dt <= 0 ? d[i-1] : ((values[i] - values[i-1]) / dt) * 60;
                    d.push(rate);
                }
            }
            return d;
        
  }

  function generateReports(series, ctx) {
            const { state, els } = ctx;

            const th = { volDrop: parseFloat(els.thresholdVolDrop.value), T1: parseFloat(els.thresholdT1.value), Ttr: parseFloat(els.thresholdTtr.value) };
            
            // OCV Drop Logic
            let volDropTime = null;
            const v = series.vol;
            for (let i = 0; i < v.x.length; i++) {
                let j = i;
                while (j >= 0 && (v.x[i] - v.x[j]) < 1.0) j--;
                if (j >= 0 && (v.y[j] - v.y[i]) > (th.volDrop / 1000)) { volDropTime = v.x[i]; break; }
            }
            els.globalVolDrop.textContent = volDropTime ? `@ ${volDropTime.toFixed(1)} s` : "None";
            
            // Report Table Logic
            state.reportData = [];
            let html = '';
            
            series.temps.forEach((tData, idx) => {
                const customLabel = state.tempConfig[idx].label;
                
                // 1. Find T1 (Trigger)
                // Intelligent Logic: Rate > Moving Average (60s) + Threshold
                let idxT1 = -1;
                const lookback = 60; // seconds
                for (let i = 5; i < tData.rate.length; i++) {
                    const tCurr = tData.x[i];
                    if (tCurr < lookback) continue; // Skip early seconds
                    
                    // Calculate Moving Average
                    let sum = 0;
                    let count = 0;
                    for (let j = i - 1; j >= 0; j--) {
                        if (tData.x[j] < tCurr - lookback) break;
                        sum += tData.rate[j];
                        count++;
                    }
                    const avgRate = count > 0 ? sum / count : 0;
                    
                    if (tData.rate[i] > avgRate + th.T1) {
                        idxT1 = i; 
                        break; 
                    }
                }
                const t1 = idxT1 >= 0 ? { t: tData.x[idxT1], val: tData.y[idxT1], rate: tData.rate[idxT1] } : null;

                // 2. Find Ttr (Runaway) -> Absolute threshold
                let idxTtr = -1;
                for (let i = 0; i < tData.rate.length; i++) {
                    if (tData.rate[i] >= th.Ttr) { idxTtr = i; break; }
                }
                const ttr = idxTtr >= 0 ? { t: tData.x[idxTtr], val: tData.y[idxTtr], rate: tData.rate[idxTtr] } : null;

                // 3. Find Max Temp (Logic: After Runaway if exists, else Global Max)
                let maxT = -Infinity;
                const searchStartIndex = idxTtr >= 0 ? idxTtr : 0; 
                
                if (tData.y.length > 0) {
                    for (let i = searchStartIndex; i < tData.y.length; i++) {
                        if (tData.y[i] > maxT) maxT = tData.y[i];
                    }
                } else {
                    maxT = 0;
                }

                // Format Strings
                const fmtEvent = (e) => e ? `${e.val.toFixed(1)}°C @ ${e.t.toFixed(0)}s (${e.rate.toFixed(1)}°C/min)` : '-';
                
                state.reportData.push({ label: customLabel, maxT, t1, ttr });
                
                html += `<tr class="hover:bg-indigo-50/30 border-b border-indigo-100/30">
                    <td class="px-4 py-2 font-medium truncate max-w-[100px]" style="color:${state.tempConfig[idx].color}" title="${customLabel}">${customLabel}</td>
                    <td class="px-4 py-2 text-[10px]">${fmtEvent(t1)}</td>
                    <td class="px-4 py-2 text-[10px] font-bold text-red-800">${fmtEvent(ttr)}</td>
                    <td class="px-4 py-2 font-bold text-red-600">${maxT.toFixed(1)}°C</td>
                </tr>`;
            });
            els.reportTableBody.innerHTML = html;
            return { thresholds: th, reportData: state.reportData, volDropTime };
        
  }

  window.AnalysisModule = { processAndRender, calculateDerivative, generateReports };
})();

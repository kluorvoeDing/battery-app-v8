(function () {
  function renderCharts(input) {
    const { state, els, isEmpty=false, isRateChartVisible=true } = input;

            const lineWidth = parseFloat(els.lineWidthSlider.value) || 2.5;
            const layoutConfig = {
                autosize: true, paper_bgcolor: 'white', plot_bgcolor: 'white',
                font: { family: 'Arial, sans-serif', size: parseInt(els.fontSizeSlider.value), color: '#334155' },
                margin: { l: 80, r: 80, t: 80, b: 80 }, // Balanced margins
            };

            if (isEmpty || !state.processedData) {
                // Resize preview call is handled by init/resize events, but ensures container has size
                resizePreview();
                Plotly.newPlot('chartContainer', [], { ...layoutConfig, title: {text: 'Waiting for Data...', font:{size: 20, color:'#94a3b8'}}, xaxis: {showgrid:false, zeroline:false, showticklabels:false}, yaxis: {showgrid:false, zeroline:false, showticklabels:false} });
                return;
            }

            // Ensure size is correct before plotting
            resizePreview();

            const series = state.processedData;
            const hasCur = series.cur.y.length > 0;
            const ranges = {
                vol: [parseFloat(els.rangeVolMin.value), parseFloat(els.rangeVolMax.value)],
                temp: [parseFloat(els.rangeTempMin.value), parseFloat(els.rangeTempMax.value)],
                cur: [parseFloat(els.rangeCurMin.value), parseFloat(els.rangeCurMax.value)],
                rate: [parseFloat(els.rangeRateMin.value), parseFloat(els.rangeRateMax.value)]
            };
            const calcDtick = ([min, max]) => (max - min) / 5;
            const traces = [];
            
            traces.push({ x: series.vol.x, y: series.vol.y, name: els.renameVol.value, yaxis: 'y1', type: 'scatter', mode: 'lines', line: { color: els.colorVol.value, width: lineWidth } });
            if (hasCur) traces.push({ x: series.cur.x, y: series.cur.y, name: els.renameCur.value, yaxis: 'y3', type: 'scatter', mode: 'lines', line: { color: els.colorCur.value, width: lineWidth, dash: 'dot' } });
            series.temps.forEach((t, i) => traces.push({ x: t.x, y: t.y, name: state.tempConfig[i].label, yaxis: 'y2', type: 'scatter', mode: 'lines', line: { color: state.tempConfig[i].color, width: lineWidth } }));
            
            const rateSrc = els.rateSourceSelect.value;
            let rateData = (rateSrc === 'max' && series.temps.length) ? { x: series.temps[0].x, y: series.temps[0].rate, name: 'Max Rate' } : (series.temps[parseInt(rateSrc)] ? { x: series.temps[parseInt(rateSrc)].x, y: series.temps[parseInt(rateSrc)].rate, name: state.tempConfig[parseInt(rateSrc)].label + ' Rate' } : {x:[],y:[],name:''});
            
            // Only add rate trace if visible
            if (isRateChartVisible) {
                traces.push({ x: rateData.x, y: rateData.y, name: rateData.name, yaxis: 'y4', xaxis: 'x2', type: 'scatter', mode: 'lines', line: { color: '#f97316', width: lineWidth * 0.75 } });
            }

            const axisDomainEnd = hasCur ? 0.85 : 0.92;
            
            // Layout Logic for Toggle
            // If Rate visible: Main chart uses domain [0.4, 1] (or adjusted). Rate uses [0, 0.25].
            // If Rate hidden: Main chart uses domain [0, 1]. Rate hidden.
            const mainYDomain = isRateChartVisible ? [0.40, 1] : [0, 1];
            const rateYDomain = isRateChartVisible ? [0, 0.25] : [0, 0]; // Effectively hidden
            
            // Common Axis Config
            const commonAxis = { 
                showgrid: true, zeroline: false, mirror: true, showline: true, linewidth: 2, linecolor: '#94a3b8', 
                gridcolor: 'rgba(148, 163, 184, 0.2)', ticks: 'outside', tickwidth: 2, ticklen: 5
            }; 

            // --- Shapes (Event Lines) ---
            const shapes = [];
            const annotations = [...state.customAnnotations];

            state.customEvents.forEach(evt => {
                shapes.push({
                    type: 'line', x0: evt.time, x1: evt.time, y0: 0, y1: 1, xref: 'x', yref: 'paper',
                    line: { color: '#94a3b8', width: 1, dash: 'dot' }
                });
                
                let dataInfo = '';
                const idx = series.vol.x.findIndex(t => t >= evt.time);
                if (idx !== -1) {
                    const v = series.vol.y[idx];
                    let t = 0; let r = 0; let tColor = '#f97316';
                    if(rateSrc === 'max') {
                        t = series.maxTempProfile[idx]; r = series.maxTempRate[idx];
                    } else {
                        const k = parseInt(rateSrc);
                        if(series.temps[k]) { t = series.temps[k].y[idx]; r = series.temps[k].rate[idx]; tColor = state.tempConfig[k].color; }
                    }

                    // Info Box (Annotation)
                    const fontSize = evt.size || 12;
                    annotations.push({
                        x: evt.time, y: 1, xref: 'x', yref: 'paper',
                        // Fixed: First line also follows font size now
                        text: `<span style="font-size:${fontSize}px;font-weight:bold">${evt.label} (${evt.time}s)</span>;<br>V: ${v.toFixed(2)} V,<br><span style="color:${tColor};font-weight:bold;font-size:${fontSize}px">T: ${t.toFixed(1)} °C (${r.toFixed(1)} °C/min)</span>`,
                        showarrow: true, arrowhead: 0, ax: 40, ay: -40, align: 'left',
                        bgcolor: '#ffffff', bordercolor: '#cbd5e1', borderwidth: 1, borderpad: 6,
                        font: { size: fontSize, color: '#334155' }, opacity: 0.95
                    });
                }
            });
            
            // Process Custom Annotations (No arrow for text boxes)
            state.customAnnotations.forEach(a => {
                a.showarrow = false; // Force no arrow
                // Add font size property
                a.font = { size: a.size || 12, color: '#334155' };
                a.xref = 'paper';
                a.yref = 'paper';
            });

            const layout = {
                ...layoutConfig,
                shapes: shapes,
                annotations: annotations,
                showlegend: true, legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: 1.15, bgcolor: 'rgba(255,255,255,0.8)', bordercolor: '#cbd5e1', borderwidth: 1 },
                grid: { rows: 2, columns: 1, pattern: 'independent' },
                
                // Main X-Axis: 
                // If rate chart is visible: hide tick labels (shared with bottom).
                // If rate chart hidden: SHOW tick labels.
                xaxis: { 
                    ...commonAxis, 
                    domain: [0, axisDomainEnd], 
                    // FIX: Hide title if rate chart is visible (title belongs to bottom axis)
                    title: { text: isRateChartVisible ? "" : els.titleX.value, standoff: 15 }, 
                    anchor: 'y1', 
                    tickformat: ',', 
                    range: [parseFloat(els.rangeTimeMin.value), parseFloat(els.rangeTimeMax.value)],
                    showticklabels: !isRateChartVisible // Toggle labels
                },
                
                // Y-Axis Alignment Fix: Fixed left margin (80) + fixed standoff (20) + NO automargin
                yaxis: { 
                    ...commonAxis, 
                    title: { text: els.titleVol.value, standoff: 5 }, // Standoff reduced to pull title closer (aligned with bottom)
                    titlefont: { color: '#0000FF' }, // Pure Blue
                    tickfont: { color: '#0000FF' },
                    range: ranges.vol, dtick: calcDtick(ranges.vol), side: 'left', 
                    domain: mainYDomain, // DYNAMIC DOMAIN
                    automargin: false // Explicitly disable to force alignment with bottom chart
                },
                
                // Y-Axis 2 (Temp): Inner Right, Orange
                yaxis2: { 
                    ...commonAxis, 
                    automargin: true, 
                    title: { text: els.titleTemp.value, standoff: 15 }, 
                    titlefont: { color: '#FFA500' }, // Orange
                    tickfont: { color: '#FFA500' },
                    range: ranges.temp, dtick: calcDtick(ranges.temp), side: 'right', position: axisDomainEnd, overlaying: 'y', showgrid: false 
                },
                
                // Y-Axis 3 (Current): Outer Right, Red
                yaxis3: { 
                    ...commonAxis, 
                    visible: hasCur, 
                    title: { text: els.titleCur.value, standoff: 15 }, 
                    titlefont: { color: '#FF0000' }, // Red
                    tickfont: { color: '#FF0000' },
                    range: ranges.cur, dtick: calcDtick(ranges.cur), side: 'right', position: 0.94, overlaying: 'y', showgrid: false 
                },
                
                xaxis2: { ...commonAxis, domain: [0, axisDomainEnd], title: { text: els.titleX.value, standoff: 15 }, anchor: 'y4', matches: 'x', tickformat: ',' },
                
                // Y-Axis 4 (Rate): Bottom sub-plot. Shift standoff to 5 to move title RIGHT towards axis
                yaxis4: { 
                    ...commonAxis, 
                    title: { text: els.titleRate.value, standoff: 5 }, // Standoff matched to top axis
                    range: ranges.rate, dtick: calcDtick(ranges.rate), 
                    domain: rateYDomain, // DYNAMIC DOMAIN
                    anchor: 'x2',
                    automargin: false, // Explicitly disable to force alignment
                    visible: isRateChartVisible
                }
            };

            // Capture annotation moves if existing chart
            const plotDiv = els.chartContainer;
            if (plotDiv.layout && plotDiv.layout.annotations) {
                 // Retain current view/layout interactions if needed
            }

            Plotly.newPlot('chartContainer', traces, layout, { 
                responsive: true, 
                editable: true, 
                edits: {
                    annotationPosition: true,
                    annotationText: false,
                    axisTitleText: false,
                    legendPosition: true, 
                    shapePosition: false
                } 
            }).then(gd => {
                gd.on('plotly_relayout', (eventdata) => {
                    if (eventdata['shapes[0].x0']) return; 
                    const newAnns = gd.layout.annotations;
                    if(!newAnns) return;
                    state.customAnnotations.forEach((custom, i) => {
                        if (newAnns[i]) {
                            custom.x = newAnns[i].x;
                            custom.y = newAnns[i].y;
                        }
                    });
                });
            });
        
  }

  window.ChartModule = { renderCharts };
})();

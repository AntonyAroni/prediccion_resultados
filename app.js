// Global Chart Instances
let chartProyectados = null;
let chartVolumenPendientes = null;
let chartImpactoNeto = null;

function formatNum(num) {
    return Math.round(num).toLocaleString();
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

function initCharts() {
    // 1. Chart Proyectados
    const ctxProj = document.getElementById('chartProyectados').getContext('2d');
    chartProyectados = new Chart(ctxProj, {
        type: 'doughnut',
        data: {
            labels: ['Juntos por el Perú', 'Fuerza Popular'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#ef4444', '#3b82f6'],
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#f8fafc', font: { family: 'Outfit', size: 13 } }
                }
            }
        }
    });

    // 2. Chart Volumen Pendientes
    const ctxVol = document.getElementById('chartVolumenPendientes').getContext('2d');
    chartVolumenPendientes = new Chart(ctxVol, {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#f8fafc' }, grid: { display: false } }
            }
        }
    });

    // 3. Chart Impacto Neto
    const ctxImp = document.getElementById('chartImpactoNeto').getContext('2d');
    chartImpactoNeto = new Chart(ctxImp, {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let val = context.raw;
                            return (val > 0 ? '+Votos FP: ' : '+Votos JP: ') + Math.abs(val).toLocaleString();
                        }
                    }
                }
            },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#f8fafc' }, grid: { display: false } }
            }
        }
    });
}

function updateSimulation() {
    const partNac = parseFloat(document.getElementById('slidePartNac').value);
    const partExt = parseFloat(document.getElementById('slidePartExt').value);
    const fpExt = parseFloat(document.getElementById('slideFpExt').value);
    const shiftNac = parseFloat(document.getElementById('slideShiftNac').value);
    
    document.getElementById('lblPartNac').innerText = partNac.toFixed(1) + '%';
    document.getElementById('lblPartExt').innerText = partExt.toFixed(1) + '%';
    document.getElementById('lblAusentismoExt').innerText = (100 - partExt).toFixed(1);
    document.getElementById('lblFpExt').innerText = fpExt.toFixed(1) + '%';
    document.getElementById('lblShiftNac').innerText = (shiftNac >= 0 ? '+' : '') + shiftNac.toFixed(1) + '%';
    
    let total_fp = 0;
    let total_jp = 0;
    
    let proj_table_body = '';
    
    // Arrays for Impact Analysis
    let netImpactData = [];

    for (let dep of departments) {
        let db_fp = dep.db_fp;
        let db_jp = dep.db_jp;
        
        let part = dep.is_extranjero ? (partExt / 100) : (partNac / 100);
        let assistants = dep.no_c_electores * part;
        let valid_votes = assistants * 0.90; // 10% null/blank
        
        let ratio_fp;
        if (dep.is_extranjero) {
            ratio_fp = fpExt / 100;
        } else {
            ratio_fp = dep.db_ratio_fp + (shiftNac / 100);
            ratio_fp = Math.max(0, Math.min(1, ratio_fp));
        }
        let ratio_jp = 1.0 - ratio_fp;
        
        let proj_pnd_fp = valid_votes * ratio_fp;
        let proj_pnd_jp = valid_votes * ratio_jp;
        
        let proj_fp = db_fp + proj_pnd_fp;
        let proj_jp = db_jp + proj_pnd_jp;
        
        total_fp += proj_fp;
        total_jp += proj_jp;
        
        // Impact Analysis: Net gain for FP in this department's pending votes
        // Positive means FP gains more. Negative means JP gains more.
        let net_diff = proj_pnd_fp - proj_pnd_jp;
        if (Math.abs(net_diff) > 100) {
            netImpactData.push({
                name: dep.name,
                net_fp: net_diff
            });
        }

        let dep_tot = proj_fp + proj_jp;
        let pct_fp = dep_tot > 0 ? (proj_fp / dep_tot * 100) : 0;
        let pct_jp = dep_tot > 0 ? (proj_jp / dep_tot * 100) : 0;
        
        let winner_badge = '';
        let winner_class = '';
        if (proj_jp > proj_fp) {
            winner_badge = '<span class="badge badge-jp">JP</span>';
            winner_class = 'jp';
        } else if (proj_fp > proj_jp) {
            winner_badge = '<span class="badge badge-fp">FP</span>';
            winner_class = 'fp';
        } else {
            winner_badge = '<span class="badge badge-neutral">-</span>';
            winner_class = '';
        }
        
        let tot_actas = dep.c_actas + dep.no_c_actas;
        
        proj_table_body += `
            <tr>
                <td>${dep.id}</td>
                <td><strong>${dep.name}</strong></td>
                <td class="td-sm">
                    <span class="td-jp-text">${formatNum(db_jp)}</span> / 
                    <span class="td-fp-text">${formatNum(db_fp)}</span>
                </td>
                <td class="td-sm">
                    <strong class="td-pnd-val">${dep.no_c_actas}</strong> / ${tot_actas}
                </td>
                <td class="td-sm td-strong">
                    <span class="td-jp-text">+${formatNum(proj_pnd_jp)}</span> / 
                    <span class="td-fp-text">+${formatNum(proj_pnd_fp)}</span>
                </td>
                <td class="td-strong">
                    <span style="color: #ef4444;">${formatNum(proj_jp)}</span> (${pct_jp.toFixed(1)}%) / <br>
                    <span style="color: #3b82f6;">${formatNum(proj_fp)}</span> (${pct_fp.toFixed(1)}%)
                </td>
                <td class="winner-marker ${winner_class}">${winner_badge}</td>
            </tr>
        `;
    }
    
    document.getElementById('tableBodyRegiones').innerHTML = proj_table_body;
    
    // Summary Update
    let total_valid = total_fp + total_jp;
    let pct_total_fp = total_valid > 0 ? (total_fp / total_valid * 100) : 0;
    let pct_total_jp = total_valid > 0 ? (total_jp / total_valid * 100) : 0;
    
    document.getElementById('valProjFp').innerText = formatNum(total_fp);
    document.getElementById('valProjJp').innerText = formatNum(total_jp);
    document.getElementById('valProjPctFp').innerText = pct_total_fp.toFixed(2) + '%';
    document.getElementById('valProjPctJp').innerText = pct_total_jp.toFixed(2) + '%';
    
    document.getElementById('lblValFp').innerText = `FP: ${formatNum(total_fp)} (${pct_total_fp.toFixed(2)}%)`;
    document.getElementById('lblValJp').innerText = `JP: ${formatNum(total_jp)} (${pct_total_jp.toFixed(2)}%)`;
    
    let jp_pct_bar = total_valid > 0 ? (total_jp / total_valid * 100) : 50;
    document.getElementById('barProjJp').style.width = jp_pct_bar + '%';
    document.getElementById('barProjFp').style.width = (100 - jp_pct_bar) + '%';
    
    let diff = total_jp - total_fp;
    let diff_text = diff > 0 
        ? `Diferencia proyectada: <strong>${formatNum(diff)} votos</strong> a favor de JUNTOS POR EL PERÚ.`
        : `Diferencia proyectada: <strong>${formatNum(-diff)} votos</strong> a favor de FUERZA POPULAR.`;
    document.getElementById('lblDiffProj').innerHTML = diff_text;
    
    // Main Chart
    chartProyectados.data.datasets[0].data = [Math.round(total_jp), Math.round(total_fp)];
    chartProyectados.update();
    
    // Banner
    let banner_el = document.getElementById('winnerBanner');
    if (total_jp > total_fp) {
        banner_el.className = 'winner-banner jp-win';
        banner_el.innerHTML = `🏆 LIDERANDO PROYECCIÓN: JUNTOS POR EL PERÚ por ${formatNum(diff)} votos`;
    } else {
        banner_el.className = 'winner-banner fp-win';
        banner_el.innerHTML = `🏆 LIDERANDO PROYECCIÓN: FUERZA POPULAR por ${formatNum(-diff)} votos`;
    }

    // Update Analysis Tab
    updateAnalysisCharts(netImpactData);
}

function updateAnalysisCharts(netImpactData) {
    // 1. Top 10 Electores Pendientes
    let vols = departments.map(d => ({ name: d.name, val: d.no_c_electores }))
                          .filter(d => d.val > 0)
                          .sort((a,b) => b.val - a.val)
                          .slice(0, 10);
    
    chartVolumenPendientes.data.labels = vols.map(d => d.name);
    chartVolumenPendientes.data.datasets = [{
        label: 'Electores Pendientes',
        data: vols.map(d => d.val),
        backgroundColor: 'rgba(56, 189, 248, 0.6)',
        borderColor: 'rgba(56, 189, 248, 1)',
        borderWidth: 1
    }];
    chartVolumenPendientes.update();

    let textVol = vols.length > 0 ? 
        `El departamento con mayor cantidad de electores pendientes es <strong>${vols[0].name}</strong> con ${formatNum(vols[0].val)} electores hábiles sin escrutar. Le sigue <strong>${vols.length > 1 ? vols[1].name : ''}</strong>.` 
        : 'No hay actas pendientes.';
    document.getElementById('txtInsightVolume').innerHTML = textVol;

    // 2. Net Impact Chart
    // Sort by absolute impact size to show biggest shifters
    netImpactData.sort((a, b) => Math.abs(b.net_fp) - Math.abs(a.net_fp));
    let topImpacts = netImpactData.slice(0, 10);

    let colors = topImpacts.map(d => d.net_fp > 0 ? 'rgba(59, 130, 246, 0.7)' : 'rgba(239, 68, 68, 0.7)');
    let borders = topImpacts.map(d => d.net_fp > 0 ? 'rgba(59, 130, 246, 1)' : 'rgba(239, 68, 68, 1)');

    chartImpactoNeto.data.labels = topImpacts.map(d => d.name);
    chartImpactoNeto.data.datasets = [{
        label: 'Ventaja Neta (+Votos)',
        data: topImpacts.map(d => d.net_fp),
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 1
    }];
    chartImpactoNeto.update();

    // Generate insight text
    let topFp = netImpactData.filter(d => d.net_fp > 0).sort((a,b) => b.net_fp - a.net_fp);
    let topJp = netImpactData.filter(d => d.net_fp < 0).sort((a,b) => a.net_fp - b.net_fp);

    let textNet = '';
    if (topFp.length > 0) {
        textNet += `<strong>${topFp[0].name}</strong> favorece decisivamente a FP aportando una ventaja neta proyectada de +${formatNum(topFp[0].net_fp)} votos. `;
    }
    if (topJp.length > 0) {
        textNet += `Por otro lado, <strong>${topJp[0].name}</strong> favorece a JP con una ventaja neta de +${formatNum(Math.abs(topJp[0].net_fp))} votos. `;
    }
    document.getElementById('txtInsightNet').innerHTML = textNet;
}

function initDiscrepancies() {
    let tbody = '';
    for (let r of departments) {
        if (r.id >= 90) continue; // Skip extranjero for txt audit
        
        let diff_jp = r.diff_jp || 0;
        let diff_fp = r.diff_fp || 0;
        
        let dj_str = diff_jp > 0 ? `+${formatNum(diff_jp)}` : formatNum(diff_jp);
        let df_str = diff_fp > 0 ? `+${formatNum(diff_fp)}` : formatNum(diff_fp);
        
        let status = '';
        if (diff_jp === 0 && diff_fp === 0) {
            status = '<span style="color: #10b981; font-weight: 600;">✓ Conciliado</span>';
        } else {
            status = `<span class="updated-marker"><span class="pulse-dot"></span> Actualizado (+${diff_jp + diff_fp} votos)</span>`;
        }

        tbody += `
            <tr>
                <td><strong>${r.name}</strong></td>
                <td>${formatNum(r.db_jp)}</td>
                <td>${formatNum(r.txt_jp || 0)}</td>
                <td style="color: ${diff_jp === 0 ? '#10b981' : '#38bdf8'}; font-weight: bold;">${dj_str}</td>
                <td>${formatNum(r.db_fp)}</td>
                <td>${formatNum(r.txt_fp || 0)}</td>
                <td style="color: ${diff_fp === 0 ? '#10b981' : '#38bdf8'}; font-weight: bold;">${df_str}</td>
                <td>${status}</td>
            </tr>`;
    }
    document.getElementById('tableBodyDiscrepancias').innerHTML = tbody;
}

window.onload = function() {
    // Fill metadata headers
    if(typeof metadata !== 'undefined') {
        let total_mesas = 92766;
        document.getElementById('valContabilizadas').innerText = formatNum(metadata.contabilizadas_mesas);
        document.getElementById('valPctContabilizadas').innerText = `${metadata.pct_contabilizado.toFixed(2)}% computadas ('C')`;
        
        let valP = metadata.pendientes_escrutinio_mesas || 0;
        let pctP = (valP / total_mesas * 100).toFixed(2);
        document.getElementById('valPendientesEscrutinio').innerText = formatNum(valP);
        document.getElementById('valPctPendientesEscrutinio').innerText = `${pctP}% por procesar ('P')`;
        
        let valE = metadata.enviadas_jee_mesas || 0;
        let pctE = (valE / total_mesas * 100).toFixed(2);
        document.getElementById('valEnviadasJEE').innerText = formatNum(valE);
        document.getElementById('valPctEnviadasJEE').innerText = `${pctE}% enviadas al JEE ('E')`;
    }

    initCharts();
    initDiscrepancies();
    updateSimulation();
};

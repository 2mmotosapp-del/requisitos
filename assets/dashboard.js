/* =================================================================
   WYARP DASHBOARD · Listagem de leads, filtros, KPIs
   ================================================================= */
(function (global) {
  'use strict';

  let leads = [];
  let filtered = [];
  let currentLead = null;

  async function load() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Carregando...</td></tr>';

    try {
      const res = await WyarpAPI.leads.list();
      leads = Array.isArray(res) ? res : (res.results || res.leads || []);
    } catch (err) {
      console.warn('[Wyarp] Falha ao carregar leads do servidor, usando dados locais.', err);
      leads = loadLocalFallback();
    }

    // Popula segmento select
    const segs = [...new Set(leads.map(l => l.segmento).filter(Boolean))].sort();
    const segSelect = document.getElementById('filterSegmento');
    segSelect.innerHTML = '<option value="">Todos os segmentos</option>' +
      segs.map(s => `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`).join('');

    applyFilters();
    updateKPIs();
  }

  // Fallback: usa o último rascunho local + qualquer lead em cache
  function loadLocalFallback() {
    const local = [];
    const cached = localStorage.getItem('wyarp_leads_cache');
    if (cached) {
      try { return JSON.parse(cached); } catch {}
    }
    return local;
  }

  function applyFilters() {
    const search = document.getElementById('filterSearch').value.toLowerCase().trim();
    const seg = document.getElementById('filterSegmento').value;
    const sis = document.getElementById('filterPossuiSistema').value;

    filtered = leads.filter(l => {
      if (search) {
        const blob = `${l.empresa || ''} ${l.responsavel || ''} ${l.email || ''}`.toLowerCase();
        if (!blob.includes(search)) return false;
      }
      if (seg && l.segmento !== seg) return false;
      if (sis && l.possui_sistema !== sis) return false;
      return true;
    });

    renderTable();
  }

  function renderTable() {
    const tbody = document.getElementById('tableBody');
    const count = document.getElementById('tableCount');
    count.textContent = `${filtered.length} ${filtered.length === 1 ? 'registro' : 'registros'}`;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Nenhum levantamento encontrado. Crie o primeiro!</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(l => {
      const dataFmt = formatDate(l.data_registro);
      const sistemaTag = l.possui_sistema === 'Sim'
        ? `<span class="tag tag-positive">Sim${l.nome_sistema ? ' · ' + escapeHtml(l.nome_sistema) : ''}</span>`
        : l.possui_sistema === 'Não'
          ? '<span class="tag tag-warning">Não</span>'
          : '<span class="tag tag-neutral">—</span>';

      return `
        <tr data-id="${escapeAttr(l.id || '')}">
          <td class="empresa-cell">${escapeHtml(l.empresa || '—')}</td>
          <td>${escapeHtml(l.responsavel || '—')}</td>
          <td>${escapeHtml(l.segmento || '—')}</td>
          <td>${escapeHtml(l.faturamento_mensal || '—')}</td>
          <td>${sistemaTag}</td>
          <td>${dataFmt}</td>
          <td>
            <button class="row-action" data-action="view" title="Ver detalhes">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Hooks de clique
    tbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', () => {
        const id = tr.dataset.id;
        const lead = filtered.find(l => String(l.id) === String(id));
        if (lead) openModal(lead);
      });
    });
  }

  function updateKPIs() {
    const total = leads.length;
    const now = new Date();
    const mes = leads.filter(l => {
      if (!l.data_registro) return false;
      const d = new Date(l.data_registro);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const semSistema = leads.filter(l => l.possui_sistema === 'Não').length;
    const altoFat = leads.filter(l => {
      const f = l.faturamento_mensal || '';
      return f.includes('milhão') || f.includes('milhões');
    }).length;

    document.getElementById('kpiTotal').textContent = total;
    document.getElementById('kpiMes').textContent = mes;
    document.getElementById('kpiSemSistema').textContent = semSistema;
    document.getElementById('kpiAltoFat').textContent = altoFat;
    document.getElementById('kpiTotalDelta').textContent = total === 0 ? 'aguardando primeiro registro' : `+${mes} no mês`;
  }

  function openModal(lead) {
    currentLead = lead;
    document.getElementById('modalTitle').textContent = lead.empresa || 'Lead sem nome';

    const fields = [
      ['Data', formatDate(lead.data_registro)],
      ['Responsável na empresa', lead.responsavel],
      ['Consultor', lead.responsavel_levantamento || lead.consultor_responsavel],
      ['Telefone', lead.telefone],
      ['WhatsApp', lead.whatsapp],
      ['E-mail', lead.email],
      ['Site', lead.site],
      ['Segmento', lead.segmento],
      ['Funcionários', lead.funcionarios],
      ['Clientes', lead.clientes],
      ['Sistema atual', `${lead.possui_sistema || '—'}${lead.nome_sistema ? ' · ' + lead.nome_sistema : ''}`],
      ['Uso de planilhas', lead.usa_planilha],
      ['Integrações financeiras', lead.integracao_financeira],
      ['Departamentos', lead.departamentos],
      ['Faturamento mensal', lead.faturamento_mensal],
      ['Faturamento anual', lead.faturamento_anual]
    ];

    const body = document.getElementById('modalBody');
    body.innerHTML = `
      <div class="diag-grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));">
        ${fields.map(([k, v]) => `
          <dl class="diag-cell">
            <dt>${escapeHtml(k)}</dt>
            <dd>${escapeHtml(v || '—')}</dd>
          </dl>
        `).join('')}
      </div>
    `;

    document.getElementById('modalBackdrop').classList.remove('hide');
  }

  function closeModal() {
    document.getElementById('modalBackdrop').classList.add('hide');
    currentLead = null;
  }

  function init() {
    document.getElementById('btnReload').addEventListener('click', load);
    document.getElementById('filterSearch').addEventListener('input', debounce(applyFilters, 200));
    document.getElementById('filterSegmento').addEventListener('change', applyFilters);
    document.getElementById('filterPossuiSistema').addEventListener('change', applyFilters);

    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
    document.getElementById('modalBackdrop').addEventListener('click', (e) => {
      if (e.target.id === 'modalBackdrop') closeModal();
    });

    document.getElementById('modalPdf').addEventListener('click', () => {
      if (!currentLead) return;
      if (typeof WyarpPDF === 'undefined') {
        alert('Módulo PDF não carregado.');
        return;
      }
      WyarpPDF.generateFromLead(currentLead);
    });

    load();
  }

  // ============== Helpers ==============
  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeAttr(s) {
    return escapeHtml(s);
  }

  function formatDate(d) {
    if (!d) return '—';
    try {
      const parts = String(d).split('T')[0].split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return d;
    } catch { return d; }
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  global.Dashboard = { init };
})(window);

/* =================================================================
   WYARP QUESTIONNAIRE · Levantamento de requisitos em 18 etapas
   ================================================================= */
(function (global) {
  'use strict';

  // ============== Definição das perguntas ==============
  const questions = [
    { id: 1, text: 'Data do registro', desc: 'Data de preenchimento deste levantamento', type: 'date', field: 'dataRegistro', flags: ['controle'] },
    { id: 2, text: 'Nome da empresa', desc: 'Razão social ou nome fantasia', type: 'text', field: 'empresa', flags: ['identificação'] },
    { id: 3, text: 'Nome do responsável na empresa', desc: 'Pessoa de contato na empresa cliente', type: 'text', field: 'responsavel', flags: ['identificação'] },
    { id: 4, text: 'Responsável pelo levantamento', desc: 'Analista/consultor que está preenchendo este formulário', type: 'text', field: 'responsavelLevantamento', flags: ['interno'] },
    { id: 5, text: 'Telefone para contato', desc: 'Com DDD', type: 'tel', field: 'telefone', placeholder: '(11) 1234-5678', flags: ['contato'] },
    { id: 6, text: 'WhatsApp', desc: 'Número com DDD para mensagens', type: 'tel', field: 'whatsapp', placeholder: '(11) 91234-5678', flags: ['contato'] },
    { id: 7, text: 'E-mail', desc: 'E-mail principal da empresa/responsável', type: 'email', field: 'email', placeholder: 'contato@empresa.com', flags: ['contato'] },
    { id: 8, text: 'Site da empresa', desc: 'Endereço do site institucional', type: 'url', field: 'site', placeholder: 'www.empresa.com.br', flags: ['digital'] },
    { id: 9, text: 'Segmento da empresa', desc: 'Ramo de atuação principal', type: 'select', options: ['Tecnologia / Software', 'Comércio Varejista', 'Comércio Atacadista', 'Indústria', 'Serviços', 'Saúde', 'Educação', 'Agronegócio', 'Logística', 'Outro'], field: 'segmento', flags: ['mercado'] },
    { id: 10, text: 'Número de funcionários', desc: 'Quantidade total de colaboradores', type: 'select', options: ['1-10', '11-50', '51-200', '201-500', '501-1000', 'Mais de 1000'], field: 'funcionarios', flags: ['porte'] },
    { id: 11, text: 'Quantidade de clientes', desc: 'Número aproximado de clientes ativos', type: 'select', options: ['Até 50', '51-200', '201-500', '501-1000', '1001-5000', 'Mais de 5000'], field: 'clientes', flags: ['mercado', 'escala'] },
    { id: 12, text: 'Já possui algum sistema de gestão?', desc: 'ERP, CRM, ou qualquer software estruturado', type: 'radio', options: ['Sim', 'Não'], field: 'possuiSistema', flags: ['tecnologia'] },
    { id: 13, text: 'Qual o nome do sistema que utiliza?', desc: 'Apenas se respondeu SIM acima', type: 'conditionalText', field: 'nomeSistema', dependsOn: 'possuiSistema', dependsValue: 'Sim', placeholder: 'Ex: SAP, Totvs, Salesforce, sistema próprio...', flags: ['ferramenta'] },
    { id: 14, text: 'A empresa utiliza planilhas (Excel/Google Sheets)?', desc: 'Mesmo que já tenha sistema', type: 'radio', options: ['Sim, intensamente', 'Sim, pontualmente', 'Não utiliza'], field: 'usaPlanilha', flags: ['processo'] },
    { id: 15, text: 'Possui integração com banco, boletos ou outros sistemas financeiros?', desc: 'Ex: API com banco, emissão de boletos automática', type: 'checkboxes', options: ['Integração bancária', 'Emissão de boletos', 'Gateway de pagamento', 'ERP financeiro', 'Nenhuma integração'], field: 'integracaoFinanceira', flags: ['financeiro'] },
    { id: 16, text: 'Quais departamentos existem na empresa?', desc: 'Selecione os existentes e/ou adicione manualmente', type: 'dynamicDepartments', field: 'departamentos', flags: ['estrutura'] },
    { id: 17, text: 'Média de faturamento mensal', desc: 'Faturamento bruto aproximado por mês', type: 'select', options: ['Até R$ 50 mil', 'R$ 50 mil a R$ 200 mil', 'R$ 200 mil a R$ 1 milhão', 'R$ 1 milhão a R$ 5 milhões', 'Acima de R$ 5 milhões'], field: 'faturamentoMensal', flags: ['financeiro'] },
    { id: 18, text: 'Faturamento anual aproximado', desc: 'Valor bruto nos últimos 12 meses', type: 'select', options: ['Até R$ 500 mil', 'R$ 500 mil a R$ 2 milhões', 'R$ 2 milhões a R$ 10 milhões', 'R$ 10 milhões a R$ 50 milhões', 'Acima de R$ 50 milhões'], field: 'faturamentoAnual', flags: ['financeiro', 'escala'] }
  ];

  const defaultDepartamentos = ['Comercial/Vendas', 'Financeiro', 'RH', 'Operações', 'TI', 'Marketing', 'Jurídico', 'Compras', 'Logística', 'Pós-venda'];

  let state = {
    currentStep: 0,
    answers: {},
    departamentosCustom: [],
    consultorLogado: ''
  };

  // ============== Persistência local ==============
  function persist() {
    localStorage.setItem('wyarp_answers', JSON.stringify(state.answers));
  }

  function loadDraft() {
    const raw = localStorage.getItem('wyarp_answers');
    if (!raw) return false;
    try {
      state.answers = JSON.parse(raw);
      return true;
    } catch { return false; }
  }

  function saveAnswer(field, value) {
    state.answers[field] = value;
    persist();
    updateProgress();
  }

  // ============== Lógica de navegação ==============
  function shouldShow(q) {
    if (q.dependsOn) {
      const v = state.answers[q.dependsOn];
      if (q.dependsValue && v !== q.dependsValue) return false;
    }
    return true;
  }

  function nextVisible(from) {
    let n = from + 1;
    while (n < questions.length && !shouldShow(questions[n])) n++;
    return n;
  }

  function prevVisible(from) {
    let p = from - 1;
    while (p >= 0 && !shouldShow(questions[p])) p--;
    return p;
  }

  function updateProgress() {
    const visibleQs = questions.filter(shouldShow);
    let done = 0;
    for (let i = 0; i <= state.currentStep && i < questions.length; i++) {
      if (shouldShow(questions[i])) done++;
    }
    const total = visibleQs.length;
    const pct = total ? Math.round((done / total) * 100) : 0;

    const bar = document.getElementById('progressBar');
    const ind = document.getElementById('stepIndicator');
    const pctEl = document.getElementById('percentIndicator');
    if (bar) bar.style.width = pct + '%';
    if (ind) ind.textContent = `Etapa ${done} de ${total}`;
    if (pctEl) pctEl.textContent = pct + '%';
  }

  // ============== Render ==============
  function renderQuestion() {
    const container = document.getElementById('questionContainer');
    if (!container) return;

    if (state.currentStep >= questions.length) {
      return finalizeAndShowDiagnosis();
    }

    if (!shouldShow(questions[state.currentStep])) {
      state.currentStep = nextVisible(state.currentStep - 1);
      if (state.currentStep >= questions.length) {
        return finalizeAndShowDiagnosis();
      }
    }

    const q = questions[state.currentStep];
    container.innerHTML = '';

    const visibleQs = questions.filter(shouldShow);
    const visibleIndex = visibleQs.indexOf(q) + 1;

    const card = document.createElement('article');
    card.className = 'q-card';
    card.innerHTML = `
      <span class="q-step">/ etapa ${String(visibleIndex).padStart(2, '0')} de ${String(visibleQs.length).padStart(2, '0')}</span>
      <h2 class="q-title">${escapeHtml(q.text)}</h2>
      <p class="q-desc">${escapeHtml(q.desc)}</p>
      ${q.flags && q.flags.length ? `<div class="q-flags">${q.flags.map(f => `<span class="q-flag">${escapeHtml(f)}</span>`).join('')}</div>` : ''}
      <div class="q-input-area"></div>
      <nav class="q-nav"></nav>
    `;

    const inputArea = card.querySelector('.q-input-area');
    const navArea = card.querySelector('.q-nav');

    renderField(q, inputArea);
    renderNav(q, navArea);

    container.appendChild(card);
    updateProgress();

    // Foco automático no primeiro campo
    setTimeout(() => {
      const focusable = inputArea.querySelector('input, select, textarea');
      if (focusable && focusable.type !== 'checkbox' && focusable.type !== 'radio') focusable.focus();
    }, 50);
  }

  function renderField(q, container) {
    const current = state.answers[q.field];

    if (['text', 'tel', 'email', 'url'].includes(q.type)) {
      const inp = document.createElement('input');
      inp.type = q.type;
      inp.className = 'q-input';
      inp.placeholder = q.placeholder || 'Digite aqui...';
      inp.value = current || '';
      inp.addEventListener('input', e => saveAnswer(q.field, e.target.value));
      container.appendChild(inp);
    }
    else if (q.type === 'date') {
      const inp = document.createElement('input');
      inp.type = 'date';
      inp.className = 'q-input';
      inp.value = current || new Date().toISOString().split('T')[0];
      if (!current) saveAnswer(q.field, inp.value);
      inp.addEventListener('change', e => saveAnswer(q.field, e.target.value));
      container.appendChild(inp);
    }
    else if (q.type === 'select') {
      const sel = document.createElement('select');
      sel.className = 'q-select';
      sel.innerHTML = '<option value="">Selecione uma opção...</option>' +
        q.options.map(o => `<option value="${escapeHtml(o)}" ${current === o ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('');
      sel.addEventListener('change', e => saveAnswer(q.field, e.target.value));
      container.appendChild(sel);
    }
    else if (q.type === 'radio') {
      const wrap = document.createElement('div');
      wrap.className = 'q-options';
      q.options.forEach(opt => {
        const label = document.createElement('label');
        label.className = 'q-option' + (current === opt ? ' selected' : '');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = q.field;
        input.value = opt;
        input.checked = current === opt;
        input.addEventListener('change', () => {
          saveAnswer(q.field, opt);
          wrap.querySelectorAll('.q-option').forEach(o => o.classList.remove('selected'));
          label.classList.add('selected');
        });
        label.appendChild(input);
        label.appendChild(document.createTextNode(opt));
        wrap.appendChild(label);
      });
      container.appendChild(wrap);
    }
    else if (q.type === 'checkboxes') {
      const wrap = document.createElement('div');
      wrap.className = 'q-options';
      let selected = Array.isArray(current) ? [...current] : [];
      q.options.forEach(opt => {
        const label = document.createElement('label');
        label.className = 'q-option' + (selected.includes(opt) ? ' selected' : '');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = opt;
        input.checked = selected.includes(opt);
        input.addEventListener('change', e => {
          if (e.target.checked) {
            if (!selected.includes(opt)) selected.push(opt);
            label.classList.add('selected');
          } else {
            selected = selected.filter(s => s !== opt);
            label.classList.remove('selected');
          }
          saveAnswer(q.field, selected);
        });
        label.appendChild(input);
        label.appendChild(document.createTextNode(opt));
        wrap.appendChild(label);
      });
      container.appendChild(wrap);
    }
    else if (q.type === 'conditionalText') {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'q-input';
      inp.placeholder = q.placeholder;
      inp.value = current || '';
      inp.addEventListener('input', e => saveAnswer(q.field, e.target.value));
      container.appendChild(inp);
    }
    else if (q.type === 'dynamicDepartments') {
      renderDepartments(container, q, current);
    }
  }

  function renderDepartments(container, q, current) {
    const selected = Array.isArray(current) ? [...current] : [];
    state.departamentosCustom = selected.filter(d => !defaultDepartamentos.includes(d));

    const wrap = document.createElement('div');

    const opts = document.createElement('div');
    opts.className = 'q-options';
    defaultDepartamentos.forEach(d => {
      const label = document.createElement('label');
      label.className = 'q-option' + (selected.includes(d) ? ' selected' : '');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = selected.includes(d);
      cb.addEventListener('change', e => {
        if (e.target.checked) {
          if (!selected.includes(d)) selected.push(d);
          label.classList.add('selected');
        } else {
          const idx = selected.indexOf(d);
          if (idx >= 0) selected.splice(idx, 1);
          label.classList.remove('selected');
        }
        saveAnswer(q.field, [...selected]);
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(d));
      opts.appendChild(label);
    });
    wrap.appendChild(opts);

    const custom = document.createElement('div');
    custom.className = 'dept-custom-area';
    custom.innerHTML = `
      <div class="dept-custom-title">+ outros departamentos (personalizados)</div>
      <div class="dept-inline">
        <input type="text" class="q-input" placeholder="Ex: Pesquisa & Desenvolvimento" />
        <button type="button" class="btn-ghost">Adicionar</button>
      </div>
      <div class="dept-tags"></div>
    `;

    const inp = custom.querySelector('input');
    const btn = custom.querySelector('button');
    const tagsList = custom.querySelector('.dept-tags');

    function refreshTags() {
      tagsList.innerHTML = '';
      state.departamentosCustom.forEach((d, idx) => {
        const tag = document.createElement('span');
        tag.className = 'dept-tag';
        tag.innerHTML = `${escapeHtml(d)} <button type="button" title="Remover">×</button>`;
        tag.querySelector('button').addEventListener('click', () => {
          state.departamentosCustom.splice(idx, 1);
          const sIdx = selected.indexOf(d);
          if (sIdx >= 0) selected.splice(sIdx, 1);
          saveAnswer(q.field, [...selected]);
          refreshTags();
        });
        tagsList.appendChild(tag);
      });
    }

    btn.addEventListener('click', () => {
      const v = inp.value.trim();
      if (!v) return;
      if (defaultDepartamentos.includes(v)) {
        alert('Este departamento já está na lista padrão. Marque o checkbox acima.');
        return;
      }
      if (state.departamentosCustom.includes(v)) {
        alert('Departamento já adicionado.');
        return;
      }
      state.departamentosCustom.push(v);
      selected.push(v);
      saveAnswer(q.field, [...selected]);
      refreshTags();
      inp.value = '';
    });

    inp.addEventListener('keypress', e => {
      if (e.key === 'Enter') { e.preventDefault(); btn.click(); }
    });

    refreshTags();
    wrap.appendChild(custom);
    container.appendChild(wrap);
  }

  function renderNav(q, container) {
    const prev = prevVisible(state.currentStep);
    const next = nextVisible(state.currentStep);
    const isLast = next >= questions.length;

    container.innerHTML = '';

    if (prev >= 0) {
      const back = document.createElement('button');
      back.className = 'btn-ghost';
      back.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg><span>Voltar</span>';
      back.addEventListener('click', () => { state.currentStep = prev; renderQuestion(); });
      container.appendChild(back);
    } else {
      container.appendChild(document.createElement('span'));
    }

    const right = document.createElement('div');
    right.className = 'right-side';

    if (state.currentStep > 0) {
      const skip = document.createElement('button');
      skip.className = 'btn-ghost';
      skip.innerHTML = '<span>Pular</span>';
      skip.title = 'Pular esta pergunta';
      skip.addEventListener('click', () => {
        state.currentStep = next;
        if (state.currentStep >= questions.length) finalizeAndShowDiagnosis();
        else renderQuestion();
      });
      right.appendChild(skip);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn-solid';
    if (isLast) {
      nextBtn.innerHTML = '<span>Salvar e gerar diagnóstico</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    } else {
      nextBtn.innerHTML = '<span>Próxima</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    }
    nextBtn.addEventListener('click', async () => {
      if (isLast) {
        await finalizeAndShowDiagnosis();
      } else {
        state.currentStep = next;
        renderQuestion();
      }
    });
    right.appendChild(nextBtn);
    container.appendChild(right);
  }

  // ============== Finalização: salva no Baserow e mostra diagnóstico ==============
  async function finalizeAndShowDiagnosis() {
    const container = document.getElementById('questionContainer');
    container.innerHTML = `
      <div class="q-card">
        <span class="q-step">/ finalizando</span>
        <h2 class="q-title">Salvando seu levantamento...</h2>
        <p class="q-desc">Estamos enviando os dados para o servidor.</p>
      </div>`;

    let savedId = null;
    let saveError = null;
    try {
      const payload = buildPayload();
      const res = await WyarpAPI.leads.create(payload);
      savedId = res && (res.id || res.row_id);
      // Limpa rascunho local
      localStorage.removeItem('wyarp_answers');
    } catch (err) {
      saveError = err.message || 'Erro ao salvar';
      console.warn('[Wyarp] Falha ao salvar no Baserow:', err);
    }

    renderDiagnosis(savedId, saveError);
  }

  function buildPayload() {
    const a = state.answers;
    return {
      data_registro: a.dataRegistro || new Date().toISOString().split('T')[0],
      empresa: a.empresa || '',
      responsavel: a.responsavel || '',
      responsavel_levantamento: a.responsavelLevantamento || state.consultorLogado || '',
      telefone: a.telefone || '',
      whatsapp: a.whatsapp || '',
      email: a.email || '',
      site: a.site || '',
      segmento: a.segmento || '',
      funcionarios: a.funcionarios || '',
      clientes: a.clientes || '',
      possui_sistema: a.possuiSistema || '',
      nome_sistema: a.nomeSistema || '',
      usa_planilha: a.usaPlanilha || '',
      integracao_financeira: Array.isArray(a.integracaoFinanceira) ? a.integracaoFinanceira.join(', ') : (a.integracaoFinanceira || ''),
      departamentos: Array.isArray(a.departamentos) ? a.departamentos.join(', ') : (a.departamentos || ''),
      faturamento_mensal: a.faturamentoMensal || '',
      faturamento_anual: a.faturamentoAnual || '',
      consultor_responsavel: state.consultorLogado || a.responsavelLevantamento || ''
    };
  }

  // ============== Diagnóstico ==============
  function computeDiagnostics(a) {
    const flags = [];
    const recommendations = [];

    if (a.funcionarios === 'Mais de 1000') {
      flags.push({ label: 'Grande porte – estrutura complexa', critical: true });
    }
    if (a.clientes === '1001-5000' || a.clientes === 'Mais de 5000') {
      flags.push({ label: 'Grande base de clientes – demanda CRM robusto', critical: true });
      recommendations.push('Base de clientes expressiva. Recomenda-se implantação de CRM e automação de atendimento para escalar o suporte sem perda de qualidade.');
    }
    if (a.possuiSistema === 'Não') {
      flags.push({ label: 'Sem sistema de gestão – oportunidade de automação', critical: true });
      recommendations.push('Implementar um sistema de gestão integrado (ERP) é o primeiro passo para eliminar planilhas, reduzir retrabalho e ganhar visibilidade operacional.');
    }
    if (a.usaPlanilha === 'Sim, intensamente') {
      flags.push({ label: 'Alta dependência de planilhas – risco operacional', critical: true });
      recommendations.push('Migrar processos críticos de planilhas para um sistema estruturado reduz drasticamente o risco de erro humano e perda de dados.');
    }
    if (Array.isArray(a.integracaoFinanceira) && a.integracaoFinanceira.includes('Nenhuma integração')) {
      flags.push({ label: 'Sem integrações financeiras' });
      recommendations.push('Automatizar a integração bancária e a emissão de boletos pode reduzir significativamente o tempo gasto em conciliação manual.');
    } else if (Array.isArray(a.integracaoFinanceira) && a.integracaoFinanceira.length > 0) {
      flags.push({ label: 'Possui integrações financeiras – reutilizar APIs' });
    }
    if (Array.isArray(a.departamentos) && a.departamentos.length >= 6) {
      flags.push({ label: 'Muitos departamentos – necessidade de fluxos integrados' });
      recommendations.push('Com vários departamentos, priorizar integração entre eles é essencial para evitar silos de informação e retrabalho.');
    }
    if (a.faturamentoMensal && (a.faturamentoMensal.includes('milhão') || a.faturamentoMensal.includes('milhões'))) {
      flags.push({ label: 'Alto faturamento – exige escalabilidade', critical: true });
    }
    if (a.site) flags.push({ label: 'Presença digital ativa' });

    if (recommendations.length === 0) {
      recommendations.push('Sugerimos uma análise aprofundada de processos para mapear dores específicas e identificar oportunidades de automação.');
    }

    return { flags, recommendations };
  }

  function renderDiagnosis(savedId, saveError) {
    const a = state.answers;
    const { flags, recommendations } = computeDiagnostics(a);
    const dataReg = a.dataRegistro || new Date().toISOString().split('T')[0];

    document.getElementById('questionContainer').classList.add('hide');
    const resumo = document.getElementById('resumoContainer');
    resumo.classList.remove('hide');

    const fields = [
      { label: 'Empresa', value: a.empresa },
      { label: 'Responsável na empresa', value: a.responsavel },
      { label: 'Consultor responsável', value: a.responsavelLevantamento || state.consultorLogado },
      { label: 'Telefone', value: a.telefone },
      { label: 'WhatsApp', value: a.whatsapp },
      { label: 'E-mail', value: a.email },
      { label: 'Site', value: a.site },
      { label: 'Segmento', value: a.segmento },
      { label: 'Funcionários', value: a.funcionarios },
      { label: 'Clientes', value: a.clientes },
      { label: 'Possui sistema', value: a.possuiSistema + (a.nomeSistema ? ' · ' + a.nomeSistema : '') },
      { label: 'Uso de planilhas', value: a.usaPlanilha },
      { label: 'Integrações financeiras', value: Array.isArray(a.integracaoFinanceira) ? a.integracaoFinanceira.join(', ') : a.integracaoFinanceira },
      { label: 'Departamentos', value: Array.isArray(a.departamentos) ? a.departamentos.join(', ') : a.departamentos },
      { label: 'Faturamento mensal', value: a.faturamentoMensal },
      { label: 'Faturamento anual', value: a.faturamentoAnual }
    ];

    resumo.innerHTML = `
      <div class="diag-wrap">
        ${saveError ? `<div class="auth-error" style="border-radius:14px;padding:1rem 1.2rem;"><strong>Atenção:</strong> Os dados não puderam ser enviados ao servidor (${escapeHtml(saveError)}). O diagnóstico abaixo foi gerado localmente. Configure o Cloudflare Worker e o Baserow para persistir.</div>` : ''}
        ${savedId ? `<div class="meta-pill" style="align-self:flex-start;"><span class="meta-pill-key">salvo no baserow</span><span class="meta-pill-val"><span class="pulse"></span>id #${escapeHtml(String(savedId))}</span></div>` : ''}

        <section class="diag-hero">
          <span class="diag-hero-eyebrow">/ diagnóstico wyarp</span>
          <h2>${escapeHtml(a.empresa || 'Levantamento')} <em>— análise preliminar.</em></h2>
          <dl class="diag-hero-meta">
            <div><dt>Data</dt><dd>${formatDate(dataReg)}</dd></div>
            <div><dt>Segmento</dt><dd>${escapeHtml(a.segmento || '—')}</dd></div>
            <div><dt>Porte</dt><dd>${escapeHtml(a.funcionarios || '—')} colab.</dd></div>
            <div><dt>Consultor</dt><dd>${escapeHtml(a.responsavelLevantamento || state.consultorLogado || '—')}</dd></div>
          </dl>
        </section>

        <section class="diag-grid">
          ${fields.map(f => `
            <dl class="diag-cell">
              <dt>${escapeHtml(f.label)}</dt>
              <dd>${escapeHtml(f.value || '—')}</dd>
            </dl>
          `).join('')}
        </section>

        <section class="diag-flags-section">
          <h3>Sinalizadores automáticos</h3>
          <div class="diag-flags-list">
            ${flags.length ? flags.map(f => `<span class="diag-flag ${f.critical ? 'critical' : ''}">${escapeHtml(f.label)}</span>`).join('') : '<span class="diag-flag">Nenhum padrão crítico detectado</span>'}
          </div>
        </section>

        <section class="diag-recs-section">
          <h3>Recomendações iniciais</h3>
          ${recommendations.map((r, idx) => `
            <div class="diag-rec">
              <span class="diag-rec-num">${String(idx + 1).padStart(2, '0')}</span>
              <div class="diag-rec-body">${escapeHtml(r)}</div>
            </div>
          `).join('')}
        </section>

        <section class="notes-section">
          <h3>Bloco de anotações</h3>
          <label class="field-label">para análise posterior</label>
          <textarea id="blocoNotaTexto" placeholder="Observações, insights, pontos de atenção, perguntas para o cliente..."></textarea>
          <div class="notes-actions">
            <button class="btn-success" id="btnSalvarNota">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8"/></svg>
              <span>Salvar anotação</span>
            </button>
            <button class="btn-ghost" id="btnLimparNota">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
              <span>Limpar</span>
            </button>
          </div>
        </section>

        <div class="diag-actions">
          <button class="btn-ghost" onclick="Questionnaire.restart()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5"/></svg>
            <span>Novo levantamento</span>
          </button>
          <button class="btn-solid" onclick="Questionnaire.exportPdf()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            <span>Exportar PDF</span>
          </button>
          <a class="btn-ghost" href="./dashboard.html">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
            <span>Ver dashboard</span>
          </a>
        </div>
      </div>
    `;

    // Hooks dos botões
    const txt = document.getElementById('blocoNotaTexto');
    const notaSalva = localStorage.getItem('wyarp_nota_analise');
    if (notaSalva) txt.value = notaSalva;

    document.getElementById('btnSalvarNota').addEventListener('click', () => {
      localStorage.setItem('wyarp_nota_analise', txt.value);
      const btn = document.getElementById('btnSalvarNota');
      const orig = btn.querySelector('span').textContent;
      btn.querySelector('span').textContent = 'Nota salva ✓';
      setTimeout(() => { btn.querySelector('span').textContent = orig; }, 1800);
    });

    document.getElementById('btnLimparNota').addEventListener('click', () => {
      if (confirm('Limpar todas as anotações?')) {
        txt.value = '';
        localStorage.removeItem('wyarp_nota_analise');
      }
    });
  }

  // ============== API pública ==============
  function init(opts = {}) {
    state.currentStep = 0;
    state.answers = {};
    state.departamentosCustom = [];
    state.consultorLogado = opts.consultorLogado || '';

    const hasDraft = loadDraft();
    if (hasDraft && Object.keys(state.answers).length > 0) {
      const continuar = confirm('Existe um levantamento em andamento neste navegador. Deseja continuar de onde parou?');
      if (continuar) {
        // Avança até a última respondida
        let last = 0;
        for (let i = 0; i < questions.length; i++) {
          if (state.answers[questions[i].field] !== undefined && state.answers[questions[i].field] !== '' && state.answers[questions[i].field] !== null) {
            last = i;
          }
        }
        state.currentStep = nextVisible(last);
        if (state.currentStep >= questions.length) state.currentStep = last;
      } else {
        state.answers = {};
        localStorage.removeItem('wyarp_answers');
      }
    }

    // Pré-preenche o consultor
    if (state.consultorLogado && !state.answers.responsavelLevantamento) {
      state.answers.responsavelLevantamento = state.consultorLogado;
    }

    renderQuestion();
  }

  function restart() {
    if (!confirm('Iniciar um novo levantamento? Os dados atuais serão descartados.')) return;
    localStorage.removeItem('wyarp_answers');
    localStorage.removeItem('wyarp_nota_analise');
    state.answers = {};
    state.currentStep = 0;
    state.departamentosCustom = [];
    document.getElementById('resumoContainer').classList.add('hide');
    document.getElementById('questionContainer').classList.remove('hide');
    renderQuestion();
  }

  function exportPdf() {
    if (typeof WyarpPDF === 'undefined') {
      alert('Módulo de exportação PDF não disponível nesta página.');
      return;
    }
    const notes = localStorage.getItem('wyarp_nota_analise') || document.getElementById('blocoNotaTexto')?.value || '';
    WyarpPDF.generate(state.answers, computeDiagnostics(state.answers), notes);
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

  function formatDate(d) {
    if (!d) return '—';
    try {
      const parts = d.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return d;
    } catch { return d; }
  }

  global.Questionnaire = { init, restart, exportPdf };
})(window);

// Carrega o jsPDF dinamicamente se exportar for chamado
(function() {
  if (typeof window.jspdf === 'undefined' && typeof WyarpPDF === 'undefined') {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    document.head.appendChild(s);

    const s2 = document.createElement('script');
    s2.src = './assets/pdf.js';
    document.head.appendChild(s2);
  }
})();

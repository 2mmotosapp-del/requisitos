/* =================================================================
   WYARP PDF · Geração de relatório profissional do diagnóstico
   Usa jsPDF (carregado via CDN nas páginas que importam)
   ================================================================= */
(function (global) {
  'use strict';

  // Paleta convertida para o jsPDF
  const COLORS = {
    ink900: [10, 24, 32],
    ink800: [15, 43, 61],
    ink700: [22, 58, 82],
    ink600: [28, 93, 122],
    ink300: [95, 168, 196],
    ink050: [238, 243, 247],
    paper: [246, 241, 232],
    paperWarm: [251, 247, 239],
    accent: [232, 119, 34],
    accentDeep: [194, 94, 16],
    success: [28, 122, 93],
    text: [40, 50, 60],
    muted: [110, 125, 135]
  };

  function getJsPDF() {
    if (typeof global.jspdf !== 'undefined' && global.jspdf.jsPDF) return global.jspdf.jsPDF;
    if (typeof global.jsPDF !== 'undefined') return global.jsPDF;
    throw new Error('jsPDF não carregado. Adicione o script do jsPDF na página.');
  }

  function generate(answers, diagnostics, notes) {
    const fields = answersToFields(answers);
    const meta = {
      title: answers.empresa || 'Levantamento Wyarp',
      date: answers.dataRegistro || new Date().toISOString().split('T')[0],
      segment: answers.segmento || '—',
      size: answers.funcionarios || '—',
      consultor: answers.responsavelLevantamento || ''
    };
    buildPDF(meta, fields, diagnostics, notes);
  }

  function generateFromLead(lead) {
    const fields = leadToFields(lead);
    const meta = {
      title: lead.empresa || 'Levantamento Wyarp',
      date: lead.data_registro || new Date().toISOString().split('T')[0],
      segment: lead.segmento || '—',
      size: lead.funcionarios || '—',
      consultor: lead.responsavel_levantamento || lead.consultor_responsavel || ''
    };
    const diag = computeDiag(lead);
    buildPDF(meta, fields, diag, '');
  }

  function answersToFields(a) {
    return [
      ['Empresa', a.empresa],
      ['Responsável na empresa', a.responsavel],
      ['Consultor', a.responsavelLevantamento],
      ['Telefone', a.telefone],
      ['WhatsApp', a.whatsapp],
      ['E-mail', a.email],
      ['Site', a.site],
      ['Segmento', a.segmento],
      ['Funcionários', a.funcionarios],
      ['Clientes', a.clientes],
      ['Possui sistema', `${a.possuiSistema || '—'}${a.nomeSistema ? ' · ' + a.nomeSistema : ''}`],
      ['Uso de planilhas', a.usaPlanilha],
      ['Integrações financeiras', Array.isArray(a.integracaoFinanceira) ? a.integracaoFinanceira.join(', ') : a.integracaoFinanceira],
      ['Departamentos', Array.isArray(a.departamentos) ? a.departamentos.join(', ') : a.departamentos],
      ['Faturamento mensal', a.faturamentoMensal],
      ['Faturamento anual', a.faturamentoAnual]
    ];
  }

  function leadToFields(l) {
    return [
      ['Empresa', l.empresa],
      ['Responsável na empresa', l.responsavel],
      ['Consultor', l.responsavel_levantamento || l.consultor_responsavel],
      ['Telefone', l.telefone],
      ['WhatsApp', l.whatsapp],
      ['E-mail', l.email],
      ['Site', l.site],
      ['Segmento', l.segmento],
      ['Funcionários', l.funcionarios],
      ['Clientes', l.clientes],
      ['Possui sistema', `${l.possui_sistema || '—'}${l.nome_sistema ? ' · ' + l.nome_sistema : ''}`],
      ['Uso de planilhas', l.usa_planilha],
      ['Integrações financeiras', l.integracao_financeira],
      ['Departamentos', l.departamentos],
      ['Faturamento mensal', l.faturamento_mensal],
      ['Faturamento anual', l.faturamento_anual]
    ];
  }

  function computeDiag(l) {
    // Versão simplificada (mesma lógica do questionnaire.js)
    const flags = [];
    const recs = [];
    if (l.funcionarios === 'Mais de 1000') flags.push({ label: 'Grande porte – estrutura complexa', critical: true });
    if (l.clientes === '1001-5000' || l.clientes === 'Mais de 5000') {
      flags.push({ label: 'Grande base de clientes – demanda CRM robusto', critical: true });
      recs.push('Base de clientes expressiva. Recomenda-se implantação de CRM e automação de atendimento.');
    }
    if (l.possui_sistema === 'Não') {
      flags.push({ label: 'Sem sistema de gestão – oportunidade de automação', critical: true });
      recs.push('Implementar um sistema de gestão integrado (ERP) eliminará planilhas e reduzirá retrabalho.');
    }
    if (l.usa_planilha === 'Sim, intensamente') {
      flags.push({ label: 'Alta dependência de planilhas', critical: true });
      recs.push('Migrar processos críticos de planilhas para sistema estruturado reduz riscos.');
    }
    if (recs.length === 0) recs.push('Sugerimos análise aprofundada de processos para mapear dores específicas.');
    return { flags, recommendations: recs };
  }

  function buildPDF(meta, fields, diagnostics, notes) {
    const jsPDF = getJsPDF();
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    let y;

    // ============== CAPA ==============
    // Fundo escuro topo
    doc.setFillColor(...COLORS.ink900);
    doc.rect(0, 0, W, 120, 'F');

    // Faixa accent
    doc.setFillColor(...COLORS.accent);
    doc.rect(0, 0, 12, 120, 'F');

    // Logo / Brand (texto estilizado já que não temos imagem embarcada)
    doc.setTextColor(...COLORS.paper);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.text('Wyarp', 25, 35);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.accent);
    doc.text('S I S T E M A S', 25, 42);

    // Linha separadora
    doc.setDrawColor(...COLORS.ink600);
    doc.setLineWidth(0.3);
    doc.line(25, 50, W - 25, 50);

    // Eyebrow
    doc.setTextColor(...COLORS.accent);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('/ DIAGNÓSTICO DE REQUISITOS', 25, 60);

    // Título principal
    doc.setTextColor(...COLORS.paper);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    const titleLines = doc.splitTextToSize(meta.title, W - 60);
    doc.text(titleLines, 25, 75);

    // Subtítulo / data
    doc.setTextColor(200, 210, 215);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Relatório gerado em ${formatDateBR(new Date().toISOString().split('T')[0])}`, 25, 105);

    // ============== Meta cards ==============
    y = 135;
    const colW = (W - 60) / 4;
    const cards = [
      { k: 'DATA', v: formatDateBR(meta.date) },
      { k: 'SEGMENTO', v: meta.segment },
      { k: 'PORTE', v: meta.size },
      { k: 'CONSULTOR', v: meta.consultor || '—' }
    ];
    cards.forEach((c, i) => {
      const x = 25 + i * colW;
      doc.setFillColor(...COLORS.paperWarm);
      doc.roundedRect(x, y, colW - 5, 22, 3, 3, 'F');
      doc.setTextColor(...COLORS.muted);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(c.k, x + 4, y + 8);
      doc.setTextColor(...COLORS.ink900);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const txt = doc.splitTextToSize(String(c.v), colW - 12);
      doc.text(txt[0] || '—', x + 4, y + 16);
    });

    y += 35;

    // ============== Seção 1: Dados gerais ==============
    sectionTitle(doc, 'Dados gerais', y);
    y += 12;

    fields.forEach((f) => {
      if (y > H - 30) { doc.addPage(); y = 25; }
      const [label, value] = f;
      const v = String(value || '—');

      // Rótulo
      doc.setTextColor(...COLORS.muted);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(label.toUpperCase(), 25, y);

      // Valor
      doc.setTextColor(...COLORS.ink900);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const valueLines = doc.splitTextToSize(v, W - 60);
      doc.text(valueLines, 25, y + 5);

      y += 5 + valueLines.length * 4.5 + 3;

      // Linha divisória sutil
      doc.setDrawColor(220, 226, 230);
      doc.setLineWidth(0.1);
      doc.line(25, y - 1, W - 25, y - 1);
      y += 2;
    });

    y += 5;

    // ============== Seção 2: Sinalizadores ==============
    if (y > H - 60) { doc.addPage(); y = 25; }
    sectionTitle(doc, 'Sinalizadores automáticos', y);
    y += 12;

    if (diagnostics.flags && diagnostics.flags.length) {
      diagnostics.flags.forEach(f => {
        if (y > H - 20) { doc.addPage(); y = 25; }
        const isCritical = f.critical;
        const bgColor = isCritical ? [254, 243, 227] : COLORS.ink050;
        const textColor = isCritical ? COLORS.accentDeep : COLORS.ink700;
        const txt = '• ' + f.label;
        const txtLines = doc.splitTextToSize(txt, W - 70);
        const h = 7 + txtLines.length * 4;

        doc.setFillColor(...bgColor);
        doc.roundedRect(25, y, W - 50, h, 2, 2, 'F');

        if (isCritical) {
          doc.setFillColor(...COLORS.accent);
          doc.rect(25, y, 1.5, h, 'F');
        }

        doc.setTextColor(...textColor);
        doc.setFont('helvetica', isCritical ? 'bold' : 'normal');
        doc.setFontSize(9);
        doc.text(txtLines, 30, y + 5);
        y += h + 2;
      });
    } else {
      doc.setTextColor(...COLORS.muted);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text('Nenhum padrão crítico detectado.', 25, y);
      y += 8;
    }

    y += 8;

    // ============== Seção 3: Recomendações ==============
    if (y > H - 60) { doc.addPage(); y = 25; }
    sectionTitle(doc, 'Recomendações iniciais', y);
    y += 12;

    diagnostics.recommendations.forEach((r, i) => {
      if (y > H - 30) { doc.addPage(); y = 25; }
      // Número grande estilizado
      doc.setTextColor(...COLORS.accent);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text(String(i + 1).padStart(2, '0'), 25, y + 6);

      // Texto
      doc.setTextColor(...COLORS.ink900);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(r, W - 65);
      doc.text(lines, 42, y + 4);

      y += Math.max(12, lines.length * 4.5 + 5);

      doc.setDrawColor(220, 226, 230);
      doc.line(42, y - 1, W - 25, y - 1);
      y += 3;
    });

    // ============== Anotações ==============
    if (notes && notes.trim()) {
      if (y > H - 60) { doc.addPage(); y = 25; }
      y += 5;
      sectionTitle(doc, 'Anotações do consultor', y);
      y += 12;

      doc.setFillColor(254, 249, 230);
      const noteLines = doc.splitTextToSize(notes, W - 65);
      const noteH = noteLines.length * 4.5 + 10;
      doc.roundedRect(25, y, W - 50, noteH, 3, 3, 'F');
      doc.setFillColor(...COLORS.warning || [184, 134, 11]);
      doc.rect(25, y, 1.5, noteH, 'F');

      doc.setTextColor(80, 70, 30);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.text(noteLines, 30, y + 6);
      y += noteH + 5;
    }

    // ============== Rodapé em todas as páginas ==============
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(...COLORS.ink050);
      doc.setLineWidth(0.2);
      doc.line(25, H - 15, W - 25, H - 15);

      doc.setTextColor(...COLORS.muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('WYARP SISTEMAS · Diagnóstico confidencial', 25, H - 10);
      doc.text(`Página ${i} de ${totalPages}`, W - 25, H - 10, { align: 'right' });
    }

    const safeName = (meta.title || 'levantamento').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`wyarp_diagnostico_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function sectionTitle(doc, text, y) {
    // Marca lateral
    doc.setFillColor(...COLORS.accent);
    doc.rect(25, y - 4, 3, 8, 'F');
    // Eyebrow + título
    doc.setTextColor(...COLORS.accentDeep);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('/ SEÇÃO', 32, y - 1);
    doc.setTextColor(...COLORS.ink900);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(text, 32, y + 5);
  }

  function formatDateBR(s) {
    if (!s) return '—';
    try {
      const parts = String(s).split('T')[0].split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return s;
    } catch { return s; }
  }

  global.WyarpPDF = { generate, generateFromLead };
})(window);

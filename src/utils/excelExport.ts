import { Person, Recarga, ExportFilterOptions, PaymentRatesConfig, DEFAULT_PAYMENT_RATES } from '../types';

function escapeXml(str: any): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateXmlSheet(
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
  title: string
): string {
  let body = `
  <Row>
    <Cell ss:MergeAcross="${headers.length - 1}" ss:StyleID="Title">
      <Data ss:Type="String">${escapeXml(title)}</Data>
    </Cell>
  </Row>
  <Row/>
  <Row>
    ${headers
      .map(
        (h) => `
    <Cell ss:StyleID="Header">
      <Data ss:Type="String">${escapeXml(h)}</Data>
    </Cell>`
      )
      .join('')}
  </Row>`;

  rows.forEach((r) => {
    body += `
  <Row>
    ${r
      .map((val) => {
        const isNum = typeof val === 'number';
        return `
      <Cell ss:StyleID="${isNum ? 'NumberCell' : 'Default'}">
        <Data ss:Type="${isNum ? 'Number' : 'String'}">${escapeXml(val)}</Data>
      </Cell>`;
      })
      .join('')}
  </Row>`;
  });

  return `
  <Worksheet ss:Name="${escapeXml(sheetName)}">
    <Table>
      ${body}
    </Table>
  </Worksheet>`;
}

export function exportCleanExcel(
  allPeople: Person[],
  recs: Recarga[],
  options?: ExportFilterOptions
) {
  const coord = options?.coord ? options.coord.trim().toUpperCase() : '';
  const filterByCoord = (p: Person) => !coord || p.coord.toUpperCase() === coord;
  const filterByState = (p: Person) =>
    !options?.state || p.estado === options.state || (options.state === 'NOVO' && p.isNovo);

  const mobs = allPeople.filter((p) => p.type === 'mob' && filterByCoord(p) && filterByState(p));
  const sups = allPeople.filter((p) => p.type === 'sup' && filterByCoord(p) && filterByState(p));
  const motos = allPeople.filter((p) => p.type === 'moto' && filterByCoord(p) && filterByState(p));
  const recargas = recs.filter((r) => !coord || r.coord.toUpperCase() === coord);

  const mobsRows = mobs.map((p, i) => [
    i + 1,
    p.nome,
    p.bi,
    p.sexo,
    p.coord,
    p.nivelAcademico || '—',
    p.areaFormacao || '—',
    p.curso || '—',
    p.dias, // DIAS DE TRABALHO
    p.iban,
    p.banco,
    p.estado,
  ]);

  const supsRows = sups.map((p, i) => [
    i + 1,
    p.nome,
    p.bi,
    p.sexo,
    p.coord,
    p.funcao || 'Supervisor (a)',
    p.nivelAcademico || '—',
    p.areaFormacao || '—',
    p.curso || '—',
    p.dias, // DIAS DE TRABALHO
    p.iban,
    p.banco,
    p.contacto || '',
    p.estado,
  ]);

  const motosRows = motos.map((p, i) => [
    i + 1,
    p.nome,
    p.bi,
    p.sexo,
    p.coord,
    p.marca || '',
    p.matricula || '',
    p.nivelAcademico || '—',
    p.curso || '—',
    p.dias, // DIAS DE TRABALHO
    p.iban,
    p.banco,
    p.estado,
  ]);

  const recsRows = recargas.map((r, i) => [
    i + 1,
    r.nome,
    r.funcao,
    r.coord,
    r.qtd,
    r.telefone,
    r.assinatura || '',
  ]);

  let xmlDoc = `<?xml version="1.0" encoding="UTF-8"?>
  <?mso-application progid="Excel.Sheet"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
   xmlns:o="urn:schemas-microsoft-com:office:office"
   xmlns:x="urn:schemas-microsoft-com:office:excel"
   xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
   <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#8B1D24" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center"/>
    </Style>
    <Style ss:ID="Title">
      <Font ss:Bold="1" ss:Size="13" ss:Color="#D9A441"/>
      <Interior ss:Color="#0B1320" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center"/>
    </Style>
    <Style ss:ID="NumberCell">
      <Alignment ss:Horizontal="Center"/>
    </Style>
    <Style ss:ID="Default">
      <Alignment ss:Vertical="Center"/>
    </Style>
   </Styles>`;

  const titleHeader = `REPÚBLICA DE ANGOLA · GOVERNO DO CUANZA-SUL · SUMBE · CAMPANHA PÓLIO nOVP2 ${coord ? `[${coord}]` : ''}`;

  xmlDoc += generateXmlSheet(
    'MOBILIZADORES',
    ['Nº', 'NOME COMPLETO', 'BI', 'SEXO', 'COORDENAÇÃO', 'NÍVEL ACADÉMICO', 'ÁREA FORMAÇÃO', 'CURSO FEITO', 'DIAS DE TRABALHO', 'IBAN', 'BANCO', 'ESTADO'],
    mobsRows,
    `${titleHeader} - MAPA DE MOBILIZADORES (DIAS DE TRABALHO)`
  );

  xmlDoc += generateXmlSheet(
    'SUPERVISORES',
    ['Nº', 'NOME COMPLETO', 'BI', 'SEXO', 'COORDENAÇÃO', 'FUNÇÃO', 'NÍVEL ACADÉMICO', 'ÁREA FORMAÇÃO', 'CURSO FEITO', 'DIAS DE TRABALHO', 'IBAN', 'BANCO', 'CONTACTO', 'ESTADO'],
    supsRows,
    `${titleHeader} - MAPA DE SUPERVISORES (DIAS DE TRABALHO)`
  );

  xmlDoc += generateXmlSheet(
    'MOTOQUEIROS',
    ['Nº', 'NOME COMPLETO', 'BI', 'SEXO', 'COORDENAÇÃO', 'MARCA', 'MATRÍCULA', 'NÍVEL ACADÉMICO', 'CURSO FEITO', 'DIAS DE TRABALHO', 'IBAN', 'BANCO', 'ESTADO'],
    motosRows,
    `${titleHeader} - APOIO LOGÍSTICO E MOTOQUEIROS (DIAS DE TRABALHO)`
  );

  xmlDoc += generateXmlSheet(
    'RECARGAS',
    ['Nº', 'NOME COMPLETO', 'FUNÇÃO', 'COORDENAÇÃO', 'QUANTIDADE RECARGAS', 'TELEFONE', 'ASSINATURA'],
    recsRows,
    `${titleHeader} - MAPA DE RECARGAS DE COMUNICAÇÃO`
  );

  xmlDoc += '\n</Workbook>';

  const blob = new Blob([xmlDoc], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Mapa_Efetivos_Sumbe_${coord ? coord.replace(/[\s-]/g, '_') : 'Geral'}_${new Date().toISOString().slice(0, 10)}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exporta a Lista de Presença para Excel (com nomes ou folha em branco)
 */
export function exportListaPresencaExcel(
  coord: string,
  roleTitle: string,
  days: { label: string; date: string }[],
  people: Person[],
  withNames: boolean
) {
  const headers = ['Nº', 'NOME COMPLETO DO AGENTE', 'FUNÇÃO', ...days.map((d) => `${d.label} (${d.date})`)];

  const rows: (string | number)[][] = [];

  if (withNames) {
    people.forEach((p, idx) => {
      let func = 'Mobilizador';
      if (p.type === 'sup') func = 'Supervisor';
      if (p.type === 'moto') func = 'Motoqueiro';

      const row: (string | number)[] = [idx + 1, p.nome, func];
      days.forEach(() => row.push('')); // Espaço para assinatura
      rows.push(row);
    });
  } else {
    // Folha em branco: 25 a 30 linhas numeradas vazias para preenchimento manual no terreno
    const count = Math.max(people.length, 25);
    for (let i = 1; i <= count; i++) {
      const row: (string | number)[] = [i, '', ''];
      days.forEach(() => row.push(''));
      rows.push(row);
    }
  }

  const title = `REPÚBLICA DE ANGOLA · FOLHA OFICIAL DE PRESENÇA (${roleTitle}) · COORDENAÇÃO: ${coord} · ${withNames ? 'PREENCHIDA' : 'EM BRANCO'}`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Title">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="NumberCell">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
  </Style>
 </Styles>
 ${generateXmlSheet('LISTA_PRESENCA', headers, rows, title)}
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Lista_Presenca_${roleTitle.replace(/\s+/g, '_')}_${coord.replace(/[\s-]/g, '_')}_${withNames ? 'ComNomes' : 'EmBranco'}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exporta o Mapa Oficial de Pagamento para Excel (conforme modelo oficial do Sumbe)
 */
export function exportMapaPagamentoExcel(
  target: 'mobs' | 'sups' | 'motos' | 'recs' | 'todos',
  allPeople: Person[],
  recs: Recarga[],
  coordFilter?: string,
  customRates?: Partial<PaymentRatesConfig>
) {
  const rates: PaymentRatesConfig = {
    ...DEFAULT_PAYMENT_RATES,
    ...(customRates || {}),
  };
  const normFilter = coordFilter && coordFilter !== 'TODAS AS COORDENAÇÕES' ? coordFilter.toUpperCase().replace(/\s*-\s*/g, '-') : '';

  const filterList = (list: Person[]) => {
    return list.filter((p) => {
      const matchCoord = !normFilter || p.coord.toUpperCase().replace(/\s*-\s*/g, '-') === normFilter;
      return matchCoord && p.estado !== 'Substituído';
    });
  };

  const mobs = filterList(allPeople.filter((p) => p.type === 'mob'));
  const sups = filterList(allPeople.filter((p) => p.type === 'sup'));
  const motos = filterList(allPeople.filter((p) => p.type === 'moto'));

  let xmlDoc = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9.5" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="9.5" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0284C7" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Title">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="NumberCell">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0.00"/>
   <Font ss:FontName="Calibri" ss:Size="9.5" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="TotalRow">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#0F172A"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#FEF08A" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
 </Styles>`;

  const subHeader = 'REPÚBLICA DE ANGOLA · GOVERNO DA PROVÍNCIA DO CUANZA-SUL · ADMINISTRAÇÃO MUNICIPAL DO SUMBE · DIRECÇÃO DE SAÚDE';

  if (target === 'mobs' || target === 'todos') {
    const headers = ['Nº', 'NOME COMPLETO', 'BI', 'SEXO', 'COORDENAÇÃO', 'TOTAL/DIAS', 'VAL. DIÁRIO', 'VAL. TOTAL', 'IBAN', 'BANCO'];
    let sumTotal = 0;
    const rows = mobs.map((p, idx) => {
      const dias = Number(p.dias) || rates.mobDays;
      const valDiario = rates.mobRate;
      const valTotal = dias * valDiario;
      sumTotal += valTotal;
      return [
        idx + 1,
        p.nome,
        p.bi,
        p.sexo,
        p.coord,
        dias,
        valDiario.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
        valTotal.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
        p.iban,
        p.banco,
      ];
    });

    rows.push([
      'TOTAL GERAL',
      '',
      '',
      '',
      '',
      mobs.reduce((acc, p) => acc + (p.dias || 5), 0),
      '',
      sumTotal.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
      '',
      '',
    ]);

    xmlDoc += generateXmlSheet(
      'PAG_MOBILIZADORES',
      headers,
      rows,
      `${subHeader} - MAPA DE PAGAMENTO DOS MOBILIZADORES`
    );
  }

  if (target === 'sups' || target === 'todos') {
    const headers = ['Nº', 'NOME COMPLETO', 'BI', 'SEXO', 'A. COORDENAÇÃO', 'T. DIA', 'VAL. DIÁRIO', 'VAL. TOTAL', 'IBAN', 'BANCO'];
    let sumTotal = 0;
    const rows = sups.map((p, idx) => {
      const isMunicipal = p.coord.toUpperCase().includes('MUNICIPAL') || p.nome.toUpperCase().includes('VICTÓRIA');
      const dias = Number(p.dias) || (isMunicipal ? rates.supMunDays : rates.supAreaDays);
      const valDiario = isMunicipal ? rates.supMunRate : rates.supAreaRate;
      const valTotal = dias * valDiario;
      sumTotal += valTotal;
      return [
        idx + 1,
        p.nome,
        p.bi,
        p.sexo,
        p.coord,
        dias,
        valDiario.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
        valTotal.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
        p.iban,
        p.banco,
      ];
    });

    rows.push([
      'TOTAL GERAL',
      '',
      '',
      '',
      '',
      sups.reduce((acc, p) => acc + (p.dias || 5), 0),
      '',
      sumTotal.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
      '',
      '',
    ]);

    xmlDoc += generateXmlSheet(
      'PAG_SUPERVISORES',
      headers,
      rows,
      `${subHeader} - MAPA DE PAGAMENTO DOS SUPERVISORES DA MOBILIZAÇÃO`
    );
  }

  if (target === 'motos' || target === 'todos') {
    const headers = ['Nº', 'NOME COMPLETO', 'BI', 'SEXO', 'A. COORDENAÇÃO', 'MARCA', 'MATRÍCULA', 'T. DIA', 'VAL. DIÁRIO', 'VAL. TOTAL', 'IBAN', 'BANCO'];
    let sumTotal = 0;
    const rows = motos.map((p, idx) => {
      const isMunicipal = p.coord.toUpperCase().includes('MUNICIPAL') || p.nome.toUpperCase().includes('DOMINGOS CANHANGA');
      const dias = Number(p.dias) || (isMunicipal ? rates.motoMunDays : rates.motoAreaDays);
      const valDiario = isMunicipal ? rates.motoMunRate : rates.motoAreaRate;
      const valTotal = dias * valDiario;
      sumTotal += valTotal;
      return [
        idx + 1,
        p.nome,
        p.bi,
        p.sexo,
        p.coord,
        p.marca || 'LING KEN',
        p.matricula || '—',
        dias,
        valDiario.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
        valTotal.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
        p.iban,
        p.banco,
      ];
    });

    rows.push([
      'TOTAL GERAL',
      '',
      '',
      '',
      '',
      '',
      '',
      motos.reduce((acc, p) => acc + (p.dias || rates.motoAreaDays), 0),
      '',
      sumTotal.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
      '',
      '',
    ]);

    xmlDoc += generateXmlSheet(
      'PAG_MOTOQUEIROS',
      headers,
      rows,
      `${subHeader} - MAPA DE PAGAMENTO DOS TRANSPORTES DE APOIO (MOTOQUEIROS)`
    );
  }

  if (target === 'recs' || target === 'todos') {
    const headers = ['Nº', 'Nome Completo', 'Função', 'COORDENAÇÃO', 'QTD', 'VALOR DA RECARGA', 'TELEFONE', 'ASSINATURA'];
    let sumTotal = 0;
    const filteredRecs = recs.filter((r) => {
      const matchCoord = !normFilter || r.coord.toUpperCase().replace(/\s*-\s*/g, '-') === normFilter;
      return matchCoord;
    });

    const rows = filteredRecs.map((r, idx) => {
      const qtd = Number(r.qtd) || rates.recDefaultQtd;
      const valUnit = rates.recUnitVal;
      const totalRec = qtd * valUnit;
      sumTotal += totalRec;
      return [
        idx + 1,
        r.nome,
        r.funcao || 'Supervisor (a) de Mobsoc',
        r.coord,
        qtd,
        totalRec.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
        r.telefone || '',
        '',
      ];
    });

    rows.push([
      'TOTAL GERAL',
      '',
      '',
      '',
      filteredRecs.reduce((acc, r) => acc + (r.qtd || 2), 0),
      sumTotal.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
      '',
      '',
    ]);

    xmlDoc += generateXmlSheet(
      'PAG_RECARGAS',
      headers,
      rows,
      `${subHeader} - MAPA DE RECARGA PARA OS SUPERVISORES DA MOBILIZAÇÃO`
    );
  }

  xmlDoc += '\n</Workbook>';

  const blob = new Blob([xmlDoc], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Mapa_Pagamento_${target.toUpperCase()}_Sumbe_${normFilter || 'Geral'}_${new Date().toISOString().slice(0, 10)}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

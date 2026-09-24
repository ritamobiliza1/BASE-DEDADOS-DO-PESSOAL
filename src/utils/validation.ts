import { Person, ValidationIssue, ValidationSummary } from '../types';

export const ANGOLAN_BANKS: Record<string, string> = {
  '0040': 'BAI - Banco Angolano de Investimentos',
  '0051': 'BIC - Banco BIC',
  '0006': 'BFA - Banco de Fomento Angola',
  '0010': 'BPC - Banco de Poupança e Crédito',
  '0055': 'Millennium Atlântico',
  '0044': 'Banco Sol',
  '0047': 'Banco Keve',
  '0052': 'BNI - Banco de Negócios Internacional',
  '0004': 'Banco Caixa Geral Angola (BCGA)',
  '0005': 'BCI - Banco de Comércio e Indústria',
  '0060': 'Standard Bank Angola',
  '0045': 'Banco Económico',
  '0059': 'Banco VTB África',
  '0058': 'Finibanco Angola',
  '0064': 'Banco Prestígio',
  '0066': 'Banco Comercial do Huambo',
  '0069': 'Banco Yetu',
};

export function getBankFromIban(iban: string): string {
  const clean = String(iban || '').replace(/\s+/g, '').toUpperCase();
  if (clean.length >= 8 && clean.startsWith('AO06')) {
    const code = clean.slice(4, 8);
    return ANGOLAN_BANKS[code] ? ANGOLAN_BANKS[code].split(' - ')[0] : (code ? `Banco (${code})` : '');
  }
  return '';
}

/**
 * Normaliza o nome da coordenação, unificando "CASA - BRANCA" e "CASA-BRANCA"
 */
export function normalizeCoordName(coord?: string): string {
  if (!coord) return '';
  return coord
    .trim()
    .toUpperCase()
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ');
}

/**
 * Validação do Bilhete de Identidade Angolano (BI)
 * Estrutura padrão: 9 dígitos + 2 letras + 3 dígitos (ex: 005294346KS041)
 * Total: 14 caracteres alfanuméricos
 */
export function validateAngolanBI(bi: string): { isValid: boolean; message: string; normalized: string } {
  if (!bi || !bi.trim()) {
    return { isValid: false, message: 'BI é obrigatório', normalized: '' };
  }
  const clean = bi.trim().toUpperCase().replace(/[\s-]/g, '');

  if (clean.length !== 14) {
    return {
      isValid: false,
      message: `BI deve ter exatamente 14 caracteres (atualmente tem ${clean.length})`,
      normalized: clean,
    };
  }

  // Regex para formato angolano: 9 números + 2 letras maiúsculas + 3 números
  const biRegex = /^\d{9}[A-Z]{2}\d{3}$/;
  if (!biRegex.test(clean)) {
    return {
      isValid: false,
      message: 'Formato inválido. Esperado: 9 números + 2 letras (província) + 3 números (ex: 005294346KS041)',
      normalized: clean,
    };
  }

  return { isValid: true, message: 'BI válido', normalized: clean };
}

/**
 * Validação do IBAN Angolano
 * Estrutura: AO06 + 21 dígitos numéricos
 * Total: 25 caracteres alfanuméricos
 */
export function validateAngolanIBAN(iban: string): { isValid: boolean; message: string; normalized: string; bankName: string } {
  if (!iban || !iban.trim()) {
    return { isValid: false, message: 'IBAN não preenchido', normalized: '', bankName: '' };
  }

  const clean = iban.trim().toUpperCase().replace(/[\s-]/g, '');

  if (!clean.startsWith('AO06')) {
    return {
      isValid: false,
      message: 'IBAN angolano deve iniciar com o código AO06',
      normalized: clean,
      bankName: '',
    };
  }

  if (clean.length !== 25) {
    return {
      isValid: false,
      message: `IBAN deve ter 25 caracteres (atualmente tem ${clean.length})`,
      normalized: clean,
      bankName: '',
    };
  }

  const digitsOnly = clean.slice(4);
  if (!/^\d{21}$/.test(digitsOnly)) {
    return {
      isValid: false,
      message: 'Os 21 caracteres após AO06 devem ser exclusivamente números',
      normalized: clean,
      bankName: '',
    };
  }

  const bankName = getBankFromIban(clean);

  return { isValid: true, message: 'IBAN válido e verificado', normalized: clean, bankName };
}

/**
 * Validação de Contacto Telefónico Angolano
 * Números móveis começam com 9 (91, 92, 93, 94, 95, 97, 99) com 9 dígitos
 */
export function validateAngolanPhone(phone: string): { isValid: boolean; message: string; normalized: string } {
  if (!phone || !phone.trim()) {
    return { isValid: false, message: 'Telefone em falta', normalized: '' };
  }
  const clean = phone.trim().replace(/[\s\-\(\)\.]/g, '').replace(/^\+244/, '');

  if (/^9\d{8}$/.test(clean)) {
    return { isValid: true, message: 'Telefone válido (+244 ' + clean + ')', normalized: clean };
  }

  return {
    isValid: false,
    message: 'Telefone deve ter 9 dígitos e iniciar com 9 (ex: 928621619)',
    normalized: clean,
  };
}

/**
 * Validação de Dias de Trabalho
 * Garante número positivo coerente para as rondas (geralmente entre 1 e 15 dias)
 */
export function validateWorkingDays(dias: number): { isValid: boolean; message: string } {
  if (dias === undefined || dias === null || isNaN(dias)) {
    return { isValid: false, message: 'Número de dias inválido' };
  }
  if (dias <= 0) {
    return { isValid: false, message: 'Dias de trabalho deve ser maior que zero' };
  }
  if (dias > 30) {
    return { isValid: false, message: 'Aviso: Mais de 30 dias de trabalho registados' };
  }
  return { isValid: true, message: 'Dias de trabalho válidos' };
}

/**
 * Auditoria Geral da Base de Dados
 * Deteta BIs duplicados, IBANs duplicados, dados em falta e inconsistências
 */
export function auditAllPeople(allPeople: Person[]): ValidationSummary {
  const issues: ValidationIssue[] = [];

  // 1. Contagem de duplicados de BI
  const biMap = new Map<string, Person[]>();
  const ibanMap = new Map<string, Person[]>();

  allPeople.forEach((p) => {
    const biNorm = (p.bi || '').trim().toUpperCase().replace(/[\s-]/g, '');
    if (biNorm) {
      const arr = biMap.get(biNorm) || [];
      arr.push(p);
      biMap.set(biNorm, arr);
    }

    const ibanNorm = (p.iban || '').trim().toUpperCase().replace(/[\s-]/g, '');
    if (ibanNorm) {
      const arr = ibanMap.get(ibanNorm) || [];
      arr.push(p);
      ibanMap.set(ibanNorm, arr);
    }
  });

  const duplicateBiList = Array.from(biMap.entries())
    .filter(([_, list]) => list.length > 1)
    .map(([bi]) => bi);

  const duplicateIbanList = Array.from(ibanMap.entries())
    .filter(([_, list]) => list.length > 1)
    .map(([iban]) => iban);

  let validBiCount = 0;
  let invalidBiCount = 0;
  let validIbanCount = 0;
  let invalidIbanCount = 0;
  let missingContactCount = 0;

  allPeople.forEach((p) => {
    // Validação de BI
    const biVal = validateAngolanBI(p.bi);
    if (biVal.isValid) {
      validBiCount++;
    } else {
      invalidBiCount++;
      issues.push({
        personId: p.id,
        personName: p.nome,
        personType: p.type,
        coord: p.coord,
        field: 'bi',
        severity: 'error',
        message: biVal.message,
      });
    }

    // BI Duplicado
    const biClean = (p.bi || '').trim().toUpperCase().replace(/[\s-]/g, '');
    if (duplicateBiList.includes(biClean)) {
      issues.push({
        personId: p.id,
        personName: p.nome,
        personType: p.type,
        coord: p.coord,
        field: 'bi',
        severity: 'error',
        message: `BI Duplicado: partilhado por ${biMap.get(biClean)?.length} registos`,
      });
    }

    // Validação de IBAN
    if (p.iban) {
      const ibanVal = validateAngolanIBAN(p.iban);
      if (ibanVal.isValid) {
        validIbanCount++;
      } else {
        invalidIbanCount++;
        issues.push({
          personId: p.id,
          personName: p.nome,
          personType: p.type,
          coord: p.coord,
          field: 'iban',
          severity: 'warning',
          message: ibanVal.message,
        });
      }

      const ibanClean = p.iban.trim().toUpperCase().replace(/[\s-]/g, '');
      if (duplicateIbanList.includes(ibanClean)) {
        issues.push({
          personId: p.id,
          personName: p.nome,
          personType: p.type,
          coord: p.coord,
          field: 'iban',
          severity: 'warning',
          message: `IBAN Duplicado: partilhado por ${ibanMap.get(ibanClean)?.length} registos`,
        });
      }
    } else {
      invalidIbanCount++;
      issues.push({
        personId: p.id,
        personName: p.nome,
        personType: p.type,
        coord: p.coord,
        field: 'iban',
        severity: 'warning',
        message: 'IBAN não informado',
      });
    }

    // Validação de Dias
    const daysVal = validateWorkingDays(p.dias);
    if (!daysVal.isValid) {
      issues.push({
        personId: p.id,
        personName: p.nome,
        personType: p.type,
        coord: p.coord,
        field: 'dias',
        severity: 'warning',
        message: daysVal.message,
      });
    }

    // Contacto em supervisores e motoqueiros
    if (!p.contacto || !p.contacto.trim()) {
      missingContactCount++;
      if (p.type === 'sup' || p.type === 'moto') {
        issues.push({
          personId: p.id,
          personName: p.nome,
          personType: p.type,
          coord: p.coord,
          field: 'contacto',
          severity: 'warning',
          message: `Contacto telefónico ausente para ${p.type === 'sup' ? 'Supervisor' : 'Motoqueiro'}`,
        });
      }
    }
  });

  return {
    totalPeople: allPeople.length,
    validBiCount,
    invalidBiCount,
    duplicateBiList,
    validIbanCount,
    invalidIbanCount,
    duplicateIbanList,
    missingContactCount,
    totalIssues: issues,
  };
}

/**
 * Normaliza e Corrige automaticamente um registo
 */
export function autoNormalizePerson(p: Person): Person {
  const cleanBi = (p.bi || '').trim().toUpperCase().replace(/[\s-]/g, '');
  const cleanIban = (p.iban || '').trim().toUpperCase().replace(/[\s-]/g, '');
  const bancoAuto = getBankFromIban(cleanIban) || p.banco || '';
  const cleanPhone = (p.contacto || '').trim().replace(/[\s\-\(\)\.]/g, '');

  return {
    ...p,
    nome: p.nome.trim().toUpperCase(),
    bi: cleanBi,
    iban: cleanIban,
    banco: bancoAuto,
    contacto: cleanPhone,
    coord: p.coord.trim().toUpperCase(),
    dias: Number(p.dias || 0) > 0 ? Number(p.dias) : 5,
    updatedAt: new Date().toISOString(),
  };
}

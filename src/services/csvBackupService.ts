import {
  AdminMemberRecord,
  CollaboratorRecord,
  CompanyRecord,
  DeveloperSystemConfig,
  InterviewRecord,
  SectorRecord,
} from '../types';

export interface BackupExportResult {
  filename: string;
  timestampSlug: string;
  formattedTimestamp: string;
  interviewsCount: number;
  collaboratorsCount: number;
  sizeBytes: number;
  scope: 'full' | 'interviews' | 'collaborators';
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value)
    .replace(/\r\n/g, ' | ')
    .replace(/\n/g, ' | ')
    .replace(/\r/g, ' | ')
    .replace(/"/g, '""');
  return `"${str}"`;
}

function buildCsvRow(cells: unknown[]): string {
  return cells.map(escapeCsvCell).join(',');
}

export function generateBackupTimestamps(now = new Date()): {
  timestampSlug: string;
  formattedTimestamp: string;
  isoTimestamp: string;
} {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  return {
    timestampSlug: `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`,
    formattedTimestamp: `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`,
    isoTimestamp: now.toISOString(),
  };
}

function triggerCsvDownload(filename: string, csvContent: string): number {
  // Include UTF-8 BOM (\uFEFF) so Excel / LibreOffice / Google Sheets render Portuguese accents properly
  const contentWithBom = '\uFEFF' + csvContent;
  const blob = new Blob([contentWithBom], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2500);
  return blob.size;
}

function buildCollaboratorsCsvLines(
  collaborators: CollaboratorRecord[],
  config: DeveloperSystemConfig
): string[] {
  const customFieldKeys = config.collaboratorCustomFields.map((cf) => cf.key);
  const customFieldHeaders = config.collaboratorCustomFields.map(
    (cf) => `Campo Adicional: ${cf.label} (${cf.key})`
  );

  const header = buildCsvRow([
    'Tipo de Registro',
    'ID Registro',
    'UID Página WEB',
    'Nome',
    'Sobrenome',
    'Nome Completo',
    'E-mail Corporativo',
    'Dica de E-mail',
    'Telefone',
    'Idade',
    'Data de Nascimento',
    'Empresa',
    'ID Empresa',
    'Setor',
    'ID Setor',
    'Cargo / Função',
    'Tempo na Função',
    'Provedor de Conta',
    'Autenticação 2 Etapas (2FA)',
    'Google UID',
    'Aceite LGPD & Marco Civil',
    'Data de Cadastro',
    'Timestamp de Exportação (Backup)',
    ...customFieldHeaders,
  ]);

  const nowIso = new Date().toISOString();
  const rows = collaborators.map((c) => {
    const customValues = customFieldKeys.map(
      (key) => c.customFieldsMap?.[key] ?? ''
    );
    return buildCsvRow([
      'COLABORADOR',
      c.id,
      c.webUid,
      c.firstName,
      c.lastName,
      `${c.firstName} ${c.lastName}`.trim(),
      c.email,
      c.emailHint,
      c.phone,
      c.age,
      c.birthDate,
      c.companyName,
      c.companyId,
      c.sectorName,
      c.sectorId,
      c.role,
      c.tenure,
      c.accountType === 'google' ? 'Login Google' : 'Conta Corporativa',
      c.twoFactorEnabled ? 'Ativa (2FA)' : 'Inativa',
      c.googleUid || '',
      c.acceptedTerms ? 'Sim (Aceito)' : 'Não',
      c.registeredDate,
      nowIso,
      ...customValues,
    ]);
  });

  return [header, ...rows];
}

function buildInterviewsCsvLines(
  interviews: InterviewRecord[],
  config: DeveloperSystemConfig
): string[] {
  const extraQuestions = config.customQuestions.filter((q) => !q.isCore);
  const extraHeaders = extraQuestions.map(
    (q) => `Pergunta Adicional (${q.id}): ${q.label}`
  );

  const header = buildCsvRow([
    'Tipo de Registro',
    'ID Entrevista',
    'Data da Entrevista',
    'Empresa',
    'Nome do Gestor / Colaborador Entrevistado',
    'Cargo / Setor Avaliado',
    'Tempo na Função',
    'ID Colaborador',
    'UID Página WEB do Colaborador',
    'Q1 - Maiores Demandas e Pressão no Setor',
    'Q2 - Distribuição de Tarefas e Metas',
    'Q3 - Conflitos Mais Frequentes no Setor',
    'Q4 - Tratativa de Queixas e Insatisfações',
    'Q5 - Mudanças Significativas Recentes',
    'Q6 - Indicadores de Atenção (Afastamentos, Conflitos, Produtividade)',
    'Q7 - Medidas Preventivas e Melhorias no Ambiente',
    'Timestamp de Exportação (Backup)',
    ...extraHeaders,
  ]);

  const nowIso = new Date().toISOString();
  const rows = interviews.map((item) => {
    const extraValues = extraQuestions.map(
      (q) => item.extraAnswersMap?.[q.id] ?? ''
    );
    return buildCsvRow([
      'ENTREVISTA',
      item.id,
      item.interviewDate,
      item.companyName,
      item.managerName,
      item.roleSector,
      item.tenure,
      item.collaboratorId,
      item.collaboratorWebUid,
      item.q1DemandsAndPressure,
      item.q2TaskDistribution,
      item.q3FrequentConflicts,
      item.q4ComplaintsHandling,
      item.q5SignificantChanges,
      item.q6AttentionIndicators,
      item.q7PreventiveMeasures,
      nowIso,
      ...extraValues,
    ]);
  });

  return [header, ...rows];
}

export function exportFullDatabaseBackupCSV(params: {
  interviews: InterviewRecord[];
  collaborators: CollaboratorRecord[];
  config: DeveloperSystemConfig;
  companies?: CompanyRecord[];
  sectors?: SectorRecord[];
  admins?: AdminMemberRecord[];
}): BackupExportResult {
  const {
    interviews,
    collaborators,
    config,
    companies = [],
    sectors = [],
    admins = [],
  } = params;
  const { timestampSlug, formattedTimestamp, isoTimestamp } =
    generateBackupTimestamps();

  const metadataLines: string[] = [
    buildCsvRow([
      'BACKUP OFFLINE DE DADOS CORPORATIVOS — DIAGORG (FIREBASE FIRESTORE)',
    ]),
    buildCsvRow(['Data/Hora do Backup (Local)', formattedTimestamp]),
    buildCsvRow(['Timestamp ISO-8601', isoTimestamp]),
    buildCsvRow(['Formulário Configurado', config.formTitle]),
    buildCsvRow(['Total de Entrevistas Exportadas', interviews.length]),
    buildCsvRow(['Total de Colaboradores Exportados', collaborators.length]),
    buildCsvRow(['Total de Empresas Cadastradas', companies.length]),
    buildCsvRow(['Total de Setores Cadastrados', sectors.length]),
    buildCsvRow(['Total de Administradores Credenciados', admins.length]),
    '',
    buildCsvRow([
      '=== SEÇÃO 1: REGISTROS DE ENTREVISTAS DE DIAGNÓSTICO ORGANIZACIONAL ===',
    ]),
  ];

  const interviewLines = buildInterviewsCsvLines(interviews, config);

  const separatorLines: string[] = [
    '',
    buildCsvRow([
      '=== SEÇÃO 2: REGISTROS DE COLABORADORES CADASTRADOS (UID WEB & CAMPOS ADICIONAIS) ===',
    ]),
  ];

  const collaboratorLines = buildCollaboratorsCsvLines(collaborators, config);

  const allLines = [
    ...metadataLines,
    ...interviewLines,
    ...separatorLines,
    ...collaboratorLines,
  ];

  const csvString = allLines.join('\r\n');
  const filename = `backup_dados_diagorg_entrevistas_colaboradores_${timestampSlug}.csv`;
  const sizeBytes = triggerCsvDownload(filename, csvString);

  return {
    filename,
    timestampSlug,
    formattedTimestamp,
    interviewsCount: interviews.length,
    collaboratorsCount: collaborators.length,
    sizeBytes,
    scope: 'full',
  };
}

export function exportInterviewsOnlyBackupCSV(params: {
  interviews: InterviewRecord[];
  config: DeveloperSystemConfig;
}): BackupExportResult {
  const { interviews, config } = params;
  const { timestampSlug, formattedTimestamp, isoTimestamp } =
    generateBackupTimestamps();

  const headerMeta = [
    buildCsvRow(['BACKUP DE ENTREVISTAS — DIAGORG', formattedTimestamp, isoTimestamp]),
    '',
  ];
  const lines = [
    ...headerMeta,
    ...buildInterviewsCsvLines(interviews, config),
  ];
  const csvString = lines.join('\r\n');
  const filename = `backup_entrevistas_diagorg_${timestampSlug}.csv`;
  const sizeBytes = triggerCsvDownload(filename, csvString);

  return {
    filename,
    timestampSlug,
    formattedTimestamp,
    interviewsCount: interviews.length,
    collaboratorsCount: 0,
    sizeBytes,
    scope: 'interviews',
  };
}

export function exportCollaboratorsOnlyBackupCSV(params: {
  collaborators: CollaboratorRecord[];
  config: DeveloperSystemConfig;
}): BackupExportResult {
  const { collaborators, config } = params;
  const { timestampSlug, formattedTimestamp, isoTimestamp } =
    generateBackupTimestamps();

  const headerMeta = [
    buildCsvRow([
      'BACKUP DE COLABORADORES CADASTRADOS — DIAGORG',
      formattedTimestamp,
      isoTimestamp,
    ]),
    '',
  ];
  const lines = [
    ...headerMeta,
    ...buildCollaboratorsCsvLines(collaborators, config),
  ];
  const csvString = lines.join('\r\n');
  const filename = `backup_colaboradores_diagorg_${timestampSlug}.csv`;
  const sizeBytes = triggerCsvDownload(filename, csvString);

  return {
    filename,
    timestampSlug,
    formattedTimestamp,
    interviewsCount: 0,
    collaboratorsCount: collaborators.length,
    sizeBytes,
    scope: 'collaborators',
  };
}

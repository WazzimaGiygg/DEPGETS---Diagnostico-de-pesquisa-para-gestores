import React, { useState } from 'react';
import {
  Archive,
  BellRing,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileSpreadsheet,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Trash2,
} from 'lucide-react';
import { DEFAULT_SYSTEM_CONFIG } from '../constants/defaultData';
import { firebaseConfig } from '../firebase';
import {
  BackupExportResult,
  exportCollaboratorsOnlyBackupCSV,
  exportFullDatabaseBackupCSV,
  exportInterviewsOnlyBackupCSV,
} from '../services/csvBackupService';
import { pushService, PushLogItem } from '../services/pushNotificationService';
import {
  AdminMemberRecord,
  CollaboratorRecord,
  CompanyRecord,
  CustomFieldDefinition,
  CustomInterviewQuestion,
  DeveloperSystemConfig,
  InterviewRecord,
  SectorRecord,
  ThemePreference,
} from '../types';

interface DeveloperSettingsViewProps {
  config: DeveloperSystemConfig;
  interviews: InterviewRecord[];
  collaborators: CollaboratorRecord[];
  companies?: CompanyRecord[];
  sectors?: SectorRecord[];
  admins?: AdminMemberRecord[];
  themePreference: ThemePreference;
  onChangeThemePreference: (pref: ThemePreference) => void;
  onSaveConfig: (newConfig: DeveloperSystemConfig) => Promise<void>;
  pushLogs: PushLogItem[];
}

export const DeveloperSettingsView: React.FC<DeveloperSettingsViewProps> = ({
  config,
  interviews,
  collaborators,
  companies = [],
  sectors = [],
  admins = [],
  themePreference,
  onChangeThemePreference,
  onSaveConfig,
  pushLogs,
}) => {
  const [formTitle, setFormTitle] = useState(config.formTitle);
  const [formSubtitle, setFormSubtitle] = useState(config.formSubtitle);
  const [chromeNotice, setChromeNotice] = useState(config.chromePriorityNotice);
  const [pushEnabled, setPushEnabled] = useState(
    config.pushNotificationsEnabled
  );
  const [questions, setQuestions] = useState<CustomInterviewQuestion[]>(
    config.customQuestions
  );
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(
    config.collaboratorCustomFields
  );

  // New Question Builder
  const [newQSection, setNewQSection] = useState<1 | 2 | 3 | 4>(1);
  const [newQLabel, setNewQLabel] = useState('');
  const [newQPlaceholder, setNewQPlaceholder] = useState('');

  // New Collaborator Custom Field Builder
  const [newCFLabel, setNewCFLabel] = useState('');
  const [newCFType, setNewCFType] = useState<
    'text' | 'number' | 'date' | 'select'
  >('text');

  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [lastBackupResult, setLastBackupResult] =
    useState<BackupExportResult | null>(null);
  const [pushPerm, setPushPerm] = useState(pushService.getPermissionState());

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: DeveloperSystemConfig = {
      ...config,
      formTitle: formTitle.trim() || DEFAULT_SYSTEM_CONFIG.formTitle,
      formSubtitle: formSubtitle.trim() || DEFAULT_SYSTEM_CONFIG.formSubtitle,
      chromePriorityNotice:
        chromeNotice.trim() || DEFAULT_SYSTEM_CONFIG.chromePriorityNotice,
      pushNotificationsEnabled: pushEnabled,
      customQuestions: questions,
      collaboratorCustomFields: customFields,
    };
    await onSaveConfig(updated);
    setSavedNotice(
      'Configurações administrativas e banco Firebase atualizadas com sucesso!'
    );
    setTimeout(() => setSavedNotice(null), 4000);
  };

  const handleFullDataBackup = () => {
    const result = exportFullDatabaseBackupCSV({
      interviews,
      collaborators,
      config: {
        ...config,
        customQuestions: questions,
        collaboratorCustomFields: customFields,
      },
      companies,
      sectors,
      admins,
    });
    setLastBackupResult(result);
    setSavedNotice(
      `Backup de Dados concluído com sucesso! Arquivo CSV gerado com timestamp: ${result.filename} (${result.interviewsCount} entrevistas e ${result.collaboratorsCount} colaboradores).`
    );
  };

  const handleInterviewsOnlyBackup = () => {
    const result = exportInterviewsOnlyBackupCSV({
      interviews,
      config: {
        ...config,
        customQuestions: questions,
      },
    });
    setLastBackupResult(result);
    setSavedNotice(
      `Exportação CSV de Entrevistas concluída com sucesso: ${result.filename}`
    );
  };

  const handleCollaboratorsOnlyBackup = () => {
    const result = exportCollaboratorsOnlyBackupCSV({
      collaborators,
      config: {
        ...config,
        collaboratorCustomFields: customFields,
      },
    });
    setLastBackupResult(result);
    setSavedNotice(
      `Exportação CSV de Colaboradores concluída com sucesso: ${result.filename}`
    );
  };

  const handleAddQuestion = () => {
    if (!newQLabel.trim()) return;
    const nextNum = questions.length + 1;
    const newQ: CustomInterviewQuestion = {
      id: `custom_q_${Date.now()}`,
      sectionNumber: newQSection,
      questionNumber: nextNum,
      label: newQLabel.trim(),
      placeholder:
        newQPlaceholder.trim() || 'Digite a resposta detalhada do gestor...',
      required: false,
      isCore: false,
    };
    setQuestions([...questions, newQ]);
    setNewQLabel('');
    setNewQPlaceholder('');
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleAddCustomField = () => {
    if (!newCFLabel.trim()) return;
    const key = newCFLabel
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_');

    const cf: CustomFieldDefinition = {
      id: `cf_${Date.now()}`,
      key,
      label: newCFLabel.trim(),
      type: newCFType,
      placeholder: `Informe ${newCFLabel.trim()}`,
      required: false,
    };
    setCustomFields([...customFields, cf]);
    setNewCFLabel('');
  };

  const handleRequestNativePush = async () => {
    const res = await pushService.requestPermission();
    setPushPerm(res);
    await pushService.sendNativePush(
      'DiagOrg — Notificações Push Ativadas',
      'Alertas nativos configurados para Web e Dispositivos Móveis.'
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Configurações Administrativas, Desenvolvedor & Banco Firebase
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gerencie perguntas dinâmicas, campos adicionais, backup offline em CSV com timestamp, notificações push e modo escuro automático
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleFullDataBackup}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Exportar todos os registros de entrevistas e colaboradores em formato CSV com timestamp para arquivamento offline"
          >
            <Download className="w-3.5 h-3.5" />
            Backup de Dados
          </button>

          <button
            type="button"
            onClick={() => {
              setFormTitle(DEFAULT_SYSTEM_CONFIG.formTitle);
              setFormSubtitle(DEFAULT_SYSTEM_CONFIG.formSubtitle);
              setChromeNotice(DEFAULT_SYSTEM_CONFIG.chromePriorityNotice);
              setQuestions(DEFAULT_SYSTEM_CONFIG.customQuestions);
              setCustomFields(DEFAULT_SYSTEM_CONFIG.collaboratorCustomFields);
            }}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrão
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Salvar Configurações no Firebase
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Offline Archiving & Timestamped CSV Data Backup Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Backup de Dados & Arquivamento Offline (CSV com Timestamp)
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Exporte instantaneamente todos os registros de{' '}
              <strong>entrevistas ({interviews.length})</strong> e{' '}
              <strong>colaboradores cadastrados ({collaborators.length})</strong> em
              formato CSV padronizado (UTF-8 com BOM para Excel/ Planilhas) contendo carimbo de data/hora (timestamp) no nome do arquivo e nos metadados de auditoria.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleFullDataBackup}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Backup de Dados (CSV Completo com Timestamp)
            </button>

            <button
              type="button"
              onClick={handleInterviewsOnlyBackup}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              CSV Apenas Entrevistas ({interviews.length})
            </button>

            <button
              type="button"
              onClick={handleCollaboratorsOnlyBackup}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              CSV Apenas Colaboradores ({collaborators.length})
            </button>
          </div>
        </div>

        {/* Summary Metrics & Last Backup Receipt */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Registros Prontos para Arquivamento
            </div>
            <div className="mt-1 text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {interviews.length} Entrevistas · {collaborators.length} Colaboradores
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              Inclui UID de página WEB, status 2FA e campos adicionais
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Padrão de Nomenclatura com Timestamp
            </div>
            <div className="mt-1 text-xs font-mono text-blue-600 dark:text-blue-400 truncate">
              backup_dados_diagorg_entrevistas_colaboradores_YYYY-MM-DD_HH-mm-ss.csv
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              Codificação UTF-8 BOM compatível com Microsoft Excel e Google Sheets
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              Último Backup Exportado na Sessão
            </div>
            {lastBackupResult ? (
              <div className="mt-1 space-y-0.5">
                <div className="text-xs font-semibold font-mono text-emerald-700 dark:text-emerald-400 truncate">
                  {lastBackupResult.filename}
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  {lastBackupResult.formattedTimestamp} ·{' '}
                  {(lastBackupResult.sizeBytes / 1024).toFixed(1)} KB
                </div>
              </div>
            ) : (
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Clique em <strong>"Backup de Dados"</strong> para gerar o arquivo CSV com timestamp agora.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Firebase Connection & OS Dark Mode & Push Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            Conexão Firebase Firestore Ativa
          </div>
          <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-mono">
            <div>
              <span className="text-slate-400">Project ID:</span>{' '}
              {firebaseConfig.projectId}
            </div>
            <div className="truncate">
              <span className="text-slate-400">Database ID:</span>{' '}
              {firebaseConfig.firestoreDatabaseId}
            </div>
            <div>
              <span className="text-slate-400">Coleções:</span> /interviews, /collaborators, /companies, /sectors, /admins, /settings
            </div>
          </div>
        </div>

        {/* OS Dark Mode Preference */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-600" />
            Modo Escuro Automático (Sistema Operacional)
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sincroniza automaticamente com{' '}
            <code className="font-mono">prefers-color-scheme: dark</code> do
            sistema operacional web/mobile.
          </p>
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {(['system', 'light', 'dark'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onChangeThemePreference(mode)}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  themePreference === mode
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {mode === 'system'
                  ? 'Automático (SO)'
                  : mode === 'light'
                  ? 'Claro'
                  : 'Escuro'}
              </button>
            ))}
          </div>
        </div>

        {/* Native Web & Mobile Push Notifications */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-blue-600" />
              Notificações Push Nativas (Web & Mobile)
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              Permissão: {pushPerm}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRequestNativePush}
              className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium cursor-pointer"
            >
              Ativar Permissão Push
            </button>
            <button
              type="button"
              onClick={() =>
                pushService.sendNativePush(
                  'Teste de Diagnóstico Organizacional',
                  'Notificação push nativa disparada com sucesso no ambiente Web/Mobile!'
                )
              }
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer"
            >
              Disparar Push de Teste
            </button>
          </div>
          {pushLogs.length > 0 && (
            <div className="text-[11px] text-slate-500 font-mono truncate">
              Último envio ({pushLogs[0].timestamp}): {pushLogs[0].title} [
              {pushLogs[0].channel}]
            </div>
          )}
        </div>
      </div>

      {/* Form Metadata & Chrome Notice Editor */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Cabeçalho do Formulário e Diretriz de Navegador Google Chrome
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Título Principal do Formulário
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Subtítulo do Formulário
            </label>
            <input
              type="text"
              value={formSubtitle}
              onChange={(e) => setFormSubtitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Aviso de Prioridade do Google Chrome Atualizado
            </label>
            <input
              type="text"
              value={chromeNotice}
              onChange={(e) => setChromeNotice(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
        </div>
      </div>

      {/* Dynamic Interview Questions Editor */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Editor Dinâmico de Perguntas da Entrevista ({questions.length}{' '}
          perguntas ativas)
        </h2>

        <div className="space-y-2.5">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex-1 space-y-1">
                <div className="text-[11px] font-mono text-slate-500">
                  Seção {q.sectionNumber} · Pergunta #{idx + 1}{' '}
                  {q.isCore
                    ? '(Base do Diagnóstico)'
                    : '(Adicionada pelo Desenvolvedor)'}
                </div>
                <input
                  type="text"
                  value={q.label}
                  onChange={(e) => {
                    const next = [...questions];
                    next[idx] = { ...q, label: e.target.value };
                    setQuestions(next);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>
              {!q.isCore && (
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(q.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add New Question to Interview */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">
              Bloco / Seção
            </label>
            <select
              value={newQSection}
              onChange={(e) =>
                setNewQSection(Number(e.target.value) as 1 | 2 | 3 | 4)
              }
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value={1}>1. Planejamento e Demanda</option>
              <option value={2}>2. Clima e Conflitos</option>
              <option value={3}>3. Mudanças e Indicadores</option>
              <option value={4}>4. Prevenção e Melhorias</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] text-slate-500 mb-1">
              Nova Pergunta de Diagnóstico
            </label>
            <input
              type="text"
              value={newQLabel}
              onChange={(e) => setNewQLabel(e.target.value)}
              placeholder="Ex: Como o setor avalia a ergonomia e pausas operacionais?"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>
          <button
            type="button"
            onClick={handleAddQuestion}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Pergunta
          </button>
        </div>
      </div>

      {/* Collaborator Custom Fields Manager */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Outros Campos Adicionais na Lista de Colaboradores (
          {customFields.length})
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {customFields.map((cf) => (
            <div
              key={cf.id}
              className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  {cf.label}
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  chave: {cf.key} · tipo: {cf.type}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCustomFields(
                    customFields.filter((item) => item.id !== cf.id)
                  )
                }
                className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3 pt-2">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] text-slate-500 mb-1">
              Nome do Novo Campo de Colaborador
            </label>
            <input
              type="text"
              value={newCFLabel}
              onChange={(e) => setNewCFLabel(e.target.value)}
              placeholder="Ex: Centro de Custo / Ramal / Certificação"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">
              Tipo
            </label>
            <select
              value={newCFType}
              onChange={(e) =>
                setNewCFType(
                  e.target.value as 'text' | 'number' | 'date' | 'select'
                )
              }
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="text">Texto</option>
              <option value="number">Número</option>
              <option value="date">Data</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleAddCustomField}
            className="px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Incluir Campo
          </button>
        </div>
      </div>
    </div>
  );
};

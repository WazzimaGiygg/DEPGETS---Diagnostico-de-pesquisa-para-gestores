import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  ExternalLink,
  FileText,
  Globe,
  PlusCircle,
  Printer,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import { generateSafeDocId } from '../services/validationUtils';
import {
  CollaboratorRecord,
  CompanyRecord,
  DeveloperSystemConfig,
  InterviewRecord,
  SectorRecord,
} from '../types';
import { InterviewAnalyticsView } from './InterviewAnalyticsView';

interface InterviewFormViewProps {
  config: DeveloperSystemConfig;
  collaborators: CollaboratorRecord[];
  companies: CompanyRecord[];
  sectors: SectorRecord[];
  interviews: InterviewRecord[];
  preselectedCollaborator: CollaboratorRecord | null;
  onSaveInterview: (record: InterviewRecord, isUpdate: boolean) => Promise<void>;
  onDeleteInterview: (id: string) => Promise<void>;
  onOpenCollaboratorWebPage: (collab: CollaboratorRecord) => void;
}

export const InterviewFormView: React.FC<InterviewFormViewProps> = ({
  config,
  collaborators,
  companies,
  sectors,
  interviews,
  preselectedCollaborator,
  onSaveInterview,
  onDeleteInterview,
  onOpenCollaboratorWebPage,
}) => {
  const [viewMode, setViewMode] = useState<
    'form' | 'document' | 'history' | 'analytics'
  >('form');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string>(
    preselectedCollaborator?.id || collaborators[0]?.id || ''
  );

  // Header fields matching the PDF
  const [managerName, setManagerName] = useState('');
  const [interviewDate, setInterviewDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [roleSector, setRoleSector] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [tenure, setTenure] = useState('');
  const [collaboratorWebUid, setCollaboratorWebUid] = useState('');

  // 7 Core Questions from PDF
  const [q1DemandsAndPressure, setQ1DemandsAndPressure] = useState('');
  const [q2TaskDistribution, setQ2TaskDistribution] = useState('');
  const [q3FrequentConflicts, setQ3FrequentConflicts] = useState('');
  const [q4ComplaintsHandling, setQ4ComplaintsHandling] = useState('');
  const [q5SignificantChanges, setQ5SignificantChanges] = useState('');
  const [q6AttentionIndicators, setQ6AttentionIndicators] = useState('');
  const [q7PreventiveMeasures, setQ7PreventiveMeasures] = useState('');
  const [extraAnswersMap, setExtraAnswersMap] = useState<Record<string, string>>({});

  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('ALL');

  // Populate header fields when selecting a registered collaborator
  const applyCollaboratorSelection = (collabId: string) => {
    setSelectedCollaboratorId(collabId);
    const found = collaborators.find((c) => c.id === collabId);
    if (found) {
      setManagerName(`${found.firstName} ${found.lastName}`);
      setRoleSector(`${found.role} / ${found.sectorName}`);
      setCompanyName(found.companyName);
      setTenure(found.tenure || '2 anos');
      setCollaboratorWebUid(found.webUid);
    }
  };

  useEffect(() => {
    if (preselectedCollaborator) {
      applyCollaboratorSelection(preselectedCollaborator.id);
      setViewMode('form');
    } else if (!managerName && collaborators.length > 0) {
      applyCollaboratorSelection(collaborators[0].id);
    }
  }, [preselectedCollaborator, collaborators]);

  const handleResetForm = () => {
    setEditingId(null);
    if (collaborators[0]) {
      applyCollaboratorSelection(collaborators[0].id);
    }
    setInterviewDate(new Date().toISOString().split('T')[0]);
    setQ1DemandsAndPressure('');
    setQ2TaskDistribution('');
    setQ3FrequentConflicts('');
    setQ4ComplaintsHandling('');
    setQ5SignificantChanges('');
    setQ6AttentionIndicators('');
    setQ7PreventiveMeasures('');
    setExtraAnswersMap({});
  };

  const handleLoadInterviewForEdit = (item: InterviewRecord) => {
    setEditingId(item.id);
    setSelectedCollaboratorId(item.collaboratorId);
    setCollaboratorWebUid(item.collaboratorWebUid);
    setManagerName(item.managerName);
    setRoleSector(item.roleSector);
    setCompanyName(item.companyName);
    setInterviewDate(item.interviewDate);
    setTenure(item.tenure);
    setQ1DemandsAndPressure(item.q1DemandsAndPressure);
    setQ2TaskDistribution(item.q2TaskDistribution);
    setQ3FrequentConflicts(item.q3FrequentConflicts);
    setQ4ComplaintsHandling(item.q4ComplaintsHandling);
    setQ5SignificantChanges(item.q5SignificantChanges);
    setQ6AttentionIndicators(item.q6AttentionIndicators);
    setQ7PreventiveMeasures(item.q7PreventiveMeasures);
    setExtraAnswersMap(item.extraAnswersMap || {});
    setViewMode('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isUpdate = Boolean(editingId);
    const id = editingId || generateSafeDocId('int');

    const record: InterviewRecord = {
      id,
      collaboratorId: selectedCollaboratorId || 'manual',
      collaboratorWebUid: collaboratorWebUid || 'WEB-COL-MANUAL',
      managerName: managerName.trim() || 'Gestor Não Identificado',
      roleSector: roleSector.trim() || 'Setor Geral',
      companyName: companyName.trim() || companies[0]?.name || 'Empresa Padrão',
      interviewDate: interviewDate || new Date().toISOString().split('T')[0],
      tenure: tenure.trim() || 'Não informado',
      q1DemandsAndPressure: q1DemandsAndPressure.trim(),
      q2TaskDistribution: q2TaskDistribution.trim(),
      q3FrequentConflicts: q3FrequentConflicts.trim(),
      q4ComplaintsHandling: q4ComplaintsHandling.trim(),
      q5SignificantChanges: q5SignificantChanges.trim(),
      q6AttentionIndicators: q6AttentionIndicators.trim(),
      q7PreventiveMeasures: q7PreventiveMeasures.trim(),
      extraAnswersMap,
      ownerId: 'current_user',
    };

    await onSaveInterview(record, isUpdate);
    setSaveFeedback(
      isUpdate
        ? `Entrevista ${record.id} atualizada com sucesso no Firebase!`
        : `Diagnóstico de ${record.managerName} (UID: ${record.collaboratorWebUid}) gravado no Firebase!`
    );
    setTimeout(() => setSaveFeedback(null), 5000);
    if (!isUpdate) {
      setEditingId(record.id);
    }
  };

  const getCoreAnswerValue = (key?: string): string => {
    switch (key) {
      case 'q1DemandsAndPressure':
        return q1DemandsAndPressure;
      case 'q2TaskDistribution':
        return q2TaskDistribution;
      case 'q3FrequentConflicts':
        return q3FrequentConflicts;
      case 'q4ComplaintsHandling':
        return q4ComplaintsHandling;
      case 'q5SignificantChanges':
        return q5SignificantChanges;
      case 'q6AttentionIndicators':
        return q6AttentionIndicators;
      case 'q7PreventiveMeasures':
        return q7PreventiveMeasures;
      default:
        return '';
    }
  };

  const setCoreAnswerValue = (key: string | undefined, val: string) => {
    switch (key) {
      case 'q1DemandsAndPressure':
        setQ1DemandsAndPressure(val);
        break;
      case 'q2TaskDistribution':
        setQ2TaskDistribution(val);
        break;
      case 'q3FrequentConflicts':
        setQ3FrequentConflicts(val);
        break;
      case 'q4ComplaintsHandling':
        setQ4ComplaintsHandling(val);
        break;
      case 'q5SignificantChanges':
        setQ5SignificantChanges(val);
        break;
      case 'q6AttentionIndicators':
        setQ6AttentionIndicators(val);
        break;
      case 'q7PreventiveMeasures':
        setQ7PreventiveMeasures(val);
        break;
    }
  };

  const filteredInterviews = interviews.filter((item) => {
    const matchesCompany =
      filterCompany === 'ALL' || item.companyName === filterCompany;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      item.managerName.toLowerCase().includes(q) ||
      item.roleSector.toLowerCase().includes(q) ||
      item.collaboratorWebUid.toLowerCase().includes(q) ||
      item.companyName.toLowerCase().includes(q);
    return matchesCompany && matchesSearch;
  });

  const activeCollaboratorObj = collaborators.find(
    (c) => c.id === selectedCollaboratorId
  );

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {config.formTitle}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {config.formSubtitle} · Gravação sincronizada com Firebase Firestore
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented View Controls */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('form')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'form'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Formulário Interativo
            </button>
            <button
              type="button"
              onClick={() => setViewMode('document')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'document'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Folha Oficial (Fiel ao PDF)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('history')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'history'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Respostas Gravadas ({interviews.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('analytics')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'analytics'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Estatísticas & Gráficos (Recharts)
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetForm}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Nova Entrevista
          </button>
        </div>
      </div>

      {saveFeedback && (
        <div className="no-print p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{saveFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setViewMode('history')}
            className="underline font-semibold ml-4 cursor-pointer"
          >
            Ver no banco de dados
          </button>
        </div>
      )}

      {/* VIEW 1: INTERACTIVE FORM */}
      {viewMode === 'form' && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 md:p-8 space-y-8"
        >
          {/* Formal Header Title like the PDF */}
          <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-6">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {config.formTitle}
            </h2>
            <p className="text-sm italic text-slate-600 dark:text-slate-400 mt-1">
              {config.formSubtitle}
            </p>
          </div>

          {/* Collaborator Quick Selector & UID Link */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Selecionar Colaborador / Gestor Cadastrado (Auto-preenche UID WEB, Empresa e Setor)
              </label>
              <select
                value={selectedCollaboratorId}
                onChange={(e) => applyCollaboratorSelection(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                {collaborators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} — {c.role} ({c.companyName}) [UID: {c.webUid}]
                  </option>
                ))}
              </select>
            </div>

            {activeCollaboratorObj && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenCollaboratorWebPage(activeCollaboratorObj)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Abrir Página WEB ({activeCollaboratorObj.webUid})
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* PDF Header Metadata Grid: Gestor(a), Data, Cargo/Setor, Tempo, Empresa, UID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Gestor(a): *
              </label>
              <input
                type="text"
                required
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="Nome completo do gestor(a)"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Data Cadastrada: *
              </label>
              <input
                type="date"
                required
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tempo (no Cargo / Setor): *
              </label>
              <input
                type="text"
                required
                value={tenure}
                onChange={(e) => setTenure(e.target.value)}
                placeholder="Ex: 4 anos e 6 meses"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cargo / Setor: *
              </label>
              <input
                type="text"
                required
                value={roleSector}
                onChange={(e) => setRoleSector(e.target.value)}
                list="sectors-datalist"
                placeholder="Cargo e Setor avaliado"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
              <datalist id="sectors-datalist">
                {sectors.map((s) => (
                  <option key={s.id} value={`${s.managerName} / ${s.name}`} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Empresa Cadastrada: *
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                list="companies-datalist"
                placeholder="Razão Social ou Nome Fantasia"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
              <datalist id="companies-datalist">
                {companies.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                UID de Página WEB do Colaborador:
              </label>
              <input
                type="text"
                readOnly
                value={collaboratorWebUid}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-mono tabular-nums"
              />
            </div>
          </div>

          {/* 4 Diagnostic Sections matching the PDF */}
          {([1, 2, 3, 4] as const).map((secNum) => {
            const sectionQuestions = config.customQuestions.filter(
              (q) => q.sectionNumber === secNum
            );
            return (
              <div key={secNum} className="space-y-4">
                {/* Gray section bar with dark left border like the PDF */}
                <div className="border-l-4 border-slate-900 dark:border-blue-500 bg-slate-100 dark:bg-slate-800/70 px-4 py-2">
                  <h3 className="text-xs md:text-sm font-bold tracking-wide text-slate-900 dark:text-white">
                    {config.sectionTitles[secNum]}
                  </h3>
                </div>

                <div className="space-y-5 pl-1">
                  {sectionQuestions.map((q) => {
                    const value = q.isCore
                      ? getCoreAnswerValue(q.coreKey)
                      : extraAnswersMap[q.id] || '';

                    return (
                      <div key={q.id} className="space-y-2">
                        <label className="block text-xs md:text-sm font-bold text-slate-900 dark:text-slate-100">
                          {q.questionNumber}. {q.label}{' '}
                          {q.required && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                          rows={3}
                          required={q.required}
                          value={value}
                          onChange={(e) => {
                            if (q.isCore) {
                              setCoreAnswerValue(q.coreKey, e.target.value);
                            } else {
                              setExtraAnswersMap({
                                ...extraAnswersMap,
                                [q.id]: e.target.value,
                              });
                            }
                          }}
                          placeholder={q.placeholder}
                          className="w-full px-3.5 py-2.5 text-xs md:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 leading-relaxed"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {editingId ? (
                <span>
                  Editando registro existente: <code className="font-mono">{editingId}</code>
                </span>
              ) : (
                <span>Pronto para gravar novo diagnóstico no banco de dados Firebase.</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('document')}
                className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Visualizar Folha Oficial
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {editingId
                  ? 'Atualizar Respostas no Firebase'
                  : 'Gravar Respostas no Firebase'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* VIEW 2: PRINTABLE DOCUMENT REPLICA (FIEL AO PDF ENVIADO) */}
      {viewMode === 'document' && (
        <div className="space-y-4">
          <div className="no-print flex items-center justify-between bg-slate-100 dark:bg-slate-900 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-600 dark:text-slate-300">
              Visualização fiel ao documento físico de <strong>Entrevista com Gestores</strong>.
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / Exportar PDF
            </button>
          </div>

          <div className="bg-white text-slate-950 border border-slate-300 rounded-lg p-8 md:p-12 max-w-[850px] mx-auto shadow-xs space-y-6 font-serif">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold tracking-wide uppercase">
                {config.formTitle}
              </h2>
              <p className="text-sm italic text-slate-700">
                {config.formSubtitle}
              </p>
            </div>

            {/* Header Lines */}
            <div className="space-y-3 pt-2 text-sm font-sans">
              <div className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-8 flex items-end gap-2">
                  <span className="font-medium shrink-0">Gestor(a):</span>
                  <div className="flex-1 border-b border-slate-800 px-2 pb-0.5 font-semibold">
                    {managerName || '____________________________________'}
                  </div>
                </div>
                <div className="col-span-4 flex items-end gap-2">
                  <span className="font-medium shrink-0">Data:</span>
                  <div className="flex-1 border-b border-slate-800 px-2 pb-0.5 font-mono text-center">
                    {interviewDate
                      ? interviewDate.split('-').reverse().join(' / ')
                      : '___ / ___ / ______'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-8 flex items-end gap-2">
                  <span className="font-medium shrink-0">Cargo/Setor:</span>
                  <div className="flex-1 border-b border-slate-800 px-2 pb-0.5">
                    {roleSector || '____________________________________'}
                  </div>
                </div>
                <div className="col-span-4 flex items-end gap-2">
                  <span className="font-medium shrink-0">Tempo:</span>
                  <div className="flex-1 border-b border-slate-800 px-2 pb-0.5">
                    {tenure || '____________________'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4 items-end text-xs text-slate-600 pt-1">
                <div className="col-span-8">
                  <strong>Empresa:</strong> {companyName}
                </div>
                <div className="col-span-4 font-mono">
                  <strong>UID WEB:</strong> {collaboratorWebUid}
                </div>
              </div>
            </div>

            {/* Sections & Questions */}
            <div className="space-y-6 font-sans pt-2">
              {([1, 2, 3, 4] as const).map((secNum) => {
                const sectionQuestions = config.customQuestions.filter(
                  (q) => q.sectionNumber === secNum
                );
                return (
                  <div key={secNum} className="space-y-4">
                    <div className="border-l-4 border-slate-900 bg-slate-100 px-3 py-1.5 font-serif font-bold text-sm uppercase">
                      {config.sectionTitles[secNum]}
                    </div>
                    {sectionQuestions.map((q) => {
                      const ans = q.isCore
                        ? getCoreAnswerValue(q.coreKey)
                        : extraAnswersMap[q.id] || '';
                      return (
                        <div key={q.id} className="space-y-2">
                          <div className="text-sm font-bold text-slate-900">
                            {q.questionNumber}. {q.label}
                          </div>
                          <div className="min-h-[64px] p-2 border-b border-slate-300 text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                            {ans || (
                              <span className="text-slate-400 italic">
                                (Espaço reservado para resposta da entrevista)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: SAVED INTERVIEWS DATABASE TABLE */}
      {viewMode === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por gestor, setor, empresa ou UID WEB..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="ALL">Todas as Empresas ({interviews.length})</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredInterviews.map((item) => {
              const linkedCollab = collaborators.find(
                (c) =>
                  c.webUid === item.collaboratorWebUid ||
                  c.id === item.collaboratorId
              );

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {item.managerName}
                        </h3>
                        <span aria-hidden="true" className="text-slate-400">·</span>
                        <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                          {item.collaboratorWebUid}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.roleSector} · {item.companyName} · Tempo: {item.tenure}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        Data: {item.interviewDate}
                      </span>
                      {linkedCollab && (
                        <button
                          type="button"
                          onClick={() => onOpenCollaboratorWebPage(linkedCollab)}
                          className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Globe className="w-3.5 h-3.5 text-blue-600" />
                          Página UID
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleLoadInterviewForEdit(item)}
                        className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Editar / Ver Folha
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteInterview(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-md cursor-pointer"
                        aria-label="Excluir entrevista"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
                    <div>
                      <strong className="text-slate-900 dark:text-slate-100">
                        1. Demandas e Pressão:
                      </strong>{' '}
                      {item.q1DemandsAndPressure}
                    </div>
                    <div>
                      <strong className="text-slate-900 dark:text-slate-100">
                        3. Conflitos e Tratativas:
                      </strong>{' '}
                      {item.q3FrequentConflicts}
                    </div>
                    <div>
                      <strong className="text-slate-900 dark:text-slate-100">
                        6. Indicadores Críticos:
                      </strong>{' '}
                      {item.q6AttentionIndicators}
                    </div>
                    <div>
                      <strong className="text-slate-900 dark:text-slate-100">
                        7. Prevenção e Melhorias:
                      </strong>{' '}
                      {item.q7PreventiveMeasures}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 4 / EMBEDDED RECHARTS ANALYTICS DASHBOARD */}
      <div className="no-print">
        <InterviewAnalyticsView
          interviews={interviews}
          sectors={sectors}
          companies={companies}
          collaborators={collaborators}
          compact={viewMode !== 'analytics' && viewMode !== 'history'}
        />
      </div>
    </div>
  );
};

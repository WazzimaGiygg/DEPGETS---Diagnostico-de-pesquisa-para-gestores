import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Lock,
  RotateCcw,
  Send,
  UserCheck,
} from 'lucide-react';
import { generateSafeDocId, normalizeEmail } from '../services/validationUtils';
import {
  AuthenticatedSession,
  CollaboratorRecord,
  CompanyRecord,
  CustomInterviewQuestion,
  DeveloperSystemConfig,
  InterviewRecord,
  SectorRecord,
} from '../types';

interface NonAdminSurveyPageProps {
  config: DeveloperSystemConfig;
  collaborators: CollaboratorRecord[];
  companies: CompanyRecord[];
  sectors: SectorRecord[];
  session: AuthenticatedSession | null;
  preselectedCollaborator: CollaboratorRecord | null;
  onSaveInterview: (record: InterviewRecord, isUpdate: boolean) => Promise<void>;
}

export const NonAdminSurveyPage: React.FC<NonAdminSurveyPageProps> = ({
  config,
  collaborators,
  companies,
  sectors,
  session,
  preselectedCollaborator,
  onSaveInterview,
}) => {
  const questions: CustomInterviewQuestion[] = config.customQuestions;
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answersByQuestionId, setAnswersByQuestionId] = useState<
    Record<string, string>
  >({});
  const [savedIndividualIds, setSavedIndividualIds] = useState<
    Record<string, boolean>
  >({});

  // Respondent identification (auto-bound to active login if present)
  const [respondentName, setRespondentName] = useState('');
  const [roleSector, setRoleSector] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [tenure, setTenure] = useState('');
  const [collaboratorWebUid, setCollaboratorWebUid] = useState('');
  const [collaboratorId, setCollaboratorId] = useState('');
  const [interviewDate, setInterviewDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [individualFeedback, setIndividualFeedback] = useState<string | null>(
    null
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedRecordId, setSubmittedRecordId] = useState<string | null>(
    null
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync respondent metadata from active session or preselected collaborator
  useEffect(() => {
    const matchedFromSession = session
      ? collaborators.find(
          (c) =>
            c.id === session.uid ||
            c.webUid === session.webUid ||
            normalizeEmail(c.email) === normalizeEmail(session.email)
        )
      : null;

    const target =
      preselectedCollaborator || matchedFromSession || collaborators[0];

    if (target) {
      setCollaboratorId(target.id);
      setCollaboratorWebUid(target.webUid);
      setRespondentName(`${target.firstName} ${target.lastName}`);
      setRoleSector(`${target.role} / ${target.sectorName}`);
      setCompanyName(target.companyName);
      setTenure(target.tenure || '2 anos');
    } else if (session) {
      setCollaboratorId(session.uid);
      setCollaboratorWebUid(session.webUid || 'WEB-COL-SESSAO');
      setRespondentName(session.displayName);
      setRoleSector('Colaborador / Setor Geral');
      setCompanyName(companies[0]?.name || 'Empresa Principal');
      setTenure('1 ano');
    }
  }, [session, preselectedCollaborator, collaborators, companies]);

  const currentQuestion = questions[currentIndex] || questions[0];
  const currentAnswer = currentQuestion
    ? answersByQuestionId[currentQuestion.id] || ''
    : '';

  const answeredCount = questions.filter(
    (q) => (answersByQuestionId[q.id] || '').trim().length > 0
  ).length;

  const progressPercent =
    questions.length > 0
      ? Math.round((answeredCount / questions.length) * 100)
      : 0;

  const handleAnswerChange = (val: string) => {
    if (!currentQuestion) return;
    setValidationError(null);
    setAnswersByQuestionId((prev) => ({
      ...prev,
      [currentQuestion.id]: val,
    }));
  };

  const handleSaveCurrentQuestionSeparately = () => {
    if (!currentQuestion) return;
    const trimmed = (answersByQuestionId[currentQuestion.id] || '').trim();
    if (currentQuestion.required && !trimmed) {
      setValidationError(
        `Esta pergunta (#${currentQuestion.questionNumber}) é obrigatória. Digite sua resposta antes de confirmar.`
      );
      return;
    }

    setValidationError(null);
    setSavedIndividualIds((prev) => ({
      ...prev,
      [currentQuestion.id]: true,
    }));
    setIndividualFeedback(
      `Resposta da Pergunta ${currentQuestion.questionNumber} registrada separadamente com sucesso.`
    );
    setTimeout(() => setIndividualFeedback(null), 3000);
  };

  const handleNextQuestion = () => {
    if (!currentQuestion) return;
    const trimmed = (answersByQuestionId[currentQuestion.id] || '').trim();
    if (currentQuestion.required && !trimmed) {
      setValidationError(
        `Responda a Pergunta ${currentQuestion.questionNumber} antes de avançar para a próxima etapa.`
      );
      return;
    }

    setValidationError(null);
    setSavedIndividualIds((prev) => ({
      ...prev,
      [currentQuestion.id]: true,
    }));

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    setValidationError(null);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleFinalSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Verify all required questions have been answered
    const missingQuestion = questions.find(
      (q) => q.required && !(answersByQuestionId[q.id] || '').trim()
    );
    if (missingQuestion) {
      const missingIdx = questions.findIndex(
        (q) => q.id === missingQuestion.id
      );
      if (missingIdx >= 0) {
        setCurrentIndex(missingIdx);
      }
      setValidationError(
        `A Pergunta ${missingQuestion.questionNumber} ("${missingQuestion.label}") ainda não foi respondida.`
      );
      return;
    }

    // Build core & extra answers from individual question map
    let q1 = '';
    let q2 = '';
    let q3 = '';
    let q4 = '';
    let q5 = '';
    let q6 = '';
    let q7 = '';
    const extraMap: Record<string, string> = {};

    questions.forEach((q) => {
      const val = (answersByQuestionId[q.id] || '').trim();
      if (q.isCore && q.coreKey) {
        switch (q.coreKey) {
          case 'q1DemandsAndPressure':
            q1 = val;
            break;
          case 'q2TaskDistribution':
            q2 = val;
            break;
          case 'q3FrequentConflicts':
            q3 = val;
            break;
          case 'q4ComplaintsHandling':
            q4 = val;
            break;
          case 'q5SignificantChanges':
            q5 = val;
            break;
          case 'q6AttentionIndicators':
            q6 = val;
            break;
          case 'q7PreventiveMeasures':
            q7 = val;
            break;
        }
      } else {
        extraMap[q.id] = val;
      }
    });

    const newId = generateSafeDocId('pesq');
    const record: InterviewRecord = {
      id: newId,
      collaboratorId: collaboratorId || session?.uid || 'colab_individual',
      collaboratorWebUid:
        collaboratorWebUid || session?.webUid || 'WEB-COL-INDIVIDUAL',
      managerName: respondentName.trim() || 'Colaborador Respondente',
      roleSector: roleSector.trim() || sectors[0]?.name || 'Setor Geral',
      companyName:
        companyName.trim() || companies[0]?.name || 'Empresa Principal',
      interviewDate: interviewDate || new Date().toISOString().split('T')[0],
      tenure: tenure.trim() || '1 ano',
      q1DemandsAndPressure: q1,
      q2TaskDistribution: q2,
      q3FrequentConflicts: q3,
      q4ComplaintsHandling: q4,
      q5SignificantChanges: q5,
      q6AttentionIndicators: q6,
      q7PreventiveMeasures: q7,
      extraAnswersMap: extraMap,
      ownerId: session?.uid || 'current_user',
    };

    await onSaveInterview(record, false);
    setSubmittedRecordId(newId);
    setIsSubmitted(true);
  };

  const handleStartNewSurvey = () => {
    setAnswersByQuestionId({});
    setSavedIndividualIds({});
    setCurrentIndex(0);
    setIsSubmitted(false);
    setSubmittedRecordId(null);
    setValidationError(null);
  };

  if (isSubmitted) {
    return (
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
              PESQUISA INDIVIDUAL CONCLUÍDA · PROTOCOLO {submittedRecordId}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Suas respostas individuais foram gravadas com sucesso!
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Todas as {questions.length} perguntas foram respondidas separadamente por{' '}
              <strong>{respondentName}</strong> (UID WEB:{' '}
              <code className="font-mono">{collaboratorWebUid}</code>) e sincronizadas com segurança no banco de dados Firebase Firestore.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Comprovante das Perguntas Respondidas Separadamente:
          </div>
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {questions.map((q) => (
              <div
                key={q.id}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
              >
                <div className="font-semibold text-slate-900 dark:text-white">
                  Pergunta {q.questionNumber}. {q.label}
                </div>
                <div className="text-slate-600 dark:text-slate-300 whitespace-pre-line">
                  {answersByQuestionId[q.id]}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleStartNewSurvey}
            className="px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-semibold inline-flex items-center gap-2 hover:opacity-90 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Responder Nova Pesquisa Individual
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Dedicated Non-Admin Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Página Exclusiva de Pesquisa para Usuários Não-Administradores
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
              {config.formTitle} — Resposta Individual Passo a Passo
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Neste ambiente isolado você responde apenas às perguntas da pesquisa separadamente, uma de cada vez.
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
              Progresso: {answeredCount} / {questions.length} ({progressPercent}%)
            </div>
            <div className="w-36 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5 ml-auto">
              <div
                className="h-full bg-blue-600 transition-all duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Active Respondent Identification Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
              Participante Identificado:
            </span>
            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <input
                type="text"
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none w-full font-semibold"
              />
            </div>
          </div>

          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
              Cargo / Setor & Empresa:
            </span>
            <div className="font-medium text-slate-800 dark:text-slate-200 truncate mt-0.5">
              {roleSector} · {companyName}
            </div>
          </div>

          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
              UID WEB & Data:
            </span>
            <div className="font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-0.5">
              {collaboratorWebUid} · {interviewDate}
            </div>
          </div>
        </div>

        {/* Question-by-Question Selector Strip */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Navegação por Pergunta Individual (Clique para responder separadamente):
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const hasAnswer = (answersByQuestionId[q.id] || '').trim().length > 0;
              const isSaved = Boolean(savedIndividualIds[q.id]);

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    setValidationError(null);
                    setCurrentIndex(idx);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono tabular-nums font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-xs'
                      : hasAnswer
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>Pergunta {q.questionNumber}</span>
                  {(hasAnswer || isSaved) && (
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Single Isolated Question Card */}
      {currentQuestion && (
        <form
          onSubmit={handleFinalSubmitAll}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 md:p-8 space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold tracking-wide text-blue-600 dark:text-blue-400">
              {config.sectionTitles[currentQuestion.sectionNumber]}
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              Pergunta {currentIndex + 1} de {questions.length} ·{' '}
              {currentAnswer.trim().length > 0
                ? 'Resposta Preenchida'
                : 'Aguardando Resposta'}
            </span>
          </div>

          {validationError && (
            <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
              {validationError}
            </div>
          )}

          {individualFeedback && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{individualFeedback}</span>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-base md:text-lg font-bold text-slate-900 dark:text-white leading-snug">
              {currentQuestion.questionNumber}. {currentQuestion.label}{' '}
              {currentQuestion.required && (
                <span className="text-red-500">*</span>
              )}
            </label>

            <textarea
              rows={6}
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder={currentQuestion.placeholder}
              className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 leading-relaxed"
            />

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              <span>
                {currentQuestion.required
                  ? 'Campo de resposta obrigatória'
                  : 'Campo opcional'}
              </span>
              <span>{currentAnswer.length} caracteres digitados</span>
            </div>
          </div>

          {/* Step-by-Step Controls for Separate Question Answering */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handlePrevQuestion}
              disabled={currentIndex === 0}
              className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Pergunta Anterior
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleSaveCurrentQuestionSeparately}
                className="px-4 py-2.5 rounded-lg border border-blue-300 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4" />
                Salvar Resposta Desta Pergunta
              </button>

              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="px-5 py-2.5 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-semibold hover:opacity-90 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  Próxima Pergunta
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Concluir e Gravar Pesquisa no Firebase
                </button>
              )}
            </div>
          </div>

          {answeredCount === questions.length &&
            currentIndex < questions.length - 1 && (
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Todas as {questions.length} perguntas respondidas — Enviar Pesquisa Agora
                </button>
              </div>
            )}
        </form>
      )}
    </div>
  );
};

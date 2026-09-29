import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Mail,
  Phone,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import {
  CollaboratorRecord,
  CustomFieldDefinition,
  InterviewRecord,
} from '../types';

interface CollaboratorWebPageModalProps {
  collaborator: CollaboratorRecord | null;
  interviews: InterviewRecord[];
  customFields: CustomFieldDefinition[];
  onClose: () => void;
  onStartInterviewForCollaborator: (collab: CollaboratorRecord) => void;
}

export const CollaboratorWebPageModal: React.FC<CollaboratorWebPageModalProps> = ({
  collaborator,
  interviews,
  customFields,
  onClose,
  onStartInterviewForCollaborator,
}) => {
  const [copiedUid, setCopiedUid] = useState(false);

  if (!collaborator) return null;

  const collabInterviews = interviews.filter(
    (i) =>
      i.collaboratorWebUid === collaborator.webUid ||
      i.collaboratorId === collaborator.id
  );

  const webPageUrl = `${window.location.origin}${window.location.pathname}?webUid=${collaborator.webUid}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(webPageUrl);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-3xl w-full overflow-hidden shadow-xl my-8">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Página WEB Exclusiva do Colaborador
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                UID: {collaborator.webUid} · Cadastro em {collaborator.registeredDate}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fechar página web do colaborador"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Direct Web UID URL bar */}
          <div className="p-3.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Endereço Direto da Página WEB (UID Individual)
              </div>
              <div className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate">
                {webPageUrl}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {copiedUid ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Link Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar URL do UID
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  onStartInterviewForCollaborator(collaborator);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                Aplicar Entrevista
              </button>
            </div>
          </div>

          {/* Core Identity Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="space-y-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">Nome Completo</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white">
                {collaborator.firstName} {collaborator.lastName}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <span>{collaborator.role}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{collaborator.age} anos</span>
                <span aria-hidden="true">·</span>
                <span>
                  Conta {collaborator.accountType === 'google' ? 'Google Workspace' : 'Corporativa Personalizada'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  <strong>Empresa:</strong> {collaborator.companyName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  <strong>Setor:</strong> {collaborator.sectorName} (Tempo: {collaborator.tenure || 'Não informado'})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-mono">{collaborator.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-mono tabular-nums">{collaborator.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Aceite LGPD, Marco Civil e Privacidade verificado</span>
              </div>
            </div>
          </div>

          {/* Additional Custom Fields */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
              Campos Adicionais do Colaborador
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {customFields.map((field) => {
                const val = collaborator.customFieldsMap?.[field.key] || '—';
                return (
                  <div
                    key={field.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40"
                  >
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {field.label}
                    </div>
                    <div className="text-xs font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                      {val}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Linked Interviews History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Diagnósticos Organizacionais Vinculados a este UID ({collabInterviews.length})
              </h4>
            </div>

            {collabInterviews.length === 0 ? (
              <div className="p-6 text-center rounded-lg border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-500">
                Nenhuma entrevista registrada para o UID {collaborator.webUid} até o momento.
              </div>
            ) : (
              <div className="space-y-3">
                {collabInterviews.map((intItem) => (
                  <div
                    key={intItem.id}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {intItem.roleSector}
                      </span>
                      <span className="font-mono tabular-nums text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {intItem.interviewDate}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      <strong>1. Demandas e Pressão:</strong> {intItem.q1DemandsAndPressure}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      <strong>7. Prevenção e Melhorias:</strong> {intItem.q7PreventiveMeasures}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

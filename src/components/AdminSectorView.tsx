import React, { useState } from 'react';
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  KeyRound,
  Lock,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  BackupExportResult,
  exportFullDatabaseBackupCSV,
} from '../services/csvBackupService';
import { generateSafeDocId, normalizeEmail } from '../services/validationUtils';
import {
  AdminMemberRecord,
  CollaboratorRecord,
  CompanyRecord,
  DeveloperSystemConfig,
  InterviewRecord,
  SectorRecord,
} from '../types';

interface AdminSectorViewProps {
  admins: AdminMemberRecord[];
  collaborators: CollaboratorRecord[];
  interviews?: InterviewRecord[];
  config?: DeveloperSystemConfig;
  companies?: CompanyRecord[];
  sectors?: SectorRecord[];
  currentUserUid?: string;
  currentUserEmail?: string;
  onAddAdmin: (record: AdminMemberRecord) => Promise<void>;
  onDeleteAdmin: (id: string) => Promise<void>;
  onToggleCollaborator2FA?: (collaboratorId: string, enabled: boolean) => Promise<void>;
}

export const AdminSectorView: React.FC<AdminSectorViewProps> = ({
  admins,
  collaborators,
  interviews = [],
  config,
  companies = [],
  sectors = [],
  currentUserUid,
  currentUserEmail,
  onAddAdmin,
  onDeleteAdmin,
  onToggleCollaborator2FA,
}) => {
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string>('');
  const [sectorRole, setSectorRole] = useState(
    'Gestor de Administração & Diagnóstico'
  );
  const [registeredDate, setRegisteredDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Filter & search for the Registered Users Listing
  const [userFilter, setUserFilter] = useState<'all' | 'eligible' | 'blocked'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [roleByCollabId, setRoleByCollabId] = useState<Record<string, string>>(
    {}
  );

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [lastBackup, setLastBackup] = useState<BackupExportResult | null>(null);

  const handleTriggerAdminBackup = () => {
    if (!config) return;
    const result = exportFullDatabaseBackupCSV({
      interviews,
      collaborators,
      config,
      companies,
      sectors,
      admins,
    });
    setLastBackup(result);
    setSuccessMsg(
      `Backup de Dados administrativo concluído! Arquivo CSV gerado com timestamp: ${result.filename} (${result.interviewsCount} entrevistas e ${result.collaboratorsCount} colaboradores exportados para arquivamento offline).`
    );
  };

  // Check if a collaborator is already in the admins list
  const isCollaboratorAlreadyAdmin = (collab: CollaboratorRecord): boolean => {
    const cleanEmail = normalizeEmail(collab.email);
    const gUid = collab.googleUid || collab.id;
    return admins.some(
      (a) =>
        a.collaboratorId === collab.id ||
        (a.googleUid && a.googleUid === gUid) ||
        (a.corporateEmail && normalizeEmail(a.corporateEmail) === cleanEmail)
    );
  };

  // Promote a registered user directly from the Registered Users Listing
  const handlePromoteFromUserList = async (collab: CollaboratorRecord) => {
    setErrorMsg('');
    setSuccessMsg('');

    // Mandatory Rule 1: Must be Google Login
    if (collab.accountType !== 'google') {
      setErrorMsg(
        `Bloqueado (${collab.firstName} ${collab.lastName}): Para ser adicionado como administrador através da listagem de usuários cadastrados, a conta deve obrigatoriamente ser de Login Google.`
      );
      return;
    }

    // Mandatory Rule 2: Must have 2-Step Verification (2FA) Active
    if (!collab.twoFactorEnabled) {
      setErrorMsg(
        `Bloqueado (${collab.firstName} ${collab.lastName}): O usuário possui Login Google, mas a Autenticação de Duas Etapas (2FA) não está ativa. Ative a verificação em duas etapas para permitir o credenciamento administrativo.`
      );
      return;
    }

    if (isCollaboratorAlreadyAdmin(collab)) {
      setErrorMsg(
        `${collab.firstName} ${collab.lastName} já faz parte do Setor de Administração.`
      );
      return;
    }

    const assignedRole =
      (roleByCollabId[collab.id] || '').trim() ||
      `Admin · ${collab.sectorName}`;
    const googleUidValue =
      collab.googleUid || `google-uid-${collab.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

    const record: AdminMemberRecord = {
      id: generateSafeDocId('adm'),
      identifierType: 'google_uid',
      googleUid: googleUidValue,
      corporateEmail: normalizeEmail(collab.email),
      displayName: `${collab.firstName} ${collab.lastName}`,
      sectorRole: assignedRole,
      registeredDate,
      twoFactorVerified: true,
      collaboratorId: collab.id,
      collaboratorWebUid: collab.webUid,
      ownerId: currentUserUid || 'system_default',
    };

    await onAddAdmin(record);
    setSuccessMsg(
      `Administrador "${record.displayName}" (Login Google + 2FA Ativa · UID ${collab.webUid}) adicionado com sucesso através da listagem de usuários cadastrados!`
    );
    setTimeout(() => setSuccessMsg(null as unknown as string), 5000);
  };

  // Form submit for selecting a registered user from the dropdown selector
  const handleSubmitSelectedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const collab = collaborators.find((c) => c.id === selectedCollaboratorId);
    if (!collab) {
      setErrorMsg(
        'Selecione um usuário cadastrado na listagem para adicioná-lo como administrador.'
      );
      return;
    }

    if (collab.accountType !== 'google') {
      setErrorMsg(
        `Operação negada: O usuário selecionado (${collab.firstName} ${collab.lastName}) utiliza conta corporativa tradicional. É obrigatório possuir Login Google.`
      );
      return;
    }

    if (!collab.twoFactorEnabled) {
      setErrorMsg(
        `Operação negada: O usuário selecionado (${collab.firstName} ${collab.lastName}) não está com a Autenticação de Duas Etapas (2FA) ativa.`
      );
      return;
    }

    if (isCollaboratorAlreadyAdmin(collab)) {
      setErrorMsg(
        'Este usuário cadastrado já está registrado no Setor de Administração.'
      );
      return;
    }

    const googleUidValue =
      collab.googleUid || `google-uid-${collab.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

    const record: AdminMemberRecord = {
      id: generateSafeDocId('adm'),
      identifierType: 'google_uid',
      googleUid: googleUidValue,
      corporateEmail: normalizeEmail(collab.email),
      displayName: `${collab.firstName} ${collab.lastName}`,
      sectorRole: sectorRole.trim() || `Admin · ${collab.sectorName}`,
      registeredDate,
      twoFactorVerified: true,
      collaboratorId: collab.id,
      collaboratorWebUid: collab.webUid,
      ownerId: currentUserUid || 'system_default',
    };

    await onAddAdmin(record);
    setSelectedCollaboratorId('');
    setSuccessMsg(
      `Administrador "${record.displayName}" credenciado com Login Google e Autenticação de Duas Etapas (2FA) verificada!`
    );
  };

  const filteredCollaborators = collaborators.filter((c) => {
    const isEligible = c.accountType === 'google' && Boolean(c.twoFactorEnabled);
    if (userFilter === 'eligible' && !isEligible) return false;
    if (userFilter === 'blocked' && isEligible) return false;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.webUid.toLowerCase().includes(q) ||
      c.companyName.toLowerCase().includes(q) ||
      c.sectorName.toLowerCase().includes(q)
    );
  });

  const eligibleCount = collaborators.filter(
    (c) => c.accountType === 'google' && Boolean(c.twoFactorEnabled)
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Setor de Administração & Configurações Administrativas
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Regra de Governança: Administradores só podem ser adicionados através da listagem de usuários cadastrados que possuam <strong>obrigatoriamente Login Google</strong> e <strong>Autenticação de Duas Etapas (2FA) ativa</strong>.
          </p>
        </div>

        {config && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleTriggerAdminBackup}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Exportar todos os registros de entrevistas e colaboradores em formato CSV com timestamp para arquivamento offline"
            >
              <Download className="w-3.5 h-3.5" />
              Backup de Dados
            </button>
          </div>
        )}
      </div>

      {/* Administrative Offline CSV Backup Bar */}
      {config && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Archive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Arquivamento Offline Administrativo — Exportação CSV com Timestamp
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Exporte todos os registros de <strong>entrevistas ({interviews.length})</strong> e <strong>colaboradores ({collaborators.length})</strong> em formato CSV com timestamp para auditoria e arquivamento offline.
              {lastBackup && (
                <span className="ml-1 font-mono text-emerald-700 dark:text-emerald-400">
                  Último arquivo: {lastBackup.filename} ({lastBackup.formattedTimestamp})
                </span>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={handleTriggerAdminBackup}
            className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold inline-flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Backup de Dados (CSV com Timestamp)
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Quick Selector Form from Registered Users List */}
      <form
        onSubmit={handleSubmitSelectedUser}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Selecionar Administrador da Listagem de Usuários Cadastrados (Google + 2FA)
          </div>
          <span className="text-xs font-mono text-slate-500">
            Elegíveis com Login Google & 2FA Ativa: <strong>{eligibleCount}</strong> de{' '}
            {collaborators.length} usuários
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Usuário Cadastrado (Obrigatório Login Google + 2FA Ativa) *
            </label>
            <select
              value={selectedCollaboratorId}
              onChange={(e) => setSelectedCollaboratorId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="">
                Selecione um usuário cadastrado na lista...
              </option>
              {collaborators.map((c) => {
                const eligible =
                  c.accountType === 'google' && Boolean(c.twoFactorEnabled);
                const alreadyAdmin = isCollaboratorAlreadyAdmin(c);
                const statusLabel = alreadyAdmin
                  ? '✓ JÁ É ADMIN'
                  : eligible
                  ? '✓ ELEGÍVEL: Google + 2FA Ativa'
                  : c.accountType !== 'google'
                  ? '✗ BLOQUEADO: Não é Login Google'
                  : '✗ BLOQUEADO: 2FA Inativa';

                return (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({c.email}) — [{statusLabel}]
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Atribuição no Setor de Administração *
            </label>
            <input
              type="text"
              required
              value={sectorRole}
              onChange={(e) => setSectorRole(e.target.value)}
              placeholder="Ex: Governança RH / Auditoria TI"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Data Cadastrada
              </label>
              <input
                type="date"
                value={registeredDate}
                onChange={(e) => setRegisteredDate(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono tabular-nums text-xs"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0 mt-5"
            >
              <Plus className="w-4 h-4" />
              Credenciar Selecionado
            </button>
          </div>
        </div>

        {currentUserEmail && (
          <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            Sessão atual conectada: <code className="font-mono">{currentUserEmail}</code>
          </div>
        )}
      </form>

      {/* Interactive Listing of Registered Users to Promote to Admin */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/60 dark:bg-slate-950/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Listagem de Usuários Cadastrados (Seleção Direta de Administradores)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Apenas usuários com <strong>Login Google</strong> e <strong>Autenticação de Duas Etapas (2FA) ativa</strong> podem ser promovidos ao Setor de Administração.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar usuário cadastrado..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setUserFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                  userFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Todos ({collaborators.length})
              </button>
              <button
                type="button"
                onClick={() => setUserFilter('eligible')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                  userFilter === 'eligible'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Elegíveis Google + 2FA ({eligibleCount})
              </button>
              <button
                type="button"
                onClick={() => setUserFilter('blocked')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                  userFilter === 'blocked'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Inelegíveis ({collaborators.length - eligibleCount})
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Usuário Cadastrado / UID WEB</th>
                <th className="py-3 px-4">Provedor de Login</th>
                <th className="py-3 px-4">Autenticação de 2 Etapas (2FA)</th>
                <th className="py-3 px-4">Atribuição Administrativa</th>
                <th className="py-3 px-4 text-right">Credenciamento Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {filteredCollaborators.map((c) => {
                const isGoogle = c.accountType === 'google';
                const has2FA = Boolean(c.twoFactorEnabled);
                const isEligible = isGoogle && has2FA;
                const alreadyAdmin = isCollaboratorAlreadyAdmin(c);

                return (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {c.firstName} {c.lastName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {c.email} · {c.webUid}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {isGoogle ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Login Google Oficial
                        </span>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-400 font-medium inline-flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Conta Corporativa (Não-Google)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {has2FA ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                            <KeyRound className="w-3.5 h-3.5" />
                            2 Etapas (2FA) Ativa
                          </span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 font-medium inline-flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5" />
                            2FA Inativa / Pendente
                          </span>
                        )}

                        {isGoogle && onToggleCollaborator2FA && (
                          <button
                            type="button"
                            onClick={() =>
                              onToggleCollaborator2FA(c.id, !has2FA)
                            }
                            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline ml-1 cursor-pointer"
                          >
                            {has2FA ? '(Desativar 2FA)' : '(Ativar 2FA Google)'}
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <input
                        type="text"
                        disabled={!isEligible || alreadyAdmin}
                        value={
                          roleByCollabId[c.id] ?? `Admin · ${c.sectorName}`
                        }
                        onChange={(e) =>
                          setRoleByCollabId({
                            ...roleByCollabId,
                            [c.id]: e.target.value,
                          })
                        }
                        className="w-full max-w-[220px] px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-50"
                      />
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {alreadyAdmin ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <UserCheck className="w-3.5 h-3.5" />
                          Administrador Ativo
                        </span>
                      ) : isEligible ? (
                        <button
                          type="button"
                          onClick={() => handlePromoteFromUserList(c)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Adicionar como Administrador
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePromoteFromUserList(c)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-400 dark:text-slate-500 text-xs font-medium cursor-not-allowed"
                          title={
                            !isGoogle
                              ? 'Requer obrigatoriamente conta de Login Google'
                              : 'Requer Autenticação de Duas Etapas (2FA) ativa'
                          }
                        >
                          {!isGoogle
                            ? 'Bloqueado (Exige Login Google)'
                            : 'Bloqueado (Exige 2FA Ativa)'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Admin Members Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Administradores Credenciados no Sistema ({admins.length})
          </h2>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <th className="py-3 px-4">Administrador</th>
              <th className="py-3 px-4">Requisitos de Segurança</th>
              <th className="py-3 px-4">UID Google / E-mail</th>
              <th className="py-3 px-4">Atribuição no Setor</th>
              <th className="py-3 px-4">Data Cadastrada</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            {admins.map((a) => (
              <tr
                key={a.id}
                className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              >
                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                  {a.displayName}
                  {a.collaboratorWebUid && (
                    <span className="block text-[11px] font-mono text-slate-500">
                      UID WEB: {a.collaboratorWebUid}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-emerald-700 dark:text-emerald-400 font-medium">
                  Login Google · 2 Etapas (2FA) Ativa
                </td>
                <td className="py-3 px-4 font-mono text-blue-600 dark:text-blue-400">
                  {a.googleUid || a.corporateEmail}
                  {a.corporateEmail && a.googleUid && (
                    <span className="block text-[11px] text-slate-500">
                      {a.corporateEmail}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                  {a.sectorRole}
                </td>
                <td className="py-3 px-4 font-mono tabular-nums text-slate-500">
                  {a.registeredDate}
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => onDeleteAdmin(a.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-md cursor-pointer"
                    aria-label="Remover administrador"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

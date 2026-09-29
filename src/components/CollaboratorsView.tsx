import React, { useState } from 'react';
import {
  FileText,
  Globe,
  Plus,
  Search,
  Settings2,
  Trash2,
  UserPlus,
} from 'lucide-react';
import {
  CollaboratorRecord,
  CompanyRecord,
  CustomFieldDefinition,
  SectorRecord,
} from '../types';
import { AuthPortal } from './AuthPortal';

interface CollaboratorsViewProps {
  collaborators: CollaboratorRecord[];
  companies: CompanyRecord[];
  sectors: SectorRecord[];
  customFields: CustomFieldDefinition[];
  onAddCollaborator: (collab: CollaboratorRecord) => Promise<void>;
  onDeleteCollaborator: (id: string) => Promise<void>;
  onOpenWebPage: (collab: CollaboratorRecord) => void;
  onStartInterview: (collab: CollaboratorRecord) => void;
  onAddCustomFieldDefinition: (field: CustomFieldDefinition) => Promise<void>;
}

export const CollaboratorsView: React.FC<CollaboratorsViewProps> = ({
  collaborators,
  companies,
  sectors,
  customFields,
  onAddCollaborator,
  onDeleteCollaborator,
  onOpenWebPage,
  onStartInterview,
  onAddCustomFieldDefinition,
}) => {
  const [search, setSearch] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCustomFieldCreator, setShowCustomFieldCreator] = useState(false);

  // Quick Custom Field Adder
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date' | 'select'>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  const filtered = collaborators.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.webUid.toLowerCase().includes(q) ||
      c.companyName.toLowerCase().includes(q) ||
      c.sectorName.toLowerCase().includes(q)
    );
  });

  const handleCreateCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldLabel.trim()) return;
    const key = newFieldLabel
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_');

    const newField: CustomFieldDefinition = {
      id: `cf_${Date.now()}`,
      key,
      label: newFieldLabel.trim(),
      type: newFieldType,
      options:
        newFieldType === 'select'
          ? newFieldOptions
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      placeholder: `Informe ${newFieldLabel.trim()}`,
      required: newFieldRequired,
    };

    await onAddCustomFieldDefinition(newField);
    setNewFieldLabel('');
    setNewFieldOptions('');
    setShowCustomFieldCreator(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Colaboradores Cadastrados & UIDs de Página WEB
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cada colaborador possui um UID exclusivo de página WEB, validação anti-duplicidade de e-mail/telefone, idade 18+ e campos adicionais customizáveis
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCustomFieldCreator(!showCustomFieldCreator)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Settings2 className="w-3.5 h-3.5" />
            + Campo Adicional ({customFields.length})
          </button>

          <button
            type="button"
            onClick={() => setShowRegisterModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Cadastrar Colaborador (18+ / LGPD)
          </button>
        </div>
      </div>

      {/* Dynamic Custom Field Builder Inline Panel */}
      {showCustomFieldCreator && (
        <form
          onSubmit={handleCreateCustomField}
          className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
              Adicionar Novo Campo Personalizado na Lista de Colaboradores
            </h3>
            <span className="text-[11px] text-slate-500">
              Modificável a qualquer momento pelo desenvolvedor
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nome do Campo Adicional *
              </label>
              <input
                type="text"
                required
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                placeholder="Ex: Grau de Risco / Matrícula / CNH"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Dado
              </label>
              <select
                value={newFieldType}
                onChange={(e) =>
                  setNewFieldType(
                    e.target.value as 'text' | 'number' | 'date' | 'select'
                  )
                }
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="text">Texto Livre</option>
                <option value="number">Número</option>
                <option value="date">Data</option>
                <option value="select">Lista de Opções</option>
              </select>
            </div>

            {newFieldType === 'select' ? (
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Opções (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={newFieldOptions}
                  onChange={(e) => setNewFieldOptions(e.target.value)}
                  placeholder="Opção A, Opção B, Opção C"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 pb-1.5">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newFieldRequired}
                    onChange={(e) => setNewFieldRequired(e.target.checked)}
                  />
                  Obrigatório no cadastro
                </label>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Incluir Campo
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nome, UID WEB, e-mail, telefone, empresa ou setor..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          Total Cadastrados: <strong>{filtered.length}</strong> · Campos Adicionais Ativos:{' '}
          <strong>{customFields.length}</strong>
        </div>
      </div>

      {/* High-Density Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">UID de Página WEB</th>
                <th className="py-3 px-4">Colaborador / Idade</th>
                <th className="py-3 px-4">E-mail & Telefone (Únicos)</th>
                <th className="py-3 px-4">Empresa & Setor</th>
                <th className="py-3 px-4">Data Cadastrada</th>
                <th className="py-3 px-4">Campos Adicionais</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-4 font-mono tabular-nums">
                    <button
                      type="button"
                      onClick={() => onOpenWebPage(c)}
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      {c.webUid}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {c.firstName} {c.lastName}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {c.role} · <span className="font-mono tabular-nums">{c.age} anos</span> ·{' '}
                      {c.accountType === 'google' ? 'Conta Google' : 'Conta Empresa'}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-mono text-slate-800 dark:text-slate-200">
                      {c.email}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-500">
                      {c.phone} {c.emailHint ? `· Dica: ${c.emailHint}` : ''}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {c.companyName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {c.sectorName} ({c.tenure})
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    {c.registeredDate}
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                      {customFields.map((cf) => {
                        const val = c.customFieldsMap?.[cf.key];
                        if (!val) return null;
                        return (
                          <div key={cf.id}>
                            <span className="text-slate-400">{cf.label}:</span>{' '}
                            <span className="font-medium">{val}</span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenWebPage(c)}
                        className="px-2.5 py-1 text-[11px] font-medium border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Abrir UID WEB
                      </button>
                      <button
                        type="button"
                        onClick={() => onStartInterview(c)}
                        className="px-2.5 py-1 text-[11px] font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        Entrevistar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCollaborator(c.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-md cursor-pointer"
                        aria-label="Remover colaborador"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal reusing AuthPortal on 'register' tab */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="my-8 w-full max-w-4xl">
            <AuthPortal
              collaborators={collaborators}
              companies={companies}
              sectors={sectors}
              customFields={customFields}
              initialTab="register"
              onCloseModal={() => setShowRegisterModal(false)}
              onAuthenticated={async (_session, newCollab) => {
                if (newCollab) {
                  await onAddCollaborator(newCollab);
                }
                setShowRegisterModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

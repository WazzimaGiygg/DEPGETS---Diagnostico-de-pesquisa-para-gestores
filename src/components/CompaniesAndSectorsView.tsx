import React, { useState } from 'react';
import { Building2, Layers, Plus, Trash2 } from 'lucide-react';
import { generateSafeDocId } from '../services/validationUtils';
import { CompanyRecord, SectorRecord } from '../types';

interface CompaniesAndSectorsViewProps {
  companies: CompanyRecord[];
  sectors: SectorRecord[];
  onAddCompany: (company: CompanyRecord) => Promise<void>;
  onDeleteCompany: (id: string) => Promise<void>;
  onAddSector: (sector: SectorRecord) => Promise<void>;
  onDeleteSector: (id: string) => Promise<void>;
}

export const CompaniesAndSectorsView: React.FC<CompaniesAndSectorsViewProps> = ({
  companies,
  sectors,
  onAddCompany,
  onDeleteCompany,
  onAddSector,
  onDeleteSector,
}) => {
  // Company Form State
  const [compName, setCompName] = useState('');
  const [compCnpj, setCompCnpj] = useState('');
  const [compSegment, setCompSegment] = useState('');
  const [compCityState, setCompCityState] = useState('');
  const [compDate, setCompDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Sector Form State
  const [secName, setSecName] = useState('');
  const [secCompanyId, setSecCompanyId] = useState(companies[0]?.id || '');
  const [secManager, setSecManager] = useState('');
  const [secHeadcount, setSecHeadcount] = useState(15);
  const [secPressure, setSecPressure] = useState<
    'Baixo' | 'Moderado' | 'Alto' | 'Crítico'
  >('Moderado');
  const [secDate, setSecDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName.trim() || !compCnpj.trim()) return;
    const record: CompanyRecord = {
      id: generateSafeDocId('comp'),
      name: compName.trim(),
      cnpj: compCnpj.trim(),
      segment: compSegment.trim() || 'Corporativo',
      cityState: compCityState.trim() || 'São Paulo / SP',
      registeredDate: compDate,
      ownerId: 'current_user',
    };
    await onAddCompany(record);
    setCompName('');
    setCompCnpj('');
    setCompSegment('');
    setCompCityState('');
  };

  const handleCreateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secName.trim() || !secManager.trim()) return;
    const targetCompany =
      companies.find((c) => c.id === secCompanyId) || companies[0];
    const record: SectorRecord = {
      id: generateSafeDocId('sec'),
      name: secName.trim(),
      companyId: targetCompany?.id || 'comp-default',
      companyName: targetCompany?.name || 'Empresa Padrão',
      managerName: secManager.trim(),
      headcount: Number(secHeadcount) || 1,
      pressureLevel: secPressure,
      registeredDate: secDate,
      ownerId: 'current_user',
    };
    await onAddSector(record);
    setSecName('');
    setSecManager('');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Empresas Cadastradas & Setores Cadastrados
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Estrutura organizacional com controle de data cadastrada, CNPJ, gestor responsável e nível de demanda operacional
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT COLUMN: EMPRESAS CADASTRADAS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Empresas Cadastradas ({companies.length})
            </h2>
          </div>

          <form
            onSubmit={handleCreateCompany}
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nova Empresa no Banco de Dados
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-500 mb-1">
                  Razão Social / Nome da Empresa *
                </label>
                <input
                  type="text"
                  required
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  placeholder="Ex: Nova Indústria Metalúrgica S.A."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  CNPJ *
                </label>
                <input
                  type="text"
                  required
                  value={compCnpj}
                  onChange={(e) => setCompCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Segmento / Ramo *
                </label>
                <input
                  type="text"
                  required
                  value={compSegment}
                  onChange={(e) => setCompSegment(e.target.value)}
                  placeholder="Ex: Logística / Indústria"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Cidade / UF
                </label>
                <input
                  type="text"
                  value={compCityState}
                  onChange={(e) => setCompCityState(e.target.value)}
                  placeholder="Ex: Curitiba / PR"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Data Cadastrada *
                </label>
                <input
                  type="date"
                  required
                  value={compDate}
                  onChange={(e) => setCompDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono tabular-nums"
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar Empresa
              </button>
            </div>
          </form>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
            {companies.map((c) => (
              <div
                key={c.id}
                className="p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {c.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="font-mono tabular-nums">CNPJ: {c.cnpj}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span>{c.segment}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span>{c.cityState}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">Data: {c.registeredDate}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteCompany(c.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-md cursor-pointer shrink-0"
                  aria-label="Excluir empresa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: SETORES CADASTRADOS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Setores Cadastrados ({sectors.length})
            </h2>
          </div>

          <form
            onSubmit={handleCreateSector}
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Novo Setor no Banco de Dados
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Nome do Setor *
                </label>
                <input
                  type="text"
                  required
                  value={secName}
                  onChange={(e) => setSecName(e.target.value)}
                  placeholder="Ex: Suprimentos e Compras"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Empresa Vinculada *
                </label>
                <select
                  value={secCompanyId}
                  onChange={(e) => setSecCompanyId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Gestor(a) Responsável *
                </label>
                <input
                  type="text"
                  required
                  value={secManager}
                  onChange={(e) => setSecManager(e.target.value)}
                  placeholder="Nome do Gestor do Setor"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Efetivo (Nº de Colaboradores)
                </label>
                <input
                  type="number"
                  min={1}
                  value={secHeadcount}
                  onChange={(e) => setSecHeadcount(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Nível de Pressão Operacional
                </label>
                <select
                  value={secPressure}
                  onChange={(e) =>
                    setSecPressure(
                      e.target.value as 'Baixo' | 'Moderado' | 'Alto' | 'Crítico'
                    )
                  }
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="Baixo">Baixo</option>
                  <option value="Moderado">Moderado</option>
                  <option value="Alto">Alto</option>
                  <option value="Crítico">Crítico</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Data Cadastrada *
                </label>
                <input
                  type="date"
                  required
                  value={secDate}
                  onChange={(e) => setSecDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono tabular-nums"
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar Setor
              </button>
            </div>
          </form>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
            {sectors.map((s) => (
              <div
                key={s.id}
                className="p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {s.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>{s.companyName}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span>Gestor: {s.managerName}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">Efetivo: {s.headcount}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span>Pressão: <strong>{s.pressureLevel}</strong></span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">Data: {s.registeredDate}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteSector(s.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-md cursor-pointer shrink-0"
                  aria-label="Excluir setor"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

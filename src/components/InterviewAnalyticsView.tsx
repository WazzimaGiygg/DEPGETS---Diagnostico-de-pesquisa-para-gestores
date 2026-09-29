import React, { useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  FileDown,
  Filter,
  Layers,
  Printer,
  TrendingUp,
} from 'lucide-react';
import {
  CollaboratorRecord,
  CompanyRecord,
  InterviewRecord,
  SectorRecord,
} from '../types';

interface InterviewAnalyticsViewProps {
  interviews: InterviewRecord[];
  sectors: SectorRecord[];
  companies: CompanyRecord[];
  collaborators: CollaboratorRecord[];
  compact?: boolean;
}

interface SectorMetricRow {
  sectorName: string;
  shortSector: string;
  companyName: string;
  interviewsCount: number;
  headcount: number;
  pressureLabel: string;
  satisfactionScore: number;
  preventionScore: number;
  pressureIndex: number;
  completenessRate: number;
}

function computeTextRichnessScore(text: string, base: number): number {
  const len = (text || '').trim().length;
  if (len === 0) return Math.max(20, base - 25);
  const bonus = Math.min(28, Math.round(len / 12));
  return Math.min(98, Math.max(35, base + bonus));
}

function pressureLevelToNumeric(
  level?: 'Baixo' | 'Moderado' | 'Alto' | 'Crítico'
): number {
  switch (level) {
    case 'Baixo':
      return 32;
    case 'Moderado':
      return 58;
    case 'Alto':
      return 82;
    case 'Crítico':
      return 94;
    default:
      return 60;
  }
}

export const InterviewAnalyticsView: React.FC<InterviewAnalyticsViewProps> = ({
  interviews,
  sectors,
  companies,
  collaborators,
  compact = false,
}) => {
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
  const [chartFocus, setChartFocus] = useState<
    'sectors_comparison' | 'satisfaction_distribution'
  >('sectors_comparison');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfExportFeedback, setPdfExportFeedback] = useState<string | null>(
    null
  );

  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  // Compute per-sector statistics combining sectors + recorded interviews
  const sectorMetrics: SectorMetricRow[] = useMemo(() => {
    const filteredSectors =
      selectedCompany === 'ALL'
        ? sectors
        : sectors.filter((s) => s.companyName === selectedCompany);

    const rows: SectorMetricRow[] = filteredSectors.map((sec) => {
      const matchingInterviews = interviews.filter(
        (intItem) =>
          intItem.roleSector.toLowerCase().includes(sec.name.toLowerCase()) ||
          intItem.companyName === sec.companyName
      );

      const basePressure = pressureLevelToNumeric(sec.pressureLevel);
      const latest = matchingInterviews[0];

      const satisfactionRaw = latest
        ? Math.round(
            (computeTextRichnessScore(latest.q4ComplaintsHandling, 68) +
              computeTextRichnessScore(latest.q2TaskDistribution, 66) +
              (100 - Math.round(basePressure * 0.35))) /
              3
          )
        : Math.max(45, 92 - Math.round(basePressure * 0.45));

      const preventionRaw = latest
        ? computeTextRichnessScore(latest.q7PreventiveMeasures, 70)
        : 64;

      const answeredCoreCount = latest
        ? [
            latest.q1DemandsAndPressure,
            latest.q2TaskDistribution,
            latest.q3FrequentConflicts,
            latest.q4ComplaintsHandling,
            latest.q5SignificantChanges,
            latest.q6AttentionIndicators,
            latest.q7PreventiveMeasures,
          ].filter((ans) => (ans || '').trim().length > 0).length
        : 0;

      const completenessRate = latest
        ? Math.round((answeredCoreCount / 7) * 100)
        : 0;

      const shortName =
        sec.name.length > 24 ? `${sec.name.slice(0, 22)}...` : sec.name;

      return {
        sectorName: sec.name,
        shortSector: shortName,
        companyName: sec.companyName,
        interviewsCount: matchingInterviews.length,
        headcount: sec.headcount,
        pressureLabel: sec.pressureLevel,
        satisfactionScore: Math.min(98, Math.max(30, satisfactionRaw)),
        preventionScore: Math.min(98, Math.max(30, preventionRaw)),
        pressureIndex: basePressure,
        completenessRate,
      };
    });

    const filteredInterviews =
      selectedCompany === 'ALL'
        ? interviews
        : interviews.filter((i) => i.companyName === selectedCompany);

    filteredInterviews.forEach((intItem) => {
      const alreadyCovered = rows.some(
        (r) =>
          intItem.roleSector.toLowerCase().includes(r.sectorName.toLowerCase()) ||
          r.companyName === intItem.companyName
      );
      if (!alreadyCovered) {
        const shortSector =
          intItem.roleSector.length > 24
            ? `${intItem.roleSector.slice(0, 22)}...`
            : intItem.roleSector;
        rows.push({
          sectorName: intItem.roleSector,
          shortSector,
          companyName: intItem.companyName,
          interviewsCount: 1,
          headcount: 15,
          pressureLabel: 'Moderado',
          satisfactionScore: computeTextRichnessScore(
            intItem.q4ComplaintsHandling,
            66
          ),
          preventionScore: computeTextRichnessScore(
            intItem.q7PreventiveMeasures,
            72
          ),
          pressureIndex: 58,
          completenessRate: 100,
        });
      }
    });

    return rows;
  }, [sectors, interviews, selectedCompany]);

  // Compute Satisfaction & Climate distribution across recorded interviews
  const satisfactionDistributionData = useMemo(() => {
    const filteredInterviews =
      selectedCompany === 'ALL'
        ? interviews
        : interviews.filter((i) => i.companyName === selectedCompany);

    return filteredInterviews.map((item) => {
      const planningScore = computeTextRichnessScore(
        `${item.q1DemandsAndPressure} ${item.q2TaskDistribution}`,
        65
      );
      const climateSatisfactionScore = computeTextRichnessScore(
        `${item.q3FrequentConflicts} ${item.q4ComplaintsHandling}`,
        68
      );
      const indicatorsScore = computeTextRichnessScore(
        `${item.q5SignificantChanges} ${item.q6AttentionIndicators}`,
        64
      );
      const preventionScore = computeTextRichnessScore(
        item.q7PreventiveMeasures,
        72
      );

      const shortManager =
        item.managerName.length > 18
          ? `${item.managerName.slice(0, 16)}...`
          : item.managerName;

      return {
        id: item.id,
        manager: shortManager,
        fullName: item.managerName,
        webUid: item.collaboratorWebUid,
        company: item.companyName,
        roleSector: item.roleSector,
        interviewDate: item.interviewDate,
        satisfacaoClima: climateSatisfactionScore,
        planejamentoDemanda: planningScore,
        prevencaoMelhorias: preventionScore,
        controleIndicadores: indicatorsScore,
      };
    });
  }, [interviews, selectedCompany]);

  const avgSatisfaction = useMemo(() => {
    if (sectorMetrics.length === 0) return 0;
    const sum = sectorMetrics.reduce((acc, r) => acc + r.satisfactionScore, 0);
    return Math.round(sum / sectorMetrics.length);
  }, [sectorMetrics]);

  const avgPrevention = useMemo(() => {
    if (sectorMetrics.length === 0) return 0;
    const sum = sectorMetrics.reduce((acc, r) => acc + r.preventionScore, 0);
    return Math.round(sum / sectorMetrics.length);
  }, [sectorMetrics]);

  const avgPressure = useMemo(() => {
    if (sectorMetrics.length === 0) return 0;
    const sum = sectorMetrics.reduce((acc, r) => acc + r.pressureIndex, 0);
    return Math.round(sum / sectorMetrics.length);
  }, [sectorMetrics]);

  const BAR_COLORS = ['#2563eb', '#059669', '#d97706', '#4f46e5'];

  // Export Recharts data and visual bars into a formatted Corporate PDF Report
  const handleExportCorporatePdf = () => {
    setIsExportingPdf(true);
    setPdfExportFeedback(null);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const todayStr = new Date().toLocaleDateString('pt-BR');
      const timeStr = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const scopeLabel =
        selectedCompany === 'ALL'
          ? `Consolidado Geral (${companies.length} Empresas)`
          : selectedCompany;

      // 1. Corporate Header Banner
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.rect(0, 0, pageWidth, 34, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(
        'DIAGORG — RELATÓRIO CORPORATIVO DE DIAGNÓSTICO ORGANIZACIONAL',
        14,
        14
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(203, 213, 225);
      doc.text(
        'Estatísticas Consolidadas das Entrevistas com Gestores (Recharts Analytics & Firebase)',
        14,
        21
      );
      doc.text(
        `Escopo: ${scopeLabel}   |   Emissão: ${todayStr} às ${timeStr}   |   Conformidade LGPD & Marco Civil`,
        14,
        28
      );

      // 2. Executive KPI Summary Cards
      let currentY = 42;
      const boxWidth = (pageWidth - 28 - 9) / 4;
      const kpis = [
        {
          label: 'ENTREVISTAS ANALISADAS',
          value: `${interviews.length}`,
          sub: `${sectors.length} setores avaliados`,
          rgb: [15, 23, 42] as [number, number, number],
        },
        {
          label: 'MÉDIA SATISFAÇÃO & CLIMA',
          value: `${avgSatisfaction}%`,
          sub: 'Escuta e distribuição',
          rgb: [37, 99, 235] as [number, number, number],
        },
        {
          label: 'AÇÕES PREVENTIVAS',
          value: `${avgPrevention}%`,
          sub: 'Medidas implantadas',
          rgb: [5, 150, 105] as [number, number, number],
        },
        {
          label: 'PRESSÃO OPERACIONAL',
          value: `${avgPressure}%`,
          sub: 'Demanda e sazonalidade',
          rgb: [217, 119, 6] as [number, number, number],
        },
      ];

      kpis.forEach((kpi, idx) => {
        const x = 14 + idx * (boxWidth + 3);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, currentY, boxWidth, 22, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label, x + 3, currentY + 6);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(kpi.rgb[0], kpi.rgb[1], kpi.rgb[2]);
        doc.text(kpi.value, x + 3, currentY + 14);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.sub, x + 3, currentY + 19);
      });

      currentY += 30;

      // 3. Vector Graphic Representation of the Recharts Sector Comparison BarChart
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(
        '1. GRÁFICO COMPARATIVO POR SETOR (DADOS RECHARTS: SATISFAÇÃO vs. PREVENÇÃO vs. PRESSÃO)',
        14,
        currentY
      );

      currentY += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        'Legenda:  [Azul] Satisfação & Clima (%)    [Verde] Medidas Preventivas (%)    [Âmbar] Pressão Operacional (%)',
        14,
        currentY + 2
      );
      currentY += 6;

      const maxBars = Math.min(sectorMetrics.length, 6);
      for (let i = 0; i < maxBars; i++) {
        const row = sectorMetrics[i];
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, currentY, pageWidth - 28, 15, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(
          `${row.sectorName} (${row.companyName})`,
          17,
          currentY + 4.5
        );

        const barAreaX = 17;
        const maxBarWidth = pageWidth - 56;

        // Bar 1: Satisfaction (Blue)
        const satW = Math.max(4, (row.satisfactionScore / 100) * maxBarWidth);
        doc.setFillColor(37, 99, 235);
        doc.rect(barAreaX, currentY + 6.2, satW, 2.2, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(37, 99, 235);
        doc.text(
          `Satisfação: ${row.satisfactionScore}%`,
          barAreaX + satW + 2,
          currentY + 8
        );

        // Bar 2: Prevention (Emerald)
        const prevW = Math.max(4, (row.preventionScore / 100) * maxBarWidth);
        doc.setFillColor(5, 150, 105);
        doc.rect(barAreaX, currentY + 9.1, prevW, 2.2, 'F');
        doc.setTextColor(5, 150, 105);
        doc.text(
          `Prevenção: ${row.preventionScore}%`,
          barAreaX + prevW + 2,
          currentY + 10.9
        );

        // Bar 3: Pressure (Amber)
        const pressW = Math.max(4, (row.pressureIndex / 100) * maxBarWidth);
        doc.setFillColor(217, 119, 6);
        doc.rect(barAreaX, currentY + 12, pressW, 2.2, 'F');
        doc.setTextColor(180, 83, 9);
        doc.text(
          `Pressão: ${row.pressureIndex}% (${row.pressureLabel})`,
          barAreaX + pressW + 2,
          currentY + 13.8
        );

        currentY += 17;
      }

      currentY += 3;

      // 4. Table 1: Sector Comparison Matrix
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(
        '2. MATRIZ CONSOLIDADA DE INDICADORES POR SETOR CADASTRADO',
        14,
        currentY
      );

      autoTable(doc, {
        startY: currentY + 3,
        head: [
          [
            'Setor Avaliado',
            'Empresa Vinculada',
            'Efetivo',
            'Entrevistas',
            'Satisfação & Clima',
            'Prevenção',
            'Pressão Operacional',
          ],
        ],
        body: sectorMetrics.map((r) => [
          r.sectorName,
          r.companyName,
          `${r.headcount} colab.`,
          String(r.interviewsCount),
          `${r.satisfactionScore}%`,
          `${r.preventionScore}%`,
          `${r.pressureLabel} (${r.pressureIndex}%)`,
        ]),
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });

      // 5. Table 2: Individual Interviews & Manager Satisfaction Levels
      const afterFirstTableY =
        (doc as unknown as { lastAutoTable?: { finalY?: number } })
          .lastAutoTable?.finalY || currentY + 45;

      let secondTableStartY = afterFirstTableY + 10;
      if (secondTableStartY > 240) {
        doc.addPage();
        secondTableStartY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(
        '3. NÍVEIS DE SATISFAÇÃO E DIMENSÕES DIAGNÓSTICAS POR GESTOR / ENTREVISTA',
        14,
        secondTableStartY
      );

      autoTable(doc, {
        startY: secondTableStartY + 3,
        head: [
          [
            'Gestor(a) Respondente',
            'UID WEB',
            'Cargo / Setor',
            'Data',
            'Satisfação & Clima',
            'Planejamento',
            'Prevenção & Melhoria',
          ],
        ],
        body: satisfactionDistributionData.map((d) => [
          d.fullName,
          d.webUid,
          d.roleSector,
          d.interviewDate,
          `${d.satisfacaoClima}%`,
          `${d.planejamentoDemanda}%`,
          `${d.prevencaoMelhorias}%`,
        ]),
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });

      // 6. Corporate Governance Footer on all pages
      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setDrawColor(203, 213, 225);
        doc.line(14, 282, pageWidth - 14, 282);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(
          'DiagOrg — Plataforma de Diagnóstico Organizacional · Documento Corporativo Confidencial (LGPD Lei nº 13.709/2018)',
          14,
          287
        );
        doc.text(
          `Página ${p} de ${pageCount}`,
          pageWidth - 32,
          287
        );
      }

      const fileDate = new Date().toISOString().split('T')[0];
      const fileName = `relatorio-corporativo-diagorg-${fileDate}.pdf`;
      doc.save(fileName);

      setPdfExportFeedback(
        `Relatório corporativo PDF (${fileName}) gerado e exportado com sucesso!`
      );
      setTimeout(() => setPdfExportFeedback(null), 6000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <section
      ref={chartContainerRef}
      aria-label="Estatísticas e Visualização de Dados das Entrevistas"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6"
    >
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" />
            Painel Analítico de Diagnóstico Organizacional (Recharts)
          </div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Estatísticas das Respostas das Entrevistas por Setor e Níveis de Satisfação
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comparativo em tempo real de satisfação de clima, pressão operacional e medidas preventivas gravadas no Firebase
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Company Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              aria-label="Filtrar estatísticas por empresa"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="ALL">
                Todas as Empresas ({companies.length})
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chart Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setChartFocus('sectors_comparison')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                chartFocus === 'sectors_comparison'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Comparar Setores
            </button>
            <button
              type="button"
              onClick={() => setChartFocus('satisfaction_distribution')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                chartFocus === 'satisfaction_distribution'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Níveis de Satisfação por Gestor
            </button>
          </div>

          {/* Corporate PDF Export Button */}
          <button
            type="button"
            onClick={handleExportCorporatePdf}
            disabled={isExportingPdf}
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <FileDown className="w-4 h-4" />
            {isExportingPdf
              ? 'Gerando PDF...'
              : 'Exportar Relatório PDF Corporativo'}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            title="Imprimir visualização atual"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PDF Export Confirmation Banner */}
      {pdfExportFeedback && (
        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-medium">{pdfExportFeedback}</span>
        </div>
      )}

      {/* KPI Summary Strip (Tabular Numerals) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Entrevistas Analisadas
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {interviews.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {collaborators.length} colaboradores vinculados · {sectors.length} setores
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Média de Satisfação & Clima
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-1">
            {avgSatisfaction}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Escuta ativa e distribuição de demandas
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Índice de Ações Preventivas
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {avgPrevention}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Medidas implantadas nos setores (Seção 4)
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Índice Médio de Pressão
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {avgPressure}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Demanda operacional e picos sazonais
          </div>
        </div>
      </div>

      {/* Main Recharts Visualization Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Sector Comparison BarChart */}
        <div className="p-4 rounded-lg bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Comparativo por Setores (Satisfação vs. Prevenção vs. Pressão)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Índices consolidados (0 a 100%) por setor cadastrado
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sectorMetrics}
                margin={{ top: 10, right: 16, left: -12, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#94a3b8"
                  strokeOpacity={0.25}
                />
                <XAxis
                  dataKey="shortSector"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar
                  dataKey="satisfactionScore"
                  name="Satisfação & Clima (%)"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="preventionScore"
                  name="Medidas Preventivas (%)"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="pressureIndex"
                  name="Pressão Operacional (%)"
                  fill="#d97706"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Satisfaction & Diagnostic Dimensions by Manager/Interview */}
        <div className="p-4 rounded-lg bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Níveis de Satisfação e Diagnóstico por Entrevista Gravada
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Avaliação das 4 seções do formulário por gestor respondente
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={satisfactionDistributionData}
                margin={{ top: 10, right: 16, left: -12, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#94a3b8"
                  strokeOpacity={0.25}
                />
                <XAxis
                  dataKey="manager"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar
                  dataKey="satisfacaoClima"
                  name="Satisfação & Clima (%)"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                >
                  {satisfactionDistributionData.map((entry, idx) => (
                    <Cell
                      key={`cell-${entry.id}`}
                      fill={BAR_COLORS[idx % BAR_COLORS.length]}
                    />
                  ))}
                </Bar>
                <Bar
                  dataKey="planejamentoDemanda"
                  name="Planejamento & Demanda (%)"
                  fill="#4f46e5"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="prevencaoMelhorias"
                  name="Prevenção & Melhorias (%)"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Sector & Satisfaction Table */}
      {!compact && (
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              Matriz Comparativa de Setores e Níveis de Satisfação
            </h3>
            <span className="text-[11px] text-slate-500 font-mono tabular-nums">
              {sectorMetrics.length} setores listados
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-4">Setor Avaliado</th>
                  <th className="py-2.5 px-4">Empresa</th>
                  <th className="py-2.5 px-4 text-right">Efetivo</th>
                  <th className="py-2.5 px-4 text-right">Entrevistas</th>
                  <th className="py-2.5 px-4 text-right">Satisfação & Clima</th>
                  <th className="py-2.5 px-4 text-right">Ações Preventivas</th>
                  <th className="py-2.5 px-4 text-right">Nível de Pressão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sectorMetrics.map((row) => (
                  <tr
                    key={`${row.companyName}-${row.sectorName}`}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {row.sectorName}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                      {row.companyName}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {row.headcount} colab.
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {row.interviewsCount}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                      {row.satisfactionScore}%
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      {row.preventionScore}%
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-amber-600 dark:text-amber-400">
                      {row.pressureLabel} ({row.pressureIndex}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

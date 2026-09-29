import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Chrome, Info, Monitor, Smartphone, Tablet, X } from 'lucide-react';
import { detectBrowserCompatibility } from '../services/validationUtils';

interface BrowserBannerProps {
  customNotice: string;
}

export const BrowserBanner: React.FC<BrowserBannerProps> = ({ customNotice }) => {
  const [showDetails, setShowDetails] = useState(false);
  const info = detectBrowserCompatibility();

  const DeviceIcon =
    info.deviceCategory === 'Mobile'
      ? Smartphone
      : info.deviceCategory === 'Tablet'
      ? Tablet
      : Monitor;

  return (
    <div className="no-print border-b border-amber-200/80 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 px-4 py-2 text-xs">
      <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {info.isChrome ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <p className="leading-snug">
            <span className="font-semibold">Diretriz de Navegador:</span> {customNotice}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-amber-900/80 dark:text-amber-300/80">
          <a
            href="https://wazzimagiygg.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-blue-700 dark:text-blue-300 hover:underline"
          >
            Projeto WazzimaGiygg (wazzimagiygg.com)
          </a>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
            <Chrome className="w-3.5 h-3.5" />
            {info.browserName} {info.version !== 'Outro' ? `v${info.version}` : ''}
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 font-mono tabular-nums">
            <DeviceIcon className="w-3.5 h-3.5" />
            {info.deviceCategory}
          </span>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center gap-1 underline hover:text-amber-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
            {showDetails ? 'Ocultar diagnóstico' : 'Verificar compatibilidade'}
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="max-w-[1400px] mx-auto mt-2 pt-2 border-t border-amber-200/60 dark:border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-amber-900 dark:text-amber-200/90">
          <div>
            <span>
              Motor gráfico detectado: <strong>{info.browserName}</strong> ({info.deviceCategory} Responsivo Ativo)
            </span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>
              Status Chromium:{' '}
              <strong>
                {info.isUpToDateChrome
                  ? 'Google Chrome Atualizado (Estabilidade 100%)'
                  : 'Recomendado atualizar/utilizar Google Chrome para evitar instabilidades gráficas'}
              </strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowDetails(false)}
            className="self-end sm:self-auto inline-flex items-center gap-1 text-amber-800 dark:text-amber-300 hover:underline"
          >
            <X className="w-3 h-3" /> Fechar
          </button>
        </div>
      )}
    </div>
  );
};

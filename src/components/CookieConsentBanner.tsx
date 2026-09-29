import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Cookie,
  ExternalLink,
  Lock,
  Scale,
  Settings2,
  ShieldCheck,
  X,
} from 'lucide-react';

export interface CookieConsentState {
  decided: boolean;
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  consentTimestamp: string;
  policyVersion: string;
}

const COOKIE_STORAGE_KEY = 'wazzimagiygg_diagorg_cookie_consent_v1';

const DEFAULT_CONSENT: CookieConsentState = {
  decided: false,
  essential: true,
  functional: true,
  analytics: true,
  consentTimestamp: '',
  policyVersion: 'LGPD-13709-MCI-12965-v1.0',
};

interface CookieConsentBannerProps {
  forceOpen?: boolean;
  onCloseForceOpen?: () => void;
  onConsentChange?: (consent: CookieConsentState) => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  forceOpen = false,
  onCloseForceOpen,
  onConsentChange,
}) => {
  const [consent, setConsent] = useState<CookieConsentState>(() => {
    try {
      const raw = localStorage.getItem(COOKIE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CookieConsentState;
        if (parsed && typeof parsed.decided === 'boolean') {
          return parsed;
        }
      }
    } catch {
      // Fallback to default state
    }
    return DEFAULT_CONSENT;
  });

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [functionalToggle, setFunctionalToggle] = useState(consent.functional);
  const [analyticsToggle, setAnalyticsToggle] = useState(consent.analytics);

  useEffect(() => {
    setFunctionalToggle(consent.functional);
    setAnalyticsToggle(consent.analytics);
  }, [consent]);

  useEffect(() => {
    if (forceOpen) {
      setShowDetailsModal(true);
    }
  }, [forceOpen]);

  const saveConsentDecision = (
    functionalVal: boolean,
    analyticsVal: boolean
  ) => {
    const now = new Date();
    const updated: CookieConsentState = {
      decided: true,
      essential: true,
      functional: functionalVal,
      analytics: analyticsVal,
      consentTimestamp: now.toLocaleString('pt-BR'),
      policyVersion: 'LGPD-13709-MCI-12965-v1.0',
    };

    try {
      localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage quota issues
    }

    setConsent(updated);
    setShowDetailsModal(false);
    if (onCloseForceOpen) {
      onCloseForceOpen();
    }
    if (onConsentChange) {
      onConsentChange(updated);
    }
  };

  const handleAcceptAll = () => {
    saveConsentDecision(true, true);
  };

  const handleAcceptEssentialOnly = () => {
    saveConsentDecision(false, false);
  };

  const handleSaveCustomPreferences = () => {
    saveConsentDecision(functionalToggle, analyticsToggle);
  };

  const isBannerVisible = !consent.decided || forceOpen || showDetailsModal;

  if (!isBannerVisible) {
    return null;
  }

  return (
    <>
      {/* Bottom Cookie Notice Banner (LGPD & Marco Civil da Internet) */}
      {(!consent.decided || forceOpen) && !showDetailsModal && (
        <aside
          aria-label="Aviso sobre Cookies, LGPD e Marco Civil da Internet"
          className="no-print fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 bg-slate-950/95 dark:bg-slate-950/98 text-slate-100 border-t border-slate-800 shadow-2xl backdrop-blur-md"
        >
          <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Cookie className="w-4 h-4" />
                  Aviso sobre Cookies & Privacidade (LGPD e Marco Civil da Internet)
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-xs font-semibold text-blue-400">
                  Projeto WazzimaGiygg (
                  <a
                    href="https://wazzimagiygg.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-300 inline-flex items-center gap-1"
                  >
                    wazzimagiygg.com
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  )
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Este site é um <strong>Projeto WazzimaGiygg</strong> (
                <a
                  href="https://wazzimagiygg.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline hover:text-blue-300"
                >
                  wazzimagiygg.com
                </a>
                ) e utiliza cookies essenciais, armazenamento local seguro e tokens de autenticação Firebase em estrita conformidade com a{' '}
                <strong>
                  LGPD (Lei Geral de Proteção de Dados — Lei nº 13.709/2018, Arts. 6º, 7º e 46)
                </strong>{' '}
                e com o{' '}
                <strong>
                  Marco Civil da Internet (Lei nº 12.965/2014, Arts. 7º, VIII e 15)
                </strong>{' '}
                para garantir a segurança da sessão, auditoria de acesso, persistência de respostas de diagnóstico organizacional e preferências de interface.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowDetailsModal(true)}
                className="px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Preferências de Cookies
              </button>

              <button
                type="button"
                onClick={handleAcceptEssentialOnly}
                className="px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
              >
                Apenas Essenciais
              </button>

              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Aceitar Cookies (LGPD & Marco Civil)
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Detailed Cookie Governance Modal (LGPD + Marco Civil + Projeto WazzimaGiygg) */}
      {showDetailsModal && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between gap-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Cookie className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <h2 className="text-sm font-bold">
                    Central de Privacidade e Aviso de Cookies — LGPD & Marco Civil da Internet
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Projeto WazzimaGiygg ·{' '}
                    <a
                      href="https://wazzimagiygg.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline hover:text-blue-300"
                    >
                      wazzimagiygg.com
                    </a>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowDetailsModal(false);
                  if (onCloseForceOpen) onCloseForceOpen();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                aria-label="Fechar central de cookies"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto text-xs text-slate-600 dark:text-slate-300">
              {/* Institutional WazzimaGiygg Attribution Box */}
              <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 dark:text-white">
                    Este site é um &ldquo;Projeto WazzimaGiygg&rdquo;
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Desenvolvido sob as diretrizes de governança digital, segurança da informação e transparência do ecossistema WazzimaGiygg.
                  </p>
                </div>
                <a
                  href="https://wazzimagiygg.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  Acessar wazzimagiygg.com
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Legal Framework Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Base Legal LGPD (Lei nº 13.709/2018)
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                    Em cumprimento aos <strong>Artigos 6º, 7º (I e V), 9º e 46 da LGPD</strong>, informamos de maneira clara que os cookies e identificadores locais são tratados exclusivamente para finalidades legítimas de autenticação segura, vinculação de UID WEB do colaborador e geração de relatórios de diagnóstico organizacional, garantindo ao titular o direito de revogação e revisão a qualquer momento.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-blue-600" />
                    Marco Civil da Internet (Lei nº 12.965/2014)
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                    Conforme o <strong>Art. 7º (incisos I, VII e VIII) e Art. 15 do Marco Civil da Internet</strong>, são asseguradas informações claras e completas sobre coleta, uso, armazenamento e proteção de registros de acesso à aplicação, sem fornecimento de dados pessoais a terceiros estranhos à finalidade corporativa.
                  </p>
                </div>
              </div>

              {/* Granular Cookie Categories */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Categorias de Cookies e Armazenamento Utilizados
                </h3>

                {/* 1. Essential */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      1. Cookies Estritamente Necessários, Segurança 2FA & Marco Civil
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Indispensáveis para manter a sessão autenticada (Firebase Auth / Google OAuth), verificação de duas etapas (2FA), prevenção de duplicidade cadastral e registro legal de auditoria exigido pelo Marco Civil da Internet (Lei nº 12.965/2014).
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold shrink-0">
                    Sempre Ativo
                  </span>
                </div>

                {/* 2. Functional */}
                <label className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 dark:text-white">
                      2. Cookies Funcionais, Modo Escuro Automático & Persistência Offline
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Permitem memorizar a preferência de tema (Modo Escuro Automático do Sistema Operacional), avisos de compatibilidade do Google Chrome e sincronização local de formulários de entrevista.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={functionalToggle}
                    onChange={(e) => setFunctionalToggle(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-blue-600 rounded cursor-pointer shrink-0"
                  />
                </label>

                {/* 3. Analytics */}
                <label className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 dark:text-white">
                      3. Cookies de Estatísticas Setoriais & Diagnóstico Organizacional (LGPD)
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Utilizados para consolidar gráficos comparativos Recharts e relatórios PDF/CSV de clima organizacional sob o princípio da minimização de dados da LGPD (Art. 6º, III).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={analyticsToggle}
                    onChange={(e) => setAnalyticsToggle(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-blue-600 rounded cursor-pointer shrink-0"
                  />
                </label>
              </div>

              {consent.decided && consent.consentTimestamp && (
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1">
                  Último registro de consentimento LGPD/Marco Civil salvo em:{' '}
                  <strong>{consent.consentTimestamp}</strong> ({consent.policyVersion})
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleAcceptEssentialOnly}
                className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Rejeitar Opcionais (Apenas Essenciais)
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveCustomPreferences}
                  className="px-4 py-2 rounded-lg border border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-semibold cursor-pointer"
                >
                  Salvar Minhas Preferências
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Aceitar Todos os Cookies
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

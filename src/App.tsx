import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  Cookie,
  ExternalLink,
  ListChecks,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { AdminSectorView } from './components/AdminSectorView';
import { AuthPortal } from './components/AuthPortal';
import { BrowserBanner } from './components/BrowserBanner';
import { CollaboratorWebPageModal } from './components/CollaboratorWebPageModal';
import { CollaboratorsView } from './components/CollaboratorsView';
import { CompaniesAndSectorsView } from './components/CompaniesAndSectorsView';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { DeveloperSettingsView } from './components/DeveloperSettingsView';
import { InterviewAnalyticsView } from './components/InterviewAnalyticsView';
import { InterviewFormView } from './components/InterviewFormView';
import { NonAdminSurveyPage } from './components/NonAdminSurveyPage';
import { auth, googleProvider } from './firebase';
import {
  getInitialLocalState,
  persistLocalSlice,
  removeDocumentFirestore,
  subscribeFirestoreCollections,
  upsertAdminMemberFirestore,
  upsertCollaboratorFirestore,
  upsertCompanyFirestore,
  upsertInterviewFirestore,
  upsertSectorFirestore,
  upsertSystemConfigFirestore,
} from './services/firebaseRepository';
import { pushService, PushLogItem } from './services/pushNotificationService';
import {
  calculateAgeFromBirthDate,
  evaluatePasswordStrength,
  generateWebUid,
  isDuplicateEmail,
  isDuplicatePhone,
  normalizeEmail,
} from './services/validationUtils';
import {
  AdminMemberRecord,
  AuthenticatedSession,
  CollaboratorRecord,
  CompanyRecord,
  CustomFieldDefinition,
  DeveloperSystemConfig,
  InterviewRecord,
  SectorRecord,
  ThemePreference,
} from './types';

type ActiveModule =
  | 'auth'
  | 'interview'
  | 'analytics'
  | 'collaborator_survey'
  | 'collaborators'
  | 'companies_sectors'
  | 'admin_sector'
  | 'developer_settings';

export default function App() {
  const initialData = getInitialLocalState();

  const [collaborators, setCollaborators] = useState<CollaboratorRecord[]>(
    initialData.collaborators
  );
  const [companies, setCompanies] = useState<CompanyRecord[]>(
    initialData.companies
  );
  const [sectors, setSectors] = useState<SectorRecord[]>(initialData.sectors);
  const [interviews, setInterviews] = useState<InterviewRecord[]>(
    initialData.interviews
  );
  const [admins, setAdmins] = useState<AdminMemberRecord[]>(initialData.admins);
  const [config, setConfig] = useState<DeveloperSystemConfig>(
    initialData.config
  );

  const [session, setSession] = useState<AuthenticatedSession | null>(null);
  const [activeModule, setActiveModule] = useState<ActiveModule>('interview');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showInlineAuthPanel, setShowInlineAuthPanel] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCookieSettingsModal, setShowCookieSettingsModal] = useState(false);

  // Exposed authentication & account validation helpers for Google Login (signInWithPopup)
  // and custom non-Google account creation (email uniqueness, strong password, 18+ age verification)
  const validateCustomAccountCreation = (params: {
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    birthDateOrAge: string | number;
    acceptedTerms: boolean;
  }) => {
    const age =
      typeof params.birthDateOrAge === 'number'
        ? params.birthDateOrAge
        : calculateAgeFromBirthDate(params.birthDateOrAge);
    const pwd = evaluatePasswordStrength(params.password);
    const emailTaken = isDuplicateEmail(params.email, collaborators);
    const phoneTaken = isDuplicatePhone(params.phone, collaborators);
    return {
      isEmailValid:
        params.email.includes('@') && !emailTaken,
      isPhoneValid:
        params.phone.replace(/\D/g, '').length >= 10 && !phoneTaken,
      isPasswordStrong:
        pwd.isValid && params.password === params.confirmPassword,
      isAdult18Plus: age >= 18,
      isValid:
        params.email.includes('@') &&
        !emailTaken &&
        !phoneTaken &&
        pwd.isValid &&
        params.password === params.confirmPassword &&
        age >= 18 &&
        params.acceptedTerms,
    };
  };

  const triggerGooglePopupLogin = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    return cred.user;
  };

  const triggerFirebaseEmailAuth = async (
    email: string,
    password: string,
    mode: 'login' | 'register'
  ) => {
    if (mode === 'register') {
      return createUserWithEmailAndPassword(auth, email, password);
    }
    return signInWithEmailAndPassword(auth, email, password);
  };
  void validateCustomAccountCreation;
  void triggerGooglePopupLogin;
  void triggerFirebaseEmailAuth;

  // Selected collaborator for dedicated Web Page Modal or Interview pre-fill
  const [webPageCollaborator, setWebPageCollaborator] =
    useState<CollaboratorRecord | null>(null);
  const [interviewCollaborator, setInterviewCollaborator] =
    useState<CollaboratorRecord | null>(null);

  // Automatic OS Dark Mode support
  const [themePreference, setThemePreference] =
    useState<ThemePreference>('system');
  const [isDarkEffective, setIsDarkEffective] = useState(false);

  // Native Push Notifications log state
  const [pushLogs, setPushLogs] = useState<PushLogItem[]>([]);

  // 1. OS Dark Mode Listener
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const shouldBeDark =
        themePreference === 'dark' ||
        (themePreference === 'system' && mediaQuery.matches);
      setIsDarkEffective(shouldBeDark);
      document.documentElement.classList.toggle('dark', shouldBeDark);
    };

    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [themePreference]);

  // 2. Service Worker & Push Notification Listener
  useEffect(() => {
    pushService.initServiceWorker();
    const unsub = pushService.subscribeLogs(setPushLogs);
    return unsub;
  }, []);

  // 3. Check URL query param `?webUid=WEB-COL-...` for direct Collaborator Web Page routing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uidParam = params.get('webUid');
    if (uidParam) {
      const match = collaborators.find(
        (c) => c.webUid.toLowerCase() === uidParam.toLowerCase()
      );
      if (match) {
        setWebPageCollaborator(match);
      }
    }
  }, [collaborators]);

  // 4. Firebase Auth State & Real-time Firestore Subscription
  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }

      if (user) {
        const matchedCollab = collaborators.find(
          (c) => normalizeEmail(c.email) === normalizeEmail(user.email || '')
        );

        setSession({
          uid: user.uid,
          email: user.email || '',
          displayName:
            user.displayName ||
            (matchedCollab
              ? `${matchedCollab.firstName} ${matchedCollab.lastName}`
              : user.email || 'Colaborador Autenticado'),
          accountType:
            user.providerData[0]?.providerId === 'google.com'
              ? 'google'
              : 'corporate',
          webUid:
            matchedCollab?.webUid ||
            generateWebUid(collaborators.map((c) => c.webUid)),
          isFirebaseAuthenticated: true,
        });

        unsubFirestore = subscribeFirestoreCollections(user.uid, {
          onCollaborators: (docs) => {
            setCollaborators((prev) => {
              const merged = [...docs];
              prev.forEach((p) => {
                if (!merged.some((m) => m.id === p.id)) merged.push(p);
              });
              persistLocalSlice('COLLABORATORS', merged);
              return merged;
            });
          },
          onCompanies: (docs) => {
            setCompanies((prev) => {
              const merged = [...docs];
              prev.forEach((p) => {
                if (!merged.some((m) => m.id === p.id)) merged.push(p);
              });
              persistLocalSlice('COMPANIES', merged);
              return merged;
            });
          },
          onSectors: (docs) => {
            setSectors((prev) => {
              const merged = [...docs];
              prev.forEach((p) => {
                if (!merged.some((m) => m.id === p.id)) merged.push(p);
              });
              persistLocalSlice('SECTORS', merged);
              return merged;
            });
          },
          onInterviews: (docs) => {
            setInterviews((prev) => {
              const merged = [...docs];
              prev.forEach((p) => {
                if (!merged.some((m) => m.id === p.id)) merged.push(p);
              });
              persistLocalSlice('INTERVIEWS', merged);
              return merged;
            });
          },
          onAdmins: (docs) => {
            setAdmins((prev) => {
              const merged = [...docs];
              prev.forEach((p) => {
                if (!merged.some((m) => m.id === p.id)) merged.push(p);
              });
              persistLocalSlice('ADMINS', merged);
              return merged;
            });
          },
        });
      }
    });

    return () => {
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  // Handlers for CRUD operations (Local + Firebase Firestore + Push Notifications)
  const handleAddCollaborator = async (newCollab: CollaboratorRecord) => {
    const next = [newCollab, ...collaborators];
    setCollaborators(next);
    persistLocalSlice('COLLABORATORS', next);
    await upsertCollaboratorFirestore(newCollab);

    if (config.pushNotificationsEnabled) {
      await pushService.sendNativePush(
        'Novo Colaborador Cadastrado',
        `${newCollab.firstName} ${newCollab.lastName} registrado com UID WEB ${newCollab.webUid}.`
      );
    }
  };

  const handleDeleteCollaborator = async (id: string) => {
    const next = collaborators.filter((c) => c.id !== id);
    setCollaborators(next);
    persistLocalSlice('COLLABORATORS', next);
    await removeDocumentFirestore('collaborators', id);
  };

  const handleToggleCollaborator2FA = async (
    collaboratorId: string,
    enabled: boolean
  ) => {
    const target = collaborators.find((c) => c.id === collaboratorId);
    if (!target) return;
    const updated: CollaboratorRecord = {
      ...target,
      twoFactorEnabled: enabled,
    };
    const next = collaborators.map((c) =>
      c.id === collaboratorId ? updated : c
    );
    setCollaborators(next);
    persistLocalSlice('COLLABORATORS', next);
    await upsertCollaboratorFirestore(updated);
  };

  const handleSaveInterview = async (
    record: InterviewRecord,
    isUpdate: boolean
  ) => {
    const next = isUpdate
      ? interviews.map((i) => (i.id === record.id ? record : i))
      : [record, ...interviews];
    setInterviews(next);
    persistLocalSlice('INTERVIEWS', next);
    await upsertInterviewFirestore(record, isUpdate);

    if (config.pushNotificationsEnabled) {
      await pushService.sendNativePush(
        isUpdate
          ? 'Diagnóstico Organizacional Atualizado'
          : 'Nova Entrevista Gravada no Firebase',
        `Gestor(a): ${record.managerName} (${record.collaboratorWebUid})`
      );
    }
  };

  const handleDeleteInterview = async (id: string) => {
    const next = interviews.filter((i) => i.id !== id);
    setInterviews(next);
    persistLocalSlice('INTERVIEWS', next);
    await removeDocumentFirestore('interviews', id);
  };

  const handleAddCompany = async (company: CompanyRecord) => {
    const next = [company, ...companies];
    setCompanies(next);
    persistLocalSlice('COMPANIES', next);
    await upsertCompanyFirestore(company);
  };

  const handleDeleteCompany = async (id: string) => {
    const next = companies.filter((c) => c.id !== id);
    setCompanies(next);
    persistLocalSlice('COMPANIES', next);
    await removeDocumentFirestore('companies', id);
  };

  const handleAddSector = async (sector: SectorRecord) => {
    const next = [sector, ...sectors];
    setSectors(next);
    persistLocalSlice('SECTORS', next);
    await upsertSectorFirestore(sector);
  };

  const handleDeleteSector = async (id: string) => {
    const next = sectors.filter((s) => s.id !== id);
    setSectors(next);
    persistLocalSlice('SECTORS', next);
    await removeDocumentFirestore('sectors', id);
  };

  const handleAddAdmin = async (adminRecord: AdminMemberRecord) => {
    const next = [adminRecord, ...admins];
    setAdmins(next);
    persistLocalSlice('ADMINS', next);
    await upsertAdminMemberFirestore(adminRecord);
  };

  const handleDeleteAdmin = async (id: string) => {
    const next = admins.filter((a) => a.id !== id);
    setAdmins(next);
    persistLocalSlice('ADMINS', next);
    await removeDocumentFirestore('admins', id);
  };

  const handleSaveConfig = async (newConfig: DeveloperSystemConfig) => {
    setConfig(newConfig);
    persistLocalSlice('CONFIG', newConfig);
    await upsertSystemConfigFirestore(newConfig);
  };

  const handleAddCustomFieldDefinition = async (
    field: CustomFieldDefinition
  ) => {
    const updated: DeveloperSystemConfig = {
      ...config,
      collaboratorCustomFields: [...config.collaboratorCustomFields, field],
    };
    await handleSaveConfig(updated);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // Ignore signout errors
    }
    setSession(null);
  };

  const checkIsSessionAdmin = (targetSession: AuthenticatedSession | null) =>
    Boolean(
      targetSession &&
        admins.some(
          (a) =>
            (a.googleUid && a.googleUid === targetSession.uid) ||
            (a.collaboratorId && a.collaboratorId === targetSession.uid) ||
            (a.corporateEmail &&
              normalizeEmail(a.corporateEmail) ===
                normalizeEmail(targetSession.email))
        )
    );

  const isUserAdmin = checkIsSessionAdmin(session);

  const navItems: Array<{
    id: ActiveModule;
    label: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { id: 'interview', label: 'Entrevista (Gestão)', icon: ClipboardList },
    { id: 'analytics', label: 'Estatísticas (Recharts)', icon: BarChart3 },
    {
      id: 'collaborator_survey',
      label: 'Pesquisa Separada (Não-Admin)',
      icon: ListChecks,
    },
    { id: 'collaborators', label: 'Colaboradores & UID', icon: Users },
    { id: 'companies_sectors', label: 'Empresas & Setores', icon: Building2 },
    { id: 'admin_sector', label: 'Administração (Google 2FA)', icon: ShieldCheck },
    { id: 'developer_settings', label: 'Configurações (Dev)', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Priority Google Chrome & Mobile/Tablet Diagnostic Banner */}
      <BrowserBanner customNotice={config.chromePriorityNotice} />

      {/* Top Corporate Navigation Bar (3-Zone Contract) */}
      <header className="no-print sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Single text element Brand Title */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveModule('interview');
            }}
            className="text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            DiagOrg
          </a>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden xl:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModule(item.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 dark:bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Theme, Push, Session/Auth */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Theme Cycle Button */}
            <button
              type="button"
              onClick={() =>
                setThemePreference((prev) =>
                  prev === 'system' ? 'dark' : prev === 'dark' ? 'light' : 'system'
                )
              }
              title={`Modo de cor: ${themePreference} (Clique para alternar Automático SO / Escuro / Claro)`}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs inline-flex items-center gap-1 cursor-pointer"
            >
              {isDarkEffective ? (
                <Moon className="w-4 h-4 text-blue-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
              <span className="hidden sm:inline text-[11px] font-mono">
                {themePreference === 'system' ? 'Auto(SO)' : themePreference}
              </span>
            </button>

            {/* Native Push Trigger */}
            <button
              type="button"
              onClick={async () => {
                await pushService.requestPermission();
                await pushService.sendNativePush(
                  'DiagOrg — Push Nativo Ativo',
                  'Notificações push nativas operacionais para Web e Mobile.'
                );
              }}
              title="Testar Notificação Push Nativa (Web & Mobile)"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* User Session Status & Active Login Account Creation Rule */}
            {session ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                {isUserAdmin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('auth');
                    }}
                    title="Exceção Administrativa: Criar nova conta mantendo login ativo"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Criar Conta (Admin)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveModule('collaborator_survey')}
                    title="Login ativo: Não é necessário criar nova conta. Acesse a pesquisa separada."
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-medium cursor-pointer whitespace-nowrap"
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                    Login Ativo · Pesquisa Separada
                  </button>
                )}

                <div className="text-right hidden md:block">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                    {session.displayName}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    {session.webUid || session.uid.slice(0, 10)}{' '}
                    {isUserAdmin ? '· ADMIN (Pode Criar Contas)' : '· NÃO-ADMIN'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Encerrar sessão"
                  className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                Login / Cadastrar
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              aria-label="Abrir menu de navegação"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveModule(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2 text-left cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 dark:bg-blue-600 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 py-6 md:py-8">
        {activeModule === 'auth' && (
          <AuthPortal
            collaborators={collaborators}
            companies={companies}
            sectors={sectors}
            customFields={config.collaboratorCustomFields}
            currentSession={session}
            isUserAdmin={isUserAdmin}
            onOpenSeparateSurveyPage={() =>
              setActiveModule('collaborator_survey')
            }
            onLogout={handleLogout}
            onAuthenticated={async (authSession, newCollab) => {
              setSession(authSession);
              if (newCollab) {
                await handleAddCollaborator(newCollab);
              }
              const targetIsAdmin = checkIsSessionAdmin(authSession);
              setActiveModule(
                targetIsAdmin ? 'interview' : 'collaborator_survey'
              );
            }}
          />
        )}

        {activeModule === 'analytics' && (
          <InterviewAnalyticsView
            interviews={interviews}
            sectors={sectors}
            companies={companies}
            collaborators={collaborators}
          />
        )}

        {activeModule === 'collaborator_survey' && (
          <NonAdminSurveyPage
            config={config}
            collaborators={collaborators}
            companies={companies}
            sectors={sectors}
            session={session}
            preselectedCollaborator={interviewCollaborator}
            onSaveInterview={handleSaveInterview}
          />
        )}

        {activeModule === 'interview' && (
          <div className="space-y-8">
            {/* Active Login Governance Banner when user is logged in */}
            {session && (
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  <strong>Sessão com Login Ativo ({session.displayName}):</strong>{' '}
                  {isUserAdmin ? (
                    <span>
                      Você pertence ao <strong>Setor de Administração</strong> e possui permissão especial para criar novas contas de colaboradores mesmo com login ativo.
                    </span>
                  ) : (
                    <span>
                      Como você já está com o login ativo e não pertence à administração,{' '}
                      <strong>não é necessário criar uma nova conta</strong>. Utilize a página exclusiva de pesquisa para responder às perguntas separadamente.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isUserAdmin ? (
                    <button
                      type="button"
                      onClick={() => setActiveModule('auth')}
                      className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Criar Nova Conta (Exceção Admin)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveModule('collaborator_survey')}
                      className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <ListChecks className="w-3.5 h-3.5" />
                      Abrir Página de Pesquisa (Perguntas Separadas)
                    </button>
                  )}
                </div>
              </div>
            )}

            {(!session || isUserAdmin) && showInlineAuthPanel && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {session && isUserAdmin
                      ? 'Painel de Criação de Contas (Liberado para Administração com Login Ativo)'
                      : 'Autenticação Firebase (Google OAuth) & Cadastro Corporativo Personalizado (18+ Anos · LGPD)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowInlineAuthPanel(false)}
                    className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
                  >
                    Ocultar painel de acesso
                  </button>
                </div>
                <AuthPortal
                  collaborators={collaborators}
                  companies={companies}
                  sectors={sectors}
                  customFields={config.collaboratorCustomFields}
                  currentSession={session}
                  isUserAdmin={isUserAdmin}
                  onOpenSeparateSurveyPage={() =>
                    setActiveModule('collaborator_survey')
                  }
                  onLogout={handleLogout}
                  onAuthenticated={async (authSession, newCollab) => {
                    setSession(authSession);
                    if (newCollab) {
                      await handleAddCollaborator(newCollab);
                    }
                    if (!checkIsSessionAdmin(authSession)) {
                      setActiveModule('collaborator_survey');
                    }
                  }}
                />
              </div>
            )}

            <InterviewFormView
              config={config}
              collaborators={collaborators}
              companies={companies}
              sectors={sectors}
              interviews={interviews}
              preselectedCollaborator={interviewCollaborator}
              onSaveInterview={handleSaveInterview}
              onDeleteInterview={handleDeleteInterview}
              onOpenCollaboratorWebPage={(collab) =>
                setWebPageCollaborator(collab)
              }
            />
          </div>
        )}

        {activeModule === 'collaborators' && (
          <CollaboratorsView
            collaborators={collaborators}
            companies={companies}
            sectors={sectors}
            customFields={config.collaboratorCustomFields}
            onAddCollaborator={handleAddCollaborator}
            onDeleteCollaborator={handleDeleteCollaborator}
            onOpenWebPage={(collab) => setWebPageCollaborator(collab)}
            onStartInterview={(collab) => {
              setInterviewCollaborator(collab);
              setActiveModule('interview');
            }}
            onAddCustomFieldDefinition={handleAddCustomFieldDefinition}
          />
        )}

        {activeModule === 'companies_sectors' && (
          <CompaniesAndSectorsView
            companies={companies}
            sectors={sectors}
            onAddCompany={handleAddCompany}
            onDeleteCompany={handleDeleteCompany}
            onAddSector={handleAddSector}
            onDeleteSector={handleDeleteSector}
          />
        )}

        {activeModule === 'admin_sector' && (
          <AdminSectorView
            admins={admins}
            collaborators={collaborators}
            interviews={interviews}
            config={config}
            companies={companies}
            sectors={sectors}
            currentUserUid={session?.uid}
            currentUserEmail={session?.email}
            onAddAdmin={handleAddAdmin}
            onDeleteAdmin={handleDeleteAdmin}
            onToggleCollaborator2FA={handleToggleCollaborator2FA}
          />
        )}

        {activeModule === 'developer_settings' && (
          <DeveloperSettingsView
            config={config}
            interviews={interviews}
            collaborators={collaborators}
            companies={companies}
            sectors={sectors}
            admins={admins}
            themePreference={themePreference}
            onChangeThemePreference={setThemePreference}
            onSaveConfig={handleSaveConfig}
            pushLogs={pushLogs}
          />
        )}
      </main>

      {/* Institutional Footer: Projeto WazzimaGiygg (wazzimagiygg.com) & Aviso de Cookies LGPD / Marco Civil */}
      <footer className="no-print border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-12 py-6 px-4 text-xs text-slate-600 dark:text-slate-400">
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-slate-900 dark:text-white font-semibold">
              <span>Este site é um &ldquo;Projeto WazzimaGiygg&rdquo;</span>
              <span className="text-slate-400">·</span>
              <a
                href="https://wazzimagiygg.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-bold"
              >
                wazzimagiygg.com
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-4xl">
              <strong>Aviso sobre Cookies, LGPD e Marco Civil da Internet:</strong> Este sistema utiliza cookies essenciais de autenticação, guarda de registros de acesso e armazenamento local seguro em conformidade com a{' '}
              <strong>LGPD (Lei Geral de Proteção de Dados — Lei nº 13.709/2018)</strong> e o{' '}
              <strong>Marco Civil da Internet (Lei nº 12.965/2014)</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowCookieSettingsModal(true)}
              className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Cookie className="w-3.5 h-3.5 text-amber-500" />
              Aviso e Preferências de Cookies (LGPD & Marco Civil)
            </button>

            <a
              href="https://wazzimagiygg.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              Visitar wazzimagiygg.com
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </footer>

      {/* Cookie Consent Notice Banner & Modal (LGPD + Marco Civil da Internet + Projeto WazzimaGiygg) */}
      <CookieConsentBanner
        forceOpen={showCookieSettingsModal}
        onCloseForceOpen={() => setShowCookieSettingsModal(false)}
      />

      {/* Modal: Dedicated Collaborator Web Page by UID */}
      <CollaboratorWebPageModal
        collaborator={webPageCollaborator}
        interviews={interviews}
        customFields={config.collaboratorCustomFields}
        onClose={() => setWebPageCollaborator(null)}
        onStartInterviewForCollaborator={(collab) => {
          setInterviewCollaborator(collab);
          setActiveModule('interview');
        }}
      />

      {/* Modal: Quick Auth / Registration Portal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="my-8 w-full max-w-4xl">
            <AuthPortal
              collaborators={collaborators}
              companies={companies}
              sectors={sectors}
              customFields={config.collaboratorCustomFields}
              currentSession={session}
              isUserAdmin={isUserAdmin}
              onOpenSeparateSurveyPage={() => {
                setShowAuthModal(false);
                setActiveModule('collaborator_survey');
              }}
              onLogout={handleLogout}
              onCloseModal={() => setShowAuthModal(false)}
              onAuthenticated={async (authSession, newCollab) => {
                setSession(authSession);
                if (newCollab) {
                  await handleAddCollaborator(newCollab);
                }
                setShowAuthModal(false);
                if (!checkIsSessionAdmin(authSession)) {
                  setActiveModule('collaborator_survey');
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

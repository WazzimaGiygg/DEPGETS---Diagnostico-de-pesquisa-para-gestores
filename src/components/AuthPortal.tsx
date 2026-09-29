import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  FileCheck2,
  HelpCircle,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import {
  LGPD_TERMS_TEXT,
  MARCO_CIVIL_TEXT,
  NON_GOOGLE_ACCOUNT_RULES,
  PRIVACY_POLICY_TEXT,
} from '../constants/legalTerms';
import { auth, firebaseConfig, googleProvider } from '../firebase';
import {
  calculateAgeFromBirthDate,
  evaluatePasswordStrength,
  formatPhoneBR,
  generateSafeDocId,
  generateWebUid,
  isDuplicateEmail,
  isDuplicatePhone,
  normalizeEmail,
} from '../services/validationUtils';
import {
  AuthenticatedSession,
  CollaboratorRecord,
  CompanyRecord,
  CustomFieldDefinition,
  SectorRecord,
} from '../types';

interface AuthPortalProps {
  collaborators: CollaboratorRecord[];
  companies: CompanyRecord[];
  sectors: SectorRecord[];
  customFields: CustomFieldDefinition[];
  currentSession?: AuthenticatedSession | null;
  isUserAdmin?: boolean;
  onOpenSeparateSurveyPage?: () => void;
  onLogout?: () => void;
  onAuthenticated: (
    session: AuthenticatedSession,
    newCollaborator?: CollaboratorRecord
  ) => void;
  onCloseModal?: () => void;
  initialTab?: 'both' | 'login' | 'register';
}

export const AuthPortal: React.FC<AuthPortalProps> = ({
  collaborators,
  companies,
  sectors,
  customFields,
  currentSession = null,
  isUserAdmin = false,
  onOpenSeparateSurveyPage,
  onLogout,
  onAuthenticated,
  onCloseModal,
  initialTab = 'both',
}) => {
  const [activeTab, setActiveTab] = useState<'both' | 'login' | 'register'>(
    initialTab
  );
  const [keepAdminSessionOnRegister, setKeepAdminSessionOnRegister] =
    useState(true);
  const [regAccountType, setRegAccountType] = useState<'corporate' | 'google'>(
    'corporate'
  );
  const [regTwoFactorEnabled, setRegTwoFactorEnabled] = useState(true);

  // Rule: "Acaso o usuário estiver com o login ativo, não será preciso criar uma nova conta, exceto se for da administração"
  const canCreateNewAccount = !currentSession || Boolean(isUserAdmin);

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [foundEmailHint, setFoundEmailHint] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Registration State (Non-Google Corporate Account)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('1994-06-15');
  const [manualAge, setManualAge] = useState<number>(32);
  const [useBirthDate, setUseBirthDate] = useState(true);
  const [role, setRole] = useState('Gestor(a) de Setor');
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    companies[0]?.id || ''
  );
  const [selectedSectorId, setSelectedSectorId] = useState(
    sectors[0]?.id || ''
  );
  const [tenure, setTenure] = useState('2 anos');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<
    Record<string, string>
  >({});

  // Mandatory Legal Checkboxes
  const [acceptedLgpdMarcoPrivacidade, setAcceptedLgpdMarcoPrivacidade] =
    useState(false);
  const [acceptedNonGoogleRules, setAcceptedNonGoogleRules] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [showFirebaseConsoleInfo, setShowFirebaseConsoleInfo] = useState(false);
  const [regError, setRegError] = useState('');

  // Live validations for Non-Google Registration
  const emailDuplicated = isDuplicateEmail(email, collaborators);
  const phoneDuplicated = isDuplicatePhone(phone, collaborators);
  const computedAge = useBirthDate
    ? calculateAgeFromBirthDate(birthDate)
    : Number(manualAge) || 0;
  const isAgeValid = computedAge >= 18 && computedAge <= 120;
  const pwdStrength = evaluatePasswordStrength(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleGoogleLogin = async () => {
    setLoginError('');
    setIsSubmitting(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const user = cred.user;
      const existingCollab = collaborators.find(
        (c) => normalizeEmail(c.email) === normalizeEmail(user.email || '')
      );
      onAuthenticated({
        uid: user.uid,
        email: user.email || 'usuario@google.com',
        displayName: user.displayName || 'Usuário Google',
        accountType: 'google',
        twoFactorEnabled: existingCollab?.twoFactorEnabled ?? true,
        webUid: existingCollab?.webUid || generateWebUid(collaborators.map((c) => c.webUid)),
        isFirebaseAuthenticated: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoginError(
        `Não foi possível concluir o login Google via popup (${msg}). Caso esteja em ambiente restrito, utilize o Login Personalizado pela Empresa.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLookupEmailHint = () => {
    if (!loginEmail.trim()) {
      setFoundEmailHint('Informe parte do e-mail ou nome para consultar a dica cadastrada.');
      return;
    }
    const q = loginEmail.trim().toLowerCase();
    const match = collaborators.find(
      (c) =>
        c.email.toLowerCase().includes(q) ||
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q)
    );
    if (match && match.emailHint) {
      setFoundEmailHint(`Dica de e-mail para ${match.firstName}: "${match.emailHint}"`);
    } else {
      setFoundEmailHint('Nenhuma dica encontrada para o termo informado.');
    }
  };

  const handleCorporateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const cleanEmail = normalizeEmail(loginEmail);

    if (!cleanEmail || !loginPassword) {
      setLoginError('Preencha o e-mail corporativo e a senha.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Try Firebase Email/Password first if enabled in console
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, loginPassword);
        const match = collaborators.find((c) => normalizeEmail(c.email) === cleanEmail);
        onAuthenticated({
          uid: cred.user.uid,
          email: cleanEmail,
          displayName: match ? `${match.firstName} ${match.lastName}` : cleanEmail,
          accountType: 'corporate',
          webUid: match?.webUid,
          isFirebaseAuthenticated: true,
        });
        return;
      } catch {
        // Fallback to registered corporate collaborator verification
      }

      const collab = collaborators.find((c) => normalizeEmail(c.email) === cleanEmail);
      if (!collab) {
        setLoginError(
          'E-mail corporativo não encontrado no cadastro. Verifique a dica de e-mail ou crie uma nova conta corporativa.'
        );
        return;
      }

      if (collab.passwordHash && collab.passwordHash !== loginPassword) {
        setLoginError('Senha incorreta para esta conta corporativa.');
        return;
      }

      onAuthenticated({
        uid: collab.id,
        email: collab.email,
        displayName: `${collab.firstName} ${collab.lastName}`,
        accountType: 'corporate',
        webUid: collab.webUid,
        isFirebaseAuthenticated: Boolean(auth.currentUser),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterCorporateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!firstName.trim() || !lastName.trim()) {
      setRegError('Nome e Sobrenome são obrigatórios.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setRegError('Informe um endereço de e-mail corporativo válido.');
      return;
    }
    if (emailDuplicated) {
      setRegError(
        'Bloqueado: Este endereço de e-mail já está presente em outro cadastro no banco de dados.'
      );
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setRegError('Informe um telefone válido com DDD.');
      return;
    }
    if (phoneDuplicated) {
      setRegError(
        'Bloqueado: Este número de telefone já está presente em outro cadastro no banco de dados.'
      );
      return;
    }
    if (!emailHint.trim()) {
      setRegError('Insira o texto para dica de e-mail obrigatoriamente.');
      return;
    }
    if (!isAgeValid) {
      setRegError(
        'Restrição Legal: A idade do colaborador deve ser obrigatoriamente maior ou igual a 18 anos para seguir com o cadastro.'
      );
      return;
    }
    if (!pwdStrength.isValid) {
      setRegError(
        'A senha não atinge os requisitos mínimos de força (8+ caracteres, maiúscula, minúscula, número e símbolo).'
      );
      return;
    }
    if (!passwordsMatch) {
      setRegError('A confirmação de senha não coincide com a senha digitada.');
      return;
    }
    if (!acceptedLgpdMarcoPrivacidade || !acceptedNonGoogleRules) {
      setRegError(
        'É obrigatório aceitar os Termos de LGPD, Marco Civil da Internet, Políticas de Privacidade e as Regras de Contas Não Vinculadas à Google.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const companyObj =
        companies.find((c) => c.id === selectedCompanyId) || companies[0];
      const sectorObj =
        sectors.find((s) => s.id === selectedSectorId) || sectors[0];
      const generatedUid = generateWebUid(collaborators.map((c) => c.webUid));
      const newCollabId = generateSafeDocId('col');
      const todayIso = new Date().toISOString().split('T')[0];

      let firebaseUid = auth.currentUser?.uid || newCollabId;
      let isFirebaseAuth = Boolean(auth.currentUser);

      // Attempt Firebase Email/Password creation if enabled in project
      try {
        const userCred = await createUserWithEmailAndPassword(
          auth,
          normalizeEmail(email),
          password
        );
        firebaseUid = userCred.user.uid;
        isFirebaseAuth = true;
      } catch {
        // Provider may not be enabled in Firebase Console yet; we still create the corporate collaborator record
      }

      const newCollaborator: CollaboratorRecord = {
        id: newCollabId,
        webUid: generatedUid,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizeEmail(email),
        emailHint: emailHint.trim(),
        phone: formatPhoneBR(phone),
        age: computedAge,
        birthDate: useBirthDate ? birthDate : `${new Date().getFullYear() - computedAge}-01-01`,
        role: role.trim() || 'Gestor(a)',
        companyId: companyObj?.id || 'comp-default',
        companyName: companyObj?.name || 'Empresa Principal',
        sectorId: sectorObj?.id || 'sec-default',
        sectorName: sectorObj?.name || 'Setor Geral',
        tenure: tenure.trim() || '1 ano',
        accountType: regAccountType,
        twoFactorEnabled: regTwoFactorEnabled,
        googleUid:
          regAccountType === 'google'
            ? `google-uid-${newCollabId}`
            : undefined,
        acceptedTerms: true,
        registeredDate: todayIso,
        customFieldsMap: customFieldValues,
        passwordHash: password,
        ownerId: firebaseUid,
      };

      const targetSession: AuthenticatedSession =
        currentSession && isUserAdmin && keepAdminSessionOnRegister
          ? currentSession
          : {
              uid: firebaseUid,
              email: newCollaborator.email,
              displayName: `${newCollaborator.firstName} ${newCollaborator.lastName}`,
              accountType: regAccountType,
              twoFactorEnabled: regTwoFactorEnabled,
              webUid: newCollaborator.webUid,
              isFirebaseAuthenticated: isFirebaseAuth,
            };

      onAuthenticated(targetSession, newCollaborator);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-w-4xl w-full mx-auto">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-950/50">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Autenticação e Registro de Colaboradores
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Login Google Workspace ou Conta Corporativa Personalizada pela Empresa com validação LGPD
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canCreateNewAccount && (
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('both')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'both'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Completo (Login + Cadastro)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'login'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Login (Google / Empresa)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'register'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Criar Conta (18+)
              </button>
            </div>
          )}

          {onCloseModal && (
            <button
              type="button"
              onClick={onCloseModal}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Fechar janela de autenticação"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Active Login Governance Notice */}
      {currentSession && !isUserAdmin && (
        <div className="p-6 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-900 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Login Ativo Identificado — Criação de Nova Conta Desnecessária
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Olá, {currentSession.displayName} ({currentSession.email})
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Seu login já está ativo no sistema (UID WEB:{' '}
                <code className="font-mono font-semibold">
                  {currentSession.webUid || currentSession.uid}
                </code>
                ). Como sua conta atual não pertence ao Setor de Administração,{' '}
                <strong>não é necessário (nem permitido) criar uma nova conta</strong>. Você pode acessar diretamente a página exclusiva de pesquisa para responder às perguntas separadamente.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {onOpenSeparateSurveyPage && (
                <button
                  type="button"
                  onClick={onOpenSeparateSurveyPage}
                  className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  Responder Pesquisa (Perguntas Separadas)
                </button>
              )}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                >
                  Trocar Conta / Sair
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {currentSession && isUserAdmin && (
        <div className="px-6 py-3.5 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-blue-900 dark:text-blue-200">
            <strong>Login Administrativo Ativo ({currentSession.displayName}):</strong>{' '}
            Como membro do Setor de Administração, você possui permissão especial para cadastrar novas contas de colaboradores mesmo estando com login ativo.
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-medium text-blue-800 dark:text-blue-300 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={keepAdminSessionOnRegister}
              onChange={(e) => setKeepAdminSessionOnRegister(e.target.checked)}
              className="rounded border-blue-400 text-blue-600"
            />
            Manter minha sessão Admin ativa após criar conta
          </label>
        </div>
      )}

      {(activeTab === 'login' || activeTab === 'both') && (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-200 dark:border-slate-800">
          {/* Column 1: Google Official Auth */}
          <div className="space-y-4 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 pb-6 md:pb-0 md:pr-8">
            <div className="space-y-3">
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                Opção 01 · Credencial Google Oficial
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Login Integrado Google (Firebase Auth)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Recomendado para gestores e administradores com conta Google vinculada. Sincroniza automaticamente seu UID Google com o Setor de Administração e gravações em tempo real no Firestore.
              </p>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                Entrar com Conta Google (Popup Seguro)
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                Acesso Rápido a Contas Cadastradas (Demonstração)
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Clique em um colaborador já registrado para testar o ambiente com seu UID de página WEB:
              </p>
              <div className="space-y-1.5 pt-1">
                {collaborators.slice(0, 4).map((c) => {
                  const isDemoAdmin =
                    c.id === 'col-helena-vasconcelos' ||
                    c.email === 'mafersao1100@gmail.com';
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        onAuthenticated({
                          uid: c.googleUid || c.id,
                          email: c.email,
                          displayName: `${c.firstName} ${c.lastName}`,
                          accountType: c.accountType,
                          twoFactorEnabled: c.twoFactorEnabled,
                          webUid: c.webUid,
                          isFirebaseAuthenticated: Boolean(auth.currentUser),
                        })
                      }
                      className="w-full text-left px-3 py-2 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 text-xs flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {c.firstName} {c.lastName}{' '}
                        <span className="text-[10px] text-slate-500">
                          ({isDemoAdmin ? 'Admin · Google 2FA' : 'Não-Admin'})
                        </span>
                      </span>
                      <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 shrink-0 ml-2">
                        {c.webUid}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Column 2: Custom Company Login */}
          <form onSubmit={handleCorporateLogin} className="space-y-4">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Opção 02 · Login Personalizado pela Empresa
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Acesso com Conta Corporativa (Não-Google)
            </h3>

            {loginError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                E-mail Corporativo Cadastrado
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="nome.sobrenome@empresa.com.br"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleLookupEmailHint}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3" />
                  Consultar dica de e-mail cadastrada
                </button>
                <button
                  type="button"
                  onClick={() => setShowFirebaseConsoleInfo(!showFirebaseConsoleInfo)}
                  className="text-[11px] text-slate-500 hover:underline cursor-pointer"
                >
                  Guia Firebase Auth E-mail
                </button>
              </div>
              {foundEmailHint && (
                <div className="mt-1.5 p-2 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-[11px] text-blue-800 dark:text-blue-200">
                  {foundEmailHint}
                </div>
              )}
              {showFirebaseConsoleInfo && (
                <div className="mt-1.5 p-2.5 rounded-md bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Habilitação de E-mail/Senha no Console do Firebase:
                  </p>
                  <p>
                    Para autenticar contas não-Google diretamente no provedor nativo do Firebase Authentication, acesse o Console do Firebase (Projeto <code className="font-mono">{firebaseConfig.projectId}</code>) &rarr; <strong>Authentication</strong> &rarr; <strong>Sign-in method</strong> &rarr; Habilite <strong>E-mail/Senha</strong>.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Senha Corporativa
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Digite sua senha corporativa"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium text-xs hover:bg-slate-800 dark:hover:bg-white transition-colors cursor-pointer"
            >
              Acessar com Credencial Corporativa
            </button>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-center">
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Não possui conta Google? Cadastre uma Conta Corporativa
              </button>
            </div>
          </form>
        </div>
      )}

      {canCreateNewAccount && (activeTab === 'register' || activeTab === 'both') && (
        /* TAB 2: NON-GOOGLE / CORPORATE ACCOUNT REGISTRATION */
        <form onSubmit={handleRegisterCorporateAccount} className="p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                Cadastro de Conta de Colaborador (Disponível para Novos Usuários ou Administração)
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Formulário de Criação de Conta (Obrigatório 18+ Anos)
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setRegAccountType('corporate')}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                    regAccountType === 'corporate'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Conta Corporativa
                </button>
                <button
                  type="button"
                  onClick={() => setRegAccountType('google')}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                    regAccountType === 'google'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Vincular Login Google
                </button>
              </div>

              <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={regTwoFactorEnabled}
                  onChange={(e) => setRegTwoFactorEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                Autenticação em 2 Etapas (2FA) Ativa
              </label>
            </div>
          </div>
          {regError && (
            <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{regError}</span>
            </div>
          )}

          {/* Personal & Uniqueness Validated Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nome *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ex: Carlos"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Sobrenome *
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ex: Eduardo Mendes"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Idade (Obrigatório 18+ anos) *
                </label>
                <button
                  type="button"
                  onClick={() => setUseBirthDate(!useBirthDate)}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {useBirthDate ? 'Digitar idade' : 'Usar data nasc.'}
                </button>
              </div>
              {useBirthDate ? (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono tabular-nums"
                  />
                  <span
                    className={`text-xs font-mono tabular-nums px-2.5 py-2 rounded-lg border shrink-0 ${
                      isAgeValid
                        ? 'border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/40'
                        : 'border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 bg-red-50/60 dark:bg-red-950/40'
                    }`}
                  >
                    {computedAge} anos
                  </span>
                </div>
              ) : (
                <input
                  type="number"
                  min={1}
                  max={120}
                  required
                  value={manualAge}
                  onChange={(e) => setManualAge(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono tabular-nums"
                />
              )}
              {!isAgeValid && (
                <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                  Proibido cadastro para menores de 18 anos (Idade atual: {computedAge} anos).
                </p>
              )}
            </div>

            {/* Email with anti-duplicate check */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                E-mail Corporativo (Único no Banco) *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colaborador@empresa.com.br"
                  className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border bg-white dark:bg-slate-950 text-slate-900 dark:text-white ${
                    emailDuplicated
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                />
              </div>
              {emailDuplicated ? (
                <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 font-medium">
                  Este e-mail já está cadastrado para outro colaborador.
                </p>
              ) : (
                email.includes('@') && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                    E-mail disponível para registro único.
                  </p>
                )
              )}
            </div>

            {/* Email hint text */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Texto para Dica de E-mail *
              </label>
              <input
                type="text"
                required
                value={emailHint}
                onChange={(e) => setEmailHint(e.target.value)}
                placeholder="Ex: Nome + sobrenome no domínio da filial SP"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            {/* Phone with anti-duplicate check */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Telefone (Único no Banco) *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                  placeholder="(11) 98888-7777"
                  className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono tabular-nums ${
                    phoneDuplicated
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                />
              </div>
              {phoneDuplicated ? (
                <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 font-medium">
                  Este telefone já consta em outro cadastro no sistema.
                </p>
              ) : (
                phone.replace(/\D/g, '').length >= 10 && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                    Telefone validado e sem duplicidade.
                  </p>
                )
              )}
            </div>
          </div>

          {/* Corporate Link: Company, Sector, Role, Tenure */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Empresa Vinculada *
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Setor Cadastrado *
              </label>
              <select
                value={selectedSectorId}
                onChange={(e) => setSelectedSectorId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Cargo / Função *
              </label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Coordenador de Operações"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tempo no Cargo/Empresa
              </label>
              <input
                type="text"
                value={tenure}
                onChange={(e) => setTenure(e.target.value)}
                placeholder="Ex: 3 anos e 2 meses"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Dynamic Custom Fields configured by Developer */}
          {customFields.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                Campos Adicionais de Colaboradores (Configurados no Sistema)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {customFields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {field.label} {field.required ? '*' : ''}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={customFieldValues[field.key] || ''}
                        onChange={(e) =>
                          setCustomFieldValues({
                            ...customFieldValues,
                            [field.key]: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                      >
                        <option value="">Selecione...</option>
                        {(field.options || []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        required={field.required}
                        placeholder={field.placeholder || ''}
                        value={customFieldValues[field.key] || ''}
                        onChange={(e) =>
                          setCustomFieldValues({
                            ...customFieldValues,
                            [field.key]: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Password Strength & Confirmation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Senha Corporativa (Com Validação de Força Mínima) *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres, A-Z, a-z, 0-9 e símbolo"
                  className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength Meter */}
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Força da senha:</span>
                  <span
                    className={`font-semibold ${
                      pwdStrength.isValid
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {pwdStrength.label} ({pwdStrength.score}/5 requisitos)
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1 h-1.5">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div
                      key={step}
                      className={`rounded-full ${
                        pwdStrength.score >= step
                          ? pwdStrength.isValid
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                  <span className={pwdStrength.checks.minLength ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                    {pwdStrength.checks.minLength ? '✓' : '○'} 8+ caract.
                  </span>
                  <span className={pwdStrength.checks.hasUpper ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                    {pwdStrength.checks.hasUpper ? '✓' : '○'} Maiúscula
                  </span>
                  <span className={pwdStrength.checks.hasLower ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                    {pwdStrength.checks.hasLower ? '✓' : '○'} Minúscula
                  </span>
                  <span className={pwdStrength.checks.hasNumber ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                    {pwdStrength.checks.hasNumber ? '✓' : '○'} Número
                  </span>
                  <span className={pwdStrength.checks.hasSpecial ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                    {pwdStrength.checks.hasSpecial ? '✓' : '○'} Símbolo (@#!)
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Confirmação de Senha *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita exatamente a senha criada"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
              {confirmPassword.length > 0 && (
                <p
                  className={`text-[11px] mt-1.5 ${
                    passwordsMatch
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {passwordsMatch
                    ? '✓ As senhas coincidem perfeitamente.'
                    : 'As senhas informadas não conferem.'}
                </p>
              )}
            </div>
          </div>

          {/* Non-Google Account Usage Rules */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Regras do Uso de Contas Não Vinculadas à Google
              </div>
              <button
                type="button"
                onClick={() => setShowLegalModal(true)}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                Ler Texto Integral LGPD & Marco Civil
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
              {NON_GOOGLE_ACCOUNT_RULES.map((rule) => (
                <div
                  key={rule.code}
                  className="p-2.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
                >
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {rule.code} — {rule.title}:
                  </span>{' '}
                  {rule.description}
                </div>
              ))}
            </div>
          </div>

          {/* Mandatory Checkboxes: LGPD, Marco Civil, Privacy Policy, Non-Google Rules */}
          <div className="space-y-2.5 pt-1">
            <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedLgpdMarcoPrivacidade}
                onChange={(e) => setAcceptedLgpdMarcoPrivacidade(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                Declaro que li e aceito integralmente o <strong>Aviso sobre Cookies</strong>, os termos da{' '}
                <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>, do{' '}
                <strong>Marco Civil da Internet (Lei nº 12.965/2014)</strong> e as{' '}
                <strong>Políticas de Privacidade</strong> corporativas deste{' '}
                <strong>Projeto WazzimaGiygg</strong> (
                <a
                  href="https://wazzimagiygg.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline"
                >
                  wazzimagiygg.com
                </a>
                ). *
              </span>
            </label>

            <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedNonGoogleRules}
                onChange={(e) => setAcceptedNonGoogleRules(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                Concordo com as <strong>Regras de Uso de Contas Não Vinculadas à Google</strong>, confirmando possuir <strong>idade igual ou superior a 18 anos</strong> e que meu e-mail e telefone são de titularidade exclusiva. *
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Voltar ao Login
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                emailDuplicated ||
                phoneDuplicated ||
                !isAgeValid ||
                !acceptedLgpdMarcoPrivacidade ||
                !acceptedNonGoogleRules
              }
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Concluir Registro e Gerar UID de Página WEB
            </button>
          </div>
        </form>
      )}

      {/* Legal Modal (LGPD, Marco Civil, Privacy Policy) */}
      {showLegalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Termos Legais: LGPD, Marco Civil da Internet e Políticas de Privacidade
              </h3>
              <button
                type="button"
                onClick={() => setShowLegalModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              <p>{LGPD_TERMS_TEXT}</p>
              <hr className="border-slate-200 dark:border-slate-800" />
              <p>{MARCO_CIVIL_TEXT}</p>
              <hr className="border-slate-200 dark:border-slate-800" />
              <p>{PRIVACY_POLICY_TEXT}</p>
            </div>
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAcceptedLgpdMarcoPrivacidade(true);
                  setAcceptedNonGoogleRules(true);
                  setShowLegalModal(false);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 cursor-pointer"
              >
                Aceitar Todos os Termos e Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

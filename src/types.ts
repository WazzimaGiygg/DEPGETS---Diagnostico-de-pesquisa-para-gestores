export type AccountType = 'google' | 'corporate';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface CustomFieldDefinition {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  placeholder?: string;
  options?: string[];
  required: boolean;
}

export interface CustomInterviewQuestion {
  id: string;
  sectionNumber: 1 | 2 | 3 | 4;
  questionNumber: number;
  label: string;
  placeholder: string;
  required: boolean;
  isCore?: boolean;
  coreKey?:
    | 'q1DemandsAndPressure'
    | 'q2TaskDistribution'
    | 'q3FrequentConflicts'
    | 'q4ComplaintsHandling'
    | 'q5SignificantChanges'
    | 'q6AttentionIndicators'
    | 'q7PreventiveMeasures';
}

export interface CollaboratorRecord {
  id: string;
  webUid: string; // UID exclusivo de página WEB para cada colaborador cadastrado
  firstName: string;
  lastName: string;
  email: string;
  emailHint: string;
  phone: string;
  age: number;
  birthDate: string;
  role: string;
  companyId: string;
  companyName: string;
  sectorId: string;
  sectorName: string;
  tenure: string;
  accountType: AccountType;
  twoFactorEnabled?: boolean;
  googleUid?: string;
  acceptedTerms: boolean;
  registeredDate: string;
  customFieldsMap: Record<string, string>;
  passwordHash?: string; // Only for local corporate login verification
  ownerId: string;
}

export interface CompanyRecord {
  id: string;
  name: string;
  cnpj: string;
  segment: string;
  cityState: string;
  registeredDate: string;
  ownerId: string;
}

export interface SectorRecord {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
  managerName: string;
  headcount: number;
  pressureLevel: 'Baixo' | 'Moderado' | 'Alto' | 'Crítico';
  registeredDate: string;
  ownerId: string;
}

export interface InterviewRecord {
  id: string;
  collaboratorId: string;
  collaboratorWebUid: string;
  managerName: string;
  roleSector: string;
  companyName: string;
  interviewDate: string;
  tenure: string;
  q1DemandsAndPressure: string;
  q2TaskDistribution: string;
  q3FrequentConflicts: string;
  q4ComplaintsHandling: string;
  q5SignificantChanges: string;
  q6AttentionIndicators: string;
  q7PreventiveMeasures: string;
  extraAnswersMap: Record<string, string>;
  ownerId: string;
}

export interface AdminMemberRecord {
  id: string;
  identifierType: 'google_uid' | 'corporate_email';
  googleUid: string;
  corporateEmail: string;
  displayName: string;
  sectorRole: string;
  registeredDate: string;
  twoFactorVerified?: boolean;
  collaboratorId?: string;
  collaboratorWebUid?: string;
  ownerId: string;
}

export interface DeveloperSystemConfig {
  id: string;
  formTitle: string;
  formSubtitle: string;
  chromePriorityNotice: string;
  pushNotificationsEnabled: boolean;
  customQuestions: CustomInterviewQuestion[];
  collaboratorCustomFields: CustomFieldDefinition[];
  sectionTitles: {
    1: string;
    2: string;
    3: string;
    4: string;
  };
  ownerId: string;
}

export interface AuthenticatedSession {
  uid: string;
  email: string;
  displayName: string;
  accountType: AccountType;
  twoFactorEnabled?: boolean;
  webUid?: string;
  isFirebaseAuthenticated: boolean;
}

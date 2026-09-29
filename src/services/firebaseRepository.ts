import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  DEFAULT_SYSTEM_CONFIG,
  INITIAL_ADMINS,
  INITIAL_COLLABORATORS,
  INITIAL_COMPANIES,
  INITIAL_INTERVIEWS,
  INITIAL_SECTORS,
} from '../constants/defaultData';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  AdminMemberRecord,
  CollaboratorRecord,
  CompanyRecord,
  DeveloperSystemConfig,
  InterviewRecord,
  SectorRecord,
} from '../types';

const STORAGE_KEYS = {
  COLLABORATORS: 'diagorg_collaborators_v2',
  COMPANIES: 'diagorg_companies_v2',
  SECTORS: 'diagorg_sectors_v2',
  INTERVIEWS: 'diagorg_interviews_v2',
  ADMINS: 'diagorg_admins_v2',
  CONFIG: 'diagorg_config_v2',
};

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveLocal<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

export function getInitialLocalState() {
  return {
    collaborators: loadLocal<CollaboratorRecord[]>(
      STORAGE_KEYS.COLLABORATORS,
      INITIAL_COLLABORATORS
    ),
    companies: loadLocal<CompanyRecord[]>(
      STORAGE_KEYS.COMPANIES,
      INITIAL_COMPANIES
    ),
    sectors: loadLocal<SectorRecord[]>(STORAGE_KEYS.SECTORS, INITIAL_SECTORS),
    interviews: loadLocal<InterviewRecord[]>(
      STORAGE_KEYS.INTERVIEWS,
      INITIAL_INTERVIEWS
    ),
    admins: loadLocal<AdminMemberRecord[]>(STORAGE_KEYS.ADMINS, INITIAL_ADMINS),
    config: loadLocal<DeveloperSystemConfig>(
      STORAGE_KEYS.CONFIG,
      DEFAULT_SYSTEM_CONFIG
    ),
  };
}

export function persistLocalSlice<K extends keyof typeof STORAGE_KEYS>(
  slice: K,
  value: unknown
) {
  saveLocal(STORAGE_KEYS[slice], value);
}

/**
 * Subscribes to Firestore collections when Firebase Auth user is signed in.
 */
export function subscribeFirestoreCollections(
  uid: string,
  callbacks: {
    onCollaborators: (items: CollaboratorRecord[]) => void;
    onCompanies: (items: CompanyRecord[]) => void;
    onSectors: (items: SectorRecord[]) => void;
    onInterviews: (items: InterviewRecord[]) => void;
    onAdmins: (items: AdminMemberRecord[]) => void;
  }
): () => void {
  const unsubs: Array<() => void> = [];

  const collabQuery = query(
    collection(db, 'collaborators'),
    where('ownerId', '==', uid)
  );
  unsubs.push(
    onSnapshot(
      collabQuery,
      (snap) => {
        if (!snap.empty) {
          const docs = snap.docs.map((d) => {
            const raw = d.data() as CollaboratorRecord;
            return {
              ...raw,
              twoFactorEnabled:
                raw.twoFactorEnabled !== undefined
                  ? raw.twoFactorEnabled
                  : raw.customFieldsMap?.['_twoFactorEnabled'] === 'true',
              googleUid:
                raw.googleUid || raw.customFieldsMap?.['_googleUid'] || undefined,
            };
          });
          callbacks.onCollaborators(docs);
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, 'collaborators');
        } catch {
          // Handled and logged
        }
      }
    )
  );

  const compQuery = query(
    collection(db, 'companies'),
    where('ownerId', '==', uid)
  );
  unsubs.push(
    onSnapshot(
      compQuery,
      (snap) => {
        if (!snap.empty) {
          const docs = snap.docs.map((d) => d.data() as CompanyRecord);
          callbacks.onCompanies(docs);
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, 'companies');
        } catch {
          // Handled and logged
        }
      }
    )
  );

  const secQuery = query(
    collection(db, 'sectors'),
    where('ownerId', '==', uid)
  );
  unsubs.push(
    onSnapshot(
      secQuery,
      (snap) => {
        if (!snap.empty) {
          const docs = snap.docs.map((d) => d.data() as SectorRecord);
          callbacks.onSectors(docs);
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, 'sectors');
        } catch {
          // Handled and logged
        }
      }
    )
  );

  const intQuery = query(
    collection(db, 'interviews'),
    where('ownerId', '==', uid)
  );
  unsubs.push(
    onSnapshot(
      intQuery,
      (snap) => {
        if (!snap.empty) {
          const docs = snap.docs.map((d) => d.data() as InterviewRecord);
          callbacks.onInterviews(docs);
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, 'interviews');
        } catch {
          // Handled and logged
        }
      }
    )
  );

  const admQuery = query(
    collection(db, 'admins'),
    where('ownerId', '==', uid)
  );
  unsubs.push(
    onSnapshot(
      admQuery,
      (snap) => {
        if (!snap.empty) {
          const docs = snap.docs.map((d) => d.data() as AdminMemberRecord);
          callbacks.onAdmins(docs);
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, 'admins');
        } catch {
          // Handled and logged
        }
      }
    )
  );

  return () => {
    unsubs.forEach((u) => u());
  };
}

export async function upsertCollaboratorFirestore(record: CollaboratorRecord): Promise<void> {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  const path = `collaborators/${record.id}`;
  const payload = {
    id: record.id.slice(0, 128),
    webUid: record.webUid.slice(0, 64),
    firstName: record.firstName.slice(0, 100),
    lastName: record.lastName.slice(0, 100),
    email: record.email.slice(0, 150),
    emailHint: (record.emailHint || '').slice(0, 200),
    phone: record.phone.slice(0, 30),
    age: Math.max(18, Math.min(120, Number(record.age) || 18)),
    birthDate: (record.birthDate || '').slice(0, 20),
    role: record.role.slice(0, 120),
    companyId: (record.companyId || '').slice(0, 128),
    companyName: record.companyName.slice(0, 150),
    sectorId: (record.sectorId || '').slice(0, 128),
    sectorName: record.sectorName.slice(0, 150),
    tenure: (record.tenure || '').slice(0, 80),
    accountType: record.accountType,
    acceptedTerms: true,
    registeredDate: record.registeredDate.slice(0, 30),
    customFieldsMap: {
      ...(record.customFieldsMap || {}),
      _twoFactorEnabled: String(Boolean(record.twoFactorEnabled)),
      ...(record.googleUid ? { _googleUid: record.googleUid.slice(0, 120) } : {}),
    },
    ownerId: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'collaborators', record.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeDocumentFirestore(
  collectionName: 'collaborators' | 'companies' | 'sectors' | 'interviews' | 'admins',
  docId: string
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `${collectionName}/${docId}`;
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertCompanyFirestore(record: CompanyRecord): Promise<void> {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  const path = `companies/${record.id}`;
  const payload = {
    id: record.id.slice(0, 128),
    name: record.name.slice(0, 150),
    cnpj: record.cnpj.slice(0, 30),
    segment: record.segment.slice(0, 100),
    cityState: (record.cityState || '').slice(0, 100),
    registeredDate: record.registeredDate.slice(0, 30),
    ownerId: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'companies', record.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function upsertSectorFirestore(record: SectorRecord): Promise<void> {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  const path = `sectors/${record.id}`;
  const payload = {
    id: record.id.slice(0, 128),
    name: record.name.slice(0, 150),
    companyId: record.companyId.slice(0, 128),
    companyName: record.companyName.slice(0, 150),
    managerName: record.managerName.slice(0, 150),
    headcount: Math.max(0, Math.min(100000, Number(record.headcount) || 0)),
    pressureLevel: record.pressureLevel,
    registeredDate: record.registeredDate.slice(0, 30),
    ownerId: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'sectors', record.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function upsertInterviewFirestore(record: InterviewRecord, isUpdate = false): Promise<void> {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  const path = `interviews/${record.id}`;

  if (isUpdate) {
    try {
      await updateDoc(doc(db, 'interviews', record.id), {
        managerName: record.managerName.slice(0, 150),
        roleSector: record.roleSector.slice(0, 150),
        companyName: record.companyName.slice(0, 150),
        interviewDate: record.interviewDate.slice(0, 30),
        tenure: record.tenure.slice(0, 80),
        q1DemandsAndPressure: record.q1DemandsAndPressure.slice(0, 4000),
        q2TaskDistribution: record.q2TaskDistribution.slice(0, 4000),
        q3FrequentConflicts: record.q3FrequentConflicts.slice(0, 4000),
        q4ComplaintsHandling: record.q4ComplaintsHandling.slice(0, 4000),
        q5SignificantChanges: record.q5SignificantChanges.slice(0, 4000),
        q6AttentionIndicators: record.q6AttentionIndicators.slice(0, 4000),
        q7PreventiveMeasures: record.q7PreventiveMeasures.slice(0, 4000),
        extraAnswersMap: record.extraAnswersMap || {},
        updatedAt: serverTimestamp(),
      });
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  const payload = {
    id: record.id.slice(0, 128),
    collaboratorId: (record.collaboratorId || '').slice(0, 128),
    collaboratorWebUid: record.collaboratorWebUid.slice(0, 64),
    managerName: record.managerName.slice(0, 150),
    roleSector: record.roleSector.slice(0, 150),
    companyName: record.companyName.slice(0, 150),
    interviewDate: record.interviewDate.slice(0, 30),
    tenure: record.tenure.slice(0, 80),
    q1DemandsAndPressure: record.q1DemandsAndPressure.slice(0, 4000),
    q2TaskDistribution: record.q2TaskDistribution.slice(0, 4000),
    q3FrequentConflicts: record.q3FrequentConflicts.slice(0, 4000),
    q4ComplaintsHandling: record.q4ComplaintsHandling.slice(0, 4000),
    q5SignificantChanges: record.q5SignificantChanges.slice(0, 4000),
    q6AttentionIndicators: record.q6AttentionIndicators.slice(0, 4000),
    q7PreventiveMeasures: record.q7PreventiveMeasures.slice(0, 4000),
    extraAnswersMap: record.extraAnswersMap || {},
    ownerId: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'interviews', record.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function upsertAdminMemberFirestore(record: AdminMemberRecord): Promise<void> {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  const path = `admins/${record.id}`;
  const payload = {
    id: record.id.slice(0, 128),
    identifierType: record.identifierType,
    googleUid: (record.googleUid || '').slice(0, 128),
    corporateEmail: (record.corporateEmail || '').slice(0, 150),
    displayName: record.displayName.slice(0, 150),
    sectorRole: record.sectorRole.slice(0, 100),
    registeredDate: record.registeredDate.slice(0, 30),
    ownerId: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'admins', record.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function upsertSystemConfigFirestore(config: DeveloperSystemConfig): Promise<void> {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  const path = `settings/${config.id}`;
  const payload = {
    id: config.id.slice(0, 128),
    formTitle: config.formTitle.slice(0, 150),
    formSubtitle: config.formSubtitle.slice(0, 200),
    chromePriorityNotice: config.chromePriorityNotice.slice(0, 500),
    pushNotificationsEnabled: Boolean(config.pushNotificationsEnabled),
    customQuestionsCount: config.customQuestions.length,
    customFieldsCount: config.collaboratorCustomFields.length,
    ownerId: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'settings', config.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

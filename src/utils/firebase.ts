import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Person, Recarga, HistoryItem, PaymentRatesConfig, AppState } from '../types';

// Initialize Firebase App & Firestore with firestoreDatabaseId (CRITICAL)
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Operation types for error reporting
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on initial boot (Skill Requirement)
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection: client appears offline.');
    }
    return false;
  }
}
testConnection();

// --- FIRESTORE REAL-TIME SYNCHRONIZATION HELPERS ---

/**
 * Escuta em tempo real alterações na coleção de pessoas
 */
export function subscribeToPeople(
  onData: (people: Person[]) => void,
  onError?: (error: unknown) => void
) {
  const colRef = collection(db, 'people');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Person[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as Person);
      });
      onData(list);
    },
    (error) => {
      console.error('Error listening to people from Firestore:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, 'people');
    }
  );
}

/**
 * Salva ou atualiza uma pessoa no Firestore
 */
export async function savePersonToFirestore(person: Person): Promise<void> {
  const docRef = doc(db, 'people', person.id);
  try {
    // Sanitização e formatação antes de enviar
    const payload = {
      ...person,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `people/${person.id}`);
  }
}

/**
 * Remove uma pessoa do Firestore
 */
export async function deletePersonFromFirestore(personId: string): Promise<void> {
  const docRef = doc(db, 'people', personId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `people/${personId}`);
  }
}

/**
 * Escuta em tempo real a coleção de recargas
 */
export function subscribeToRecargas(
  onData: (recs: Recarga[]) => void,
  onError?: (error: unknown) => void
) {
  const colRef = collection(db, 'recargas');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Recarga[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as Recarga);
      });
      list.sort((a, b) => a.n - b.n);
      onData(list);
    },
    (error) => {
      console.error('Error listening to recargas from Firestore:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, 'recargas');
    }
  );
}

/**
 * Salva ou atualiza uma recarga no Firestore
 */
export async function saveRecargaToFirestore(recarga: Recarga): Promise<void> {
  const docRef = doc(db, 'recargas', recarga.id);
  try {
    await setDoc(docRef, recarga, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `recargas/${recarga.id}`);
  }
}

/**
 * Salva configurações de pagamento e taxas diárias
 */
export async function saveRatesConfigToFirestore(rates: PaymentRatesConfig): Promise<void> {
  const docRef = doc(db, 'settings', 'rates');
  try {
    await setDoc(docRef, { ratesConfig: rates, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/rates');
  }
}

/**
 * Escuta alterações nas configurações de taxas
 */
export function subscribeToRatesConfig(
  onData: (rates: PaymentRatesConfig) => void,
  onError?: (error: unknown) => void
) {
  const docRef = doc(db, 'settings', 'rates');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.ratesConfig) {
          onData(data.ratesConfig as PaymentRatesConfig);
        }
      }
    },
    (error) => {
      console.error('Error listening to settings/rates:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, 'settings/rates');
    }
  );
}

/**
 * Regista ação no histórico no Firestore
 */
export async function saveHistoryToFirestore(item: HistoryItem): Promise<void> {
  const docRef = doc(db, 'history', item.id);
  try {
    await setDoc(docRef, item);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `history/${item.id}`);
  }
}

/**
 * Seed inicial: Se o Firestore estiver vazio, envia todos os dados locais
 */
export async function syncInitialDataToFirestoreIfEmpty(localState: AppState): Promise<boolean> {
  try {
    const snap = await getDocs(collection(db, 'people'));
    if (!snap.empty) {
      // Já contém dados no Firestore
      return false;
    }

    const all = [...localState.mobs, ...localState.sups, ...localState.motos];
    if (all.length === 0) return false;

    // Faz o envio em lotes de 400 (limite do Firestore é 500)
    const chunkSize = 400;
    for (let i = 0; i < all.length; i += chunkSize) {
      const chunk = all.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const p of chunk) {
        batch.set(doc(db, 'people', p.id), p);
      }
      await batch.commit();
    }

    // Salva recargas
    if (localState.recs.length > 0) {
      const recBatch = writeBatch(db);
      for (const r of localState.recs) {
        recBatch.set(doc(db, 'recargas', r.id), r);
      }
      await recBatch.commit();
    }

    return true;
  } catch (err) {
    console.error('Error seeding initial data to Firestore:', err);
    return false;
  }
}

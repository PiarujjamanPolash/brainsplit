
import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { Agency, Transaction, Settlement } from './types';

const DEFAULT_AGENCY_ID = 'braingig-hq';

export const DEFAULT_AGENCY: Agency = {
  id: DEFAULT_AGENCY_ID,
  name: 'Braingig LLC',
  partners: [
    { id: 'p1', email: 'alice@braingig.com', name: 'Alice Smith', sharePercentage: 60 },
    { id: 'p2', email: 'bob@braingig.com', name: 'Bob Jones', sharePercentage: 40 },
  ],
};

// Agency Operations
export async function getAgency(id: string = DEFAULT_AGENCY_ID): Promise<Agency> {
  const docRef = doc(db, 'agencies', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as Agency;
  }
  // Create default if not exists
  await setDoc(docRef, DEFAULT_AGENCY);
  return DEFAULT_AGENCY;
}

export async function updateAgency(agency: Agency) {
  const docRef = doc(db, 'agencies', agency.id);
  await updateDoc(docRef, { ...agency });
}

// Transaction Operations
export async function getTransactions(agencyId: string = DEFAULT_AGENCY_ID): Promise<Transaction[]> {
  const colRef = collection(db, 'agencies', agencyId, 'transactions');
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
}

export async function addTransaction(transaction: Omit<Transaction, 'id'>, agencyId: string = DEFAULT_AGENCY_ID) {
  const colRef = collection(db, 'agencies', agencyId, 'transactions');
  const docRef = await addDoc(colRef, transaction);
  return docRef.id;
}

export async function updateTransaction(transaction: Transaction, agencyId: string = DEFAULT_AGENCY_ID) {
  const docRef = doc(db, 'agencies', agencyId, 'transactions', transaction.id);
  await updateDoc(docRef, { ...transaction });
}

// Settlement Operations
export async function getSettlements(agencyId: string = DEFAULT_AGENCY_ID): Promise<Settlement[]> {
  const colRef = collection(db, 'agencies', agencyId, 'settlements');
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Settlement));
}

export async function addSettlement(settlement: Omit<Settlement, 'id'>, agencyId: string = DEFAULT_AGENCY_ID) {
  const colRef = collection(db, 'agencies', agencyId, 'settlements');
  const docRef = await addDoc(colRef, settlement);
  return docRef.id;
}

export async function deleteTransaction(id: string, agencyId: string = DEFAULT_AGENCY_ID) {
  const docRef = doc(db, 'agencies', agencyId, 'transactions', id);
  await deleteDoc(docRef);
}

export async function deleteSettlement(id: string, agencyId: string = DEFAULT_AGENCY_ID) {
  const docRef = doc(db, 'agencies', agencyId, 'settlements', id);
  await deleteDoc(docRef);
}

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { NewSimulationRecord, SimulationRecord } from '../types';

const COLLECTION = 'simulations';

/** 試算レコードを保存 */
export async function saveSimulation(record: NewSimulationRecord): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...record,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** 全試算レコードを新しい順に取得 */
export async function listSimulations(): Promise<SimulationRecord[]> {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const createdAt =
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : new Date().toISOString();
    return { id: d.id, ...(data as Omit<SimulationRecord, 'id' | 'createdAt'>), createdAt };
  });
}

/** 試算レコードを削除 */
export async function deleteSimulation(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

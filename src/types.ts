import type { SimulationInput, SimulationResult } from './lib/furusato';

/** Firestore に保存する試算レコード */
export interface SimulationRecord {
  id: string;
  /** 顧客名 */
  customerName: string;
  /** 顧客メモ（任意） */
  memo: string;
  /** 試算の対象年（例: 2026） */
  targetYear: number;
  /** 入力値 */
  input: SimulationInput;
  /** 結果のサマリ（一覧表示・再計算検証用） */
  result: SimulationResult;
  /** 作成者の UID */
  createdByUid: string;
  /** 作成者の表示名/メール */
  createdByEmail: string;
  /** 作成日時（ISO 文字列） */
  createdAt: string;
}

export type NewSimulationRecord = Omit<SimulationRecord, 'id' | 'createdAt'>;

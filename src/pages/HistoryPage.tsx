import { useEffect, useState } from 'react';
import { deleteSimulation, listSimulations } from '../firebase/simulations';
import type { SimulationRecord } from '../types';
import { formatDateTime, yen } from '../lib/format';

export default function HistoryPage() {
  const [records, setRecords] = useState<SimulationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRecords(await listSimulations());
    } catch {
      setError('履歴の読み込みに失敗しました。Firebase設定・権限をご確認ください。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (id: string) => {
    if (!window.confirm('この試算履歴を削除しますか？')) return;
    try {
      await deleteSimulation(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError('削除に失敗しました。');
    }
  };

  const filtered = keyword.trim()
    ? records.filter((r) => r.customerName.includes(keyword.trim()))
    : records;

  return (
    <div className="card">
      <h2>試算履歴</h2>
      <p className="card-desc">保存された試算結果の一覧です（新しい順）。</p>

      <div className="field" style={{ maxWidth: 280, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="顧客名で絞り込み"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      {error && <div className="error-msg">{error}</div>}

      {loading ? (
        <div className="empty">読み込み中…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">該当する履歴がありません。</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>日時</th>
              <th>顧客名</th>
              <th>対象年</th>
              <th style={{ textAlign: 'right' }}>給与収入</th>
              <th style={{ textAlign: 'right' }}>控除上限額</th>
              <th>担当</th>
              <th>メモ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{formatDateTime(r.createdAt)}</td>
                <td>{r.customerName}</td>
                <td>{r.targetYear}年</td>
                <td className="num">{yen(r.input.salaryIncome)}</td>
                <td className="num" style={{ fontWeight: 700, color: '#0b6b5e' }}>
                  {yen(r.result.donationLimit)}
                </td>
                <td>{r.createdByEmail}</td>
                <td>{r.memo}</td>
                <td>
                  <button className="btn btn-danger" onClick={() => onDelete(r.id)}>
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

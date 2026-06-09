import { useMemo, useState } from 'react';
import { defaultInput, simulate, type SimulationInput } from '../lib/furusato';
import SimulationForm from '../components/SimulationForm';
import ResultCard from '../components/ResultCard';
import { saveSimulation } from '../firebase/simulations';
import { useAuth } from '../contexts/AuthContext';

export default function SimulatorPage() {
  const { user } = useAuth();
  const [input, setInput] = useState<SimulationInput>(defaultInput());
  const [customerName, setCustomerName] = useState('');
  const [memo, setMemo] = useState('');
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 入力に応じてリアルタイムに再計算
  const result = useMemo(() => simulate(input), [input]);

  const onSave = async () => {
    setErrorMsg('');
    setSavedMsg('');
    if (!customerName.trim()) {
      setErrorMsg('顧客名を入力してください。');
      return;
    }
    if (!user) {
      setErrorMsg(
        '保存先の認証が未確立です。開発モードでは Firebase の匿名認証を有効化し、Firestore を作成すると保存できます。',
      );
      return;
    }
    setSaving(true);
    try {
      await saveSimulation({
        customerName: customerName.trim(),
        memo: memo.trim(),
        targetYear,
        input,
        result,
        createdByUid: user.uid,
        createdByEmail: user.email ?? (user.isAnonymous ? '開発モード（匿名）' : ''),
      });
      setSavedMsg('試算結果を履歴に保存しました。');
    } catch {
      setErrorMsg('保存に失敗しました。通信環境とFirebase設定をご確認ください。');
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    setInput(defaultInput());
    setCustomerName('');
    setMemo('');
    setSavedMsg('');
    setErrorMsg('');
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', alignItems: 'start' }}>
      <div>
        <SimulationForm input={input} onChange={setInput} />
      </div>

      <div>
        <ResultCard result={result} />

        <div className="card">
          <h2>顧客情報・保存</h2>
          <p className="card-desc">試算条件と結果を履歴に残します。</p>

          {savedMsg && <div className="warning" style={{ background: '#eaf6f1', borderColor: '#bfe3d6', color: '#0b6b5e' }}>{savedMsg}</div>}
          {errorMsg && <div className="error-msg">{errorMsg}</div>}

          <div className="field" style={{ marginBottom: 12 }}>
            <label>顧客名 *</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="例）山田 太郎"
            />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>対象年</label>
            <div className="input-wrap">
              <input
                type="number"
                value={targetYear}
                min={2015}
                max={2100}
                step={1}
                onChange={(e) => setTargetYear(e.target.valueAsNumber || targetYear)}
              />
              <span className="unit">年</span>
            </div>
          </div>
          <div className="field">
            <label>メモ</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="任意（相談内容など）"
            />
          </div>

          <div className="btn-row">
            <button className="btn" onClick={onSave} disabled={saving}>
              {saving ? '保存中…' : '履歴に保存'}
            </button>
            <button className="btn btn-secondary" onClick={onReset}>
              入力をリセット
            </button>
          </div>

          <p className="disclaimer">
            ※本試算は給与所得者を前提とした「目安」です。総務省の基本式に基づき各種所得控除を加味していますが、
            自治体ごとの調整控除の差異、住宅ローン控除等の税額控除との併用、最新の税制改正の細部までは反映していない場合があります。
            最終的な控除額は確定申告・住民税通知書等でご確認ください。
          </p>
        </div>
      </div>
    </div>
  );
}

import type { Dependents, SimulationInput, SpouseType } from '../lib/furusato';
import NumberField from './NumberField';

interface Props {
  input: SimulationInput;
  onChange: (next: SimulationInput) => void;
}

export default function SimulationForm({ input, onChange }: Props) {
  const set = <K extends keyof SimulationInput>(key: K, value: SimulationInput[K]) =>
    onChange({ ...input, [key]: value });

  const setDep = <K extends keyof Dependents>(key: K, value: number) =>
    onChange({ ...input, dependents: { ...input.dependents, [key]: Math.max(0, value) } });

  return (
    <div className="card">
      <h2>試算条件の入力</h2>
      <p className="card-desc">給与収入者向け。源泉徴収票の金額を入力すると精度が上がります。</p>

      <div className="section-title">収入・社会保険料</div>
      <div className="grid">
        <NumberField
          label="給与収入（額面・年間）"
          value={input.salaryIncome}
          onChange={(v) => set('salaryIncome', v)}
          hint="源泉徴収票の「支払金額」"
        />
        <div className="field">
          <label>社会保険料控除</label>
          <div className="checkbox-row" style={{ marginBottom: 6 }}>
            <input
              id="autoSI"
              type="checkbox"
              checked={input.autoSocialInsurance}
              onChange={(e) => set('autoSocialInsurance', e.target.checked)}
            />
            <label htmlFor="autoSI" style={{ fontWeight: 400 }}>
              給与収入の15%で自動推計する
            </label>
          </div>
          <div className="input-wrap">
            <input
              type="number"
              min={0}
              step={10000}
              disabled={input.autoSocialInsurance}
              value={input.socialInsurance ?? 0}
              onChange={(e) =>
                set('socialInsurance', Math.max(0, e.target.valueAsNumber || 0))
              }
            />
            <span className="unit">円</span>
          </div>
          <span className="hint">源泉徴収票の「社会保険料等の金額」</span>
        </div>
      </div>

      <div className="section-title">配偶者</div>
      <div className="grid">
        <div className="field">
          <label>配偶者区分</label>
          <select
            value={input.spouseType}
            onChange={(e) => set('spouseType', e.target.value as SpouseType)}
          >
            <option value="none">なし（配偶者控除対象外）</option>
            <option value="general">あり（一般）</option>
            <option value="elderly">あり（70歳以上・老人）</option>
          </select>
        </div>
        <NumberField
          label="配偶者の合計所得金額"
          value={input.spouseIncome}
          onChange={(v) => set('spouseIncome', v)}
          step={10000}
          disabled={input.spouseType === 'none'}
          hint="48万円以下で配偶者控除、〜133万円で配偶者特別控除（概算）"
        />
      </div>

      <div className="section-title">扶養家族（人数）</div>
      <div className="grid grid-3">
        <NumberField
          label="一般扶養（16〜18,23〜69歳）"
          value={input.dependents.general}
          onChange={(v) => setDep('general', v)}
          unit="人"
          step={1}
        />
        <NumberField
          label="特定扶養（19〜22歳）"
          value={input.dependents.specific}
          onChange={(v) => setDep('specific', v)}
          unit="人"
          step={1}
        />
        <NumberField
          label="老人扶養・別居（70歳〜）"
          value={input.dependents.elderly}
          onChange={(v) => setDep('elderly', v)}
          unit="人"
          step={1}
        />
        <NumberField
          label="同居老親等（70歳〜）"
          value={input.dependents.elderlyLivingTogether}
          onChange={(v) => setDep('elderlyLivingTogether', v)}
          unit="人"
          step={1}
        />
        <NumberField
          label="年少扶養（〜15歳）"
          value={input.dependents.under16}
          onChange={(v) => setDep('under16', v)}
          unit="人"
          step={1}
          hint="控除額0（参考人数）"
        />
      </div>

      <div className="section-title">各種所得控除</div>
      <div className="grid grid-3">
        <NumberField
          label="生命保険料控除"
          value={input.lifeInsuranceDeduction}
          onChange={(v) => set('lifeInsuranceDeduction', v)}
          step={1000}
        />
        <NumberField
          label="地震保険料控除"
          value={input.earthquakeInsuranceDeduction}
          onChange={(v) => set('earthquakeInsuranceDeduction', v)}
          step={1000}
        />
        <NumberField
          label="iDeCo等 掛金（小規模企業共済等）"
          value={input.smallEnterpriseMutualAid}
          onChange={(v) => set('smallEnterpriseMutualAid', v)}
          step={1000}
        />
        <NumberField
          label="医療費控除"
          value={input.medicalDeduction}
          onChange={(v) => set('medicalDeduction', v)}
          step={1000}
        />
        <NumberField
          label="その他の所得控除"
          value={input.otherDeduction}
          onChange={(v) => set('otherDeduction', v)}
          step={1000}
        />
        <NumberField
          label="住宅ローン控除（税額控除）"
          value={input.housingLoanCredit}
          onChange={(v) => set('housingLoanCredit', v)}
          step={1000}
          hint="併用時は注意喚起を表示"
        />
      </div>
    </div>
  );
}

import { Fragment, useState } from 'react';
import type { SimulationInput, SimulationResult } from '../lib/furusato';
import { pct, yen } from '../lib/format';
import { explainRow, type RowKey } from '../lib/explain';

interface Row {
  key: RowKey;
  label: string;
  value: string;
}

export default function ResultCard({
  input,
  result,
}: {
  input: SimulationInput;
  result: SimulationResult;
}) {
  const [open, setOpen] = useState<RowKey | null>(null);

  const rows: Row[] = [
    { key: 'employmentIncomeDeduction', label: '給与所得控除', value: yen(result.employmentIncomeDeduction) },
    { key: 'employmentIncome', label: '給与所得（合計所得金額）', value: yen(result.employmentIncome) },
    { key: 'socialInsurance', label: '社会保険料控除（採用額）', value: yen(result.socialInsuranceUsed) },
    { key: 'totalDeductionIncomeTax', label: '所得控除合計（所得税）', value: yen(result.totalDeductionIncomeTax) },
    { key: 'totalDeductionResidentTax', label: '所得控除合計（住民税）', value: yen(result.totalDeductionResidentTax) },
    { key: 'taxableIncomeIncomeTax', label: '課税所得（所得税）', value: yen(result.taxableIncomeIncomeTax) },
    { key: 'taxableIncomeResidentTax', label: '課税所得（住民税）', value: yen(result.taxableIncomeResidentTax) },
    { key: 'incomeTaxRate', label: '所得税の限界税率', value: pct(result.incomeTaxRate) },
    { key: 'residentTaxIncomeLevy', label: '住民税所得割額', value: yen(result.residentTaxIncomeLevy) },
  ];

  const toggle = (key: RowKey) => setOpen((cur) => (cur === key ? null : key));

  return (
    <div className="card">
      <div className="result-hero">
        <div className="label">ふるさと納税 控除上限額（目安）</div>
        <div className="amount">
          {result.donationLimit.toLocaleString('ja-JP')}
          <small>円</small>
        </div>
        <div className="sub">自己負担 2,000 円で寄附できる上限額の目安です</div>
        <button
          type="button"
          className="hero-explain"
          onClick={() => toggle('donationLimit')}
          aria-expanded={open === 'donationLimit'}
        >
          {open === 'donationLimit' ? '計算過程を閉じる ▲' : 'この金額の計算過程を見る ▼'}
        </button>
        {open === 'donationLimit' && (
          <div className="hero-steps">
            {explainRow('donationLimit', input, result).map((s, i) => (
              <div key={i} className="step-line">{s}</div>
            ))}
          </div>
        )}
      </div>

      {result.warnings.map((w, i) => (
        <div className="warning" key={i}>
          ⚠ {w}
        </div>
      ))}

      <div className="section-title">計算の内訳（項目をクリックで計算過程を表示）</div>
      <table className="breakdown">
        <tbody>
          {rows.map((row) => {
            const isOpen = open === row.key;
            return (
              <Fragment key={row.key}>
                <tr
                  className={`expandable-row ${isOpen ? 'open' : ''}`}
                  onClick={() => toggle(row.key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggle(row.key);
                    }
                  }}
                >
                  <td>
                    <span className={`caret ${isOpen ? 'open' : ''}`}>▶</span>
                    {row.label}
                  </td>
                  <td>{row.value}</td>
                </tr>
                {isOpen && (
                  <tr className="steps-row">
                    <td colSpan={2}>
                      <div className="steps">
                        {explainRow(row.key, input, result).map((s, i) => (
                          <div key={i} className="step-line">{s}</div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

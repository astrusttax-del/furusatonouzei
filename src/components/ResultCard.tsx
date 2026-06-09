import type { SimulationResult } from '../lib/furusato';
import { pct, yen } from '../lib/format';

export default function ResultCard({ result }: { result: SimulationResult }) {
  return (
    <div className="card">
      <div className="result-hero">
        <div className="label">ふるさと納税 控除上限額（目安）</div>
        <div className="amount">
          {result.donationLimit.toLocaleString('ja-JP')}
          <small>円</small>
        </div>
        <div className="sub">自己負担 2,000 円で寄附できる上限額の目安です</div>
      </div>

      {result.warnings.map((w, i) => (
        <div className="warning" key={i}>
          ⚠ {w}
        </div>
      ))}

      <div className="section-title">計算の内訳</div>
      <table className="breakdown">
        <tbody>
          <tr>
            <td>給与所得控除</td>
            <td>{yen(result.employmentIncomeDeduction)}</td>
          </tr>
          <tr>
            <td>給与所得（合計所得金額）</td>
            <td>{yen(result.employmentIncome)}</td>
          </tr>
          <tr>
            <td>社会保険料控除（採用額）</td>
            <td>{yen(result.socialInsuranceUsed)}</td>
          </tr>
          <tr>
            <td>所得控除合計（所得税）</td>
            <td>{yen(result.totalDeductionIncomeTax)}</td>
          </tr>
          <tr>
            <td>所得控除合計（住民税）</td>
            <td>{yen(result.totalDeductionResidentTax)}</td>
          </tr>
          <tr>
            <td>課税所得（所得税）</td>
            <td>{yen(result.taxableIncomeIncomeTax)}</td>
          </tr>
          <tr>
            <td>課税所得（住民税）</td>
            <td>{yen(result.taxableIncomeResidentTax)}</td>
          </tr>
          <tr>
            <td>所得税の限界税率</td>
            <td>{pct(result.incomeTaxRate)}</td>
          </tr>
          <tr>
            <td>住民税所得割額</td>
            <td>{yen(result.residentTaxIncomeLevy)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

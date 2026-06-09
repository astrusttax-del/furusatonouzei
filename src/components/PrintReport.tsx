import type { SimulationInput, SimulationResult, SpouseType } from '../lib/furusato';
import { pct, yen } from '../lib/format';

interface Props {
  customerName: string;
  memo: string;
  targetYear: number;
  staffName: string;
  input: SimulationInput;
  result: SimulationResult;
}

const spouseLabel: Record<SpouseType, string> = {
  none: 'なし',
  general: 'あり（一般）',
  elderly: 'あり（70歳以上・老人）',
};

/** 入力された控除のうち 0 円でないものだけを行にする */
function deductionRows(input: SimulationInput): Array<[string, number]> {
  const rows: Array<[string, number]> = [
    ['生命保険料控除', input.lifeInsuranceDeduction],
    ['地震保険料控除', input.earthquakeInsuranceDeduction],
    ['iDeCo等 掛金（小規模企業共済等）', input.smallEnterpriseMutualAid],
    ['医療費控除', input.medicalDeduction],
    ['その他の所得控除', input.otherDeduction],
    ['住宅ローン控除（税額控除）', input.housingLoanCredit],
  ];
  return rows.filter(([, v]) => v > 0);
}

/** 扶養家族の内訳（人数>0のみ） */
function dependentSummary(input: SimulationInput): string {
  const d = input.dependents;
  const parts: string[] = [];
  if (d.general) parts.push(`一般 ${d.general}人`);
  if (d.specific) parts.push(`特定 ${d.specific}人`);
  if (d.elderly) parts.push(`老人(別居) ${d.elderly}人`);
  if (d.elderlyLivingTogether) parts.push(`同居老親 ${d.elderlyLivingTogether}人`);
  if (d.under16) parts.push(`年少 ${d.under16}人`);
  return parts.length ? parts.join(' / ') : 'なし';
}

export default function PrintReport({
  customerName,
  memo,
  targetYear,
  staffName,
  input,
  result,
}: Props) {
  const now = new Date();
  const issuedDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const extraDeductions = deductionRows(input);

  return (
    <div className="print-report">
      {/* ヘッダー */}
      <div className="pr-head">
        <div className="pr-title">
          <h1>ふるさと納税 控除上限額 試算報告書</h1>
          <p className="pr-sub">寄附金控除に関するシミュレーション結果のご案内</p>
        </div>
        <div className="pr-issue">
          <div>発行日：{issuedDate}</div>
          <div>対象年：{targetYear}年</div>
        </div>
      </div>

      {/* 宛名・担当 */}
      <table className="pr-meta">
        <tbody>
          <tr>
            <th>お客様名</th>
            <td className="pr-customer">{customerName || '（未入力）'} 様</td>
            <th>ご担当</th>
            <td>{staffName || '―'}</td>
          </tr>
          {memo && (
            <tr>
              <th>備考</th>
              <td colSpan={3}>{memo}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 結果ハイライト */}
      <div className="pr-result">
        <div className="pr-result-label">控除上限額（自己負担2,000円で寄附できる目安額）</div>
        <div className="pr-result-amount">{result.donationLimit.toLocaleString('ja-JP')} 円</div>
      </div>

      {/* 試算条件 */}
      <h2 className="pr-section">試算条件</h2>
      <table className="pr-table">
        <tbody>
          <tr>
            <th>給与収入（額面・年間）</th>
            <td>{yen(input.salaryIncome)}</td>
            <th>社会保険料控除</th>
            <td>
              {yen(result.socialInsuranceUsed)}
              {input.autoSocialInsurance ? '（概算15%）' : ''}
            </td>
          </tr>
          <tr>
            <th>配偶者</th>
            <td>
              {spouseLabel[input.spouseType]}
              {input.spouseType !== 'none' && input.spouseIncome > 0
                ? `（所得 ${yen(input.spouseIncome)}）`
                : ''}
            </td>
            <th>扶養家族</th>
            <td>{dependentSummary(input)}</td>
          </tr>
          {extraDeductions.length > 0 && (
            <tr>
              <th>その他の控除</th>
              <td colSpan={3}>
                {extraDeductions.map(([k, v]) => `${k}：${yen(v)}`).join(' ／ ')}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 計算内訳 */}
      <h2 className="pr-section">計算内訳</h2>
      <table className="pr-table pr-breakdown">
        <tbody>
          <tr>
            <th>給与所得控除</th>
            <td>{yen(result.employmentIncomeDeduction)}</td>
            <th>給与所得（合計所得金額）</th>
            <td>{yen(result.employmentIncome)}</td>
          </tr>
          <tr>
            <th>所得控除合計（所得税）</th>
            <td>{yen(result.totalDeductionIncomeTax)}</td>
            <th>所得控除合計（住民税）</th>
            <td>{yen(result.totalDeductionResidentTax)}</td>
          </tr>
          <tr>
            <th>課税所得（所得税）</th>
            <td>{yen(result.taxableIncomeIncomeTax)}</td>
            <th>課税所得（住民税）</th>
            <td>{yen(result.taxableIncomeResidentTax)}</td>
          </tr>
          <tr>
            <th>所得税の限界税率</th>
            <td>{pct(result.incomeTaxRate)}</td>
            <th>住民税所得割額</th>
            <td>{yen(result.residentTaxIncomeLevy)}</td>
          </tr>
        </tbody>
      </table>

      {/* 注意事項 */}
      <h2 className="pr-section">ご注意</h2>
      <ul className="pr-notes">
        <li>
          本報告書の金額は給与所得者を前提とした「目安」です。総務省が示す基本式に基づき各種所得控除を加味して算出しています。
        </li>
        <li>
          自治体ごとの調整控除の差異、配偶者特別控除の概算、住宅ローン控除など税額控除との併用、最新の税制改正の細部までは反映していない場合があります。
        </li>
        <li>最終的な控除額は、確定申告・住民税決定通知書等によりご確認ください。</li>
      </ul>

      {/* フッター（会社情報プレースホルダ） */}
      <div className="pr-footer">
        <span>本報告書は試算ツールにより自動作成されたものです。</span>
        <span className="pr-company">担当：{staffName || '―'}</span>
      </div>
    </div>
  );
}

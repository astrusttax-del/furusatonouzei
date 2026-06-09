/**
 * 計算過程の説明文生成
 * ---------------------------------------------------------------------------
 * ResultCard の各行に対応した「計算過程」を、入力値と計算結果から再構成する。
 * 計算ロジック本体（furusato.ts）と同じ定数・同じ中間値を用いるため、表示と実際の
 * 計算がズレない。各関数は人間可読の文字列配列（手順）を返す。
 * ---------------------------------------------------------------------------
 */
import type { SimulationInput, SimulationResult } from './furusato';
import { CONST } from './taxConstants';
import { yen, pct } from './format';

/** 内訳行のキー */
export type RowKey =
  | 'employmentIncomeDeduction'
  | 'employmentIncome'
  | 'socialInsurance'
  | 'totalDeductionIncomeTax'
  | 'totalDeductionResidentTax'
  | 'taxableIncomeIncomeTax'
  | 'taxableIncomeResidentTax'
  | 'incomeTaxRate'
  | 'residentTaxIncomeLevy'
  | 'donationLimit';

/** 給与所得控除の計算過程 */
function empDeductionSteps(input: SimulationInput, r: SimulationResult): string[] {
  const s = Math.max(0, input.salaryIncome);
  const v = yen(r.employmentIncomeDeduction);
  if (s <= 0) return ['給与収入が0円のため、給与所得控除は0円です。'];
  if (s <= 1_625_000)
    return [`給与収入 ${yen(s)} ≦ 1,625,000円`, `給与所得控除 = 550,000円（一律） = ${v}`];
  if (s <= 1_800_000)
    return [
      `給与収入 ${yen(s)} は 1,625,001〜1,800,000円`,
      `給与所得控除 = 収入 × 40% − 100,000円`,
      `= ${yen(s)} × 40% − 100,000 = ${v}`,
    ];
  if (s <= 3_600_000)
    return [
      `給与収入 ${yen(s)} は 1,800,001〜3,600,000円`,
      `給与所得控除 = 収入 × 30% + 80,000円`,
      `= ${yen(s)} × 30% + 80,000 = ${v}`,
    ];
  if (s <= 6_600_000)
    return [
      `給与収入 ${yen(s)} は 3,600,001〜6,600,000円`,
      `給与所得控除 = 収入 × 20% + 440,000円`,
      `= ${yen(s)} × 20% + 440,000 = ${v}`,
    ];
  if (s <= 8_500_000)
    return [
      `給与収入 ${yen(s)} は 6,600,001〜8,500,000円`,
      `給与所得控除 = 収入 × 10% + 1,100,000円`,
      `= ${yen(s)} × 10% + 1,100,000 = ${v}`,
    ];
  return [`給与収入 ${yen(s)} > 8,500,000円`, `給与所得控除 = 1,950,000円（上限） = ${v}`];
}

/** 所得控除合計の計算過程 */
function deductionTotalSteps(r: SimulationResult, kind: 'income' | 'resident'): string[] {
  const c = kind === 'income' ? r.breakdown.incomeTax : r.breakdown.residentTax;
  const total = kind === 'income' ? r.totalDeductionIncomeTax : r.totalDeductionResidentTax;
  const rows: Array<[string, number]> = [
    ['基礎控除', c.basic],
    ['社会保険料控除', c.socialInsurance],
    ['配偶者控除', c.spouse],
    ['扶養控除', c.dependent],
    ['生命保険料控除', c.lifeInsurance],
    ['地震保険料控除', c.earthquakeInsurance],
    ['iDeCo等掛金控除', c.smallEnterpriseMutualAid],
    ['医療費控除', c.medical],
    ['その他の所得控除', c.other],
  ];
  const lines = rows.filter(([, v]) => v > 0).map(([k, v]) => `${k}：${yen(v)}`);
  lines.push(`合計 = ${yen(total)}`);
  if (kind === 'resident') {
    lines.unshift('※住民税は基礎控除・配偶者控除・扶養控除の額が所得税と異なります。');
  }
  return lines;
}

/** 課税所得の計算過程 */
function taxableIncomeSteps(r: SimulationResult, kind: 'income' | 'resident'): string[] {
  const total = kind === 'income' ? r.totalDeductionIncomeTax : r.totalDeductionResidentTax;
  const taxable = kind === 'income' ? r.taxableIncomeIncomeTax : r.taxableIncomeResidentTax;
  const raw = Math.max(0, r.employmentIncome - total);
  const label = kind === 'income' ? '所得税' : '住民税';
  return [
    `課税所得（${label}）= 給与所得 − 所得控除合計（${label}）`,
    `= ${yen(r.employmentIncome)} − ${yen(total)} = ${yen(raw)}`,
    `1,000円未満を切り捨て → ${yen(taxable)}`,
  ];
}

/** 所得税の限界税率の計算過程 */
function incomeTaxRateSteps(r: SimulationResult): string[] {
  const ti = r.taxableIncomeIncomeTax;
  const labels = [
    '1,950,000円以下',
    '1,950,001〜3,300,000円',
    '3,300,001〜6,950,000円',
    '6,950,001〜9,000,000円',
    '9,000,001〜18,000,000円',
    '18,000,001〜40,000,000円',
    '40,000,001円超',
  ];
  let idx = CONST.incomeTaxBrackets.findIndex((b) => ti <= b.upTo);
  if (idx < 0) idx = CONST.incomeTaxBrackets.length - 1;
  return [
    `課税所得（所得税）${yen(ti)} は ${labels[idx]}`,
    `所得税の限界税率 = ${pct(r.incomeTaxRate)}`,
    'この税率は控除上限額の式の分母に用います。',
  ];
}

/** 住民税所得割額の計算過程 */
function residentLevySteps(r: SimulationResult): string[] {
  const ti = r.taxableIncomeResidentTax;
  const base = Math.floor(ti * CONST.residentTaxRate);
  return [
    '住民税所得割 = 課税所得（住民税）× 10%（道府県民税4%＋市町村民税6%）− 調整控除',
    `= ${yen(ti)} × 10% − ${yen(r.breakdown.adjustmentCredit)}`,
    `= ${yen(base)} − ${yen(r.breakdown.adjustmentCredit)} = ${yen(r.residentTaxIncomeLevy)}`,
    '※調整控除は簡易計算（固定額）です。',
  ];
}

/** 控除上限額の計算過程 */
function donationLimitSteps(r: SimulationResult): string[] {
  if (r.residentTaxIncomeLevy <= 0) {
    return ['住民税所得割が0円のため、控除上限額は0円です。'];
  }
  const denom = 0.9 - r.incomeTaxRate * CONST.reconstructionFactor;
  const numerator = r.residentTaxIncomeLevy * 0.2;
  return [
    '控除上限額 = 住民税所得割 × 20% ÷ (90% − 所得税率 × 1.021) + 2,000円',
    `= ${yen(r.residentTaxIncomeLevy)} × 20% ÷ (0.9 − ${r.incomeTaxRate} × 1.021) + 2,000`,
    `= ${yen(numerator)} ÷ ${denom.toFixed(5)} + 2,000`,
    `≒ ${yen(numerator / denom + 2000)}`,
    `100円未満を切り捨て → ${yen(r.donationLimit)}`,
    '（1.021は復興特別所得税2.1%を加味した係数）',
  ];
}

/** 行キーに対応する計算過程を返す */
export function explainRow(key: RowKey, input: SimulationInput, r: SimulationResult): string[] {
  switch (key) {
    case 'employmentIncomeDeduction':
      return empDeductionSteps(input, r);
    case 'employmentIncome':
      return [
        '給与所得 = 給与収入 − 給与所得控除',
        `= ${yen(Math.max(0, input.salaryIncome))} − ${yen(r.employmentIncomeDeduction)} = ${yen(r.employmentIncome)}`,
        '給与のみの場合、この額が合計所得金額になります。',
      ];
    case 'socialInsurance':
      return input.autoSocialInsurance
        ? [
            '社会保険料を給与収入の15%で自動推計しています。',
            `= ${yen(Math.max(0, input.salaryIncome))} × 15% = ${yen(r.socialInsuranceUsed)}`,
            '※源泉徴収票の「社会保険料等の金額」を入力すると精度が上がります。',
          ]
        : [`入力された社会保険料控除額をそのまま使用：${yen(r.socialInsuranceUsed)}`];
    case 'totalDeductionIncomeTax':
      return deductionTotalSteps(r, 'income');
    case 'totalDeductionResidentTax':
      return deductionTotalSteps(r, 'resident');
    case 'taxableIncomeIncomeTax':
      return taxableIncomeSteps(r, 'income');
    case 'taxableIncomeResidentTax':
      return taxableIncomeSteps(r, 'resident');
    case 'incomeTaxRate':
      return incomeTaxRateSteps(r);
    case 'residentTaxIncomeLevy':
      return residentLevySteps(r);
    case 'donationLimit':
      return donationLimitSteps(r);
    default:
      return [];
  }
}

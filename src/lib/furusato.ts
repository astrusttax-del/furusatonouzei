/**
 * ふるさと納税 控除上限額シミュレーション 計算エンジン
 * ---------------------------------------------------------------------------
 * 給与所得者を主対象に、各種所得控除を加味して
 *  - 所得税の課税所得 / 住民税の課税所得
 *  - 所得税の限界税率
 *  - 住民税所得割額
 *  - ふるさと納税 控除上限額（自己負担 2,000 円で済む寄附額の目安）
 * を算出する。
 *
 * ▼控除上限額の基本式（総務省の説明に基づく）
 *   控除上限額 = 住民税所得割額 × 20%
 *               ÷ (100% − 住民税基本分10% − 所得税率 × 1.021)  + 2,000
 *
 *   分母の 100% − 10% = 90% が「特例控除分」の計算ベース。
 *   1.021 は復興特別所得税（2.1%）を加味した係数。
 *
 * ※あくまで目安。住宅ローン控除や寄附金以外の税額控除との併用、
 *   各自治体の調整控除の差異等により実際の上限額は前後する。
 * ---------------------------------------------------------------------------
 */

import { CONST } from './taxConstants';

/** 配偶者区分 */
export type SpouseType = 'none' | 'general' | 'elderly'; // なし / 一般 / 老人(70歳以上)

/** 扶養家族の人数（区分別） */
export interface Dependents {
  /** 一般扶養（16〜18歳, 23〜69歳）控除: 所38万/住33万 */
  general: number;
  /** 特定扶養（19〜22歳）控除: 所63万/住45万 */
  specific: number;
  /** 老人扶養・同居老親以外（70歳以上）控除: 所48万/住38万 */
  elderly: number;
  /** 老人扶養・同居老親等（70歳以上）控除: 所58万/住45万 */
  elderlyLivingTogether: number;
  /** 年少扶養（〜15歳）控除額0だが人数として保持（児童手当対象） */
  under16: number;
}

/** シミュレーション入力 */
export interface SimulationInput {
  /** 給与収入（額面・年間, 円） */
  salaryIncome: number;
  /**
   * 社会保険料控除（円）。
   * undefined の場合は給与収入の概算（既定 15%）で自動推計する。
   */
  socialInsurance?: number;
  /** 社会保険料を自動推計するか（true のとき socialInsurance を無視して概算） */
  autoSocialInsurance: boolean;

  /** 配偶者区分 */
  spouseType: SpouseType;
  /** 配偶者の合計所得金額（円）。配偶者控除/配偶者特別控除の判定に使用 */
  spouseIncome: number;

  /** 扶養家族 */
  dependents: Dependents;

  /** 生命保険料控除（円, 所得税ベースの控除額をそのまま入力） */
  lifeInsuranceDeduction: number;
  /** 地震保険料控除（円） */
  earthquakeInsuranceDeduction: number;
  /** 小規模企業共済等掛金控除（iDeCo 等, 円・年間掛金） */
  smallEnterpriseMutualAid: number;
  /** 医療費控除（円, 控除額） */
  medicalDeduction: number;
  /** その他の所得控除（円, 任意の追加分） */
  otherDeduction: number;

  /**
   * 住宅ローン控除（税額控除額, 円・年間）。
   * 控除上限額の基本式には直接含めないが、所得税側で控除しきれない場合に
   * ふるさと納税の実質メリットへ影響しうる旨を警告として提示する。
   */
  housingLoanCredit: number;
}

/** シミュレーション結果 */
export interface SimulationResult {
  /** 給与所得（給与収入 − 給与所得控除） */
  employmentIncome: number;
  /** 給与所得控除額 */
  employmentIncomeDeduction: number;
  /** 社会保険料控除（実際に使用した額） */
  socialInsuranceUsed: number;

  /** 所得控除合計（所得税） */
  totalDeductionIncomeTax: number;
  /** 所得控除合計（住民税） */
  totalDeductionResidentTax: number;

  /** 課税所得（所得税, 1000円未満切捨て） */
  taxableIncomeIncomeTax: number;
  /** 課税所得（住民税, 1000円未満切捨て） */
  taxableIncomeResidentTax: number;

  /** 所得税の限界税率（0〜0.45） */
  incomeTaxRate: number;
  /** 住民税所得割額（円, 調整控除反映後） */
  residentTaxIncomeLevy: number;

  /** ふるさと納税 控除上限額（円, 100円未満切捨て） */
  donationLimit: number;

  /** 警告メッセージ（住宅ローン控除併用時など） */
  warnings: string[];
}

/** 1000 円未満切り捨て */
const floorTo1000 = (v: number): number => Math.floor(v / 1000) * 1000;
/** 100 円未満切り捨て */
const floorTo100 = (v: number): number => Math.floor(v / 100) * 100;
const nonNegative = (v: number): number => (v > 0 ? v : 0);

/**
 * 給与所得控除額（令和2年分以降）
 * @param salary 給与収入（円）
 */
export function employmentIncomeDeduction(salary: number): number {
  if (salary <= 0) return 0;
  if (salary <= 1_625_000) return 550_000;
  if (salary <= 1_800_000) return salary * 0.4 - 100_000;
  if (salary <= 3_600_000) return salary * 0.3 + 80_000;
  if (salary <= 6_600_000) return salary * 0.2 + 440_000;
  if (salary <= 8_500_000) return salary * 0.1 + 1_100_000;
  return 1_950_000; // 上限
}

/**
 * 基礎控除（合計所得金額による逓減）
 * @param totalIncome 合計所得金額（円）
 * @param kind 'income'（所得税）/ 'resident'（住民税）
 */
export function basicDeduction(totalIncome: number, kind: 'income' | 'resident'): number {
  const table = kind === 'income' ? CONST.basicDeduction.income : CONST.basicDeduction.resident;
  if (totalIncome <= 24_000_000) return table[0];
  if (totalIncome <= 24_500_000) return table[1];
  if (totalIncome <= 25_000_000) return table[2];
  return 0;
}

/**
 * 配偶者控除（配偶者特別控除は簡易対応）
 * @param spouseType 配偶者区分
 * @param spouseIncome 配偶者の合計所得（円）
 * @param ownIncome 本人の合計所得（円）
 * @param kind 所得税/住民税
 */
export function spouseDeduction(
  spouseType: SpouseType,
  spouseIncome: number,
  ownIncome: number,
  kind: 'income' | 'resident',
): number {
  if (spouseType === 'none') return 0;
  // 本人の合計所得が 1000 万円超なら配偶者控除なし
  if (ownIncome > 10_000_000) return 0;

  const elderly = spouseType === 'elderly';
  // 本人所得による区分
  let bracket: 0 | 1 | 2;
  if (ownIncome <= 9_000_000) bracket = 0;
  else if (ownIncome <= 9_500_000) bracket = 1;
  else bracket = 2;

  // 配偶者の所得が 48 万円(給与103万)以下 → 配偶者控除
  if (spouseIncome <= 480_000) {
    const table = kind === 'income' ? CONST.spouse.income : CONST.spouse.resident;
    return elderly ? table.elderly[bracket] : table.general[bracket];
  }

  // 48万超〜133万: 配偶者特別控除（簡易: 所得帯による段階。本人所得900万以下を前提に概算）
  if (spouseIncome <= 1_330_000) {
    const table = kind === 'income' ? CONST.spouseSpecial.income : CONST.spouseSpecial.resident;
    // 配偶者の所得帯インデックスを求める
    const idx = spouseSpecialIndex(spouseIncome);
    const base = table[idx] ?? 0;
    // 本人所得が高いと逓減（簡易係数）
    const factor = bracket === 0 ? 1 : bracket === 1 ? 2 / 3 : 1 / 3;
    return Math.floor((base * factor) / 1000) * 1000;
  }

  return 0;
}

/** 配偶者特別控除の所得帯インデックス（配偶者の合計所得 → 段階） */
function spouseSpecialIndex(spouseIncome: number): number {
  // 48万超を起点に 5 万円刻みの段階（概算）。区分は taxConstants の配列長に対応。
  const steps = [
    950_000, // ここ以下は満額相当
    1_000_000,
    1_050_000,
    1_100_000,
    1_150_000,
    1_200_000,
    1_250_000,
    1_300_000,
    1_330_000,
  ];
  for (let i = 0; i < steps.length; i++) {
    if (spouseIncome <= steps[i]) return i;
  }
  return steps.length;
}

/**
 * 扶養控除合計
 */
export function dependentDeduction(d: Dependents, kind: 'income' | 'resident'): number {
  const t = kind === 'income' ? CONST.dependent.income : CONST.dependent.resident;
  return (
    d.general * t.general +
    d.specific * t.specific +
    d.elderly * t.elderly +
    d.elderlyLivingTogether * t.elderlyLivingTogether
    // under16 は控除額 0
  );
}

/**
 * 所得税の速算（限界税率と税額）
 * @param taxableIncome 課税所得（円）
 */
export function incomeTaxRateAndAmount(taxableIncome: number): { rate: number; amount: number } {
  for (const b of CONST.incomeTaxBrackets) {
    if (taxableIncome <= b.upTo) {
      const amount = nonNegative(taxableIncome * b.rate - b.deduction);
      return { rate: b.rate, amount };
    }
  }
  const last = CONST.incomeTaxBrackets[CONST.incomeTaxBrackets.length - 1];
  return { rate: last.rate, amount: nonNegative(taxableIncome * last.rate - last.deduction) };
}

/**
 * メイン計算
 */
export function simulate(input: SimulationInput): SimulationResult {
  const warnings: string[] = [];

  const salary = nonNegative(input.salaryIncome);
  const empDeduction = employmentIncomeDeduction(salary);
  const employmentIncome = nonNegative(salary - empDeduction); // = 合計所得金額（給与のみ前提）

  // 社会保険料控除
  const socialInsuranceUsed = input.autoSocialInsurance
    ? Math.round(salary * CONST.socialInsuranceRate)
    : nonNegative(input.socialInsurance ?? 0);

  // 共通の人的・物的控除（生命保険・地震保険・iDeCo・医療費・その他）
  const commonDeductions =
    socialInsuranceUsed +
    nonNegative(input.lifeInsuranceDeduction) +
    nonNegative(input.earthquakeInsuranceDeduction) +
    nonNegative(input.smallEnterpriseMutualAid) +
    nonNegative(input.medicalDeduction) +
    nonNegative(input.otherDeduction);

  const ownIncome = employmentIncome;

  // 所得税側
  const basicIncome = basicDeduction(ownIncome, 'income');
  const spouseIncomeDed = spouseDeduction(input.spouseType, input.spouseIncome, ownIncome, 'income');
  const dependentIncomeDed = dependentDeduction(input.dependents, 'income');
  const totalDeductionIncomeTax =
    commonDeductions + basicIncome + spouseIncomeDed + dependentIncomeDed;

  // 住民税側
  const basicResident = basicDeduction(ownIncome, 'resident');
  const spouseResidentDed = spouseDeduction(input.spouseType, input.spouseIncome, ownIncome, 'resident');
  const dependentResidentDed = dependentDeduction(input.dependents, 'resident');
  const totalDeductionResidentTax =
    commonDeductions + basicResident + spouseResidentDed + dependentResidentDed;

  // 課税所得（1000円未満切捨て）
  const taxableIncomeIncomeTax = floorTo1000(nonNegative(employmentIncome - totalDeductionIncomeTax));
  const taxableIncomeResidentTax = floorTo1000(nonNegative(employmentIncome - totalDeductionResidentTax));

  // 所得税の限界税率
  const { rate: incomeTaxRate } = incomeTaxRateAndAmount(taxableIncomeIncomeTax);

  // 住民税所得割額 = 課税所得 × 10%（道府県民税4% + 市町村民税6%） − 調整控除
  // 調整控除は簡易に固定額 2,500 円を控除（課税所得200万円超のケースを概算）。
  const adjustmentCredit = taxableIncomeResidentTax > 0 ? CONST.adjustmentCredit : 0;
  const residentTaxIncomeLevy = nonNegative(
    Math.floor(taxableIncomeResidentTax * CONST.residentTaxRate) - adjustmentCredit,
  );

  // 控除上限額
  // = 住民税所得割 × 20% / (90% − 所得税率 × 1.021) + 2,000
  const denominator = 0.9 - incomeTaxRate * CONST.reconstructionFactor;
  const donationLimitRaw =
    residentTaxIncomeLevy > 0 && denominator > 0
      ? (residentTaxIncomeLevy * 0.2) / denominator + 2_000
      : 0;
  const donationLimit = floorTo100(donationLimitRaw);

  // 警告: 住宅ローン控除併用
  if (input.housingLoanCredit > 0) {
    warnings.push(
      '住宅ローン控除を併用しています。所得税で控除しきれない住宅ローン控除が住民税側に回ると、' +
        'ふるさと納税の実質的な控除メリットが目減りする場合があります。本試算は基本式によるため別途確認してください。',
    );
  }
  if (input.autoSocialInsurance) {
    warnings.push(
      `社会保険料を給与収入の ${Math.round(CONST.socialInsuranceRate * 100)}% で自動推計しています（${socialInsuranceUsed.toLocaleString()} 円）。正確な源泉徴収票の金額入力を推奨します。`,
    );
  }
  if (input.spouseType !== 'none' && input.spouseIncome > 480_000 && input.spouseIncome <= 1_330_000) {
    warnings.push('配偶者特別控除は概算値です。配偶者の所得・本人の所得帯により実額と差が出る場合があります。');
  }

  return {
    employmentIncome,
    employmentIncomeDeduction: empDeduction,
    socialInsuranceUsed,
    totalDeductionIncomeTax,
    totalDeductionResidentTax,
    taxableIncomeIncomeTax,
    taxableIncomeResidentTax,
    incomeTaxRate,
    residentTaxIncomeLevy,
    donationLimit,
    warnings,
  };
}

/** 空の扶養家族 */
export const emptyDependents = (): Dependents => ({
  general: 0,
  specific: 0,
  elderly: 0,
  elderlyLivingTogether: 0,
  under16: 0,
});

/** 入力の初期値 */
export const defaultInput = (): SimulationInput => ({
  salaryIncome: 5_000_000,
  socialInsurance: undefined,
  autoSocialInsurance: true,
  spouseType: 'none',
  spouseIncome: 0,
  dependents: emptyDependents(),
  lifeInsuranceDeduction: 0,
  earthquakeInsuranceDeduction: 0,
  smallEnterpriseMutualAid: 0,
  medicalDeduction: 0,
  otherDeduction: 0,
  housingLoanCredit: 0,
});

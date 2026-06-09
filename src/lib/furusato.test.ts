import { describe, it, expect } from 'vitest';
import {
  simulate,
  employmentIncomeDeduction,
  incomeTaxRateAndAmount,
  defaultInput,
  emptyDependents,
  type SimulationInput,
} from './furusato';

/** 給与収入のみ・独身・社会保険料15%概算で試算するヘルパ */
const single = (salary: number): SimulationInput => ({
  ...defaultInput(),
  salaryIncome: salary,
  autoSocialInsurance: true,
});

describe('給与所得控除', () => {
  it('162.5万円以下は55万円', () => {
    expect(employmentIncomeDeduction(1_000_000)).toBe(550_000);
  });
  it('500万円は20%+44万', () => {
    expect(employmentIncomeDeduction(5_000_000)).toBe(1_440_000);
  });
  it('850万円超は195万円上限', () => {
    expect(employmentIncomeDeduction(10_000_000)).toBe(1_950_000);
  });
});

describe('所得税 速算', () => {
  it('課税所得300万 → 税率10%', () => {
    const { rate, amount } = incomeTaxRateAndAmount(3_000_000);
    expect(rate).toBe(0.1);
    expect(amount).toBe(3_000_000 * 0.1 - 97_500);
  });
  it('課税所得0 → 税率5%・税額0', () => {
    const { amount } = incomeTaxRateAndAmount(0);
    expect(amount).toBe(0);
  });
});

describe('控除上限額（独身・給与のみ・概算社保）', () => {
  // 総務省「全額控除されるふるさと納税額の目安」(独身又は共働き)を基準に、
  // 調整控除等の簡易化による誤差を許容したレンジに収まることを確認する。
  // 目安: 300万≈28,000 / 500万≈61,000 / 700万≈108,000 / 1000万≈180,000
  const cases: Array<{ salary: number; min: number; max: number }> = [
    { salary: 3_000_000, min: 24_000, max: 32_000 },
    { salary: 5_000_000, min: 54_000, max: 68_000 },
    { salary: 7_000_000, min: 95_000, max: 120_000 },
    { salary: 10_000_000, min: 165_000, max: 195_000 },
  ];

  for (const c of cases) {
    it(`年収${c.salary / 10_000}万円 → ${c.min}〜${c.max}円の範囲`, () => {
      const r = simulate(single(c.salary));
      expect(r.donationLimit).toBeGreaterThanOrEqual(c.min);
      expect(r.donationLimit).toBeLessThanOrEqual(c.max);
    });
  }
});

describe('扶養・配偶者で上限額が下がる', () => {
  it('配偶者控除ありは独身より上限額が小さい', () => {
    const base = simulate(single(6_000_000));
    const withSpouse = simulate({
      ...single(6_000_000),
      spouseType: 'general',
      spouseIncome: 0,
    });
    expect(withSpouse.donationLimit).toBeLessThan(base.donationLimit);
    expect(withSpouse.donationLimit).toBeGreaterThan(0);
  });

  it('特定扶養が増えると上限額が下がる', () => {
    const base = simulate(single(6_000_000));
    const withDep = simulate({
      ...single(6_000_000),
      dependents: { ...emptyDependents(), specific: 2 },
    });
    expect(withDep.donationLimit).toBeLessThan(base.donationLimit);
  });
});

describe('境界・異常系', () => {
  it('低収入で課税所得0なら上限額0', () => {
    const r = simulate(single(1_000_000));
    expect(r.donationLimit).toBe(0);
  });
  it('収入0でも例外を投げない', () => {
    const r = simulate(single(0));
    expect(r.donationLimit).toBe(0);
    expect(r.residentTaxIncomeLevy).toBe(0);
  });
  it('上限額は100円単位', () => {
    const r = simulate(single(5_000_000));
    expect(r.donationLimit % 100).toBe(0);
  });
  it('住宅ローン控除入力時は警告が出る', () => {
    const r = simulate({ ...single(6_000_000), housingLoanCredit: 200_000 });
    expect(r.warnings.some((w) => w.includes('住宅ローン'))).toBe(true);
  });
});

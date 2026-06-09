/** 円表記（カンマ区切り） */
export const yen = (v: number): string => `${Math.round(v).toLocaleString('ja-JP')}円`;
/** パーセント表記 */
export const pct = (v: number): string => `${(v * 100).toFixed(1)}%`;
/** 日時表記 */
export const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

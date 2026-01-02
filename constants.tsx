
export const START_YEAR = 2004;
export const END_YEAR = 2025;
export const YEARS = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);

export const COLORS = {
  EMPTY_BEFORE: 'bg-green-100 text-green-800 border-green-200',
  PAID: 'bg-red-100 text-red-800 border-red-200',
  DEFAULT: 'bg-white text-slate-900 border-slate-200',
};

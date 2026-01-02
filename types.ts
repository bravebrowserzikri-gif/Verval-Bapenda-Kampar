
export interface YearlyArrear {
  year: number;
  value: number | null; // null means empty, 0 means PAID
}

export interface TaxRecord {
  nama: string;
  nop: string;
  arrears: Record<number, number | null>;
  total: number;
  notes: string[];
}

export interface ValidationSummary {
  totalRecords: number;
  duplicates: string[];
  anomalies: string[];
}

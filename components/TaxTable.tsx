
import React from 'react';
import { TaxRecord } from '../types';
import { YEARS, COLORS } from '../constants';

interface TaxTableProps {
  records: TaxRecord[];
}

const TaxTable: React.FC<TaxTableProps> = ({ records }) => {
  const getCellColor = (record: TaxRecord, year: number) => {
    const value = record.arrears[year];
    
    // Check if it's an empty year before arrears begin
    // arrears begin at the first year that is NOT null
    const yearsWithData = Object.keys(record.arrears)
      .map(Number)
      .filter(y => record.arrears[y] !== null)
      .sort((a, b) => a - b);
    
    const firstYear = yearsWithData.length > 0 ? yearsWithData[0] : 9999;

    if (year < firstYear) return COLORS.EMPTY_BEFORE;
    if (value === 0) return COLORS.PAID;
    return COLORS.DEFAULT;
  };

  const formatCurrency = (val: number | null) => {
    if (val === null) return '-';
    return val.toLocaleString('id-ID');
  };

  return (
    <div className="overflow-x-auto border rounded-lg shadow-sm bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 sticky top-0 z-10">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Nama</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 sticky left-[120px] bg-slate-50 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">NOP</th>
            {YEARS.map(year => (
              <th key={year} className="px-4 py-3 text-center font-semibold text-slate-600 border-l">{year}</th>
            ))}
            <th className="px-4 py-3 text-right font-semibold text-slate-600 border-l bg-slate-100">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {records.map((record, idx) => (
            <tr key={`${record.nop}-${idx}`} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap font-medium sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                {record.nama}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-xs sticky left-[120px] bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                {record.nop}
              </td>
              {YEARS.map(year => (
                <td 
                  key={year} 
                  className={`px-4 py-3 text-center border-l transition-colors ${getCellColor(record, year)}`}
                >
                  {formatCurrency(record.arrears[year])}
                </td>
              ))}
              <td className="px-4 py-3 text-right font-bold text-blue-700 bg-slate-50 border-l">
                {formatCurrency(record.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TaxTable;

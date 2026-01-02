
import React from 'react';
import { ValidationSummary } from '../types';

interface ValidationReportProps {
  summary: ValidationSummary;
}

const ValidationReport: React.FC<ValidationReportProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Total Records</h3>
        <p className="text-3xl font-bold text-slate-900">{summary.totalRecords}</p>
      </div>
      
      <div className={`p-4 rounded-xl shadow-sm border ${summary.duplicates.length > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Duplicates Detected</h3>
        <p className={`text-3xl font-bold ${summary.duplicates.length > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
          {summary.duplicates.length}
        </p>
        {summary.duplicates.length > 0 && (
          <p className="text-xs text-orange-700 mt-2 font-mono">
            {summary.duplicates.join(', ')}
          </p>
        )}
      </div>

      <div className={`p-4 rounded-xl shadow-sm border ${summary.anomalies.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-slate-200'}`}>
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Data Anomalies</h3>
        <p className={`text-3xl font-bold ${summary.anomalies.length > 0 ? 'text-yellow-600' : 'text-slate-900'}`}>
          {summary.anomalies.length}
        </p>
        {summary.anomalies.length > 0 && (
          <ul className="text-xs text-yellow-700 mt-2 list-disc list-inside">
            {summary.anomalies.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ValidationReport;

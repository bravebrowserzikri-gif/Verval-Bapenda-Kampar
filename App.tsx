
import React, { useState, useEffect } from 'react';
import { TaxRecord, ValidationSummary } from './types';
import { processTaxPDF } from './geminiService';
import TaxTable from './components/TaxTable';
import ValidationReport from './components/ValidationReport';
import { YEARS } from './constants';

const App: React.FC = () => {
  const [records, setRecords] = useState<TaxRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUserKey, setHasUserKey] = useState(false);

  useEffect(() => {
    window.aistudio.hasSelectedApiKey().then(setHasUserKey);
  }, []);

  const handleSelectKey = async () => {
    await window.aistudio.openSelectKey();
    setHasUserKey(true);
    setError(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setError(null);
    const newRecords: TaxRecord[] = [];

    try {
      const fileList = Array.from(files) as File[];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        
        // Tambahkan jeda kecil jika memproses lebih dari satu file untuk menghindari Rate Limit
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
        });
        reader.readAsDataURL(file);
        const base64 = await base64Promise;
        
        try {
          const result = await processTaxPDF(base64, file.type);
          newRecords.push(...result);
        } catch (procErr: any) {
          if (procErr.message.includes('429')) {
            throw new Error('QUOTA_EXCEEDED');
          }
          throw procErr;
        }
      }

      setRecords(prev => [...prev, ...newRecords]);
    } catch (err: any) {
      console.error(err);
      if (err.message === 'QUOTA_EXCEEDED' || err?.message?.includes('429')) {
        setError("Kuota API sistem saat ini penuh (Rate Limit Exceeded). Silakan gunakan 'API Key Sendiri' dari Google AI Studio atau coba lagi dalam beberapa menit.");
      } else {
        setError("Gagal memproses file. Pastikan dokumen jelas dan format PDF/Gambar didukung.");
      }
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  };

  const clearData = () => {
    setRecords([]);
    setError(null);
  };

  const exportToCSV = () => {
    if (records.length === 0) return;

    const headers = ['Nama', 'NOP', ...YEARS.map(String), 'Total'];
    const rows = records.map(record => {
      const rowData = [
        `"${record.nama}"`,
        `'${record.nop}`, 
        ...YEARS.map(year => record.arrears[year] !== null ? record.arrears[year] : ''),
        record.total
      ];
      return rowData.join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_Piutang_Kampar_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateSummary = (): ValidationSummary => {
    const nops: string[] = records.map(r => r.nop);
    const duplicates: string[] = nops.filter((nop, index) => nops.indexOf(nop) !== index);
    
    const anomalies: string[] = [];
    records.forEach(r => {
      const arrearsValues = Object.values(r.arrears) as (number | null)[];
      const calculatedTotal = arrearsValues.reduce((s: number, v: number | null) => {
        return s + (v !== null && v > 0 ? v : 0);
      }, 0);

      if (Math.abs(calculatedTotal - r.total) > 0.01) {
        anomalies.push(`Ketidaksesuaian total untuk NOP ${r.nop}`);
      }
    });

    return {
      totalRecords: records.length,
      duplicates: Array.from(new Set(duplicates)),
      anomalies
    };
  };

  const summary = generateSummary();

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-emerald-800 text-white py-6 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg">
              <svg className="w-8 h-8 text-emerald-800" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">BAPENDA KABUPATEN KAMPAR</h1>
              <p className="text-emerald-100 text-sm">Sistem Verifikasi Piutang PBB-P2</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!hasUserKey && (
               <button 
               onClick={handleSelectKey}
               className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-emerald-900 rounded-lg font-bold transition-all shadow-sm border border-yellow-300 flex items-center"
             >
               <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
               </svg>
               Atur API Key Sendiri
             </button>
            )}
            
            <label className={`cursor-pointer inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-50 text-white rounded-lg font-medium transition-all shadow-sm ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload PDF
              <input type="file" multiple accept=".pdf,image/*" className="hidden" onChange={handleFileUpload} />
            </label>
            
            {records.length > 0 && (
              <>
                <button 
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-white text-emerald-700 hover:bg-emerald-50 rounded-lg font-medium transition-all border border-emerald-200 flex items-center shadow-sm"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Ekspor Excel
                </button>
                <button 
                  onClick={clearData}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-all border border-slate-300"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-bold text-red-700">{error}</p>
                {error.includes('Kuota') && (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-red-600">Layanan AI gratis memiliki batas penggunaan per menit. Anda dapat mencoba lagi dalam 60 detik atau menggunakan kunci pribadi Anda untuk akses tanpa hambatan.</p>
                    <button 
                      onClick={handleSelectKey}
                      className="text-sm font-semibold text-red-800 underline hover:text-red-900 block"
                    >
                      Klik di sini untuk mengatur API Key pribadi (Gratis di AI Studio)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-slate-200 mb-8">
            <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-800 mb-4"></div>
                <div className="absolute top-0 left-0 h-16 w-16 flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-800 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
            </div>
            <p className="text-slate-600 font-semibold text-lg">Menganalisis Dokumen...</p>
            <p className="text-slate-400 text-sm mt-2 max-w-xs text-center">AI sedang mengekstraksi data ribuan kolom. Harap tunggu sebentar.</p>
          </div>
        )}

        {records.length > 0 ? (
          <>
            <ValidationReport summary={summary} />
            <div className="mb-4 flex flex-wrap gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-green-100 border border-green-200"></div>
                <span className="text-slate-600">Tahun Sebelum Piutang</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-100 border border-red-200"></div>
                <span className="text-slate-600">Lunas / Nilai 0</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-white border border-slate-200"></div>
                <span className="text-slate-600">Piutang Berjalan</span>
              </div>
            </div>

            <TaxTable records={records} />
          </>
        ) : !isLoading && (
          <div className="flex flex-col items-center justify-center py-32 bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl">
            <svg className="w-20 h-20 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-slate-600">Belum ada data piutang</h3>
            <p className="text-slate-400 mt-2">Silakan unggah dokumen PDF rekapitulasi PBB-P2 untuk mulai verifikasi.</p>
            <div className="mt-8 flex gap-4">
                 <div className="flex items-center text-xs text-slate-400">
                    <svg className="w-4 h-4 mr-1 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Akurasi Tinggi
                 </div>
                 <div className="flex items-center text-xs text-slate-400">
                    <svg className="w-4 h-4 mr-1 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Ekstraksi Otomatis
                 </div>
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-3 px-6 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-xs text-slate-500">
          <p>© 2025 Bapenda Kabupaten Kampar - Sistem Digitalisasi Verifikasi Pajak</p>
          <div className="flex gap-4">
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>Sistem Aktif</span>
            {hasUserKey && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">Personal API Key Aktif</span>}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

import { useRef, useState } from 'react';
import { Upload, Download, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useBulkImportContacts } from '../../hooks/useContacts';
import type { BulkImportRow, BulkImportResult } from '../../api/contacts';

const TEMPLATE_HEADERS = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'notes'];
const REQUIRED_HEADERS = new Set(['firstName', 'lastName']);

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } | { parseError: string } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { parseError: 'File must have a header row and at least one data row.' };
  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const missing = [...REQUIRED_HEADERS].filter((h) => !headers.includes(h));
  if (missing.length) return { parseError: `Missing required columns: ${missing.join(', ')}` };
  const rows = lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = parseCSVLine(line);
      return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').trim()]));
    });
  return { headers, rows };
}

function downloadTemplate() {
  const header = TEMPLATE_HEADERS.join(',');
  const example = 'John,Doe,john@example.com,555-1234,1990-01-15,Sample note';
  const blob = new Blob([header + '\n' + example + '\n'], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'contacts_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

type View = 'upload' | 'preview' | 'done';

interface Props {
  onClose: () => void;
}

export function BulkImportModal({ onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>('upload');
  const [parseError, setParseError] = useState('');
  const [rows, setRows] = useState<BulkImportRow[]>([]);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [fileName, setFileName] = useState('');
  const importMutation = useBulkImportContacts();

  function handleFile(file: File) {
    setParseError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if ('parseError' in parsed) {
        setParseError(parsed.parseError);
        return;
      }
      const mapped: BulkImportRow[] = parsed.rows.map((r) => ({
        firstName: r.firstName ?? '',
        lastName: r.lastName ?? '',
        email: r.email || undefined,
        phone: r.phone || undefined,
        dateOfBirth: r.dateOfBirth || undefined,
        notes: r.notes || undefined,
      }));
      setRows(mapped);
      setView('preview');
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    const res = await importMutation.mutateAsync(rows);
    setResult(res);
    setView('done');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Bulk Import Contacts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {view === 'upload' && (
            <>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">Step 1 — Download the template</p>
                <p className="text-xs text-indigo-700 dark:text-indigo-400">
                  Fill it in with your contacts. Required columns: <strong>firstName</strong>, <strong>lastName</strong>.
                  Optional: email, phone, dateOfBirth (YYYY-MM-DD), notes.
                </p>
                <Button variant="secondary" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-1" /> Download template
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Step 2 — Upload your CSV</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg py-10 flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                >
                  <Upload className="h-8 w-8" />
                  <span className="text-sm font-medium">Click to select or drag & drop a CSV file</span>
                </button>
                <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                {parseError && <p className="text-xs text-red-600 dark:text-red-400">{parseError}</p>}
              </div>
            </>
          )}

          {view === 'preview' && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{rows.length}</span> row{rows.length !== 1 ? 's' : ''} ready to import from <span className="font-medium">{fileName}</span>
                </p>
                <button onClick={() => { setView('upload'); setRows([]); setFileName(''); }} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                  Change file
                </button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase">
                    <tr>
                      {['#', 'First name', 'Last name', 'Email', 'Phone', 'Date of birth', 'Notes'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {rows.slice(0, 100).map((r, i) => {
                      const missingFirst = !r.firstName.trim();
                      const missingLast = !r.lastName.trim();
                      const hasError = missingFirst || missingLast;
                      return (
                        <tr key={i} className={hasError ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                          <td className="px-3 py-2 text-gray-400">{i + 2}</td>
                          <td className={`px-3 py-2 ${missingFirst ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>{r.firstName || <em>missing</em>}</td>
                          <td className={`px-3 py-2 ${missingLast ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>{r.lastName || <em>missing</em>}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{r.email ?? '—'}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{r.phone ?? '—'}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{r.dateOfBirth ?? '—'}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400 max-w-[120px] truncate">{r.notes ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {rows.length > 100 && (
                  <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
                    Showing first 100 of {rows.length} rows.
                  </p>
                )}
              </div>
              {importMutation.error && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {(importMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Import failed. Please try again.'}
                </p>
              )}
            </>
          )}

          {view === 'done' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">{result.created.length} contact{result.created.length !== 1 ? 's' : ''} imported</p>
                  {result.errors.length > 0 && (
                    <p className="text-xs text-green-700 dark:text-green-400">{result.errors.length} row{result.errors.length !== 1 ? 's' : ''} failed</p>
                  )}
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-red-500" /> Rows with errors
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-red-200 dark:border-red-800">
                    <table className="w-full text-xs">
                      <thead className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 uppercase">
                        <tr>
                          <th className="px-3 py-2 text-left">Row</th>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100 dark:divide-red-900">
                        {result.errors.map((e) => (
                          <tr key={e.row}>
                            <td className="px-3 py-2 text-gray-500">{e.row}</td>
                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{e.data.firstName} {e.data.lastName}</td>
                            <td className="px-3 py-2 text-red-600 dark:text-red-400">{e.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          {view === 'done' ? (
            <Button onClick={onClose}>Done</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              {view === 'preview' && (
                <Button onClick={handleImport} loading={importMutation.isPending} disabled={rows.length === 0}>
                  Import {rows.length} contact{rows.length !== 1 ? 's' : ''}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

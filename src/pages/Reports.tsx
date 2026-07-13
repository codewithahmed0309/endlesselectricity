import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, TrendingUp, CheckCircle, AlertCircle, CalendarRange } from 'lucide-react';
import { supabase, DbInvoice } from '../lib/supabase';

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_BADGE: Record<string, string> = {
  paid:    'bg-green-100 text-green-700',
  partial: 'bg-orange-100 text-orange-700',
  due:     'bg-red-100 text-red-700',
};

function monthKey(d: string) {
  return d.slice(0, 7); // 'YYYY-MM'
}
function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

interface ReportsProps {
  onOpen: (invoice: DbInvoice) => void;
}

export default function Reports({ onOpen }: ReportsProps) {
  const [invoices, setInvoices] = useState<DbInvoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [month, setMonth]       = useState<string>(''); // '' = all months

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('invoice_date', { ascending: false });
      if (error) { console.error(error); setLoading(false); return; }
      const rows = data ?? [];
      setInvoices(rows);
      if (rows.length > 0 && rows[0].invoice_date) setMonth(monthKey(rows[0].invoice_date));
      setLoading(false);
    })();
  }, []);

  // All months that actually have bills, newest first
  const availableMonths = useMemo(() => {
    const keys = new Set<string>();
    invoices.forEach(i => { if (i.invoice_date) keys.add(monthKey(i.invoice_date)); });
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [invoices]);

  const filtered = useMemo(() => {
    if (!month) return invoices;
    return invoices.filter(i => i.invoice_date && monthKey(i.invoice_date) === month);
  }, [invoices, month]);

  const summary = useMemo(() => ({
    total:  filtered.reduce((s, i) => s + Number(i.total_amount), 0),
    paid:   filtered.reduce((s, i) => s + Number(i.amount_paid), 0),
    due:    filtered.reduce((s, i) => s + Number(i.amount_due), 0),
    count:  filtered.length,
  }), [filtered]);

  function exportCsv() {
    const header = ['Invoice #', 'Date', 'Customer', 'Phone', 'Total', 'Paid', 'Due', 'Status'];
    const rows = filtered.map(i => [
      i.invoice_number,
      i.invoice_date ?? '',
      i.customer_name ?? '',
      i.customer_phone ?? '',
      Number(i.total_amount).toFixed(2),
      Number(i.amount_paid).toFixed(2),
      Number(i.amount_due).toFixed(2),
      i.status,
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bills-${month || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-gray-400">Loading reports…</div>;
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">All bills, filtered by month, ready to export</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
            <CalendarRange size={14} className="text-gray-400" />
            <select
              className="text-sm text-gray-700 bg-transparent focus:outline-none"
              value={month}
              onChange={e => setMonth(e.target.value)}
            >
              <option value="">All months</option>
              {availableMonths.map(k => <option key={k} value={k}>{monthLabel(k)}</option>)}
            </select>
          </div>
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0"><TrendingUp size={16} /></div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-500">Billed</div>
            <div className="text-sm font-bold text-gray-900">₹{fmt(summary.total)}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0"><CheckCircle size={16} /></div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-500">Collected</div>
            <div className="text-sm font-bold text-gray-900">₹{fmt(summary.paid)}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0"><AlertCircle size={16} /></div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-500">Due</div>
            <div className="text-sm font-bold text-gray-900">₹{fmt(summary.due)}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0"><FileText size={16} /></div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-500">Bills</div>
            <div className="text-sm font-bold text-gray-900">{summary.count}</div>
          </div>
        </div>
      </div>

      {/* Bills table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-800 text-sm">
            {month ? monthLabel(month) : 'All bills'}
          </span>
          <span className="text-[11px] text-gray-400">Click a row to open it in Billing (PDF / Image / Send)</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400">No bills in this period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left px-5 py-2.5">Invoice #</th>
                  <th className="text-left px-5 py-2.5">Customer</th>
                  <th className="text-left px-5 py-2.5">Date</th>
                  <th className="text-right px-5 py-2.5">Total</th>
                  <th className="text-right px-5 py-2.5">Paid</th>
                  <th className="text-right px-5 py-2.5">Due</th>
                  <th className="text-center px-5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(inv => (
                  <tr
                    key={inv.id}
                    onClick={() => onOpen(inv)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3 font-medium text-gray-800">
                      <div className="flex items-center gap-1.5">
                        <FileText size={12} className="text-gray-400" />
                        {inv.invoice_number}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{inv.customer_name || '—'}</td>
                    <td className="px-5 py-3 text-gray-500">{fmtDate(inv.invoice_date)}</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-800">₹{fmt(Number(inv.total_amount))}</td>
                    <td className="px-5 py-3 text-right text-green-600">₹{fmt(Number(inv.amount_paid))}</td>
                    <td className="px-5 py-3 text-right text-red-600">₹{fmt(Number(inv.amount_due))}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${STATUS_BADGE[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

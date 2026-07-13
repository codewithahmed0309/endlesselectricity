import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  CheckCircle,
  AlertCircle,
  FileText,
  Users,
  Clock,
  Trash2,
  Pencil,
} from 'lucide-react';
import { supabase, DbInvoice } from '../lib/supabase';

function fmt(n: number) {
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_BADGE: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  partial: 'bg-orange-100 text-orange-700',
  due: 'bg-red-100 text-red-700',
};

interface Stats {
  totalRevenue: number;
  totalPaid: number;
  totalDue: number;
  totalInvoices: number;
  totalCustomers: number;
  overdueCount: number;
}

interface DashboardProps {
  onEdit: (invoice: DbInvoice) => void;
}

export default function Dashboard({ onEdit }: DashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<DbInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const [invRes, custRes] = await Promise.all([
      supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('customers').select('id'),
    ]);

    if (invRes.error || custRes.error) {
      console.error(invRes.error || custRes.error);
      setLoading(false);
      return;
    }

    const invoices: DbInvoice[] = invRes.data ?? [];

    setRecent(invoices.slice(0, 8));

    setStats({
      totalRevenue: invoices.reduce((s, i) => s + Number(i.total_amount), 0),
      totalPaid:    invoices.reduce((s, i) => s + Number(i.amount_paid),  0),
      totalDue:     invoices.reduce((s, i) => s + Number(i.amount_due),   0),
      totalInvoices: invoices.length,
      totalCustomers: custRes.data?.length ?? 0,
      overdueCount: invoices.filter(i => i.status === 'due').length,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    const ok = confirm('Delete this invoice? This cannot be undone.');
    if (!ok) return;

    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) {
      console.error(error);
      return;
    }
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  const heroCards = [
    {
      label: 'Total Revenue',
      value: `₹${fmt(stats!.totalRevenue)}`,
      icon: TrendingUp,
      accent: 'text-blue-600',
      bar: 'bg-blue-500',
    },
    {
      label: 'Collected',
      value: `₹${fmt(stats!.totalPaid)}`,
      icon: CheckCircle,
      accent: 'text-green-600',
      bar: 'bg-green-500',
    },
    {
      label: 'Pending Dues',
      value: `₹${fmt(stats!.totalDue)}`,
      icon: AlertCircle,
      accent: 'text-red-600',
      bar: 'bg-red-500',
    },
  ];

  const activityCards = [
    {
      label: 'Total Invoices',
      value: String(stats!.totalInvoices),
      icon: FileText,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Customers',
      value: String(stats!.totalCustomers),
      icon: Users,
      color: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Unpaid Invoices',
      value: String(stats!.overdueCount),
      icon: Clock,
      color: 'bg-orange-50 text-orange-600',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Business overview at a glance</p>
      </div>

      {/* Hero finance stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {heroCards.map(({ label, value, icon: Icon, accent, bar }) => (
          <div key={label} className="relative bg-white rounded-2xl border border-gray-200 p-5 overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-1 ${bar}`} />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
              <Icon size={18} className={accent} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      {/* Secondary activity stats */}
      <div className="grid grid-cols-3 gap-3">
        {activityCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-gray-500 truncate">{label}</div>
              <div className="text-sm font-bold text-gray-900 leading-tight">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent invoices table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-gray-400" />
            <span className="font-semibold text-gray-800 text-sm">Recent Invoices</span>
          </div>
          <span className="text-[11px] text-gray-400">{recent.length} shown</span>
        </div>

        {recent.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400">
            No invoices yet — create your first invoice!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left px-5 py-2.5">Invoice #</th>
                  <th className="text-left px-5 py-2.5">Customer</th>
                  <th className="text-left px-5 py-2.5">Date</th>
                  <th className="text-right px-5 py-2.5">Total</th>
                  <th className="text-right px-5 py-2.5">Paid</th>
                  <th className="text-right px-5 py-2.5">Due</th>
                  <th className="text-center px-5 py-2.5">Status</th>
                  <th className="text-center px-5 py-2.5">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {recent.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {inv.invoice_number}
                    </td>

                    <td className="px-5 py-3 text-gray-600">
                      {inv.customer_name || '—'}
                    </td>

                    <td className="px-5 py-3 text-gray-500">
                      {fmtDate(inv.invoice_date)}
                    </td>

                    <td className="px-5 py-3 text-right font-medium text-gray-800">
                      ₹{fmt(Number(inv.total_amount))}
                    </td>

                    <td className="px-5 py-3 text-right text-green-600">
                      ₹{fmt(Number(inv.amount_paid))}
                    </td>

                    <td className="px-5 py-3 text-right text-red-600">
                      ₹{fmt(Number(inv.amount_due))}
                    </td>

                    <td className="px-5 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                          STATUS_BADGE[inv.status] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>

                    {/* Edit & Delete */}
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => onEdit(inv)}
                          className="text-gray-400 hover:text-teal-600 transition-colors"
                          title="Edit invoice"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete invoice"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
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

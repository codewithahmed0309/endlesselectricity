import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Users, FileText, Pencil, Check, X, Trash2 } from 'lucide-react';
import { supabase, DbCustomer, DbInvoice } from '../lib/supabase';

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

interface EditState { customerId: string; invoiceId: string; amountPaid: string; }

function custStatus(paid: number, due: number) {
  return due === 0 ? 'paid' : paid > 0 ? 'partial' : 'due';
}

export default function Customers() {
  const [customers, setCustomers] = useState<DbCustomer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [invoices, setInvoices]   = useState<Record<string, DbInvoice[]>>({});
  const [edit, setEdit]           = useState<EditState | null>(null);
  const [saving, setSaving]       = useState(false);

  async function loadCustomers() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('last_invoice_date', {
        ascending: false,
        nullsFirst: false
      });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setCustomers(data ?? []);
    setLoading(false);
  }
  useEffect(() => { loadCustomers(); }, []);

  async function toggleExpand(c: DbCustomer) {
    if (expanded === c.id) { setExpanded(null); return; }
    setExpanded(c.id);
    if (!invoices[c.id]) {
      const { data } = await supabase.from('invoices').select('*').eq('customer_phone', c.phone).order('invoice_date', { ascending: false });
      setInvoices(prev => ({ ...prev, [c.id]: data ?? [] }));
    }
  }

  async function savePayment() {
    if (!edit) return;
    const paid = Number(edit.amountPaid);
    if (isNaN(paid) || paid < 0) return;
    setSaving(true);

    const inv = (invoices[edit.customerId] ?? []).find(i => i.id === edit.invoiceId);
    if (!inv) { setSaving(false); return; }

    const total  = Number(inv.total_amount);
    const due    = Math.max(0, total - paid);
    const status: DbInvoice['status'] = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'due';

    await supabase.from('invoices').update({ amount_paid: paid, amount_due: due, status }).eq('id', inv.id);

    // Refresh invoices for this customer
    const { data: fresh } = await supabase.from('invoices').select('*').eq('customer_phone', inv.customer_phone).order('invoice_date', { ascending: false });
    const freshInvs = fresh ?? [];
    setInvoices(prev => ({ ...prev, [edit.customerId]: freshInvs }));

    // Recompute customer totals
    const tAmt  = freshInvs.reduce((s, i) => s + Number(i.total_amount), 0);
    const tPaid = freshInvs.reduce((s, i) => s + Number(i.amount_paid), 0);
    const tDue  = freshInvs.reduce((s, i) => s + Number(i.amount_due), 0);

    await supabase
      .from('customers')
      .update({
        total_amount: tAmt,
        total_paid: tPaid,
        total_due: tDue
      })
      .eq('id', edit.customerId);

    setEdit(null);
    setSaving(false);
    loadCustomers();
  }

  async function deleteCustomer(customerId: string, customerName: string, customerPhone: string) {
    const confirmed = window.confirm(
      `⚠️ WARNING\n\nDo you want to delete "${customerName}"?\n\nThis will permanently delete:\n• Customer record\n• All invoices of this customer\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      // Delete all invoices first
      const { error: invoiceError } = await supabase
        .from('invoices')
        .delete()
        .eq('customer_phone', customerPhone);

      if (invoiceError) throw invoiceError;

      // Delete customer
      const { error: customerError } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (customerError) throw customerError;

      alert(`${customerName} deleted successfully`);

      loadCustomers();
    } catch (error) {
      console.error(error);
      alert('Failed to delete customer');
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-gray-400">Loading customers…</div>;
  }

  return (
    <div className="p-3 sm:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Customers</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track payment status — click a customer to edit paid/due</p>
      </div>

      {customers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
          <Users size={44} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No customers yet — save an invoice to add a customer.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map(c => {
            const tPaid = Number(c.total_paid);
            const tDue  = Number(c.total_due);
            const cs    = custStatus(tPaid, tDue);
            const isOpen = expanded === c.id;
            const custInvs = invoices[c.id] ?? [];

            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Customer row */}
                <div className="flex items-center gap-3 px-3 sm:px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggleExpand(c)}>
                  <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-teal-700 font-bold text-sm">{(c.name?.charAt(0) || '?').toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">{c.name}</div>
                    <div className="text-xs text-gray-400">{c.phone} &middot; {c.total_invoices} invoice{c.total_invoices !== 1 ? 's' : ''} &middot; Last: {fmtDate(c.last_invoice_date)}</div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-5 text-right flex-shrink-0">

                    <div className="hidden sm:block">
                      <div className="text-[10px] text-gray-400 uppercase">Total</div>
                      <div className="text-sm font-semibold text-gray-800">
                        ₹{fmt(Number(c.total_amount))}
                      </div>
                    </div>

                    <div className="hidden sm:block">
                      <div className="text-[10px] text-gray-400 uppercase">Paid</div>
                      <div className="text-sm font-semibold text-green-600">
                        ₹{fmt(tPaid)}
                      </div>
                    </div>

                    <div className="hidden sm:block">
                      <div className="text-[10px] text-gray-400 uppercase">Due</div>
                      <div className="text-sm font-semibold text-red-600">
                        ₹{fmt(tDue)}
                      </div>
                    </div>

                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-bold capitalize ${STATUS_BADGE[cs]}`}
                    >
                      {cs}
                    </span>

                    {tDue === 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCustomer(c.id, c.name, c.phone);
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Customer"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="text-gray-400 flex-shrink-0">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                </div>

                {/* Expanded invoices */}
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    {custInvs.length === 0 ? (
                      <div className="py-6 text-center text-sm text-gray-400">No invoices found.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-[700px] w-full text-sm">
                          <thead>
                            <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                              <th className="text-left px-5 py-2.5">Invoice #</th>
                              <th className="text-left px-5 py-2.5">Date</th>
                              <th className="text-right px-5 py-2.5">Total</th>
                              <th className="text-right px-5 py-2.5">Paid</th>
                              <th className="text-right px-5 py-2.5">Due</th>
                              <th className="text-center px-5 py-2.5">Status</th>
                              <th className="text-center px-5 py-2.5">Edit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {custInvs.map(inv => {
                              const isEditing = edit?.invoiceId === inv.id;
                              const editedDue = isEditing
                                ? Math.max(0, Number(inv.total_amount) - Number(edit!.amountPaid || 0))
                                : null;
                              return (
                                <tr key={inv.id} className="bg-white hover:bg-gray-50 transition-colors">
                                  <td className="px-5 py-3 font-medium text-gray-800">
                                    <div className="flex items-center gap-1.5">
                                      <FileText size={12} className="text-gray-400" />
                                      {inv.invoice_number}
                                    </div>
                                  </td>
                                  <td className="px-5 py-3 text-gray-500">{fmtDate(inv.invoice_date)}</td>
                                  <td className="px-5 py-3 text-right font-medium">₹{fmt(Number(inv.total_amount))}</td>
                                  <td className="px-5 py-3 text-right text-green-600 font-medium">
                                    {isEditing ? (
                                      <input
                                        type="number" min="0" max={Number(inv.total_amount)}
                                        className="w-24 border border-teal-400 rounded px-2 py-0.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                                        value={edit!.amountPaid}
                                        onChange={e => setEdit(s => s ? { ...s, amountPaid: e.target.value } : s)}
                                      />
                                    ) : `₹${fmt(Number(inv.amount_paid))}`}
                                  </td>
                                  <td className="px-5 py-3 text-right text-red-600 font-medium">
                                    {isEditing ? `₹${fmt(editedDue!)}` : `₹${fmt(Number(inv.amount_due))}`}
                                  </td>
                                  <td className="px-5 py-3 text-center">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${STATUS_BADGE[inv.status]}`}>{inv.status}</span>
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center justify-center gap-1.5">
                                      {isEditing ? (
                                        <>
                                          <button onClick={savePayment} disabled={saving} className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50 transition-colors"><Check size={13} /></button>
                                          <button onClick={() => setEdit(null)} className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg transition-colors"><X size={13} /></button>
                                        </>
                                      ) : (
                                        <button onClick={() => setEdit({ customerId: c.id, invoiceId: inv.id, amountPaid: String(inv.amount_paid) })} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                                          <Pencil size={13} />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

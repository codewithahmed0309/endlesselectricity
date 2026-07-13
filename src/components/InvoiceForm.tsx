import React, { useCallback } from 'react';
import { Plus, Trash2, Upload, Package } from 'lucide-react';
import { InvoiceData, InvoiceItem } from '../types/invoice';
import { DbProduct } from '../lib/supabase';

interface Props {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
  products: DbProduct[];
}

function newItem(): InvoiceItem {
  return {
    id: crypto.randomUUID(),
    name: '',
    hsnSac: '',
    rate: 0,
    originalRate: 0,
    qty: 1,
    unit: 'UNT',
    discount: 0,
    amount: 0,
  };
}

function calcAmount(item: InvoiceItem): number {
  return Number(item.rate) * Number(item.qty);
}

function labelCls() {
  return 'block text-xs font-medium text-gray-500 mb-0.5';
}

function inputCls() {
  return 'w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white';
}

export default function InvoiceForm({ data, onChange, products }: Props) {
  const set = useCallback(
    (patch: Partial<InvoiceData>) => onChange({ ...data, ...patch }),
    [data, onChange]
  );

  const setBank = (patch: Partial<InvoiceData['bankDetails']>) =>
    set({ bankDetails: { ...data.bankDetails, ...patch } });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set({ logoUrl: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set({ signatureUrl: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  const addItem = () => set({ items: [...data.items, newItem()] });

  const removeItem = (id: string) =>
    set({ items: data.items.filter(i => i.id !== id) });

  const updateItem = (id: string, patch: Partial<InvoiceItem>) => {
    const updated = data.items.map(item => {
      if (item.id !== id) return item;
      const merged = { ...item, ...patch };
      merged.amount = calcAmount(merged);
      return merged;
    });
    set({ items: updated });
  };

  const selectProduct = (itemId: string, product: DbProduct) => {
    const orig = Number(product.original_rate);
    const rate = Number(product.rate);
    const disc = orig > 0 ? Math.round(((orig - rate) / orig) * 10000) / 100 : 0;
    updateItem(itemId, {
      name: product.name,
      hsnSac: product.hsn_sac || '',
      rate: rate,
      originalRate: orig,
      unit: product.unit,
      discount: disc,
      qty: 1,
    });
  };

  return (
    <div className="space-y-5">
      {/* Company Details */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 border-b border-teal-100 pb-1 mb-3">
          Company Details
        </h3>
        <div className="flex gap-3 items-start mb-3">
          <div className="flex-shrink-0">
            <label className={labelCls()}>Logo</label>
            <label className="cursor-pointer block">
              <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 hover:bg-teal-50 hover:border-teal-300 transition-colors overflow-hidden">
                {data.logoUrl ? (
                  <img src={data.logoUrl} alt="logo" className="w-full h-full object-contain" />
                ) : (
                  <>
                    <Upload size={16} className="text-gray-400" />
                    <span className="text-[9px] text-gray-400 mt-1 text-center px-1">Upload Logo</span>
                  </>
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
          </div>
          <div className="flex-1 grid grid-cols-1 gap-2">
            <div>
              <label className={labelCls()}>Company Name</label>
              <input className={inputCls()} value={data.companyName} onChange={e => set({ companyName: e.target.value })} placeholder="Endless Electrical" />
            </div>
            <div>
              <label className={labelCls()}>Address</label>
              <input className={inputCls()} value={data.companyAddress} onChange={e => set({ companyAddress: e.target.value })} placeholder="Street, City, State, PIN" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls()}>City / State</label>
                <input className={inputCls()} value={data.companyCity} onChange={e => set({ companyCity: e.target.value })} placeholder="Mumbai, MH 400001" />
              </div>
              <div>
                <label className={labelCls()}>Mobile</label>
                <input className={inputCls()} value={data.companyMobile} onChange={e => set({ companyMobile: e.target.value })} placeholder="+91 98765 43210" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Invoice Meta */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 border-b border-teal-100 pb-1 mb-3">
          Invoice Details
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={labelCls()}>Invoice #</label>
            <input className={inputCls()} value={data.invoiceNumber} onChange={e => set({ invoiceNumber: e.target.value })} placeholder="INV-1" />
          </div>
          <div>
            <label className={labelCls()}>Invoice Date</label>
            <input type="date" className={inputCls()} value={data.invoiceDate} onChange={e => set({ invoiceDate: e.target.value })} />
          </div>
          <div>
            <label className={labelCls()}>Due Date</label>
            <input type="date" className={inputCls()} value={data.dueDate} onChange={e => set({ dueDate: e.target.value })} />
          </div>
        </div>
      </section>

      {/* Customer Details */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 border-b border-teal-100 pb-1 mb-3">
          Customer Details
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls()}>Customer Name</label>
            <input className={inputCls()} value={data.customerName} onChange={e => set({ customerName: e.target.value })} placeholder="Customer Full Name" />
          </div>
          <div>
            <label className={labelCls()}>Phone Number</label>
            <input className={inputCls()} value={data.customerPhone} onChange={e => set({ customerPhone: e.target.value })} placeholder="9876543210" />
          </div>
        </div>
      </section>

      {/* Dispatch From */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 border-b border-teal-100 pb-1 mb-3">
          Dispatch From
        </h3>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className={labelCls()}>Name / Store</label>
            <input className={inputCls()} value={data.dispatchName} onChange={e => set({ dispatchName: e.target.value })} placeholder="Store Name" />
          </div>
          <div>
            <label className={labelCls()}>Address</label>
            <input className={inputCls()} value={data.dispatchAddress} onChange={e => set({ dispatchAddress: e.target.value })} placeholder="Street / Area" />
          </div>
          <div>
            <label className={labelCls()}>City</label>
            <input className={inputCls()} value={data.dispatchCity} onChange={e => set({ dispatchCity: e.target.value })} placeholder="City" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls()}>State</label>
              <input className={inputCls()} value={data.dispatchState} onChange={e => set({ dispatchState: e.target.value })} placeholder="MAHARASHTRA" />
            </div>
            <div>
              <label className={labelCls()}>PIN</label>
              <input className={inputCls()} value={data.dispatchPincode} onChange={e => set({ dispatchPincode: e.target.value })} placeholder="402309" />
            </div>
          </div>
        </div>
        <div>
          <label className={labelCls()}>Reference / Notes</label>
          <textarea className={inputCls() + ' resize-none'} rows={2} value={data.reference} onChange={e => set({ reference: e.target.value })} placeholder="Order reference, special instructions..." />
        </div>
      </section>

      {/* Items */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 border-b border-teal-100 pb-1 mb-3">
          Items
        </h3>
        <div className="space-y-2">
          {data.items.map((item, idx) => (
            <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500">Item #{idx + 1}</span>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="col-span-2">
                  <label className={labelCls()}>Item Name</label>
                  {products.length > 0 ? (
                    <div className="relative">
                      <select
                        className={inputCls() + ' pr-8 appearance-none cursor-pointer'}
                        value={item.name || ''}
                        onChange={e => {
                          const selected = products.find(p => p.name === e.target.value);
                          if (selected) selectProduct(item.id, selected);
                          else updateItem(item.id, { name: e.target.value });
                        }}
                      >
                        <option value="">Select product or type...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                      <Package size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  ) : (
                    <input className={inputCls()} value={item.name} onChange={e => updateItem(item.id, { name: e.target.value })} placeholder="Product / Service name" />
                  )}
                </div>
                <div>
                  <label className={labelCls()}>HSN / SAC</label>
                  <input className={inputCls()} value={item.hsnSac} onChange={e => updateItem(item.id, { hsnSac: e.target.value })} placeholder="HSN code" />
                </div>
                <div>
                  <label className={labelCls()}>Unit</label>
                  <input className={inputCls()} value={item.unit} onChange={e => updateItem(item.id, { unit: e.target.value })} placeholder="UNT / KG / PCS" />
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <label className={labelCls()}>Original Rate</label>
                  <input
                    type="number"
                    min="0"
                    className={inputCls()}
                    value={item.originalRate || ''}
                    onChange={e => {
                      const orig = parseFloat(e.target.value) || 0;
                      const newRate = item.discount ? orig * (1 - item.discount / 100) : orig;
                      updateItem(item.id, { originalRate: orig, rate: Math.round(newRate * 100) / 100 });
                    }}
                    placeholder="MRP"
                  />
                </div>
                <div>
                  <label className={labelCls()}>Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className={inputCls()}
                    value={item.discount || ''}
                    onChange={e => {
                      const disc = parseFloat(e.target.value) || 0;
                      const newRate = item.originalRate * (1 - disc / 100);
                      updateItem(item.id, { discount: disc, rate: Math.round(newRate * 100) / 100 });
                    }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={labelCls()}>Sale Rate</label>
                  <input
                    type="number"
                    min="0"
                    className={inputCls()}
                    value={item.rate || ''}
                    onChange={e => {
                      const rate = parseFloat(e.target.value) || 0;
                      const newDiscount = item.originalRate > 0 ? ((item.originalRate - rate) / item.originalRate) * 100 : 0;
                      updateItem(item.id, { rate, discount: Math.round(newDiscount * 100) / 100 });
                    }}
                    placeholder="Rate"
                  />
                </div>
                <div>
                  <label className={labelCls()}>Qty</label>
                  <input
                    type="number"
                    min="0"
                    className={inputCls()}
                    value={item.qty || ''}
                    onChange={e => updateItem(item.id, { qty: parseFloat(e.target.value) || 0 })}
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className={labelCls()}>Amount</label>
                  <div className={inputCls() + ' bg-gray-100 text-gray-600'}>
                    ₹{(Number(item.rate) * Number(item.qty)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addItem}
          className="mt-2 flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 border border-teal-200 hover:border-teal-400 rounded px-3 py-1.5 transition-colors"
        >
          <Plus size={13} /> Add Item
        </button>
      </section>

      {/* Bank Details */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 border-b border-teal-100 pb-1 mb-3">
          Bank Details
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls()}>Bank Name</label>
            <input className={inputCls()} value={data.bankDetails.bankName} onChange={e => setBank({ bankName: e.target.value })} placeholder="ICICI Bank" />
          </div>
          <div>
            <label className={labelCls()}>Account Number</label>
            <input className={inputCls()} value={data.bankDetails.accountNumber} onChange={e => setBank({ accountNumber: e.target.value })} placeholder="123456789012" />
          </div>
          <div>
            <label className={labelCls()}>IFSC Code</label>
            <input className={inputCls()} value={data.bankDetails.ifscCode} onChange={e => setBank({ ifscCode: e.target.value })} placeholder="ICIC0001234" />
          </div>
          <div>
            <label className={labelCls()}>Branch</label>
            <input className={inputCls()} value={data.bankDetails.branch} onChange={e => setBank({ branch: e.target.value })} placeholder="Main Branch" />
          </div>
          <div className="col-span-2">
            <label className={labelCls()}>UPI ID (for QR code)</label>
            <input className={inputCls()} value={data.bankDetails.upiId} onChange={e => setBank({ upiId: e.target.value })} placeholder="yourname@upi" />
          </div>
        </div>
      </section>

      {/* Signature */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 border-b border-teal-100 pb-1 mb-3">
          Signature
        </h3>
        <label className="cursor-pointer block">
          <div className="w-36 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 hover:bg-teal-50 hover:border-teal-300 transition-colors overflow-hidden">
            {data.signatureUrl ? (
              <img src={data.signatureUrl} alt="signature" className="w-full h-full object-contain p-1" />
            ) : (
              <>
                <Upload size={16} className="text-gray-400" />
                <span className="text-[10px] text-gray-400 mt-1">Upload Signature</span>
              </>
            )}
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
        </label>
      </section>

      {/* Notes */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 border-b border-teal-100 pb-1 mb-3">
          Notes
        </h3>
        <textarea
          className={inputCls() + ' resize-none'}
          rows={3}
          value={data.notes}
          onChange={e => set({ notes: e.target.value })}
          placeholder="Add any notes, terms & conditions..."
        />
      </section>
    </div>
  );
}

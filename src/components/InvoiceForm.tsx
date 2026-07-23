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
    itemCode: '',
    name: '',
    hsnSac: '',
    rate: 0,
    originalRate: 0,
    qty: 1,
    unit: 'UNT',
    discount: 0,
    amount: 0,
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 0,
    isNoReturn: false,
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

function sectionTitleCls() {
  return 'text-xs font-bold uppercase tracking-wider text-teal-600 border-b border-teal-100 pb-1 mb-3';
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
      itemCode: product.item_code || '',
      name: product.name,
      hsnSac: product.hsn_sac || '',
      rate: rate,
      originalRate: orig,
      unit: product.unit,
      discount: disc,
      qty: 1,
    });
  };

  // Look up a product purely by its item code and fill the whole row in one go —
  // this is what lets someone just type/scan a code and have the bill populate itself.
  const selectProductByCode = (itemId: string, code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    const match = products.find(p => (p.item_code || '').trim().toLowerCase() === trimmed.toLowerCase());
    if (match) selectProduct(itemId, match);
  };

  return (
    <div className="space-y-5">
      {/* Company Details */}
      <section>
        <h3 className={sectionTitleCls()}>Company Details</h3>
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
              <input className={inputCls()} value={data.companyName} onChange={e => set({ companyName: e.target.value })} placeholder="Endless Electricals" />
            </div>
            <div>
              <label className={labelCls()}>Address</label>
              <input className={inputCls()} value={data.companyAddress} onChange={e => set({ companyAddress: e.target.value })} placeholder="GF 37 K-10 Arcade, 100FT Road, Opp DFA Cinema" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls()}>City / State</label>
                <input className={inputCls()} value={data.companyCity} onChange={e => set({ companyCity: e.target.value })} placeholder="Anand-388001 Gujarat, India" />
              </div>
              <div>
                <label className={labelCls()}>Mobile</label>
                <input className={inputCls()} value={data.companyMobile} onChange={e => set({ companyMobile: e.target.value })} placeholder="+91 9825538373" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={labelCls()}>Email</label>
                <input className={inputCls()} value={data.companyEmail} onChange={e => set({ companyEmail: e.target.value })} placeholder="email@gmail.com" />
              </div>
              <div>
                <label className={labelCls()}>GSTIN</label>
                <input className={inputCls()} value={data.companyGstin} onChange={e => set({ companyGstin: e.target.value })} placeholder="24AAAFE4816E1ZY" />
              </div>
              <div>
                <label className={labelCls()}>PAN</label>
                <input className={inputCls()} value={data.companyPan} onChange={e => set({ companyPan: e.target.value })} placeholder="AFQPV8836E" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Invoice Meta */}
      <section>
        <h3 className={sectionTitleCls()}>Invoice Details</h3>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div>
            <label className={labelCls()}>Invoice #</label>
            <input className={inputCls()} value={data.invoiceNumber} onChange={e => set({ invoiceNumber: e.target.value })} placeholder="G-013" />
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
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div>
            <label className={labelCls()}>P.O. No</label>
            <input className={inputCls()} value={data.poNumber} onChange={e => set({ poNumber: e.target.value })} placeholder="00" />
          </div>
          <div>
            <label className={labelCls()}>Order Date</label>
            <input type="date" className={inputCls()} value={data.orderDate} onChange={e => set({ orderDate: e.target.value })} />
          </div>
          <div>
            <label className={labelCls()}>Payment Terms</label>
            <input className={inputCls()} value={data.paymentTerms} onChange={e => set({ paymentTerms: e.target.value })} placeholder="Advance" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className={labelCls()}>Transporter Name</label>
            <input className={inputCls()} value={data.transporterName} onChange={e => set({ transporterName: e.target.value })} />
          </div>
          <div>
            <label className={labelCls()}>Vehicle No</label>
            <input className={inputCls()} value={data.vehicleNumber} onChange={e => set({ vehicleNumber: e.target.value })} placeholder="GJ22YY4646" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls()}>From</label>
            <input className={inputCls()} value={data.fromLocation} onChange={e => set({ fromLocation: e.target.value })} placeholder="Anand" />
          </div>
          <div>
            <label className={labelCls()}>To</label>
            <input className={inputCls()} value={data.toLocation} onChange={e => set({ toLocation: e.target.value })} placeholder="V U N" />
          </div>
        </div>
      </section>

      {/* Receiver (Bill To) */}
      <section>
        <h3 className={sectionTitleCls()}>Receiver (Bill To)</h3>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className={labelCls()}>Customer / Firm Name</label>
            <input className={inputCls()} value={data.customerName} onChange={e => set({ customerName: e.target.value })} placeholder="M/S Ex-Protecta" />
          </div>
          <div>
            <label className={labelCls()}>Phone Number</label>
            <input className={inputCls()} value={data.customerPhone} onChange={e => set({ customerPhone: e.target.value })} placeholder="9876543210" />
          </div>
        </div>
        <div className="mb-2">
          <label className={labelCls()}>Address</label>
          <input className={inputCls()} value={data.customerAddress} onChange={e => set({ customerAddress: e.target.value })} placeholder="305&306, GIDC, Vithal Udhyognagar, Anand 388001" />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className={labelCls()}>GSTIN/UIN</label>
            <input className={inputCls()} value={data.customerGstin} onChange={e => set({ customerGstin: e.target.value })} placeholder="24AAAFE4816E1ZY" />
          </div>
          <div>
            <label className={labelCls()}>State Name</label>
            <input className={inputCls()} value={data.customerStateName} onChange={e => set({ customerStateName: e.target.value })} placeholder="Gujarat -24" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls()}>Contact Person</label>
            <input className={inputCls()} value={data.customerContactPerson} onChange={e => set({ customerContactPerson: e.target.value })} placeholder="Hasmukhbhai" />
          </div>
          <div>
            <label className={labelCls()}>Contact Number</label>
            <input className={inputCls()} value={data.customerContactNumber} onChange={e => set({ customerContactNumber: e.target.value })} placeholder="9925300886" />
          </div>
        </div>
      </section>

      {/* Consignee (Ship To) */}
      <section>
        <h3 className={sectionTitleCls()}>Consignee (Ship To)</h3>
        <label className="flex items-center gap-2 mb-3 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={data.sameAsReceiver}
            onChange={e => set({ sameAsReceiver: e.target.checked })}
            className="rounded border-gray-300 text-teal-600 focus:ring-teal-400"
          />
          Same as Receiver
        </label>
        {!data.sameAsReceiver && (
          <>
            <div className="mb-2">
              <label className={labelCls()}>Consignee Name</label>
              <input className={inputCls()} value={data.consigneeName} onChange={e => set({ consigneeName: e.target.value })} />
            </div>
            <div className="mb-2">
              <label className={labelCls()}>Address</label>
              <input className={inputCls()} value={data.consigneeAddress} onChange={e => set({ consigneeAddress: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className={labelCls()}>GSTIN/UIN</label>
                <input className={inputCls()} value={data.consigneeGstin} onChange={e => set({ consigneeGstin: e.target.value })} />
              </div>
              <div>
                <label className={labelCls()}>State Name</label>
                <input className={inputCls()} value={data.consigneeStateName} onChange={e => set({ consigneeStateName: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls()}>Contact Person</label>
                <input className={inputCls()} value={data.consigneeContactPerson} onChange={e => set({ consigneeContactPerson: e.target.value })} />
              </div>
              <div>
                <label className={labelCls()}>Contact Number</label>
                <input className={inputCls()} value={data.consigneeContactNumber} onChange={e => set({ consigneeContactNumber: e.target.value })} />
              </div>
            </div>
          </>
        )}
      </section>

      {/* Dispatch From */}
      <section>
        <h3 className={sectionTitleCls()}>Dispatch From</h3>
        <div className="grid grid-cols-5 gap-2 mb-2">
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
          <div>
            <label className={labelCls()}>State</label>
            <input className={inputCls()} value={data.dispatchState} onChange={e => set({ dispatchState: e.target.value })} placeholder="GUJARAT" />
          </div>
          <div>
            <label className={labelCls()}>PIN</label>
            <input className={inputCls()} value={data.dispatchPincode} onChange={e => set({ dispatchPincode: e.target.value })} placeholder="388001" />
          </div>
        </div>
        <div>
          <label className={labelCls()}>Reference / Notes</label>
          <textarea className={inputCls() + ' resize-none'} rows={2} value={data.reference} onChange={e => set({ reference: e.target.value })} placeholder="Order reference, special instructions..." />
        </div>
      </section>

      {/* Items */}
      <section>
        <h3 className={sectionTitleCls()}>Items</h3>
        <div className="space-y-2">
          {data.items.map((item, idx) => (
            <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-500">Item #{idx + 1}</span>
                  {item.isNoReturn && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 border border-red-200">
                      NO RETURN
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-2">
                <div>
                  <label className={labelCls()}>Item Code</label>
                  <input
                    className={inputCls()}
                    value={item.itemCode}
                    onChange={(e) => updateItem(item.id, { itemCode: e.target.value })}
                    onBlur={(e) => selectProductByCode(item.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        selectProductByCode(item.id, (e.target as HTMLInputElement).value);
                      }
                    }}
                    placeholder="Type code, e.g. EX-1001 ↵"
                    title="Type a product's item code and press Enter/Tab — the rest of the row fills in automatically."
                  />
                </div>
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
              </div>
              <div className="grid grid-cols-6 gap-2 mb-2">
                <div>
                  <label className={labelCls()}>Unit</label>
                  <input className={inputCls()} value={item.unit} onChange={e => updateItem(item.id, { unit: e.target.value })} placeholder="UNT / KG / PCS" />
                </div>
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
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelCls()}>CGST %</label>
                  <input
                    type="number"
                    min="0"
                    className={inputCls()}
                    value={item.cgstRate || ''}
                    onChange={e => updateItem(item.id, { cgstRate: parseFloat(e.target.value) || 0 })}
                    placeholder="9"
                  />
                </div>
                <div>
                  <label className={labelCls()}>SGST %</label>
                  <input
                    type="number"
                    min="0"
                    className={inputCls()}
                    value={item.sgstRate || ''}
                    onChange={e => updateItem(item.id, { sgstRate: parseFloat(e.target.value) || 0 })}
                    placeholder="9"
                  />
                </div>
                <div>
                  <label className={labelCls()}>IGST %</label>
                  <input
                    type="number"
                    min="0"
                    className={inputCls()}
                    value={item.igstRate || ''}
                    onChange={e => updateItem(item.id, { igstRate: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
              <label className="mt-2 flex items-center gap-1.5 cursor-pointer w-fit">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-red-600 cursor-pointer"
                  checked={!!item.isNoReturn}
                  onChange={e => updateItem(item.id, { isNoReturn: e.target.checked })}
                />
                <span className="text-xs font-medium text-red-600">Mark as No Return item</span>
              </label>
            </div>
          ))}
        </div>
        <button
          onClick={addItem}
          type="button"
          className="mt-2 flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 border border-teal-200 hover:border-teal-400 rounded px-3 py-1.5 transition-colors"
        >
          <Plus size={13} /> Add Item
        </button>
      </section>

      {/* Bank Details */}
      <section>
        <h3 className={sectionTitleCls()}>Bank Details</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls()}>Bank Name</label>
            <input className={inputCls()} value={data.bankDetails.bankName} onChange={e => setBank({ bankName: e.target.value })} placeholder="BANK OF BARODA" />
          </div>
          <div>
            <label className={labelCls()}>Account Number</label>
            <input className={inputCls()} value={data.bankDetails.accountNumber} onChange={e => setBank({ accountNumber: e.target.value })} placeholder="46510208000210" />
          </div>
          <div>
            <label className={labelCls()}>IFSC Code</label>
            <input className={inputCls()} value={data.bankDetails.ifscCode} onChange={e => setBank({ ifscCode: e.target.value })} placeholder="BARB0AKROL" />
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
        <h3 className={sectionTitleCls()}>Signature</h3>
        <label className="cursor-pointer block">
          <div className="w-36 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 hover:bg-teal-50 hover:border-teal-300 transition-colors overflow-hidden">
            {data.signatureUrl ? (
              <img src={data.signatureUrl} alt="signature" className="w-full h-full object-contain" />
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

      {/* Special Note */}
      <section>
        <h3 className={sectionTitleCls()}>Special Note</h3>
        <textarea
          className={inputCls() + ' resize-none'}
          rows={2}
          value={data.specialNotes}
          onChange={e => set({ specialNotes: e.target.value })}
          placeholder="Any special note for this invoice..."
        />
      </section>

      {/* Notes */}
      <section>
        <h3 className={sectionTitleCls()}>Notes</h3>
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

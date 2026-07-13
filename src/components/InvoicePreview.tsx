import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { InvoiceData } from '../types/invoice';
import { numberToWords } from '../utils/numberToWords';

interface Props {
  data: InvoiceData;
}

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string) {
  if (!d) return '';
  try {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

const CELL = 'border border-gray-300 p-1.5';
const LABEL = 'text-[9px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5';

const InvoicePreview = React.forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const filledItems = data.items.filter(i => i.name);
  const totalQty = data.items.reduce((s, i) => s + Number(i.qty), 0);
  // Total = sum of amounts (at discounted/sale rates)
  const totalAmount = data.items.reduce((s, i) => s + Number(i.amount), 0);
  // Total Discount = savings from original rate vs sale rate
  const totalDiscount = data.items.reduce((s, i) => {
    const orig = Number(i.originalRate);
    const sale = Number(i.rate);
    return s + (orig > sale && orig > 0 ? (orig - sale) * Number(i.qty) : 0);
  }, 0);
  const amountPayable = totalAmount;

  const upiString = data.bankDetails.upiId
    ? `upi://pay?pa=${data.bankDetails.upiId}&pn=${encodeURIComponent(data.companyName)}&cu=INR`
    : '';

  // Ensure minimum rows in items table (keeps the A4 proportions instead of a square block)
  const MIN_ROWS = 6;
  const emptyCount = Math.max(0, MIN_ROWS - filledItems.length);

  return (
    <div
      ref={ref}
      id="invoice-preview"
      className="bg-white text-gray-800 border-2 border-gray-800"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10px', minWidth: '580px', maxWidth: '580px' }}
    >
      {/* ── Row 1: INVOICE title ── */}
      <div className="grid border-b border-gray-300" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
        <div />
        <div className="px-3 py-1.5 text-center">
          <span
            className="font-bold tracking-[0.3em] text-gray-800"
            style={{ fontSize: '13px', letterSpacing: '0.3em' }}
          >
            I N V O I C E
          </span>
        </div>
        <div className="flex items-center justify-end px-3 py-1.5">
          <span className="text-[9px] font-semibold text-gray-600 tracking-wide">
            ORIGINAL FOR RECIPIENT
          </span>
        </div>
      </div>

      {/* ── Row 2: Company | Invoice Meta ── */}
      <div className="grid border-b border-gray-300" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Company */}
        <div className="flex items-start gap-2 p-2 border-r border-gray-300">
          {data.logoUrl ? (
            <img
              src={data.logoUrl}
              alt="logo"
              className="flex-shrink-0 object-contain"
              style={{ width: '60px', height: '60px' }}
            />
          ) : (
            <div
              className="flex-shrink-0 bg-gray-100 border border-dashed border-gray-400 flex items-center justify-center text-gray-400 text-center"
              style={{ width: '60px', height: '60px', fontSize: '9px' }}
            >
              Logo
            </div>
          )}
          <div style={{ fontSize: '10px' }}>
            <div className="font-bold" style={{ fontSize: '11px' }}>
              {data.companyName || 'Company Name'}
            </div>
            <div className="text-gray-500" style={{ fontSize: '9px' }}>Prop: Owner Name</div>
            <div className="text-gray-600 mt-0.5 leading-tight">
              {data.companyAddress && <div>{data.companyAddress}</div>}
              {data.companyCity && <div>{data.companyCity}</div>}
              {data.companyMobile && <div>Mobile: {data.companyMobile}</div>}
            </div>
          </div>
        </div>

        {/* Invoice meta – 2×2 grid with borders */}
        <div>
          <div className="grid border-b border-gray-300" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="p-2 border-r border-gray-300">
              <div className={LABEL}>Invoice #:</div>
              <div className="font-bold" style={{ fontSize: '11px' }}>
                {data.invoiceNumber || 'INV-1'}
              </div>
            </div>
            <div className="p-2">
              <div className={LABEL}>Invoice Date:</div>
              <div className="font-bold" style={{ fontSize: '11px' }}>
                {formatDate(data.invoiceDate)}
              </div>
            </div>
          </div>
          <div className="p-2">
            <div className={LABEL}>Due Date:</div>
            <div className="font-bold" style={{ fontSize: '11px' }}>
              {formatDate(data.dueDate)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Customer | Dispatch From ── */}
      <div className="grid border-b border-gray-300" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="p-2 border-r border-gray-300" style={{ minHeight: '70px' }}>
          <div className={LABEL}>Customer Details:</div>
          <div className="font-bold mt-0.5" style={{ fontSize: '11px' }}>
            {data.customerName || ''}
          </div>
          {data.customerPhone && (
            <div className="text-gray-600 mt-0.5" style={{ fontSize: '10px' }}>Ph: {data.customerPhone}</div>
          )}
        </div>
        <div className="p-2" style={{ minHeight: '70px' }}>
          <div className={LABEL}>Dispatch From:</div>
          <div className="leading-tight text-gray-700 mt-0.5" style={{ fontSize: '10px' }}>
            {data.dispatchName && <div>{data.dispatchName}</div>}
            {data.dispatchAddress && <div>{data.dispatchAddress}</div>}
            {data.dispatchCity && <div>{data.dispatchCity}</div>}
            {(data.dispatchState || data.dispatchPincode) && (
              <div>
                {[data.dispatchState, data.dispatchPincode].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
          {data.reference && (
            <div className="mt-1">
              <span className="font-semibold text-gray-700" style={{ fontSize: '10px' }}>Ref:</span>
              <div className="text-gray-600" style={{ fontSize: '9px' }}>{data.reference}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 4: Items Table ── */}
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr className="border-b-2 border-gray-300 bg-white">
            <th className={CELL + ' text-left font-semibold text-gray-700'} style={{ width: '28px' }}>#</th>
            <th className={CELL + ' text-left font-semibold text-gray-700'}>Item</th>
            <th className={CELL + ' text-left font-semibold text-gray-700'} style={{ width: '80px' }}>HSN/SAC</th>
            <th className={CELL + ' text-right font-semibold text-gray-700'} style={{ width: '100px' }}>Rate / Item</th>
            <th className={CELL + ' text-right font-semibold text-gray-700'} style={{ width: '70px' }}>Qty</th>
            <th className={CELL + ' text-right font-semibold text-gray-700'} style={{ width: '80px' }}>Discount</th>
            <th className={CELL + ' text-right font-semibold text-gray-700'} style={{ width: '90px' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => {
            const origRate = Number(item.originalRate);
            const saleRate = Number(item.rate);
            const hasDiscount = origRate > saleRate && origRate > 0 && saleRate > 0;
            const discPct = hasDiscount
              ? (((origRate - saleRate) / origRate) * 100).toFixed(2)
              : null;
            const discAmt = hasDiscount ? (origRate - saleRate) * Number(item.qty) : 0;
            return (
              <tr key={item.id} className="border-b border-gray-200">
                <td className={CELL + ' text-gray-500 align-top text-center'}>{idx + 1}</td>
                <td className={CELL + ' align-top font-semibold'}>{item.name}</td>
                <td className={CELL + ' align-top text-gray-500 text-center'}>{item.hsnSac}</td>
                <td className={CELL + ' align-top text-right'}>
                  {saleRate > 0 && <div className="font-medium">{fmt(saleRate)}</div>}
                  {hasDiscount && (
                    <div className="text-gray-400" style={{ fontSize: '9px' }}>
                      MRP: {fmt(origRate)}
                    </div>
                  )}
                </td>
                <td className={CELL + ' align-top text-right'}>
                  {Number(item.qty) > 0 && (
                    <>{item.qty} {item.unit}</>
                  )}
                </td>
                <td className={CELL + ' align-top text-right'}>
                  {hasDiscount ? (
                    <div>
                      <div className="text-red-600 font-medium">₹{fmt(discAmt)}</div>
                      <div className="text-gray-400" style={{ fontSize: '9px' }}>({discPct}%)</div>
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className={CELL + ' align-top text-right font-medium'}>
                  {Number(item.amount) > 0 && fmt(Number(item.amount))}
                </td>
              </tr>
            );
          })}
          {/* Empty rows to fill minimum height */}
          {Array.from({ length: emptyCount }).map((_, i) => (
            <tr key={`empty-${i}`} style={{ height: '20px' }}>
              <td className={CELL}></td>
              <td className={CELL}></td>
              <td className={CELL}></td>
              <td className={CELL}></td>
              <td className={CELL}></td>
              <td className={CELL}></td>
              <td className={CELL}></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Row 5: Total Items / Qty ── */}
      <div className="border-t border-b border-gray-300 px-3 py-1 text-gray-600" style={{ fontSize: '10px' }}>
        Total Items / Qty : {filledItems.length} / {totalQty}
      </div>

      {/* ── Row 6: Totals (right-aligned) ── */}
      <div className="border-b border-gray-300">
        <div className="flex justify-end">
          <table style={{ fontSize: '10px', minWidth: '220px' }}>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="px-3 py-1 font-semibold text-gray-700">Total</td>
                <td className="px-3 py-1 font-semibold text-right">₹{fmt(totalAmount)}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="px-3 py-1 font-semibold text-gray-700">Total Discount</td>
                <td className="px-3 py-1 text-right">₹{fmt(totalDiscount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Amount in words row */}
        <div className="border-t border-gray-200 px-3 py-1 text-gray-600" style={{ fontSize: '10px' }}>
          Total amount (in words):{' '}
          <span className="font-medium text-gray-800">{numberToWords(amountPayable)}</span>
        </div>
        {/* Amount Payable */}
        <div className="flex justify-end border-t border-gray-300">
          <div className="flex items-center gap-6 px-3 py-1.5">
            <span className="font-bold text-gray-800" style={{ fontSize: '11px' }}>
              Amount Payable:
            </span>
            <span className="font-bold text-gray-900" style={{ fontSize: '12px' }}>
              ₹{fmt(amountPayable)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Row 7: Bank | UPI QR | Signature ── */}
      <div className="grid border-b border-gray-300" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        {/* Bank Details */}
        <div className="p-2 border-r border-gray-300">
          <div className="font-bold mb-1" style={{ fontSize: '10px' }}>Bank Details:</div>
          <table style={{ fontSize: '10px', width: '100%' }}>
            <tbody>
              <tr>
                <td className="text-gray-500 pr-1 py-0.5 align-top whitespace-nowrap">Bank:</td>
                <td className="font-semibold py-0.5">{data.bankDetails.bankName}</td>
              </tr>
              <tr>
                <td className="text-gray-500 pr-1 py-0.5 align-top whitespace-nowrap">A/C:</td>
                <td className="font-semibold py-0.5">{data.bankDetails.accountNumber}</td>
              </tr>
              <tr>
                <td className="text-gray-500 pr-1 py-0.5 align-top whitespace-nowrap">IFSC:</td>
                <td className="font-semibold py-0.5">{data.bankDetails.ifscCode}</td>
              </tr>
              <tr>
                <td className="text-gray-500 pr-1 py-0.5 align-top whitespace-nowrap">Branch:</td>
                <td className="font-semibold py-0.5">{data.bankDetails.branch}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* UPI QR */}
        <div className="p-2 flex flex-col items-center justify-start border-r border-gray-300">
          <div className="font-bold mb-1" style={{ fontSize: '10px' }}>Pay using UPI:</div>
          {upiString ? (
            <QRCodeSVG value={upiString} size={80} level="M" includeMargin />
          ) : (
            <div
              className="border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-center"
              style={{ width: '80px', height: '80px', fontSize: '9px' }}
            >
              Enter UPI ID
            </div>
          )}
        </div>

        {/* Signature */}
        <div className="p-2 flex flex-col items-end">
          <div className="text-gray-600 mb-0.5" style={{ fontSize: '10px' }}>
            For {data.companyName || 'Company'}
          </div>
          {data.signatureUrl ? (
            <img
              src={data.signatureUrl}
              alt="signature"
              className="object-contain my-0.5"
              style={{ width: '90px', height: '55px' }}
            />
          ) : (
            <div
              className="border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-center my-0.5"
              style={{ width: '90px', height: '55px', fontSize: '9px' }}
            >
              Signature
            </div>
          )}
          <div className="text-gray-600 mt-0.5" style={{ fontSize: '10px' }}>
            Authorized Signatory
          </div>
        </div>
      </div>

      {/* ── Row 8: Notes ── */}
      <div className="border-b border-gray-300" style={{ minHeight: '50px' }}>
        <div className="p-2">
          <div className="font-bold mb-0.5" style={{ fontSize: '10px' }}>Notes:</div>
          {data.notes && (
            <div
              className="text-gray-600 whitespace-pre-line leading-tight"
              style={{ fontSize: '10px' }}
            >
              {data.notes}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex justify-end px-3 py-1">
        <span style={{ fontSize: '8px' }} className="text-gray-400">
          Powered By{' '}
          <span className="font-bold text-gray-600">Endless Electrical</span>
        </span>
      </div>
    </div>
  );
});

InvoicePreview.displayName = 'InvoicePreview';
export default InvoicePreview;

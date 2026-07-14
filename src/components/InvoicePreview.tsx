import React from 'react';
import { InvoiceData } from '../types/invoice';
import { numberToWords } from '../utils/numberToWords';

interface Props { data: InvoiceData; }

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(d: string) {
  if (!d) return '';
  try {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return d; }
}

const CELL = 'border border-black px-1.5 py-1 align-top';
const HCELL = 'border border-black px-1 py-1 bg-orange-50 font-bold text-center';

const InvoicePreview = React.forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const items = data.items.filter(i => i.name);

  const rows = items.map(i => {
    const taxable = Number(i.rate) * Number(i.qty);
    const cgstAmt = taxable * (Number(i.cgstRate) / 100);
    const sgstAmt = taxable * (Number(i.sgstRate) / 100);
    const igstAmt = taxable * (Number(i.igstRate) / 100);
    const total = taxable + cgstAmt + sgstAmt + igstAmt;
    return { ...i, taxable, cgstAmt, sgstAmt, igstAmt, total };
  });

  const totalQty = rows.reduce((s, r) => s + Number(r.qty), 0);
  const totalTaxable = rows.reduce((s, r) => s + r.taxable, 0);
  const totalCgst = rows.reduce((s, r) => s + r.cgstAmt, 0);
  const totalSgst = rows.reduce((s, r) => s + r.sgstAmt, 0);
  const totalIgst = rows.reduce((s, r) => s + r.igstAmt, 0);
  const grandTotal = totalTaxable + totalCgst + totalSgst + totalIgst;

  // representative rates (first item) for the summary box, since GST is usually uniform per invoice
  const cgstRatePct = rows[0]?.cgstRate ?? 0;
  const sgstRatePct = rows[0]?.sgstRate ?? 0;
  const igstRatePct = rows[0]?.igstRate ?? 0;

  const MIN_ROWS = 1;
  const emptyCount = Math.max(0, MIN_ROWS - rows.length);

  return (
    <div
      ref={ref}
      id="invoice-preview"
      className="bg-white text-black border-2 border-black"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '9.5px', minWidth: '620px', maxWidth: '620px' }}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between border-b border-black px-3 py-2">
        <div className="flex items-start gap-2">
          <img src="/logo.png" alt="logo" style={{ width: '44px', height: '44px' }} className="object-contain flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-black text-orange-500 leading-none" style={{ fontSize: '19px', letterSpacing: '0.01em' }}>
              ENDLESS ELECTRICALS
            </div>
            <div style={{ fontSize: '8px' }} className="leading-tight text-gray-700 mt-0.5">
              {data.companyAddress}{data.companyCity && `, ${data.companyCity}`}
            </div>
            <div style={{ fontSize: '8px' }} className="text-gray-700">
              MO. {data.companyMobile}{data.companyEmail ? `, Email: ${data.companyEmail}` : ''}, GSTIN NO. {data.companyGstin}
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div style={{ fontSize: '9px' }} className="text-gray-500">Original For Recipient</div>
          <div style={{ fontSize: '9px' }} className="text-gray-500">Duplicate For Transporter</div>
          <div className="font-bold mt-1" style={{ fontSize: '11px' }}>Tax Invoice</div>
        </div>
      </div>

      {/* ── Meta: 2 rows x 3 cols ── */}
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td className={CELL}><b>Invoice No.</b> {data.invoiceNumber}</td>
            <td className={CELL}><b>P.O.No:</b> {data.poNumber}</td>
            <td className={CELL}><b>Delivery Order Number:</b></td>
          </tr>
          <tr>
            <td className={CELL}><b>Invoice Date:</b> {formatDate(data.invoiceDate)}</td>
            <td className={CELL}><b>Order Date:</b> {formatDate(data.orderDate)}</td>
            <td className={CELL}><b>Transporter Name:</b> {data.transporterName}</td>
          </tr>
          <tr>
            <td className={CELL}><b>Payment Terms:</b>{data.paymentTerms}</td>
            <td className={CELL}><b>Vehicle No:</b> {data.vehicleNumber}</td>
            <td className={CELL}>From: {data.fromLocation}  To:{data.toLocation}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Receiver / Consignee ── */}
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td className={CELL} style={{ width: '50%' }}>
              <div className="font-bold">Receiver (Bill to):</div>
              <div className="font-semibold">{data.customerName}</div>
              <div>{data.customerAddress}</div>
              <div>GSTIN/UIN: {data.customerGstin}</div>
              <div>State Name: {data.customerStateName}</div>
              <div>Contact Person: Mr.{data.customerContactPerson}</div>
              <div>Contact Number: {data.customerContactNumber || data.customerPhone}</div>
            </td>
            <td className={CELL}>
              <div className="font-bold">Consignee (Ship to):</div>
              <div className="font-semibold">{data.sameAsReceiver ? data.customerName : data.consigneeName}</div>
              <div>{data.sameAsReceiver ? data.customerAddress : data.consigneeAddress}</div>
              <div>GSTIN/UIN: {data.sameAsReceiver ? data.customerGstin : data.consigneeGstin}</div>
              <div>State Name: {data.sameAsReceiver ? data.customerStateName : data.consigneeStateName}</div>
              <div>Contact Person: Mr.{data.sameAsReceiver ? data.customerContactPerson : data.consigneeContactPerson}</div>
              <div>Contact Number: {data.sameAsReceiver ? (data.customerContactNumber || data.customerPhone) : data.consigneeContactNumber}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Items table (always shows CGST/SGST/IGST columns, like the photo) ── */}
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th className={HCELL} style={{ width: '20px' }}>Sr<br/>No</th>
            <th className={HCELL}>Description of Goods/Services</th>
            <th className={HCELL} style={{ width: '38px' }}>HSN<br/>Code</th>
            <th className={HCELL} style={{ width: '26px' }}>Qty</th>
            <th className={HCELL} style={{ width: '28px' }}>Unit</th>
            <th className={HCELL} style={{ width: '48px' }}>Rate</th>
            <th className={HCELL} style={{ width: '55px' }}>Taxable<br/>Value</th>
            <th className={HCELL} style={{ width: '48px' }}>CGST<br/>Rate/Amt</th>
            <th className={HCELL} style={{ width: '48px' }}>SGST<br/>Rate/Amt</th>
            <th className={HCELL} style={{ width: '36px' }}>IGST</th>
            <th className={HCELL} style={{ width: '58px' }}>Total Amt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.id}>
              <td className={CELL + ' text-center'}>{idx + 1}</td>
              <td className={CELL}>{r.name}</td>
              <td className={CELL + ' text-center'}>{r.hsnSac}</td>
              <td className={CELL + ' text-center'}>{r.qty}</td>
              <td className={CELL + ' text-center'}>{r.unit}</td>
              <td className={CELL + ' text-right'}>{fmt(Number(r.rate))}</td>
              <td className={CELL + ' text-right'}>{fmt(r.taxable)}</td>
              <td className={CELL + ' text-center'}>{r.cgstRate}%</td>
              <td className={CELL + ' text-center'}>{r.sgstRate}%</td>
              <td className={CELL + ' text-center'}>{r.igstRate || 0}</td>
              <td className={CELL + ' text-right font-semibold'}>{fmt(r.total)}</td>
            </tr>
          ))}
          {Array.from({ length: emptyCount }).map((_, i) => (
            <tr key={`empty-${i}`} style={{ height: '18px' }}>
              {Array.from({ length: 11 }).map((__, j) => <td key={j} className={CELL}></td>)}
            </tr>
          ))}
          {/* totals row — matches "28800.00 | 3150.00 | 3150.00 | 0 | 41300.00" */}
          <tr className="font-bold">
            <td className={CELL} colSpan={3}></td>
            <td className={CELL + ' text-center'}>{totalQty}</td>
            <td className={CELL}></td>
            <td className={CELL}></td>
            <td className={CELL + ' text-right'}>{fmt(totalTaxable)}</td>
            <td className={CELL + ' text-right'}>{fmt(totalCgst)}</td>
            <td className={CELL + ' text-right'}>{fmt(totalSgst)}</td>
            <td className={CELL + ' text-center'}>{totalIgst ? fmt(totalIgst) : '0'}</td>
            <td className={CELL + ' text-right'}>{fmt(grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Our GSTIN | Bank Details + GST breakdown ── */}
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td className={CELL} style={{ width: '50%' }}>
              <div><b>Our GSTIN Number</b></div>
              <div>GSTIN Number: {data.companyGstin}</div>
              <div>PAN Number: {data.companyPan}</div>
              <div className="mt-1"><b>Special Note:</b></div>
              <div>{data.specialNotes}</div>
            </td>
            <td className={CELL}>
              <table style={{ width: '100%', fontSize: '9.5px' }}>
                <tbody>
                  <tr>
                    <td className="pr-2"><b>Bank Details</b>: {data.bankDetails.bankName}</td>
                    <td className="text-right">CGST: {cgstRatePct}% {fmt(totalCgst)}</td>
                  </tr>
                  <tr>
                    <td className="pr-2">A/c No: {data.bankDetails.accountNumber}</td>
                    <td className="text-right">SGST: {sgstRatePct}% {fmt(totalSgst)}</td>
                  </tr>
                  <tr>
                    <td className="pr-2">IFSC Code: {data.bankDetails.ifscCode}</td>
                    <td className="text-right">IGST: {igstRatePct}%</td>
                  </tr>
                  <tr>
                    <td className="pr-2 font-bold" colSpan={2}>Invoice Amt: {fmt(grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td className={CELL} colSpan={2}>
              <b>Delivery Add/Note</b>
              <div className="mt-0.5">INR {numberToWords(grandTotal)} Only</div>
            </td>
          </tr>
          <tr>
            <td className={CELL} colSpan={2}>
              <b>Out standing Amt:</b>
              <div style={{ fontSize: '8px' }} className="mt-0.5">
                We Declare that this invoice shows the actual price of the goods described and that all particulars are true and
                correct. Please make payment within due date. Goods once sold will not be taken back except manufacturing packing,
                cracked or cut cables &amp; goods will not be taken back.
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Signature ── */}
      <div className="flex justify-between px-3 py-3">
        <div style={{ fontSize: '10px' }}>Customer's Signature</div>
        <div className="text-right" style={{ fontSize: '10px' }}>
          {data.signatureUrl && (
            <img src={data.signatureUrl} alt="signature" className="object-contain mb-1 ml-auto" style={{ width: '90px', height: '50px' }} />
          )}
          <div>For ENDLESS ELECTRICALS</div>
        </div>
      </div>
    </div>
  );
});

InvoicePreview.displayName = 'InvoicePreview';
export default InvoicePreview;

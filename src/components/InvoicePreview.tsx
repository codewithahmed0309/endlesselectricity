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

const CELL = 'border border-black px-1.5 py-1';
const HCELL = CELL + ' bg-orange-50 font-semibold text-center';

const InvoicePreview = React.forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const items = data.items.filter(i => i.name);

  const rows = items.map(i => {
    const taxable = Number(i.rate) * Number(i.qty);
    const cgstAmt = data.interState ? 0 : taxable * (Number(i.cgstRate) / 100);
    const sgstAmt = data.interState ? 0 : taxable * (Number(i.sgstRate) / 100);
    const igstAmt = data.interState ? taxable * (Number(i.igstRate) / 100) : 0;
    const total = taxable + cgstAmt + sgstAmt + igstAmt;
    return { ...i, taxable, cgstAmt, sgstAmt, igstAmt, total };
  });

  const totalQty = rows.reduce((s, r) => s + Number(r.qty), 0);
  const totalTaxable = rows.reduce((s, r) => s + r.taxable, 0);
  const totalCgst = rows.reduce((s, r) => s + r.cgstAmt, 0);
  const totalSgst = rows.reduce((s, r) => s + r.sgstAmt, 0);
  const totalIgst = rows.reduce((s, r) => s + r.igstAmt, 0);
  const grandTotal = totalTaxable + totalCgst + totalSgst + totalIgst;

  return (
    <div
      ref={ref}
      id="invoice-preview"
      className="bg-white text-black border-2 border-black"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10px', minWidth: '620px', maxWidth: '620px' }}
    >
      {/* Header: logo + company name + Tax Invoice */}
      <div className="flex items-center justify-between border-b border-black px-3 py-2">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="logo" style={{ width: '46px', height: '46px' }} className="object-contain" />
          <div>
            <div className="font-extrabold text-orange-500" style={{ fontSize: '16px', letterSpacing: '0.02em' }}>
              {data.companyName || 'Company Name'}
            </div>
            <div style={{ fontSize: '8.5px' }} className="leading-tight text-gray-700">
              {data.companyAddress}
              {data.companyCity && <>, {data.companyCity}</>}
            </div>
            <div style={{ fontSize: '8.5px' }} className="text-gray-700">
              MO. {data.companyMobile} Email: {' '}
              GSTIN NO. {data.companyGstin}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold underline" style={{ fontSize: '12px' }}>Tax Invoice</div>
        </div>
      </div>

      {/* Invoice meta row */}
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
            <td className={CELL}><b>Payment Terms:</b> {data.paymentTerms}</td>
            <td className={CELL}><b>Vehicle No:</b> {data.vehicleNumber}</td>
            <td className={CELL}>From: {data.fromLocation}  To: {data.toLocation}</td>
          </tr>
        </tbody>
      </table>

      {/* Receiver / Consignee */}
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td className={CELL} style={{ width: '50%', verticalAlign: 'top' }}>
              <div className="font-bold">Receiver (Bill to):</div>
              <div className="font-semibold">{data.customerName}</div>
              <div>{data.customerAddress}</div>
              <div>GSTIN/UIN: {data.customerGstin}</div>
              <div>State Name: {data.customerStateName}</div>
              <div>Contact Person: Mr.{data.customerContactPerson}</div>
              <div>Contact Number: {data.customerContactNumber || data.customerPhone}</div>
            </td>
            <td className={CELL} style={{ verticalAlign: 'top' }}>
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

      {/* Items table */}
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th className={HCELL} style={{ width: '22px' }}>Sr.<br/>No</th>
            <th className={HCELL}>Description of Goods/Services</th>
            <th className={HCELL} style={{ width: '48px' }}>HSN<br/>Code</th>
            <th className={HCELL} style={{ width: '32px' }}>Qty</th>
            <th className={HCELL} style={{ width: '32px' }}>Unit</th>
            <th className={HCELL} style={{ width: '55px' }}>Rate</th>
            <th className={HCELL} style={{ width: '60px' }}>Taxable<br/>Value</th>
            {!data.interState && <>
              <th className={HCELL} style={{ width: '32px' }}>CGST<br/>Rate</th>
              <th className={HCELL} style={{ width: '45px' }}>CGST<br/>Amt</th>
              <th className={HCELL} style={{ width: '32px' }}>SGST<br/>Rate</th>
              <th className={HCELL} style={{ width: '45px' }}>SGST<br/>Amt</th>
            </>}
            {data.interState && <>
              <th className={HCELL} style={{ width: '32px' }}>IGST<br/>Rate</th>
              <th className={HCELL} style={{ width: '45px' }}>IGST<br/>Amt</th>
            </>}
            <th className={HCELL} style={{ width: '65px' }}>Total Amt</th>
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
              {!data.interState && <>
                <td className={CELL + ' text-center'}>{r.cgstRate}%</td>
                <td className={CELL + ' text-right'}>{fmt(r.cgstAmt)}</td>
                <td className={CELL + ' text-center'}>{r.sgstRate}%</td>
                <td className={CELL + ' text-right'}>{fmt(r.sgstAmt)}</td>
              </>}
              {data.interState && <>
                <td className={CELL + ' text-center'}>{r.igstRate}%</td>
                <td className={CELL + ' text-right'}>{fmt(r.igstAmt)}</td>
              </>}
              <td className={CELL + ' text-right font-semibold'}>{fmt(r.total)}</td>
            </tr>
          ))}
          {/* totals row */}
          <tr className="font-bold">
            <td className={CELL} colSpan={3}></td>
            <td className={CELL + ' text-center'}>{totalQty}</td>
            <td className={CELL}></td>
            <td className={CELL}></td>
            <td className={CELL + ' text-right'}>{fmt(totalTaxable)}</td>
            {!data.interState && <>
              <td className={CELL}></td>
              <td className={CELL + ' text-right'}>{fmt(totalCgst)}</td>
              <td className={CELL}></td>
              <td className={CELL + ' text-right'}>{fmt(totalSgst)}</td>
            </>}
            {data.interState && <>
              <td className={CELL}></td>
              <td className={CELL + ' text-right'}>{fmt(totalIgst)}</td>
            </>}
            <td className={CELL + ' text-right'}>{fmt(grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      {/* Bank + GST + PAN + Amount in words */}
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td className={CELL} style={{ width: '50%', verticalAlign: 'top' }}>
              <div><b>Our GSTIN Number</b></div>
              <div>GSTIN Number: {data.companyGstin}</div>
              <div>PAN Number: {data.companyPan}</div>
              <div className="mt-1"><b>Special Note:</b></div>
              <div>{data.specialNotes}</div>
            </td>
            <td className={CELL} style={{ verticalAlign: 'top' }}>
              <div><b>Bank Details:</b> BANK OF BARODA</div>
              <div>Bank: {data.bankDetails.bankName}</div>
              <div>A/c No: {data.bankDetails.accountNumber}</div>
              <div>IFSC Code: {data.bankDetails.ifscCode}</div>
              <div className="mt-1 font-bold">Invoice Amt: {fmt(grandTotal)}</div>
            </td>
          </tr>
          <tr>
            <td className={CELL} colSpan={2}>
              <b>Delivery Add/Note</b>
              <div>INR {numberToWords(grandTotal)} Only</div>
            </td>
          </tr>
          <tr>
            <td className={CELL} colSpan={2} style={{ fontSize: '8.5px' }}>
              We Declare that this invoice shows the actual price of the goods described and that all particulars are true and
              correct. Please make payment within due date. Goods once sold will not be taken back except manufacturing packing,
              cracked or cut cables and goods will not be taken back.
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signature */}
      <div className="flex justify-between px-3 py-3">
        <div style={{ fontSize: '10px' }}>Customer's Signature</div>
        <div className="text-right" style={{ fontSize: '10px' }}>
          For {data.companyName || 'Company'}
          {data.signatureUrl && (
            <img src={data.signatureUrl} alt="signature" className="object-contain mt-1 ml-auto" style={{ width: '90px', height: '50px' }} />
          )}
          <div className="mt-1">Authorized Signatory</div>
        </div>
      </div>
    </div>
  );
});

InvoicePreview.displayName = 'InvoicePreview';
export default InvoicePreview;

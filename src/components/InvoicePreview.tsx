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
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return d; }
}

// ── Border styling ──────────────────────────────────────────────────────────
// IMPORTANT: We intentionally do NOT use Tailwind's `border` classes combined
// with `border-collapse: collapse` here. html2canvas (used for PDF/PNG export)
// does not render collapsed table borders correctly at high `scale` values —
// it over-draws the shared edges, and those thick edges bleed over into
// neighboring cell text. This is invisible in the live browser preview
// (which handles collapse correctly) but shows up clearly in exports.
//
// Fix: draw all borders using inset `box-shadow` instead of the `border`
// property, and use `borderCollapse: 'separate', borderSpacing: 0` on every
// table. box-shadow borders are rendered pixel-accurately by html2canvas.
const CELL_STYLE: React.CSSProperties = {
  boxShadow: 'inset 0 0 0 1px #000',
  padding: '2px 6px',
  verticalAlign: 'top',
};
const CELL_NT_STYLE: React.CSSProperties = {
  // "No top" border variant — used directly under a table/box that already
  // has its own bottom edge, so we skip the top edge to avoid a doubled line.
  boxShadow: 'inset -1px 0 0 0 #000, inset 1px 0 0 0 #000, inset 0 -1px 0 0 #000',
  padding: '2px 6px',
  verticalAlign: 'top',
};
const TABLE_STYLE: React.CSSProperties = { borderCollapse: 'separate', borderSpacing: 0 };
const LBL = 'text-[9px] text-gray-600';

const InvoicePreview = React.forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const items = data.items.filter(i => i.name);

  const rows = items.map(i => {
    const taxable = Number(i.rate) * Number(i.qty);
    const cgstAmt = taxable * (Number(i.cgstRate) / 100);
    const sgstAmt = taxable * (Number(i.sgstRate) / 100);
    const igstAmt = taxable * (Number(i.igstRate) / 100);
    return { ...i, taxable, cgstAmt, sgstAmt, igstAmt };
  });

  const totalQty = rows.reduce((s, r) => s + Number(r.qty), 0);
  const totalTaxable = rows.reduce((s, r) => s + r.taxable, 0);
  const totalCgst = rows.reduce((s, r) => s + r.cgstAmt, 0);
  const totalSgst = rows.reduce((s, r) => s + r.sgstAmt, 0);
  const totalIgst = rows.reduce((s, r) => s + r.igstAmt, 0);
  const grandTotal = Math.round((totalTaxable + totalCgst + totalSgst + totalIgst) * 100) / 100;
  const hasIgst = totalIgst > 0;

  // representative rates (first item) for the summary — GST is usually
  // uniform per invoice
  const cgstRatePct = rows[0]?.cgstRate ?? 0;
  const sgstRatePct = rows[0]?.sgstRate ?? 0;
  const igstRatePct = rows[0]?.igstRate ?? 0;

  const consigneeName = data.sameAsReceiver ? data.customerName : data.consigneeName;
  const consigneeAddress = data.sameAsReceiver ? data.customerAddress : data.consigneeAddress;
  const consigneeGstin = data.sameAsReceiver ? data.customerGstin : data.consigneeGstin;
  const consigneeState = data.sameAsReceiver ? data.customerStateName : data.consigneeStateName;

  const upiId = data.bankDetails.upiId?.trim();
  const qrPayload = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(data.companyName || 'Merchant')}&am=${grandTotal.toFixed(2)}&cu=INR`
    : '';
  const qrImageUrl = qrPayload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=110x110&margin=0&data=${encodeURIComponent(qrPayload)}`
    : '';

  // Default logo served from /public/logo.png if none was set on the data object
  const logoSrc = data.logoUrl || '/logo.jpeg';

  return (
    <div
      ref={ref}
      id="invoice-preview"
      className="bg-white text-black flex flex-col"
      style={{
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        padding: '4mm',
        boxSizing: 'border-box',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '9.5px',
        lineHeight: 1.25,
      }}
    >
      <div
        className="text-center font-bold"
        style={{ fontSize: '13px', boxShadow: 'inset 0 0 0 1px #000', padding: '4px 0' }}
      >
        TAX INVOICE
      </div>

      {/* ── Company header + invoice meta ── */}
      <table className="w-full" style={TABLE_STYLE}>
        <tbody>
          <tr>
            <td style={{ ...CELL_STYLE, width: '58%' }} rowSpan={4}>
              <div className="flex items-start gap-2">
                {logoSrc && (
                  <img src={logoSrc} alt="logo" style={{ width: '34px', height: '34px' }} className="object-contain flex-shrink-0" />
                )}
                <div>
                  <div className="font-bold" style={{ fontSize: '13px' }}>
                    ENDLESS ELECTRICAL
                  </div>

                  <div className="mt-0.5">
                    G/F 0.7,K-10,ARCADE,100ft ROAD,OPP DIYA CINEMA ANAND
                  </div>

                  <div>
                    GUJARAT - 388001
                  </div>

                  <div>
                    GSTIN/UIN: 24AFQPV8836E1ZU
                  </div>

                  <div>
                    Contact: +91 9825338373
                  </div>

                  <div>
                    E-Mail: endless98253@gmail.com
                  </div>

                  <div className="mt-2">
                    <div className={LBL}>Consignee (Ship to)</div>
                    <div className="font-semibold">{consigneeName}</div>
                    <div>{consigneeAddress}</div>
                    <div>GSTIN/UIN: {consigneeGstin}</div>
                    <div>State Name: {consigneeState}</div>
                  </div>

                  <div className="mt-2">
                    <div className={LBL}>Buyer (Bill to)</div>
                    <div className="font-semibold">{data.customerName}</div>
                    <div>{data.customerAddress}</div>
                    <div>GSTIN/UIN: {data.customerGstin}</div>
                    <div>State Name: {data.customerStateName}</div>
                    <div>Place of Supply: {data.customerStateName}</div>
                  </div>
                </div>
              </div>
            </td>
            <td style={CELL_STYLE}><span className={LBL}>Invoice No.</span><br />{data.invoiceNumber}</td>
            <td style={CELL_STYLE}><span className={LBL}>Dated</span><br />{formatDate(data.invoiceDate)}</td>
          </tr>
          <tr>
            <td style={CELL_STYLE}><span className={LBL}>Delivery Note</span><br />&nbsp;</td>
            <td style={CELL_STYLE}><span className={LBL}>Mode/Terms of Payment</span><br />{data.paymentTerms}</td>
          </tr>
          <tr>
            <td style={CELL_STYLE}><span className={LBL}>Buyer's Order No.</span><br />{data.poNumber}</td>
            <td style={CELL_STYLE}><span className={LBL}>Dated</span><br />{formatDate(data.orderDate)}</td>
          </tr>
          <tr>
            <td style={CELL_STYLE}><span className={LBL}>Dispatched through</span><br />{data.transporterName}</td>
            <td style={CELL_STYLE}><span className={LBL}>Destination</span><br />{data.toLocation}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Items table ── */}
      <table className="w-full flex-1" style={{ ...TABLE_STYLE, tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th className="text-center font-bold" style={{ ...CELL_NT_STYLE, width: '26px' }}>Sl<br/>No</th>
            <th className="text-center font-bold" style={{ ...CELL_NT_STYLE, width: '58px' }}>Item Code</th>
            <th className="font-bold" style={CELL_NT_STYLE}>Description of Goods</th>
            <th className="text-center font-bold" style={{ ...CELL_NT_STYLE, width: '52px' }}>HSN/SAC</th>
            <th className="text-center font-bold" style={{ ...CELL_NT_STYLE, width: '52px' }}>Quantity</th>
            <th className="text-center font-bold" style={{ ...CELL_NT_STYLE, width: '56px' }}>Rate</th>
            <th className="text-center font-bold" style={{ ...CELL_NT_STYLE, width: '32px' }}>per</th>
            <th className="text-center font-bold" style={{ ...CELL_NT_STYLE, width: '40px' }}>Disc %</th>
            <th className="text-center font-bold" style={{ ...CELL_NT_STYLE, width: '72px' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.id}>
              <td className="text-center" style={CELL_STYLE}>{idx + 1}</td>
              <td className="text-center font-mono" style={{ ...CELL_STYLE, fontSize: '8.5px' }}>{r.itemCode || ''}</td>
              <td style={CELL_STYLE}>
                {r.name}
                {r.isNoReturn && (
                  <span
                    className="ml-0 mt-0.5 inline-block border border-red-600 text-red-600 font-bold px-1 align-middle"
                    style={{ fontSize: '7.5px', lineHeight: '1.4' }}
                  >
                    NO RETURN
                  </span>
                )}
              </td>
              <td className="text-center" style={CELL_STYLE}>{r.hsnSac}</td>
              <td className="text-center" style={CELL_STYLE}>{r.qty} {r.unit}</td>
              <td className="text-right" style={CELL_STYLE}>{fmt(Number(r.rate))}</td>
              <td className="text-center" style={CELL_STYLE}>{r.unit}</td>
              <td className="text-center" style={CELL_STYLE}>{r.discount ? `${r.discount}%` : ''}</td>
              <td className="text-right" style={CELL_STYLE}>{fmt(r.taxable)}</td>
            </tr>
          ))}

          <tr>
            <td colSpan={8} style={CELL_STYLE}>
              <div className="text-right italic">Output CGST @ {cgstRatePct}%</div>
            </td>
            <td className="text-right" style={CELL_STYLE}>{cgstRatePct ? fmt(totalCgst) : ''}</td>
          </tr>
          <tr>
            <td colSpan={8} style={CELL_STYLE}>
              <div className="text-right italic">Output SGST @ {sgstRatePct}%</div>
            </td>
            <td className="text-right" style={CELL_STYLE}>{sgstRatePct ? fmt(totalSgst) : ''}</td>
          </tr>
          {hasIgst && (
            <tr>
              <td colSpan={8} style={CELL_STYLE}>
                <div className="text-right italic">Output IGST @ {igstRatePct}%</div>
              </td>
              <td className="text-right" style={CELL_STYLE}>{fmt(totalIgst)}</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td style={CELL_STYLE}></td>
            <td style={CELL_STYLE}></td>
            <td style={CELL_STYLE}>Total</td>
            <td style={CELL_STYLE}></td>
            <td className="text-center" style={CELL_STYLE}>{totalQty}</td>
            <td colSpan={3} style={CELL_STYLE}></td>
            <td className="text-right" style={CELL_STYLE}>&#8377; {fmt(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>

      {/* ── Amount in words ── */}
      <table className="w-full" style={TABLE_STYLE}>
        <tbody>
          <tr>
            <td style={CELL_NT_STYLE}>
              <span className={LBL}>Amount Chargeable (in words)</span>
              <div className="font-semibold mt-0.5">INR {numberToWords(grandTotal)}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Tax summary table ── */}
      <table className="w-full" style={TABLE_STYLE}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ ...CELL_NT_STYLE, width: '20%' }}>Taxable Value</th>
            <th colSpan={2} style={CELL_NT_STYLE}>Central Tax</th>
            <th colSpan={2} style={CELL_NT_STYLE}>State Tax</th>
            <th rowSpan={2} style={{ ...CELL_NT_STYLE, width: '18%' }}>Total Tax Amount</th>
          </tr>
          <tr>
            <th style={{ ...CELL_STYLE, width: '10%' }}>Rate</th>
            <th style={{ ...CELL_STYLE, width: '16%' }}>Amount</th>
            <th style={{ ...CELL_STYLE, width: '10%' }}>Rate</th>
            <th style={{ ...CELL_STYLE, width: '16%' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="text-right" style={CELL_STYLE}>{fmt(totalTaxable)}</td>
            <td className="text-center" style={CELL_STYLE}>{cgstRatePct}%</td>
            <td className="text-right" style={CELL_STYLE}>{fmt(totalCgst)}</td>
            <td className="text-center" style={CELL_STYLE}>{sgstRatePct}%</td>
            <td className="text-right" style={CELL_STYLE}>{fmt(totalSgst)}</td>
            <td className="text-right" style={CELL_STYLE}>{fmt(totalCgst + totalSgst + totalIgst)}</td>
          </tr>
          <tr className="font-bold">
            <td className="text-right" style={CELL_STYLE}>{fmt(totalTaxable)}</td>
            <td colSpan={2} style={CELL_STYLE}></td>
            <td colSpan={2} style={CELL_STYLE}></td>
            <td className="text-right" style={CELL_STYLE}>{fmt(totalCgst + totalSgst + totalIgst)}</td>
          </tr>
        </tbody>
      </table>

      <table className="w-full" style={TABLE_STYLE}>
        <tbody>
          <tr>
            <td style={CELL_NT_STYLE}>
              <span className={LBL}>Tax Amount (in words)</span>{' '}
              <span className="font-semibold">INR {numberToWords(totalCgst + totalSgst + totalIgst)}</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── PAN / Declaration / Bank ── */}
      <table className="w-full" style={TABLE_STYLE}>
        <tbody>
          <tr>
            <td style={{ ...CELL_NT_STYLE, width: '55%' }}>
              <div><span className={LBL}>Company's PAN</span> &nbsp; {data.companyPan}</div>
              <div className="mt-1 font-semibold">Declaration</div>
              <div style={{ fontSize: '8px' }} className="leading-snug">
                "We conduct our business in accordance with the teachings of Islam,
                striving for honesty, fairness, and trust in every transaction."
                <br />
                "Give full measure and weight with justice."
                — Surah Hud (11:85)
                <br />
                "The truthful and trustworthy merchant will be with the Prophets,
                the truthful, and the martyrs."
                — Jami' at-Tirmidhi 1209
                {data.specialNotes && (<><br /><b>Note:</b> {data.specialNotes}</>)}
              </div>
            </td>
            <td style={CELL_NT_STYLE}>
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div>
                    <div className="font-semibold">Company's Bank Details</div>
                    <div>Bank Name:BANK OF BARODA</div>
                    <div>A/c No.: 40510200000210</div>
                    <div>IFSC Code: BARB0BAKROL</div>
                    <div>UPI ID: endlesselectrical@oksbi</div>
                  </div>
                </div>

                <div className="flex-shrink-0 text-center" style={{ fontSize: '7.5px' }}>
                  <div
                    className="flex items-center justify-center bg-white"
                    style={{ width: '65px', height: '65px', boxShadow: 'inset 0 0 0 1px #000' }}
                  >
                    {qrImageUrl ? (
                      <img src={qrImageUrl} alt="Scan to pay" style={{ width: '61px', height: '61px' }} />
                    ) : (
                      <span className="text-gray-400 px-1">Add UPI ID for QR</span>
                    )}
                  </div>
                  {qrImageUrl && <div className="mt-0.5">Scan to Pay</div>}
                </div>
              </div>

              <div className="flex justify-end mt-2">
                <div className="text-center" style={{ fontSize: '9px' }}>
                  <div>for {data.companyName}</div>
                  {data.signatureUrl && (
                    <img src={data.signatureUrl} alt="signature" className="object-contain mx-auto my-1" style={{ width: '80px', height: '40px' }} />
                  )}
                  <div className="mt-3">Authorised Signatory</div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div
        className="text-center"
        style={{ fontSize: '9px', boxShadow: 'inset 0 0 0 1px #000', padding: '4px 0' }}
      >
        <strong>SUBJECT TO ANAND JURISDICTION</strong>
        <br />
        This is a Computer Generated Invoice
      </div>
    </div>
  );
});

InvoicePreview.displayName = 'InvoicePreview';
export default InvoicePreview;

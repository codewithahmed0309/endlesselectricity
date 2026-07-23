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

// Thin single-rule borders, small type — matches the classic tally-style
// "Tax Invoice" format rather than a modern boxed/colored layout.
//
// IMPORTANT (export-safety note):
// Every section that used to be its own separate <table> stacked on top of
// the next one has been merged into ONE continuous <table> with multiple
// <tbody> groups below. That's the actual fix for the doubled/overlapping
// borders and the "Amount Chargeable" text colliding with the tax summary
// table in exported PDFs/images.
//
// Why: two adjacent SEPARATE tables each draw their own border-collapse
// independently. The browser happens to subpixel-snap them onto the same
// line, so it looks fine on screen. html2canvas / dom-to-image compute
// row heights and font metrics slightly differently than the live DOM
// layout engine, so that "coincidental" alignment breaks — borders drift
// apart or overlap, and box heights (esp. text-wrapping cells) come out a
// fraction of a pixel taller/shorter, which cascades into visible overlap
// on the next section. A single continuous table has ONE border-collapse
// context, so every seam is drawn exactly once by construction — nothing
// to misalign, in the browser OR any rasterizer.
const CELL = 'border border-black px-1.5 py-1 align-top';
const CELL_HEAD = 'border border-black px-1.5 py-1 align-top font-bold text-center';
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

  return (
    <div
      ref={ref}
      id="invoice-preview"
      className="bg-white text-black flex flex-col"
      style={{
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        padding: '6mm',
        boxSizing: 'border-box',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '10px',
        lineHeight: 1.3,
        // NOTE: `transform: translateZ(0)` was removed. It forces a new
        // compositing layer, which html2canvas/dom-to-image handle
        // inconsistently and was contributing to the layout drift seen
        // only in exports. Do not re-add it.
      }}
    >
      <div className="text-center font-bold border border-black border-b-0 py-1" style={{ fontSize: '13px' }}>
        TAX INVOICE
      </div>

      {/*
        ── SINGLE continuous table for the whole invoice body ──
        Multiple <tbody> groups below replace what used to be separate
        <table> elements. border-collapse now applies across the entire
        document, so every horizontal seam is drawn exactly once.
      */}
      <table className="w-full flex-1" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>

        {/* ── Company header + invoice meta ── */}
        <tbody>
          <tr>
            <td className={CELL} style={{ width: '58%' }} rowSpan={5}>
              <div className="flex items-start gap-2">
                {data.logoUrl && (
                  <img src={data.logoUrl} alt="logo" style={{ width: '34px', height: '34px' }} className="object-contain flex-shrink-0" />
                )}
                <div>
                  <div className="font-bold" style={{ fontSize: '13px' }}>
                    ENDLESS ELECTRICAL
                  </div>

                  <div className="mt-0.5" style={{ lineHeight: '1.4' }}>
                    G/F 0.7,K-10,ARCADE,100ft ROAD,OPP DIYA CINEMA ANAND
                  </div>

                  <div style={{ lineHeight: '1.4' }}>
                    GUJARAT - 388001
                  </div>

                  <div style={{ lineHeight: '1.4' }}>
                    GSTIN/UIN: 24AFQPV8836E1ZU
                  </div>

                  <div style={{ lineHeight: '1.4' }}>
                    Contact: +91 9825338373
                  </div>

                  <div style={{ lineHeight: '1.4' }}>
                    E-Mail: endless98253@gmail.com
                  </div>

                  <div className="mt-2">
                    <div className={LBL}>Consignee (Ship to)</div>
                    <div className="font-semibold">{consigneeName}</div>
                    <div style={{ lineHeight: '1.4' }}>{consigneeAddress}</div>
                    <div style={{ lineHeight: '1.4' }}>GSTIN/UIN: {consigneeGstin}</div>
                    <div style={{ lineHeight: '1.4' }}>State Name: {consigneeState}</div>
                  </div>

                  <div className="mt-2">
                    <div className={LBL}>Buyer (Bill to)</div>
                    <div className="font-semibold">{data.customerName}</div>
                    <div style={{ lineHeight: '1.4' }}>{data.customerAddress}</div>
                    <div style={{ lineHeight: '1.4' }}>GSTIN/UIN: {data.customerGstin}</div>
                    <div style={{ lineHeight: '1.4' }}>State Name: {data.customerStateName}</div>
                    <div style={{ lineHeight: '1.4' }}>Place of Supply: {data.customerStateName}</div>
                  </div>
                </div>
              </div>
            </td>
            <td className={CELL} colSpan={4}><span className={LBL}>Invoice No.</span><br />{data.invoiceNumber}</td>
            <td className={CELL} colSpan={4}><span className={LBL}>Dated</span><br />{formatDate(data.invoiceDate)}</td>
          </tr>
          <tr>
            <td className={CELL} colSpan={4}><span className={LBL}>Delivery Note</span><br />&nbsp;</td>
            <td className={CELL} colSpan={4}><span className={LBL}>Mode/Terms of Payment</span><br />{data.paymentTerms}</td>
          </tr>
          <tr>
            <td className={CELL} colSpan={4}><span className={LBL}>Buyer's Order No.</span><br />{data.poNumber}</td>
            <td className={CELL} colSpan={4}><span className={LBL}>Dated</span><br />{formatDate(data.orderDate)}</td>
          </tr>
          <tr>
            <td className={CELL} colSpan={4}><span className={LBL}>Dispatched through</span><br />{data.transporterName}</td>
            <td className={CELL} colSpan={4}><span className={LBL}>Destination</span><br />{data.toLocation}</td>
          </tr>
          <tr>
            <td className={CELL} colSpan={8}>
              <span className={LBL}>Terms of Delivery</span><br />
              {[data.fromLocation && `From: ${data.fromLocation}`, data.vehicleNumber && `Vehicle: ${data.vehicleNumber}`].filter(Boolean).join('  |  ')}
            </td>
          </tr>
        </tbody>

        {/* ── Items table ── */}
        <tbody>
          <tr>
            <td className={CELL_HEAD} style={{ width: '26px' }}>Sl<br/>No</td>
            <td className={CELL_HEAD} style={{ width: '58px' }}>Item Code</td>
            <td className={CELL + ' font-bold'} style={{ width: '32%' }}>Description of Goods</td>
            <td className={CELL_HEAD} style={{ width: '52px' }}>HSN/SAC</td>
            <td className={CELL_HEAD} style={{ width: '52px' }}>Quantity</td>
            <td className={CELL_HEAD} style={{ width: '56px' }}>Rate</td>
            <td className={CELL_HEAD} style={{ width: '32px' }}>per</td>
            <td className={CELL_HEAD} style={{ width: '40px' }}>Disc %</td>
            <td className={CELL_HEAD} style={{ width: '72px' }}>Amount</td>
          </tr>

          {rows.map((r, idx) => (
            <tr key={r.id}>
              <td className={CELL + ' text-center'}>{idx + 1}</td>
              <td className={CELL + ' text-center font-mono'} style={{ fontSize: '8.5px' }}>{r.itemCode || ''}</td>
              <td className={CELL}>
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
              <td className={CELL + ' text-center'}>{r.hsnSac}</td>
              <td className={CELL + ' text-center'}>{r.qty} {r.unit}</td>
              <td className={CELL + ' text-right'}>{fmt(Number(r.rate))}</td>
              <td className={CELL + ' text-center'}>{r.unit}</td>
              <td className={CELL + ' text-center'}>{r.discount ? `${r.discount}%` : ''}</td>
              <td className={CELL + ' text-right'}>{fmt(r.taxable)}</td>
            </tr>
          ))}

          <tr>
            <td className={CELL} colSpan={8}>
              <div className="text-right italic">Output CGST @ {cgstRatePct}%</div>
            </td>
            <td className={CELL + ' text-right'}>{cgstRatePct ? fmt(totalCgst) : ''}</td>
          </tr>
          <tr>
            <td className={CELL} colSpan={8}>
              <div className="text-right italic">Output SGST @ {sgstRatePct}%</div>
            </td>
            <td className={CELL + ' text-right'}>{sgstRatePct ? fmt(totalSgst) : ''}</td>
          </tr>
          {hasIgst && (
            <tr>
              <td className={CELL} colSpan={8}>
                <div className="text-right italic">Output IGST @ {igstRatePct}%</div>
              </td>
              <td className={CELL + ' text-right'}>{fmt(totalIgst)}</td>
            </tr>
          )}

          <tr className="font-bold">
            <td className={CELL}></td>
            <td className={CELL}></td>
            <td className={CELL}>Total</td>
            <td className={CELL}></td>
            <td className={CELL + ' text-center'}>{totalQty}</td>
            <td className={CELL} colSpan={3}></td>
            <td className={CELL + ' text-right'}>&#8377; {fmt(grandTotal)}</td>
          </tr>
        </tbody>

        {/* ── Amount in words ── */}
        <tbody>
          <tr>
            <td className={CELL} colSpan={9}>
              <span className={LBL}>Amount Chargeable (in words)</span>
              <div className="font-semibold mt-0.5">INR {numberToWords(grandTotal)}</div>
            </td>
          </tr>
        </tbody>

        {/* ── Tax summary table ── */}
        <tbody>
          <tr>
            <td className={CELL_HEAD} rowSpan={2} colSpan={2}>Taxable Value</td>
            <td className={CELL_HEAD} colSpan={2}>Central Tax</td>
            <td className={CELL_HEAD} colSpan={2}>State Tax</td>
            <td className={CELL_HEAD} rowSpan={2} colSpan={3}>Total Tax Amount</td>
          </tr>
          <tr>
            <td className={CELL_HEAD}>Rate</td>
            <td className={CELL_HEAD}>Amount</td>
            <td className={CELL_HEAD}>Rate</td>
            <td className={CELL_HEAD}>Amount</td>
          </tr>
          <tr>
            <td className={CELL + ' text-right'} colSpan={2}>{fmt(totalTaxable)}</td>
            <td className={CELL + ' text-center'}>{cgstRatePct}%</td>
            <td className={CELL + ' text-right'}>{fmt(totalCgst)}</td>
            <td className={CELL + ' text-center'}>{sgstRatePct}%</td>
            <td className={CELL + ' text-right'}>{fmt(totalSgst)}</td>
            <td className={CELL + ' text-right'} colSpan={3}>{fmt(totalCgst + totalSgst + totalIgst)}</td>
          </tr>
          <tr className="font-bold">
            <td className={CELL + ' text-right'} colSpan={2}>{fmt(totalTaxable)}</td>
            <td className={CELL} colSpan={2}></td>
            <td className={CELL} colSpan={2}></td>
            <td className={CELL + ' text-right'} colSpan={3}>{fmt(totalCgst + totalSgst + totalIgst)}</td>
          </tr>
        </tbody>

        {/* ── Tax amount in words ── */}
        <tbody>
          <tr>
            <td className={CELL} colSpan={9}>
              <span className={LBL}>Tax Amount (in words)</span>{' '}
              <span className="font-semibold">INR {numberToWords(totalCgst + totalSgst + totalIgst)}</span>
            </td>
          </tr>
        </tbody>

        {/* ── PAN / Declaration / Bank ── */}
        <tbody>
          <tr>
            <td className={CELL} style={{ width: '55%' }} colSpan={5}>
              <div><span className={LBL}>Company's PAN</span> &nbsp; {data.companyPan}</div>
              <div className="mt-1 font-semibold">Declaration</div>
              <div style={{ fontSize: '8.5px', lineHeight: '1.4' }}>
                "We conduct our business in accordance with the teachings of Islam,
                striving for honesty, fairness, and trust in every transaction."
                <br /><br />
                "Give full measure and weight with justice."
                — Surah Hud (11:85)
                <br /><br />
                "The truthful and trustworthy merchant will be with the Prophets,
                the truthful, and the martyrs."
                — Jami' at-Tirmidhi 1209
                {data.specialNotes && (<><br /><b>Note:</b> {data.specialNotes}</>)}
              </div>
            </td>
            <td className={CELL} colSpan={4}>
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="font-semibold">Company's Bank Details</div>
                  <div style={{ lineHeight: '1.4' }}>Bank Name: BANK OF BARODA</div>
                  <div style={{ lineHeight: '1.4' }}>A/c No.: 40510200000210</div>
                  <div style={{ lineHeight: '1.4' }}>IFSC Code: BARB0BAKROL</div>
                  <div style={{ lineHeight: '1.4' }}>UPI ID: endlesselectrical@oksbi</div>
                </div>

                <div className="flex-shrink-0 text-center" style={{ fontSize: '7.5px' }}>
                  <div
                    className="border border-black flex items-center justify-center bg-white"
                    style={{ width: '72px', height: '72px' }}
                  >
                    {qrImageUrl ? (
                      <img src={qrImageUrl} alt="Scan to pay" style={{ width: '68px', height: '68px' }} />
                    ) : (
                      <span className="text-gray-400 px-1">Add UPI ID for QR</span>
                    )}
                  </div>
                  {qrImageUrl && <div className="mt-0.5">Scan to Pay</div>}
                </div>
              </div>

              <div className="flex justify-end mt-3">
                <div className="text-center" style={{ fontSize: '9px' }}>
                  <div>for {data.companyName}</div>
                  {data.signatureUrl && (
                    <img src={data.signatureUrl} alt="signature" className="object-contain mx-auto my-1" style={{ width: '90px', height: '45px' }} />
                  )}
                  <div className="mt-4">Authorised Signatory</div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div
        className="text-center border border-black border-t-0 py-1"
        style={{ fontSize: '9px' }}
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

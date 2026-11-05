"use client";

import React, { useState } from "react";

export interface SalarySlipData {
  id?: number;
  code: string;
  name: string;
  fatherName: string;
  designation?: string;
  department?: string;
  location?: string;
  employeeType?: string;
  doj: string | number;
  esicNo: string;
  pfNo?: string;
  uan?: string;
  panNo?: string;
  bankName?: string;
  accountNo?: string;
  presentDays: number;
  otDays: number;
  rate: number;
  basicAmount: number;
  daysAmount?: number;
  otAmount: number;
  hrAllowance?: number;
  specialAllowance?: number;
  personalAllowance?: number;
  convAllowance?: number;
  otherEarning?: number;
  accomodnAllowance?: number;
  arrear?: number;
  totalEarnings: number;
  totalGross?: number;
  salaryAdvance?: number;
  providentFund: number;
  pf?: number;
  voluntaryProvidentFund?: number;
  esi: number;
  professionalTax: number;
  ptax?: number;
  alcoholDeduction?: number;
  advanceRepayment?: number;
  totalDeductions: number;
  netPayable: number;
  amountInWords?: string;
}

interface Props {
  slip: SalarySlipData;
  companyName: string;
  companyLocation?: string;
  monthName: string;
  year: number;
  defaultView?: "formXix" | "corporate";
}

// Convert number to Indian Currency Words
export function numberToIndianWords(num: number): string {
  const rounded = Math.round(Number(num) || 0);
  if (rounded === 0) return "Rupees Zero Only";

  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const inWords = (n: number): string => {
    let str = "";
    if (n > 99) {
      str += a[Math.floor(n / 100)] + "Hundred ";
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + " " + a[n % 10];
    } else {
      str += a[n];
    }
    return str.trim();
  };

  let n = rounded;
  let words = "";

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;

  if (crore > 0) words += inWords(crore) + " Crore ";
  if (lakh > 0) words += inWords(lakh) + " Lakh ";
  if (thousand > 0) words += inWords(thousand) + " Thousand ";
  if (hundred > 0) words += inWords(hundred);

  return `Rupees ${words.trim()} Only`;
}

export const LabourSalarySlip: React.FC<Props> = ({
  slip,
  companyName,
  companyLocation,
  monthName,
  year,
  defaultView = "formXix",
}) => {
  const [viewType, setViewType] = useState<"formXix" | "corporate">(defaultView);

  const fmt = (val?: number) =>
    (Number(val) || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const locationText = slip.location || companyLocation || "Factory / Brewery Industrial Area, West Bengal";
  const fatherNameDisplay = slip.fatherName ? slip.fatherName.replace(/^C\/O\s+/i, "") : "â€”";

  // Daily rate calculation: if rate > 1000, it's monthly wage rate, daily rate = rate / 26
  const rateVal = Number(slip.rate) || 0;
  const dailyRate = rateVal > 1000 ? Math.round((rateVal / 26) * 100) / 100 : rateVal;

  const basicWage = Number(slip.basicAmount ?? slip.daysAmount ?? 0);
  const otWage = Number(slip.otAmount ?? 0);
  const grossWage = Number(slip.totalEarnings ?? slip.totalGross ?? basicWage + otWage);
  const pfWage = Number(slip.providentFund ?? slip.pf ?? 0);
  const esiWage = Number(slip.esi ?? 0);
  const ptaxWage = Number(slip.professionalTax ?? slip.ptax ?? 0);
  const totalDeductions = Number(slip.totalDeductions ?? pfWage + esiWage + ptaxWage);
  const netWage = Number(slip.netPayable ?? grossWage - totalDeductions);
  const amountWords = slip.amountInWords || numberToIndianWords(netWage);

  // Period ending string
  const isCelebrity = companyName.toLowerCase().includes("celebrity");
  const periodEndingStr = isCelebrity
    ? `15/${String(monthName.toLowerCase().includes("oct") ? 10 : 9).padStart(2, "0")}/${year}`
    : `${new Date(year, 10, 0).getDate()}/${monthName}/${year}`;

  return (
    <div className="salary-slip-root">
      {/* View Switcher Controls */}
      <div className="slip-view-switch-bar no-print">
        <div className="view-switch-label">Select Slip Layout:</div>
        <div className="view-switch-btns">
          <button
            type="button"
            className={`switch-btn ${viewType === "formXix" ? "active" : ""}`}
            onClick={() => setViewType("formXix")}
          >
            📜 Statutory Form XIX [See Rule 78(1)(b)]
          </button>
          <button
            type="button"
            className={`switch-btn ${viewType === "corporate" ? "active" : ""}`}
            onClick={() => setViewType("corporate")}
          >
            🏢 Itemized Corporate Payslip
          </button>
        </div>
      </div>

      {/* VIEW 1: STATUTORY FORM XIX WAGE SLIP */}
      {viewType === "formXix" ? (
        <div className="form-xix-card" id="form-xix-printable">
          {/* Statutory Title */}
          <div className="form-xix-header">
            <h1 className="xix-title">FORM “XIX”</h1>
            <div className="xix-rule">[See Rule 78(1)(b)]</div>
            <h2 className="xix-subtitle">Wage Slip</h2>
          </div>

          {/* Employer & Workman Particulars with Statutory Dotted Underlines */}
          <div className="xix-particulars">
            <div className="xix-row">
              <span className="xix-label">Name and address of Contractor</span>
              <span className="xix-dots">:</span>
              <span className="xix-val">
                <strong>{companyName.toUpperCase()}</strong> &mdash; {locationText}
              </span>
            </div>

            <div className="xix-row">
              <span className="xix-label">Name and father’s / husband’s name of the workman</span>
              <span className="xix-dots">:</span>
              <span className="xix-val">
                <strong>{slip.name}</strong> ({fatherNameDisplay ? `C/O ${fatherNameDisplay}` : "N/A"})
                <span className="xix-sub-code"> [Emp Code: <strong>{slip.code}</strong>]</span>
              </span>
            </div>

            <div className="xix-row">
              <span className="xix-label">Nature and location of work</span>
              <span className="xix-dots">:</span>
              <span className="xix-val">
                {slip.designation || "Workman"} &mdash; {slip.department || "Factory / Brewery Plant"}, {locationText}
              </span>
            </div>

            <div className="xix-row">
              <span className="xix-label">For the week / fortnight / month ending</span>
              <span className="xix-dots">:</span>
              <span className="xix-val">
                <strong>{periodEndingStr}</strong> ({isCelebrity ? "Wage Cycle: 16th to 15th" : `Month of ${monthName} ${year}`})
              </span>
            </div>
          </div>

          {/* The 7 Statutory Points */}
          <div className="xix-numbered-items">
            <div className="xix-item-row">
              <div className="xix-item-left">
                <span className="item-num">1.</span>
                <span className="item-title">Number of days worked</span>
              </div>
              <div className="xix-item-dots">....................................................................................</div>
              <div className="xix-item-right">
                <span className="xix-stat-val bold">{slip.presentDays} Days</span>
              </div>
            </div>

            <div className="xix-item-row">
              <div className="xix-item-left">
                <span className="item-num">2.</span>
                <span className="item-title">Number of units worked in case of piece rate workers</span>
              </div>
              <div className="xix-item-dots">....................................................................................</div>
              <div className="xix-item-right">
                <span className="xix-stat-val">N/A (Time Rated)</span>
              </div>
            </div>

            <div className="xix-item-row">
              <div className="xix-item-left">
                <span className="item-num">3.</span>
                <span className="item-title">Rate of daily wages / piece rate</span>
              </div>
              <div className="xix-item-dots">....................................................................................</div>
              <div className="xix-item-right">
                <span className="xix-stat-val">
                  ₹ {fmt(dailyRate)} / Day <span className="rate-sub">(Rate: ₹ {fmt(rateVal)}/mo)</span>
                </span>
              </div>
            </div>

            <div className="xix-item-row">
              <div className="xix-item-left">
                <span className="item-num">4.</span>
                <span className="item-title">Amount of overtime wages</span>
              </div>
              <div className="xix-item-dots">....................................................................................</div>
              <div className="xix-item-right">
                <span className="xix-stat-val">₹ {fmt(otWage)}</span>
                {slip.otDays > 0 && <span className="ot-sub"> ({slip.otDays} OT Days)</span>}
              </div>
            </div>

            <div className="xix-item-row">
              <div className="xix-item-left">
                <span className="item-num">5.</span>
                <span className="item-title">Gross wages payable</span>
              </div>
              <div className="xix-item-dots">....................................................................................</div>
              <div className="xix-item-right">
                <span className="xix-stat-val bold gross">₹ {fmt(grossWage)}</span>
              </div>
            </div>

            <div className="xix-item-row deductions-breakup-row">
              <div className="xix-item-left">
                <span className="item-num">6.</span>
                <span className="item-title">Deductions, if any</span>
              </div>
              <div className="xix-item-dots">....................................................................................</div>
              <div className="xix-item-right">
                <div className="deductions-pill-box">
                  <span className="ded-item">PF (12%): <strong>₹ {fmt(pfWage)}</strong></span>
                  <span className="ded-sep">|</span>
                  <span className="ded-item">ESI (0.75%): <strong>₹ {fmt(esiWage)}</strong></span>
                  <span className="ded-sep">|</span>
                  <span className="ded-item">P-Tax: <strong>₹ {fmt(ptaxWage)}</strong></span>
                  <span className="ded-sep">➔</span>
                  <span className="ded-total">Total: <strong>₹ {fmt(totalDeductions)}</strong></span>
                </div>
              </div>
            </div>

            <div className="xix-item-row net-row">
              <div className="xix-item-left">
                <span className="item-num">7.</span>
                <span className="item-title">Net amount of wages paid</span>
              </div>
              <div className="xix-item-dots">....................................................................................</div>
              <div className="xix-item-right">
                <div className="net-paid-display">
                  <span className="net-badge">₹ {fmt(netWage)}</span>
                </div>
              </div>
            </div>

            <div className="xix-words-row">
              <span className="words-lbl">Amount in Words:</span>
              <span className="words-val"><strong>{amountWords}</strong></span>
            </div>
          </div>

          {/* Statutory Signatures Footer */}
          <div className="xix-signatures">
            <div className="sig-block left">
              <div className="sig-line"></div>
              <div className="sig-title">Initials of the Contractor or his representative</div>
            </div>

            <div className="sig-block right">
              <div className="sig-line"></div>
              <div className="sig-title">Signature / Thumb impression of the Workman</div>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 2: ITEMIZED CORPORATE PAYSLIP */
        <div className="slip-card corporate-card">
          <div className="slip-header">
            <h2 className="company-title">{companyName.toUpperCase()}</h2>
            <div className="month-subtitle">
              Salary Slip for the month of {monthName} {year}
            </div>
          </div>

          <table className="slip-table info-table">
            <tbody>
              <tr>
                <td className="info-lbl">Employee Code</td>
                <td className="info-val">: {slip.code}</td>
                <td className="info-lbl">Employee Type</td>
                <td className="info-val">: {slip.employeeType || "Labour"}</td>
              </tr>
              <tr>
                <td className="info-lbl">Employee Name</td>
                <td className="info-val">: {slip.name}</td>
                <td className="info-lbl">DOJ</td>
                <td className="info-val">: {slip.doj || "â€”"}</td>
              </tr>
              <tr>
                <td className="info-lbl">Father / Husband Name</td>
                <td className="info-val">: {fatherNameDisplay}</td>
                <td className="info-lbl">PF NO.</td>
                <td className="info-val">: {slip.pfNo || ""}</td>
              </tr>
              <tr>
                <td className="info-lbl">Designation</td>
                <td className="info-val">: {slip.designation || "Workman"}</td>
                <td className="info-lbl">ESIC / IP NO.</td>
                <td className="info-val">: {slip.esicNo || ""}</td>
              </tr>
              <tr>
                <td className="info-lbl">Department</td>
                <td className="info-val">: {slip.department || "Factory"}</td>
                <td className="info-lbl">UAN</td>
                <td className="info-val">: {slip.uan || ""}</td>
              </tr>
              <tr>
                <td className="info-lbl">Location</td>
                <td className="info-val">: {locationText}</td>
                <td className="info-lbl">PAN NO.</td>
                <td className="info-val">: {slip.panNo || ""}</td>
              </tr>
            </tbody>
          </table>

          <table className="slip-table breakdown-table">
            <thead>
              <tr>
                <th colSpan={2} className="col-group-hdr">Days</th>
                <th colSpan={3} className="col-group-hdr">Earnings</th>
                <th colSpan={2} className="col-group-hdr">Deductions</th>
                <th className="col-group-hdr net-hdr">Net Payable (Rs.)</th>
              </tr>
              <tr className="sub-hdr-row">
                <th className="sub-hdr">Particulars</th>
                <th className="sub-hdr text-center">Days</th>
                <th className="sub-hdr">Particulars</th>
                <th className="sub-hdr text-end">Rate</th>
                <th className="sub-hdr text-end">Amount (Rs.)</th>
                <th className="sub-hdr">Particulars</th>
                <th className="sub-hdr text-end">Amount (Rs.)</th>
                <th className="sub-hdr empty-hdr"></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Present</td>
                <td className="text-center">{slip.presentDays || 0}</td>
                <td>Basic Wages</td>
                <td className="text-end">{fmt(dailyRate)}</td>
                <td className="text-end">{fmt(basicWage)}</td>
                <td>Provident Fund</td>
                <td className="text-end">{fmt(pfWage)}</td>
                <td rowSpan={10} className="net-payable-box">
                  <div className="net-amount-display">{fmt(netWage)}</div>
                </td>
              </tr>
              <tr>
                <td>W/O</td>
                <td></td>
                <td>OT / OD Wages</td>
                <td className="text-end">{fmt(dailyRate)}</td>
                <td className="text-end">{fmt(otWage)}</td>
                <td>Voluntary PF</td>
                <td className="text-end">0.00</td>
              </tr>
              <tr>
                <td>Holidays</td>
                <td></td>
                <td>H R Allowance</td>
                <td className="text-end">0.00</td>
                <td className="text-end">0.00</td>
                <td>ESI</td>
                <td className="text-end">{fmt(esiWage)}</td>
              </tr>
              <tr>
                <td>OT/OD</td>
                <td className="text-center">{slip.otDays || 0}</td>
                <td>Special Allowance</td>
                <td className="text-end">0.00</td>
                <td className="text-end">0.00</td>
                <td>Professional Tax</td>
                <td className="text-end">{fmt(ptaxWage)}</td>
              </tr>
              <tr>
                <td>CL</td>
                <td></td>
                <td>Personal Allowance</td>
                <td className="text-end">0.00</td>
                <td className="text-end">0.00</td>
                <td>Advance Repayment</td>
                <td className="text-end">0.00</td>
              </tr>
              <tr>
                <td>SL</td>
                <td></td>
                <td>Conv. Allowance</td>
                <td className="text-end">0.00</td>
                <td className="text-end">0.00</td>
                <td>Other Deductions</td>
                <td className="text-end">0.00</td>
              </tr>
              <tr>
                <td>PL_CO</td>
                <td></td>
                <td>Other Earning</td>
                <td className="text-end">0.00</td>
                <td className="text-end">0.00</td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td className="fw-bold">Total Days</td>
                <td className="text-center fw-bold">{slip.presentDays || 0}</td>
                <td className="fw-bold">Total Earnings</td>
                <td></td>
                <td className="text-end fw-bold">{fmt(grossWage)}</td>
                <td className="fw-bold">Total Deductions</td>
                <td className="text-end fw-bold">{fmt(totalDeductions)}</td>
              </tr>
            </tbody>
          </table>

          <table className="slip-table footer-table">
            <tbody>
              <tr>
                <td colSpan={10} className="words-box">
                  <strong>Rs. (In Words):</strong> {amountWords}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="disclaimer">
            This is a system generated Salary Slip &amp; does not require any Signature &amp; Seal.
          </div>
        </div>
      )}

      {/* STYLES */}
      <style jsx>{`
        .salary-slip-root {
          width: 100%;
          font-family: Arial, Helvetica, sans-serif;
          color: #0f172a;
        }

        .slip-view-switch-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-bottom: 14px;
        }
        .view-switch-label {
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .view-switch-btns {
          display: flex;
          gap: 8px;
        }
        .switch-btn {
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          transition: all 0.15s ease;
        }
        .switch-btn.active {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
        }

        /* FORM XIX STATUTORY STYLES */
        .form-xix-card {
          border: 2px solid #000000;
          padding: 20px 24px;
          background: #ffffff;
          box-sizing: border-box;
          line-height: 1.5;
        }

        .form-xix-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
          margin-bottom: 16px;
        }
        .xix-title {
          font-size: 20px;
          font-weight: 900;
          margin: 0;
          letter-spacing: 1px;
          color: #000;
        }
        .xix-rule {
          font-size: 13px;
          font-weight: 700;
          margin: 2px 0;
          color: #111;
        }
        .xix-subtitle {
          font-size: 16px;
          font-weight: 800;
          margin: 4px 0 0 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #000;
        }

        .xix-particulars {
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .xix-row {
          display: flex;
          align-items: baseline;
          font-size: 12.5px;
        }
        .xix-label {
          font-weight: 700;
          width: 320px;
          flex-shrink: 0;
          color: #111;
        }
        .xix-dots {
          margin: 0 8px;
          color: #555;
        }
        .xix-val {
          flex: 1;
          border-bottom: 1px dotted #444;
          padding-bottom: 1px;
          color: #000;
        }
        .xix-sub-code {
          font-size: 11.5px;
          color: #444;
          margin-left: 6px;
        }

        .xix-numbered-items {
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
          padding: 12px 0;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }
        .xix-item-row {
          display: flex;
          align-items: center;
          font-size: 12.5px;
        }
        .xix-item-left {
          display: flex;
          gap: 6px;
          width: 340px;
          flex-shrink: 0;
          font-weight: 700;
          color: #111;
        }
        .item-num {
          font-weight: 800;
        }
        .xix-item-dots {
          flex: 1;
          color: #999;
          font-size: 11px;
          overflow: hidden;
          white-space: nowrap;
          padding: 0 8px;
          letter-spacing: 2px;
        }
        .xix-item-right {
          flex-shrink: 0;
          text-align: right;
          min-width: 140px;
        }
        .xix-stat-val {
          font-size: 13px;
          color: #000;
        }
        .xix-stat-val.bold {
          font-weight: 800;
        }
        .xix-stat-val.gross {
          font-size: 14px;
          color: #000;
        }
        .rate-sub, .ot-sub {
          font-size: 11px;
          color: #555;
          font-weight: normal;
        }

        .deductions-pill-box {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .ded-sep {
          color: #94a3b8;
        }
        .ded-total {
          color: #b91c1c;
        }

        .net-row {
          background: #f1f5f9;
          padding: 4px 8px;
          border-radius: 6px;
        }
        .net-badge {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
          background: #dcfce7;
          border: 1px solid #86efac;
          padding: 2px 10px;
          border-radius: 4px;
        }

        .xix-words-row {
          display: flex;
          gap: 8px;
          font-size: 12px;
          padding: 6px 8px 0 8px;
        }
        .words-lbl {
          font-weight: 700;
          color: #334155;
        }
        .words-val {
          color: #0f172a;
          text-transform: capitalize;
        }

        .xix-signatures {
          margin-top: 36px;
          display: flex;
          justify-content: space-between;
          padding: 0 10px;
        }
        .sig-block {
          width: 44%;
          text-align: center;
        }
        .sig-line {
          border-bottom: 1.5px solid #000;
          margin-bottom: 6px;
          height: 35px;
        }
        .sig-title {
          font-size: 11.5px;
          font-weight: 700;
          color: #111;
        }

        /* CORPORATE PAYSLIP STYLES */
        .corporate-card {
          border: 1.5px solid #000;
          padding: 10px;
          background: #fff;
        }
        .slip-header {
          text-align: center;
          padding-bottom: 4px;
          border-bottom: 1.5px solid #000;
          margin-bottom: 6px;
        }
        .company-title {
          font-size: 16px;
          font-weight: 800;
          margin: 0;
          color: #000;
        }
        .month-subtitle {
          font-size: 11px;
          font-weight: 600;
          margin-top: 2px;
          color: #333;
        }
        .slip-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10.5px;
          margin-bottom: 6px;
        }
        .slip-table td, .slip-table th {
          border: 1px solid #444;
          padding: 3px 6px;
          line-height: 1.25;
        }
        .info-lbl {
          font-weight: 700;
          background: #f8fafc;
          width: 18%;
        }
        .info-val {
          width: 32%;
        }
        .col-group-hdr {
          background: #e2e8f0;
          text-align: center;
          font-weight: 700;
        }
        .sub-hdr {
          background: #f1f5f9;
          font-weight: 600;
        }
        .net-hdr {
          background: #e2e8f0;
        }
        .net-payable-box {
          text-align: center;
          vertical-align: middle;
          background: #f8fafc;
        }
        .net-amount-display {
          font-size: 20px;
          font-weight: 900;
          color: #000;
        }
        .words-box {
          background: #f8fafc;
          padding: 6px 10px;
          font-size: 11px;
        }
        .disclaimer {
          font-size: 9.5px;
          text-align: center;
          color: #64748b;
          margin-top: 6px;
        }

        @media print {
          .no-print {
            display: none !important;
          }
          .form-xix-card {
            border: 2px solid #000 !important;
            padding: 14px 18px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LabourSalarySlip;

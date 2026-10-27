"use client";

import React from "react";

export interface SalarySlipData {
  id?: number;
  code: string;
  name: string;
  fatherName: string;
  designation?: string;
  department?: string;
  location?: string;
  employeeType?: string;
  doj: string;
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
  otAmount: number;
  hrAllowance?: number;
  specialAllowance?: number;
  personalAllowance?: number;
  convAllowance?: number;
  otherEarning?: number;
  accomodnAllowance?: number;
  arrear?: number;
  totalEarnings: number;
  salaryAdvance?: number;
  providentFund: number;
  voluntaryProvidentFund?: number;
  esi: number;
  professionalTax: number;
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
}

export const LabourSalarySlip: React.FC<Props> = ({
  slip,
  companyName,
  companyLocation,
  monthName,
  year,
}) => {
  const fmt = (val?: number) =>
    (Number(val) || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const locationText = slip.location || companyLocation || "";

  return (
    <div className="salary-slip-container">
      {/* Outer Border Box */}
      <div className="slip-card">
        {/* Company Header */}
        <div className="slip-header">
          <h2 className="company-title">{companyName.toUpperCase()}</h2>
          <div className="month-subtitle">
            Salary Slip for the month of {monthName} {year}
          </div>
        </div>

        {/* Employee Particulars Grid */}
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
              <td className="info-val">: {slip.doj || "—"}</td>
            </tr>
            <tr>
              <td className="info-lbl">Father / Husband Name</td>
              <td className="info-val">: {slip.fatherName || "—"}</td>
              <td className="info-lbl">PF NO.</td>
              <td className="info-val">: {slip.pfNo || ""}</td>
            </tr>
            <tr>
              <td className="info-lbl">Designation</td>
              <td className="info-val">: {slip.designation || "Labour"}</td>
              <td className="info-lbl">ESIC / IP NO.</td>
              <td className="info-val">: {slip.esicNo || ""}</td>
            </tr>
            <tr>
              <td className="info-lbl">Department</td>
              <td className="info-val">: {slip.department || "Construction"}</td>
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

        {/* Breakdown Table: Days | Earnings | Deductions | Net Payable */}
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
              <td className="text-end">{fmt(slip.rate || 376)}</td>
              <td className="text-end">{fmt(slip.basicAmount)}</td>
              <td>Provident Fund</td>
              <td className="text-end">{fmt(slip.providentFund)}</td>
              <td rowSpan={10} className="net-payable-box">
                <div className="net-amount-display">
                  {fmt(slip.netPayable)}
                </div>
              </td>
            </tr>
            <tr>
              <td>W/O</td>
              <td></td>
              <td>OT / OD Wages</td>
              <td className="text-end">{fmt(slip.rate || 376)}</td>
              <td className="text-end">{fmt(slip.otAmount)}</td>
              <td>Voluntary Provident Fund</td>
              <td className="text-end">0.00</td>
            </tr>
            <tr>
              <td>Holidays</td>
              <td></td>
              <td>H R Allowance</td>
              <td className="text-end">0.00</td>
              <td className="text-end">0.00</td>
              <td>ESI</td>
              <td className="text-end">{fmt(slip.esi)}</td>
            </tr>
            <tr>
              <td>OT/OD</td>
              <td className="text-center">{slip.otDays || 0}</td>
              <td>Special Allowance</td>
              <td className="text-end">0.00</td>
              <td className="text-end">0.00</td>
              <td>Professional Tax</td>
              <td className="text-end">{fmt(slip.professionalTax)}</td>
            </tr>
            <tr>
              <td>CL</td>
              <td></td>
              <td>Personal Allowance</td>
              <td className="text-end">0.00</td>
              <td className="text-end">0.00</td>
              <td>Alcohol Deduction</td>
              <td className="text-end">0.00</td>
            </tr>
            <tr>
              <td>SL</td>
              <td></td>
              <td>Conv. Allowance</td>
              <td className="text-end">0.00</td>
              <td className="text-end">0.00</td>
              <td>Advance Repayment</td>
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
              <td>W/P</td>
              <td></td>
              <td>Accomodn. Allowance</td>
              <td className="text-end">0.00</td>
              <td className="text-end">0.00</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td className="fw-bold">Total</td>
              <td className="text-center fw-bold">{slip.presentDays || 0}</td>
              <td>Arrear</td>
              <td className="text-end">0.00</td>
              <td className="text-end">0.00</td>
              <td></td>
              <td></td>
            </tr>
            <tr className="total-row">
              <td className="fw-bold">Paid Days</td>
              <td className="text-center fw-bold">{slip.presentDays || 0}</td>
              <td className="fw-bold">Total Earnings</td>
              <td></td>
              <td className="text-end fw-bold">{fmt(slip.totalEarnings)}</td>
              <td className="fw-bold">Total Deductions</td>
              <td className="text-end fw-bold">{fmt(slip.totalDeductions)}</td>
            </tr>
            <tr>
              <td colSpan={2}></td>
              <td>Salary Advance</td>
              <td></td>
              <td className="text-end">0.00</td>
              <td colSpan={2}></td>
              <td className="text-end fw-bold fs-7">{fmt(slip.netPayable)}</td>
            </tr>
          </tbody>
        </table>

        {/* Leave & Bank Footer */}
        <table className="slip-table footer-table">
          <tbody>
            <tr>
              <td colSpan={4} className="leave-title">Leave Balance Details</td>
              <td colSpan={6} className="words-box">
                <strong>Rs. (In Words):</strong> {slip.amountInWords || "Rupees Zero Only"}
              </td>
            </tr>
            <tr>
              <td className="leave-col-hdr">Leave</td>
              <td className="leave-col-hdr">Opening</td>
              <td className="leave-col-hdr">Availed</td>
              <td className="leave-col-hdr">Late Ded.</td>
              <td colSpan={3} className="bank-cell">
                <strong>Bank Name:</strong> {slip.bankName || ""}
              </td>
              <td colSpan={3} className="bank-cell">
                <strong>Account No.:</strong> {slip.accountNo || ""}
              </td>
            </tr>
            <tr>
              <td>CL</td>
              <td></td>
              <td></td>
              <td></td>
              <td colSpan={6} rowSpan={3} className="empty-filler"></td>
            </tr>
            <tr>
              <td>SL</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>PL_CO</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>

        {/* Disclaimer Note */}
        <div className="disclaimer">
          This is a system generated Salary Slip &amp; does not require any Signature &amp; Seal.
        </div>
      </div>

      <style jsx>{`
        .salary-slip-container {
          width: 100%;
          max-width: 1020px;
          margin: 0 auto;
          background: #ffffff;
          padding: 8px;
          color: #000;
          font-family: Arial, Helvetica, sans-serif;
          box-sizing: border-box;
        }

        .slip-card {
          border: 1.5px solid #000;
          padding: 8px;
          background: #fff;
          box-sizing: border-box;
        }

        .slip-header {
          text-align: center;
          padding-bottom: 4px;
          border-bottom: 1.5px solid #000;
          margin-bottom: 6px;
        }

        .company-title {
          font-size: 19px;
          font-weight: 900;
          margin: 0;
          letter-spacing: 0.5px;
          color: #000;
          text-transform: uppercase;
        }

        .month-subtitle {
          font-size: 13px;
          font-weight: 600;
          margin-top: 2px;
          color: #111;
        }

        .slip-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10.5px;
          margin-bottom: 4px;
        }

        .slip-table td,
        .slip-table th {
          border: 1px solid #333;
          padding: 2.5px 5px;
          color: #000;
          line-height: 1.25;
        }

        .info-table td {
          border: 1px solid #777;
          padding: 2px 6px;
          font-size: 10px;
        }

        .info-lbl {
          font-weight: 700;
          width: 18%;
          background: #fbfbfb;
        }

        .info-val {
          width: 32%;
        }

        .breakdown-table th {
          background: #f3f4f6;
          text-align: center;
          font-weight: 700;
        }

        .col-group-hdr {
          font-size: 10.5px;
          background: #eef2f6 !important;
          padding: 3px;
        }

        .sub-hdr {
          font-size: 10px;
          font-weight: 600;
        }

        .net-hdr {
          background: #f0f4f8 !important;
          width: 18%;
        }

        .net-payable-box {
          text-align: center;
          vertical-align: middle !important;
          background: #fafafa;
          font-weight: 900;
          border-left: 2px solid #000 !important;
        }

        .net-amount-display {
          font-size: 24px;
          font-weight: 900;
          color: #000;
          letter-spacing: -0.5px;
        }

        .total-row {
          background: #fdfdfd;
          border-top: 1.5px solid #000;
        }

        .footer-table {
          margin-top: 4px;
        }

        .leave-title {
          font-weight: 700;
          background: #f4f4f4;
          text-align: center;
          font-size: 10px;
        }

        .words-box {
          font-size: 10px;
          padding: 3px 6px;
        }

        .leave-col-hdr {
          font-size: 9.5px;
          font-weight: 700;
          text-align: center;
          background: #f8f8f8;
        }

        .bank-cell {
          font-size: 10px;
          padding: 3px 6px;
        }

        .disclaimer {
          text-align: center;
          font-size: 9.5px;
          font-style: italic;
          color: #333;
          margin-top: 5px;
          padding-top: 3px;
        }

        @media print {
          .salary-slip-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .slip-card {
            border: 1.5px solid #000 !important;
            padding: 6px !important;
          }
          .company-title {
            font-size: 18px !important;
          }
          .slip-table {
            font-size: 10px !important;
          }
          .slip-table td,
          .slip-table th {
            padding: 2px 4px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LabourSalarySlip;

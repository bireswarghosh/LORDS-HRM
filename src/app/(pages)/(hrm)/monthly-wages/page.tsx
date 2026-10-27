"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import axiosInstance from "@/utils/axiosInstance";
import LabourSalarySlip, { SalarySlipData } from "@/components/hrm/labourSalarySlip/LabourSalarySlip";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  Printer,
  Download,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Calendar,
  Building2,
  Users,
  Coins,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  X,
} from "lucide-react";

interface LabourRow {
  code: string;
  name: string;
  fatherName: string;
  esicNo: string;
  doj: string;
  presentDays: number;
  otDays: number;
  rate: number;
  daysAmount: number;
  otAmount: number;
  totalGross: number;
  pf: number;
  esi: number;
  ptax: number;
  netPayable: number;
}

interface SummaryData {
  totalWorkers: number;
  totalPresentDays: number;
  totalOtDays: number;
  totalDaysAmount: number;
  totalOtAmount: number;
  totalGross: number;
  totalPf: number;
  totalEsi: number;
  totalPtax: number;
  totalDeductions: number;
  totalNetPayable: number;
}

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const YEARS = [2024, 2025, 2026, 2027, 2028];

export default function MonthlyWageSheetPage() {
  const [selectedMonth, setSelectedMonth] = useState<number>(9);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [activeTab, setActiveTab] = useState<"import" | "slips">("slips");

  const [companyName, setCompanyName] = useState<string>("Company");
  const [companyAddress, setCompanyAddress] = useState<string>("");

  // Tab 1 (Import / Grid) State
  const [rows, setRows] = useState<LabourRow[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [importSearch, setImportSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Tab 2 (Slips) State
  const [savedSlips, setSavedSlips] = useState<SalarySlipData[]>([]);
  const [savedRunFound, setSavedRunFound] = useState<boolean>(false);
  const [slipSearchInput, setSlipSearchInput] = useState<string>("");
  const [activeSlipSearch, setActiveSlipSearch] = useState<string>("");
  const [selectedSlipForModal, setSelectedSlipForModal] = useState<SalarySlipData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load User & Company Info on mount
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const res = await axiosInstance.get("/company/myCompany");
        if (res.data?.data) {
          setCompanyName(res.data.data.name || "Company");
          setCompanyAddress(res.data.data.address || "");
        }
      } catch (e) {
        try {
          const meRes = await axiosInstance.get("/me");
          if (meRes.data?.company) {
            setCompanyName(meRes.data.company.name || "Company");
            setCompanyAddress(meRes.data.company.address || "");
          }
        } catch {
          // ignore
        }
      }
    };
    fetchCompanyInfo();
  }, []);

  // Load saved slips for selected month & year
  const loadSavedSlips = async (m: number, y: number) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/labour-wage/slips?month=${m}&year=${y}`);
      if (res.data?.data) {
        const d = res.data.data;
        if (d.company?.name) {
          setCompanyName(d.company.name);
          setCompanyAddress(d.company.address || "");
        }
        if (d.found && d.slips?.length > 0) {
          setSavedSlips(d.slips);
          setSavedRunFound(true);

          if (rows.length === 0) {
            const mappedRows: LabourRow[] = d.slips.map((s: any) => ({
              code: s.code,
              name: s.name,
              fatherName: s.fatherName,
              esicNo: s.esicNo,
              doj: s.doj,
              presentDays: s.presentDays,
              otDays: s.otDays,
              rate: s.rate || 376,
              daysAmount: s.basicAmount,
              otAmount: s.otAmount,
              totalGross: s.totalEarnings,
              pf: s.providentFund,
              esi: s.esi,
              ptax: s.professionalTax,
              netPayable: s.netPayable,
            }));
            setRows(mappedRows);
            recalculateSummary(mappedRows);
          }
        } else {
          setSavedSlips([]);
          setSavedRunFound(false);
        }
      }
    } catch (err: any) {
      console.error("loadSavedSlips error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSavedSlips(selectedMonth, selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  // Recalculate Row & Summary Metrics
  const recalculateRow = (r: LabourRow): LabourRow => {
    const rate = Number(r.rate) || 376;
    const present = Number(r.presentDays) || 0;
    const ot = Number(r.otDays) || 0;

    const daysAmount = Math.round(present * rate);
    const otAmount = Math.round(ot * rate * 100) / 100;
    const totalGross = Math.round((daysAmount + otAmount) * 100) / 100;
    const pf = Math.round(daysAmount * 0.12);
    const esi = Math.round(totalGross * 0.0075);
    const ptax = totalGross >= 10000 ? 110 : 0;
    const netPayable = Math.round((totalGross - (pf + esi + ptax)) * 100) / 100;

    return {
      ...r,
      daysAmount,
      otAmount,
      totalGross,
      pf,
      esi,
      ptax,
      netPayable,
    };
  };

  const recalculateSummary = (currentRows: LabourRow[]) => {
    let totalPresent = 0;
    let totalOt = 0;
    let totalDaysAmt = 0;
    let totalOtAmt = 0;
    let totalGross = 0;
    let totalPf = 0;
    let totalEsi = 0;
    let totalPtax = 0;
    let totalNet = 0;

    for (const r of currentRows) {
      totalPresent += Number(r.presentDays) || 0;
      totalOt += Number(r.otDays) || 0;
      totalDaysAmt += Number(r.daysAmount) || 0;
      totalOtAmt += Number(r.otAmount) || 0;
      totalGross += Number(r.totalGross) || 0;
      totalPf += Number(r.pf) || 0;
      totalEsi += Number(r.esi) || 0;
      totalPtax += Number(r.ptax) || 0;
      totalNet += Number(r.netPayable) || 0;
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;

    setSummary({
      totalWorkers: currentRows.length,
      totalPresentDays: round2(totalPresent),
      totalOtDays: round2(totalOt),
      totalDaysAmount: round2(totalDaysAmt),
      totalOtAmount: round2(totalOtAmt),
      totalGross: round2(totalGross),
      totalPf: round2(totalPf),
      totalEsi: round2(totalEsi),
      totalPtax: round2(totalPtax),
      totalDeductions: round2(totalPf + totalEsi + totalPtax),
      totalNetPayable: round2(totalNet),
    });
  };

  // Handle cell edit in Live Grid
  const handleCellChange = (index: number, field: keyof LabourRow, value: any) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    if (["presentDays", "otDays", "rate"].includes(field)) {
      updated[index] = recalculateRow(updated[index]);
    }
    setRows(updated);
    recalculateSummary(updated);
  };

  // File Upload Preview
  const handleFileUpload = async (file: File) => {
    try {
      setLoading(true);
      setStatusMessage({ type: "info", text: "Parsing spreadsheet file..." });
      const formData = new FormData();
      formData.append("file", file);

      const res = await axiosInstance.post("/labour-wage/preview", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success && res.data.data?.rows) {
        setRows(res.data.data.rows);
        setSummary(res.data.data.summary);
        setStatusMessage({
          type: "success",
          text: `Loaded ${res.data.data.rows.length} worker records! You can review or edit cells below.`,
        });
      } else {
        throw new Error(res.data?.message || "Failed to parse file.");
      }
    } catch (err: any) {
      console.error("handleFileUpload error:", err);
      setStatusMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Error reading file. Please check file format.",
      });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Fast load sample data for September 2026
  const loadCompanySample = async (compType: "VODABOX" | "JUBILANT") => {
    try {
      setLoading(true);
      setStatusMessage({ type: "info", text: `Loading verified ${compType} September 2026 wage dataset...` });
      const filename =
        compType === "VODABOX"
          ? "/sample-sheets/VODABOX_September_2026.csv"
          : "/sample-sheets/JUBILANT_September_2026.csv";

      const res = await fetch(filename);
      const csvText = await res.text();

      const blob = new Blob([csvText], { type: "text/csv" });
      const file = new File([blob], `${compType}_September_2026.csv`, { type: "text/csv" });
      await handleFileUpload(file);
    } catch (err: any) {
      console.error("loadCompanySample error:", err);
      setStatusMessage({ type: "error", text: "Failed to load sample dataset." });
      setLoading(false);
    }
  };

  // Save to Database
  const handleSaveToDatabase = async () => {
    if (rows.length === 0) {
      alert("No rows to save. Please upload or load sheet data first.");
      return;
    }

    const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label;
    const confirmMsg = `Save and process ${rows.length} worker wage records for ${monthLabel} ${selectedYear} for ${companyName}?\n\nThis will update employee profiles and finalize the ${monthLabel} ${selectedYear} payroll.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setSaving(true);
      setStatusMessage({ type: "info", text: "Saving to database and generating salary slips..." });

      const res = await axiosInstance.post("/labour-wage/save", {
        month: selectedMonth,
        year: selectedYear,
        rows,
      });

      if (res.data?.success) {
        setStatusMessage({
          type: "success",
          text: `🎉 Successfully saved ${rows.length} worker wage records for ${monthLabel} ${selectedYear}! Slips are now ready.`,
        });
        await loadSavedSlips(selectedMonth, selectedYear);
        setActiveTab("slips");
      } else {
        throw new Error(res.data?.message || "Failed to save records.");
      }
    } catch (err: any) {
      console.error("handleSaveToDatabase error:", err);
      setStatusMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Failed to save to database.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Add new blank row
  const handleAddRow = () => {
    const nextNum = rows.length + 1;
    const prefix = companyName.toLowerCase().includes("vodabox") ? "VD" : "JB";
    const newCode = `${prefix}${String(nextNum).padStart(3, "0")}`;
    const newRow: LabourRow = recalculateRow({
      code: newCode,
      name: `NEW WORKER ${nextNum}`,
      fatherName: "C/O -",
      esicNo: "",
      doj: `01.${String(selectedMonth).padStart(2, "0")}.${selectedYear}`,
      presentDays: 26,
      otDays: 0,
      rate: 376,
      daysAmount: 0,
      otAmount: 0,
      totalGross: 0,
      pf: 0,
      esi: 0,
      ptax: 0,
      netPayable: 0,
    });
    const updated = [...rows, newRow];
    setRows(updated);
    recalculateSummary(updated);
  };

  // Delete row
  const handleDeleteRow = (index: number) => {
    if (!window.confirm("Remove this worker row from the sheet?")) return;
    const updated = rows.filter((_, i) => i !== index);
    setRows(updated);
    recalculateSummary(updated);
  };

  // Delete entire Month Wage Run & Slips from Database
  const handleDeleteMonthData = async () => {
    const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || "Month";
    const confirmMsg = `⚠️ ARE YOU SURE?\n\nDo you want to permanently delete all saved wage records and salary slips for ${monthLabel} ${selectedYear} for ${companyName}?\n\nThis will completely clear this month's payroll so you can upload fresh or re-test with dummy sheets.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setLoading(true);
      setStatusMessage({ type: "info", text: `Deleting wage records for ${monthLabel} ${selectedYear}...` });

      const res = await axiosInstance.delete(`/labour-wage/month?month=${selectedMonth}&year=${selectedYear}`);

      if (res.data?.success) {
        setStatusMessage({
          type: "success",
          text: `🗑️ Successfully deleted all wage records for ${monthLabel} ${selectedYear}! Month reset to clean state.`,
        });
        setSavedSlips([]);
        setSavedRunFound(false);
        setRows([]);
        setSummary(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        throw new Error(res.data?.message || "Failed to delete records.");
      }
    } catch (err: any) {
      console.error("handleDeleteMonthData error:", err);
      setStatusMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Failed to delete month wage data.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete Single Employee Salary Slip
  const handleDeleteSingleSlip = async (slip: SalarySlipData) => {
    if (!slip.id) {
      alert("Slip ID not found.");
      return;
    }
    const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || "Month";
    const confirmMsg = `Delete salary slip for ${slip.name} (${slip.code}) for ${monthLabel} ${selectedYear}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setLoading(true);
      const res = await axiosInstance.delete(`/labour-wage/slip/${slip.id}`);
      if (res.data?.success) {
        setStatusMessage({
          type: "success",
          text: `🗑️ Deleted salary slip for ${slip.name} (${slip.code}).`,
        });
        await loadSavedSlips(selectedMonth, selectedYear);
      } else {
        throw new Error(res.data?.message || "Failed to delete salary slip.");
      }
    } catch (err: any) {
      console.error("handleDeleteSingleSlip error:", err);
      setStatusMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Failed to delete salary slip.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Clear / Delete Uploaded Preview Spreadsheet
  const handleClearUploadPreview = () => {
    if (rows.length === 0) {
      setStatusMessage({ type: "info", text: "Sheet preview is already empty." });
      return;
    }
    if (window.confirm("Delete and clear the currently uploaded spreadsheet preview?")) {
      setRows([]);
      setSummary(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setStatusMessage({ type: "info", text: "Uploaded spreadsheet preview cleared." });
    }
  };

  const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || "September";

  // Filtered rows for Tab 1
  const filteredImportRows = rows.filter((r) => {
    if (!importSearch.trim()) return true;
    const q = importSearch.toLowerCase();
    return (
      r.code.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.fatherName.toLowerCase().includes(q) ||
      r.esicNo.toLowerCase().includes(q)
    );
  });

  // Filtered slips for Tab 2
  const filteredSlips = useMemo(() => {
    if (!activeSlipSearch.trim()) return savedSlips;
    const q = activeSlipSearch.toLowerCase().trim();
    return savedSlips.filter((s) => {
      return (
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.fatherName && s.fatherName.toLowerCase().includes(q)) ||
        (s.esicNo && s.esicNo.toLowerCase().includes(q))
      );
    });
  }, [savedSlips, activeSlipSearch]);

  const handleApplySlipSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveSlipSearch(slipSearchInput.trim());
  };

  const handleClearSlipSearch = () => {
    setSlipSearchInput("");
    setActiveSlipSearch("");
  };

  // =========================================================================
  // BULLETPROOF PRINT ENGINE (CLEAN POPUP WINDOW - ZERO BACKGROUND/CHATBOT LEAK)
  // =========================================================================
  const generateSlipHtml = (slip: SalarySlipData): string => {
    const fmt = (val?: number) =>
      (Number(val) || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    const locationText = slip.location || companyAddress || "";

    return `
      <div class="salary-slip-page">
        <div class="slip-card">
          <div class="slip-header">
            <h2 class="company-title">${companyName.toUpperCase()}</h2>
            <div class="month-subtitle">Salary Slip for the month of ${monthLabel} ${selectedYear}</div>
          </div>

          <table class="slip-table info-table">
            <tbody>
              <tr>
                <td class="info-lbl">Employee Code</td>
                <td class="info-val">: ${slip.code}</td>
                <td class="info-lbl">Employee Type</td>
                <td class="info-val">: ${slip.employeeType || "Labour"}</td>
              </tr>
              <tr>
                <td class="info-lbl">Employee Name</td>
                <td class="info-val">: ${slip.name}</td>
                <td class="info-lbl">DOJ</td>
                <td class="info-val">: ${slip.doj || "—"}</td>
              </tr>
              <tr>
                <td class="info-lbl">Father / Husband Name</td>
                <td class="info-val">: ${slip.fatherName || "—"}</td>
                <td class="info-lbl">PF NO.</td>
                <td class="info-val">: ${slip.pfNo || ""}</td>
              </tr>
              <tr>
                <td class="info-lbl">Designation</td>
                <td class="info-val">: ${slip.designation || "Labour"}</td>
                <td class="info-lbl">ESIC / IP NO.</td>
                <td class="info-val">: ${slip.esicNo || ""}</td>
              </tr>
              <tr>
                <td class="info-lbl">Department</td>
                <td class="info-val">: ${slip.department || "Construction"}</td>
                <td class="info-lbl">UAN</td>
                <td class="info-val">: ${slip.uan || ""}</td>
              </tr>
              <tr>
                <td class="info-lbl">Location</td>
                <td class="info-val">: ${locationText}</td>
                <td class="info-lbl">PAN NO.</td>
                <td class="info-val">: ${slip.panNo || ""}</td>
              </tr>
            </tbody>
          </table>

          <table class="slip-table breakdown-table">
            <thead>
              <tr>
                <th colspan="2" class="col-group-hdr">Days</th>
                <th colspan="3" class="col-group-hdr">Earnings</th>
                <th colspan="2" class="col-group-hdr">Deductions</th>
                <th class="col-group-hdr net-hdr">Net Payable (Rs.)</th>
              </tr>
              <tr class="sub-hdr-row">
                <th class="sub-hdr">Particulars</th>
                <th class="sub-hdr text-center">Days</th>
                <th class="sub-hdr">Particulars</th>
                <th class="sub-hdr text-end">Rate</th>
                <th class="sub-hdr text-end">Amount (Rs.)</th>
                <th class="sub-hdr">Particulars</th>
                <th class="sub-hdr text-end">Amount (Rs.)</th>
                <th class="sub-hdr empty-hdr"></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Present</td>
                <td class="text-center">${slip.presentDays || 0}</td>
                <td>Basic Wages</td>
                <td class="text-end">${fmt(slip.rate || 376)}</td>
                <td class="text-end">${fmt(slip.basicAmount)}</td>
                <td>Provident Fund</td>
                <td class="text-end">${fmt(slip.providentFund)}</td>
                <td rowspan="10" class="net-payable-box">
                  <div class="net-amount-display">${fmt(slip.netPayable)}</div>
                </td>
              </tr>
              <tr>
                <td>W/O</td>
                <td></td>
                <td>OT / OD Wages</td>
                <td class="text-end">${fmt(slip.rate || 376)}</td>
                <td class="text-end">${fmt(slip.otAmount)}</td>
                <td>Voluntary Provident Fund</td>
                <td class="text-end">0.00</td>
              </tr>
              <tr>
                <td>Holidays</td>
                <td></td>
                <td>H R Allowance</td>
                <td class="text-end">0.00</td>
                <td class="text-end">0.00</td>
                <td>ESI</td>
                <td class="text-end">${fmt(slip.esi)}</td>
              </tr>
              <tr>
                <td>OT/OD</td>
                <td class="text-center">${slip.otDays || 0}</td>
                <td>Special Allowance</td>
                <td class="text-end">0.00</td>
                <td class="text-end">0.00</td>
                <td>Professional Tax</td>
                <td class="text-end">${fmt(slip.professionalTax)}</td>
              </tr>
              <tr>
                <td>CL</td>
                <td></td>
                <td>Personal Allowance</td>
                <td class="text-end">0.00</td>
                <td class="text-end">0.00</td>
                <td>Alcohol Deduction</td>
                <td class="text-end">0.00</td>
              </tr>
              <tr>
                <td>SL</td>
                <td></td>
                <td>Conv. Allowance</td>
                <td class="text-end">0.00</td>
                <td class="text-end">0.00</td>
                <td>Advance Repayment</td>
                <td class="text-end">0.00</td>
              </tr>
              <tr>
                <td>PL_CO</td>
                <td></td>
                <td>Other Earning</td>
                <td class="text-end">0.00</td>
                <td class="text-end">0.00</td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td>W/P</td>
                <td></td>
                <td>Accomodn. Allowance</td>
                <td class="text-end">0.00</td>
                <td class="text-end">0.00</td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td class="fw-bold">Total</td>
                <td class="text-center fw-bold">${slip.presentDays || 0}</td>
                <td>Arrear</td>
                <td class="text-end">0.00</td>
                <td class="text-end">0.00</td>
                <td></td>
                <td></td>
              </tr>
              <tr class="total-row">
                <td class="fw-bold">Paid Days</td>
                <td class="text-center fw-bold">${slip.presentDays || 0}</td>
                <td class="fw-bold">Total Earnings</td>
                <td></td>
                <td class="text-end fw-bold">${fmt(slip.totalEarnings)}</td>
                <td class="fw-bold">Total Deductions</td>
                <td class="text-end fw-bold">${fmt(slip.totalDeductions)}</td>
              </tr>
              <tr>
                <td colspan="2"></td>
                <td>Salary Advance</td>
                <td></td>
                <td class="text-end">0.00</td>
                <td colspan="2"></td>
                <td class="text-end fw-bold" style="font-size: 11px;">${fmt(slip.netPayable)}</td>
              </tr>
            </tbody>
          </table>

          <table class="slip-table footer-table">
            <tbody>
              <tr>
                <td colspan="4" class="leave-title">Leave Balance Details</td>
                <td colspan="6" class="words-box">
                  <strong>Rs. (In Words):</strong> ${slip.amountInWords || "Rupees Zero Only"}
                </td>
              </tr>
              <tr>
                <td class="leave-col-hdr">Leave</td>
                <td class="leave-col-hdr">Opening</td>
                <td class="leave-col-hdr">Availed</td>
                <td class="leave-col-hdr">Late Ded.</td>
                <td colspan="3" class="bank-cell">
                  <strong>Bank Name:</strong> ${slip.bankName || ""}
                </td>
                <td colspan="3" class="bank-cell">
                  <strong>Account No.:</strong> ${slip.accountNo || ""}
                </td>
              </tr>
              <tr>
                <td>CL</td><td></td><td></td><td></td>
                <td colspan="6" rowspan="3" class="empty-filler"></td>
              </tr>
              <tr><td>SL</td><td></td><td></td><td></td></tr>
              <tr><td>PL_CO</td><td></td><td></td><td></td></tr>
            </tbody>
          </table>

          <div class="disclaimer">
            This is a system generated Salary Slip &amp; does not require any Signature &amp; Seal.
          </div>
        </div>
      </div>
    `;
  };

  const printSlipsCleanly = (slipsToPrint: SalarySlipData[]) => {
    if (!slipsToPrint || slipsToPrint.length === 0) {
      alert("No slips to print.");
      return;
    }

    const printWin = window.open("", "_blank");
    if (!printWin) {
      alert("Please allow popups to open the print dialog.");
      return;
    }

    const slipsHtml = slipsToPrint.map((s) => generateSlipHtml(s)).join("");

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Slips - ${companyName} (${monthLabel} ${selectedYear})</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm 6mm 6mm 6mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #000000;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
          }
          .salary-slip-page {
            width: 100%;
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            padding: 0;
            margin: 0 0 10px 0;
          }
          .salary-slip-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .slip-card {
            border: 1.5px solid #000;
            padding: 8px;
            background: #fff;
            width: 100%;
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
            font-size: 12px;
            font-weight: 600;
            margin-top: 2px;
            color: #111;
          }
          .slip-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-bottom: 4px;
          }
          .slip-table td, .slip-table th {
            border: 1px solid #333;
            padding: 2.5px 5px;
            color: #000;
            line-height: 1.25;
          }
          .info-table td {
            border: 1px solid #666;
            padding: 2px 6px;
            font-size: 9.5px;
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
            font-size: 10px;
            background: #eef2f6 !important;
            padding: 3px;
          }
          .sub-hdr {
            font-size: 9.5px;
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
          .leave-title {
            font-weight: 700;
            background: #f4f4f4;
            text-align: center;
            font-size: 9.5px;
          }
          .words-box {
            font-size: 9.5px;
            padding: 3px 6px;
          }
          .leave-col-hdr {
            font-size: 9px;
            font-weight: 700;
            text-align: center;
            background: #f8f8f8;
          }
          .bank-cell {
            font-size: 9.5px;
            padding: 3px 6px;
          }
          .disclaimer {
            text-align: center;
            font-size: 9px;
            font-style: italic;
            color: #333;
            margin-top: 5px;
            padding-top: 3px;
          }
          .text-end { text-align: right; }
          .text-center { text-align: center; }
          .fw-bold { font-weight: bold; }
        </style>
      </head>
      <body>
        ${slipsHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(fullHtml);
    printWin.document.close();
  };

  return (
    <div className="page-wrapper labour-wage-page">
      {/* Floating Status Alerts */}
      {statusMessage && (
        <div className={`status-banner alert-banner-${statusMessage.type}`}>
          <div className="status-text">{statusMessage.text}</div>
          <button className="status-close" onClick={() => setStatusMessage(null)}>
            ×
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="content">
        <div className="wage-hero-card">
          <div className="hero-content">
            <div className="hero-badge">
              <Sparkles size={14} className="sparkle-icon" />
              Contractor Labour Wages &amp; Slips
            </div>
            <h1 className="hero-title">{companyName}</h1>
            <p className="hero-subtitle">
              Interactive monthly wage sheet management with live spreadsheet preview, automated
              ESI/PF calculation, and 1-click bulk salary slip printing.
            </p>
          </div>

          <div className="hero-controls">
            <div className="month-selector-box">
              <div className="selector-group">
                <Calendar size={16} className="text-muted" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="period-select"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="period-select"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {savedRunFound ? (
                <>
                  <div className="status-pill pill-live">
                    <CheckCircle2 size={13} /> Saved in Database ({savedSlips.length} Slips)
                  </div>
                  <button
                    type="button"
                    className="btn-delete-header"
                    onClick={handleDeleteMonthData}
                    disabled={loading}
                    title={`Delete all saved wage records for ${monthLabel} ${selectedYear}`}
                  >
                    <Trash2 size={13} /> Delete {monthLabel} Data
                  </button>
                </>
              ) : (
                <div className="status-pill pill-draft">
                  <SlidersHorizontal size={13} /> Pending Sheet Import
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-tabs-wrapper">
          <button
            className={`tab-btn ${activeTab === "slips" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("slips")}
          >
            <Printer size={16} />
            <span>1. Processed Slips &amp; Bulk Export</span>
            {savedSlips.length > 0 && <span className="tab-count-badge green">{savedSlips.length}</span>}
          </button>

          <button
            className={`tab-btn ${activeTab === "import" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("import")}
          >
            <FileSpreadsheet size={16} />
            <span>2. Upload &amp; Live Spreadsheet Grid</span>
            {rows.length > 0 && <span className="tab-count-badge">{rows.length}</span>}
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: PROCESSED SALARY SLIPS & BULK EXPORT */}
        {/* ============================================================== */}
        {activeTab === "slips" && (
          <div className="tab-pane-content">
            {savedSlips.length === 0 ? (
              <div className="empty-slips-card">
                <FileSpreadsheet size={48} className="empty-icon" />
                <h3>No Finalized Slips for {monthLabel} {selectedYear}</h3>
                <p>
                  No salary records were found in the database for this month. Upload your Excel or CSV sheet
                  in Tab 2 and click <strong>&quot;Confirm &amp; Save&quot;</strong> to generate and finalize the salary slips.
                </p>
                <button className="btn-go-import" onClick={() => setActiveTab("import")}>
                  Go to Upload &amp; Preview <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="slips-manager-card">
                {/* Slips Action Toolbar */}
                <div className="slips-toolbar">
                  <div className="toolbar-info">
                    <h3 className="toolbar-title">
                      {monthLabel} {selectedYear} Salary Slips
                    </h3>
                    <p className="toolbar-desc">
                      {savedSlips.length} employees finalized • All slips formatted to official contractor labour standards
                    </p>
                  </div>

                  <div className="toolbar-buttons">
                    <button
                      className="btn-bulk-print"
                      onClick={() => printSlipsCleanly(filteredSlips)}
                    >
                      <Printer size={18} />
                      {activeSlipSearch ? (
                        <>Print Filtered Slips ({filteredSlips.length})</>
                      ) : (
                        <>Print All Slips ({savedSlips.length})</>
                      )}
                    </button>

                    <button
                      className="btn-delete-month"
                      onClick={handleDeleteMonthData}
                      disabled={loading}
                      title={`Permanently delete all saved records for ${monthLabel} ${selectedYear}`}
                    >
                      <Trash2 size={16} /> Delete Month Data ({savedSlips.length})
                    </button>
                  </div>
                </div>

                {/* DEDICATED SEARCH BAR FOR PARTICULAR EMPLOYEE SEARCH */}
                <div className="employee-search-bar-card">
                  <form onSubmit={handleApplySlipSearch} className="search-form-row">
                    <div className="search-input-wrapper">
                      <Search size={18} className="search-lead-icon" />
                      <input
                        type="text"
                        placeholder="Search worker by Name (e.g. Manira), Code (e.g. JB001, VD045), ESIC Number, or Father's Name..."
                        value={slipSearchInput}
                        onChange={(e) => {
                          setSlipSearchInput(e.target.value);
                          setActiveSlipSearch(e.target.value.trim());
                        }}
                        className="employee-search-input"
                      />
                      {slipSearchInput && (
                        <button
                          type="button"
                          className="search-clear-btn"
                          onClick={handleClearSlipSearch}
                          title="Clear Search"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>

                    <button type="submit" className="btn-search-submit">
                      <Search size={15} /> Search
                    </button>

                    {activeSlipSearch && (
                      <button
                        type="button"
                        className="btn-search-reset"
                        onClick={handleClearSlipSearch}
                      >
                        Show All ({savedSlips.length})
                      </button>
                    )}
                  </form>

                  {/* Search Status / Filter Pill */}
                  <div className="search-filter-status">
                    {activeSlipSearch ? (
                      <span className="filter-pill active">
                        Filtered: <strong>{filteredSlips.length}</strong> matching &quot;{activeSlipSearch}&quot; (Total: {savedSlips.length})
                      </span>
                    ) : (
                      <span className="filter-pill">
                        Showing all <strong>{savedSlips.length}</strong> finalized worker salary slips
                      </span>
                    )}
                  </div>
                </div>

                {/* Worker Slips List */}
                <div className="slips-table-wrapper">
                  <table className="slips-table">
                    <thead>
                      <tr>
                        <th style={{ width: "90px" }}>Code</th>
                        <th style={{ minWidth: "170px" }}>Worker Name</th>
                        <th style={{ minWidth: "160px" }}>Father / Husband</th>
                        <th style={{ width: "120px" }}>ESIC No</th>
                        <th className="text-center" style={{ width: "70px" }}>Days</th>
                        <th className="text-center" style={{ width: "65px" }}>OT</th>
                        <th className="text-end" style={{ width: "110px" }}>Gross Wages</th>
                        <th className="text-end" style={{ width: "100px" }}>Total Ded.</th>
                        <th className="text-end" style={{ width: "115px" }}>Net Payable</th>
                        <th className="text-center" style={{ width: "190px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSlips.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-5 text-muted">
                            No employees found matching &quot;{activeSlipSearch}&quot;.
                          </td>
                        </tr>
                      ) : (
                        filteredSlips.map((s, idx) => (
                          <tr key={idx}>
                            <td className="code-badge">{s.code}</td>
                            <td className="worker-name-cell">{s.name}</td>
                            <td className="text-muted">{s.fatherName || "—"}</td>
                            <td className="mono">{s.esicNo || "—"}</td>
                            <td className="text-center font-bold">{s.presentDays}</td>
                            <td className="text-center">{s.otDays}</td>
                            <td className="text-end">₹{s.totalEarnings.toLocaleString("en-IN")}</td>
                            <td className="text-end text-danger">₹{s.totalDeductions.toLocaleString("en-IN")}</td>
                            <td className="text-end font-bold net-col-text">
                              ₹{s.netPayable.toLocaleString("en-IN")}
                            </td>
                            <td className="text-center">
                              <div className="action-button-row">
                                <button
                                  className="btn-view-slip"
                                  onClick={() => setSelectedSlipForModal(s)}
                                  title="View on-screen Slip"
                                >
                                  <Eye size={13} /> View
                                </button>
                                <button
                                  className="btn-print-single"
                                  onClick={() => printSlipsCleanly([s])}
                                  title="Print single 1-page Salary Slip"
                                >
                                  <Printer size={13} /> Print Slip
                                </button>
                                <button
                                  className="btn-delete-single"
                                  onClick={() => handleDeleteSingleSlip(s)}
                                  disabled={loading}
                                  title={`Delete slip for ${s.name}`}
                                >
                                  <Trash2 size={13} /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: UPLOAD & LIVE EDITABLE SPREADSHEET GRID */}
        {/* ============================================================== */}
        {activeTab === "import" && (
          <div className="tab-pane-content">
            {/* Upload Zone & Quick Samples */}
            <div className="upload-section-card">
              <div className="upload-dropzone" onClick={() => fileInputRef.current?.click()}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="d-none"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                />
                <div className="upload-icon-circle">
                  <UploadCloud size={28} className="upload-icon" />
                </div>
                <div className="upload-title">Drop your Excel (.xlsx, .xls) or CSV sheet here</div>
                <div className="upload-desc">
                  Supports contractor wage formats with Present Days, OT, Rate ₹376, PF, ESI, P-Tax
                </div>
                <button
                  type="button"
                  className="btn-browse-file"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Browse Computer
                </button>
              </div>

              <div className="quick-actions-bar">
                <div className="quick-title">Quick Actions &amp; Templates:</div>
                <div className="quick-btn-group">
                  <a
                    href="/api/v1/labour-wage/template"
                    download="Labour_Wage_Template.xlsx"
                    className="action-pill-btn"
                  >
                    <Download size={14} /> Blank Excel Template
                  </a>

                  <button
                    type="button"
                    className="action-pill-btn sample-btn"
                    onClick={() =>
                      loadCompanySample(
                        companyName.toLowerCase().includes("vodabox") ? "VODABOX" : "JUBILANT"
                      )
                    }
                  >
                    <Sparkles size={14} /> Load September 2026 Verified Data
                  </button>

                  {rows.length > 0 && (
                    <button
                      type="button"
                      className="action-pill-btn delete-pill-btn"
                      onClick={handleClearUploadPreview}
                      title="Clear uploaded spreadsheet from memory"
                    >
                      <Trash2 size={14} /> Clear / Delete Sheet
                    </button>
                  )}

                  {savedRunFound && (
                    <button
                      type="button"
                      className="action-pill-btn delete-db-pill-btn"
                      onClick={handleDeleteMonthData}
                      disabled={loading}
                      title={`Permanently delete saved ${monthLabel} ${selectedYear} records from database`}
                    >
                      <Trash2 size={14} /> Delete Saved {monthLabel} Data from DB
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* KPI Summary Cards */}
            {summary && rows.length > 0 && (
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon-box blue">
                    <Users size={20} />
                  </div>
                  <div className="metric-info">
                    <div className="metric-val">{summary.totalWorkers}</div>
                    <div className="metric-lbl">Total Workers</div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon-box purple">
                    <Calendar size={20} />
                  </div>
                  <div className="metric-info">
                    <div className="metric-val">{summary.totalPresentDays.toLocaleString("en-IN")}</div>
                    <div className="metric-lbl">Total Present Days</div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon-box amber">
                    <Coins size={20} />
                  </div>
                  <div className="metric-info">
                    <div className="metric-val">{summary.totalOtDays}</div>
                    <div className="metric-lbl">Total OT Days</div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon-box teal">
                    <Building2 size={20} />
                  </div>
                  <div className="metric-info">
                    <div className="metric-val">₹{summary.totalGross.toLocaleString("en-IN")}</div>
                    <div className="metric-lbl">Total Gross Wages</div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon-box red">
                    <ShieldAlert size={20} />
                  </div>
                  <div className="metric-info">
                    <div className="metric-val">₹{summary.totalDeductions.toLocaleString("en-IN")}</div>
                    <div className="metric-lbl">
                      PF (₹{summary.totalPf.toLocaleString("en-IN")}) + ESI (₹{summary.totalEsi.toLocaleString("en-IN")})
                    </div>
                  </div>
                </div>

                <div className="metric-card highlight-metric">
                  <div className="metric-icon-box green">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="metric-info">
                    <div className="metric-val net-val">₹{summary.totalNetPayable.toLocaleString("en-IN")}</div>
                    <div className="metric-lbl">Total Net Payable</div>
                  </div>
                </div>
              </div>
            )}

            {/* Live Interactive Grid */}
            {rows.length > 0 && (
              <div className="grid-card">
                <div className="grid-toolbar">
                  <div className="search-box">
                    <Search size={15} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Filter grid by worker name, code or ESIC..."
                      value={importSearch}
                      onChange={(e) => setImportSearch(e.target.value)}
                      className="search-input"
                    />
                  </div>

                  <div className="grid-action-btns">
                    <button className="tool-btn add-btn" onClick={handleAddRow}>
                      <Plus size={15} /> Add Worker
                    </button>
                    <button
                      className="tool-btn delete-grid-btn"
                      onClick={handleClearUploadPreview}
                      title="Clear and discard current spreadsheet preview"
                    >
                      <Trash2 size={14} /> Delete Preview Grid
                    </button>
                    {savedRunFound && (
                      <button
                        className="tool-btn delete-db-btn"
                        onClick={handleDeleteMonthData}
                        disabled={loading}
                        title={`Delete saved records for ${monthLabel} ${selectedYear} from database`}
                      >
                        <Trash2 size={14} /> Delete Saved Month from DB
                      </button>
                    )}
                    <button
                      className="tool-btn save-btn"
                      disabled={saving || loading}
                      onClick={handleSaveToDatabase}
                    >
                      {saving ? (
                        <>
                          <RefreshCw size={15} className="spin" /> Saving &amp; Finalizing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} /> Confirm &amp; Save ({monthLabel} {selectedYear})
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="spreadsheet-wrapper">
                  <table className="spreadsheet-table">
                    <thead>
                      <tr>
                        <th style={{ width: "45px" }}>#</th>
                        <th style={{ width: "95px" }}>Code</th>
                        <th style={{ minWidth: "160px" }}>Worker Name</th>
                        <th style={{ minWidth: "160px" }}>Father / Husband</th>
                        <th style={{ width: "120px" }}>ESIC No</th>
                        <th style={{ width: "105px" }}>DOJ</th>
                        <th style={{ width: "80px" }}>Present</th>
                        <th style={{ width: "75px" }}>OT/OD</th>
                        <th style={{ width: "75px" }}>Rate</th>
                        <th style={{ width: "95px" }} className="text-end">Days Amt</th>
                        <th style={{ width: "90px" }} className="text-end">OT Amt</th>
                        <th style={{ width: "105px" }} className="text-end">Total Gross</th>
                        <th style={{ width: "85px" }} className="text-end">PF (12%)</th>
                        <th style={{ width: "75px" }} className="text-end">ESI</th>
                        <th style={{ width: "70px" }} className="text-end">P-Tax</th>
                        <th style={{ width: "115px" }} className="text-end net-col">Net Payable</th>
                        <th style={{ width: "50px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredImportRows.map((row, idx) => (
                        <tr key={idx} className="data-row">
                          <td className="row-num text-center">{idx + 1}</td>
                          <td>
                            <input
                              type="text"
                              value={row.code}
                              onChange={(e) => handleCellChange(idx, "code", e.target.value)}
                              className="cell-input code-input"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) => handleCellChange(idx, "name", e.target.value)}
                              className="cell-input name-input"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={row.fatherName}
                              onChange={(e) => handleCellChange(idx, "fatherName", e.target.value)}
                              className="cell-input"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={row.esicNo}
                              onChange={(e) => handleCellChange(idx, "esicNo", e.target.value)}
                              className="cell-input"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={row.doj}
                              onChange={(e) => handleCellChange(idx, "doj", e.target.value)}
                              className="cell-input text-center"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.5"
                              value={row.presentDays}
                              onChange={(e) => handleCellChange(idx, "presentDays", e.target.value)}
                              className="cell-input number-input"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.125"
                              value={row.otDays}
                              onChange={(e) => handleCellChange(idx, "otDays", e.target.value)}
                              className="cell-input number-input"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={row.rate}
                              onChange={(e) => handleCellChange(idx, "rate", e.target.value)}
                              className="cell-input number-input"
                            />
                          </td>
                          <td className="calc-val text-end">₹{row.daysAmount.toLocaleString("en-IN")}</td>
                          <td className="calc-val text-end">₹{row.otAmount.toLocaleString("en-IN")}</td>
                          <td className="calc-val text-end font-bold">
                            ₹{row.totalGross.toLocaleString("en-IN")}
                          </td>
                          <td className="calc-val text-end text-danger">
                            ₹{row.pf.toLocaleString("en-IN")}
                          </td>
                          <td className="calc-val text-end text-danger">
                            ₹{row.esi.toLocaleString("en-IN")}
                          </td>
                          <td className="calc-val text-end">₹{row.ptax}</td>
                          <td className="net-payable-cell text-end">
                            <span className="net-pill">₹{row.netPayable.toLocaleString("en-IN")}</span>
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="row-del-btn"
                              title="Delete Row"
                              onClick={() => handleDeleteRow(idx)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid-footer-bar">
                  <div className="footer-left">
                    Showing {filteredImportRows.length} of {rows.length} worker entries
                  </div>
                  <div className="footer-right">
                    <button
                      className="save-action-btn"
                      disabled={saving || loading}
                      onClick={handleSaveToDatabase}
                    >
                      {saving ? "Saving Data..." : `Confirm & Save ${rows.length} Workers →`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* SINGLE SALARY SLIP MODAL */}
      {/* ============================================================== */}
      {selectedSlipForModal && (
        <div className="modal-backdrop" onClick={() => setSelectedSlipForModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-topbar">
              <div className="modal-title">
                Salary Slip: <strong>{selectedSlipForModal.name}</strong> ({selectedSlipForModal.code})
              </div>
              <div className="modal-actions">
                <button
                  className="modal-print-btn"
                  onClick={() => printSlipsCleanly([selectedSlipForModal])}
                >
                  <Printer size={16} /> Print 1-Page Slip
                </button>
                <button
                  className="modal-close-btn"
                  onClick={() => setSelectedSlipForModal(null)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="modal-slip-preview">
              <LabourSalarySlip
                slip={selectedSlipForModal}
                companyName={companyName}
                companyLocation={companyAddress}
                monthName={monthLabel}
                year={selectedYear}
              />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .labour-wage-page {
          padding: 24px;
          background: #f8fafc;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        /* Hero Card */
        .wage-hero-card {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%);
          border-radius: 16px;
          padding: 28px 32px;
          color: white;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 24px;
          margin-bottom: 24px;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(8px);
          padding: 5px 12px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 600;
          color: #38bdf8;
          margin-bottom: 12px;
          border: 1px solid rgba(56, 189, 248, 0.2);
        }

        .hero-title {
          font-size: 26px;
          font-weight: 800;
          margin: 0 0 8px 0;
          letter-spacing: -0.5px;
          color: #ffffff;
        }

        .hero-subtitle {
          color: #94a3b8;
          font-size: 13.5px;
          margin: 0;
          max-width: 650px;
          line-height: 1.5;
        }

        .month-selector-box {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(12px);
          padding: 14px 18px;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .selector-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .period-select {
          background: #0f172a;
          border: 1px solid #334155;
          color: white;
          border-radius: 8px;
          padding: 7px 12px;
          font-size: 13.5px;
          font-weight: 600;
          outline: none;
          cursor: pointer;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
        }

        .pill-live {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid rgba(52, 211, 153, 0.3);
        }

        .pill-draft {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.3);
        }

        .btn-delete-header {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.45);
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-delete-header:hover {
          background: #dc2626;
          color: white;
          border-color: #dc2626;
          box-shadow: 0 0 12px rgba(220, 38, 38, 0.5);
        }

        /* Nav Tabs */
        .nav-tabs-wrapper {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 2px;
        }

        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border: none;
          background: transparent;
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
          border-radius: 8px 8px 0 0;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          color: #1e293b;
        }

        .tab-active {
          color: #0284c7;
          border-bottom: 3px solid #0284c7;
        }

        .tab-count-badge {
          background: #e2e8f0;
          color: #334155;
          padding: 2px 7px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
        }

        .tab-count-badge.green {
          background: #dcfce7;
          color: #15803d;
        }

        /* Search Bar Component in Tab 2 */
        .employee-search-bar-card {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 16px 24px;
        }

        .search-form-row {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-input-wrapper {
          flex: 1;
          min-width: 280px;
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-lead-icon {
          position: absolute;
          left: 14px;
          color: #64748b;
          pointer-events: none;
        }

        .employee-search-input {
          width: 100%;
          padding: 10px 38px 10px 42px;
          background: white;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 500;
          color: #0f172a;
          outline: none;
          transition: all 0.2s;
        }

        .employee-search-input:focus {
          border-color: #0284c7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
        }

        .search-clear-btn {
          position: absolute;
          right: 12px;
          background: #f1f5f9;
          border: none;
          color: #64748b;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .search-clear-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .btn-search-submit {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #0284c7;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-search-submit:hover {
          background: #0369a1;
        }

        .btn-search-reset {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #475569;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-search-reset:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .search-filter-status {
          margin-top: 10px;
          font-size: 12.5px;
          color: #64748b;
        }

        .filter-pill {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 6px;
          background: #e2e8f0;
          color: #334155;
        }

        .filter-pill.active {
          background: #e0f2fe;
          color: #0369a1;
          border: 1px solid #bae6fd;
        }

        /* Upload Section */
        .upload-section-card {
          background: white;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 24px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
          margin-bottom: 20px;
        }

        .upload-dropzone {
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          padding: 36px 20px;
          text-align: center;
          background: #f8fafc;
          cursor: pointer;
          transition: all 0.2s;
        }

        .upload-dropzone:hover {
          border-color: #0284c7;
          background: #f0f9ff;
        }

        .upload-icon-circle {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: #e0f2fe;
          color: #0284c7;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
        }

        .upload-title {
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 4px;
        }

        .upload-desc {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 16px;
        }

        .btn-browse-file {
          background: #0284c7;
          color: white;
          border: none;
          padding: 8px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(2, 132, 199, 0.25);
        }

        .quick-actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid #f1f5f9;
        }

        .quick-title {
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
        }

        .quick-btn-group {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .action-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 600;
          color: #334155;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-pill-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .sample-btn {
          background: #ecfdf5;
          border-color: #a7f3d0;
          color: #065f46;
        }

        .sample-btn:hover {
          background: #d1fae5;
        }

        .delete-pill-btn {
          background: #fef2f2;
          border-color: #fecaca;
          color: #dc2626;
        }

        .delete-pill-btn:hover {
          background: #fee2e2;
          color: #991b1b;
        }

        .delete-db-pill-btn {
          background: #450a0a;
          border-color: #991b1b;
          color: #fca5a5;
        }

        .delete-db-pill-btn:hover {
          background: #b91c1c;
          color: #ffffff;
        }

        /* Metrics Grid */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .metric-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
        }

        .highlight-metric {
          background: #f0fdf4;
          border-color: #86efac;
        }

        .metric-icon-box {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .metric-icon-box.blue { background: #dbeafe; color: #1d4ed8; }
        .metric-icon-box.purple { background: #f3e8ff; color: #7e22ce; }
        .metric-icon-box.amber { background: #fef3c7; color: #b45309; }
        .metric-icon-box.teal { background: #ccfbf1; color: #0f766e; }
        .metric-icon-box.red { background: #fee2e2; color: #b91c1c; }
        .metric-icon-box.green { background: #dcfce7; color: #15803d; }

        .metric-val {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
        }

        .metric-val.net-val {
          color: #15803d;
          font-size: 20px;
        }

        .metric-lbl {
          font-size: 11.5px;
          font-weight: 600;
          color: #64748b;
        }

        /* Grid Card */
        .grid-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
          overflow: hidden;
        }

        .grid-toolbar {
          padding: 16px 20px;
          background: #fafafa;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 7px 12px;
          width: 320px;
        }

        .search-input {
          border: none;
          outline: none;
          font-size: 13px;
          width: 100%;
        }

        .grid-action-btns {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .tool-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          border: none;
        }

        .add-btn { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
        .reset-btn { background: #fee2e2; color: #991b1b; }
        .delete-grid-btn {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
        .delete-grid-btn:hover {
          background: #dc2626;
          color: white;
          border-color: #dc2626;
        }
        .delete-db-btn {
          background: #450a0a;
          color: #fca5a5;
          border: 1px solid #991b1b;
        }
        .delete-db-btn:hover {
          background: #dc2626;
          color: white;
          border-color: #dc2626;
        }
        .save-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3);
        }

        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Spreadsheet Table */
        .spreadsheet-wrapper {
          overflow-x: auto;
          max-height: 560px;
        }

        .spreadsheet-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .spreadsheet-table th {
          position: sticky;
          top: 0;
          background: #0f172a;
          color: white;
          font-weight: 700;
          padding: 9px 8px;
          border: 1px solid #334155;
          text-align: left;
          z-index: 10;
          white-space: nowrap;
        }

        .spreadsheet-table td {
          border: 1px solid #e2e8f0;
          padding: 4px 6px;
          vertical-align: middle;
        }

        .data-row:nth-child(even) { background: #f8fafc; }
        .data-row:hover { background: #f1f5f9; }

        .cell-input {
          width: 100%;
          border: 1px solid transparent;
          background: transparent;
          font-size: 12px;
          padding: 4px 6px;
          border-radius: 4px;
          color: #0f172a;
          outline: none;
          transition: all 0.15s;
        }

        .cell-input:focus {
          border-color: #0284c7;
          background: white;
          box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.2);
        }

        .code-input { font-weight: 700; color: #0369a1; }
        .name-input { font-weight: 600; }
        .number-input { text-align: right; }

        .calc-val {
          font-weight: 600;
          color: #1e293b;
          white-space: nowrap;
          padding: 4px 8px;
        }

        .net-col { background: #064e3b !important; }
        .net-payable-cell { background: #f0fdf4; }

        .net-pill {
          display: inline-block;
          font-weight: 800;
          color: #047857;
          font-size: 12.5px;
        }

        .row-del-btn {
          border: none;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }

        .row-del-btn:hover { color: #dc2626; background: #fee2e2; }

        .grid-footer-bar {
          padding: 14px 20px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .save-action-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 8px 18px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13.5px;
          cursor: pointer;
        }

        /* Slips Tab */
        .empty-slips-card {
          background: white;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 60px 20px;
          text-align: center;
          color: #64748b;
        }

        .empty-icon { color: #cbd5e1; margin-bottom: 16px; }
        .btn-go-import {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #0284c7;
          color: white;
          border: none;
          padding: 9px 20px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 14px;
        }

        .slips-manager-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
          overflow: hidden;
        }

        .slips-toolbar {
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .toolbar-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px 0;
        }

        .toolbar-desc {
          font-size: 13px;
          color: #64748b;
          margin: 0;
        }

        .btn-bulk-print {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          color: white;
          border: none;
          padding: 10px 22px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(2, 132, 199, 0.3);
          transition: all 0.2s;
        }

        .btn-bulk-print:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(2, 132, 199, 0.4);
        }

        .btn-delete-month {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(239, 68, 68, 0.3);
          transition: all 0.2s;
        }

        .btn-delete-month:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(239, 68, 68, 0.45);
        }

        .slips-table-wrapper {
          overflow-x: auto;
        }

        .slips-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .slips-table th {
          background: #f8fafc;
          padding: 10px 14px;
          border-bottom: 2px solid #e2e8f0;
          font-weight: 700;
          color: #334155;
          text-align: left;
        }

        .slips-table td {
          padding: 10px 14px;
          border-bottom: 1px solid #f1f5f9;
        }

        .code-badge { font-weight: 700; color: #0284c7; }
        .worker-name-cell { font-weight: 700; color: #0f172a; }
        .net-col-text { color: #059669; font-size: 14px; }

        .action-button-row {
          display: flex;
          gap: 6px;
          justify-content: center;
          align-items: center;
        }

        .btn-view-slip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #f0f9ff;
          color: #0284c7;
          border: 1px solid #bae6fd;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-view-slip:hover {
          background: #0284c7;
          color: white;
        }

        .btn-print-single {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #f8fafc;
          color: #334155;
          border: 1px solid #cbd5e1;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-print-single:hover {
          background: #0f172a;
          color: white;
          border-color: #0f172a;
        }

        .btn-delete-single {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #fff1f2;
          color: #e11d48;
          border: 1px solid #fecdd3;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-delete-single:hover {
          background: #e11d48;
          color: white;
          border-color: #e11d48;
        }

        /* Modal Styles */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-card {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 1080px;
          max-height: 94vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        }

        .modal-topbar {
          padding: 14px 20px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #0f172a;
          color: white;
        }

        .modal-title { font-size: 15px; font-weight: 600; }
        .modal-actions { display: flex; gap: 10px; align-items: center; }

        .modal-print-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #0284c7;
          color: white;
          border: none;
          padding: 7px 16px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
        }

        .modal-print-btn:hover { background: #0369a1; }

        .modal-close-btn {
          border: none;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
        }

        .modal-slip-preview {
          padding: 20px;
          overflow-y: auto;
          background: #f8fafc;
        }

        /* Status Banner */
        .status-banner {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 10000;
          padding: 12px 18px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13.5px;
          font-weight: 600;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }

        .alert-banner-success { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
        .alert-banner-error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
        .alert-banner-info { background: #e0f2fe; color: #075985; border: 1px solid #7dd3fc; }

        .status-close {
          border: none;
          background: transparent;
          font-size: 18px;
          cursor: pointer;
          color: inherit;
        }
      `}</style>
    </div>
  );
}

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
  ExternalLink,
  Link2,
} from "lucide-react";

interface LabourRow {
  code: string;
  name: string;
  fatherName: string;
  designation?: string;
  department?: string;
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
  { value: 1, label: "January", short: "Jan" },
  { value: 2, label: "February", short: "Feb" },
  { value: 3, label: "March", short: "Mar" },
  { value: 4, label: "April", short: "Apr" },
  { value: 5, label: "May", short: "May" },
  { value: 6, label: "June", short: "Jun" },
  { value: 7, label: "July", short: "Jul" },
  { value: 8, label: "August", short: "Aug" },
  { value: 9, label: "September", short: "Sep" },
  { value: 10, label: "October", short: "Oct" },
  { value: 11, label: "November", short: "Nov" },
  { value: 12, label: "December", short: "Dec" },
];

const YEARS = [2024, 2025, 2026, 2027, 2028];

export default function MonthlyWageSheetPage() {
  const [selectedMonth, setSelectedMonth] = useState<number>(9);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [activeTab, setActiveTab] = useState<"attendance" | "slips" | "import">("attendance");
  const [viewMode, setViewMode] = useState<"wages" | "attendance" | "full">("wages");

  const [companyName, setCompanyName] = useState<string>("Company");
  const [companyAddress, setCompanyAddress] = useState<string>("");

  // Tab 1 & General Wage Rows State
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

  // Cloud Spreadsheet / Google Sheets State
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>("");
  const [showSheetViewer, setShowSheetViewer] = useState<boolean>(false);
  const [syncingSheet, setSyncingSheet] = useState<boolean>(false);

  // Months with saved runs history
  const [savedHistory, setSavedHistory] = useState<{ month: number; year: number }[]>([]);

  // Daily attendance matrix: { [workerCode]: { [dayNumber]: "P" | "A" | "HD" | "WO" } }
  const [attendanceGrid, setAttendanceGrid] = useState<Record<string, Record<number, "P" | "A" | "HD" | "WO">>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calendar calculations for selected month & year
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedMonth, selectedYear]);

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  const isSunday = (day: number) => {
    return new Date(selectedYear, selectedMonth - 1, day).getDay() === 0;
  };

  const getDayOfWeek = (day: number) => {
    const d = new Date(selectedYear, selectedMonth - 1, day);
    return d.toLocaleDateString("en-US", { weekday: "short" });
  };

  // Load User & Company Info on mount
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const res = await axiosInstance.get("/company/myCompany");
        if (res.data?.data) {
          const cName = res.data.data.name || "Company";
          setCompanyName(cName);
          setCompanyAddress(res.data.data.address || "");
          const cachedUrl = localStorage.getItem(`hrm_gsheet_url_${cName}`);
          if (cachedUrl) {
            if (cachedUrl.includes("celebrity-brewing-october-2026-demo") || cachedUrl.toLowerCase().includes("demo")) {
              localStorage.removeItem(`hrm_gsheet_url_${cName}`);
            } else {
              setGoogleSheetUrl(cachedUrl);
            }
          }
        }
      } catch (e) {
        try {
          const meRes = await axiosInstance.get("/me");
          if (meRes.data?.company) {
            const cName = meRes.data.company.name || "Company";
            setCompanyName(cName);
            setCompanyAddress(meRes.data.company.address || "");
            const cachedUrl = localStorage.getItem(`hrm_gsheet_url_${cName}`);
            if (cachedUrl) {
            if (cachedUrl.includes("celebrity-brewing-october-2026-demo") || cachedUrl.toLowerCase().includes("demo")) {
              localStorage.removeItem(`hrm_gsheet_url_${cName}`);
            } else {
              setGoogleSheetUrl(cachedUrl);
            }
          }
          }
        } catch {
          // ignore
        }
      }
    };
    fetchCompanyInfo();
  }, []);

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

  // Load Saved Slips for Tab 2
  const loadSavedSlips = async (m: number, y: number) => {
    try {
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
        } else {
          setSavedSlips([]);
          setSavedRunFound(false);
        }
      }
    } catch (err: any) {
      console.error("loadSavedSlips error:", err);
    }
  };

  // Load Company Workers & Attendance for Tab 1
  const loadAttendanceOrWorkers = async (m: number, y: number) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/labour-wage/workers?month=${m}&year=${y}`);
      if (res.data?.data) {
        const d = res.data.data;
        if (d.monthsHistory) {
          setSavedHistory(d.monthsHistory);
        }
        setSavedRunFound(d.isSaved);

        if (d.rows && d.rows.length > 0) {
          setRows(d.rows);
          setSummary(d.summary);

          // Populate daily attendance matrix
          const initialGrid: Record<string, Record<number, "P" | "A" | "HD" | "WO">> = {};
          const daysCount = new Date(y, m, 0).getDate();

          for (const row of d.rows) {
            const workerMap: Record<number, "P" | "A" | "HD" | "WO"> = {};
            const targetPresent = Math.round(row.presentDays ?? 26);
            let pFilled = 0;

            for (let day = 1; day <= daysCount; day++) {
              const sunday = new Date(y, m - 1, day).getDay() === 0;
              if (sunday) {
                workerMap[day] = "WO";
              } else if (pFilled < targetPresent) {
                workerMap[day] = "P";
                pFilled++;
              } else {
                workerMap[day] = "A";
              }
            }
            initialGrid[row.code] = workerMap;
          }
          setAttendanceGrid(initialGrid);
        }
      }
      await loadSavedSlips(m, y);
    } catch (err: any) {
      console.error("loadAttendanceOrWorkers error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendanceOrWorkers(selectedMonth, selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

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

  // Toggle single day status in Attendance Matrix
  const toggleAttendanceCell = (workerCode: string, day: number) => {
    const workerDays = attendanceGrid[workerCode] || {};
    const current = workerDays[day] || (isSunday(day) ? "WO" : "P");

    // Cycle order: P -> A -> HD -> WO -> P
    const nextMap: Record<string, "P" | "A" | "HD" | "WO"> = {
      P: "A",
      A: "HD",
      HD: "WO",
      WO: "P",
    };
    const nextStatus = nextMap[current] || "P";

    const updatedWorkerDays = { ...workerDays, [day]: nextStatus };
    setAttendanceGrid((prev) => ({
      ...prev,
      [workerCode]: updatedWorkerDays,
    }));

    // Recalculate this worker's present days: P = 1, WO = 1, HD = 0.5, A = 0
    let newPresent = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const st = updatedWorkerDays[d] || (isSunday(d) ? "WO" : "P");
      if (st === "P" || st === "WO") newPresent += 1;
      else if (st === "HD") newPresent += 0.5;
    }

    const rowIndex = rows.findIndex((r) => r.code === workerCode);
    if (rowIndex !== -1) {
      handleCellChange(rowIndex, "presentDays", newPresent);
    }
  };

  // Bulk Attendance Actions
  const handleSetAll26Days = () => {
    const newGrid: Record<string, Record<number, "P" | "A" | "HD" | "WO">> = {};
    for (const r of rows) {
      const workerMap: Record<number, "P" | "A" | "HD" | "WO"> = {};
      let pCount = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        if (isSunday(d)) {
          workerMap[d] = "WO";
        } else if (pCount < 26) {
          workerMap[d] = "P";
          pCount++;
        } else {
          workerMap[d] = "A";
        }
      }
      newGrid[r.code] = workerMap;
    }
    setAttendanceGrid(newGrid);

    const updatedRows = rows.map((r) => recalculateRow({ ...r, presentDays: 26 }));
    setRows(updatedRows);
    recalculateSummary(updatedRows);
    setStatusMessage({ type: "success", text: "⚡ Set standard 26 present days for all workers!" });
  };

  const handleMarkAllTodayP = () => {
    const today = new Date().getDate();
    const targetDay = today <= daysInMonth ? today : 1;
    const newGrid = { ...attendanceGrid };

    for (const r of rows) {
      const workerMap = { ...(newGrid[r.code] || {}) };
      workerMap[targetDay] = "P";
      newGrid[r.code] = workerMap;
    }
    setAttendanceGrid(newGrid);

    // Recalculate all rows
    const updatedRows = rows.map((r) => {
      const workerDays = newGrid[r.code] || {};
      let pCount = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const st = workerDays[d] || (isSunday(d) ? "WO" : "P");
        if (st === "P" || st === "WO") pCount += 1;
        else if (st === "HD") pCount += 0.5;
      }
      return recalculateRow({ ...r, presentDays: pCount });
    });

    setRows(updatedRows);
    recalculateSummary(updatedRows);
    setStatusMessage({ type: "success", text: `🟢 Marked all workers Present for Day ${targetDay}!` });
  };

  const handleMarkSundaysOff = () => {
    const newGrid = { ...attendanceGrid };
    for (const r of rows) {
      const workerMap = { ...(newGrid[r.code] || {}) };
      for (let d = 1; d <= daysInMonth; d++) {
        if (isSunday(d)) workerMap[d] = "WO";
      }
      newGrid[r.code] = workerMap;
    }
    setAttendanceGrid(newGrid);
    setStatusMessage({ type: "info", text: "📅 Sundays set to Weekly Off (WO)." });
  };

  const handleClearAllAttendance = () => {
    if (!window.confirm("Reset all days in the attendance sheet to Absent for this month?")) return;
    const newGrid: Record<string, Record<number, "P" | "A" | "HD" | "WO">> = {};
    for (const r of rows) {
      const workerMap: Record<number, "P" | "A" | "HD" | "WO"> = {};
      for (let d = 1; d <= daysInMonth; d++) {
        workerMap[d] = "A";
      }
      newGrid[r.code] = workerMap;
    }
    setAttendanceGrid(newGrid);

    const updatedRows = rows.map((r) => recalculateRow({ ...r, presentDays: 0, otDays: 0 }));
    setRows(updatedRows);
    recalculateSummary(updatedRows);
    setStatusMessage({ type: "info", text: "Attendance cleared for all workers." });
  };

  // Check if current URL is a genuine Google Sheet share link with valid ID
  const isRealGSheet = Boolean(
    googleSheetUrl &&
    googleSheetUrl.includes("docs.google.com/spreadsheets/d/") &&
    !googleSheetUrl.toLowerCase().includes("demo") &&
    !googleSheetUrl.toLowerCase().includes("celebrity-brewing-october") &&
    (googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1]?.length ?? 0) >= 20
  );

  // Google Sheet Link persistence & Live Sync
  const handleSaveGoogleSheetUrl = () => {
    if (!googleSheetUrl.trim()) return;
    localStorage.setItem(`hrm_gsheet_url_${companyName}`, googleSheetUrl.trim());
    setStatusMessage({ type: "success", text: "🔗 Google Sheet link saved successfully!" });
  };

  const handleSyncGoogleSheet = async (overrideUrl?: string) => {
    const rawTarget = overrideUrl !== undefined ? overrideUrl : googleSheetUrl;
    const targetUrl = (rawTarget || "").trim();
    const isDemo =
      !targetUrl ||
      targetUrl === "demo" ||
      targetUrl.toLowerCase().includes("demo") ||
      targetUrl.toLowerCase().includes("celebrity");

    if (!targetUrl && !isDemo) {
      alert("Please enter a valid Google Sheets share link or click 'Load Sample Data'.");
      return;
    }

    try {
      setSyncingSheet(true);
      setStatusMessage({
        type: "info",
        text: isDemo
          ? "Loading verified sample attendance dataset for 154 workers..."
          : "Connecting to Google Sheet & extracting attendance data...",
      });

      const res = await axiosInstance.post("/labour-wage/import-google-sheet", {
        url: isDemo ? "demo" : targetUrl,
        month: selectedMonth,
        year: selectedYear,
      });

      if (res.data?.success && res.data.data?.rows) {
        const d = res.data.data;
        setRows(d.rows);
        setSummary(d.summary);
        if (d.attendanceGrid) {
          setAttendanceGrid(d.attendanceGrid);
        }
        if (targetUrl && !isDemo) {
          setGoogleSheetUrl(targetUrl);
          localStorage.setItem(`hrm_gsheet_url_${companyName}`, targetUrl);
        } else if (isDemo) {
          // Clear any fake demo URL so user is never misled
          if (googleSheetUrl.includes("celebrity-brewing-october-2026-demo") || googleSheetUrl.includes("demo")) {
            setGoogleSheetUrl("");
            localStorage.removeItem(`hrm_gsheet_url_${companyName}`);
          }
        }
        setStatusMessage({
          type: "success",
          text: isDemo
            ? `🎉 Successfully loaded verified sample data for ${d.rows.length} workers! Live calculations ready below.`
            : `🎉 Successfully synced ${d.rows.length} worker records from Google Sheet! Live preview ready.`,
        });
      } else {
        throw new Error(res.data?.message || "Failed to sync Google Sheet.");
      }
    } catch (err: any) {
      console.error("handleSyncGoogleSheet error:", err);
      setStatusMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Error syncing Google Sheet.",
      });
    } finally {
      setSyncingSheet(false);
    }
  };

  const handleLoadDemoGoogleSheet = () => {
    handleSyncGoogleSheet("demo");
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("docs.google.com/spreadsheets")) {
      return url.replace(/\/edit.*$/, "/pubhtml?widget=true&headers=false");
    }
    return url;
  };

  // Export Form XVII West Bengal Wage Register as CSV
  const handleExportFormXVIICSV = () => {
    if (rows.length === 0) {
      alert("No wage data to export.");
      return;
    }

    const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || "Month";
    const headers = [
      "Sl. No.",
      "Worker Code",
      "Name of Workman",
      "Father/Husband Name",
      "Designation",
      "ESIC / IP No.",
      "Date of Joining",
      "No. of Days Worked",
      "OT Days",
      "Daily Rate",
      "Basic Wages",
      "OT Amount",
      "Gross Total",
      "Provident Fund (12%)",
      "Employees Share (E.S.I. 0.75%)",
      "W.B. Professional Tax",
      "Total Deductions",
      "Net Amount Paid",
    ];

    const csvRows = [headers.join(",")];

    rows.forEach((r, idx) => {
      const clean = (val: any) => `"${String(val ?? "").replace(/"/g, '""')}"`;
      csvRows.push(
        [
          idx + 1,
          clean(r.code),
          clean(r.name),
          clean(r.fatherName),
          clean(r.designation || "Workman"),
          clean(r.esicNo),
          clean(r.doj),
          r.presentDays,
          r.otDays,
          r.rate,
          r.daysAmount,
          r.otAmount,
          r.totalGross,
          r.pf,
          r.esi,
          r.ptax,
          r.pf + r.esi + r.ptax,
          r.netPayable,
        ].join(",")
      );
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileName = `${companyName.replace(/\s+/g, "_")}_Form_XVII_${monthLabel}_${selectedYear}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      alert("No rows to save. Please upload or mark attendance first.");
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
        await loadAttendanceOrWorkers(selectedMonth, selectedYear);
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
    const prefix = companyName.toLowerCase().includes("vodabox")
      ? "VD"
      : companyName.toLowerCase().includes("celebrity")
      ? "CBPL"
      : "JB";
    const newCode = `${prefix}${String(nextNum).padStart(4, "0")}`;
    const defaultRate = companyName.toLowerCase().includes("celebrity") ? 491 : 376;
    const newRow: LabourRow = recalculateRow({
      code: newCode,
      name: `NEW WORKER ${nextNum}`,
      fatherName: "C/O -",
      designation: "Workman",
      esicNo: "",
      doj: `01.${String(selectedMonth).padStart(2, "0")}.${selectedYear}`,
      presentDays: 26,
      otDays: 0,
      rate: defaultRate,
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

  // Unified Clear / Delete Sheet Handler (Both for Draft & DB)
  const handleClearOrDeleteSheet = async () => {
    if (savedRunFound) {
      const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || "Month";
      const confirmMsg = `⚠️ ARE YOU SURE?\n\nDo you want to permanently delete all saved wage records for ${monthLabel} ${selectedYear} for ${companyName} from the database?\n\nThis will completely reset this month's payroll so you can upload fresh or re-test with dummy sheets.`;
      if (!window.confirm(confirmMsg)) return;
      await handleDeleteMonthData();
    } else {
      if (rows.length === 0) {
        setStatusMessage({ type: "info", text: "Sheet preview is already clean and empty." });
        return;
      }
      if (window.confirm("Clear all currently previewed/uploaded workers and reset the table to empty?")) {
        setRows([]);
        setSummary(null);
        setAttendanceGrid({});
        if (fileInputRef.current) fileInputRef.current.value = "";
        setStatusMessage({ type: "info", text: "Sheet cleared successfully. Ready for fresh upload." });
      }
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
      (r.fatherName && r.fatherName.toLowerCase().includes(q)) ||
      (r.esicNo && r.esicNo.toLowerCase().includes(q))
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
                <th colspan="2" class="col-group-hdr">EARNING DETAILS</th>
                <th colspan="2" class="col-group-hdr">DEDUCTION DETAILS</th>
                <th class="col-group-hdr net-hdr">NET PAYABLE AMOUNT</th>
              </tr>
              <tr class="sub-hdr">
                <th>Component</th>
                <th>Amount (Rs.)</th>
                <th>Component</th>
                <th>Amount (Rs.)</th>
                <th class="net-hdr">Payable</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Basic</td>
                <td class="text-end">${fmt(slip.basicAmount)}</td>
                <td>Provident Fund</td>
                <td class="text-end">${fmt(slip.providentFund)}</td>
                <td rowspan="9" class="net-payable-box">
                  <div class="net-amount-display">Rs. ${fmt(slip.netPayable)}</div>
                </td>
              </tr>
              <tr>
                <td>H.R.A</td>
                <td class="text-end">${fmt(slip.hrAllowance)}</td>
                <td>Voluntary Provident Fund</td>
                <td class="text-end">${fmt(slip.voluntaryProvidentFund)}</td>
              </tr>
              <tr>
                <td>Special Allowance</td>
                <td class="text-end">${fmt(slip.specialAllowance)}</td>
                <td>E.S.I.</td>
                <td class="text-end">${fmt(slip.esi)}</td>
              </tr>
              <tr>
                <td>Personal Allowance</td>
                <td class="text-end">${fmt(slip.personalAllowance)}</td>
                <td>Professional Tax</td>
                <td class="text-end">${fmt(slip.professionalTax)}</td>
              </tr>
              <tr>
                <td>Conv Allowance</td>
                <td class="text-end">${fmt(slip.convAllowance)}</td>
                <td>Salary Advance</td>
                <td class="text-end">${fmt(slip.salaryAdvance)}</td>
              </tr>
              <tr>
                <td>Other Earning</td>
                <td class="text-end">${fmt(slip.otherEarning)}</td>
                <td>Alcohol Deduction</td>
                <td class="text-end">${fmt(slip.alcoholDeduction)}</td>
              </tr>
              <tr>
                <td>Accomodn Allowance</td>
                <td class="text-end">${fmt(slip.accomodnAllowance)}</td>
                <td>Advance Repayment</td>
                <td class="text-end">${fmt(slip.advanceRepayment)}</td>
              </tr>
              <tr>
                <td>OT / OD Amt.</td>
                <td class="text-end">${fmt(slip.otAmount)}</td>
                <td>—</td>
                <td class="text-end">—</td>
              </tr>
              <tr>
                <td>Arrear</td>
                <td class="text-end">${fmt(slip.arrear)}</td>
                <td>—</td>
                <td class="text-end">—</td>
              </tr>
              <tr class="total-row fw-bold">
                <td>Total Earning</td>
                <td class="text-end">${fmt(slip.totalEarnings)}</td>
                <td>Total Deduction</td>
                <td class="text-end">${fmt(slip.totalDeductions)}</td>
                <td class="text-center font-bold">Net: Rs. ${fmt(slip.netPayable)}</td>
              </tr>
            </tbody>
          </table>

          <table class="slip-table leave-bank-table">
            <tbody>
              <tr>
                <td colspan="7" class="leave-title">LEAVE DETAILS</td>
                <td rowspan="2" class="bank-cell"><strong>Bank:</strong> ${slip.bankName || "—"}</td>
              </tr>
              <tr class="leave-col-hdr">
                <td>PL Opening</td>
                <td>PL Availed</td>
                <td>PL Balance</td>
                <td>Days Worked</td>
                <td>Holidays</td>
                <td>WO Days</td>
                <td>Payable Days</td>
              </tr>
              <tr class="text-center">
                <td>0.00</td>
                <td>0.00</td>
                <td>0.00</td>
                <td>${Number(slip.presentDays || 0).toFixed(2)}</td>
                <td>0.00</td>
                <td>0.00</td>
                <td>${Number(slip.presentDays || 0).toFixed(2)}</td>
                <td class="bank-cell"><strong>A/c:</strong> ${slip.accountNo || "—"}</td>
              </tr>
              <tr>
                <td colspan="8" class="words-box">
                  <strong>Amount in Words:</strong> ${slip.amountInWords || "Rupees Only"}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="disclaimer">
            This is a computer-generated salary slip and does not require an authorized signature.
          </div>
        </div>
      </div>
    `;
  };

  const printSlipsCleanly = (slipsToPrint: SalarySlipData[], title: string) => {
    if (slipsToPrint.length === 0) return;

    const printWin = window.open("", "_blank", "width=900,height=900");
    if (!printWin) {
      alert("Please allow popups in your browser to print salary slips.");
      return;
    }

    const slipsHtml = slipsToPrint.map((s) => generateSlipHtml(s)).join("");

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            color: #000;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
          }
          .salary-slip-page {
            page-break-after: always;
            page-break-inside: avoid;
            width: 100%;
            height: 100%;
            max-width: 198mm;
            margin: 0 auto 12mm auto;
            background: #fff;
          }
          .salary-slip-page:last-child {
            page-break-after: auto;
            margin-bottom: 0;
          }
          .slip-card {
            border: 2px solid #000;
            padding: 10px 14px;
            background: #fff;
          }
          .slip-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 6px;
            margin-bottom: 6px;
          }
          .company-title {
            font-size: 18px;
            font-weight: 800;
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
              Contractor Labour Wages &amp; Slips Portal
            </div>
            <h1 className="hero-title">{companyName}</h1>
            <p className="hero-subtitle">
              Interactive monthly wage sheet management with daily tick-mark attendance matrix, cloud
              spreadsheet synchronization, Form XVII export, and 1-click clean bulk salary slip printing.
            </p>
          </div>

          <div className="hero-controls">
            <div className="month-selector-box">
              <div className="selector-group">
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    const m = Number(e.target.value);
                    setSelectedMonth(m);
                    loadAttendanceOrWorkers(m, selectedYear);
                  }}
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
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    setSelectedYear(y);
                    loadAttendanceOrWorkers(selectedMonth, y);
                  }}
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
                    <CheckCircle2 size={13} /> Saved in Database ({savedSlips.length || rows.length} Workers)
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
                  <SlidersHorizontal size={13} /> Draft Mode — Ready to Mark
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-tabs-wrapper">
          <button
            className={`tab-btn ${activeTab === "attendance" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("attendance")}
          >
            <Calendar size={16} />
            <span>1. Live Attendance &amp; Wage Sheet</span>
            {rows.length > 0 && <span className="tab-count-badge cyan">{rows.length} Workers</span>}
          </button>

          <button
            className={`tab-btn ${activeTab === "slips" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("slips")}
          >
            <Printer size={16} />
            <span>2. Processed Slips &amp; Bulk Print</span>
            {savedSlips.length > 0 && <span className="tab-count-badge green">{savedSlips.length} Slips</span>}
          </button>

          <button
            className={`tab-btn ${activeTab === "import" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("import")}
          >
            <UploadCloud size={16} />
            <span>3. Upload Excel / CSV Sheet</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: INTERACTIVE CLOUD ATTENDANCE & LIVE WAGE SHEET */}
        {/* ============================================================== */}
        {activeTab === "attendance" && (
          <div className="tab-pane-content">
            {/* Horizontal Month Navigator Bar */}
            <div className="month-navigator-card">
              <div className="month-nav-label">
                <Calendar size={15} /> Select Month Tab ({selectedYear}):
              </div>
              <div className="month-tabs-strip">
                {MONTHS.map((m) => {
                  const isSelected = selectedMonth === m.value;
                  const isSaved = savedHistory.some(
                    (h) => h.month === m.value && h.year === selectedYear
                  );
                  return (
                    <button
                      key={m.value}
                      type="button"
                      className={`month-tab-pill ${isSelected ? "active" : ""}`}
                      onClick={() => {
                        setSelectedMonth(m.value);
                        loadAttendanceOrWorkers(m.value, selectedYear);
                      }}
                    >
                      <span className="month-pill-name">
                        {m.short} &apos;{String(selectedYear).slice(2)}
                      </span>
                      {isSaved ? (
                        <span className="month-pill-status saved" title="Saved & Finalized in DB">
                          ● Saved
                        </span>
                      ) : (
                        <span className="month-pill-status draft" title="Draft / In Progress">
                          ○ Draft
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Google Sheets / Cloud Spreadsheet Sync Hub */}
            <div className="gsheet-hub-card">
              <div className="gsheet-hub-header">
                <div className="gsheet-hub-left">
                  <div className="gsheet-icon-circle">
                    <FileSpreadsheet size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <div className="gsheet-hub-title">Google Sheets / Cloud Spreadsheet Sync Hub</div>
                    <div className="gsheet-hub-subtitle">
                      Connect your external Google Sheets URL or view it directly in HRM with all monthly tabs.
                    </div>
                  </div>
                </div>
                <div className="gsheet-hub-actions">
                  <button
                    type="button"
                    className="btn-gsheet-action sync-btn"
                    onClick={() => handleSyncGoogleSheet()}
                    disabled={syncingSheet}
                    title="Pull latest attendance and overtime from this Google Sheet"
                  >
                    {syncingSheet ? <RefreshCw size={14} className="spin" /> : <RefreshCw size={14} />}
                    <span>{syncingSheet ? "Syncing..." : "Pull & Sync Attendance"}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-gsheet-action demo-btn"
                    onClick={handleLoadDemoGoogleSheet}
                    disabled={syncingSheet}
                    title="Load verified sample attendance dataset for 154 workers"
                  >
                    <Sparkles size={14} /> <span>Load Sample Data (154 Workers)</span>
                  </button>

                  {isRealGSheet && (
                    <button
                      type="button"
                      className="btn-gsheet-action view-btn"
                      onClick={() => setShowSheetViewer(!showSheetViewer)}
                    >
                      <Eye size={14} /> {showSheetViewer ? "Hide Embedded Sheet" : "Preview Sheet Iframe"}
                    </button>
                  )}

                  {isRealGSheet ? (
                    <a
                      href={googleSheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-gsheet-action open-btn"
                    >
                      <ExternalLink size={14} /> Open in Google Sheets
                    </a>
                  ) : (
                    <a
                      href="https://sheets.new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-gsheet-action open-btn"
                      title="Open Google Sheets in new tab to create a new spreadsheet"
                    >
                      <ExternalLink size={14} /> Open sheets.new
                    </a>
                  )}
                </div>
              </div>
              <div className="gsheet-input-row">
                <div className="gsheet-input-box">
                  <Link2 size={16} className="text-slate-400" />
                  <input
                    type="url"
                    className="gsheet-url-input"
                    placeholder="Paste Google Sheets Share Link (e.g. https://docs.google.com/spreadsheets/d/1BxiMVs.../edit)"
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn-gsheet-save"
                  onClick={handleSaveGoogleSheetUrl}
                >
                  Save Link
                </button>
              </div>

              {showSheetViewer && isRealGSheet && (
                <div className="gsheet-iframe-wrapper">
                  <iframe
                    src={getEmbedUrl(googleSheetUrl)}
                    className="gsheet-iframe"
                    title="Google Sheet Cloud Viewer"
                  />
                </div>
              )}

              {!isRealGSheet && (
                <div className="gsheet-guide-banner">
                  <div className="gsheet-guide-title">
                    <Sparkles size={15} className="text-amber-500" />
                    <span>How to connect your live Google Sheet in 3 easy steps:</span>
                  </div>
                  <div className="gsheet-guide-steps">
                    <div className="guide-step">
                      <span className="step-num">1</span>
                      <span>Open <a href="https://sheets.new" target="_blank" rel="noreferrer" className="guide-link">sheets.new</a> or upload your Excel template.</span>
                    </div>
                    <div className="guide-step">
                      <span className="step-num">2</span>
                      <span>Click <strong>Share</strong> (top-right) &rarr; change General access to <strong>&quot;Anyone with the link can view&quot;</strong> &rarr; click <strong>Copy link</strong>.</span>
                    </div>
                    <div className="guide-step">
                      <span className="step-num">3</span>
                      <span>Paste the link in the box above &amp; click <strong>&quot;Pull &amp; Sync Attendance&quot;</strong>! All 154 workers &amp; Form XVII wages will sync in real time.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* KPI Summary Cards */}
            {summary && (
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
                    <Coins size={20} />
                  </div>
                  <div className="metric-info">
                    <div className="metric-val">₹{summary.totalNetPayable.toLocaleString("en-IN")}</div>
                    <div className="metric-lbl">Net Amount Payable</div>
                  </div>
                </div>
              </div>
            )}

            {/* Daily Attendance Matrix Controls & Action Bar */}
            <div className="attendance-toolbar-card">
              <div className="attendance-tools-left">
                <button
                  type="button"
                  className="btn-tool-action preset"
                  onClick={handleSetAll26Days}
                  title="Set standard 26 present days (Mon-Sat P, Sun WO)"
                >
                  <Sparkles size={14} /> Set All 26 Days P
                </button>
                <button
                  type="button"
                  className="btn-tool-action green"
                  onClick={handleMarkAllTodayP}
                  title="Mark all workers Present for today"
                >
                  <CheckCircle2 size={14} /> Mark All Today P
                </button>
                <button
                  type="button"
                  className="btn-tool-action slate"
                  onClick={handleMarkSundaysOff}
                  title="Mark all Sundays as Weekly Off (WO)"
                >
                  <Calendar size={14} /> Mark Sundays Off (WO)
                </button>
                <button
                  type="button"
                  className="btn-tool-action delete-reset-btn"
                  onClick={handleClearOrDeleteSheet}
                  title={savedRunFound ? `Permanently delete saved ${monthLabel} ${selectedYear} records from database` : "Clear preview table"}
                >
                  <Trash2 size={14} /> {savedRunFound ? `Delete ${monthLabel} Data (DB)` : "Clear / Reset Sheet"}
                </button>
              </div>

              <div className="attendance-tools-right">
                <div className="search-box-attendance">
                  <Search size={14} className="search-icon-muted" />
                  <input
                    type="text"
                    placeholder="Search code or name..."
                    value={importSearch}
                    onChange={(e) => setImportSearch(e.target.value)}
                    className="attendance-search-input"
                  />
                </div>
                <button
                  type="button"
                  className="btn-export-csv"
                  onClick={handleExportFormXVIICSV}
                  title="Export Form XVII Contract Labour Register in CSV/Excel"
                >
                  <Download size={14} /> Export Form XVII (CSV)
                </button>
                <button
                  type="button"
                  className="btn-save-attendance-wages"
                  onClick={handleSaveToDatabase}
                  disabled={saving || loading || rows.length === 0}
                >
                  {saving ? (
                    <RefreshCw size={16} className="spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  Save &amp; Finalize Wages
                </button>
              </div>
            </div>

            {/* Sub-View Switcher Bar */}
            <div className="view-mode-bar">
              <div className="view-mode-buttons">
                <button
                  type="button"
                  className={`view-mode-btn ${viewMode === "wages" ? "active" : ""}`}
                  onClick={() => setViewMode("wages")}
                  title="Focus on Wages, Overtime, Deductions and Net Payout (Fits cleanly without horizontal scroll)"
                >
                  <Coins size={15} />
                  <span>💰 Wages &amp; Salary Register</span>
                  <span className="view-mode-tag">Fits on Screen</span>
                </button>
                <button
                  type="button"
                  className={`view-mode-btn ${viewMode === "attendance" ? "active" : ""}`}
                  onClick={() => setViewMode("attendance")}
                  title="Focus on Day 1 to 31 Attendance Ticks"
                >
                  <Calendar size={15} />
                  <span>📅 Daily Attendance Matrix (1–31)</span>
                </button>
                <button
                  type="button"
                  className={`view-mode-btn ${viewMode === "full" ? "active" : ""}`}
                  onClick={() => setViewMode("full")}
                  title="View all Attendance and Wage columns side-by-side"
                >
                  <SlidersHorizontal size={15} />
                  <span>📑 Full Combined Register</span>
                </button>
              </div>

              {viewMode === "attendance" && (
                <div className="matrix-legend-row">
                  <span className="legend-chip badge-p">P = Present (1.0)</span>
                  <span className="legend-chip badge-wo">WO = Off (1.0)</span>
                  <span className="legend-chip badge-hd">HD = Half (0.5)</span>
                  <span className="legend-chip badge-a">A = Absent (0.0)</span>
                  <span className="legend-chip badge-nh">NH/FH = Holiday</span>
                </div>
              )}
            </div>

            {/* Interactive Attendance & Wage Matrix Table */}
            <div className="attendance-matrix-wrapper">
              {rows.length === 0 ? (
                <div className="empty-workers-card">
                  <Users size={44} className="text-slate-400" />
                  <h4>No Workers Found for {companyName}</h4>
                  <p>Upload a worker attendance sheet in Tab 3 or click below to load the verified October 2026 sample data.</p>
                  <div className="empty-btn-group">
                    <button className="btn-add-worker-empty" onClick={handleAddRow}>
                      <Plus size={16} /> Add First Worker
                    </button>
                    <button
                      className="btn-demo-load-empty"
                      onClick={handleLoadDemoGoogleSheet}
                      disabled={syncingSheet}
                    >
                      <Sparkles size={16} /> ⚡ 1-Click Load October 2026 Sample (154 Workers)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="matrix-table-scroll">
                  {/* VIEW 1: CLEAN WAGES & PAYOUT REGISTER (FITS ON SCREEN) */}
                  {viewMode === "wages" && (
                    <table className="attendance-matrix-table wages-register-table">
                      <thead>
                        <tr>
                          <th className="sticky-col col-sl">SL</th>
                          <th className="sticky-col col-code">EMP CODE</th>
                          <th className="sticky-col col-name">WORKMAN NAME</th>
                          <th className="col-desig">DESIGNATION</th>
                          <th className="col-rate text-right">RATE (₹)</th>
                          <th className="col-pdays text-center">P DAYS</th>
                          <th className="col-ot text-center">OT DAYS</th>
                          <th className="col-daysamt text-right">BASIC WAGES (₹)</th>
                          <th className="col-otamt text-right">OT WAGES (₹)</th>
                          <th className="col-gross text-right">GROSS (₹)</th>
                          <th className="col-pf text-right">PF 12% (₹)</th>
                          <th className="col-esi text-right">ESI 0.75% (₹)</th>
                          <th className="col-ptax text-right">P-TAX (₹)</th>
                          <th className="col-net text-right sticky-right">NET PAYABLE (₹)</th>
                          <th className="col-actions text-center sticky-right-action">ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredImportRows.map((r, idx) => (
                          <tr key={r.code || idx}>
                            <td className="sticky-col col-sl">{idx + 1}</td>
                            <td className="sticky-col col-code font-mono font-bold text-slate-800">{r.code}</td>
                            <td className="sticky-col col-name">
                              <div className="w-name">{r.name}</div>
                              {r.fatherName && <div className="w-father">C/O {r.fatherName}</div>}
                            </td>
                            <td className="col-desig">{r.designation || "Workman"}</td>
                            <td className="col-rate text-right">
                              <input
                                type="number"
                                className="input-num-cell rate"
                                value={r.rate}
                                onChange={(e) => handleCellChange(idx, "rate", Number(e.target.value))}
                              />
                            </td>
                            <td className="col-pdays text-center font-bold text-blue-700 bg-blue-50/50">
                              {r.presentDays}
                            </td>
                            <td className="col-ot text-center">
                              <input
                                type="number"
                                step="0.5"
                                className="input-num-cell ot"
                                value={r.otDays}
                                onChange={(e) => handleCellChange(idx, "otDays", Number(e.target.value))}
                              />
                            </td>
                            <td className="col-daysamt text-right font-mono">₹{r.daysAmount.toLocaleString("en-IN")}</td>
                            <td className="col-otamt text-right font-mono">₹{r.otAmount.toLocaleString("en-IN")}</td>
                            <td className="col-gross text-right font-mono font-bold text-slate-900 bg-slate-50/60">
                              ₹{r.totalGross.toLocaleString("en-IN")}
                            </td>
                            <td className="col-pf text-right font-mono text-rose-600">₹{r.pf.toLocaleString("en-IN")}</td>
                            <td className="col-esi text-right font-mono text-amber-600">₹{r.esi.toLocaleString("en-IN")}</td>
                            <td className="col-ptax text-right font-mono text-slate-700">₹{r.ptax}</td>
                            <td className="col-net text-right sticky-right font-mono font-extrabold text-emerald-700 bg-emerald-50/80">
                              ₹{r.netPayable.toLocaleString("en-IN")}
                            </td>
                            <td className="col-actions text-center sticky-right-action">
                              <button
                                type="button"
                                className="btn-row-action slip-btn"
                                onClick={() => setSelectedSlipForModal(r as any)}
                                title={`View Salary Slip for ${r.name}`}
                              >
                                <Eye size={13} /> Slip
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* VIEW 2: DAILY ATTENDANCE MATRIX (DAYS 1 TO 31 TICKS) */}
                  {viewMode === "attendance" && (
                    <table className="attendance-matrix-table daily-matrix-table">
                      <thead>
                        <tr>
                          <th className="sticky-col col-sl">SL</th>
                          <th className="sticky-col col-code">CODE</th>
                          <th className="sticky-col col-name">WORKER NAME</th>
                          <th className="col-desig">DESIGNATION</th>

                          {/* Calendar Days 1 to 31 */}
                          {daysArray.map((d) => {
                            const sun = isSunday(d);
                            const dow = getDayOfWeek(d);
                            return (
                              <th key={d} className={`col-day ${sun ? "sunday" : ""}`}>
                                <div className="day-number">{d}</div>
                                <div className="day-dow">{dow}</div>
                              </th>
                            );
                          })}

                          <th className="col-total col-pdays sticky-right-att font-bold text-center">P DAYS</th>
                          <th className="col-total col-ot text-center">OT DAYS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredImportRows.map((r, idx) => {
                          const workerDays = attendanceGrid[r.code] || {};
                          return (
                            <tr key={r.code || idx}>
                              <td className="sticky-col col-sl">{idx + 1}</td>
                              <td className="sticky-col col-code font-mono font-bold text-slate-800">{r.code}</td>
                              <td className="sticky-col col-name">
                                <div className="w-name">{r.name}</div>
                                {r.fatherName && <div className="w-father">C/O {r.fatherName}</div>}
                              </td>
                              <td className="col-desig">{r.designation || "Workman"}</td>

                              {/* Days 1 to 31 interactive buttons */}
                              {daysArray.map((d) => {
                                const status = workerDays[d] || (isSunday(d) ? "WO" : "P");
                                return (
                                  <td
                                    key={d}
                                    className={`cell-day ${isSunday(d) ? "sunday" : ""}`}
                                    onClick={() => toggleAttendanceCell(r.code, d)}
                                    title={`Day ${d} (${getDayOfWeek(d)}): Click to toggle status (${status})`}
                                  >
                                    <span className={`status-badge-cell badge-${status.toLowerCase()}`}>
                                      {status}
                                    </span>
                                  </td>
                                );
                              })}

                              <td className="col-total col-pdays font-bold text-center text-blue-700 bg-blue-50/70 sticky-right-att">
                                {r.presentDays}
                              </td>
                              <td className="col-total col-ot text-center">
                                <input
                                  type="number"
                                  step="0.5"
                                  className="input-num-cell ot"
                                  value={r.otDays}
                                  onChange={(e) => handleCellChange(idx, "otDays", Number(e.target.value))}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  {/* VIEW 3: FULL COMBINED REGISTER */}
                  {viewMode === "full" && (
                    <table className="attendance-matrix-table full-matrix-table">
                      <thead>
                        <tr>
                          <th className="sticky-col col-sl">SL</th>
                          <th className="sticky-col col-code">CODE</th>
                          <th className="sticky-col col-name">WORKER NAME</th>
                          <th className="sticky-col col-desig">DESIGNATION</th>
                          <th className="sticky-col col-rate">RATE (₹)</th>

                          {/* Calendar Days 1 to 31 */}
                          {daysArray.map((d) => {
                            const sun = isSunday(d);
                            const dow = getDayOfWeek(d);
                            return (
                              <th key={d} className={`col-day ${sun ? "sunday" : ""}`}>
                                <div className="day-number">{d}</div>
                                <div className="day-dow">{dow}</div>
                              </th>
                            );
                          })}

                          {/* Summary & Wage Columns */}
                          <th className="col-total col-pdays">P DAYS</th>
                          <th className="col-total col-ot">OT</th>
                          <th className="col-total col-gross">GROSS (₹)</th>
                          <th className="col-total col-pf">PF (12%)</th>
                          <th className="col-total col-esi">ESI (0.75%)</th>
                          <th className="col-total col-ptax">P-TAX</th>
                          <th className="col-total col-net sticky-right">NET PAYABLE (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredImportRows.map((r, idx) => {
                          const workerDays = attendanceGrid[r.code] || {};
                          return (
                            <tr key={r.code || idx}>
                              <td className="sticky-col col-sl">{idx + 1}</td>
                              <td className="sticky-col col-code font-mono font-bold">{r.code}</td>
                              <td className="sticky-col col-name">
                                <div className="w-name">{r.name}</div>
                                {r.fatherName && <div className="w-father">C/O {r.fatherName}</div>}
                              </td>
                              <td className="sticky-col col-desig">{r.designation || "Workman"}</td>
                              <td className="sticky-col col-rate">
                                <input
                                  type="number"
                                  className="input-num-cell rate"
                                  value={r.rate}
                                  onChange={(e) => handleCellChange(idx, "rate", Number(e.target.value))}
                                />
                              </td>

                              {daysArray.map((d) => {
                                const status = workerDays[d] || (isSunday(d) ? "WO" : "P");
                                return (
                                  <td
                                    key={d}
                                    className={`cell-day ${isSunday(d) ? "sunday" : ""}`}
                                    onClick={() => toggleAttendanceCell(r.code, d)}
                                    title={`Day ${d} (${getDayOfWeek(d)}): Click to toggle status (${status})`}
                                  >
                                    <span className={`status-badge-cell badge-${status.toLowerCase()}`}>
                                      {status}
                                    </span>
                                  </td>
                                );
                              })}

                              <td className="col-total col-pdays font-bold text-center">{r.presentDays}</td>
                              <td className="col-total col-ot">
                                <input
                                  type="number"
                                  step="0.5"
                                  className="input-num-cell ot"
                                  value={r.otDays}
                                  onChange={(e) => handleCellChange(idx, "otDays", Number(e.target.value))}
                                />
                              </td>
                              <td className="col-total col-gross font-mono">₹{r.totalGross.toLocaleString("en-IN")}</td>
                              <td className="col-total col-pf font-mono text-rose-600">₹{r.pf.toLocaleString("en-IN")}</td>
                              <td className="col-total col-esi font-mono text-amber-600">₹{r.esi.toLocaleString("en-IN")}</td>
                              <td className="col-total col-ptax font-mono">₹{r.ptax}</td>
                              <td className="col-total col-net sticky-right font-mono font-extrabold text-emerald-700 bg-emerald-50">
                                ₹{r.netPayable.toLocaleString("en-IN")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: PROCESSED SALARY SLIPS & BULK EXPORT */}
        {/* ============================================================== */}
        {activeTab === "slips" && (
          <div className="tab-pane-content">
            {savedSlips.length === 0 ? (
              <div className="empty-slips-card">
                <FileSpreadsheet size={48} className="empty-icon" />
                <h3>No Finalized Slips for {monthLabel} {selectedYear}</h3>
                <p>
                  No salary records were found in the database for this month. Mark attendance in Tab 1
                  and click <strong>&quot;Save &amp; Finalize Wages&quot;</strong> to generate and finalize the salary slips.
                </p>
                <button className="btn-go-import" onClick={() => setActiveTab("attendance")}>
                  Go to Live Attendance Matrix <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="slips-manager-card">
                {/* Slips Action Toolbar */}
                <div className="slips-toolbar">
                  <div className="toolbar-info">
                    <h3 className="toolbar-title">
                      {monthLabel} {selectedYear} Finalized Wage Slips ({filteredSlips.length} of {savedSlips.length})
                    </h3>
                    <p className="toolbar-subtitle">
                      Review individual slips, search by worker name or code, and print isolated single or bulk slips.
                    </p>
                  </div>

                  <div className="toolbar-btn-group">
                    <button
                      type="button"
                      className="btn-print-bulk"
                      onClick={() =>
                        printSlipsCleanly(
                          filteredSlips,
                          `${companyName} - All Slips ${monthLabel} ${selectedYear}`
                        )
                      }
                      title="Print filtered slips cleanly (exact 1 page per worker, zero chatbot/dashboard background)"
                    >
                      <Printer size={16} />
                      {activeSlipSearch ? `Print Filtered Slips (${filteredSlips.length})` : "Print All Slips"}
                    </button>

                    <button
                      type="button"
                      className="btn-delete-bulk"
                      onClick={handleDeleteMonthData}
                      disabled={loading}
                      title={`Permanently delete all ${monthLabel} ${selectedYear} records from database`}
                    >
                      <Trash2 size={16} />
                      Delete Month Data ({savedSlips.length})
                    </button>
                  </div>
                </div>

                {/* Worker Search Bar */}
                <form className="slip-search-bar" onSubmit={handleApplySlipSearch}>
                  <div className="search-input-wrapper">
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search worker by Name, Employee Code (e.g. CBPL0065, JB001), ESIC or Father Name..."
                      value={slipSearchInput}
                      onChange={(e) => setSlipSearchInput(e.target.value)}
                      className="slip-search-input"
                    />
                    {slipSearchInput && (
                      <button
                        type="button"
                        className="btn-clear-input"
                        onClick={handleClearSlipSearch}
                        title="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <button type="submit" className="btn-search-submit">
                    Search Worker
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

                {/* Slips Summary Grid */}
                <div className="slips-table-wrapper">
                  <table className="slips-summary-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Code</th>
                        <th>Worker Name</th>
                        <th>Father Name</th>
                        <th>Designation</th>
                        <th>Days</th>
                        <th>Gross (₹)</th>
                        <th>PF (₹)</th>
                        <th>ESI (₹)</th>
                        <th>P-Tax</th>
                        <th>Net Payable (₹)</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSlips.map((slip, i) => (
                        <tr key={slip.id || slip.code || i}>
                          <td className="text-muted">{i + 1}</td>
                          <td className="font-mono font-bold text-sky-400">{slip.code}</td>
                          <td className="font-bold">{slip.name}</td>
                          <td className="text-muted">{slip.fatherName || "—"}</td>
                          <td>{slip.designation || "Labour"}</td>
                          <td>{slip.presentDays}</td>
                          <td>₹{slip.totalEarnings?.toLocaleString("en-IN")}</td>
                          <td>₹{slip.providentFund?.toLocaleString("en-IN")}</td>
                          <td>₹{slip.esi?.toLocaleString("en-IN")}</td>
                          <td>₹{slip.professionalTax}</td>
                          <td className="font-bold text-emerald-400">
                            ₹{slip.netPayable?.toLocaleString("en-IN")}
                          </td>
                          <td className="text-center actions-cell">
                            <button
                              type="button"
                              className="btn-action-view"
                              onClick={() => setSelectedSlipForModal(slip)}
                              title="Preview Full Slip"
                            >
                              <Eye size={14} /> View
                            </button>
                            <button
                              type="button"
                              className="btn-action-print"
                              onClick={() =>
                                printSlipsCleanly(
                                  [slip],
                                  `${companyName} - Slip - ${slip.name} (${slip.code})`
                                )
                              }
                              title="Print clean 1-page A4 slip"
                            >
                              <Printer size={14} /> Print
                            </button>
                            <button
                              type="button"
                              className="btn-action-delete"
                              onClick={() => handleDeleteSingleSlip(slip)}
                              title="Delete this worker's slip"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: UPLOAD EXCEL / CSV WAGE SHEET & GOOGLE SHEETS SYNC */}
        {/* ============================================================== */}
        {activeTab === "import" && (
          <div className="tab-pane-content">
            {/* Top Cloud Sync: Google Sheets Direct Import */}
            <div className="gsheet-import-card">
              <div className="gsheet-import-header">
                <div className="gsheet-import-badge">
                  <FileSpreadsheet size={16} /> GOOGLE SHEETS LIVE CLOUD SYNC
                </div>
                <div className="gsheet-demo-pill">
                  1-Click Live Demonstration
                </div>
              </div>
              <h3 className="gsheet-import-title">
                Import Directly from Google Sheets or Cloud Spreadsheets
              </h3>
              <p className="gsheet-import-desc">
                Paste your Google Sheets link to instantly pull worker attendance, overtime, and calculate wages in real-time. Supports both Day-by-Day (1..31) and Summary wage formats.
              </p>

              <div className="gsheet-import-form">
                <div className="gsheet-url-input-wrap">
                  <Link2 size={18} className="gsheet-link-icon" />
                  <input
                    type="url"
                    className="gsheet-main-input"
                    placeholder="Paste Google Sheets Share Link (e.g. https://docs.google.com/spreadsheets/d/.../edit)"
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                  />
                  {googleSheetUrl && (
                    <button
                      type="button"
                      className="gsheet-clear-url-btn"
                      onClick={() => setGoogleSheetUrl("")}
                      title="Clear URL"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="gsheet-import-buttons">
                  <button
                    type="button"
                    className="btn-gsheet-pull"
                    onClick={() => handleSyncGoogleSheet()}
                    disabled={syncingSheet}
                  >
                    {syncingSheet ? (
                      <RefreshCw size={16} className="spin" />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                    <span>{syncingSheet ? "Pulling Data..." : "Pull & Sync from Google Sheet"}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-gsheet-demo"
                    onClick={handleLoadDemoGoogleSheet}
                    disabled={syncingSheet}
                    title="Load verified demonstration Google Sheet with realistic attendance for Celebrity Brewing"
                  >
                    <Sparkles size={16} />
                    <span>Load Celebrity Sample Data (154 Workers)</span>
                  </button>
                </div>
              </div>

              <div className="gsheet-tip-box">
                💡 <strong>Google Sheets Sharing Tip:</strong> Open your Google Sheet, click <strong>Share</strong> (top right), set General Access to <strong>&quot;Anyone with the link can view&quot;</strong>, then paste the link here.
              </div>
            </div>

            {/* Divider */}
            <div className="upload-divider">
              <span>OR DROP LOCAL EXCEL / CSV FILE</span>
            </div>

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
                  Supports contractor wage formats with Present Days, OT, Rate ₹491/₹376, PF, ESI, P-Tax
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
                <div className="quick-title">Client Templates &amp; Quick Actions:</div>
                <div className="quick-btn-group">
                  <a
                    href="/sample-sheets/Template_muster_Client_Format.xlsx"
                    download="Template_muster_Client_Format.xlsx"
                    className="action-pill-btn client-template-btn"
                    title="Download Official 3-Sheet Client Muster Template (Contractor Master, Employee Master, Attendance)"
                  >
                    <Download size={14} /> 📥 Official Client Template (.xlsx)
                  </a>

                  <a
                    href="/sample-sheets/Celebrity_Brewing_October_2026_Attendance.xlsx"
                    download="Celebrity_Brewing_October_2026_Attendance.xlsx"
                    className="action-pill-btn"
                    title="Download Pre-filled October 2026 Sheet for Celebrity Brewing (154 Workers)"
                  >
                    <FileSpreadsheet size={14} /> October 2026 Sample (.xlsx)
                  </a>

                  <button
                    type="button"
                    className="action-pill-btn demo-pill-btn"
                    onClick={handleLoadDemoGoogleSheet}
                    disabled={syncingSheet}
                    title="Load verified October 2026 Celebrity Brewing 154-worker dataset with 1 click"
                  >
                    <Sparkles size={14} /> ⚡ 1-Click Load October 2026 Data
                  </button>

                  <button
                    type="button"
                    className="action-pill-btn delete-pill-btn"
                    onClick={handleClearOrDeleteSheet}
                    title="Clear uploaded spreadsheet or delete database records to reset"
                  >
                    <Trash2 size={14} /> 🗑️ Clear / Delete Sheet
                  </button>
                </div>
              </div>
            </div>

            {/* Spreadsheet Preview & Live Recalculation Table */}
            {rows.length > 0 && (
              <div className="import-preview-section">
                <div className="preview-section-header">
                  <div className="preview-title-group">
                    <div className="preview-main-title">
                      Spreadsheet Preview &amp; Live Recalculation
                    </div>
                    <div className="preview-subtitle">
                      {rows.length} worker records loaded for {monthLabel} {selectedYear}. You can edit daily rate, present days, or OT directly in the table.
                    </div>
                  </div>

                  <div className="preview-top-actions">
                    <button
                      type="button"
                      className="btn-preview-switch-attendance"
                      onClick={() => setActiveTab("attendance")}
                    >
                      <Calendar size={15} /> Open in Day-by-Day Matrix (Tab 1)
                    </button>

                    <button
                      type="button"
                      className="btn-preview-save-db"
                      onClick={handleSaveToDatabase}
                      disabled={saving}
                    >
                      {saving ? <RefreshCw size={15} className="spin" /> : <CheckCircle2 size={15} />}
                      Save &amp; Finalize Wages
                    </button>
                  </div>
                </div>

                {/* Preview KPI Summary */}
                {summary && (
                  <div className="preview-kpi-bar">
                    <div className="kpi-pill">
                      <span className="kpi-label">Workers:</span>
                      <span className="kpi-value">{summary.totalWorkers}</span>
                    </div>
                    <div className="kpi-pill">
                      <span className="kpi-label">Present Days:</span>
                      <span className="kpi-value">{summary.totalPresentDays.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="kpi-pill">
                      <span className="kpi-label">Total OT:</span>
                      <span className="kpi-value">{summary.totalOtDays}</span>
                    </div>
                    <div className="kpi-pill">
                      <span className="kpi-label">Gross Wages:</span>
                      <span className="kpi-value">₹{summary.totalGross.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="kpi-pill">
                      <span className="kpi-label">Total Deductions:</span>
                      <span className="kpi-value">₹{summary.totalDeductions.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="kpi-pill highlight">
                      <span className="kpi-label">Net Payable:</span>
                      <span className="kpi-value text-emerald-400">₹{summary.totalNetPayable.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                )}

                {/* Filter / Search Bar */}
                <div className="preview-search-row">
                  <div className="preview-search-box">
                    <Search size={16} className="text-slate-400" />
                    <input
                      type="text"
                      className="preview-search-input"
                      placeholder="Search preview by worker name, code, designation..."
                      value={importSearch}
                      onChange={(e) => setImportSearch(e.target.value)}
                    />
                    {importSearch && (
                      <button
                        type="button"
                        className="clear-search-btn"
                        onClick={() => setImportSearch("")}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div className="preview-search-count">
                    Showing {filteredImportRows.length} of {rows.length} workers
                  </div>
                </div>

                {/* Table */}
                <div className="preview-table-wrapper">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th className="col-idx">#</th>
                        <th className="col-code">CODE</th>
                        <th className="col-name">WORKER NAME</th>
                        <th className="col-father">FATHER / HUSBAND</th>
                        <th className="col-desig">DESIGNATION</th>
                        <th className="col-rate text-right">RATE (₹)</th>
                        <th className="col-pdays text-center">P DAYS</th>
                        <th className="col-ot text-center">OT DAYS</th>
                        <th className="col-gross text-right">GROSS (₹)</th>
                        <th className="col-pf text-right">PF (12%)</th>
                        <th className="col-esi text-right">ESI (0.75%)</th>
                        <th className="col-ptax text-right">P-TAX</th>
                        <th className="col-net text-right">NET PAYABLE (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredImportRows.map((r, idx) => (
                        <tr key={r.code || idx}>
                          <td className="col-idx">{idx + 1}</td>
                          <td className="col-code font-mono">{r.code}</td>
                          <td className="col-name font-medium">
                            <div className="p-w-name">{r.name}</div>
                            {r.esicNo && <div className="p-w-esic">ESI: {r.esicNo}</div>}
                          </td>
                          <td className="col-father text-slate-400">{r.fatherName || "—"}</td>
                          <td className="col-desig">{r.designation || "Workman"}</td>
                          <td className="col-rate">
                            <input
                              type="number"
                              className="preview-inline-input"
                              value={r.rate}
                              onChange={(e) => handleCellChange(idx, "rate", Number(e.target.value))}
                            />
                          </td>
                          <td className="col-pdays">
                            <input
                              type="number"
                              step="0.5"
                              className="preview-inline-input text-center"
                              value={r.presentDays}
                              onChange={(e) => handleCellChange(idx, "presentDays", Number(e.target.value))}
                            />
                          </td>
                          <td className="col-ot">
                            <input
                              type="number"
                              step="0.5"
                              className="preview-inline-input text-center"
                              value={r.otDays}
                              onChange={(e) => handleCellChange(idx, "otDays", Number(e.target.value))}
                            />
                          </td>
                          <td className="col-gross text-right font-medium">₹{r.totalGross.toLocaleString("en-IN")}</td>
                          <td className="col-pf text-right">₹{r.pf.toLocaleString("en-IN")}</td>
                          <td className="col-esi text-right">₹{r.esi.toLocaleString("en-IN")}</td>
                          <td className="col-ptax text-right">₹{r.ptax}</td>
                          <td className="col-net text-right font-bold text-emerald-400">
                            ₹{r.netPayable.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Action Footer */}
                <div className="preview-footer-actions">
                  <div className="footer-left">
                    <button
                      type="button"
                      className="btn-footer-export"
                      onClick={handleExportFormXVIICSV}
                    >
                      <Download size={15} /> Export Form XVII (CSV)
                    </button>
                    <button
                      type="button"
                      className="btn-footer-clear"
                      onClick={handleClearUploadPreview}
                    >
                      <Trash2 size={15} /> Clear Preview
                    </button>
                  </div>

                  <div className="footer-right">
                    <button
                      type="button"
                      className="btn-footer-finalize"
                      onClick={handleSaveToDatabase}
                      disabled={saving}
                    >
                      {saving ? <RefreshCw size={16} className="spin" /> : <CheckCircle2 size={16} />}
                      Save &amp; Finalize Wages to Neon DB
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal: Single Slip Preview & Print */}
        {selectedSlipForModal && (
          <div className="slip-modal-backdrop" onClick={() => setSelectedSlipForModal(null)}>
            <div className="slip-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="slip-modal-header">
                <div className="modal-title-group">
                  <h3>Salary Slip Preview — {selectedSlipForModal.name}</h3>
                  <span className="worker-code-badge">{selectedSlipForModal.code}</span>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-modal-print"
                    onClick={() =>
                      printSlipsCleanly(
                        [selectedSlipForModal],
                        `${companyName} - Slip - ${selectedSlipForModal.name} (${selectedSlipForModal.code})`
                      )
                    }
                  >
                    <Printer size={15} /> Print Slip
                  </button>
                  <button
                    type="button"
                    className="btn-modal-close"
                    onClick={() => setSelectedSlipForModal(null)}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="slip-modal-body">
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
      </div>

      {/* Embedded CSS Styles */}
      <style jsx>{`
        /* =====================================================================
           ULTRA-PREMIUM LIGHT CORPORATE HRM THEME (ZERO DARK/BLACK SECTIONS)
           ===================================================================== */
        .labour-wage-page {
          padding: 24px 30px;
          background: #f8fafc;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #0f172a;
        }

        /* Hero Card */
        .wage-hero-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 24px 28px;
          color: #0f172a;
          box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 22px;
          border: 1px solid #e2e8f0;
          position: relative;
          overflow: hidden;
        }
        .wage-hero-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #2563eb, #6366f1, #8b5cf6, #06b6d4);
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #eff6ff;
          padding: 5px 12px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 700;
          color: #2563eb;
          margin-bottom: 10px;
          border: 1px solid #bfdbfe;
        }

        .hero-title {
          font-size: 26px;
          font-weight: 900;
          margin: 0 0 6px 0;
          letter-spacing: -0.5px;
          color: #0f172a;
        }

        .hero-subtitle {
          color: #64748b;
          font-size: 13.5px;
          margin: 0;
          max-width: 760px;
          line-height: 1.55;
        }

        .month-selector-box {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
        }

        .selector-group {
          display: flex;
          gap: 8px;
          background: #f1f5f9;
          padding: 5px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .period-select {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          outline: none;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }
        .period-select:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 700;
        }
        .pill-live {
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
        }
        .pill-draft {
          background: #fffbeb;
          color: #b45309;
          border: 1px solid #fde68a;
        }

        .btn-delete-header {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-delete-header:hover:not(:disabled) {
          background: #fee2e2;
          border-color: #f87171;
        }

        /* Navigation Tabs */
        .nav-tabs-wrapper {
          display: flex;
          gap: 8px;
          background: #ffffff;
          padding: 6px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          margin-bottom: 20px;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
          flex-wrap: wrap;
        }

        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 600;
          color: #64748b;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .tab-btn:hover {
          color: #0f172a;
          background: #f8fafc;
        }
        .tab-btn.tab-active {
          background: #eff6ff;
          color: #1d4ed8;
          font-weight: 800;
          box-shadow: 0 1px 4px rgba(37, 99, 235, 0.1);
        }

        .tab-count-badge {
          font-size: 11px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 999px;
        }
        .tab-count-badge.cyan {
          background: #e0f2fe;
          color: #0284c7;
        }
        .tab-count-badge.green {
          background: #dcfce7;
          color: #15803d;
        }

        /* Month Navigator Strip */
        .month-navigator-card {
          background: #ffffff;
          border-radius: 14px;
          padding: 14px 18px;
          margin-bottom: 18px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .month-nav-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        .month-tabs-strip {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          flex: 1;
          padding-bottom: 2px;
        }

        .month-tab-pill {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 7px 14px;
          border-radius: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          cursor: pointer;
          min-width: 78px;
          transition: all 0.15s ease;
        }
        .month-tab-pill:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
        .month-tab-pill.active {
          background: #eff6ff;
          border-color: #3b82f6;
          color: #1d4ed8;
          font-weight: 800;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.12);
        }

        .month-pill-name {
          font-size: 12px;
          font-weight: 700;
        }
        .month-pill-status {
          font-size: 10px;
          margin-top: 2px;
          font-weight: 600;
        }
        .month-pill-status.saved {
          color: #059669;
        }
        .month-pill-status.draft {
          color: #94a3b8;
        }

        /* Google Sheets Sync Hub Card */
        .gsheet-guide-banner {
          margin-top: 14px;
          padding: 12px 16px;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px dashed #cbd5e1;
        }

        .gsheet-guide-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          color: #334155;
          margin-bottom: 8px;
        }

        .gsheet-guide-steps {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 10px;
        }

        .guide-step {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 12px;
          color: #475569;
          line-height: 1.4;
        }

        .guide-step .step-num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #e2e8f0;
          color: #1e293b;
          font-weight: 800;
          font-size: 11px;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .guide-step .guide-link {
          color: #2563eb;
          font-weight: 600;
          text-decoration: underline;
        }

        .gsheet-hub-card {
          background: #ffffff;
          border-radius: 14px;
          padding: 18px 22px;
          margin-bottom: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
        }

        .gsheet-hub-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .gsheet-hub-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .gsheet-icon-circle {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #ecfdf5;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #a7f3d0;
          color: #059669;
        }

        .gsheet-hub-title {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
        }

        .gsheet-hub-subtitle {
          font-size: 12.5px;
          color: #64748b;
          margin-top: 2px;
        }

        .gsheet-hub-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .btn-gsheet-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s ease;
          text-decoration: none;
        }
        .btn-gsheet-action.sync-btn {
          background: #ecfdf5;
          color: #059669;
          border-color: #a7f3d0;
        }
        .btn-gsheet-action.sync-btn:hover:not(:disabled) {
          background: #d1fae5;
        }
        .btn-gsheet-action.demo-btn {
          background: #eff6ff;
          color: #2563eb;
          border-color: #bfdbfe;
        }
        .btn-gsheet-action.demo-btn:hover {
          background: #dbeafe;
        }
        .btn-gsheet-action.view-btn {
          background: #f8fafc;
          color: #475569;
          border-color: #e2e8f0;
        }
        .btn-gsheet-action.open-btn {
          background: #f8fafc;
          color: #475569;
          border-color: #e2e8f0;
        }

        .gsheet-input-row {
          display: flex;
          gap: 10px;
        }

        .gsheet-input-box {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          padding: 8px 14px;
          border-radius: 10px;
          transition: border-color 0.15s;
        }
        .gsheet-input-box:focus-within {
          border-color: #2563eb;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .gsheet-url-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #0f172a;
          font-size: 13px;
        }

        .btn-gsheet-save {
          background: #0f172a;
          color: #ffffff;
          border: none;
          padding: 8px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-gsheet-save:hover {
          background: #1e293b;
        }

        .gsheet-iframe-wrapper {
          margin-top: 14px;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          height: 480px;
        }
        .gsheet-iframe {
          width: 100%;
          height: 100%;
          border: none;
        }

        /* KPI Metric Cards */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px;
          margin-bottom: 22px;
        }

        .metric-card {
          background: #ffffff;
          border-radius: 14px;
          padding: 16px 18px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .metric-card.highlight-metric {
          border-color: #a7f3d0;
          background: #f0fdf4;
        }

        .metric-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .metric-icon-box.blue {
          background: #eff6ff;
          color: #2563eb;
        }
        .metric-icon-box.purple {
          background: #faf5ff;
          color: #7c3aed;
        }
        .metric-icon-box.amber {
          background: #fffbeb;
          color: #d97706;
        }
        .metric-icon-box.teal {
          background: #f0fdfa;
          color: #0d9488;
        }
        .metric-icon-box.red {
          background: #fef2f2;
          color: #dc2626;
        }
        .metric-icon-box.green {
          background: #ecfdf5;
          color: #059669;
        }

        .metric-val {
          font-size: 19px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.3px;
        }

        .metric-lbl {
          font-size: 11.5px;
          color: #64748b;
          font-weight: 600;
          margin-top: 2px;
        }

        /* Sub-View Switcher Bar */
        .view-mode-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 12px;
          background: #ffffff;
          padding: 8px 14px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.03);
        }

        .view-mode-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .view-mode-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 9px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .view-mode-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .view-mode-btn.active {
          background: #eff6ff;
          color: #1d4ed8;
          border-color: #3b82f6;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.14);
        }

        .view-mode-tag {
          font-size: 10px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 999px;
          background: #dcfce7;
          color: #166534;
        }

        .matrix-legend-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .legend-chip {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
        }

        /* Attendance Matrix Toolbar */
        .attendance-toolbar-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          background: #ffffff;
          border-radius: 14px;
          padding: 14px 18px;
          margin-bottom: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
        }

        .attendance-tools-left,
        .attendance-tools-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .btn-tool-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 13px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #475569;
          transition: all 0.15s ease;
        }
        .btn-tool-action:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .btn-tool-action.preset {
          background: #eff6ff;
          color: #2563eb;
          border-color: #bfdbfe;
        }
        .btn-tool-action.green {
          background: #ecfdf5;
          color: #059669;
          border-color: #a7f3d0;
        }
        .btn-tool-action.slate {
          background: #f8fafc;
          color: #475569;
        }
        .btn-tool-action.delete-reset-btn {
          background: #fef2f2;
          color: #dc2626;
          border-color: #fecaca;
        }
        .btn-tool-action.delete-reset-btn:hover {
          background: #fee2e2;
          border-color: #f87171;
        }

        .search-box-attendance {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          padding: 6px 12px;
          border-radius: 8px;
        }
        .search-box-attendance:focus-within {
          border-color: #2563eb;
          background: #ffffff;
        }

        .attendance-search-input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 12.5px;
          color: #0f172a;
          width: 170px;
        }

        .btn-export-csv {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          background: #f8fafc;
          color: #0284c7;
          border: 1px solid #bae6fd;
          cursor: pointer;
        }
        .btn-export-csv:hover {
          background: #e0f2fe;
        }

        .btn-save-attendance-wages {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 800;
          background: #2563eb;
          color: #ffffff;
          border: none;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
          transition: all 0.15s ease;
        }
        .btn-save-attendance-wages:hover:not(:disabled) {
          background: #1d4ed8;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
        }
        .btn-save-attendance-wages:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Matrix Table Wrapper & Styles */
        .attendance-matrix-wrapper {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);
          overflow: hidden;
        }

        .matrix-table-scroll {
          overflow-x: auto;
          max-height: 720px;
          position: relative;
        }

        .attendance-matrix-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 12px;
          text-align: left;
        }

        .attendance-matrix-table thead th {
          background: #f8fafc;
          color: #475569;
          font-weight: 800;
          font-size: 11px;
          padding: 10px 12px;
          border-bottom: 2px solid #e2e8f0;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          white-space: nowrap;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .attendance-matrix-table tbody td {
          padding: 10px 12px;
          border-bottom: 1px solid #f1f5f9;
          color: #1e293b;
          background: #ffffff;
          white-space: nowrap;
          vertical-align: middle;
        }

        .attendance-matrix-table tbody tr:nth-child(even) td {
          background: #fcfcfd;
        }

        .attendance-matrix-table tbody tr:hover td {
          background: #eff6ff !important;
        }

        /* Sticky Columns */
        .sticky-col {
          position: sticky;
          background: #ffffff;
          z-index: 5;
        }
        .attendance-matrix-table thead th.sticky-col {
          background: #f8fafc;
          z-index: 15;
        }

        .col-sl {
          left: 0;
          width: 44px;
          min-width: 44px;
          text-align: center;
        }
        .col-code {
          left: 44px;
          width: 95px;
          min-width: 95px;
        }
        .col-name {
          left: 139px;
          min-width: 170px;
          border-right: 2px solid #e2e8f0;
        }

        .w-name {
          font-weight: 700;
          color: #0f172a;
        }
        .w-father {
          font-size: 10.5px;
          color: #64748b;
          margin-top: 2px;
        }

        .sticky-right {
          position: sticky;
          right: 0;
          border-left: 2px solid #a7f3d0;
          background: #ecfdf5 !important;
          z-index: 6;
        }
        .attendance-matrix-table thead th.sticky-right {
          background: #d1fae5 !important;
          z-index: 16;
          color: #065f46;
        }

        .sticky-right-action {
          position: sticky;
          right: 0;
          background: #ffffff;
          z-index: 6;
          border-left: 1px solid #e2e8f0;
        }
        .attendance-matrix-table thead th.sticky-right-action {
          background: #f8fafc;
          z-index: 16;
        }

        .sticky-right-att {
          position: sticky;
          right: 80px;
          background: #eff6ff !important;
          border-left: 2px solid #bfdbfe;
          z-index: 6;
        }
        .attendance-matrix-table thead th.sticky-right-att {
          background: #dbeafe !important;
          z-index: 16;
          color: #1e40af;
        }

        /* Day Columns */
        .col-day {
          width: 34px;
          min-width: 34px;
          padding: 6px 2px !important;
          text-align: center;
          border-left: 1px solid #f1f5f9;
        }
        .col-day.sunday {
          background: #fef2f2 !important;
          color: #dc2626 !important;
        }

        .day-number {
          font-size: 11px;
          font-weight: 800;
        }
        .day-dow {
          font-size: 9px;
          color: #94a3b8;
          font-weight: 600;
        }

        .cell-day {
          padding: 4px 2px !important;
          text-align: center;
          cursor: pointer;
          user-select: none;
          border-left: 1px solid #f8fafc;
        }
        .cell-day.sunday {
          background: #fff5f5;
        }

        .status-badge-cell {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 24px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          line-height: 1;
        }

        .badge-p {
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
        }
        .badge-wo {
          background: #eff6ff;
          color: #0284c7;
          border: 1px solid #bae6fd;
        }
        .badge-hd {
          background: #fffbeb;
          color: #d97706;
          border: 1px solid #fde68a;
        }
        .badge-a {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }
        .badge-nh,
        .badge-fh,
        .badge-np,
        .badge-fp {
          background: #faf5ff;
          color: #7c3aed;
          border: 1px solid #e9d5ff;
        }

        .input-num-cell {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 4px 8px;
          color: #0f172a;
          font-size: 12px;
          font-weight: 700;
          text-align: right;
          outline: none;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }
        .input-num-cell:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
        }
        .input-num-cell.rate {
          width: 75px;
        }
        .input-num-cell.ot {
          width: 60px;
          text-align: center;
        }

        .btn-row-action.slip-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #bfdbfe;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-row-action.slip-btn:hover {
          background: #dbeafe;
          border-color: #93c5fd;
        }

        /* Empty Workers Card */
        .empty-workers-card {
          padding: 48px 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .empty-workers-card h4 {
          font-size: 18px;
          font-weight: 800;
          margin: 0;
          color: #0f172a;
        }
        .empty-workers-card p {
          color: #64748b;
          font-size: 13.5px;
          margin: 0;
          max-width: 480px;
        }
        .empty-btn-group {
          display: flex;
          gap: 12px;
          margin-top: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .btn-add-worker-empty {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-demo-load-empty {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 9px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }
        .btn-demo-load-empty:hover {
          background: #1d4ed8;
        }

        /* Tab 3 Upload Styles */
        .upload-section-card {
          background: #ffffff;
          border-radius: 14px;
          padding: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
          margin-bottom: 24px;
        }

        .upload-dropzone {
          border: 2px dashed #cbd5e1;
          background: #f8fafc;
          border-radius: 12px;
          padding: 40px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .upload-dropzone:hover {
          background: #eff6ff;
          border-color: #3b82f6;
        }

        .upload-icon-circle {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: #e0f2fe;
          color: #0284c7;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .upload-title {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
        }

        .upload-desc {
          font-size: 13px;
          color: #64748b;
          max-width: 540px;
        }

        .btn-browse-file {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 9px 22px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 6px;
        }

        .quick-actions-bar {
          margin-top: 20px;
          padding-top: 18px;
          border-top: 1px dashed #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }

        .quick-title {
          font-size: 13px;
          font-weight: 700;
          color: #475569;
        }

        .quick-btn-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .action-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          color: #475569;
          border: 1px solid #cbd5e1;
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .action-pill-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .action-pill-btn.client-template-btn {
          background: #eff6ff;
          color: #1d4ed8;
          border-color: #93c5fd;
        }
        .action-pill-btn.demo-pill-btn {
          background: #ecfdf5;
          color: #047857;
          border-color: #a7f3d0;
        }
        .action-pill-btn.delete-pill-btn {
          background: #fef2f2;
          color: #dc2626;
          border-color: #fecaca;
        }
        .action-pill-btn.delete-pill-btn:hover {
          background: #fee2e2;
          border-color: #f87171;
        }

        .upload-divider {
          text-align: center;
          position: relative;
          margin: 24px 0 16px 0;
        }
        .upload-divider span {
          background: #f8fafc;
          padding: 0 16px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .gsheet-tip-box {
          margin-top: 14px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 12.5px;
          color: #166534;
        }

        /* Tab 2 Slips Manager */
        .slips-manager-card {
          background: #ffffff;
          border-radius: 14px;
          padding: 22px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
        }

        .slips-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f1f5f9;
        }

        .toolbar-title {
          font-size: 17px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .toolbar-subtitle {
          font-size: 12.5px;
          color: #64748b;
          margin: 4px 0 0 0;
        }

        .slips-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn-print-bulk {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
        }
        .btn-print-bulk:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .btn-delete-bulk {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-delete-bulk:hover:not(:disabled) {
          background: #fee2e2;
          border-color: #f87171;
        }

        .slips-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: 14px;
        }

        .slip-card-item {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
          transition: all 0.15s ease;
        }
        .slip-card-item:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
        }

        .slip-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .slip-worker-name {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
        }
        .slip-worker-code {
          font-size: 11px;
          font-family: monospace;
          color: #64748b;
          font-weight: 600;
          margin-top: 2px;
        }

        .slip-net-pill {
          font-size: 13px;
          font-weight: 800;
          color: #059669;
          background: #ecfdf5;
          padding: 3px 10px;
          border-radius: 20px;
          border: 1px solid #a7f3d0;
        }

        .slip-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          background: #f8fafc;
          padding: 8px 10px;
          border-radius: 8px;
          margin-bottom: 12px;
          text-align: center;
        }

        .slip-stat-lbl {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 700;
        }
        .slip-stat-val {
          font-size: 12px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 2px;
        }

        .slip-card-actions {
          display: flex;
          gap: 8px;
        }

        .btn-slip-view {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #bfdbfe;
          padding: 6px 12px;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-slip-print {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: #f8fafc;
          color: #475569;
          border: 1px solid #e2e8f0;
          padding: 6px 12px;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content-card {
          background: #ffffff;
          border-radius: 16px;
          max-width: 840px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          border: 1px solid #e2e8f0;
        }

        .modal-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 22px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .modal-header-title {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
        }

        .modal-close-btn {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
        }

        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .status-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 16px;
          border-radius: 10px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 600;
        }
        .alert-banner-success {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }
        .alert-banner-error {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }
        .alert-banner-info {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .status-close {
          background: transparent;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: currentColor;
          line-height: 1;
        }

        .text-right {
          text-align: right;
        }
        .text-center {
          text-align: center;
        }
        .font-mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        .font-bold {
          font-weight: 700;
        }
        .font-extrabold {
          font-weight: 800;
        }
      `}</style>
    </div>
  );
}

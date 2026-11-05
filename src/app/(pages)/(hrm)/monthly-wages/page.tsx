"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import axiosInstance from "@/utils/axiosInstance";
import LabourSalarySlip, { SalarySlipData, numberToIndianWords } from "@/components/hrm/labourSalarySlip/LabourSalarySlip";
import {
  UploadCloud,
  RotateCcw,
  ShieldCheck,
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
  Clock,
  Copy,
  Check,
  Layers,
  FileCode,
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

const YEARS = Array.from({ length: 15 }, (_, i) => 2024 + i); // 2024 to 2038

export default function MonthlyWageSheetPage() {
  // Default to November 2026 (Live Current Month)
  const [selectedMonth, setSelectedMonth] = useState<number>(11);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [activeTab, setActiveTab] = useState<"attendance" | "slips" | "import" | "punch">("attendance");
  const [viewMode, setViewMode] = useState<"wages" | "attendance" | "full">("wages");

  const [companyName, setCompanyName] = useState<string>("Company");
  const [companyAddress, setCompanyAddress] = useState<string>("");

  // Tab 1 & General Wage Rows State
  const [rows, setRows] = useState<LabourRow[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [importSearch, setImportSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info" | "warning"; text: string } | null>(null);

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

  // Live Gate Terminal Sync State for Mode 2
  const [syncingGate, setSyncingGate] = useState<boolean>(false);
  const [gateMonthData, setGateMonthData] = useState<Record<number, Record<string, any>>>({});

  // Synchronize all Gate Punches from Backend into Tab 1 Live Attendance & Wage Sheet
  const syncGatePunchesToMatrix = async (explicitData?: Record<number, Record<string, any>>) => {
    if (rows.length === 0) return;
    setSyncingGate(true);
    try {
      let monthPunches = explicitData;
      if (!monthPunches) {
        const res = await axiosInstance.get(
          `/public-gate/month-punches?company=${companySlug}&year=${selectedYear}&month=${selectedMonth}`
        );
        monthPunches = res.data?.data?.monthPunches || {};
      }
      setGateMonthData(monthPunches || {});

      const punchedDays = Object.keys(monthPunches || {}).map(Number);
      const newGrid: Record<string, Record<number, "P" | "A" | "HD" | "WO">> = {};
      const updatedRows: LabourRow[] = [];

      for (const row of rows) {
        const workerMap: Record<number, "P" | "A" | "HD" | "WO"> = {};
        let presentDaysCount = 0;
        let totalOtHours = 0;

        for (const dayItem of cycleInfo.days) {
          const dayKey = dayItem.dayKey;
          const isSun = dayItem.isSunday;
          const punchForDay = monthPunches?.[dayKey]?.[row.code];

          if (punchForDay && (punchForDay.inTime || punchForDay.status === "P")) {
            workerMap[dayKey] = punchForDay.status || "P";
            presentDaysCount += (punchForDay.status === "HD" ? 0.5 : 1);
            totalOtHours += Number(punchForDay.otHours || 0);
          } else if (punchForDay && punchForDay.status === "HD") {
            workerMap[dayKey] = "HD";
            presentDaysCount += 0.5;
            totalOtHours += Number(punchForDay.otHours || 0);
          } else if (isSun) {
            workerMap[dayKey] = "WO";
          } else {
            workerMap[dayKey] = "A";
          }
        }

        newGrid[row.code] = workerMap;

        const otDaysVal = Math.round((totalOtHours / shiftStandardHours) * 100) / 100;
        const recomputed = recalculateRow({
          ...row,
          presentDays: presentDaysCount,
          otDays: otDaysVal,
        });
        updatedRows.push(recomputed);
      }

      setAttendanceGrid(newGrid);
      setRows(updatedRows);
      recalculateSummary(updatedRows);
      setStatusMessage({
        type: "success",
        text: `Mode 2 Gate Punches Synced! Found ${punchedDays.length} punched days in ${monthLabel} ${selectedYear}. Live wage sheet updated.`,
      });
    } catch (err: any) {
      console.error("syncGatePunches error:", err);
    } finally {
      setSyncingGate(false);
    }
  };

  // Reset or clear gate punches in backend and re-sync
  const handleResetGatePunches = async (clearAllMonth: boolean = false) => {
    const confirmText = clearAllMonth
      ? `Clear all Gate Punches for ${monthLabel} ${selectedYear}?\n\nThis will reset all gate test data for this month back to zero.`
      : `Reset Gate Punches for Day ${punchDateDay}?\n\nThis will clear check-in/out timestamps for Day ${punchDateDay} so you can test punching fresh.`;

    if (!window.confirm(confirmText)) return;

    try {
      await axiosInstance.post("/public-gate/reset-punches", {
        company: companySlug,
        year: selectedYear,
        month: selectedMonth,
        day: clearAllMonth ? undefined : punchDateDay,
        all: clearAllMonth,
      });

      const storageKey = `hrm_gate_punches_${companyName}_${selectedYear}_${selectedMonth}_day_${punchDateDay}`;
      localStorage.removeItem(storageKey);

      setStatusMessage({
        type: "info",
        text: clearAllMonth
          ? `Cleared all gate punches for ${monthLabel} ${selectedYear}!`
          : `Reset gate punches for Day ${punchDateDay}!`,
      });

      await syncGatePunchesToMatrix();
    } catch (err: any) {
      alert("Failed to reset gate punches: " + (err.response?.data?.message || err.message));
    }
  };

  // Attendance Source Mode: "sheet" (Cloud Google Sheets & Excel) vs "terminal" (Live Gate Terminal)
  const [attendanceSourceMode, setAttendanceSourceMode] = useState<"sheet" | "terminal">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("hrm_attendance_source_mode") as "sheet" | "terminal") || "sheet";
    }
    return "sheet";
  });

  const handleSetAttendanceMode = (mode: "sheet" | "terminal") => {
    setAttendanceSourceMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("hrm_attendance_source_mode", mode);
    }
    if (mode === "terminal") {
      syncGatePunchesToMatrix();
    } else {
      loadAttendanceOrWorkers(selectedMonth, selectedYear);
    }
  };

  // Company Guard PIN state
  const [companyGatePin, setCompanyGatePin] = useState<string>("1234");
  const [newGatePinInput, setNewGatePinInput] = useState<string>("1234");
  const [savingPin, setSavingPin] = useState<boolean>(false);

  // Tab 4 (Daily Punch & OT Terminal) State
  const [punchDateDay, setPunchDateDay] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const d = new Date().getDate();
      return d >= 1 && d <= 31 ? d : 1;
    }
    return 1;
  });
  const [showGatePrintModal, setShowGatePrintModal] = useState<boolean>(false);
  const [selectedWorkerHistory, setSelectedWorkerHistory] = useState<LabourRow | null>(null);
  const [shiftStandardHours, setShiftStandardHours] = useState<number>(8);
  const [globalPfPercent, setGlobalPfPercent] = useState<number>(12);
  const [globalEsiPercent, setGlobalEsiPercent] = useState<number>(0.75);
  const [punchSearch, setPunchSearch] = useState<string>("");
  const [dailyPunches, setDailyPunches] = useState<
    Record<
      string,
      {
        inTime: string;
        outTime: string;
        shiftStandard?: number;
        totalHours: number;
        otHours: number;
        status: "P" | "HD" | "A" | "WO";
      }
    >
  >({});
  const [showGScriptModal, setShowGScriptModal] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [copiedFormula, setCopiedFormula] = useState<boolean>(false);

  // Check if active company is Celebrity Brewing
  const isCelebrity = useMemo(() => {
    return (
      companyName.toUpperCase().includes("CELEBRITY") ||
      rows.some((r) => r.code?.toUpperCase().startsWith("CBPL"))
    );
  }, [companyName, rows]);

  const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || "October";

  const companySlug = useMemo(() => {
    const c = (companyName || "").toUpperCase();
    if (c.includes("VODABOX") || rows.some((r) => r.code?.toUpperCase().startsWith("VD") || r.code?.toUpperCase().startsWith("VEPL"))) {
      return "vodabox";
    }
    if (c.includes("JUBILANT") || rows.some((r) => r.code?.toUpperCase().startsWith("JB") || r.code?.toUpperCase().startsWith("JCPL"))) {
      return "jubilant";
    }
    return "celebrity";
  }, [companyName, rows]);

  // Calendar & Custom Wage Cycle calculations (Celebrity: 16th to 15th; Standard: 1st to 31st)
  const cycleInfo = useMemo(() => {
    if (!isCelebrity) {
      const daysCount = new Date(selectedYear, selectedMonth, 0).getDate();
      const pLabel = `01 ${monthLabel} ${selectedYear} - ${daysCount} ${monthLabel} ${selectedYear}`;
      const pSlip = `01.${String(selectedMonth).padStart(2, "0")}.${selectedYear} To ${daysCount}.${String(selectedMonth).padStart(2, "0")}.${selectedYear}`;
      const days = Array.from({ length: daysCount }, (_, i) => {
        const dNum = i + 1;
        const dObj = new Date(selectedYear, selectedMonth - 1, dNum);
        return {
          dayKey: dNum,
          dayNum: dNum,
          month: selectedMonth,
          year: selectedYear,
          dateObj: dObj,
          isSunday: dObj.getDay() === 0,
          dayOfWeek: dObj.toLocaleDateString("en-US", { weekday: "short" }),
          headerLabel: `${dNum}`,
          headerMonth: monthLabel.slice(0, 3),
          headerFull: `${dNum} ${monthLabel.slice(0, 3)}`,
          isPrevMonth: false,
        };
      });
      return {
        isCelebrity: false,
        totalDays: daysCount,
        periodLabel: pLabel,
        periodSlip: pSlip,
        days,
        prevMonthName: "",
        curMonthName: monthLabel.slice(0, 3),
      };
    }

    // CELEBRITY BREWING CUSTOM CYCLE:
    // 16th of previous month to 15th of selected month (e.g. 16 Sept to 15 Oct for Oct 2026)
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
    const prevMonthName = MONTHS.find((m) => m.value === prevMonth)?.label?.slice(0, 3) || "Prev";
    const curMonthName = monthLabel.slice(0, 3);

    // Days from 16th to end of previous month
    const prevDays = Array.from({ length: daysInPrevMonth - 16 + 1 }, (_, i) => {
      const dNum = 16 + i;
      const dObj = new Date(prevYear, prevMonth - 1, dNum);
      return {
        dayKey: dNum,
        dayNum: dNum,
        month: prevMonth,
        year: prevYear,
        dateObj: dObj,
        isSunday: dObj.getDay() === 0,
        dayOfWeek: dObj.toLocaleDateString("en-US", { weekday: "short" }),
        headerLabel: `${dNum}`,
        headerMonth: prevMonthName,
        headerFull: `${dNum} ${prevMonthName}`,
        isPrevMonth: true,
      };
    });

    // Days from 1st to 15th of selected month
    const curDays = Array.from({ length: 15 }, (_, i) => {
      const dNum = i + 1;
      const dObj = new Date(selectedYear, selectedMonth - 1, dNum);
      return {
        dayKey: dNum,
        dayNum: dNum,
        month: selectedMonth,
        year: selectedYear,
        dateObj: dObj,
        isSunday: dObj.getDay() === 0,
        dayOfWeek: dObj.toLocaleDateString("en-US", { weekday: "short" }),
        headerLabel: `${dNum}`,
        headerMonth: curMonthName,
        headerFull: `${dNum} ${curMonthName}`,
        isPrevMonth: false,
      };
    });

    const days = [...prevDays, ...curDays];
    const totalDays = days.length;
    const pLabel = `16 ${prevMonthName} ${prevYear} - 15 ${curMonthName} ${selectedYear} (Month of ${monthLabel} ${selectedYear})`;
    const pSlip = `16.${String(prevMonth).padStart(2, "0")}.${prevYear} To 15.${String(selectedMonth).padStart(2, "0")}.${selectedYear}`;

    return {
      isCelebrity: true,
      totalDays,
      periodLabel: pLabel,
      periodSlip: pSlip,
      days,
      prevMonthName,
      curMonthName,
    };
  }, [isCelebrity, selectedMonth, selectedYear, monthLabel]);

  const daysInMonth = cycleInfo.totalDays;
  const daysArray = useMemo(() => cycleInfo.days.map((d) => d.dayKey), [cycleInfo]);

  const isSunday = (dayKey: number) => {
    const found = cycleInfo.days.find((d) => d.dayKey === dayKey);
    return found ? found.isSunday : false;
  };

  const getDayOfWeek = (dayKey: number) => {
    const found = cycleInfo.days.find((d) => d.dayKey === dayKey);
    return found ? found.dayOfWeek : "";
  };

  const getDayHeader = (dayKey: number) => {
    const found = cycleInfo.days.find((d) => d.dayKey === dayKey);
    return found ? found.headerFull : String(dayKey);
  };

  // Fetch Guard PIN on load / company change
  useEffect(() => {
    const fetchPin = async () => {
      try {
        const res = await axiosInstance.get(`/public-gate/get-pin?companyId=${companySlug}`);
        if (res.data?.success && res.data.pin) {
          setCompanyGatePin(res.data.pin);
          setNewGatePinInput(res.data.pin);
        }
      } catch (e) {
        // Fallback default PIN
      }
    };
    fetchPin();
  }, [companySlug]);

  const handleSaveGuardPin = async () => {
    if (!newGatePinInput || newGatePinInput.length !== 4 || !/^\d{4}$/.test(newGatePinInput)) {
      alert("Guard PIN must be exactly 4 numeric digits (e.g. 1234).");
      return;
    }
    try {
      setSavingPin(true);
      const companyKey = isCelebrity ? "cbpl" : companyName.toLowerCase().includes("voda") ? "vodabox" : "jubilant";
      const res = await axiosInstance.post("/public-gate/set-pin", {
        companyId: companyKey,
        pin: newGatePinInput,
      });
      if (res.data?.success) {
        setCompanyGatePin(newGatePinInput);
        setStatusMessage({ type: "success", text: `Guard PIN updated successfully to: ${newGatePinInput}` });
        alert(`Guard PIN successfully updated to ${newGatePinInput} for ${companyName}!`);
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Failed to save Guard PIN.");
    } finally {
      setSavingPin(false);
    }
  };

  const parseHourValue = (timeStr: string): number | null => {
    if (!timeStr || !timeStr.trim()) return null;
    const s = timeStr.trim().toUpperCase();
    if (s.includes(":")) {
      const parts = s.split(":");
      let h = parseFloat(parts[0]) || 0;
      let m = 0;
      if (parts[1]) {
        const isPM = parts[1].includes("PM");
        const isAM = parts[1].includes("AM");
        m = parseFloat(parts[1].replace(/[^0-9.]/g, "")) || 0;
        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;
      }
      return h + m / 60;
    }
    const num = parseFloat(s);
    if (!isNaN(num)) return num;
    return null;
  };

  // Calculate work duration and OT (Handles decimal hours e.g. 12, 9.5, 21, as well as 09:30, 17:30)
  const calculatePunchTimes = (inTime: string, outTime: string, shiftStandard: number) => {
    if (!inTime || !outTime) {
      if (inTime) return { totalHours: 0, otHours: 0, status: "P" as const };
      return { totalHours: 0, otHours: 0, status: "A" as const };
    }
    const inH = parseHourValue(inTime);
    let outH = parseHourValue(outTime);
    if (inH === null || outH === null) {
      return { totalHours: 0, otHours: 0, status: "A" as const };
    }
    if (outH < inH) {
      outH += (outH <= 12 && inH <= 12) ? 12 : 24;
    }
    const totalHours = Math.round((outH - inH) * 100) / 100;
    const otHours = Math.round(Math.max(0, totalHours - shiftStandard) * 100) / 100;
    const status: "P" | "HD" | "A" =
      totalHours >= shiftStandard ? "P" : totalHours >= shiftStandard / 2 ? "HD" : totalHours > 0 ? "P" : "A";
    return { totalHours, otHours, status };
  };

  // Helper to persist daily punches to localStorage per day
  const savePunchesToStorage = (day: number, updated: Record<string, any>) => {
    try {
      const storageKey = `hrm_gate_punches_${companyName}_${selectedYear}_${selectedMonth}_day_${day}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
      const cleanComp = isCelebrity ? "celebrity" : companyName;
      fetch("http://localhost:5000/api/v1/public-gate/bulk-punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: cleanComp,
          year: selectedYear,
          month: selectedMonth,
          day,
          punches: updated,
        }),
      }).catch(() => {});
    } catch (e) {}
  };

  // Synchronize daily punches from Backend API / localStorage when worker or day changes
  useEffect(() => {
    if (rows.length === 0) return;
    let isCancelled = false;

    const loadPunches = async () => {
      let backendPunches: Record<string, any> | null = null;
      try {
        const res = await axiosInstance.get(
          `/public-gate/punches?company=${companySlug}&year=${selectedYear}&month=${selectedMonth}&day=${punchDateDay}`
        );
        if (res.data?.data?.punches && Object.keys(res.data.data.punches).length > 0) {
          backendPunches = res.data.data.punches;
        }
      } catch (e) {}

      if (!backendPunches) {
        try {
          const storageKey = `hrm_gate_punches_${companyName}_${selectedYear}_${selectedMonth}_day_${punchDateDay}`;
          const raw = localStorage.getItem(storageKey);
          if (raw) backendPunches = JSON.parse(raw);
        } catch (e) {}
      }

      if (isCancelled) return;

      const dayPunches: Record<string, any> = {};
      rows.forEach((r) => {
        if (backendPunches && backendPunches[r.code]) {
          dayPunches[r.code] = backendPunches[r.code];
        } else {
          const gridVal = attendanceGrid[r.code]?.[punchDateDay] || (isSunday(punchDateDay) ? "WO" : "P");
          if (gridVal === "WO") {
            dayPunches[r.code] = { inTime: "", outTime: "", shiftStandard: shiftStandardHours, totalHours: 0, otHours: 0, status: "WO" };
          } else if (gridVal === "HD") {
            dayPunches[r.code] = { inTime: "09:30", outTime: "13:30", shiftStandard: shiftStandardHours, totalHours: 4, otHours: 0, status: "HD" };
          } else {
            dayPunches[r.code] = { inTime: "", outTime: "", shiftStandard: shiftStandardHours, totalHours: 0, otHours: 0, status: gridVal || "A" };
          }
        }
      });

      setDailyPunches(dayPunches);
    };

    loadPunches();
    return () => { isCancelled = true; };
  }, [punchDateDay, selectedMonth, selectedYear, rows.length, companyName, companySlug]);

  const handleTimeChange = (code: string, field: "inTime" | "outTime", val: string) => {
    setDailyPunches((prev) => {
      const cur = prev[code] || { inTime: "", outTime: "", totalHours: 0, otHours: 0, status: "P" };
      const workerShift = cur.shiftStandard ?? shiftStandardHours;
      const updated = { ...cur, [field]: val };
      const computed = calculatePunchTimes(updated.inTime, updated.outTime, workerShift);
      const nextAll = {
        ...prev,
        [code]: { ...updated, ...computed },
      };
      savePunchesToStorage(punchDateDay, nextAll);
      return nextAll;
    });
  };

  const handleWorkerShiftChange = (code: string, newShift: number) => {
    const shiftVal = isNaN(newShift) || newShift <= 0 ? shiftStandardHours : newShift;
    setDailyPunches((prev) => {
      const cur = prev[code] || { inTime: "09:30", outTime: "17:30", totalHours: 8, otHours: 0, status: "P" };
      const updated = { ...cur, shiftStandard: shiftVal };
      const computed = calculatePunchTimes(updated.inTime, updated.outTime, shiftVal);
      const nextAll = {
        ...prev,
        [code]: { ...updated, ...computed },
      };
      savePunchesToStorage(punchDateDay, nextAll);
      return nextAll;
    });
  };

  const handleWorkerOtChange = (code: string, newOt: number) => {
    const otVal = isNaN(newOt) || newOt < 0 ? 0 : newOt;
    setDailyPunches((prev) => {
      const cur = prev[code] || { inTime: "09:30", outTime: "17:30", totalHours: 8, otHours: 0, status: "P" };
      const updated = { ...cur, otHours: otVal };
      const nextAll = {
        ...prev,
        [code]: updated,
      };
      savePunchesToStorage(punchDateDay, nextAll);
      return nextAll;
    });
  };

  const handleStampCurrentTime = (code: string, field: "inTime" | "outTime") => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    handleTimeChange(code, field, timeStr);
  };

  const handleApplyPreset = (code: string, preset: "standard" | "ot2" | "ot4" | "absent") => {
    const curShift = dailyPunches[code]?.shiftStandard ?? shiftStandardHours;
    let inTime = "09:30";
    const startHour = 9;
    const startMin = 30;
    const normalOutHour = Math.floor(startHour + curShift);
    const normalOutMin = Math.round((startMin + ((curShift % 1) * 60)) % 60);
    let outTime = `${String(normalOutHour).padStart(2, "0")}:${String(normalOutMin).padStart(2, "0")}`;
    if (preset === "ot2") {
      const otHour = normalOutHour + 2;
      outTime = `${String(otHour).padStart(2, "0")}:${String(normalOutMin).padStart(2, "0")}`;
    } else if (preset === "ot4") {
      const otHour = normalOutHour + 4;
      outTime = `${String(otHour).padStart(2, "0")}:${String(normalOutMin).padStart(2, "0")}`;
    } else if (preset === "absent") {
      inTime = "";
      outTime = "";
    }
    const computed = calculatePunchTimes(inTime, outTime, curShift);
    setDailyPunches((prev) => {
      const nextAll = {
        ...prev,
        [code]: { inTime, outTime, shiftStandard: curShift, ...computed },
      };
      savePunchesToStorage(punchDateDay, nextAll);
      return nextAll;
    });
  };

  const handleBulkPunchIn = (time: string = "09:30") => {
    setDailyPunches((prev) => {
      const next = { ...prev };
      rows.forEach((r) => {
        const cur = next[r.code] || { inTime: "", outTime: "", totalHours: 0, otHours: 0, status: "P" };
        const updated = { ...cur, inTime: time };
        const computed = calculatePunchTimes(updated.inTime, updated.outTime, shiftStandardHours);
        next[r.code] = { ...updated, ...computed };
      });
      savePunchesToStorage(punchDateDay, next);
      return next;
    });
    setStatusMessage({ type: "success", text: `Stamped Check-In time (${time}) for all workers.` });
  };

  const handleBulkPunchOut = (time: string = "17:30") => {
    setDailyPunches((prev) => {
      const next = { ...prev };
      rows.forEach((r) => {
        const cur = next[r.code] || { inTime: "09:30", outTime: "", totalHours: 0, otHours: 0, status: "P" };
        const updated = { ...cur, outTime: time };
        const computed = calculatePunchTimes(updated.inTime, updated.outTime, shiftStandardHours);
        next[r.code] = { ...updated, ...computed };
      });
      savePunchesToStorage(punchDateDay, next);
      return next;
    });
    setStatusMessage({ type: "success", text: `Stamped Check-Out time (${time}) for all workers.` });
  };

  const handleBulkAddOt2 = () => {
    const outTime = shiftStandardHours === 9 ? "20:30" : "19:30";
    setDailyPunches((prev) => {
      const next = { ...prev };
      rows.forEach((r) => {
        const cur = next[r.code] || { inTime: "09:30", outTime: "", totalHours: 0, otHours: 0, status: "P" };
        const updated = { ...cur, inTime: cur.inTime || "09:30", outTime };
        const computed = calculatePunchTimes(updated.inTime, updated.outTime, shiftStandardHours);
        next[r.code] = { ...updated, ...computed };
      });
      savePunchesToStorage(punchDateDay, next);
      return next;
    });
    setStatusMessage({ type: "success", text: `Added +2.0 Hours Overtime to all workers for Day ${punchDateDay}.` });
  };

  // Export Today's Gate Log as Excel (.xlsx) for client inspection
  const handleExportTodayGateLogExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const dayHeaderStr = isCelebrity
        ? `${getDayHeader(punchDateDay)} (${getDayOfWeek(punchDateDay)})`
        : `Day ${punchDateDay} - ${monthLabel} ${selectedYear}`;

      const wb = XLSX.utils.book_new();
      const wsData: any[][] = [
        [`${companyName.toUpperCase()} — DAILY SECURITY GATE ATTENDANCE & OVERTIME REGISTER`],
        [`Date: ${dayHeaderStr} | Wage Cycle: ${cycleInfo.periodLabel} | Shift Standard: ${shiftStandardHours} Hours`],
        [`Report Generated: ${new Date().toLocaleString()}`],
        [],
        [
          "SL NO",
          "EMP CODE",
          "EMPLOYEE NAME",
          "DEPARTMENT",
          "DESIGNATION",
          "SHIFT STANDARD (HRS)",
          "CHECK-IN TIME",
          "CHECK-OUT TIME",
          "TOTAL WORKED (HRS)",
          "OVERTIME (HRS)",
          "TODAY STATUS",
          "SECURITY REMARKS / SIGN"
        ]
      ];

      rows.forEach((r, idx) => {
        const p = dailyPunches[r.code] || { inTime: "", outTime: "", totalHours: 0, otHours: 0, status: "A" };
        wsData.push([
          idx + 1,
          r.code,
          r.name,
          r.department || "Production",
          r.designation || "Workman",
          p.shiftStandard ?? shiftStandardHours,
          p.inTime ? (p.inTime.includes(":") ? (Number(p.inTime.split(":")[0]) >= 12 ? `${p.inTime} PM` : `${p.inTime} AM`) : p.inTime) : "--:--",
          p.outTime ? (p.outTime.includes(":") ? (Number(p.outTime.split(":")[0]) >= 12 ? `${p.outTime} PM` : `${p.outTime} AM`) : p.outTime) : "--:--",
          p.totalHours || 0,
          p.otHours || 0,
          p.status,
          p.status === "A" ? "Absent" : p.otHours > 0 ? `OT: +${p.otHours}h` : "Regular Shift"
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, `Gate_Day_${punchDateDay}`);
      const cleanComp = companyName.replace(/[^a-zA-Z0-9]/g, "_");
      XLSX.writeFile(wb, `${cleanComp}_Daily_Gate_Punch_Log_Day_${punchDateDay}_${monthLabel}_${selectedYear}.xlsx`);

      setStatusMessage({
        type: "success",
        text: `Successfully exported today's Gate Log Excel for ${rows.length} workers!`,
      });
    } catch (err: any) {
      console.error("Export error:", err);
      alert("Error generating Gate Log Excel: " + err.message);
    }
  };

  // 1-Click Copy Today's In/Out Punches to Clipboard for Google Sheets (Ctrl+V)
  const handleCopyTodayPunchesToClipboard = async () => {
    try {
      const lines = rows.map((r) => {
        const p = dailyPunches[r.code];
        const inT = p?.inTime || "";
        const outT = p?.outTime || "";
        return `${inT}	${outT}`;
      });
      await navigator.clipboard.writeText(lines.join("\n"));
      setStatusMessage({
        type: "success",
        text: `Copied IN/OUT punches for all ${rows.length} workers! Select cell F5 in your Google Sheet and press Ctrl+V.`,
      });
      alert(
        `📋 Copied IN/OUT punches for all ${rows.length} workers to clipboard!\n\n` +
        `How to paste into Google Sheet in 3 seconds:\n` +
        `1. Open your Google Sheet ('${monthLabel.slice(0, 3)}\'26' tab)\n` +
        `2. Click cell F5 (the first worker's IN TIME cell)\n` +
        `3. Press Ctrl + V\n\n` +
        `All In/Out timestamps will instantly populate!`
      );
    } catch (e: any) {
      alert("Failed to copy to clipboard: " + e.message);
    }
  };

  const handleApplyDayPunchesToMatrix = () => {
    const updatedGrid = { ...attendanceGrid };
    const day = punchDateDay;

    let count = 0;
    Object.entries(dailyPunches).forEach(([code, p]) => {
      if (!updatedGrid[code]) updatedGrid[code] = {};
      updatedGrid[code][day] = p.status;
      count++;
    });

    setAttendanceGrid(updatedGrid);

    const updatedRows = rows.map((r) => {
      let pCount = 0;
      for (const d of daysArray) {
        const val = updatedGrid[r.code]?.[d];
        if (["P", "NP", "FP", "EP", "WO", "CO", "NH", "FH", "EH", "L", "1", "PRESENT"].includes(val)) {
          pCount += 1;
        } else if ([".5A", "A.5", "E.5", "HD", "0.5", "HALF"].includes(val)) {
          pCount += 0.5;
        }
      }
      const punchOt = dailyPunches[r.code]?.otHours || 0;
      const additionalOtDays = Math.round((punchOt / shiftStandardHours) * 100) / 100;
      const updatedOtDays = Math.max(r.otDays, additionalOtDays);

      return recalculateRow({
        ...r,
        presentDays: pCount,
        otDays: updatedOtDays,
      });
    });

    setRows(updatedRows);
    recalculateSummary(updatedRows);

    setStatusMessage({
      type: "success",
      text: `Successfully applied Day ${day} punches to Live Wage Sheet! Updated ${count} workers with real-time Gross, PF, ESI & Slips.`,
    });
  };

  const handleApplyAllCyclePunchesToMatrix = () => {
    const updatedGrid = { ...attendanceGrid };
    const basePunch = dailyPunches;

    // Apply punch status across all days in the cycle
    daysArray.forEach((d) => {
      const sun = isSunday(d);
      rows.forEach((r) => {
        if (!updatedGrid[r.code]) updatedGrid[r.code] = {};
        const p = basePunch[r.code];
        if (sun) {
          updatedGrid[r.code][d] = "WO";
        } else if (p && p.status) {
          updatedGrid[r.code][d] = p.status;
        } else {
          updatedGrid[r.code][d] = "P";
        }
      });
    });

    setAttendanceGrid(updatedGrid);

    const updatedRows = rows.map((r) => {
      let pCount = 0;
      for (const d of daysArray) {
        const val = updatedGrid[r.code]?.[d];
        if (["P", "NP", "FP", "EP", "WO", "CO", "NH", "FH", "EH", "L", "1", "PRESENT"].includes(val)) {
          pCount += 1;
        } else if ([".5A", "A.5", "E.5", "HD", "0.5", "HALF"].includes(val)) {
          pCount += 0.5;
        }
      }
      const punchOtHours = basePunch[r.code]?.otHours || 0;
      const workDaysCount = Math.max(0, pCount - 4);
      const totalOtDays = punchOtHours > 0 
        ? Math.round(((punchOtHours * workDaysCount) / shiftStandardHours) * 10) / 10 
        : r.otDays;

      return recalculateRow({
        ...r,
        presentDays: pCount > 0 ? pCount : r.presentDays,
        otDays: totalOtDays > 0 ? totalOtDays : r.otDays,
      });
    });

    setRows(updatedRows);
    recalculateSummary(updatedRows);

    setStatusMessage({
      type: "success",
      text: `Stamped & applied daily punches across all ${daysArray.length} days of ${isCelebrity ? '16 Sep - 15 Oct' : 'this month'} for ${rows.length} workers! Monthly register & slips updated.`,
    });
  };

  const handleCopyAppsScript = () => {
    const scriptCode = `// =============================================================================
// HRM 1-CLICK CHECK-IN / CHECK-OUT & AUTOMATIC OVERTIME SCRIPT FOR GOOGLE SHEETS
// =============================================================================
function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  var range = e.range;
  var row = range.getRow();
  var col = range.getColumn();
  if (row < 5) return;
  
  var now = new Date();
  var timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "hh:mm a");
  
  // Column 10 (J): PUNCH IN Checkbox
  if (col === 10 && range.getValue() === true) {
    sheet.getRange(row, 4).setValue(timeStr);
    range.setValue(false);
    SpreadsheetApp.getActiveSpreadsheet().toast("✅ Check-in recorded at " + timeStr, "Punch IN", 3);
  }
  
  // Column 11 (K): PUNCH OUT Checkbox
  if (col === 11 && range.getValue() === true) {
    sheet.getRange(row, 5).setValue(timeStr);
    range.setValue(false);
    SpreadsheetApp.getActiveSpreadsheet().toast("✅ Check-out recorded at " + timeStr, "Punch OUT", 3);
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("⚡ HRM Punch Terminal")
    .addItem("📌 Bulk Punch IN All Workers (Now)", "bulkPunchIn")
    .addItem("📌 Bulk Punch OUT All Workers (Now)", "bulkPunchOut")
    .addSeparator()
    .addItem("🔄 Reset All Checkboxes", "resetCheckboxes")
    .addToUi();
}

function bulkPunchIn() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var rows = sheet.getLastRow();
  var now = new Date();
  var timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "hh:mm a");
  for (var r = 5; r <= rows; r++) {
    if (!sheet.getRange(r, 4).getValue()) {
      sheet.getRange(r, 4).setValue(timeStr);
    }
  }
  SpreadsheetApp.getActiveSpreadsheet().toast("Bulk IN complete: " + timeStr);
}

function bulkPunchOut() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var rows = sheet.getLastRow();
  var now = new Date();
  var timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "hh:mm a");
  for (var r = 5; r <= rows; r++) {
    if (!sheet.getRange(r, 5).getValue()) {
      sheet.getRange(r, 5).setValue(timeStr);
    }
  }
  SpreadsheetApp.getActiveSpreadsheet().toast("Bulk OUT complete: " + timeStr);
}

function resetCheckboxes() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var rows = sheet.getLastRow();
  sheet.getRange(5, 10, rows - 4, 2).setValue(false);
  SpreadsheetApp.getActiveSpreadsheet().toast("Checkboxes reset.");
}`;

    navigator.clipboard.writeText(scriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const handleCopyFormula = () => {
    const formulaText = `=IF(OR(ISBLANK(D5), ISBLANK(E5)), 0, ROUND(MAX(0, (E5-D5)*24 - 8), 2))`;
    navigator.clipboard.writeText(formulaText);
    setCopiedFormula(true);
    setTimeout(() => setCopiedFormula(false), 3000);
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
          const celebrityGSheet = "https://docs.google.com/spreadsheets/d/1Kh3ERuDkmhJeQPQtYXqWAaHhTRfYP1cbi6bAuFFDiKI/edit?gid=0#gid=0";
          if (cachedUrl && !cachedUrl.includes("celebrity-brewing-october-2026-demo") && !cachedUrl.toLowerCase().includes("demo")) {
            setGoogleSheetUrl(cachedUrl);
          } else if (cName.toUpperCase().includes("CELEBRITY")) {
            setGoogleSheetUrl(celebrityGSheet);
            localStorage.setItem(`hrm_gsheet_url_${cName}`, celebrityGSheet);
          } else {
            localStorage.removeItem(`hrm_gsheet_url_${cName}`);
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
            const celebrityGSheet = "https://docs.google.com/spreadsheets/d/1Kh3ERuDkmhJeQPQtYXqWAaHhTRfYP1cbi6bAuFFDiKI/edit?gid=0#gid=0";
            if (cachedUrl && !cachedUrl.includes("celebrity-brewing-october-2026-demo") && !cachedUrl.toLowerCase().includes("demo")) {
              setGoogleSheetUrl(cachedUrl);
            } else if (cName.toUpperCase().includes("CELEBRITY")) {
              setGoogleSheetUrl(celebrityGSheet);
              localStorage.setItem(`hrm_gsheet_url_${cName}`, celebrityGSheet);
            } else {
              localStorage.removeItem(`hrm_gsheet_url_${cName}`);
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
          if (d.attendanceGrid && Object.keys(d.attendanceGrid).length > 0) {
            setAttendanceGrid(d.attendanceGrid);
          } else {
            const isCel = (d.company?.name || companyName).toUpperCase().includes("CELEBRITY") ||
              d.rows.some((r: any) => r.code?.toUpperCase().startsWith("CBPL"));
            
            const prevM = m === 1 ? 12 : m - 1;
            const prevY = m === 1 ? y - 1 : y;
            const daysInPrev = new Date(prevY, prevM, 0).getDate();
            
            const activeCycle = isCel
              ? [
                  ...Array.from({ length: daysInPrev - 16 + 1 }, (_, i) => ({
                    dayKey: 16 + i,
                    isSunday: new Date(prevY, prevM - 1, 16 + i).getDay() === 0,
                  })),
                  ...Array.from({ length: 15 }, (_, i) => ({
                    dayKey: i + 1,
                    isSunday: new Date(y, m - 1, i + 1).getDay() === 0,
                  })),
                ]
              : Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => ({
                  dayKey: i + 1,
                  isSunday: new Date(y, m - 1, i + 1).getDay() === 0,
                }));

            const initialGrid: Record<string, Record<number, "P" | "A" | "HD" | "WO">> = {};
            for (const row of d.rows) {
              const workerMap: Record<number, "P" | "A" | "HD" | "WO"> = {};
              const targetPresent = Math.round(row.presentDays ?? 26);
              let pFilled = 0;

              for (const dayItem of activeCycle) {
                if (dayItem.isSunday) {
                  workerMap[dayItem.dayKey] = "WO";
                } else if (pFilled < targetPresent) {
                  workerMap[dayItem.dayKey] = "P";
                  pFilled++;
                } else {
                  workerMap[dayItem.dayKey] = "A";
                }
              }
              initialGrid[row.code] = workerMap;
            }
            setAttendanceGrid(initialGrid);
          }
        }
      }
      await loadSavedSlips(m, y);
    } catch (err: any) {
      console.error("loadAttendanceOrWorkers error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-sync gate punches when Mode 2 is active
  useEffect(() => {
    if (attendanceSourceMode === "terminal" && rows.length > 0) {
      syncGatePunchesToMatrix();
    }
  }, [attendanceSourceMode, selectedMonth, selectedYear, rows.length, companySlug]);

  useEffect(() => {
    loadAttendanceOrWorkers(selectedMonth, selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  // Handle cell edit in Live Grid
  const handleCellChange = (index: number, field: keyof LabourRow, value: any) => {
    const updated = [...rows];
    const cur = { ...updated[index] };
    const num = Number(value) || 0;

    if (field === "rate" || field === "presentDays" || field === "otDays") {
      cur[field] = num;
      const rateVal = Number(cur.rate) || 0;
      const dailyRate = rateVal > 1000 ? rateVal / 26 : rateVal;
      cur.daysAmount = Math.round(Number(cur.presentDays || 0) * dailyRate);
      cur.otAmount = Math.round(Number(cur.otDays || 0) * dailyRate);
      cur.totalGross = Math.round(cur.daysAmount + cur.otAmount);
      cur.pf = Math.round(cur.daysAmount * (globalPfPercent / 100));
      cur.esi = Math.ceil(cur.totalGross * (globalEsiPercent / 100));
      cur.ptax = cur.totalGross >= 10000 ? 110 : 0;
      cur.netPayable = Math.round(cur.totalGross - (cur.pf + cur.esi + cur.ptax));
    } else if (field === "daysAmount") {
      cur.daysAmount = num;
      cur.totalGross = Math.round(cur.daysAmount + (cur.otAmount || 0));
      cur.netPayable = Math.round(cur.totalGross - (cur.pf + cur.esi + cur.ptax));
    } else if (field === "pf" || field === "esi" || field === "ptax") {
      cur[field] = num;
      cur.netPayable = Math.round((cur.totalGross || 0) - (cur.pf + cur.esi + cur.ptax));
    } else {
      (cur as any)[field] = value;
    }

    updated[index] = cur;
    setRows(updated);
    recalculateSummary(updated);
  };

  // Apply Global PF & ESI rates to all workers in the table
  const handleApplyGlobalRates = () => {
    const updated = rows.map((r) => {
      const cur = { ...r };
      const rateVal = Number(cur.rate) || 0;
      const dailyRate = rateVal > 1000 ? rateVal / 26 : rateVal;
      cur.daysAmount = Math.round(Number(cur.presentDays || 0) * dailyRate);
      cur.otAmount = Math.round(Number(cur.otDays || 0) * dailyRate);
      cur.totalGross = Math.round(cur.daysAmount + cur.otAmount);
      cur.pf = Math.round(cur.daysAmount * (globalPfPercent / 100));
      cur.esi = Math.ceil(cur.totalGross * (globalEsiPercent / 100));
      cur.ptax = cur.totalGross >= 10000 ? 110 : 0;
      cur.netPayable = Math.round(cur.totalGross - (cur.pf + cur.esi + cur.ptax));
      return cur;
    });
    setRows(updated);
    recalculateSummary(updated);
    setStatusMessage({
      type: "success",
      text: `Applied Global PF (${globalPfPercent}%) and ESI (${globalEsiPercent}%) to all ${updated.length} workers!`,
    });
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
    for (const d of daysArray) {
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
      for (const d of daysArray) {
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
    setStatusMessage({ type: "success", text: "Set standard 26 present days for all workers!" });
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
      for (const d of daysArray) {
        const st = workerDays[d] || (isSunday(d) ? "WO" : "P");
        if (st === "P" || st === "WO") pCount += 1;
        else if (st === "HD") pCount += 0.5;
      }
      return recalculateRow({ ...r, presentDays: pCount });
    });

    setRows(updatedRows);
    recalculateSummary(updatedRows);
    setStatusMessage({ type: "success", text: `Marked all workers Present for Day ${targetDay}!` });
  };

  const handleMarkSundaysOff = () => {
    const newGrid = { ...attendanceGrid };
    for (const r of rows) {
      const workerMap = { ...(newGrid[r.code] || {}) };
      for (const d of daysArray) {
        if (isSunday(d)) workerMap[d] = "WO";
      }
      newGrid[r.code] = workerMap;
    }
    setAttendanceGrid(newGrid);
    setStatusMessage({ type: "info", text: "Sundays set to Weekly Off (WO)." });
  };

  const handleClearAllAttendance = () => {
    if (!window.confirm("Reset all days in the attendance sheet to Absent for this month?")) return;
    const newGrid: Record<string, Record<number, "P" | "A" | "HD" | "WO">> = {};
    for (const r of rows) {
      const workerMap: Record<number, "P" | "A" | "HD" | "WO"> = {};
      for (const d of daysArray) {
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
    setStatusMessage({ type: "success", text: "Google Sheet link saved successfully!" });
  };

  const handleSyncGoogleSheet = async (overrideUrl?: string) => {
    const rawTarget = overrideUrl !== undefined ? overrideUrl : googleSheetUrl;
    const targetUrl = (rawTarget || "").trim();
    const isDemo =
      !targetUrl ||
      targetUrl === "demo" ||
      targetUrl.toLowerCase() === "demo" ||
      targetUrl.includes("celebrity-brewing-october-2026-demo");

    if (!targetUrl && !isDemo) {
      alert("Please enter a valid Google Sheets share link or click 'Load Sample Data'.");
      return;
    }

    try {
      setSyncingSheet(true);
      setStatusMessage({
        type: "info",
        text: isDemo
          ? "Loading verified sample attendance dataset for 144 workers..."
          : "Connecting to Google Sheet & extracting attendance data...",
      });

      const res = await axiosInstance.post("/labour-wage/import-google-sheet", {
        url: isDemo ? "demo" : targetUrl,
        month: selectedMonth,
        year: selectedYear,
      });

      if (res.data?.success && res.data.data?.rows) {
        const d = res.data.data;
        if (d.rows.length === 0) {
          setStatusMessage({
            type: "warning",
            text: "Google Sheet connected, but 0 workers found! The sheet currently only contains headers.",
          });
          alert(
            "Google Sheet Connected, but 0 Worker Rows Found!\n\n" +
            "Your Google Sheet currently only contains the header line and no worker attendance records.\n\n" +
            "To populate it with Celebrity Brewing's 144 workers in 5 seconds:\n" +
            "1. Click the 'Copy Workers Table' button\n" +
            "2. Open your Google Sheet and click cell A1\n" +
            "3. Press Ctrl + V to paste all 144 workers\n" +
            "4. Return here and click 'Pull & Sync Attendance' again!"
          );
          return;
        }
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
            ? `Successfully loaded verified sample data for ${d.rows.length} workers! Live calculations ready below.`
            : `Successfully synced ${d.rows.length} worker records from Google Sheet! Live preview ready.`,
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

  // Copy Workers TSV for 1-click paste into Google Sheets (Dynamically matches current month & exact days)
  const handleCopyWorkersToClipboard = async () => {
    try {
      if (rows.length === 0) {
        // Fallback to pre-built November TSV
        const res = await fetch("/sample-sheets/Celebrity_Brewing_November_2026_Clipboard.tsv");
        if (!res.ok) throw new Error("Failed to load sample dataset");
        const text = await res.text();
        await navigator.clipboard.writeText(text);
      } else {
        const headerDays = daysArray.map((d) => (isCelebrity ? getDayHeader(d) : `Day ${d}`)).join("\t");
        const headers = `SL NO\tEMP CODE\tEMPLOYEE NAME\tDEPARTMENT\tDESIGNATION\t${headerDays}\tPRESENT DAYS\tOT HRS`;
        
        const tsvRows = rows.map((r, idx) => {
          const workerDays = (attendanceGrid[r.code] || {}) as Record<string | number, any>;
          const dayMarks = daysArray.map((d, sIdx) => {
            return workerDays[d] || workerDays[String(d)] || workerDays[sIdx + 1] || (workerDays as any)[`seq_${sIdx + 1}`] || (isSunday(d) ? "WO" : "P");
          }).join("\t");
          return `${idx + 1}\t${r.code}\t${r.name}\t${r.department || "General"}\t${r.designation || "Workman"}\t${dayMarks}\t${r.presentDays}\t${r.otDays || 0}`;
        });

        const fullTsv = [headers, ...tsvRows].join("\n");
        await navigator.clipboard.writeText(fullTsv);
      }

      setStatusMessage({
        type: "success",
        text: `Copied muster register table with ${rows.length || 154} workers to clipboard! Open your Google Sheet, click cell A1, and press Ctrl + V.`,
      });
      alert(
        `Copied Workers Attendance Table to Clipboard!\n\n` +
        `Next Steps in Google Sheets:\n` +
        `1. Open your Google Sheet\n` +
        `2. Click cell A1\n` +
        `3. Press Ctrl + V (all workers and columns ${isCelebrity ? "16-Oct..15-Nov" : "Day 1..31"} will paste cleanly!)\n` +
        `4. Edit any worker's P / A / WO / HD status\n` +
        `5. Return here & click 'Pull & Sync Attendance'!`
      );
    } catch (e: any) {
      alert("Failed to copy table: " + e.message);
    }
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("docs.google.com/spreadsheets")) {
      return url.replace(/\/edit.*$/, "/htmlembed?widget=true");
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

  // Export Single Worker Form XIX Statutory Wage Slip (CSV)
  const handleExportFormXixSingleCSV = (worker: LabourRow | SalarySlipData) => {
    const isCelebrity = companyName.toLowerCase().includes("celebrity");
    const periodEndingStr = isCelebrity
      ? `15/${String(monthLabel.toLowerCase().includes("oct") ? 10 : 9).padStart(2, "0")}/${selectedYear}`
      : `${new Date(selectedYear, selectedMonth, 0).getDate()}/${String(selectedMonth).padStart(2, "0")}/${selectedYear}`;

    const rateVal = Number(worker.rate) || 0;
    const dailyRate = rateVal > 1000 ? Math.round((rateVal / 26) * 100) / 100 : rateVal;
    const basicWage = Number((worker as any).daysAmount ?? (worker as any).basicAmount ?? 0);
    const otWage = Number(worker.otAmount || 0);
    const grossWage = Number((worker as any).totalGross ?? (worker as any).totalEarnings ?? (basicWage + otWage));
    const pfWage = Number((worker as any).pf ?? (worker as any).providentFund ?? 0);
    const esiWage = Number(worker.esi || 0);
    const ptaxWage = Number((worker as any).ptax ?? (worker as any).professionalTax ?? 0);
    const totalDeductions = pfWage + esiWage + ptaxWage;
    const netWage = Number(worker.netPayable ?? (grossWage - totalDeductions));
    const words = (worker as any).amountInWords || numberToIndianWords(netWage);

    const csvLines = [
      `"FORM XIX - [See Rule 78(1)(b)] - WAGE SLIP"`,
      `"Name and address of Contractor:","${companyName}, ${companyAddress || "Industrial Area, West Bengal"}"`,
      `"Name and father's / husband's name of the workman:","${worker.name} (C/O ${worker.fatherName || "N/A"})"`,
      `"Employee Code:","${worker.code}"`,
      `"Nature and location of work:","${worker.designation || "Workman"} - ${companyAddress || "Brewery Plant"}"`,
      `"For the week / fortnight / month ending:","${periodEndingStr}"`,
      `""`,
      `"Statutory Item No.","Statutory Description","Value / Breakdown","Amount (Rs.)"`,
      `"1.","Number of days worked","${worker.presentDays} Days",""`,
      `"2.","Number of units worked in case of piece rate workers","N/A (Time Rated)",""`,
      `"3.","Rate of daily wages / piece rate","Rs. ${dailyRate.toFixed(2)} / Day (Wage Rate: Rs. ${rateVal})","${dailyRate.toFixed(2)}"`,
      `"4.","Amount of overtime wages","${worker.otDays || 0} OT Days","${otWage.toFixed(2)}"`,
      `"5.","Gross wages payable","Basic: Rs. ${basicWage} + OT: Rs. ${otWage}","${grossWage.toFixed(2)}"`,
      `"6.","Deductions: Provident Fund (PF)","12% PF Contribution","${pfWage.toFixed(2)}"`,
      `"6.","Deductions: ESI","0.75% ESI Contribution","${esiWage.toFixed(2)}"`,
      `"6.","Deductions: Professional Tax (P-Tax)","W.B. Professional Tax","${ptaxWage.toFixed(2)}"`,
      `"6.","Total Deductions","Sum of All Statutory Deductions","${totalDeductions.toFixed(2)}"`,
      `"7.","Net amount of wages paid","${words}","${netWage.toFixed(2)}"`,
      `""`,
      `"Initials of the Contractor or his representative","","Signature / Thumb impression of the Workman",""`,
    ];

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Form_XIX_Wage_Slip_${worker.code}_${monthLabel}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Bulk All Workers Form XIX Statutory Wage Slips (CSV)
  const handleExportFormXixBulkCSV = () => {
    const dataRows = savedSlips.length > 0 ? savedSlips : rows;
    if (dataRows.length === 0) {
      alert("No wage data available to export Form XIX CSV.");
      return;
    }

    const isCelebrity = companyName.toLowerCase().includes("celebrity");
    const periodEndingStr = isCelebrity
      ? `15/${String(monthLabel.toLowerCase().includes("oct") ? 10 : 9).padStart(2, "0")}/${selectedYear}`
      : `${new Date(selectedYear, selectedMonth, 0).getDate()}/${String(selectedMonth).padStart(2, "0")}/${selectedYear}`;

    const headers = [
      "Sl No.",
      "Contractor Name",
      "Employee Code",
      "Workman Name",
      "Father / Husband Name",
      "Designation / Nature of Work",
      "Wage Period Ending",
      "1. Days Worked",
      "2. Piece Rate Units",
      "3. Daily Wage Rate (Rs)",
      "Monthly Wage Rate (Rs)",
      "4. Overtime Wages (Rs)",
      "5. Gross Wages Payable (Rs)",
      "6. Deduction PF (Rs)",
      "6. Deduction ESI (Rs)",
      "6. Deduction PTax (Rs)",
      "6. Total Deductions (Rs)",
      "7. Net Wages Paid (Rs)",
      "ESIC / IP No",
    ];

    const csvRows = [headers.join(",")];

    dataRows.forEach((r: any, idx) => {
      const rateVal = Number(r.rate) || 0;
      const dailyRate = rateVal > 1000 ? Math.round((rateVal / 26) * 100) / 100 : rateVal;
      const basicWage = Number(r.daysAmount ?? r.basicAmount ?? 0);
      const otWage = Number(r.otAmount || 0);
      const grossWage = Number(r.totalGross ?? r.totalEarnings ?? basicWage + otWage);
      const pfWage = Number(r.pf ?? r.providentFund ?? 0);
      const esiWage = Number(r.esi || 0);
      const ptaxWage = Number(r.ptax ?? r.professionalTax ?? 0);
      const totalDed = pfWage + esiWage + ptaxWage;
      const netWage = Number(r.netPayable ?? grossWage - totalDed);

      const row = [
        idx + 1,
        `"${companyName}"`,
        `"${r.code}"`,
        `"${r.name}"`,
        `"${r.fatherName || ""}"`,
        `"${r.designation || "Workman"}"`,
        `"${periodEndingStr}"`,
        r.presentDays,
        '"N/A"',
        dailyRate.toFixed(2),
        rateVal.toFixed(2),
        otWage.toFixed(2),
        grossWage.toFixed(2),
        pfWage.toFixed(2),
        esiWage.toFixed(2),
        ptaxWage.toFixed(2),
        totalDed.toFixed(2),
        netWage.toFixed(2),
        `"${r.esicNo || ""}"`,
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Form_XIX_Bulk_Wage_Slips_${monthLabel}_${selectedYear}.csv`);
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
          text: `Successfully saved ${rows.length} worker wage records for ${monthLabel} ${selectedYear}! Slips are now ready.`,
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
    const confirmMsg = `ARE YOU SURE?\n\nDo you want to permanently delete all saved wage records and salary slips for ${monthLabel} ${selectedYear} for ${companyName}?\n\nThis will completely clear this month's payroll so you can upload fresh or re-test with dummy sheets.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setLoading(true);
      setStatusMessage({ type: "info", text: `Deleting wage records for ${monthLabel} ${selectedYear}...` });

      const res = await axiosInstance.delete(`/labour-wage/month?month=${selectedMonth}&year=${selectedYear}`);

      if (res.data?.success) {
        setStatusMessage({
          type: "success",
          text: `Successfully deleted all wage records for ${monthLabel} ${selectedYear}! Month reset to clean state.`,
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
          text: `Deleted salary slip for ${slip.name} (${slip.code}).`,
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
      const confirmMsg = `ARE YOU SURE?\n\nDo you want to permanently delete all saved wage records for ${monthLabel} ${selectedYear} for ${companyName} from the database?\n\nThis will completely reset this month's payroll so you can upload fresh or re-test with dummy sheets.`;
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
  // STATUTORY FORM XIX & SALARY SLIP PRINT ENGINE (2 SLIPS PER A4 PAGE)
  // =========================================================================
  const generateFormXixHtml = (s: SalarySlipData | LabourRow): string => {
    const isCelebrity = companyName.toLowerCase().includes("celebrity");
    const periodEndingStr = isCelebrity
      ? `15/${String(monthLabel.toLowerCase().includes("oct") ? 10 : 9).padStart(2, "0")}/${selectedYear}`
      : `${new Date(selectedYear, selectedMonth, 0).getDate()}/${String(selectedMonth).padStart(2, "0")}/${selectedYear}`;

    const rateVal = Number(s.rate) || 0;
    const dailyRate = rateVal > 1000 ? Math.round((rateVal / 26) * 100) / 100 : rateVal;
    const basicWage = Number((s as any).daysAmount ?? (s as any).basicAmount ?? 0);
    const otWage = Number(s.otAmount || 0);
    const grossWage = Number((s as any).totalGross ?? (s as any).totalEarnings ?? basicWage + otWage);
    const pfWage = Number((s as any).pf ?? (s as any).providentFund ?? 0);
    const esiWage = Number(s.esi || 0);
    const ptaxWage = Number((s as any).ptax ?? (s as any).professionalTax ?? 0);
    const totalDeductions = pfWage + esiWage + ptaxWage;
    const netWage = Number(s.netPayable ?? grossWage - totalDeductions);
    const fatherDisplay = s.fatherName ? s.fatherName.replace(/^C\/O\s+/i, "") : "N/A";
    const words = (s as any).amountInWords || numberToIndianWords(netWage);

    return `
      <div class="xix-slip-box">
        <div class="xix-hdr">
          <div class="xix-t1">FORM “XIX”</div>
          <div class="xix-t2">[See Rule 78(1)(b)]</div>
          <div class="xix-t3">Wage Slip</div>
        </div>

        <div class="xix-fields">
          <div class="xix-field-line">
            <span class="x-lbl">Name and address of Contractor:</span>
            <span class="x-val"><strong>${companyName}</strong>, ${companyAddress || "Industrial Area, West Bengal"}</span>
          </div>
          <div class="xix-field-line">
            <span class="x-lbl">Name and father’s / husband’s name of the workman:</span>
            <span class="x-val"><strong>${s.name}</strong> (C/O ${fatherDisplay}) &nbsp;<span class="x-code">[Emp Code: <strong>${s.code}</strong>]</span></span>
          </div>
          <div class="xix-field-line">
            <span class="x-lbl">Nature and location of work:</span>
            <span class="x-val">${s.designation || "Workman"} &mdash; Factory / Brewery Plant, West Bengal</span>
          </div>
          <div class="xix-field-line">
            <span class="x-lbl">For the week / fortnight / month ending:</span>
            <span class="x-val"><strong>${periodEndingStr}</strong> (${monthLabel} ${selectedYear})</span>
          </div>
        </div>

        <div class="xix-points">
          <div class="x-point-row">
            <span class="xp-lbl">1. Number of days worked:</span>
            <span class="xp-dots">....................................................................................</span>
            <span class="xp-val"><strong>${s.presentDays} Days</strong></span>
          </div>
          <div class="x-point-row">
            <span class="xp-lbl">2. Number of units worked in case of piece rate workers:</span>
            <span class="xp-dots">....................................................................................</span>
            <span class="xp-val">N/A (Time Rated)</span>
          </div>
          <div class="x-point-row">
            <span class="xp-lbl">3. Rate of daily wages / piece rate:</span>
            <span class="xp-dots">....................................................................................</span>
            <span class="xp-val">Rs. ${dailyRate.toFixed(2)} / Day <small>(Rate: Rs. ${rateVal.toLocaleString("en-IN")})</small></span>
          </div>
          <div class="x-point-row">
            <span class="xp-lbl">4. Amount of overtime wages:</span>
            <span class="xp-dots">....................................................................................</span>
            <span class="xp-val">Rs. ${otWage.toFixed(2)} ${s.otDays > 0 ? `(${s.otDays} OT Days)` : ""}</span>
          </div>
          <div class="x-point-row">
            <span class="xp-lbl">5. Gross wages payable:</span>
            <span class="xp-dots">....................................................................................</span>
            <span class="xp-val"><strong>Rs. ${grossWage.toFixed(2)}</strong></span>
          </div>
          <div class="x-point-row">
            <span class="xp-lbl">6. Deductions, if any:</span>
            <span class="xp-dots">....................................................................................</span>
            <span class="xp-val">PF: Rs.${pfWage} | ESI: Rs.${esiWage} | PTax: Rs.${ptaxWage} &nbsp;<strong>(Total: Rs.${totalDeductions})</strong></span>
          </div>
          <div class="x-point-row net-pt">
            <span class="xp-lbl">7. Net amount of wages paid:</span>
            <span class="xp-dots">....................................................................................</span>
            <span class="xp-val net-val">Rs. ${netWage.toFixed(2)}</span>
          </div>
          <div class="x-words">
            <strong>Amount in Words:</strong> ${words}
          </div>
        </div>

        <div class="xix-foot">
          <div class="x-sig-side">
            <div class="x-sig-line"></div>
            <div class="x-sig-txt">Initials of the Contractor or his representative</div>
          </div>
          <div class="x-sig-side">
            <div class="x-sig-line"></div>
            <div class="x-sig-txt">Signature / Thumb impression of the Workman</div>
          </div>
        </div>
      </div>
    `;
  };

  const printSlipsCleanly = (slipsToPrint: (SalarySlipData | LabourRow)[], title: string) => {
    if (slipsToPrint.length === 0) return;

    const printWin = window.open("", "_blank", "width=920,height=900");
    if (!printWin) {
      alert("Please allow popups in your browser to print salary slips.");
      return;
    }

    let pagesHtml = "";

    // If single slip, print on 1 clean half/full page
    if (slipsToPrint.length === 1) {
      pagesHtml = `
        <div class="single-slip-wrapper">
          ${generateFormXixHtml(slipsToPrint[0])}
        </div>
      `;
    } else {
      // Bulk Printing: EXACTLY 2 SLIPS PER A4 PAGE WITH CUTTING GUIDE
      for (let i = 0; i < slipsToPrint.length; i += 2) {
        const slip1 = slipsToPrint[i];
        const slip2 = slipsToPrint[i + 1];

        pagesHtml += `
          <div class="a4-sheet-pair">
            <div class="slip-half">${generateFormXixHtml(slip1)}</div>
            <div class="cut-guide">
              <div class="cut-dash"></div>
              <div class="cut-text">✂ - - - - - - - - - - - - - - CUT HERE / কাটিং লাইন - - - - - - - - - - - - - - ✂</div>
              <div class="cut-dash"></div>
            </div>
            <div class="slip-half">${slip2 ? generateFormXixHtml(slip2) : '<div class="empty-slip-filler"></div>'}</div>
          </div>
        `;
      }
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
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
          .a4-sheet-pair {
            height: 284mm;
            max-height: 284mm;
            page-break-after: always;
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
          }
          .a4-sheet-pair:last-child {
            page-break-after: auto;
          }
          .slip-half {
            height: 135mm;
            max-height: 135mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
          }
          .single-slip-wrapper {
            max-width: 194mm;
            margin: 10mm auto;
            height: 135mm;
          }
          .xix-slip-box {
            border: 1.5px solid #000;
            padding: 8px 14px;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
            background: #fff;
          }
          .xix-hdr {
            text-align: center;
            border-bottom: 1.5px solid #000;
            padding-bottom: 4px;
            margin-bottom: 6px;
          }
          .xix-t1 {
            font-size: 15px;
            font-weight: 900;
            letter-spacing: 0.5px;
          }
          .xix-t2 {
            font-size: 11px;
            font-weight: 700;
            margin: 1px 0;
          }
          .xix-t3 {
            font-size: 12.5px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .xix-fields {
            margin-bottom: 6px;
            display: flex;
            flex-direction: column;
            gap: 3px;
            font-size: 10.5px;
          }
          .xix-field-line {
            display: flex;
            align-items: baseline;
          }
          .x-lbl {
            font-weight: 700;
            width: 280px;
            flex-shrink: 0;
          }
          .x-dots {
            margin: 0 6px;
          }
          .x-val {
            flex: 1;
            border-bottom: 1px dotted #555;
            padding-bottom: 1px;
          }
          .x-code {
            color: #333;
          }
          .xix-points {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 6px 0;
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 10.5px;
          }
          .x-point-row {
            display: flex;
            align-items: center;
          }
          .xp-lbl {
            font-weight: 700;
            width: 290px;
            flex-shrink: 0;
          }
          .xp-dots {
            flex: 1;
            color: #999;
            font-size: 9px;
            overflow: hidden;
            white-space: nowrap;
            letter-spacing: 2px;
          }
          .xp-val {
            flex-shrink: 0;
            text-align: right;
            min-width: 130px;
          }
          .net-pt {
            background: #f1f5f9;
            padding: 2px 4px;
            border-radius: 4px;
          }
          .net-val {
            font-size: 13px;
            font-weight: 900;
            color: #000;
          }
          .x-words {
            font-size: 10px;
            padding-top: 2px;
          }
          .xix-foot {
            margin-top: 10px;
            display: flex;
            justify-content: space-between;
          }
          .x-sig-side {
            width: 44%;
            text-align: center;
          }
          .x-sig-line {
            border-bottom: 1.5px solid #000;
            height: 24px;
            margin-bottom: 3px;
          }
          .x-sig-txt {
            font-size: 9.5px;
            font-weight: 700;
          }
          .cut-guide {
            height: 8mm;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-size: 9px;
            font-weight: 700;
            color: #444;
          }
          .cut-dash {
            flex: 1;
            border-bottom: 1px dashed #666;
          }
          .cut-text {
            padding: 0 10px;
            white-space: nowrap;
          }
          .empty-slip-filler {
            height: 100%;
          }
        </style>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 300);
          };
        </script>
      </head>
      <body>
        ${pagesHtml}
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
            {isCelebrity && (
              <div style={{
                marginTop: "10px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)",
                border: "1px solid #bfdbfe",
                borderRadius: "9999px",
                padding: "6px 16px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#1e40af",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
              }}>
                <span>Custom Payout Cycle:</span>
                <span style={{ color: "#0f172a", fontWeight: 700 }}>{cycleInfo.periodLabel}</span>
              </div>
            )}
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
                  {MONTHS.map((m) => {
                    const prevShort = MONTHS.find((p) => p.value === (m.value === 1 ? 12 : m.value - 1))?.short || "Prev";
                    return (
                      <option key={m.value} value={m.value}>
                        {isCelebrity
                          ? `Daily Onroll: 16 ${prevShort} - 15 ${m.short} (Month of ${m.label})`
                          : m.label}
                      </option>
                    );
                  })}
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

        {/* Attendance Source Mode Switcher Bar */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "10px 16px",
            marginBottom: "14px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
              Attendance Source Mode:
            </span>
            <div style={{ display: "inline-flex", borderRadius: "8px", padding: "3px", backgroundColor: "#e2e8f0", gap: "4px" }}>
              <button
                type="button"
                onClick={() => handleSetAttendanceMode("sheet")}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: attendanceSourceMode === "sheet" ? 800 : 600,
                  backgroundColor: attendanceSourceMode === "sheet" ? "#0284c7" : "transparent",
                  color: attendanceSourceMode === "sheet" ? "#ffffff" : "#475569",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                Mode 1: Cloud Google Sheets / Excel (Muster Matrix)
              </button>
              <button
                type="button"
                onClick={() => handleSetAttendanceMode("terminal")}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: attendanceSourceMode === "terminal" ? 800 : 600,
                  backgroundColor: attendanceSourceMode === "terminal" ? "#059669" : "transparent",
                  color: attendanceSourceMode === "terminal" ? "#ffffff" : "#475569",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                Mode 2: Security Gate Terminal (Check-in/Out &amp; OT)
              </button>
            </div>
          </div>

          <div style={{ fontSize: "12px" }}>
            {attendanceSourceMode === "sheet" ? (
              <span style={{ color: "#0369a1", fontWeight: 600 }}>
                ✓ Mode 1 Active: Attendance &amp; Paid Days calculated from Cloud Google Sheets / Excel Import.
              </span>
            ) : (
              <span style={{ color: "#047857", fontWeight: 600 }}>
                ✓ Mode 2 Active: Attendance &amp; Overtime driven by Security Gate Terminal punches.
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs (All 4 Tabs Fully Restored) */}
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
            <span>2. Processed Slips &amp; Bulk Print (Form XIX)</span>
            {savedSlips.length > 0 && <span className="tab-count-badge green">{savedSlips.length} Slips</span>}
          </button>

          <button
            className={`tab-btn ${activeTab === "import" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("import")}
          >
            <UploadCloud size={16} />
            <span>3. Import Excel / CSV File</span>
            <span className="tab-count-badge blue">XLSX / CSV</span>
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
                        {isCelebrity
                          ? `16 ${MONTHS.find((p) => p.value === (m.value === 1 ? 12 : m.value - 1))?.short} - 15 ${m.short}`
                          : `${m.short} '${String(selectedYear).slice(2)}`}
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

            {/* Mode-Specific Hub: Gate Terminal Hub (Mode 2) vs Google Sheets Hub (Mode 1) */}
            {attendanceSourceMode === "terminal" && (
              <div
                style={{
                  background: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
                  borderRadius: "14px",
                  padding: "18px 22px",
                  marginBottom: "20px",
                  boxShadow: "0 4px 14px rgba(6, 78, 59, 0.3)",
                  color: "#ffffff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "46px",
                        height: "46px",
                        borderRadius: "12px",
                        backgroundColor: "rgba(255, 255, 255, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ShieldCheck size={24} className="text-emerald-300" />
                    </div>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>FACTORY SECURITY GATE TERMINAL &amp; WAGE SYNC HUB (MODE 2 ACTIVE)</span>
                        <span
                          style={{
                            fontSize: "11px",
                            backgroundColor: "#10b981",
                            color: "#022c22",
                            fontWeight: 900,
                            padding: "2px 8px",
                            borderRadius: "9999px",
                          }}
                        >
                          LIVE GATE PUNCHES
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#a7f3d0", marginTop: "4px" }}>
                        Daily Attendance &amp; Overtime are dynamically calculated from Security Gate Terminal check-in/out stamps.
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => syncGatePunchesToMatrix()}
                      disabled={syncingGate}
                      style={{
                        backgroundColor: "#10b981",
                        color: "#022c22",
                        fontWeight: 800,
                        fontSize: "12px",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                      }}
                      title="Fetch all punches across the entire month from Gate Terminal in 1 click and update wage calculations"
                    >
                      <RefreshCw size={14} className={syncingGate ? "spin" : ""} />
                      <span>{syncingGate ? "Syncing Month..." : "Sync Gate Punches Now"}</span>
                    </button>

                    <a
                      href={`/gate-terminal/${companySlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        backgroundColor: "#1e293b",
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: "12px",
                        padding: "8px 14px",
                        borderRadius: "8px",
                        border: "1px solid #334155",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                      }}
                      title="Open Security Guard Gate Terminal in new tab"
                    >
                      <ExternalLink size={14} />
                      <span>Open Guard Station</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleResetGatePunches(false)}
                      style={{
                        backgroundColor: "#334155",
                        color: "#f87171",
                        fontWeight: 700,
                        fontSize: "12px",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #475569",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                      title={`Reset check-in/out timestamps for Day ${punchDateDay}`}
                    >
                      <RotateCcw size={14} />
                      <span>Reset Day {punchDateDay}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleResetGatePunches(true)}
                      style={{
                        backgroundColor: "#7f1d1d",
                        color: "#fecaca",
                        fontWeight: 700,
                        fontSize: "12px",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #991b1b",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                      title="Clear all gate test punches for this entire month back to clean slate"
                    >
                      <Trash2 size={14} />
                      <span>Clear Test Punches</span>
                    </button>
                  </div>
                </div>

                {/* Admin PIN Setup & Guard URL Controls */}
                <div
                  style={{
                    backgroundColor: "rgba(0, 0, 0, 0.25)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    marginTop: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "12px", color: "#cbd5e1" }}>
                      Public Portal Link:{" "}
                      <strong
                        style={{
                          color: "#34d399",
                          fontFamily: "monospace",
                          backgroundColor: "#0f172a",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          border: "1px solid #334155",
                        }}
                      >
                        /gate-terminal/{companySlug}
                      </strong>
                    </span>
                    <span>•</span>
                    <span style={{ fontSize: "12px", color: "#cbd5e1" }}>
                      Current Guard PIN:{" "}
                      <strong
                        style={{
                          color: "#fbbf24",
                          fontFamily: "monospace",
                          backgroundColor: "rgba(251, 191, 36, 0.2)",
                          border: "1px solid rgba(251, 191, 36, 0.4)",
                          padding: "2px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        {companyGatePin}
                      </strong>
                    </span>
                    <span>•</span>
                    <span style={{ fontSize: "11px", color: "#6ee7b7", fontWeight: 600 }}>
                      Auto-Persists Punches to Database &amp; Monthly Wages
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    {/* Guard PIN Edit Box */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#0f172a", padding: "4px 8px", borderRadius: "8px", border: "1px solid #334155" }}>
                      <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>Set PIN:</span>
                      <input
                        type="text"
                        maxLength={4}
                        value={newGatePinInput}
                        onChange={(e) => setNewGatePinInput(e.target.value.replace(/\D/g, ""))}
                        style={{
                          width: "58px",
                          textAlign: "center",
                          backgroundColor: "#1e293b",
                          color: "#fbbf24",
                          fontWeight: 900,
                          fontSize: "13px",
                          border: "1px solid #475569",
                          borderRadius: "4px",
                          padding: "2px 4px",
                        }}
                        placeholder="PIN"
                      />
                      <button
                        type="button"
                        onClick={handleSaveGuardPin}
                        disabled={savingPin}
                        style={{
                          backgroundColor: "#3b82f6",
                          color: "#ffffff",
                          fontWeight: 700,
                          fontSize: "11px",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        {savingPin ? "..." : "Save PIN"}
                      </button>
                    </div>

                    <button
                      type="button"
                      style={{
                        backgroundColor: "#059669",
                        color: "#ffffff",
                        fontWeight: 700,
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border: "1px solid #10b981",
                        fontSize: "11px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        const gateUrl = `${window.location.origin}/gate-terminal/${companySlug}`;
                        navigator.clipboard.writeText(gateUrl);
                        alert(`Copied Security Gate URL to clipboard!\n\nDirect Link for Guard:\n${gateUrl}\n\nSecurity Guard PIN: ${companyGatePin}`);
                      }}
                      title="Copy direct portal link to share with guard via WhatsApp or SMS"
                    >
                      <Copy size={13} /> Copy Guard Link
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    borderTop: "1px solid rgba(255, 255, 255, 0.15)",
                    marginTop: "12px",
                    paddingTop: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    fontSize: "12px",
                    color: "#d1fae5",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#34d399", display: "inline-block" }}></span>
                    <span>Database Synced: <strong>{companyName}</strong></span>
                    <span>•</span>
                    <span>Guard Station: <strong>/gate-terminal/{companySlug}</strong></span>
                    <span>•</span>
                    <span>Guard PIN: <strong>{companyGatePin}</strong></span>
                  </div>
                  <div>
                    Punched Days Recorded in Cycle: <strong>{Object.keys(gateMonthData).length} Day(s)</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Google Sheets / Cloud Spreadsheet Sync Hub (Mode 1 Only) */}
            {attendanceSourceMode === "sheet" && (
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
                      className="btn-gsheet-action copy-btn"
                      onClick={handleCopyWorkersToClipboard}
                      title="Copy 144 workers attendance grid to clipboard for 1-click Ctrl+V paste into Google Sheets"
                    >
                      <FileSpreadsheet size={14} /> <span>1-Click Copy Workers (Ctrl+V)</span>
                    </button>

                    <a
                      href={
                        isCelebrity
                          ? "/sample-sheets/Celebrity_Brewing_November_2026_Muster_Register.xlsx"
                          : "/sample-sheets/Master_12_Months_Security_Gate_Punch_Standard_2026.xlsx"
                      }
                      download={
                        isCelebrity
                          ? "Celebrity_Brewing_November_2026_Muster_Register.xlsx"
                          : "Monthly_Muster_Register_2026.xlsx"
                      }
                      className="btn-gsheet-action download-btn"
                      title={`Download verified single-month Muster Register (.xlsx) for ${companyName}`}
                    >
                      <Download size={14} /> <span>Download Nov 2026 Register (.xlsx)</span>
                    </a>

                    <button
                      type="button"
                      className="btn-gsheet-action demo-btn"
                      onClick={handleLoadDemoGoogleSheet}
                      disabled={syncingSheet}
                      title="Load verified sample attendance dataset for 144 workers"
                    >
                      <Sparkles size={14} /> <span>Load Sample Data (144 Workers)</span>
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
                        <span>Paste the link in the box above &amp; click <strong>&quot;Pull &amp; Sync Attendance&quot;</strong>! All 144 workers &amp; Form XVII wages will sync in real time.</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

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
                  onClick={handleDeleteMonthData}
                  title="Permanently clear and reset all wage records for this month"
                >
                  <Trash2 size={14} /> Clear / Reset Month Data
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
                  className="btn-export-xix-bulk"
                  onClick={handleExportFormXixBulkCSV}
                  title="Export Statutory Form XIX Wage Slips for All Workers (Bulk CSV)"
                >
                  <Download size={14} /> Export Form XIX (Bulk CSV)
                </button>
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
                  <span>Wages &amp; Salary Register</span>
                  <span className="view-mode-tag">Fits on Screen</span>
                </button>
                <button
                  type="button"
                  className={`view-mode-btn ${viewMode === "attendance" ? "active" : ""}`}
                  onClick={() => setViewMode("attendance")}
                  title="Focus on Day 1 to 31 Attendance Ticks"
                >
                  <Calendar size={15} />
                  <span>Daily Attendance Matrix {isCelebrity ? "(16 Sep – 15 Oct)" : `(1–${daysInMonth})`}</span>
                </button>
                <button
                  type="button"
                  className={`view-mode-btn ${viewMode === "full" ? "active" : ""}`}
                  onClick={() => setViewMode("full")}
                  title="View all Attendance and Wage columns side-by-side"
                >
                  <SlidersHorizontal size={15} />
                  <span>Full Combined Register</span>
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

            {/* Quick Rate & Statutory Deduction Controls Bar */}
            <div className="quick-rate-controls-bar">
              <div className="controls-left-group">
                <div className="control-item">
                  <SlidersHorizontal size={15} className="text-blue-600" />
                  <span className="font-bold text-slate-800">Quick Wage Controls:</span>
                </div>
                <div className="control-item">
                  <label>PF %:</label>
                  <input
                    type="number"
                    step="0.5"
                    className="control-input"
                    value={globalPfPercent}
                    onChange={(e) => setGlobalPfPercent(Number(e.target.value))}
                  />
                </div>
                <div className="control-item">
                  <label>ESI %:</label>
                  <input
                    type="number"
                    step="0.25"
                    className="control-input"
                    value={globalEsiPercent}
                    onChange={(e) => setGlobalEsiPercent(Number(e.target.value))}
                  />
                </div>
                <button
                  type="button"
                  className="btn-apply-rates"
                  onClick={handleApplyGlobalRates}
                  title="Apply global PF% and ESI% to all workers in the table"
                >
                  <Sparkles size={13} /> Apply to All Workers
                </button>
              </div>
              <div className="controls-right-group">
                <span className="text-xs text-slate-600">
                  <strong>Live In-Table Editing:</strong> You can directly edit Rate, Days, OT, Basic, PF, ESI, or PTax in each row below!
                </span>
              </div>
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
                      <Sparkles size={16} /> 1-Click Load October 2026 Sample (144 Workers)
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
                                title="Edit Monthly/Daily Wage Rate"
                              />
                            </td>
                            <td className="col-pdays text-center">
                              <input
                                type="number"
                                step="0.5"
                                className="input-num-cell pdays font-bold text-blue-700 bg-blue-50/60 text-center"
                                value={r.presentDays}
                                onChange={(e) => handleCellChange(idx, "presentDays", Number(e.target.value))}
                                title="Edit Present Days"
                              />
                            </td>
                            <td className="col-ot text-center">
                              <input
                                type="number"
                                step="0.5"
                                className="input-num-cell ot text-center font-bold text-amber-700 bg-amber-50/60"
                                value={r.otDays}
                                onChange={(e) => handleCellChange(idx, "otDays", Number(e.target.value))}
                                title="Edit Overtime Days"
                              />
                            </td>
                            <td className="col-daysamt text-right font-mono">
                              <input
                                type="number"
                                className="input-num-cell daysamt text-right font-mono"
                                value={r.daysAmount}
                                onChange={(e) => handleCellChange(idx, "daysAmount", Number(e.target.value))}
                                title="Edit Basic Wages"
                              />
                            </td>
                            <td className="col-otamt text-right font-mono">₹{r.otAmount.toLocaleString("en-IN")}</td>
                            <td className="col-gross text-right font-mono font-bold text-slate-900 bg-slate-50/60">
                              ₹{r.totalGross.toLocaleString("en-IN")}
                            </td>
                            <td className="col-pf text-right font-mono">
                              <input
                                type="number"
                                className="input-num-cell pf text-right font-mono font-bold text-rose-600 bg-rose-50/30"
                                value={r.pf}
                                onChange={(e) => handleCellChange(idx, "pf", Number(e.target.value))}
                                title="Edit Provident Fund"
                              />
                            </td>
                            <td className="col-esi text-right font-mono">
                              <input
                                type="number"
                                className="input-num-cell esi text-right font-mono font-bold text-amber-600 bg-amber-50/30"
                                value={r.esi}
                                onChange={(e) => handleCellChange(idx, "esi", Number(e.target.value))}
                                title="Edit ESI"
                              />
                            </td>
                            <td className="col-ptax text-right font-mono">
                              <input
                                type="number"
                                className="input-num-cell ptax text-right font-mono font-bold text-slate-700 bg-slate-50/40"
                                value={r.ptax}
                                onChange={(e) => handleCellChange(idx, "ptax", Number(e.target.value))}
                                title="Edit Professional Tax"
                              />
                            </td>
                            <td className="col-net text-right sticky-right font-mono font-extrabold text-emerald-700 bg-emerald-50/80">
                              ₹{r.netPayable.toLocaleString("en-IN")}
                            </td>
                            <td className="col-actions text-center sticky-right-action">
                              <div className="table-row-actions">
                                <button
                                  type="button"
                                  className="btn-row-action slip-btn"
                                  onClick={() => setSelectedSlipForModal(r as any)}
                                  title={`View Statutory Form XIX Slip for ${r.name}`}
                                >
                                  <Eye size={13} /> Form XIX
                                </button>
                                <button
                                  type="button"
                                  className="btn-row-action csv-btn"
                                  onClick={() => handleExportFormXixSingleCSV(r)}
                                  title={`Download Form XIX CSV for ${r.name}`}
                                >
                                  <Download size={13} /> CSV
                                </button>
                              </div>
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
                                <div className="day-number">{isCelebrity ? getDayHeader(d) : d}</div>
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
                          const workerDays = (attendanceGrid[r.code] || {}) as Record<string | number, any>;
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
                              {daysArray.map((d, sIdx) => {
                                const status =
                                  workerDays[d] ||
                                  workerDays[String(d)] ||
                                  workerDays[sIdx + 1] ||
                                  (workerDays as any)[`seq_${sIdx + 1}`] ||
                                  (isSunday(d) ? "WO" : "P");
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
                                <div className="day-number">{isCelebrity ? getDayHeader(d) : d}</div>
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
                          const workerDays = (attendanceGrid[r.code] || {}) as Record<string | number, any>;
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

                              {daysArray.map((d, sIdx) => {
                                const status =
                                  workerDays[d] ||
                                  workerDays[String(d)] ||
                                  workerDays[sIdx + 1] ||
                                  (workerDays as any)[`seq_${sIdx + 1}`] ||
                                  (isSunday(d) ? "WO" : "P");
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
                          `Form XIX - ${companyName} - All Slips ${monthLabel} ${selectedYear}`
                        )
                      }
                      title="Bulk Print Form XIX Slips (EXACTLY 2 Slips per A4 Page with dashed cutting line)"
                    >
                      <Printer size={16} />
                      {activeSlipSearch ? `Bulk Print Form XIX (${filteredSlips.length})` : "Bulk Print Form XIX Slips (2 per A4 Page)"}
                    </button>

                    <button
                      type="button"
                      className="btn-export-bulk-csv"
                      onClick={handleExportFormXixBulkCSV}
                      title="Export Statutory Form XIX Slips for all workers in CSV"
                    >
                      <Download size={15} />
                      Export Form XIX (Bulk CSV)
                    </button>

                    <button
                      type="button"
                      className="btn-export-xvii"
                      onClick={handleExportFormXVIICSV}
                      title="Export Form XVII Wage Register CSV"
                    >
                      <Download size={15} />
                      Export Form XVII
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
                              title="Preview Statutory Form XIX Slip"
                            >
                              <Eye size={14} /> Form XIX
                            </button>
                            <button
                              type="button"
                              className="btn-action-print"
                              onClick={() =>
                                printSlipsCleanly(
                                  [slip],
                                  `Form XIX - ${companyName} - ${slip.name} (${slip.code})`
                                )
                              }
                              title="Print Statutory Form XIX Slip"
                            >
                              <Printer size={14} /> Print
                            </button>
                            <button
                              type="button"
                              className="btn-action-csv"
                              onClick={() => handleExportFormXixSingleCSV(slip)}
                              title="Download Form XIX Single CSV"
                            >
                              <Download size={14} /> CSV
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
                    <span>Load Celebrity Sample Data (144 Workers)</span>
                  </button>
                </div>
              </div>

              <div className="gsheet-tip-box">
                <strong>Google Sheets Sharing Tip:</strong> Open your Google Sheet, click <strong>Share</strong> (top right), set General Access to <strong>&quot;Anyone with the link can view&quot;</strong>, then paste the link here.
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
                    href="/sample-sheets/Celebrity_Brewing_12_Months_Security_Gate_Punch_2026.xlsx"
                    download="Celebrity_Brewing_12_Months_Security_Gate_Punch_2026.xlsx"
                    className="action-pill-btn client-template-btn"
                    style={{ background: "#0284c7", color: "#ffffff", borderColor: "#0284c7", fontWeight: 700 }}
                    title="Download 12-Month Master Gate Punch & Muster Excel (Jan'26 to Dec'26, 154 Workers)"
                  >
                    <Download size={14} /> 12-Month Master Gate Punch Excel (.xlsx)
                  </a>

                  <a
                    href="/sample-sheets/Template_muster_Client_Format.xlsx"
                    download="Template_muster_Client_Format.xlsx"
                    className="action-pill-btn"
                    title="Download Official 3-Sheet Client Muster Template (Contractor Master, Employee Master, Attendance)"
                  >
                    <Download size={14} /> Official Client Template (.xlsx)
                  </a>

                  <a
                    href="/sample-sheets/Celebrity_Brewing_October_2026_Attendance.xlsx"
                    download="Celebrity_Brewing_October_2026_Attendance.xlsx"
                    className="action-pill-btn"
                    title="Download Pre-filled October 2026 Sheet for Celebrity Brewing (144 Workers)"
                  >
                    <FileSpreadsheet size={14} /> October 2026 Sample (.xlsx)
                  </a>

                  <button
                    type="button"
                    className="action-pill-btn demo-pill-btn"
                    onClick={handleLoadDemoGoogleSheet}
                    disabled={syncingSheet}
                    title="Load verified October 2026 Celebrity Brewing 144-worker dataset with 1 click"
                  >
                    <Sparkles size={14} /> 1-Click Load October 2026 Data
                  </button>

                  <button
                    type="button"
                    className="action-pill-btn delete-pill-btn"
                    onClick={handleClearOrDeleteSheet}
                    title="Clear uploaded spreadsheet or delete database records to reset"
                  >
                    <Trash2 size={14} /> Clear / Delete Sheet
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


        {/* ============================================================== */}
        {/* TAB 4: DAILY PUNCH & OVERTIME TERMINAL */}
        {/* ============================================================== */}
        {activeTab === "punch" && (
          <div className="tab-pane-content">
            {/* Dedicated Standalone Public Gate Terminal Card for Guards */}
            <div
              style={{
                backgroundColor: "#0f172a",
                color: "#ffffff",
                border: "2px solid #10b981",
                borderRadius: "14px",
                padding: "18px 20px",
                marginBottom: "16px",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      backgroundColor: "rgba(16, 185, 129, 0.2)",
                      border: "1px solid rgba(16, 185, 129, 0.5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px",
                    }}
                  >
                    🛡️
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "16px", display: "flex", alignItems: "center", gap: "8px", color: "#ffffff" }}>
                      FACTORY SECURITY GATE TERMINAL PORTAL (FOR GUARDS)
                      <span
                        style={{
                          fontSize: "11px",
                          backgroundColor: "#10b981",
                          color: "#022c22",
                          fontWeight: 900,
                          padding: "2px 8px",
                          borderRadius: "9999px",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                        }}
                      >
                        STANDALONE • PIN PROTECTED
                      </span>
                    </div>
                    <div style={{ color: "#cbd5e1", fontSize: "12px", marginTop: "6px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
                      <span>
                        Public Portal Link:{" "}
                        <strong
                          style={{
                            color: "#34d399",
                            fontFamily: "monospace",
                            backgroundColor: "#1e293b",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            border: "1px solid #334155",
                          }}
                        >
                          /gate-terminal
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Current Guard PIN:{" "}
                        <strong
                          style={{
                            color: "#fbbf24",
                            fontFamily: "monospace",
                            backgroundColor: "rgba(251, 191, 36, 0.2)",
                            border: "1px solid rgba(251, 191, 36, 0.4)",
                            padding: "2px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          {companyGatePin}
                        </strong>
                      </span>
                      <span>•</span>
                      <span style={{ color: "#6ee7b7", fontWeight: 600 }}>
                        Auto-Persists Punches to Database &amp; Monthly Wages
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  {/* Guard PIN Edit Box */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#1e293b", padding: "4px 8px", borderRadius: "8px", border: "1px solid #334155" }}>
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>Set PIN:</span>
                    <input
                      type="text"
                      maxLength={4}
                      value={newGatePinInput}
                      onChange={(e) => setNewGatePinInput(e.target.value.replace(/\D/g, ""))}
                      style={{
                        width: "60px",
                        textAlign: "center",
                        backgroundColor: "#0f172a",
                        color: "#fbbf24",
                        fontWeight: 900,
                        fontSize: "13px",
                        border: "1px solid #475569",
                        borderRadius: "4px",
                        padding: "2px 4px",
                      }}
                      placeholder="PIN"
                    />
                    <button
                      type="button"
                      onClick={handleSaveGuardPin}
                      disabled={savingPin}
                      style={{
                        backgroundColor: "#3b82f6",
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: "11px",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {savingPin ? "..." : "Save PIN"}
                    </button>
                  </div>

                  <button
                    type="button"
                    style={{
                      backgroundColor: "#10b981",
                      color: "#022c22",
                      fontWeight: 900,
                      padding: "8px 14px",
                      borderRadius: "8px",
                      border: "none",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                    }}
                    onClick={() => {
                      const gateUrl = `${window.location.origin}/gate-terminal/${companySlug}`;
                      navigator.clipboard.writeText(gateUrl);
                      alert(`Copied Security Gate URL to clipboard!\n\nDirect Link for Guard:\n${gateUrl}\n\nSecurity Guard PIN: ${companyGatePin}`);
                    }}
                    title="Copy direct portal link to share with guard via WhatsApp or SMS"
                  >
                    <Copy size={14} /> Copy Guard Link
                  </button>

                  <a
                    href={`/gate-terminal/${companySlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      backgroundColor: "#334155",
                      color: "#ffffff",
                      fontWeight: 700,
                      padding: "8px 14px",
                      borderRadius: "8px",
                      border: "1px solid #475569",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      textDecoration: "none",
                      cursor: "pointer",
                    }}
                    title="Open Standalone Public Gate Terminal in new tab"
                  >
                    <ExternalLink size={14} /> Open Guard Terminal
                  </a>
                </div>
              </div>
            </div>

            {/* Live Gate Banner */}
            <div
              style={{
                background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
                color: "#ffffff",
                borderRadius: "14px",
                padding: "16px 20px",
                marginBottom: "16px",
                boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                  }}
                >
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#ef4444", display: "inline-block" }}></span>
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "16px", display: "flex", alignItems: "center", gap: "8px", color: "#ffffff" }}>
                    LIVE SECURITY GATE TERMINAL — {isCelebrity ? `${getDayHeader(punchDateDay)} (${getDayOfWeek(punchDateDay)})` : `Day ${punchDateDay} - ${monthLabel} ${selectedYear}`}
                    <span
                      style={{
                        fontSize: "11px",
                        backgroundColor: "rgba(255, 255, 255, 0.25)",
                        color: "#ffffff",
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        fontWeight: 700,
                        border: "1px solid rgba(255, 255, 255, 0.4)",
                      }}
                    >
                      Real-Time Clock In / Out
                    </span>
                  </div>
                  <div style={{ color: "#d1fae5", fontSize: "12px", marginTop: "2px" }}>
                    Wage Period: {cycleInfo.periodLabel} | Shift Standard: {shiftStandardHours}.0 Hours | Auto Overtime &amp; Daily Muster
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#065f46",
                    fontWeight: 800,
                    padding: "7px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  onClick={handleExportTodayGateLogExcel}
                  title="Download verified Gate Attendance & Overtime Log (.xlsx) for this date"
                >
                  <Download size={14} /> Download Today's Gate Log (.xlsx)
                </button>
                <button
                  type="button"
                  style={{
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    color: "#ffffff",
                    fontWeight: 700,
                    padding: "7px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  onClick={() => setShowGatePrintModal(true)}
                  title="Print official Security Gate Muster for this date"
                >
                  <Printer size={14} /> Print Today's Register
                </button>
                <button
                  type="button"
                  className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition"
                  onClick={handleCopyTodayPunchesToClipboard}
                  title="Copy In/Out timestamps for Google Sheet Ctrl+V"
                >
                  <Copy size={14} /> Copy for Google Sheet
                </button>
              </div>
            </div>

            {/* Top Control Header Card */}
            <div className="punch-header-card">
              <div className="punch-header-left">
                <div className="punch-icon-badge">
                  <Clock size={20} className="text-amber-500" />
                </div>
                <div>
                  <div className="punch-card-title">Daily Punch &amp; Overtime Terminal</div>
                  <div className="punch-card-subtitle">
                    Live check-in, check-out, and automatic shift overtime calculation with 1-click sync to monthly wages &amp; Google Sheets.
                  </div>
                </div>
              </div>

              <div className="punch-header-controls">
                <div className="control-field">
                  <label>Select Day (1 - {daysInMonth}):</label>
                  <select
                    className="punch-select"
                    value={punchDateDay}
                    onChange={(e) => setPunchDateDay(Number(e.target.value))}
                  >
                    {daysArray.map((d) => (
                      <option key={d} value={d}>
                        {isCelebrity
                          ? `${getDayHeader(d)} (${getDayOfWeek(d)})`
                          : `Day ${d} — ${String(d).padStart(2, "0")} ${monthLabel} ${selectedYear}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="control-field">
                  <label>Default Shift Standard:</label>
                  <select
                    className="punch-select"
                    value={shiftStandardHours}
                    onChange={(e) => setShiftStandardHours(Number(e.target.value))}
                  >
                    <option value={8}>8.0 Hours Standard Shift</option>
                    <option value={9}>9.0 Hours Shift</option>
                    <option value={10}>10.0 Hours Shift</option>
                    <option value={12}>12.0 Hours Shift</option>
                    <option value={14}>14.0 Hours Shift</option>
                    <option value={18}>18.0 Hours Shift</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="btn-script-modal"
                  onClick={() => setShowGScriptModal(true)}
                  title="View Google Sheets 1-Click Apps Script & Formula Guide"
                >
                  <FileCode size={15} /> Google Sheets Script Guide
                </button>

                <a
                  href={
                    isCelebrity
                      ? "/sample-sheets/Celebrity_Brewing_12_Months_Security_Gate_Punch_2026.xlsx"
                      : "/sample-sheets/Master_12_Months_Security_Gate_Punch_Standard_2026.xlsx"
                  }
                  download={
                    isCelebrity
                      ? "Celebrity_Brewing_12_Months_Security_Gate_Punch_2026.xlsx"
                      : "Master_12_Months_Security_Gate_Punch_Standard_2026.xlsx"
                  }
                  className="btn-download-punch-template"
                  title="Download verified 12-Month Security Guard Gate Check-in Punch template (.xlsx)"
                >
                  <Download size={14} /> Download 12-Month Security Gate Punch Excel (.xlsx)
                </a>

                <button
                  type="button"
                  className="btn-apply-day-punches"
                  onClick={handleApplyDayPunchesToMatrix}
                  title={`Push Day ${punchDateDay} punches and calculated OT hours directly into the monthly wage matrix`}
                >
                  <CheckCircle2 size={16} /> Apply Day {punchDateDay} Punches
                </button>

                <button
                  type="button"
                  className="btn-apply-day-punches"
                  style={{
                    background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                    color: "#ffffff",
                    borderColor: "#059669",
                  }}
                  onClick={handleApplyAllCyclePunchesToMatrix}
                  title={`Push stamp across ALL ${daysArray.length} days of ${isCelebrity ? '16 Sep - 15 Oct' : 'the cycle'} into monthly wage matrix`}
                >
                  <Sparkles size={16} /> Apply to ALL {daysArray.length} Days in Cycle
                </button>
              </div>
            </div>

            {/* Quick Bulk Actions & Search Toolbar */}
            <div className="punch-toolbar-card">
              <div className="toolbar-left">
                <div className="punch-search-box">
                  <Search size={15} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by worker code, name, designation..."
                    value={punchSearch}
                    onChange={(e) => setPunchSearch(e.target.value)}
                  />
                  {punchSearch && (
                    <button type="button" className="btn-clear-search" onClick={() => setPunchSearch("")}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div className="toolbar-bulk-actions">
                <span className="toolbar-label">Bulk Quick Actions:</span>
                <button
                  type="button"
                  className="btn-bulk-pill in-pill"
                  onClick={() => handleBulkPunchIn("09:30")}
                  title="Set 09:30 AM Check-In for all workers"
                >
                  Bulk In (09:30 AM)
                </button>
                <button
                  type="button"
                  className="btn-bulk-pill out-pill"
                  onClick={() => handleBulkPunchOut(shiftStandardHours === 9 ? "18:30" : "17:30")}
                  title="Set Standard Check-Out for all workers"
                >
                  Bulk Out ({shiftStandardHours === 9 ? "06:30 PM" : "05:30 PM"})
                </button>
                <button
                  type="button"
                  className="btn-bulk-pill ot-pill"
                  onClick={handleBulkAddOt2}
                  title="Set +2.0 Hours Overtime for all workers"
                >
                  +2.0h Overtime
                </button>
              </div>
            </div>

            {/* Live Punch Metrics Summary */}
            <div className="punch-kpi-grid">
              <div className="punch-kpi-card">
                <div className="kpi-label">Total Active Workers</div>
                <div className="kpi-value text-blue-600">{rows.length}</div>
                <div className="kpi-subtext">Registered workers on muster</div>
              </div>
              <div className="punch-kpi-card">
                <div className="kpi-label">Punched In Today</div>
                <div className="kpi-value text-emerald-600">
                  {Object.values(dailyPunches).filter((p) => Boolean(p.inTime)).length}
                </div>
                <div className="kpi-subtext">Check-in recorded for Day {punchDateDay}</div>
              </div>
              <div className="punch-kpi-card">
                <div className="kpi-label">Shift Standard</div>
                <div className="kpi-value text-slate-800">{shiftStandardHours}.0 Hrs</div>
                <div className="kpi-subtext">Configured regular shift duration</div>
              </div>
              <div className="punch-kpi-card">
                <div className="kpi-label">Total Overtime (Day {punchDateDay})</div>
                <div className="kpi-value text-amber-600">
                  {Object.values(dailyPunches)
                    .reduce((sum, p) => sum + (p.otHours || 0), 0)
                    .toFixed(1)}{" "}
                  Hrs
                </div>
                <div className="kpi-subtext">Extra hours calculated automatically</div>
              </div>
            </div>

            {/* Punch Records Table */}
            <div className="punch-table-card">
              <div className="punch-table-container">
                <table className="punch-table">
                  <thead>
                    <tr>
                      <th style={{ width: "50px" }} className="text-center">#</th>
                      <th style={{ minWidth: "220px" }}>Worker Name &amp; Code</th>
                      <th style={{ width: "160px" }}>Check-In Time</th>
                      <th style={{ width: "160px" }}>Check-Out Time</th>
                      <th style={{ width: "110px" }} className="text-center">Total Worked</th>
                      <th style={{ width: "100px" }} className="text-center">Shift Standard</th>
                      <th style={{ width: "120px" }} className="text-center">Overtime (OT)</th>
                      <th style={{ width: "90px" }} className="text-center">Status</th>
                      <th style={{ minWidth: "220px" }} className="text-center">Quick OT Presets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows
                      .filter((r) => {
                        if (!punchSearch.trim()) return true;
                        const q = punchSearch.toLowerCase();
                        return (
                          r.name.toLowerCase().includes(q) ||
                          r.code.toLowerCase().includes(q) ||
                          (r.designation && r.designation.toLowerCase().includes(q))
                        );
                      })
                      .map((r, idx) => {
                        const punch = dailyPunches[r.code] || {
                          inTime: "",
                          outTime: "",
                          totalHours: 0,
                          otHours: 0,
                          status: "A" as const,
                        };

                        return (
                          <tr key={r.code} className={punch.status === "A" ? "row-absent" : ""}>
                            <td className="text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                            <td>
                              <div className="worker-cell">
                                <div className="flex items-center justify-between">
                                  <span className="worker-name">{r.name}</span>
                                  <button
                                    type="button"
                                    className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded font-medium flex items-center gap-1 transition"
                                    onClick={() => setSelectedWorkerHistory(r)}
                                    title="View this worker's daily check-in, check-out and overtime history across all 31 days of the month"
                                  >
                                    <Eye size={12} /> View In/Out Log
                                  </button>
                                </div>
                                <div className="worker-subinfo">
                                  <span className="worker-code font-mono">{r.code}</span>
                                  {r.designation && <span className="worker-tag">{r.designation}</span>}
                                  <span className="worker-rate font-semibold text-slate-600">₹{r.rate}/day</span>
                                </div>
                              </div>
                            </td>

                            {/* IN TIME */}
                            <td>
                              <div className="time-input-group">
                                <input
                                  type="time"
                                  className="time-picker-field in-field"
                                  value={punch.inTime || ""}
                                  onChange={(e) => handleTimeChange(r.code, "inTime", e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="btn-stamp-now"
                                  onClick={() => handleStampCurrentTime(r.code, "inTime")}
                                  title="Stamp current time as Check-In"
                                >
                                  Now
                                </button>
                              </div>
                            </td>

                            {/* OUT TIME */}
                            <td>
                              <div className="time-input-group">
                                <input
                                  type="time"
                                  className="time-picker-field out-field"
                                  value={punch.outTime || ""}
                                  onChange={(e) => handleTimeChange(r.code, "outTime", e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="btn-stamp-now"
                                  onClick={() => handleStampCurrentTime(r.code, "outTime")}
                                  title="Stamp current time as Check-Out"
                                >
                                  Now
                                </button>
                              </div>
                            </td>

                            {/* TOTAL WORKED */}
                            <td className="text-center">
                              <span className="hours-badge total font-mono font-semibold">
                                {punch.totalHours > 0 ? `${punch.totalHours}h` : "-"}
                              </span>
                            </td>

                            {/* SHIFT (CUSTOM EDITABLE PER WORKER) */}
                            <td className="text-center">
                              <input
                                type="number"
                                min={1}
                                max={24}
                                step={0.5}
                                className="shift-hours-input"
                                value={punch.shiftStandard ?? shiftStandardHours}
                                onChange={(e) => handleWorkerShiftChange(r.code, Number(e.target.value))}
                                title="Custom Shift Standard Hours for this worker (e.g. 8, 9, 10, 12, 14, 18h)"
                              />
                            </td>

                            {/* OVERTIME (CUSTOM EDITABLE PER WORKER) */}
                            <td className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={24}
                                  step={0.5}
                                  className="w-16 text-center border rounded px-1.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  style={{
                                    borderColor: punch.otHours > 0 ? "#f59e0b" : "#cbd5e1",
                                    background: punch.otHours > 0 ? "#fffbeb" : "#ffffff",
                                    color: punch.otHours > 0 ? "#b45309" : "#64748b",
                                  }}
                                  value={punch.otHours}
                                  onChange={(e) => handleWorkerOtChange(r.code, Number(e.target.value))}
                                  title="Overtime hours (Auto-calculated from shift, or click to manually edit)"
                                />
                                <span className="text-xs text-slate-500 font-semibold">h</span>
                              </div>
                            </td>

                            {/* STATUS */}
                            <td className="text-center">
                              <span className={`status-pill-badge ${punch.status.toLowerCase()}`}>
                                {punch.status}
                              </span>
                            </td>

                            {/* QUICK PRESETS */}
                            <td className="text-center">
                              <div className="preset-btn-group">
                                <button
                                  type="button"
                                  className="btn-preset-mini"
                                  onClick={() => handleApplyPreset(r.code, "standard")}
                                  title="Standard Shift (No Overtime)"
                                >
                                  Std
                                </button>
                                <button
                                  type="button"
                                  className="btn-preset-mini ot2"
                                  onClick={() => handleApplyPreset(r.code, "ot2")}
                                  title="Add +2.0 Hours Overtime"
                                >
                                  +2h OT
                                </button>
                                <button
                                  type="button"
                                  className="btn-preset-mini ot4"
                                  onClick={() => handleApplyPreset(r.code, "ot4")}
                                  title="Add +4.0 Hours Overtime"
                                >
                                  +4h OT
                                </button>
                                <button
                                  type="button"
                                  className="btn-preset-mini absent"
                                  onClick={() => handleApplyPreset(r.code, "absent")}
                                  title="Mark as Absent"
                                >
                                  Absent
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Google Sheets Apps Script & Overtime Guide */}
        {/* Modal: Worker 31-Day Daily Check-In / Check-Out Log */}
        {selectedWorkerHistory && (
          <div className="gscript-modal-backdrop" onClick={() => setSelectedWorkerHistory(null)}>
            <div className="gscript-modal-content" style={{ maxWidth: "850px" }} onClick={(e) => e.stopPropagation()}>
              <div className="gscript-modal-header" style={{ background: "#1e3a8a" }}>
                <div className="modal-title-group">
                  <h3 style={{ color: "#ffffff" }} className="flex items-center gap-2">
                    <Clock size={18} /> Daily Check-In &amp; Check-Out Log — {selectedWorkerHistory.name}
                  </h3>
                  <span className="modal-subtitle" style={{ color: "#93c5fd" }}>
                    Worker Code: <strong>{selectedWorkerHistory.code}</strong> | Designation: <strong>{selectedWorkerHistory.designation || "Workman"}</strong> | Rate: <strong>₹{selectedWorkerHistory.rate}/day</strong>
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-modal-close"
                  onClick={() => setSelectedWorkerHistory(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="gscript-modal-body" style={{ maxHeight: "70vh", overflowY: "auto", padding: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", paddingBottom: "10px", borderBottom: "1px solid #e2e8f0" }}>
                  <div>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>
                      Active Wage Period: {cycleInfo.periodLabel}
                    </span>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      Factory Shift Standard: {shiftStandardHours}.0 Hours | Plant: {companyName}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <span style={{ fontSize: "11px", background: "#dcfce7", color: "#166534", padding: "4px 8px", borderRadius: "6px", fontWeight: "700" }}>
                      Present: {selectedWorkerHistory.presentDays} Days
                    </span>
                    <span style={{ fontSize: "11px", background: "#fef3c7", color: "#92400e", padding: "4px 8px", borderRadius: "6px", fontWeight: "700" }}>
                      OT: {selectedWorkerHistory.otDays} Days
                    </span>
                  </div>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "2px solid #cbd5e1", color: "#475569" }}>
                      <th style={{ padding: "7px 10px", textAlign: "left", border: "1px solid #e2e8f0" }}>Date &amp; Day</th>
                      <th style={{ padding: "7px 10px", textAlign: "center", border: "1px solid #e2e8f0" }}>Shift</th>
                      <th style={{ padding: "7px 10px", textAlign: "center", border: "1px solid #e2e8f0" }}>Check-In</th>
                      <th style={{ padding: "7px 10px", textAlign: "center", border: "1px solid #e2e8f0" }}>Check-Out</th>
                      <th style={{ padding: "7px 10px", textAlign: "center", border: "1px solid #e2e8f0" }}>Total Worked</th>
                      <th style={{ padding: "7px 10px", textAlign: "center", border: "1px solid #e2e8f0" }}>Overtime</th>
                      <th style={{ padding: "7px 10px", textAlign: "center", border: "1px solid #e2e8f0" }}>Daily Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cycleInfo.days.map((d) => {
                      const dayKey = d.dayKey;
                      const gridVal = attendanceGrid[selectedWorkerHistory.code]?.[dayKey] || (d.isSunday ? "WO" : "P");
                      const isToday = dayKey === punchDateDay;
                      const todayPunch = isToday ? dailyPunches[selectedWorkerHistory.code] : null;

                      let inT = todayPunch?.inTime || (gridVal === "P" ? "09:30 AM" : gridVal === "HD" ? "09:30 AM" : "--:--");
                      let outT = todayPunch?.outTime || (gridVal === "P" ? "05:30 PM" : gridVal === "HD" ? "01:30 PM" : "--:--");
                      let workedH = todayPunch ? `${todayPunch.totalHours}h` : (gridVal === "P" ? "8.0h" : gridVal === "HD" ? "4.0h" : "-");
                      let otH = todayPunch ? (todayPunch.otHours > 0 ? `+${todayPunch.otHours}h` : "0h") : "0h";
                      let status = todayPunch?.status || gridVal;

                      if (gridVal === "WO") {
                        inT = "--:--";
                        outT = "--:--";
                        workedH = "-";
                        otH = "0h";
                        status = "WO";
                      } else if (gridVal === "A") {
                        inT = "--:--";
                        outT = "--:--";
                        workedH = "-";
                        otH = "0h";
                        status = "A";
                      }

                      return (
                        <tr
                          key={dayKey}
                          style={{
                            borderBottom: "1px solid #e2e8f0",
                            background: isToday ? "#eff6ff" : d.isSunday ? "#f8fafc" : "#ffffff",
                            fontWeight: isToday ? "600" : "normal"
                          }}
                        >
                          <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>
                            <span style={{ fontWeight: "700", color: "#0f172a" }}>{d.headerFull}</span>{" "}
                            <span style={{ fontSize: "11px", color: d.isSunday ? "#ef4444" : "#64748b" }}>({d.dayOfWeek})</span>
                            {isToday && (
                              <span style={{ marginLeft: "6px", fontSize: "10px", background: "#3b82f6", color: "#ffffff", padding: "1px 5px", borderRadius: "4px" }}>
                                TODAY
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "6px 10px", textAlign: "center", border: "1px solid #e2e8f0", color: "#475569" }}>
                            {shiftStandardHours}h
                          </td>
                          <td style={{ padding: "6px 10px", textAlign: "center", border: "1px solid #e2e8f0", fontFamily: "monospace", color: inT !== "--:--" ? "#0f172a" : "#94a3b8" }}>
                            {inT}
                          </td>
                          <td style={{ padding: "6px 10px", textAlign: "center", border: "1px solid #e2e8f0", fontFamily: "monospace", color: outT !== "--:--" ? "#0f172a" : "#94a3b8" }}>
                            {outT}
                          </td>
                          <td style={{ padding: "6px 10px", textAlign: "center", border: "1px solid #e2e8f0", fontWeight: "700" }}>
                            {workedH}
                          </td>
                          <td style={{ padding: "6px 10px", textAlign: "center", border: "1px solid #e2e8f0", color: otH !== "0h" ? "#b45309" : "#64748b", fontWeight: otH !== "0h" ? "700" : "normal" }}>
                            {otH}
                          </td>
                          <td style={{ padding: "6px 10px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                            <span style={{
                              display: "inline-block",
                              padding: "2px 7px",
                              borderRadius: "4px",
                              fontWeight: "700",
                              fontSize: "10px",
                              background: status === "P" ? "#dcfce7" : status === "A" ? "#fee2e2" : status === "HD" ? "#fef3c7" : "#f1f5f9",
                              color: status === "P" ? "#166534" : status === "A" ? "#991b1b" : status === "HD" ? "#92400e" : "#475569"
                            }}>
                              {status === "WO" ? "WO (Weekly Off)" : status === "P" ? "P (Present)" : status === "A" ? "A (Absent)" : "HD (Half Day)"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Print Today's Gate Attendance & OT Register */}
        {showGatePrintModal && (
          <div className="gscript-modal-backdrop" onClick={() => setShowGatePrintModal(false)}>
            <div className="gscript-modal-content" style={{ maxWidth: "1000px" }} onClick={(e) => e.stopPropagation()}>
              <div className="gscript-modal-header" style={{ background: "#065f46" }}>
                <div className="modal-title-group">
                  <h3 style={{ color: "#ffffff" }}>Daily Security Gate Attendance &amp; Overtime Muster</h3>
                  <span className="modal-subtitle" style={{ color: "#a7f3d0" }}>
                    Official statutory daily gate punch record for factory security guard &amp; management inspection.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="bg-white text-emerald-800 font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition"
                    onClick={() => window.print()}
                  >
                    <Printer size={14} /> Print Now
                  </button>
                  <button
                    type="button"
                    className="btn-modal-close"
                    onClick={() => setShowGatePrintModal(false)}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="gscript-modal-body" style={{ maxHeight: "70vh", overflowY: "auto", padding: "20px" }}>
                <div style={{ textAlign: "center", marginBottom: "16px", borderBottom: "2px solid #e2e8f0", paddingBottom: "12px" }}>
                  <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase", margin: 0 }}>
                    {companyName.toUpperCase()}
                  </h2>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#059669", marginTop: "4px" }}>
                    DAILY SECURITY GATE ATTENDANCE &amp; OVERTIME REGISTER
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                    Date: <strong>{isCelebrity ? `${getDayHeader(punchDateDay)} (${getDayOfWeek(punchDateDay)})` : `Day ${punchDateDay} - ${monthLabel} ${selectedYear}`}</strong> | 
                    Shift Standard: <strong>{shiftStandardHours}.0 Hours</strong> | Wage Cycle: <strong>{cycleInfo.periodLabel}</strong>
                  </div>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                      <th style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #cbd5e1" }}>#</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", border: "1px solid #cbd5e1" }}>Worker Name &amp; Code</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", border: "1px solid #cbd5e1" }}>Department</th>
                      <th style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #cbd5e1" }}>Shift</th>
                      <th style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #cbd5e1" }}>Check-In</th>
                      <th style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #cbd5e1" }}>Check-Out</th>
                      <th style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #cbd5e1" }}>Worked</th>
                      <th style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #cbd5e1" }}>Overtime</th>
                      <th style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #cbd5e1" }}>Status</th>
                      <th style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #cbd5e1" }}>Guard Sign</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => {
                      const p = dailyPunches[r.code] || { inTime: "", outTime: "", totalHours: 0, otHours: 0, status: "A" as const };
                      return (
                        <tr key={r.code} style={{ borderBottom: "1px solid #e2e8f0", background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                          <td style={{ padding: "5px 8px", textAlign: "center", border: "1px solid #e2e8f0", color: "#64748b" }}>{idx + 1}</td>
                          <td style={{ padding: "5px 8px", border: "1px solid #e2e8f0" }}>
                            <strong style={{ color: "#0f172a" }}>{r.name}</strong>
                            <div style={{ fontSize: "10px", color: "#64748b", fontFamily: "monospace" }}>{r.code}</div>
                          </td>
                          <td style={{ padding: "5px 8px", border: "1px solid #e2e8f0", color: "#475569" }}>{r.department || "Production"}</td>
                          <td style={{ padding: "5px 8px", textAlign: "center", border: "1px solid #e2e8f0" }}>{p.shiftStandard ?? shiftStandardHours}h</td>
                          <td style={{ padding: "5px 8px", textAlign: "center", border: "1px solid #e2e8f0", fontWeight: "600", color: p.inTime ? "#0f172a" : "#94a3b8" }}>
                            {p.inTime || "--:--"}
                          </td>
                          <td style={{ padding: "5px 8px", textAlign: "center", border: "1px solid #e2e8f0", fontWeight: "600", color: p.outTime ? "#0f172a" : "#94a3b8" }}>
                            {p.outTime || "--:--"}
                          </td>
                          <td style={{ padding: "5px 8px", textAlign: "center", border: "1px solid #e2e8f0", fontWeight: "700" }}>
                            {p.totalHours > 0 ? `${p.totalHours}h` : "-"}
                          </td>
                          <td style={{ padding: "5px 8px", textAlign: "center", border: "1px solid #e2e8f0", color: p.otHours > 0 ? "#b45309" : "#64748b", fontWeight: p.otHours > 0 ? "700" : "normal" }}>
                            {p.otHours > 0 ? `+${p.otHours}h` : "0h"}
                          </td>
                          <td style={{ padding: "5px 8px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                            <span style={{
                              display: "inline-block",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontWeight: "700",
                              fontSize: "10px",
                              background: p.status === "P" ? "#dcfce7" : p.status === "A" ? "#fee2e2" : p.status === "HD" ? "#fef3c7" : "#f1f5f9",
                              color: p.status === "P" ? "#166534" : p.status === "A" ? "#991b1b" : p.status === "HD" ? "#92400e" : "#475569"
                            }}>
                              {p.status}
                            </span>
                          </td>
                          <td style={{ padding: "5px 8px", textAlign: "center", border: "1px solid #e2e8f0", minWidth: "90px" }}></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showGScriptModal && (
          <div className="gscript-modal-backdrop" onClick={() => setShowGScriptModal(false)}>
            <div className="gscript-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="gscript-modal-header">
                <div className="modal-title-group">
                  <h3>Google Sheets 1-Click Check-in / Out &amp; Overtime Engine</h3>
                  <span className="modal-subtitle">
                    Turn your Google Spreadsheet into an automated punch terminal with automatic timestamping and overtime calculation!
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-modal-close"
                  onClick={() => setShowGScriptModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="gscript-modal-body">
                {/* Step 1 */}
                <div className="guide-card-block">
                  <div className="block-header">
                    <span className="step-circle">1</span>
                    <h4>How it works in Google Sheets (Zero extra apps required)</h4>
                  </div>
                  <p>
                    In your Google Sheet, add two Checkbox columns: <strong>Column J: PUNCH IN</strong> and{" "}
                    <strong>Column K: PUNCH OUT</strong>. Whenever a supervisor or worker checks the box, Google Apps Script
                    automatically captures the <strong>exact current local timestamp</strong>, places it in Column D (IN) or
                    Column E (OUT), and automatically unchecks the box ready for the next day!
                  </p>
                </div>

                {/* Step 2 */}
                <div className="guide-card-block">
                  <div className="block-header">
                    <span className="step-circle">2</span>
                    <h4>Overtime (OT) Calculation Formula in Google Sheets</h4>
                    <button
                      type="button"
                      className="btn-copy-mini"
                      onClick={handleCopyFormula}
                    >
                      {copiedFormula ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      <span>{copiedFormula ? "Copied!" : "Copy Formula"}</span>
                    </button>
                  </div>
                  <p>Paste this formula into Column H (OT Hours) on Row 5 and drag it down:</p>
                  <pre className="code-pre-box">
                    <code>=IF(OR(ISBLANK(D5), ISBLANK(E5)), 0, ROUND(MAX(0, (E5-D5)*24 - 8), 2))</code>
                  </pre>
                  <span className="code-tip">
                    * If your company uses a 9-hour shift standard, replace <code>- 8</code> with <code>- 9</code>.
                  </span>
                </div>

                {/* Step 3 */}
                <div className="guide-card-block">
                  <div className="block-header">
                    <span className="step-circle">3</span>
                    <h4>Google Apps Script (Copy &amp; Paste into Extensions &rarr; Apps Script)</h4>
                    <button
                      type="button"
                      className="btn-copy-code"
                      onClick={handleCopyAppsScript}
                    >
                      {copiedScript ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      <span>{copiedScript ? "Copied Script to Clipboard!" : "Copy Full Apps Script"}</span>
                    </button>
                  </div>
                  <pre className="code-pre-box script-pre">
                    <code>{`// 1-Click Check-in / Out Timestamp Trigger
function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  var range = e.range;
  var row = range.getRow();
  var col = range.getColumn();
  if (row < 5) return; // Data rows start at row 5
  
  var now = new Date();
  var timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "hh:mm a");
  
  // Column 10 (J): PUNCH IN Checkbox
  if (col === 10 && range.getValue() === true) {
    sheet.getRange(row, 4).setValue(timeStr); // Column D: IN Time
    range.setValue(false); // Reset checkbox
    SpreadsheetApp.getActiveSpreadsheet().toast("✅ Punch IN recorded at " + timeStr, "Punch IN", 3);
  }
  
  // Column 11 (K): PUNCH OUT Checkbox
  if (col === 11 && range.getValue() === true) {
    sheet.getRange(row, 5).setValue(timeStr); // Column E: OUT Time
    range.setValue(false); // Reset checkbox
    SpreadsheetApp.getActiveSpreadsheet().toast("✅ Punch OUT recorded at " + timeStr, "Punch OUT", 3);
  }
}`}</code>
                  </pre>
                </div>

                {/* Step 4 */}
                <div className="guide-card-block">
                  <div className="block-header">
                    <span className="step-circle">4</span>
                    <h4>Multi-Month (12 Months / Year) Best Practice</h4>
                  </div>
                  <p>
                    For multi-month records (Oct, Nov, Dec, Jan...):
                    <br />
                    1. Keep <strong>1 single Google Sheet workbook per year</strong> (e.g. <code>CELEBRITY_BREWING_2026-2027</code>).
                    <br />
                    2. Create 12 tabs named: <code>Oct-2026</code>, <code>Nov-2026</code>, <code>Dec-2026</code>, etc.
                    <br />
                    3. In AppstromedHRM, whenever you select a month tab at the top and click <strong>&quot;Pull &amp; Sync Attendance&quot;</strong>, HRM automatically synchronizes that exact month&apos;s tab!
                  </p>
                </div>
              </div>
            </div>
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
                        `Form XIX - ${companyName} - ${selectedSlipForModal.name} (${selectedSlipForModal.code})`
                      )
                    }
                  >
                    <Printer size={15} /> Print Form XIX Slip
                  </button>
                  <button
                    type="button"
                    className="btn-modal-csv"
                    onClick={() => handleExportFormXixSingleCSV(selectedSlipForModal)}
                  >
                    <Download size={15} /> Download Form XIX (CSV)
                  </button>
                  <button
                    type="button"
                    className="btn-modal-close"
                    onClick={() => setSelectedSlipForModal(null)}
                    title="Close Modal"
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

        /* TAB 4: DAILY PUNCH & OT TERMINAL STYLES */
        .punch-header-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .punch-header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .punch-icon-badge {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #fef3c7;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .punch-card-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
        }
        .punch-card-subtitle {
          font-size: 13px;
          color: #334155;
          font-weight: 600;
          margin-top: 2px;
        }
        .control-field label {
          font-size: 12px;
          font-weight: 800;
          color: #1e293b;
          text-transform: uppercase;
        }
        .punch-select {
          height: 38px;
          padding: 0 12px;
          border-radius: 9px;
          border: 1.5px solid #94a3b8;
          background: #ffffff;
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          outline: none;
        }
        .punch-header-controls {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          flex-wrap: wrap;
        }
        .control-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .control-field label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
        }
        .punch-select {
          height: 38px;
          padding: 0 12px;
          border-radius: 9px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 13px;
          font-weight: 500;
          color: #0f172a;
          outline: none;
        }
        .btn-script-modal {
          height: 38px;
          padding: 0 14px;
          border-radius: 9px;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-script-modal:hover {
          background: #e2e8f0;
        }
        .btn-download-punch-template {
          height: 38px;
          padding: 0 14px;
          border-radius: 9px;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          font-size: 13px;
          font-weight: 600;
          color: #0284c7;
          display: flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-download-punch-template:hover {
          background: #e0f2fe;
          border-color: #7dd3fc;
        }
        .btn-apply-day-punches {
          height: 38px;
          padding: 0 16px;
          border-radius: 9px;
          border: none;
          background: #10b981;
          color: #ffffff;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
          transition: all 0.15s;
        }
        .btn-apply-day-punches:hover {
          background: #059669;
        }

        .punch-toolbar-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .punch-search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f1f5f9;
          border-radius: 8px;
          padding: 0 12px;
          height: 36px;
          width: 320px;
        }
        .punch-search-box input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 13px;
          color: #0f172a;
          width: 100%;
        }
        .toolbar-bulk-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .toolbar-label {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          margin-right: 4px;
        }
        .btn-bulk-pill {
          height: 32px;
          padding: 0 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-bulk-pill.in-pill:hover {
          background: #ecfdf5;
          border-color: #a7f3d0;
          color: #059669;
        }
        .btn-bulk-pill.out-pill:hover {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #2563eb;
        }
        .btn-bulk-pill.ot-pill:hover {
          background: #fffbeb;
          border-color: #fde68a;
          color: #d97706;
        }

        .punch-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 18px;
        }
        .punch-kpi-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 16px 20px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }
        .punch-kpi-card .kpi-label {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .punch-kpi-card .kpi-value {
          font-size: 24px;
          font-weight: 800;
          margin: 4px 0 2px 0;
        }
        .punch-kpi-card .kpi-subtext {
          font-size: 12px;
          color: #94a3b8;
        }

        .punch-table-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .punch-table-container {
          overflow-x: auto;
          max-height: 600px;
        }
        .punch-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .punch-table thead th {
          background: #f8fafc;
          color: #475569;
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          padding: 12px 14px;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 5;
        }
        .punch-table tbody tr {
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.12s;
        }
        .punch-table tbody tr:hover {
          background: #f8fafc;
        }
        .punch-table tbody tr.row-absent {
          background: #fffbfa;
        }
        .shift-hours-input {
          width: 58px;
          height: 28px;
          text-align: center;
          font-family: monospace;
          font-size: 12px;
          font-weight: 700;
          color: #1e293b;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #f8fafc;
          padding: 2px 4px;
          transition: all 0.15s;
        }
        .shift-hours-input:focus {
          border-color: #0284c7;
          background: #ffffff;
          outline: none;
          box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
        }

        .punch-table tbody td {
          padding: 10px 14px;
          vertical-align: middle;
        }

        .time-input-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .time-picker-field {
          height: 32px;
          padding: 0 8px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          font-size: 12px;
          font-weight: 600;
          font-family: monospace;
          background: #ffffff;
          outline: none;
          color: #0f172a;
        }
        .btn-stamp-now {
          height: 32px;
          padding: 0 8px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #f1f5f9;
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-stamp-now:hover {
          background: #0284c7;
          border-color: #0284c7;
          color: #ffffff;
        }

        .hours-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 6px;
          background: #f1f5f9;
          color: #334155;
          font-size: 12px;
        }
        .ot-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          font-family: monospace;
        }
        .ot-badge.positive {
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
        }
        .ot-badge.zero {
          background: #f8fafc;
          color: #94a3b8;
        }

        .status-pill-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 800;
          font-family: monospace;
        }
        .status-pill-badge.p {
          background: #dcfce7;
          color: #15803d;
        }
        .status-pill-badge.hd {
          background: #fef3c7;
          color: #b45309;
        }
        .status-pill-badge.a {
          background: #ffe4e6;
          color: #be123c;
        }
        .status-pill-badge.wo {
          background: #f3e8ff;
          color: #7e22ce;
        }

        .preset-btn-group {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        .btn-preset-mini {
          padding: 3px 8px;
          border-radius: 5px;
          font-size: 10px;
          font-weight: 700;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          cursor: pointer;
          transition: all 0.12s;
        }
        .btn-preset-mini:hover {
          background: #f1f5f9;
        }
        .btn-preset-mini.ot2:hover {
          background: #ecfdf5;
          border-color: #6ee7b7;
          color: #059669;
        }
        .btn-preset-mini.ot4:hover {
          background: #fffbeb;
          border-color: #fde68a;
          color: #d97706;
        }
        .btn-preset-mini.absent:hover {
          background: #ffe4e6;
          border-color: #fca5a5;
          color: #dc2626;
        }

        /* GOOGLE SCRIPT MODAL STYLES */
        .gscript-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .gscript-modal-content {
          background: #ffffff;
          border-radius: 20px;
          width: 100%;
          max-width: 820px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
        }
        .gscript-modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }
        .modal-title-group h3 {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .modal-subtitle {
          font-size: 13px;
          color: #64748b;
          margin-top: 4px;
          display: block;
        }
        .gscript-modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .guide-card-block {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 18px 20px;
        }
        .guide-card-block .block-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .guide-card-block .block-header h4 {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          flex: 1;
          margin-left: 10px;
        }
        .step-circle {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #0284c7;
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .guide-card-block p {
          font-size: 13px;
          color: #475569;
          line-height: 1.6;
          margin: 0;
        }
        .code-pre-box {
          background: #0f172a;
          color: #38bdf8;
          padding: 12px 16px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 12px;
          overflow-x: auto;
          margin: 10px 0 6px 0;
        }
        .code-pre-box.script-pre {
          color: #a5f3fc;
          max-height: 200px;
        }
        .code-tip {
          font-size: 12px;
          color: #64748b;
          font-style: italic;
        }
        .btn-copy-code, .btn-copy-mini {
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 12px;
          font-weight: 600;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-copy-code:hover, .btn-copy-mini:hover {
          background: #f1f5f9;
        }

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
        .btn-gsheet-action.copy-btn {
          background: #eff6ff;
          color: #1d4ed8;
          border-color: #bfdbfe;
        }

        .btn-gsheet-action.copy-btn:hover {
          background: #dbeafe;
          border-color: #93c5fd;
        }

        .btn-gsheet-action.download-btn {
          background: #f0fdf4;
          color: #15803d;
          border-color: #bbf7d0;
          text-decoration: none;
        }

        .btn-gsheet-action.download-btn:hover {
          background: #dcfce7;
          border-color: #86efac;
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
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #86efac;
          font-weight: 800;
        }
        .badge-wo {
          background: #eff6ff;
          color: #0284c7;
          border: 1px solid #bae6fd;
          font-weight: 800;
        }
        .badge-hd {
          background: #fef3c7;
          color: #b45309;
          border: 1px solid #fde68a;
          font-weight: 800;
        }
        .badge-a {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #fca5a5;
          font-weight: 800;
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

        /* =====================================================================
           MODAL, TAB 2, TAB 3 & QUICK RATE CONTROLS ENHANCED CSS
           ===================================================================== */
        .slip-modal-backdrop {
          position: fixed !important;
          inset: 0 !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          background: rgba(15, 23, 42, 0.75) !important;
          backdrop-filter: blur(6px) !important;
          -webkit-backdrop-filter: blur(6px) !important;
          z-index: 999999 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 20px !important;
          overflow-y: auto !important;
          box-sizing: border-box !important;
        }

        .slip-modal-content {
          background: #ffffff !important;
          border-radius: 14px !important;
          max-width: 960px !important;
          width: 100% !important;
          max-height: 92vh !important;
          overflow-y: auto !important;
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.4) !important;
          position: relative !important;
          z-index: 1000000 !important;
          border: 1px solid #cbd5e1 !important;
          display: flex !important;
          flex-direction: column !important;
        }

        .slip-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 22px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
          border-top-left-radius: 14px;
          border-top-right-radius: 14px;
        }

        .modal-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .modal-title-group h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
        }

        .worker-code-badge {
          background: #eff6ff;
          color: #2563eb;
          font-family: ui-monospace, SFMono-Regular, monospace;
          font-size: 12px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid #bfdbfe;
        }

        .modal-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-modal-print {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 7px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          background: #2563eb;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
          transition: all 0.15s ease;
        }
        .btn-modal-print:hover {
          background: #1d4ed8;
        }

        .btn-modal-csv {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 7px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid #a7f3d0;
          background: #ecfdf5;
          color: #059669;
          transition: all 0.15s ease;
        }
        .btn-modal-csv:hover {
          background: #d1fae5;
        }

        .btn-modal-close {
          background: transparent;
          border: none;
          cursor: pointer;
          color: #64748b;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-modal-close:hover {
          background: #fee2e2;
          color: #ef4444;
        }

        .slip-modal-body {
          padding: 20px 24px;
        }

        /* QUICK RATE CONTROLS BAR */
        .quick-rate-controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 16px;
          margin-bottom: 14px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .controls-left-group {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .control-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          font-weight: 600;
          color: #334155;
        }

        .control-input {
          width: 65px;
          padding: 4px 8px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          text-align: center;
          background: #fff;
          color: #0f172a;
        }

        .btn-apply-rates {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          background: #2563eb;
          color: #ffffff;
          border: none;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(37, 99, 235, 0.2);
          transition: all 0.15s ease;
        }
        .btn-apply-rates:hover {
          background: #1d4ed8;
        }

        /* IN-TABLE NUMERIC INPUT CELLS */
        .input-num-cell {
          width: 100%;
          padding: 4px 6px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          font-size: 11.5px;
          background: #ffffff;
          color: #0f172a;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          transition: all 0.15s ease;
          box-sizing: border-box;
        }
        .input-num-cell:focus {
          border-color: #2563eb;
          outline: none;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
          background: #eff6ff;
        }

        .table-row-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .btn-export-xix-bulk {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-export-xix-bulk:hover {
          background: #d1fae5;
        }

        .btn-row-action.csv-btn {
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
        }
        .btn-row-action.csv-btn:hover {
          background: #d1fae5;
        }

        /* TAB 2: PROCESSED SLIPS STYLING */
        .slips-table-wrapper {
          overflow-x: auto;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          margin-top: 14px;
          background: #ffffff;
        }
        .slips-summary-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .slips-summary-table th {
          background: #f8fafc;
          color: #475569;
          font-weight: 700;
          padding: 11px 12px;
          border-bottom: 2px solid #e2e8f0;
          text-align: left;
          white-space: nowrap;
          font-size: 11px;
          text-transform: uppercase;
        }
        .slips-summary-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #f1f5f9;
          color: #1e293b;
        }
        .slips-summary-table tr:hover {
          background: #f8fafc;
        }

        .btn-export-bulk-csv {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-export-bulk-csv:hover {
          background: #d1fae5;
        }

        .btn-export-xvii {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          color: #334155;
          border: 1px solid #cbd5e1;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-export-xvii:hover {
          background: #f1f5f9;
        }

        .btn-action-view, .btn-action-print, .btn-action-csv {
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid #cbd5e1;
          background: #fff;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-right: 4px;
          transition: all 0.15s ease;
        }
        .btn-action-view {
          color: #2563eb;
          border-color: #bfdbfe;
          background: #eff6ff;
        }
        .btn-action-view:hover {
          background: #dbeafe;
        }
        .btn-action-print {
          color: #0f172a;
        }
        .btn-action-print:hover {
          background: #f1f5f9;
        }
        .btn-action-csv {
          color: #059669;
          border-color: #a7f3d0;
          background: #ecfdf5;
        }
        .btn-action-csv:hover {
          background: #d1fae5;
        }

        /* TAB 3: GOOGLE SHEETS & UPLOAD CARD STYLING */
        .gsheet-import-card {
          background: #ffffff;
          border-radius: 14px;
          padding: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
          margin-bottom: 24px;
        }
        .gsheet-import-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .gsheet-import-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #dcfce7;
          color: #15803d;
          font-size: 11.5px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 6px;
        }
        .gsheet-demo-pill {
          font-size: 11px;
          font-weight: 700;
          color: #2563eb;
          background: #eff6ff;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .gsheet-import-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px 0;
        }
        .gsheet-import-desc {
          font-size: 13px;
          color: #64748b;
          margin: 0 0 18px 0;
          line-height: 1.5;
        }
        .gsheet-import-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .gsheet-url-input-wrap {
          display: flex;
          align-items: center;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          padding: 4px 12px;
          background: #ffffff;
          transition: border-color 0.15s ease;
        }
        .gsheet-url-input-wrap:focus-within {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .gsheet-link-icon {
          color: #64748b;
          margin-right: 8px;
        }
        .gsheet-main-input {
          border: none;
          outline: none;
          flex: 1;
          font-size: 13.5px;
          padding: 8px 0;
          color: #0f172a;
        }
        .gsheet-clear-url-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          padding: 4px;
        }
        .gsheet-import-buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .btn-gsheet-pull {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #059669;
          color: #ffffff;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(5, 150, 105, 0.25);
          transition: all 0.15s ease;
        }
        .btn-gsheet-pull:hover:not(:disabled) {
          background: #047857;
        }
        .btn-gsheet-demo {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          color: #334155;
          border: 1px solid #cbd5e1;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-gsheet-demo:hover:not(:disabled) {
          background: #f1f5f9;
        }
        .gsheet-tip-box {
          background: #f8fafc;
          border-left: 3px solid #2563eb;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 12px;
          color: #475569;
          margin-top: 14px;
        }
        .upload-divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 24px 0;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .upload-divider::before, .upload-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px dashed #cbd5e1;
        }
        .upload-divider span {
          padding: 0 14px;
        }

      `}</style>
    </div>
  );
}

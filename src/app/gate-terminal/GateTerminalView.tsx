"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Clock,
  ShieldCheck,
  Building2,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  LogOut,
  LogIn,
  Maximize2,
  Minimize2,
  Lock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  RefreshCw,
} from "lucide-react";

export interface CompanyConfig {
  id: string;
  name: string;
  shortName: string;
  code: string;
  location: string;
  cycleType: string;
  activeShift: number;
}

export const COMPANY_CATALOG: Record<string, CompanyConfig> = {
  celebrity: {
    id: "celebrity",
    name: "Celebrity Brewing Private Limited",
    shortName: "Celebrity Brewing",
    code: "CBPL",
    location: "Brewery Unit, Gate #1",
    cycleType: "16th to 15th",
    activeShift: 8,
  },
  vodabox: {
    id: "vodabox",
    name: "Vodabox Electromech Private Limited",
    shortName: "Vodabox",
    code: "VEPL",
    location: "Factory Gate #2",
    cycleType: "1st to 31st",
    activeShift: 8,
  },
  jubilant: {
    id: "jubilant",
    name: "Jubilant Constructions Private Limited",
    shortName: "Jubilant",
    code: "JCPL",
    location: "Site Main Entrance",
    cycleType: "1st to 31st",
    activeShift: 8,
  },
};

interface WorkerItem {
  slNo: number;
  code: string;
  name: string;
  department: string;
  designation: string;
  rate?: number;
}

interface WorkerPunch {
  inTime: string;
  outTime: string;
  shiftStandard: number;
  totalHours: number;
  otHours: number;
  status: "P" | "HD" | "A" | "WO";
  updatedAt?: string;
}

const BACKEND_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:5000";

interface GateTerminalViewProps {
  initialCompanySlug?: string;
}

export default function GateTerminalView({ initialCompanySlug = "celebrity" }: GateTerminalViewProps) {
  // Normalize company slug
  const normalizedSlug = useMemo(() => {
    const s = (initialCompanySlug || "celebrity").toLowerCase().trim();
    if (s.includes("voda")) return "vodabox";
    if (s.includes("jubi")) return "jubilant";
    return "celebrity";
  }, [initialCompanySlug]);

  const activeCompany = COMPANY_CATALOG[normalizedSlug] || COMPANY_CATALOG.celebrity;

  // Authentication State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");

  // Date State: Dynamic Real-time Today!
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number>(() => new Date().getDate());

  // Live Clock State
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDateStr, setCurrentDateStr] = useState<string>("");

  // Workers & Punches State
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [punches, setPunches] = useState<Record<string, WorkerPunch>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<"all" | "in" | "out" | "ot" | "absent">("all");
  const [shiftHours, setShiftHours] = useState<number>(activeCompany.activeShift || 8);
  const [saveStatusMsg, setSaveStatusMsg] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Live Clock Effect
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour12: true }));
      setCurrentDateStr(
        now.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check saved session for this specific company
  useEffect(() => {
    try {
      const sessionKey = `gate_unlocked_${normalizedSlug}`;
      const savedAuth = sessionStorage.getItem(sessionKey);
      if (savedAuth === "true") {
        setIsUnlocked(true);
      }
    } catch (e) {}
  }, [normalizedSlug]);

  // Fetch Workers when terminal is unlocked
  useEffect(() => {
    if (!isUnlocked) return;
    setLoading(true);
    axios
      .get(`${BACKEND_BASE}/api/v1/public-gate/workers?company=${normalizedSlug}`)
      .then((res) => {
        if (res.data?.data && Array.isArray(res.data.data)) {
          setWorkers(res.data.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load workers:", err);
      })
      .finally(() => setLoading(false));
  }, [normalizedSlug, isUnlocked]);

  // Fetch Punches when date or company changes
  useEffect(() => {
    if (!isUnlocked) return;
    axios
      .get(
        `${BACKEND_BASE}/api/v1/public-gate/punches?company=${normalizedSlug}&year=${selectedYear}&month=${selectedMonth}&day=${selectedDay}`
      )
      .then((res) => {
        if (res.data?.data?.punches) {
          setPunches(res.data.data.punches);
        } else {
          setPunches({});
        }
      })
      .catch(() => {});
  }, [normalizedSlug, selectedYear, selectedMonth, selectedDay, isUnlocked]);

  // PIN Unlock Verification
  const handleUnlock = async () => {
    const cleanPin = pinInput.trim();
    if (!cleanPin) {
      setPinError(`Please enter the 4-digit Security PIN for ${activeCompany.shortName}.`);
      return;
    }
    try {
      const res = await axios.post(`${BACKEND_BASE}/api/v1/public-gate/verify-pin`, {
        pin: cleanPin,
        companyId: normalizedSlug,
      });

      if (res.data?.success) {
        setIsUnlocked(true);
        setPinError("");
        sessionStorage.setItem(`gate_unlocked_${normalizedSlug}`, "true");
      } else {
        setPinError(res.data?.message || "Invalid Security PIN. Access Denied.");
      }
    } catch (err: any) {
      setPinError(
        err.response?.data?.message || `Incorrect Security PIN for ${activeCompany.shortName}. Access Denied.`
      );
    }
  };

  const handleLockTerminal = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem(`gate_unlocked_${normalizedSlug}`);
    setPinInput("");
  };

  // Time & OT Parsing Helpers
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

  const computePunchTimes = (inTime: string, outTime: string, standardShift: number) => {
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
      outH += outH <= 12 && inH <= 12 ? 12 : 24;
    }
    const totalHours = Math.round((outH - inH) * 100) / 100;
    const otHours = Math.round(Math.max(0, totalHours - standardShift) * 100) / 100;
    const status: "P" | "HD" | "A" =
      totalHours >= standardShift ? "P" : totalHours >= standardShift / 2 ? "HD" : totalHours > 0 ? "P" : "A";
    return { totalHours, otHours, status };
  };

  const getNowTimeString = () => {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  // Stamp Check-In / Check-Out for a single worker
  const handleStampWorker = async (workerCode: string, type: "in" | "out") => {
    const cur = punches[workerCode] || {
      inTime: "",
      outTime: "",
      shiftStandard: shiftHours,
      totalHours: 0,
      otHours: 0,
      status: "A",
    };

    const stampTime = getNowTimeString();
    const newIn = type === "in" ? stampTime : cur.inTime || "09:30";
    const newOut = type === "out" ? stampTime : cur.outTime;

    const stdShift = cur.shiftStandard || shiftHours;
    const computed = computePunchTimes(newIn, newOut, stdShift);

    const updatedPunch: WorkerPunch = {
      ...cur,
      inTime: newIn,
      outTime: newOut,
      shiftStandard: stdShift,
      ...computed,
      updatedAt: new Date().toISOString(),
    };

    const nextPunches = { ...punches, [workerCode]: updatedPunch };
    setPunches(nextPunches);

    setSavingKey(workerCode);
    try {
      await axios.post(`${BACKEND_BASE}/api/v1/public-gate/punch`, {
        company: normalizedSlug,
        year: selectedYear,
        month: selectedMonth,
        day: selectedDay,
        workerCode,
        punchData: updatedPunch,
      });
      setSaveStatusMsg(`Saved ${workerCode} punch!`);
      setTimeout(() => setSaveStatusMsg(null), 2500);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSavingKey(null);
    }
  };

  // Custom In/Out Time Edit
  const handleTimeChange = async (workerCode: string, field: "inTime" | "outTime", val: string) => {
    const cur = punches[workerCode] || {
      inTime: "",
      outTime: "",
      shiftStandard: shiftHours,
      totalHours: 0,
      otHours: 0,
      status: "A",
    };

    const newIn = field === "inTime" ? val : cur.inTime;
    const newOut = field === "outTime" ? val : cur.outTime;
    const stdShift = cur.shiftStandard || shiftHours;
    const computed = computePunchTimes(newIn, newOut, stdShift);

    const updatedPunch: WorkerPunch = {
      ...cur,
      inTime: newIn,
      outTime: newOut,
      shiftStandard: stdShift,
      ...computed,
      updatedAt: new Date().toISOString(),
    };

    const nextPunches = { ...punches, [workerCode]: updatedPunch };
    setPunches(nextPunches);

    try {
      await axios.post(`${BACKEND_BASE}/api/v1/public-gate/punch`, {
        company: normalizedSlug,
        year: selectedYear,
        month: selectedMonth,
        day: selectedDay,
        workerCode,
        punchData: updatedPunch,
      });
    } catch (e) {}
  };

  // Custom Overtime Manual Override
  const handleOtOverride = async (workerCode: string, manualOt: number) => {
    const cur = punches[workerCode] || {
      inTime: "",
      outTime: "",
      shiftStandard: shiftHours,
      totalHours: 0,
      otHours: 0,
      status: "A",
    };

    const cleanOt = isNaN(manualOt) || manualOt < 0 ? 0 : Math.round(manualOt * 10) / 10;
    const updatedPunch: WorkerPunch = {
      ...cur,
      otHours: cleanOt,
      status: cleanOt > 0 ? "P" : cur.status,
      updatedAt: new Date().toISOString(),
    };

    const nextPunches = { ...punches, [workerCode]: updatedPunch };
    setPunches(nextPunches);

    try {
      await axios.post(`${BACKEND_BASE}/api/v1/public-gate/punch`, {
        company: normalizedSlug,
        year: selectedYear,
        month: selectedMonth,
        day: selectedDay,
        workerCode,
        punchData: updatedPunch,
      });
    } catch (e) {}
  };

  // Bulk Actions
  const handleBulkCheckIn = async (timeStr: string = "09:30") => {
    const updated: Record<string, WorkerPunch> = { ...punches };
    workers.forEach((w) => {
      const cur = updated[w.code] || {
        inTime: "",
        outTime: "",
        shiftStandard: shiftHours,
        totalHours: 0,
        otHours: 0,
        status: "A",
      };
      const computed = computePunchTimes(timeStr, cur.outTime, cur.shiftStandard || shiftHours);
      updated[w.code] = {
        ...cur,
        inTime: timeStr,
        ...computed,
      };
    });
    setPunches(updated);

    try {
      await axios.post(`${BACKEND_BASE}/api/v1/public-gate/bulk-punch`, {
        company: normalizedSlug,
        year: selectedYear,
        month: selectedMonth,
        day: selectedDay,
        punches: updated,
      });
      setSaveStatusMsg(`Stamped 09:30 AM Check-In for all ${workers.length} workers!`);
      setTimeout(() => setSaveStatusMsg(null), 3000);
    } catch (e) {}
  };

  const handleBulkCheckOut = async (timeStr: string = "17:30") => {
    const updated: Record<string, WorkerPunch> = { ...punches };
    workers.forEach((w) => {
      const cur = updated[w.code] || {
        inTime: "09:30",
        outTime: "",
        shiftStandard: shiftHours,
        totalHours: 0,
        otHours: 0,
        status: "P",
      };
      const inT = cur.inTime || "09:30";
      const computed = computePunchTimes(inT, timeStr, cur.shiftStandard || shiftHours);
      updated[w.code] = {
        ...cur,
        inTime: inT,
        outTime: timeStr,
        ...computed,
      };
    });
    setPunches(updated);

    try {
      await axios.post(`${BACKEND_BASE}/api/v1/public-gate/bulk-punch`, {
        company: normalizedSlug,
        year: selectedYear,
        month: selectedMonth,
        day: selectedDay,
        punches: updated,
      });
      setSaveStatusMsg(`Stamped 05:30 PM Shift-End Out for all ${workers.length} workers!`);
      setTimeout(() => setSaveStatusMsg(null), 3000);
    } catch (e) {}
  };

  const handleBulkAddOt2 = async () => {
    const updated: Record<string, WorkerPunch> = { ...punches };
    workers.forEach((w) => {
      const cur = updated[w.code] || {
        inTime: "09:30",
        outTime: "17:30",
        shiftStandard: shiftHours,
        totalHours: 8,
        otHours: 0,
        status: "P",
      };
      const inT = cur.inTime || "09:30";
      const outT = "19:30";
      const computed = computePunchTimes(inT, outT, cur.shiftStandard || shiftHours);
      updated[w.code] = {
        ...cur,
        inTime: inT,
        outTime: outT,
        ...computed,
        otHours: 2,
      };
    });
    setPunches(updated);

    try {
      await axios.post(`${BACKEND_BASE}/api/v1/public-gate/bulk-punch`, {
        company: normalizedSlug,
        year: selectedYear,
        month: selectedMonth,
        day: selectedDay,
        punches: updated,
      });
      setSaveStatusMsg(`Stamped +2.0h Overtime (07:30 PM Out) for all workers!`);
      setTimeout(() => setSaveStatusMsg(null), 3000);
    } catch (e) {}
  };

  // Filtered workers list
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        w.name.toLowerCase().includes(q) ||
        w.code.toLowerCase().includes(q) ||
        (w.department && w.department.toLowerCase().includes(q)) ||
        (w.designation && w.designation.toLowerCase().includes(q));

      if (!matchSearch) return false;

      const p = punches[w.code];
      if (activeFilter === "in") return Boolean(p?.inTime);
      if (activeFilter === "out") return Boolean(p?.outTime);
      if (activeFilter === "ot") return (p?.otHours || 0) > 0;
      if (activeFilter === "absent") return !p?.inTime || p?.status === "A";
      return true;
    });
  }, [workers, punches, searchQuery, activeFilter]);

  // KPI Calculations
  const stats = useMemo(() => {
    const totalWorkers = workers.length;
    let punchedIn = 0;
    let punchedOut = 0;
    let otCount = 0;
    let totalOtHours = 0;

    workers.forEach((w) => {
      const p = punches[w.code];
      if (p?.inTime) punchedIn++;
      if (p?.outTime) punchedOut++;
      if ((p?.otHours || 0) > 0) {
        otCount++;
        totalOtHours += p.otHours;
      }
    });

    return {
      totalWorkers,
      punchedIn,
      punchedOut,
      otCount,
      totalOtHours: Math.round(totalOtHours * 10) / 10,
    };
  }, [workers, punches]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Check if a given day is Sunday
  const isSunday = (y: number, m: number, d: number) => {
    return new Date(y, m - 1, d).getDay() === 0;
  };

  // -------------------------------------------------------------
  // SCREEN 1: COMPANY-SPECIFIC PIN AUTHENTICATION SCREEN
  // -------------------------------------------------------------
  if (!isUnlocked) {
    return (
      <div className="gate-auth-container">
        <div className="gate-auth-card">
          <div className="gate-auth-header">
            <div className="shield-icon-badge">
              <ShieldCheck size={44} className="text-emerald-500" />
            </div>
            <div className="company-tag">
              <Building2 size={14} />
              <span>{activeCompany.code}</span>
            </div>
            <h1 className="gate-auth-title">{activeCompany.name.toUpperCase()}</h1>
            <p className="gate-auth-subtitle">
              {activeCompany.location} — Official Security Gate Station
            </p>
          </div>

          <div className="gate-pin-box">
            <label className="field-label">
              <Lock size={14} /> Enter 4-Digit Security Gate PIN:
            </label>
            <div className="pin-input-wrapper">
              <input
                type="password"
                maxLength={4}
                className="pin-input"
                placeholder="• • • •"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value.replace(/[^0-9]/g, ""));
                  setPinError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUnlock();
                }}
                autoFocus
              />
              <button
                type="button"
                className="btn-unlock"
                onClick={handleUnlock}
              >
                <span>Unlock Gate</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {pinError && (
              <div className="pin-error-alert">
                <AlertCircle size={16} className="text-rose-500" />
                <span>{pinError}</span>
              </div>
            )}
          </div>

          <div className="gate-auth-footer">
            <div className="system-status">
              <span className="status-dot"></span>
              <span>Online • Database Connected • Auto-Sync Active</span>
            </div>
            <div className="current-clock-pill">
              <Clock size={13} /> {currentDateStr} | {currentTime}
            </div>
          </div>
        </div>

        <style jsx>{`
          .gate-auth-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          .gate-auth-card {
            width: 100%;
            max-width: 480px;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            padding: 36px 32px;
            text-align: center;
          }
          .shield-icon-badge {
            width: 72px;
            height: 72px;
            border-radius: 20px;
            background: #ecfdf5;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 14px;
          }
          .company-tag {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.08em;
            color: #059669;
            background: #d1fae5;
            padding: 3px 10px;
            border-radius: 9999px;
            margin-bottom: 8px;
          }
          .gate-auth-title {
            font-size: 18px;
            font-weight: 900;
            color: #0f172a;
            margin: 0 0 6px 0;
            line-height: 1.3;
          }
          .gate-auth-subtitle {
            font-size: 13px;
            color: #64748b;
            margin: 0 0 24px 0;
            font-weight: 500;
          }
          .gate-pin-box {
            text-align: left;
            margin-bottom: 24px;
          }
          .field-label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 700;
            color: #334155;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .pin-input-wrapper {
            display: flex;
            gap: 10px;
          }
          .pin-input {
            flex: 1;
            height: 48px;
            background: #f8fafc;
            border: 2px solid #059669;
            border-radius: 12px;
            font-size: 24px;
            letter-spacing: 12px;
            text-align: center;
            color: #0f172a;
            font-weight: 900;
            outline: none;
            transition: all 0.2s;
          }
          .pin-input:focus {
            border-color: #10b981;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
            background: #ffffff;
          }
          .btn-unlock {
            height: 48px;
            padding: 0 20px;
            background: #059669;
            color: #ffffff;
            border: none;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            transition: background 0.2s;
          }
          .btn-unlock:hover {
            background: #047857;
          }
          .pin-error-alert {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 10px;
            padding: 10px 14px;
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #b91c1c;
            font-size: 12px;
            font-weight: 600;
            border-radius: 8px;
          }
          .gate-auth-footer {
            border-top: 1px solid #f1f5f9;
            padding-top: 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            align-items: center;
          }
          .system-status {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            color: #059669;
            font-weight: 600;
          }
          .status-dot {
            width: 8px;
            height: 8px;
            background: #10b981;
            border-radius: 50%;
            display: inline-block;
          }
          .current-clock-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: #64748b;
            font-weight: 600;
          }
        `}</style>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 2: ACTIVE GATE PUNCH TERMINAL
  // -------------------------------------------------------------
  return (
    <div className={`gate-main-container ${isFullscreen ? "fullscreen" : ""}`}>
      {/* Top Navbar */}
      <header className="gate-navbar">
        <div className="nav-left">
          <div className="company-badge">
            <Building2 size={18} className="text-emerald-400" />
            <div>
              <div className="company-name">{activeCompany.name}</div>
              <div className="company-sub">
                {activeCompany.location} • Wage Cycle: {activeCompany.cycleType}
              </div>
            </div>
          </div>
        </div>

        <div className="nav-center">
          {/* Real-time Date Navigator */}
          <div className="date-navigator">
            <button
              type="button"
              className="btn-date-nav"
              onClick={() => setSelectedDay((prev) => Math.max(1, prev - 1))}
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="date-display">
              <Calendar size={14} className="text-emerald-400" />
              <span>
                {String(selectedDay).padStart(2, "0")} / {String(selectedMonth).padStart(2, "0")} / {selectedYear}
              </span>
            </div>
            <button
              type="button"
              className="btn-date-nav"
              onClick={() => setSelectedDay((prev) => Math.min(31, prev + 1))}
              title="Next Day"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className="btn-today"
              onClick={() => {
                const now = new Date();
                setSelectedYear(now.getFullYear());
                setSelectedMonth(now.getMonth() + 1);
                setSelectedDay(now.getDate());
              }}
              title="Jump to Today"
            >
              Today
            </button>
          </div>
        </div>

        <div className="nav-right">
          <div className="live-clock">
            <Clock size={15} className="text-emerald-400" />
            <span>{currentTime}</span>
          </div>

          <button
            type="button"
            className="btn-nav-action"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <button
            type="button"
            className="btn-lock-gate"
            onClick={handleLockTerminal}
            title="Lock Gate Terminal"
          >
            <LogOut size={15} />
            <span>Lock Gate</span>
          </button>
        </div>
      </header>

      {/* Save Notification Toast */}
      {saveStatusMsg && (
        <div className="save-toast">
          <CheckCircle2 size={16} />
          <span>{saveStatusMsg}</span>
        </div>
      )}

      {/* KPI Cards Row */}
      <section className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">TOTAL REGISTERED</div>
          <div className="kpi-value">{stats.totalWorkers}</div>
          <div className="kpi-desc">On active muster</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">CHECKED IN TODAY</div>
          <div className="kpi-value text-emerald-600">{stats.punchedIn}</div>
          <div className="kpi-desc">
            {stats.totalWorkers > 0 ? `${Math.round((stats.punchedIn / stats.totalWorkers) * 100)}% attendance` : "0%"}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">CHECKED OUT</div>
          <div className="kpi-value text-blue-600">{stats.punchedOut}</div>
          <div className="kpi-desc">Shift completed</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">OVERTIME (OT)</div>
          <div className="kpi-value text-amber-600">+{stats.totalOtHours}h</div>
          <div className="kpi-desc">{stats.otCount} workers with extra hours</div>
        </div>
      </section>

      {/* Action Toolbar */}
      <section className="action-toolbar">
        <div className="search-box">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeCompany.shortName} workers by code, name, designation...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-pills">
          <button
            type="button"
            className={`pill ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            All ({workers.length})
          </button>
          <button
            type="button"
            className={`pill ${activeFilter === "in" ? "active" : ""}`}
            onClick={() => setActiveFilter("in")}
          >
            Checked In ({stats.punchedIn})
          </button>
          <button
            type="button"
            className={`pill ${activeFilter === "ot" ? "active" : ""}`}
            onClick={() => setActiveFilter("ot")}
          >
            OT Active ({stats.otCount})
          </button>
          <button
            type="button"
            className={`pill ${activeFilter === "absent" ? "active" : ""}`}
            onClick={() => setActiveFilter("absent")}
          >
            Absent ({workers.length - stats.punchedIn})
          </button>
        </div>

        <div className="bulk-actions">
          <button
            type="button"
            className="btn-bulk"
            onClick={() => handleBulkCheckIn("09:30")}
            title="Punch In all workers at 09:30 AM"
          >
            <LogIn size={14} /> Bulk In (09:30 AM)
          </button>
          <button
            type="button"
            className="btn-bulk"
            onClick={() => handleBulkCheckOut("17:30")}
            title="Punch Out all workers at 05:30 PM"
          >
            <LogOut size={14} /> Bulk Out (05:30 PM)
          </button>
          <button
            type="button"
            className="btn-bulk btn-bulk-ot"
            onClick={handleBulkAddOt2}
            title="Set Out at 07:30 PM (+2.0h Overtime)"
          >
            +2.0h Overtime
          </button>
        </div>
      </section>

      {/* Workers Roster Table */}
      <section className="table-wrapper">
        <table className="roster-table">
          <thead>
            <tr>
              <th style={{ width: "45px" }}>#</th>
              <th>WORKER NAME &amp; CODE</th>
              <th>DEPARTMENT</th>
              <th style={{ width: "190px" }}>CHECK-IN (IN)</th>
              <th style={{ width: "190px" }}>CHECK-OUT (OUT)</th>
              <th style={{ width: "100px" }}>TOTAL TIME</th>
              <th style={{ width: "100px" }}>OVERTIME (OT)</th>
              <th style={{ width: "80px" }}>STATUS</th>
              <th style={{ width: "180px" }}>QUICK PRESETS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="loading-cell">
                  <RefreshCw size={20} className="animate-spin text-emerald-600" />
                  <span>Loading {activeCompany.shortName} workers...</span>
                </td>
              </tr>
            ) : filteredWorkers.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-cell">
                  No workers matching filter.
                </td>
              </tr>
            ) : (
              filteredWorkers.map((w, idx) => {
                const p = punches[w.code];
                const inTime = p?.inTime || "";
                const outTime = p?.outTime || "";
                const totalHours = p?.totalHours && p.totalHours > 0 ? `${p.totalHours}h` : "-";
                const otHours = p?.otHours !== undefined ? p.otHours : 0;
                const status =
                  p?.status ||
                  (isSunday(selectedYear, selectedMonth, selectedDay) ? "WO" : "A");

                const isSaving = savingKey === w.code;

                return (
                  <tr key={w.code} className={`worker-row ${isSaving ? "row-saving" : ""}`}>
                    <td className="col-idx">{idx + 1}</td>
                    <td className="col-worker">
                      <div className="worker-name">{w.name}</div>
                      <div className="worker-code">{w.code}</div>
                    </td>
                    <td className="col-dept">{w.department || "General"}</td>
                    <td className="col-punch">
                      <div className="punch-cell-box">
                        <input
                          type="text"
                          className="time-input"
                          placeholder="--:--"
                          value={inTime}
                          onChange={(e) => handleTimeChange(w.code, "inTime", e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn-stamp btn-stamp-in"
                          onClick={() => handleStampWorker(w.code, "in")}
                          title="Stamp current time as In"
                        >
                          <LogIn size={13} className="text-emerald-600" />
                          <span>In (Now)</span>
                        </button>
                      </div>
                    </td>
                    <td className="col-punch">
                      <div className="punch-cell-box">
                        <input
                          type="text"
                          className="time-input"
                          placeholder="--:--"
                          value={outTime}
                          onChange={(e) => handleTimeChange(w.code, "outTime", e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn-stamp btn-stamp-out"
                          onClick={() => handleStampWorker(w.code, "out")}
                          title="Stamp current time as Out"
                        >
                          <LogOut size={13} className="text-rose-600" />
                          <span>Out (Now)</span>
                        </button>
                      </div>
                    </td>
                    <td className="col-total">
                      <span className="total-badge">{totalHours}</span>
                    </td>
                    <td className="col-ot">
                      <div className="ot-input-wrap">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="16"
                          className={`ot-input ${otHours > 0 ? "ot-active" : ""}`}
                          value={otHours}
                          onChange={(e) => handleOtOverride(w.code, parseFloat(e.target.value))}
                        />
                        <span className="ot-unit">h</span>
                      </div>
                    </td>
                    <td className="col-status">
                      <span className={`status-pill status-${status.toLowerCase()}`}>
                        {status}
                      </span>
                    </td>
                    <td className="col-presets">
                      <div className="presets-wrap">
                        <button
                          type="button"
                          className="btn-preset"
                          onClick={() => {
                            handleTimeChange(w.code, "inTime", "09:30");
                            handleTimeChange(w.code, "outTime", "17:30");
                          }}
                          title="8h Standard Shift (09:30 to 17:30)"
                        >
                          Std
                        </button>
                        <button
                          type="button"
                          className="btn-preset"
                          onClick={() => {
                            handleTimeChange(w.code, "inTime", "09:30");
                            handleTimeChange(w.code, "outTime", "19:30");
                          }}
                          title="+2h Overtime (09:30 to 19:30)"
                        >
                          +2h
                        </button>
                        <button
                          type="button"
                          className="btn-preset"
                          onClick={() => {
                            handleTimeChange(w.code, "inTime", "09:30");
                            handleTimeChange(w.code, "outTime", "21:30");
                          }}
                          title="+4h Overtime (09:30 to 21:30)"
                        >
                          +4h
                        </button>
                        <button
                          type="button"
                          className="btn-preset btn-preset-absent"
                          onClick={() => {
                            handleTimeChange(w.code, "inTime", "");
                            handleTimeChange(w.code, "outTime", "");
                          }}
                          title="Mark Absent (Clear Times)"
                        >
                          Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      <style jsx>{`
        .gate-main-container {
          min-height: 100vh;
          background: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #0f172a;
          padding-bottom: 30px;
        }
        .gate-navbar {
          background: #0f172a;
          color: #ffffff;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #1e293b;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .company-badge {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .company-name {
          font-size: 15px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.01em;
        }
        .company-sub {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
        }
        .date-navigator {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #1e293b;
          padding: 4px 8px;
          border-radius: 10px;
          border: 1px solid #334155;
        }
        .btn-date-nav {
          background: transparent;
          border: none;
          color: #94a3b8;
          width: 26px;
          height: 26px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .btn-date-nav:hover {
          background: #334155;
          color: #ffffff;
        }
        .date-display {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
          padding: 0 8px;
        }
        .btn-today {
          background: #059669;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          cursor: pointer;
        }
        .btn-today:hover {
          background: #047857;
        }
        .nav-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .live-clock {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          color: #e2e8f0;
          background: #1e293b;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid #334155;
        }
        .btn-nav-action {
          background: #1e293b;
          border: 1px solid #334155;
          color: #94a3b8;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .btn-nav-action:hover {
          color: #ffffff;
          background: #334155;
        }
        .btn-lock-gate {
          background: #334155;
          border: 1px solid #475569;
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        .btn-lock-gate:hover {
          background: #dc2626;
          border-color: #dc2626;
        }
        .save-toast {
          position: fixed;
          top: 70px;
          right: 24px;
          background: #059669;
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          padding: 10px 16px;
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 100;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          padding: 20px 24px;
        }
        .kpi-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .kpi-label {
          font-size: 11px;
          font-weight: 800;
          color: #64748b;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }
        .kpi-value {
          font-size: 26px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.1;
        }
        .kpi-desc {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 4px;
          font-weight: 500;
        }
        .action-toolbar {
          padding: 0 24px 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
          border-radius: 10px;
          width: 340px;
        }
        .search-box input {
          border: none;
          outline: none;
          font-size: 13px;
          width: 100%;
          background: transparent;
        }
        .filter-pills {
          display: flex;
          gap: 6px;
        }
        .pill {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          padding: 6px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
        }
        .pill.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }
        .bulk-actions {
          display: flex;
          gap: 8px;
        }
        .btn-bulk {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #1e293b;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        .btn-bulk:hover {
          background: #f1f5f9;
        }
        .btn-bulk-ot {
          background: #fef3c7;
          border-color: #fde68a;
          color: #92400e;
        }
        .btn-bulk-ot:hover {
          background: #fde68a;
        }
        .table-wrapper {
          padding: 0 24px;
        }
        .roster-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }
        .roster-table th {
          background: #f1f5f9;
          color: #475569;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-align: left;
          padding: 12px 14px;
          border-bottom: 1px solid #e2e8f0;
        }
        .worker-row td {
          padding: 10px 14px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 13px;
        }
        .worker-row:hover {
          background: #f8fafc;
        }
        .col-idx {
          color: #94a3b8;
          font-weight: 700;
        }
        .worker-name {
          font-weight: 700;
          color: #0f172a;
        }
        .worker-code {
          font-size: 11px;
          color: #64748b;
          font-family: monospace;
          font-weight: 600;
        }
        .col-dept {
          color: #475569;
          font-weight: 500;
        }
        .punch-cell-box {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .time-input {
          width: 65px;
          height: 32px;
          text-align: center;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
        }
        .btn-stamp {
          height: 32px;
          padding: 0 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          border: 1px solid transparent;
        }
        .btn-stamp-in {
          background: #ecfdf5;
          color: #065f46;
          border-color: #a7f3d0;
        }
        .btn-stamp-in:hover {
          background: #d1fae5;
        }
        .btn-stamp-out {
          background: #fff1f2;
          color: #9f1239;
          border-color: #fecdd3;
        }
        .btn-stamp-out:hover {
          background: #ffe4e6;
        }
        .total-badge {
          background: #f1f5f9;
          color: #334155;
          font-size: 12px;
          font-weight: 800;
          padding: 4px 8px;
          border-radius: 6px;
        }
        .ot-input-wrap {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .ot-input {
          width: 48px;
          height: 30px;
          text-align: center;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
        }
        .ot-input.ot-active {
          background: #fef3c7;
          border-color: #fbbf24;
          color: #92400e;
          font-weight: 900;
        }
        .ot-unit {
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
        }
        .status-pill {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 6px;
          text-align: center;
        }
        .status-p {
          background: #dcfce7;
          color: #166534;
        }
        .status-hd {
          background: #fef3c7;
          color: #92400e;
        }
        .status-a {
          background: #fee2e2;
          color: #991b1b;
        }
        .status-wo {
          background: #e2e8f0;
          color: #475569;
        }
        .presets-wrap {
          display: flex;
          gap: 4px;
        }
        .btn-preset {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 6px;
          border-radius: 4px;
          cursor: pointer;
          color: #334155;
        }
        .btn-preset:hover {
          background: #f1f5f9;
        }
        .btn-preset-absent {
          color: #b91c1c;
          border-color: #fca5a5;
        }
        .btn-preset-absent:hover {
          background: #fef2f2;
        }
        .loading-cell,
        .empty-cell {
          text-align: center;
          padding: 36px !important;
          color: #64748b;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

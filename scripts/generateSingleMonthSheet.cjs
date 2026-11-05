const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const workersFile = path.resolve(__dirname, '../../hrm_backend/module/labourWage/celebrity144Workers.json');
let workers = [];
if (fs.existsSync(workersFile)) {
  const raw = fs.readFileSync(workersFile, 'utf8');
  workers = JSON.parse(raw).workers || [];
}

const dateColumns = [
  "16-Oct", "17-Oct", "18-Oct", "19-Oct", "20-Oct", "21-Oct", "22-Oct", "23-Oct", "24-Oct", "25-Oct",
  "26-Oct", "27-Oct", "28-Oct", "29-Oct", "30-Oct", "31-Oct", "01-Nov", "02-Nov", "03-Nov", "04-Nov",
  "05-Nov", "06-Nov", "07-Nov", "08-Nov", "09-Nov", "10-Nov", "11-Nov", "12-Nov", "13-Nov", "14-Nov", "15-Nov"
];

// Determine Sundays in the 16-Oct-2026 to 15-Nov-2026 period:
// Oct 18, Oct 25, Nov 1, Nov 8, Nov 15 were Sundays
const sundaySet = new Set(["18-Oct", "25-Oct", "01-Nov", "08-Nov", "15-Nov"]);

const headers = [
  "SL NO", "EMP CODE", "EMPLOYEE NAME", "DEPARTMENT", "DESIGNATION",
  ...dateColumns,
  "PRESENT DAYS", "OT HRS"
];

const rows = [
  ["CELEBRITY BREWING PRIVATE LIMITED — SINGLE MONTH MUSTER REGISTER (NOVEMBER 2026)"],
  ["Wage Period: 16 Oct 2026 to 15 Nov 2026 (31 Days) | Shift: 8.0 Hrs | Location: Brewery Unit Gate #1"],
  ["Attendance Legend: P = Present (1.0), WO = Weekly Off (1.0), HD = Half Day (0.5), A = Absent (0.0), H = Paid Holiday (1.0)"],
  headers
];

workers.forEach((w, idx) => {
  const rowNum = idx + 5;
  const attendanceVals = dateColumns.map(d => sundaySet.has(d) ? "WO" : "P");
  
  // Formula for Present Days
  const formulaP = `=COUNTIF(F${rowNum}:AJ${rowNum}, "P") + COUNTIF(F${rowNum}:AJ${rowNum}, "WO") + COUNTIF(F${rowNum}:AJ${rowNum}, "H") + COUNTIF(F${rowNum}:AJ${rowNum}, "HD")*0.5`;

  rows.push([
    idx + 1,
    w.code,
    w.name,
    w.department || "Brewing",
    w.designation || "Workman",
    ...attendanceVals,
    { f: formulaP, v: 31 },
    0
  ]);
});

// Also create plain TSV/CSV rows for 1-click Google Sheet copy-paste
const tsvRows = [
  headers.join("\t")
];
workers.forEach((w, idx) => {
  const attendanceVals = dateColumns.map(d => sundaySet.has(d) ? "WO" : "P");
  tsvRows.push([
    idx + 1,
    w.code,
    w.name,
    w.department || "Brewing",
    w.designation || "Workman",
    ...attendanceVals,
    31,
    0
  ].join("\t"));
});

const outDir = path.resolve(__dirname, '../public/sample-sheets');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// 1. Write Excel
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(rows);

// Set column widths
ws['!cols'] = [
  { wch: 8 },  // SL NO
  { wch: 14 }, // EMP CODE
  { wch: 24 }, // NAME
  { wch: 18 }, // DEPT
  { wch: 22 }, // DESIG
  ...dateColumns.map(() => ({ wch: 8 })),
  { wch: 14 }, // PRESENT DAYS
  { wch: 10 }  // OT HRS
];

XLSX.utils.book_append_sheet(wb, ws, "Nov'26");
const xlsxPath = path.join(outDir, 'Celebrity_Brewing_November_2026_Muster_Register.xlsx');
XLSX.writeFile(wb, xlsxPath);

// 2. Write CSV
const csvPath = path.join(outDir, 'Celebrity_Brewing_November_2026_Muster_Register.csv');
const csvContent = rows.slice(3).map(r => r.map(c => typeof c === 'object' && c !== null ? c.v : `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
fs.writeFileSync(csvPath, csvContent, 'utf8');

// 3. Write TSV for 1-click clipboard paste
const tsvPath = path.join(outDir, 'Celebrity_Brewing_November_2026_Clipboard.tsv');
fs.writeFileSync(tsvPath, tsvRows.join("\n"), 'utf8');

console.log("SUCCESS: Created Single-Month Muster Sheet files in public/sample-sheets!");

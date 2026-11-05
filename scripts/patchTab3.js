const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/app/(pages)/(hrm)/monthly-wages/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update savePunchesToStorage to sync to backend API
const oldSaveFunc = `  const savePunchesToStorage = (day: number, updated: Record<string, any>) => {
    try {
      const storageKey = \`hrm_gate_punches_\${companyName}_\${selectedYear}_\${selectedMonth}_day_\${day}\`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {}
  };`;

const newSaveFunc = `  const savePunchesToStorage = (day: number, updated: Record<string, any>) => {
    try {
      const storageKey = \`hrm_gate_punches_\${companyName}_\${selectedYear}_\${selectedMonth}_day_\${day}\`;
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
  };`;

if (content.includes(oldSaveFunc)) {
  content = content.replace(oldSaveFunc, newSaveFunc);
  console.log("Updated savePunchesToStorage with backend sync!");
} else {
  console.log("oldSaveFunc not matched, checking with normalized line endings");
  const normalized = content.replace(/\r\n/g, "\n");
  const normOld = oldSaveFunc.replace(/\r\n/g, "\n");
  if (normalized.includes(normOld)) {
    content = normalized.replace(normOld, newSaveFunc.replace(/\r\n/g, "\n"));
    console.log("Updated savePunchesToStorage with normalized endings!");
  }
}

// 2. Insert Public Gate Terminal Card in Tab 3
const tab3BannerStart = '{/* Live Gate Banner */}';
const publicGateCard = `{/* Dedicated Standalone Public Gate Terminal Card for Guards */}
            <div className="bg-slate-900 border-2 border-emerald-500/40 text-white rounded-xl p-4 mb-4 flex flex-wrap items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 font-bold text-2xl shadow-inner">
                  🛡️
                </div>
                <div>
                  <div className="font-extrabold text-base flex items-center gap-2 text-white">
                    FACTORY SECURITY GATE TERMINAL PORTAL (FOR GUARDS)
                    <span className="text-[11px] bg-emerald-500 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      STANDALONE • PIN PROTECTED
                    </span>
                  </div>
                  <div className="text-slate-300 text-xs mt-1 flex flex-wrap items-center gap-3">
                    <span>Public Portal Link: <strong className="text-emerald-400 font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">/gate-terminal</strong></span>
                    <span>•</span>
                    <span>Guard PIN: <strong className="text-amber-400 font-mono bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 rounded">1234</strong></span>
                    <span>•</span>
                    <span className="text-emerald-300 flex items-center gap-1 font-semibold">
                      Auto-Persists Punches to Database &amp; Monthly Wages
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3.5 py-2 rounded-lg text-xs shadow flex items-center gap-1.5 transition cursor-pointer"
                  onClick={() => {
                    const gateUrl = \`\${window.location.origin}/gate-terminal\`;
                    navigator.clipboard.writeText(gateUrl);
                    alert(\`📋 Copied Security Gate URL to clipboard!\\n\\nLink for Factory Security Guard:\\n\${gateUrl}\\n\\nSecurity Guard PIN: 1234\`);
                  }}
                  title="Copy direct portal link to share with guard via WhatsApp or SMS"
                >
                  <Copy size={14} /> 📋 Copy Guard Link
                </button>
                <a
                  href="/gate-terminal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3.5 py-2 rounded-lg text-xs border border-slate-600 shadow flex items-center gap-1.5 transition text-decoration-none cursor-pointer"
                  title="Open Standalone Public Gate Terminal in new tab"
                >
                  <ExternalLink size={14} /> ↗️ Open Guard Terminal
                </a>
              </div>
            </div>

            `;

if (content.includes(tab3BannerStart) && !content.includes('FACTORY SECURITY GATE TERMINAL PORTAL')) {
  content = content.replace(tab3BannerStart, publicGateCard + tab3BannerStart);
  console.log("Inserted Public Gate Terminal Card into Tab 3!");
}

// 3. Improve High Contrast CSS for Tab 3
const oldPunchTitle = `.punch-card-title {
          font-size: 17px;
          font-weight: 700;
          color: #0f172a;
        }
        .punch-card-subtitle {
          font-size: 13px;
          color: #64748b;
          margin-top: 2px;
        }`;

const newPunchTitle = `.punch-card-title {
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
        }`;

if (content.includes(oldPunchTitle)) {
  content = content.replace(oldPunchTitle, newPunchTitle);
  console.log("Enhanced punch-card-title and control-field label contrast!");
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Done updating Tab 3!");

"use client";

import React, { useState } from "react";
import axiosInstance from "@/utils/axiosInstance";

export default function TestConnectionPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await axiosInstance.get("/test-db");
      setResult(res.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to connect to backend/database"
      );
      if (err?.response?.data) {
        setResult(err.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px", fontFamily: "system-ui, sans-serif", maxWidth: "700px", margin: "0 auto" }}>
      <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "8px", color: "#1e293b" }}>
          🚀 Production Connection & Database Health Test
        </h1>
        <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>
          This is an isolated test page to verify live frontend, Render backend, and Neon PostgreSQL database connectivity.
        </p>

        <button
          onClick={runTest}
          disabled={loading}
          style={{
            backgroundColor: loading ? "#94a3b8" : "#2563eb",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "15px",
          }}
        >
          {loading ? "Testing Connection..." : "Test Database Connection"}
        </button>

        {error && (
          <div style={{ marginTop: "20px", padding: "14px", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: "8px", border: "1px solid #fecaca" }}>
            <strong>Connection Error:</strong> {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: "20px", padding: "16px", backgroundColor: "#f0fdf4", color: "#15803d", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "bold", margin: "0 0 10px 0" }}>
              ✅ {result.message || "Connection Successful"}
            </h3>
            <pre style={{ backgroundColor: "#ffffff", padding: "12px", borderRadius: "6px", overflowX: "auto", fontSize: "13px", color: "#334155", border: "1px solid #e2e8f0" }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

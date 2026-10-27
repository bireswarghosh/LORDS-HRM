import axios from "axios";

const rawBaseURL = process.env.NEXT_PUBLIC_API_URL || "https://hrmbackend-main.vercel.app/api/v1";
const cleanBaseURL = (rawBaseURL || "").replace(/^[\uFEFF\u200B\s]+/, "").trim();

const axiosInstance = axios.create({
  baseURL: cleanBaseURL || "https://hrmbackend-main.vercel.app/api/v1",
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔥 REQUEST INTERCEPTOR (AUTO TOKEN)
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`; // ✅ main change
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 🔥 RESPONSE INTERCEPTOR (AUTO LOGOUT)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Unauthorized - redirecting...");

      localStorage.removeItem("token");

      if (typeof window !== "undefined") {
        try {
          const current = window.location.pathname;
          if (current !== "/login-2") {
            window.location.href = "/login-2";
          }
        } catch (e) {
          // Fallback: attempt redirect if anything unexpected happens
          window.location.href = "/login-2";
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
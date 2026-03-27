import axios from "axios";
import { getStoredApiKey, getStoredLlmOverrides } from "./llmConfig";

// Create axios instance
const instance = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

// Request interceptor
instance.interceptors.request.use(
  (config) => {
    const geminiKey = getStoredApiKey();
    if (geminiKey) {
      config.headers["X-Gemini-API-Key"] = geminiKey;
    }

    const llmOverrides = getStoredLlmOverrides();
    if (Object.keys(llmOverrides).length > 0) {
      config.headers["X-Gemini-Feature-Config"] = JSON.stringify(llmOverrides);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
instance.interceptors.response.use(
  (response) => {
    // Special handling for FastAPI endpoints which return raw JSON
    if (response.config.url && (response.config.url.startsWith('/fastapi') || response.config.url.includes('/fastapi'))) {
      return response.data;
    }

    // Standard API response handling
    const res = response.data;
    if (res.code === 0) {
      return res;
    }

    console.error("API Error:", res.message || "Operation failed");
    return Promise.reject(res);
  },
  (error) => {
    console.error("Network/Server Error:", error);
    if (error.code === "ECONNABORTED" || String(error.message || "").includes("timeout")) {
      error.message = "请求超时：AI 分析耗时过长，请重试。";
    } else if (error.response?.data?.detail) {
      error.message = error.response.data.detail;
    }
    if (error.response && error.response.status === 401) {
        console.warn("Unauthorized access - please login (logic pending)");
    }
    return Promise.reject(error);
  }
);

export default instance;

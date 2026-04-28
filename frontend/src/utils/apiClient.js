/**
 * Centralized API Client with JWT token management
 * Handles auth headers, token refresh, and session expiry
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_BASE = API_BASE_URL.endsWith("/api")
  ? API_BASE_URL
  : `${API_BASE_URL}/api`;

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE;
  }

  getHeaders(isFormData = false) {
    const token = localStorage.getItem("authToken");
    const locationAccessToken = localStorage.getItem("locationAccessToken");
    const headers = {};
    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (locationAccessToken) {
      headers["x-location-access-token"] = locationAccessToken;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: { ...this.getHeaders(options.isFormData), ...options.headers },
    });

    // Skip token-refresh logic for auth endpoints (login, refresh-token)
    // — their 401 means "wrong credentials", not "expired session"
    const isAuthEndpoint = endpoint.startsWith("/auth/login") || endpoint.startsWith("/auth/refresh");

    // Handle 401 — try refresh token (only for non-auth endpoints)
    if (response.status === 401 && !isAuthEndpoint) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        // Retry the original request with new token
        const retryResponse = await fetch(url, {
          ...options,
          headers: {
            ...this.getHeaders(options.isFormData),
            ...options.headers,
          },
        });
        return this.handleResponse(retryResponse);
      }

      // Refresh failed — clear session
      this.clearSession();
      throw new Error("Session expired. Please login again.");
    }

    return this.handleResponse(response);
  }

  async handleResponse(response) {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.message || `Request failed: ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  async tryRefreshToken() {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("authToken", data.token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  clearSession() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userType");
    localStorage.removeItem("userData");
    localStorage.removeItem("userRole");
    localStorage.removeItem("selectedDriveId");
    localStorage.removeItem("locationAccessToken");
    localStorage.removeItem("locationAccessExpiry");

    // Redirect based on current path
    const isHRPage = window.location.pathname.startsWith("/hr") || 
                     window.location.pathname.startsWith("/admin");
    window.location.href = isHRPage ? "/hr-login" : "/user-login";
  }

  // HTTP methods
  get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`${endpoint}${query ? `?${query}` : ""}`);
  }

  post(endpoint, data, isFormData = false) {
    return this.request(endpoint, {
      method: "POST",
      body: isFormData ? data : JSON.stringify(data),
      isFormData,
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();

// ============ AUTH APIs ============
export const authAPI = {
  /** HR Login */
  loginHR: (email, password, mfaCode = "", backupCode = "") =>
    apiClient.post("/auth/login", { email, password, mfaCode, backupCode }),

  /** Get HR profile */
  getProfile: () => apiClient.get("/auth/profile"),

  /** Logout */
  logoutHR: () => apiClient.post("/auth/logout", {}),

  /** Refresh token */
  refreshToken: (refreshToken) =>
    apiClient.post("/auth/refresh-token", { refreshToken }),
};

// ============ ADMIN APIs (Roles & Users) ============
export const adminAPI = {
  // Roles
  getRoles: () => apiClient.get("/admin/roles"),
  getRoleById: (id) => apiClient.get(`/admin/roles/${id}`),
  createRole: (data) => apiClient.post("/admin/roles", data),
  updateRole: (id, data) => apiClient.put(`/admin/roles/${id}`, data),
  deleteRole: (id) => apiClient.delete(`/admin/roles/${id}`),
  getPermissionModules: () => apiClient.get("/admin/permissions/modules"),

  // Users
  getUsers: () => apiClient.get("/admin/users"),
  getUserById: (id) => apiClient.get(`/admin/users/${id}`),
  createUser: (data) => apiClient.post("/admin/users", data),
  updateUser: (id, data) => apiClient.put(`/admin/users/${id}`, data),
  toggleUserStatus: (id) => apiClient.patch(`/admin/users/${id}/toggle-status`),
  deleteUser: (id) => apiClient.delete(`/admin/users/${id}`),
  getInterviewerNames: () => apiClient.get("/admin/interviewers"),
  getAuditLogs: (params = {}) => apiClient.get("/admin/audit-logs", params),
};

// ============ CANDIDATE APIs (keep backward compatible) ============
export const candidateAPI = {
  getAll: (driveId) =>
    apiClient.get("/candidate-details", driveId ? { driveId } : {}),
  getById: (id) => apiClient.get(`/candidate-details/${id}`),
  update: (id, data) => apiClient.put(`/candidate-details/${id}`, data),
  getMe: () => apiClient.get("/candidate-details/me"),
};

// ============ DRIVE APIs ============
export const driveAPI = {
  getAll: () => apiClient.get("/drives"),
  getActive: () => apiClient.get("/drives/active"),
  getById: (id) => apiClient.get(`/drives/${id}`),
  create: (data) => apiClient.post("/drives", data),
  update: (id, data) => apiClient.put(`/drives/${id}`, data),
  toggleStatus: (id) => apiClient.patch(`/drives/${id}/toggle-status`),
  delete: (id) => apiClient.delete(`/drives/${id}`),
};

// ============ LOCATION APIs ============
export const locationAPI = {
  verifyDriveAccess: (lat, lon) =>
    apiClient.post("/location/verify-drive-access", { lat, lon }),
};

// ============ EXAM APIs ============
export const examAPI = {
  getAll: (params = {}) => apiClient.get("/exams", params),
  getActive: () => apiClient.get("/exams/active"),
  getActiveAttempt: (examId) => apiClient.get("/exams/attempts/active", examId ? { examId } : {}),
  autosaveAttempt: (attemptId, answers, violationIncrement = 0) =>
    apiClient.post(`/exams/attempts/${attemptId}/autosave`, { answers, violationIncrement }),
  getById: (id) => apiClient.get(`/exams/${id}`),
  create: (data) => apiClient.post("/exams", data),
  update: (id, data) => apiClient.put(`/exams/${id}`, data),
  delete: (id) => apiClient.delete(`/exams/${id}`),
  toggleActive: (id) => apiClient.patch(`/exams/${id}/toggle-active`),
};

export const quizResultAPI = {
  getAll: (params = {}) => apiClient.get("/quizresult", params),
  getById: (id) => apiClient.get(`/quizresult/${id}`),
  getByEmail: (email) => apiClient.get(`/quizresult/email/${encodeURIComponent(email)}`),
  updateByEmail: (email, data) =>
    apiClient.put(`/quizresult/email/${encodeURIComponent(email)}`, data),
  submitAttempt: (payload) => apiClient.post("/quizresult/submit", payload),
};

// ============ ADVANCED APIs ============
export const advancedAPI = {
  getCommandPalette: () => apiClient.get("/advanced/command-palette"),

  // Saved views
  getSavedViews: (module) => apiClient.get("/advanced/saved-views", module ? { module } : {}),
  createSavedView: (data) => apiClient.post("/advanced/saved-views", data),
  updateSavedView: (id, data) => apiClient.put(`/advanced/saved-views/${id}`, data),
  deleteSavedView: (id) => apiClient.delete(`/advanced/saved-views/${id}`),

  // Search and candidate intelligence
  searchCandidates: (params = {}) => apiClient.get("/advanced/candidate-search", params),
  getCandidateJourney: (candidateId) => apiClient.get(`/advanced/candidate-journey/${candidateId}`),
  getCandidate360: (candidateId) => apiClient.get(`/advanced/candidate-360/${candidateId}`),

  // Scorecards and decisions
  listScorecardTemplates: (params = {}) => apiClient.get("/advanced/scorecards/templates", params),
  createScorecardTemplate: (data) => apiClient.post("/advanced/scorecards/templates", data),
  evaluateScorecard: (data) => apiClient.post("/advanced/scorecards/evaluate", data),
  listDecisions: (params = {}) => apiClient.get("/advanced/decisions", params),
  upsertDecision: (data) => apiClient.post("/advanced/decisions", data),

  // Queue jobs
  enqueueNotification: (data) => apiClient.post("/advanced/jobs/notify", data),
  getJobs: (params = {}) => apiClient.get("/advanced/jobs", params),

  // AI helpers
  getFitScore: (data) => apiClient.post("/advanced/ai/fit-score", data),
  getInterviewSummary: (data) => apiClient.post("/advanced/ai/interview-summary", data),
};

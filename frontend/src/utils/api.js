/**
 * API Configuration and Utility Functions
 * Centralized API calls for the application
 */

/**
 * IMPORTANT:
 * Using Vite => process.env DOES NOT exist in the browser
 * Correct way is import.meta.env
 */
const API_BASE_URL =
  import.meta.env.VITE_API_URL || '/api';
const API_BASE = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;

/**
 * Get authorization headers
 * @returns {object} Headers object with authorization token
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  const locationAccessToken = localStorage.getItem('locationAccessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(locationAccessToken && { 'x-location-access-token': locationAccessToken }),
  };
};

/**
 * Handle API response
 * @param {Response} response - Fetch response object
 * @returns {Promise} Promise resolving to response data
 */
const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }

  return data;
};

// ==================== AUTH APIs ====================

export const authAPI = {
  /**
   * Register a new user with location
   */
  registerUser: async (userData) => {
    const response = await fetch(`${API_BASE}/candidate-details/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  /**
   * Login user
   */
  loginUser: async (email, password) => {
    const response = await fetch(`${API_BASE}/candidate-details/login`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  /**
   * Request candidate password reset link
   */
  forgotUserPassword: async (email) => {
    const response = await fetch(`${API_BASE}/candidate-details/forgot-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email }),
    });
    return handleResponse(response);
  },

  /**
   * Reset candidate password using token
   */
  resetUserPassword: async (token, newPassword, confirmPassword) => {
    const response = await fetch(`${API_BASE}/candidate-details/reset-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ token, newPassword, confirmPassword }),
    });
    return handleResponse(response);
  },

  /**
   * Register HR
   */
  registerHR: async (hrData) => {
    const response = await fetch(`${API_BASE}/candidate-details/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(hrData),
    });
    return handleResponse(response);
  },

  /**
   * Login HR
   */
  loginHR: async (email, password) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  /**
   * Verify email
   */
  verifyEmail: async (token) => {
    const response = await fetch(`${API_BASE}/candidate-details/${token}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Logout
   */
  logout: async () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userType');
  },
};

// ==================== USER APIs ====================

export const userAPI = {
  /**
   * Get user profile
   */
  getProfile: async () => {
    const response = await fetch(`${API_BASE}/candidate-details/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Update user profile
   */
  updateProfile: async (userData) => {
    const response = await fetch(`${API_BASE}/candidate-details/me`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  /**
   * Register user with location validation
   */
  registerWithLocation: async (userData) => {
    const response = await fetch(`${API_BASE}/candidate-details/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },
};

// ==================== EXAM APIs ====================

export const examAPI = {
  /**
   * Create a new exam
   */
  createExam: async (examData) => {
    const response = await fetch(`${API_BASE}/exams`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(examData),
    });
    return handleResponse(response);
  },

  /**
   * Get all exams
   */
  getAllExams: async () => {
    const response = await fetch(`${API_BASE}/exams`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get exam by ID
   */
  getExamById: async (id) => {
    const response = await fetch(`${API_BASE}/exams/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Update exam
   */
  updateExam: async (id, examData) => {
    const response = await fetch(`${API_BASE}/exams/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(examData),
    });
    return handleResponse(response);
  },

  /**
   * Delete exam
   */
  deleteExam: async (id) => {
    const response = await fetch(`${API_BASE}/exams/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Toggle active status
   */
  toggleActive: async (id) => {
    const response = await fetch(`${API_BASE}/exams/${id}/toggle-active`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get active exam (for user side)
   */
  getActiveExam: async () => {
    const response = await fetch(`${API_BASE}/exams/active`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getActiveAttempt: async (examId) => {
    const query = examId ? `?examId=${encodeURIComponent(examId)}` : '';
    const response = await fetch(`${API_BASE}/exams/attempts/active${query}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  autosaveAttempt: async (attemptId, answers, violationIncrement = 0) => {
    const response = await fetch(`${API_BASE}/exams/attempts/${encodeURIComponent(attemptId)}/autosave`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ answers, violationIncrement }),
    });
    return handleResponse(response);
  },

  /**
   * Start exam
   */
  startExam: async () => {
    const response = await fetch(`${API_BASE}/user-time-details/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Pause exam
   */
  pauseExam: async () => {
    const response = await fetch(`${API_BASE}/user-time-details/end`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Resume exam
   */
  resumeExam: async () => {
    const response = await fetch(`${API_BASE}/user-time-details/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * End exam
   */
  endExam: async () => {
    const response = await fetch(`${API_BASE}/user-time-details/end`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get exam status
   */
  getExamStatus: async (userId) => {
    const response = await fetch(`${API_BASE}/user-time-details/email/${userId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// ==================== EVENT APIs ====================

export const eventAPI = {
  /**
   * Get event location settings
   */
  getLocationSettings: async () => {
    const response = await fetch(`${API_BASE}/location/validate`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Verify location within radius
   */
  verifyLocation: async (latitude, longitude) => {
    const response = await fetch(`${API_BASE}/location/validate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ latitude, longitude }),
    });
    return handleResponse(response);
  },

  verifyDriveAccess: async (lat, lon) => {
    const response = await fetch(`${API_BASE}/location/verify-drive-access`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ lat, lon }),
    });
    return handleResponse(response);
  },
};

// ==================== HR Dashboard APIs ====================

export const hrAPI = {
  /**
   * Get all candidates
   */
  getCandidates: async (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    const response = await fetch(
      `${API_BASE}/candidate-details${queryString ? '?' + queryString : ''}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },

  /**
   * Get active candidates (in progress exams)
   */
  getActiveCandidates: async () => {
    const response = await fetch(`${API_BASE}/candidate-details`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get single candidate details
   */
  getCandidate: async (candidateId) => {
    const response = await fetch(`${API_BASE}/candidate-details/${candidateId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Update candidate notes
   */
  updateCandidateNotes: async (candidateId, notes) => {
    const response = await fetch(
      `${API_BASE}/candidate-details/${candidateId}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ notes }),
      }
    );
    return handleResponse(response);
  },

  /**
   * Update candidate status
   */
  updateCandidateStatus: async (candidateId, status) => {
    const response = await fetch(
      `${API_BASE}/candidate-details/${candidateId}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      }
    );
    return handleResponse(response);
  },

  /**
   * Get analytics/statistics
   */
  getAnalytics: async () => {
    const response = await fetch(`${API_BASE}/candidate-details`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// ==================== EMAIL APIs ====================

export const emailAPI = {
  /**
   * Send unique ID email
   */
  sendUniqueId: async (userId) => {
    const response = await fetch(`${API_BASE}/candidate-details`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });
    return handleResponse(response);
  },

  /**
   * Send verification email
   */
  sendVerification: async (userId) => {
    const response = await fetch(`${API_BASE}/candidate-details`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });
    return handleResponse(response);
  },

  /**
   * Send exam reminder
   */
  sendReminder: async (userId) => {
    const response = await fetch(`${API_BASE}/candidate-details`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });
    return handleResponse(response);
  },
};

// ==================== CANDIDATE DETAILS APIs ====================

export const candidateDetailsAPI = {
  /**
   * Register a new candidate with documents
   */
  register: async (formData) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE}/candidate-details/register`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData, // FormData for file upload
    });
    return handleResponse(response);
  },

  /**
   * Login candidate
   */
  login: async (email, password) => {
    const response = await fetch(`${API_BASE}/candidate-details/login`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  /**
   * Get all candidates
   */
  getAll: async () => {
    const response = await fetch(`${API_BASE}/candidate-details`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get candidate by ID
   */
  getById: async (id) => {
    const response = await fetch(`${API_BASE}/candidate-details/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Update candidate
   */
  update: async (id, updateData) => {
    const response = await fetch(`${API_BASE}/candidate-details/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    return handleResponse(response);
  },
};

// ==================== QUIZ RESULT APIs ====================

export const quizResultAPI = {
  saveQuizResult: async (quizResultData) => {
    const response = await fetch(`${API_BASE}/quizresult`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(quizResultData),
    });
    return handleResponse(response);
  },
  getAllQuizResults: async () => {
    const response = await fetch(`${API_BASE}/quizresult`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
  getQuizResultById: async (id) => {
    const response = await fetch(`${API_BASE}/quizresult/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
  getQuizResultByEmail: async (email) => {
    const response = await fetch(`${API_BASE}/quizresult/email/${email}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
  updateQuizResultByEmail: async (email, data) => {
    const response = await fetch(`${API_BASE}/quizresult/email/${encodeURIComponent(email)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  submitAttempt: async ({ attemptId, answers }) => {
    const response = await fetch(`${API_BASE}/quizresult/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ attemptId, answers }),
    });
    return handleResponse(response);
  },
};

// ==================== USER TIME DETAILS APIs ====================
export const userTimeDetailsAPI = {
  register: async (payload) => {
    const response = await fetch(`${API_BASE}/user-time-details/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },
  getByEmail: async (email) => {
    const response = await fetch(`${API_BASE}/user-time-details/email/${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
  start: async () => {
    const response = await fetch(`${API_BASE}/user-time-details/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
  end: async () => {
    const response = await fetch(`${API_BASE}/user-time-details/end`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
  complete: async () => {
    const response = await fetch(`${API_BASE}/user-time-details/complete`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// ==================== CANDIDATE DETAILS ME ====================
export const candidateMeAPI = {
  getMe: async () => {
    const response = await fetch(`${API_BASE}/candidate-details/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// ==================== ADVANCED FEATURE APIs ====================
export const advancedAPI = {
  getCommandPalette: async () => {
    const response = await fetch(`${API_BASE}/advanced/command-palette`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  searchCandidates: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE}/advanced/candidate-search${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getCandidateJourney: async (candidateId) => {
    const response = await fetch(`${API_BASE}/advanced/candidate-journey/${encodeURIComponent(candidateId)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getCandidate360: async (candidateId) => {
    const response = await fetch(`${API_BASE}/advanced/candidate-360/${encodeURIComponent(candidateId)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  listScorecardTemplates: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE}/advanced/scorecards/templates${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  createScorecardTemplate: async (data) => {
    const response = await fetch(`${API_BASE}/advanced/scorecards/templates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  evaluateScorecard: async (data) => {
    const response = await fetch(`${API_BASE}/advanced/scorecards/evaluate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getFunnelAnalytics: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE}/advanced/analytics/funnel${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getSlaAnalytics: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE}/advanced/analytics/sla${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getReasonAnalytics: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE}/advanced/analytics/reasons${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getCalibrationAnalytics: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE}/advanced/analytics/calibration${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

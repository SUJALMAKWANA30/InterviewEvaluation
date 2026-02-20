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
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

/**
 * Handle API response
 * @param {Response} response - Fetch response object
 * @returns {Promise} Promise resolving to response data
 */
const handleResponse = async (response) => {
  const data = await response.json();

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
    const response = await fetch(`${API_BASE_URL}/auth/register-user`, {
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
    const response = await fetch(`${API_BASE_URL}/auth/login-user`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  /**
   * Register HR
   */
  registerHR: async (hrData) => {
    const response = await fetch(`${API_BASE_URL}/auth/register-hr`, {
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
    // Development shortcut: accept known hard-coded dev credentials
    if (email === 'hr@example.com' && password === 'password123') {
      return {
        success: true,
        message: 'HR Login successful (dev fallback)',
        token: 'token-dev-hr',
        user: {
          id: 'dev-hr',
          email: 'hr@example.com',
          firstName: 'Dev',
          lastName: 'HR',
          userType: 'hr',
        },
      };
    }

    const response = await fetch(`${API_BASE_URL}/auth/login-hr`, {
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
    const response = await fetch(`${API_BASE_URL}/auth/verify-email/${token}`, {
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
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Update user profile
   */
  updateProfile: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
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
    const response = await fetch(`${API_BASE_URL}/users/register-location`, {
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
   * Start exam
   */
  startExam: async () => {
    const response = await fetch(`${API_BASE_URL}/exam/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Pause exam
   */
  pauseExam: async () => {
    const response = await fetch(`${API_BASE_URL}/exam/pause`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Resume exam
   */
  resumeExam: async () => {
    const response = await fetch(`${API_BASE_URL}/exam/resume`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * End exam
   */
  endExam: async () => {
    const response = await fetch(`${API_BASE_URL}/exam/end`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get exam status
   */
  getExamStatus: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/exam/status/${userId}`, {
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
    const response = await fetch(`${API_BASE_URL}/event/location-settings`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Verify location within radius
   */
  verifyLocation: async (latitude, longitude) => {
    const response = await fetch(`${API_BASE_URL}/users/verify-location`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ latitude, longitude }),
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
      `${API_BASE_URL}/hr/candidates${queryString ? '?' + queryString : ''}`,
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
    const response = await fetch(`${API_BASE_URL}/hr/candidates/active`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get single candidate details
   */
  getCandidate: async (candidateId) => {
    const response = await fetch(`${API_BASE_URL}/hr/candidate/${candidateId}`, {
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
      `${API_BASE_URL}/hr/candidate/${candidateId}/notes`,
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
      `${API_BASE_URL}/hr/candidate/${candidateId}/status`,
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
    const response = await fetch(`${API_BASE_URL}/hr/analytics`, {
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
    const response = await fetch(`${API_BASE_URL}/email/send-unique-id`, {
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
    const response = await fetch(`${API_BASE_URL}/email/send-verification`, {
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
    const response = await fetch(`${API_BASE_URL}/email/send-reminder`, {
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
    const response = await fetch(`${API_BASE_URL}/candidate-details/register`, {
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
    const response = await fetch(`${API_BASE_URL}/candidate-details/login`, {
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
    const response = await fetch(`${API_BASE_URL}/candidate-details`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get candidate by ID
   */
  getById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/candidate-details/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Update candidate
   */
  update: async (id, updateData) => {
    const response = await fetch(`${API_BASE_URL}/candidate-details/${id}`, {
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

import React, { useState, useEffect } from 'react';
import { AlertCircle, LogOut, CheckCircle, Clock } from 'lucide-react';
import ExamTimer from '../../components/Admin/ExamTimer';

// Backend API URL for fetching exam form
const BACKEND_API_URL = import.meta.env.VITE_API_URL || '/api';

// Fallback URL from env (used if backend is unavailable)
const FALLBACK_FORM_URL = import.meta.env.VITE_EXAM_FORM_URL || 'https://quiz.everestwebdeals.co/?form=023e8cc48ceb1b1168973f3addce09a8';

export default function UserExamPage() {
  const [user, setUser] = useState(null);
  const [examStatus, setExamStatus] = useState('not-started');
  const [examDuration, setExamDuration] = useState(30);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showExam, setShowExam] = useState(false);
  const [examStartTime, setExamStartTime] = useState(null);
  const [examFormUrl, setExamFormUrl] = useState(null);
  const [hasAlreadyStarted, setHasAlreadyStarted] = useState(false); // Track if exam was already taken
  const [showEmailAlert, setShowEmailAlert] = useState(false); // Email login alert modal

  useEffect(() => {
    fetchUserData();
    fetchExamSettings();
  }, []);

  const fetchUserData = async () => {
    try {
      // Get email from localStorage (set during login)
      const userDataStr = localStorage.getItem('userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const email = userData?.email;

      if (!email) {
        setLoading(false);
        return;
      }

      // Fetch only logged-in user's details from remote backend
      const remoteUrl = `https://tecnoprismmainbackend.onrender.com/details?email=${encodeURIComponent(email)}`;

      try {
        const response = await fetch(remoteUrl);

        if (response.ok) {
          const data = await response.json();

          // Get user data from response (API returns single user matching email)
          if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            const foundUser = data.data[0];

            setUser({
              firstName: foundUser['Full Name']?.split(' ')[0] || 'Candidate',
              lastName: foundUser['Full Name']?.split(' ').slice(1).join(' ') || '',
              uniqueId: foundUser['uniqueId'] || foundUser['unique id'] || foundUser['_id'] || '',
              email: foundUser['Email Address'] || foundUser['Email address'] || email,
              phone: foundUser['Phone number'] || 'N/A',
              location: foundUser['Preferred Location'] || foundUser['Location'] || '',
              skills: foundUser['Skills'] || '',
              experience: foundUser['Total Experience (Years)'] || '',
              currentCtc: foundUser['Current CTC'] || '',
              noticePeriod: foundUser['Notice Period'] || '',
              photo: foundUser['Photo'] || '',
              resume: foundUser['Resume'] || '',
            });
            // Check if exam was already started
            await checkExamStatus(email);
            setLoading(false);
            return;
          }
        }
      } catch (remoteErr) {
        // Remote API not available, will use fallback
      }

      // Fallback: Use email from localStorage to construct user data
      setUser({
        firstName: 'Candidate',
        lastName: '',
        uniqueId: `WALK-${Date.now()}`,
        email: email,
        phone: 'N/A',
      });
      // Check if exam was already started
      await checkExamStatus(email);

    } catch (err) {
      console.error('Error fetching user data:', err);
      // Still show user info with email
      const userDataStr = localStorage.getItem('userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      if (userData?.email) {
        setUser({
          firstName: 'Candidate',
          lastName: '',
          uniqueId: `WALK-${Date.now()}`,
          email: userData.email,
          phone: 'N/A',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchExamSettings = async () => {
    try {
      const response = await fetch(`${BACKEND_API_URL}/event/location-settings`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      const data = await response.json();
      setExamDuration(data.examDuration || 30);
    } catch (err) {
      console.error('Failed to fetch exam settings:', err);
    }
  };

  // Check if candidate has already started/completed exam
  const checkExamStatus = async (email) => {
    if (!email) return;
    
    try {
      // Check time-details API for existing start time
      const response = await fetch('https://tecnoprismmainbackend.onrender.com/time-details/all');
      if (response.ok) {
        const data = await response.json();
        const timeDetails = data.data || data || [];
        
        // Find if this user has already started exam
        const userTimeData = timeDetails.find(
          (item) => (item.Username || item.username || item.email || '').toLowerCase() === email.toLowerCase()
        );
        
        if (userTimeData && userTimeData.startTime) {
          setHasAlreadyStarted(true);
          
          // If they also have completion time, mark as completed
          if (userTimeData.CompletionTime || userTimeData.completionTime || userTimeData.endTime) {
            setExamStatus('completed');
          }
        }
      }
    } catch (err) {
      // Silently handle error - not critical for user experience
    }
  };

  const handleStartExam = async () => {
    // Show email alert modal first
    setShowEmailAlert(true);
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      setShowEmailAlert(false);
    }, 10000);
  };

  // Called when user acknowledges the alert
  const proceedToExam = async () => {
    setShowEmailAlert(false);
    
    try {
      // Get user email from localStorage
      const userDataStr = localStorage.getItem('userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const email = userData?.email;

      if (!email) {
        setError('User email not found. Please log in again.');
        return;
      }

      // Generate current timestamp with timezone offset
      const now = new Date();
      const timezoneOffset = -now.getTimezoneOffset();
      const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
      const offsetMinutes = Math.abs(timezoneOffset) % 60;
      const offsetSign = timezoneOffset >= 0 ? '+' : '-';
      const timezoneString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
      
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      const startTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezoneString}`;

      // Try to POST start time to API (non-blocking - exam will start even if this fails)
      try {
        const response = await fetch('https://tecnoprismmainbackend.onrender.com/time-details/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            startTime: startTime
          })
        });

        // Response handled silently
      } catch (apiErr) {
        // API not available, but continuing with exam
      }

      // Fetch exam form URL from backend proxy (with fallback)
      let formUrl = FALLBACK_FORM_URL; // Default fallback
      try {
        const formResponse = await fetch(`${BACKEND_API_URL}/api/exam/get-form-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            token: localStorage.getItem('authToken')
          })
        });

        if (formResponse.ok) {
          const formData = await formResponse.json();
          if (formData.success && formData.formUrl) {
            formUrl = formData.formUrl;
          }
        }
      } catch (formErr) {
        // Backend not available, using fallback URL
      }

      // Set the form URL (from backend or fallback)
      setExamFormUrl(formUrl);

      // Proceed to show the exam
      setShowExam(true);
      setExamStatus('in-progress');
      setExamStartTime(new Date());
      setError(''); // Clear any previous errors
      
    } catch (err) {
      setError('Failed to start exam. Please try again.');
    }
  };

  const handleTimeUp = async () => {
    try {
      const response = await fetch(`${BACKEND_API_URL}/exam/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        setExamStatus('completed');
        setShowExam(false);
      }
    } catch (err) {
      console.error('Error ending exam:', err);
    }
  };

  const handleSubmitExam = async () => {
    try {
      // Get user email from localStorage
      const userDataStr = localStorage.getItem('userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const username = userData?.email;

      if (!username) {
        setError('User email not found.');
        return;
      }

      // Generate end timestamp
      const now = new Date();
      const timezoneOffset = -now.getTimezoneOffset();
      const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
      const offsetMinutes = Math.abs(timezoneOffset) % 60;
      const offsetSign = timezoneOffset >= 0 ? '+' : '-';
      const timezoneString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      const endTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezoneString}`;

      // POST to time-details/end API (if exists)
      try {
        await fetch('https://tecnoprismmainbackend.onrender.com/time-details/end', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: username,
            endTime: endTime
          })
        });
      } catch (e) {
        // End time API not available, continuing silently
      }

      // Mark exam as completed
      setShowExam(false);
      setExamStatus('completed');
    } catch (err) {
      console.error('Error submitting exam:', err);
      setError('Failed to submit exam. Please try again.');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Calculate remaining time
  const [remainingTime, setRemainingTime] = useState(null);

  useEffect(() => {
    if (showExam && examStartTime) {
      const totalSeconds = examDuration * 60;
      
      const interval = setInterval(() => {
        const elapsed = Math.floor((new Date() - examStartTime) / 1000);
        const remaining = totalSeconds - elapsed;
        
        if (remaining <= 0) {
          clearInterval(interval);
          setRemainingTime(0);
          handleTimeUp();
        } else {
          setRemainingTime(remaining);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [showExam, examStartTime, examDuration]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userType');
    window.location.href = '/user-login';
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    header: {
      background: 'white',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      borderBottom: '1px solid #e5e7eb',
    },
    headerContent: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '24px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#1a202c',
      margin: '0 0 4px 0',
    },
    subtitle: {
      color: '#718096',
      fontSize: '14px',
      marginTop: '4px',
    },
    logoutBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: '#dc2626',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 'bold',
      transition: 'all 0.3s ease',
    },
    mainContent: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '32px 24px',
    },
    errorBox: {
      marginBottom: '24px',
      padding: '16px',
      background: '#fee',
      border: '1px solid #fcc',
      borderRadius: '8px',
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start',
    },
    errorText: {
      color: '#c53030',
      fontSize: '14px',
    },
    gridContainer: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: '32px',
    },
    card: {
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
      padding: '24px',
      marginBottom: '24px',
    },
    cardTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#1a202c',
      marginBottom: '16px',
    },
    userInfoGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
    },
    infoBlock: {
      padding: '12px',
      background: '#f7fafc',
      borderRadius: '8px',
    },
    infoLabel: {
      fontSize: '12px',
      color: '#718096',
      marginBottom: '4px',
    },
    infoValue: {
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#1a202c',
      marginTop: '4px',
    },
    centerContent: {
      textAlign: 'center',
      padding: '32px 24px',
    },
    iconBox: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '80px',
      height: '80px',
      background: '#e0e7ff',
      borderRadius: '50%',
      marginBottom: '24px',
    },
    startButton: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '16px 32px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      marginTop: '16px',
      transition: 'all 0.3s ease',
    },
    sidebarCard: {
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
      padding: '24px',
      marginBottom: '24px',
    },
    instructionsList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    instructionItem: {
      display: 'flex',
      gap: '12px',
      marginBottom: '12px',
      fontSize: '14px',
      color: '#4a5568',
    },
    instructionNumber: {
      fontWeight: 'bold',
      color: '#667eea',
      minWidth: '20px',
    },
    warningBox: {
      background: '#fffbeb',
      border: '1px solid #fde68a',
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '24px',
    },
    statusBox: {
      padding: '16px',
      borderRadius: '8px',
      textAlign: 'center',
      fontWeight: '600',
      fontSize: '14px',
    },
    examContainer: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#f3f4f6',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
    },
    examHeader: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '12px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    },
    examHeaderInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '24px',
    },
    examIframeWrapper: {
      flex: 1,
      overflow: 'hidden',
      position: 'relative',
    },
    examIframe: {
      width: '100%',
      height: '100%',
      border: 'none',
      background: 'white',
    },
    submitButton: {
      background: '#10b981',
      color: 'white',
      padding: '10px 24px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '14px',
      fontWeight: 'bold',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
  };

  if (loading) {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={styles.centerContent}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }}></div>
          <p style={{ color: 'white', fontSize: '16px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Show embedded exam form
  if (showExam) {
    return (
      <div style={styles.examContainer}>
        <style>{`
          @media (max-width: 600px) {
            .exam-header-mobile {
              padding: 10px 12px !important;
              flex-direction: column !important;
              gap: 8px !important;
            }
            .exam-header-mobile > div:first-child {
              width: 100% !important;
              text-align: center !important;
            }
            .exam-header-mobile button {
              width: 100% !important;
              justify-content: center !important;
            }
          }
        `}</style>
        {/* Exam Header - No Timer */}
        <div style={styles.examHeader} className="exam-header-mobile">
          <div style={styles.examHeaderInfo}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>TecnoPrism Exam</div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleSubmitExam}
            style={styles.submitButton}
            onMouseOver={(e) => e.target.style.background = '#059669'}
            onMouseOut={(e) => e.target.style.background = '#10b981'}
          >
            <CheckCircle size={18} />
            Submit Exam
          </button>
        </div>

        {/* Scrolling Marquee Warning */}
        <div style={{
          background: '#fef3c7',
          borderBottom: '1px solid #fde68a',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}>
          <div style={{
            display: 'inline-block',
            paddingLeft: '100%',
            animation: 'marquee 20s linear infinite',
          }}>
            <span style={{
              display: 'inline-block',
              padding: '8px 24px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#92400e',
            }}>
              ⚠️ Make Sure You Are Logged In As "{user?.email}" In Google Forms — If Not, Your Response Would Be Invalid! ⚠️
            </span>
          </div>
          <style>{`
            @keyframes marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(-100%); }
            }
          `}</style>
        </div>

        {/* Iframe Container */}
        <div style={styles.examIframeWrapper}>
          {examFormUrl ? (
            <iframe
              src={examFormUrl}
              style={styles.examIframe}
              title="Exam Form"
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280' }}>
              <p>Loading exam form...</p>
            </div>
          )}
        </div>

        {/* Anti-cheat overlay to prevent right-click and dev tools */}
        <style>{`
          /* Disable text selection in exam mode */
          body {
            user-select: none;
            -webkit-user-select: none;
            -ms-user-select: none;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Email Login Alert Modal */}
      {showEmailAlert && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '450px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'fadeIn 0.3s ease',
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              background: '#fef3c7',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '28px',
            }}>
              ⚠️
            </div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#1f2937',
              margin: '0 0 16px 0',
            }}>
              Important Notice
            </h3>
            <p style={{
              fontSize: '15px',
              color: '#4b5563',
              lineHeight: '1.6',
              margin: '0 0 24px 0',
            }}>
              Make Sure You Are Logged In As{' '}
              <strong style={{ color: '#7c3aed' }}>"{user?.email}"</strong>
              {' '}In Google Forms — If Not, Your Response Would Be Invalid.
            </p>
            <button
              onClick={proceedToExam}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '14px 48px',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.02)';
                e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = 'none';
              }}
            >
              OK, I Understand
            </button>
            <p style={{
              fontSize: '12px',
              color: '#9ca3af',
              marginTop: '16px',
            }}>
              This alert will close automatically in 10 seconds
            </p>
          </div>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Responsive layout tweaks - only affect small screens */
        @media (max-width: 900px) {
          .responsive-grid {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }

          .header-content {
            padding: 16px !important;
          }

          .main-content {
            padding: 20px 16px !important;
            box-sizing: border-box !important;
          }

          .card {
            padding: 16px !important;
            border-radius: 10px !important;
            box-shadow: 0 6px 18px rgba(0,0,0,0.06) !important;
          }

          .user-info-grid {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }

          .icon-box {
            width: 64px !important;
            height: 64px !important;
            margin-bottom: 18px !important;
          }

          .center-content {
            padding: 24px 16px !important;
          }

          .start-button {
            padding: 14px 22px !important;
            font-size: 15px !important;
          }

          .sidebar-card {
            padding: 16px !important;
          }

          .status-box {
            font-size: 13px !important;
            padding: 12px !important;
          }
        }

        @media (max-width: 480px) {
          .header-content h1 { font-size: 22px !important; }
          .title { font-size: 20px !important; }
          .icon-box { width: 56px !important; height: 56px !important; }
          .start-button { width: 100% !important; }
          .header-content {
            flex-direction: column !important;
            gap: 12px !important;
            text-align: center !important;
          }
          .logout-btn-mobile {
            width: 100% !important;
            justify-content: center !important;
          }
        }
      `}</style>
      
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent} className="header-content">
          <div>
            <h1 style={styles.title} className="title">Exam Portal</h1>
            <p style={styles.subtitle}>Walking Interview System</p>
          </div>
          <button
            onClick={handleLogout}
            style={styles.logoutBtn}
            className="logout-btn-mobile"
            onMouseOver={(e) => e.target.style.background = '#b91c1c'}
            onMouseOut={(e) => e.target.style.background = '#dc2626'}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      <div style={styles.mainContent} className="main-content">
        {/* Error Alert */}
        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={20} color="#c53030" style={{ marginTop: '2px', flexShrink: 0 }} />
            <p style={styles.errorText}>{error}</p>
          </div>
        )}

        <div style={styles.gridContainer} className="responsive-grid">
          {/* Main Content */}
          <div>
            {/* User Info Card */}
              {user ? (
              <div style={styles.card} className="card">
                <h2 style={styles.cardTitle}>
                  Welcome, {user.firstName} {user.lastName}
                </h2>
                <div style={styles.userInfoGrid} className="user-info-grid">
                  <div style={styles.infoBlock}>
                    <p style={styles.infoLabel}>Email</p>
                    <p style={styles.infoValue}>{user.email}</p>
                  </div>
                  <div style={styles.infoBlock}>
                    <p style={styles.infoLabel}>Phone</p>
                    <p style={styles.infoValue}>{user.phone}</p>
                  </div>
                  <div style={styles.infoBlock}>
                    <p style={styles.infoLabel}>Test Duration</p>
                    <p style={styles.infoValue}>{examDuration} minutes</p>
                  </div>
                </div>
              </div>
            ) : (
              <div style={styles.card} className="card">
                <h2 style={styles.cardTitle}>Loading your profile...</h2>
                <p style={{ color: '#718096' }}>Setting up your exam session. Please wait...</p>
              </div>
            )}

            {/* Timer Component */}
            {examStatus === 'in-progress' && (
              <ExamTimer duration={examDuration} onTimeUp={handleTimeUp} />
            )}

            {/* Exam Already Taken Message */}
            {hasAlreadyStarted && examStatus === 'not-started' && (
              <div style={{ ...styles.card, ...styles.centerContent }} className="card center-content">
                <div style={{ ...styles.iconBox, background: '#fef3c7' }} className="icon-box">
                  <AlertCircle size={40} color="#d97706" />
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a202c', marginBottom: '16px' }}>
                  Exam Already Taken
                </h2>
                <p style={{ color: '#718096', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>
                  You have already started/completed the exam. Each candidate can only take the exam once. Please contact the HR if you have any questions.
                </p>
                <button
                  onClick={handleLogout}
                  style={{ ...styles.startButton, background: '#dc2626' }}
                  className="start-button"
                  onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            )}

            {/* Start Exam Button - Only show if exam not already taken */}
            {examStatus === 'not-started' && !hasAlreadyStarted && (
              <div style={{ ...styles.card, ...styles.centerContent }} className="card center-content">
                <div style={styles.iconBox} className="icon-box">
                  <CheckCircle size={40} color="#667eea" />
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a202c', marginBottom: '16px' }}>
                  Ready to Begin?
                </h2>
                <p style={{ color: '#718096', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>
                  You are registered and ready to take the exam. Click the button below to start. You will have {examDuration} minutes to complete the test.
                </p>
                <button
                  onClick={handleStartExam}
                  style={styles.startButton}
                  className="start-button"
                  onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  Start Exam
                </button>
              </div>
            )}

            {/* Completion Message */}
            {examStatus === 'completed' && (
              <div style={{ ...styles.card, ...styles.centerContent }} className="card center-content">
                <div style={{ ...styles.iconBox, background: '#dcfce7' }} className="icon-box">
                  <CheckCircle size={40} color="#16a34a" />
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a202c', marginBottom: '8px' }}>
                  Exam Completed!
                </h2>
                <p style={{ color: '#718096', marginBottom: '32px' }}>
                  Your exam has been submitted successfully. Thank you for participating in our walking interview.
                </p>
                <button
                  onClick={handleLogout}
                  style={{ ...styles.startButton, background: '#667eea' }}
                  className="start-button"
                  onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            {/* Instructions Card */}
            <div style={styles.sidebarCard} className="sidebar-card">
              <h3 style={styles.cardTitle}>Instructions</h3>
              <ul style={styles.instructionsList}>
                <li style={styles.instructionItem}>
                  <span style={styles.instructionNumber}>1.</span>
                  <span>Read each question carefully</span>
                </li>
                <li style={styles.instructionItem}>
                  <span style={styles.instructionNumber}>2.</span>
                  <span>Answer all questions in the given time</span>
                </li>
                <li style={styles.instructionItem}>
                  <span style={styles.instructionNumber}>3.</span>
                  <span>You cannot pause the exam once started</span>
                </li>
                <li style={styles.instructionItem}>
                  <span style={styles.instructionNumber}>4.</span>
                  <span>Submit when timer reaches zero</span>
                </li>
              </ul>
            </div>

            {/* Important Notes */}
            <div style={styles.warningBox}>
              <h3 style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '8px' }}>⚠️ Important</h3>
              <p style={{ fontSize: '14px', color: '#b45309' }}>
                Make sure you stay within 10 meters of the venue throughout the exam.
              </p>
            </div>

            {/* Status Card */}
            <div style={styles.sidebarCard} className="sidebar-card">
              <h3 style={styles.cardTitle}>Status</h3>
              <div
                style={{
                  ...styles.statusBox,
                  background:
                    examStatus === 'not-started'
                      ? '#dbeafe'
                      : examStatus === 'in-progress'
                      ? '#dcfce7'
                      : '#f3e8ff',
                  color:
                    examStatus === 'not-started'
                      ? '#1e40af'
                      : examStatus === 'in-progress'
                      ? '#166534'
                      : '#6b21a8',
                }}
                className="status-box"
              >
                <p>
                  {examStatus === 'not-started'
                    ? 'Pending'
                    : examStatus === 'in-progress'
                    ? 'In Progress'
                    : 'Completed'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

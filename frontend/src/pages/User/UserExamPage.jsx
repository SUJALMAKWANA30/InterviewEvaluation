import React, { useState, useEffect } from 'react';
import tecnoprism from './tecnoprism.webp';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, LogOut, CheckCircle, Clock, Zap, Bell } from 'lucide-react';
import ExamTimer from '../../components/Admin/ExamTimer';
import { candidateMeAPI, userTimeDetailsAPI, quizResultAPI } from '../../utils/api';

// Backend API URL for fetching exam form
const BACKEND_API_URL = import.meta.env.VITE_API_URL || '/api';

// Fallback URL from env (used if backend is unavailable)
// const FALLBACK_FORM_URL = import.meta.env.VITE_EXAM_FORM_URL || 'https://quiz.everestwebdeals.co/?form=023e8cc48ceb1b1168973f3addce09a8';

export default function UserExamPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [examStatus, setExamStatus] = useState('not-started');
  const [examDuration, setExamDuration] = useState(30);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasAlreadyStarted, setHasAlreadyStarted] = useState(false);
  const [showEmailAlert, setShowEmailAlert] = useState(false);
  const [totalScore, setTotalScore] = useState(null);
  const [userPhoto, setUserPhoto] = useState(null);

  const getPhotoSrc = (val) => {
    if (!val) return null;
    if (/^https?:\/\//i.test(val)) {
      const m = val.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]+)/);
      if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w200`;
      return val;
    }
    return `https://drive.google.com/thumbnail?id=${val}&sz=w200`;
  };

  useEffect(() => {
    (async () => {
      try {
        const me = await candidateMeAPI.getMe();
        if (me?.success && me.data) {
          setUser({
            firstName: me.data.firstName || 'Candidate',
            lastName: me.data.lastName || '',
            uniqueId: me.data.uniqueId || '',
            email: me.data.email,
            phone: me.data.phone || 'N/A',
            documents: me.data.documents || {},
          });
          try {
            const time = await userTimeDetailsAPI.getByEmail(me.data.email).catch(() => null);
            const record = time?.data || null;
            const anyTime = !!(record?.startTime || record?.endTime || record?.completionTime);
            if (anyTime) {
              setHasAlreadyStarted(true);
              if (record?.completionTime || record?.endTime) {
                setExamStatus('completed');
              } else {
                setExamStatus('in-progress');
              }
            }
            if (record?.photo) {
              setUserPhoto(record.photo);
            }
            try {
              const qr = await quizResultAPI.getQuizResultByEmail(me.data.email);
              if (qr?.success && qr.data) {
                setTotalScore(qr.data.totalMarks ?? null);
              }
            } catch { /* ignore quiz fetch errors */ }
          } catch { /* ignore */ }
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    })();
    (async () => {
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
    })();
  }, []);

  // Removed: redirect to /quiz on dashboard refresh to prevent unexpected navigation
  // Refreshing the MCQ page preserves timer via persisted startTime; dashboard refresh stays on dashboard.

  // Check if candidate has already started/completed exam - omitted in this flow

  const handleStartExam = async () => {
    setShowEmailAlert(true);
    setTimeout(() => {
      setShowEmailAlert(false);
    }, 10000);
  };

  // Called when user acknowledges the alert
  const proceedToExam = async () => {
    setShowEmailAlert(false);

    try {
      await userTimeDetailsAPI.start();
      setHasAlreadyStarted(true);
      setExamStatus('in-progress');
      setError('');
      navigate('/quiz');

    } catch (err) {
      setError(err?.message || 'Failed to start exam. Please log in again and retry.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
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
              {' '}In Interview Evolution System — If Not, Your Response Would Be Invalid.
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

      <div className="min-h-screen bg-[#f8fafc] text-[#1e293b]">
        <nav className="bg-white/80 backdrop-blur border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4 py-4">
  {/* Logo Container with Silver Metallic Effect */}
  <div className="relative group">
    {/* Subtle Silver Glow */}
    <div className="absolute -inset-1 bg-gradient-to-r from-slate-200 to-gray-100 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
    
    <div className="relative bg-white border border-slate-200 shadow-sm p-2 rounded-xl backdrop-blur-sm">
      <img 
        src={tecnoprism} 
        className="w-28 h-auto object-contain" 
        alt="Tecnoprism Logo" 
      />
    </div>
  </div>

  {/* Text Content */}
  <div className="flex flex-col">
    <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-tight">
      Interview <span className="text-slate-500 font-medium">Evaluation System</span>
    </h1>
    
    {/* Subtle Silver Subtitle for Structure */}
    <div className="flex items-center gap-2 mt-0.5">
      <span className="h-[1px] w-4 bg-slate-300"></span>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
        Professional Series
      </p>
    </div>
  </div>
</div>
            <div className="flex items-center gap-6">
              <Bell size={18} className="text-gray-400" />
              <div className="flex items-center gap-3 border-l pl-6">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-600/90 flex items-center justify-center text-white text-sm font-bold">
                  {getPhotoSrc(userPhoto) ? (
                    <img src={getPhotoSrc(userPhoto)} alt="User Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    `${user?.firstName?.[0] ?? "J"}${user?.lastName?.[0] ?? "D"}`
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-red-500"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-10">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
              <AlertCircle size={18} className="text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <section className="bg-white rounded-2xl border border-gray-200 p-8">
                <div className="flex gap-6 items-center">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
                    {getPhotoSrc(userPhoto) ? (
                      <img src={getPhotoSrc(userPhoto)} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      (user ? `${user.firstName[0]}${user.lastName[0]}` : "..")
                    )}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">
                      {user
                        ? `${user.firstName} ${user.lastName}`
                        : "Loading..."}
                    </h1>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                    <div className="flex gap-2 mt-2">
                    </div>
                  </div>
                </div>
              </section>
              <section className="bg-white rounded-2xl border border-gray-200 p-8">
                <h2 className="text-lg font-bold mb-6">Application Progress</h2>
                {(() => {
                  const steps = [
                    { label: 'Round 1 – MCQ Quiz', key: 'mcq' },
                    { label: 'Round 2 – Communication', key: 'communication' },
                    { label: 'Round 3 – Logic', key: 'logical' },
                    { label: 'Round 4 – Python', key: 'python' },
                    { label: 'Round 5 – RPA', key: 'rpa' },
                    { label: 'Round 6 – Gen AI', key: 'gen ai' },
                  ];
                  return (
                    <div className="space-y-6 relative pl-4">
                      <div className="absolute left-4 top-0 bottom-0">
                        <div className="relative w-8 h-full">
                          <div className="absolute top-0 bottom-0 w-px bg-gray-200 left-1/2 -translate-x-1/2"></div>
                        </div>
                      </div>
                      {steps.map((s, i) => {
                        const completed = i === 0; // mark MCQ as completed for now
                        const colorClass = completed ? 'bg-green-500' : 'bg-yellow-400';
                        return (
                          <div key={s.key} className="flex gap-4 items-start relative">
                            <div className="relative w-8 flex flex-col items-center">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-white shadow ${colorClass}`}
                              >
                                {completed ? <CheckCircle size={14} className="text-white" /> : i + 1}
                              </div>
                            </div>
                            <div>
                              <p className={`font-medium ${i === 0 ? 'text-blue-700' : 'text-gray-800'}`}>
                                {s.label}
                                {i === 0 && (
                                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                    Current-Round
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </section>
            </div>
            <aside className="space-y-6">
              <section className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-xs uppercase text-gray-400 font-bold mb-4">
                  Quick Action
                </h3>
                {examStatus === "not-started" && !hasAlreadyStarted ? (
                  <button
                    onClick={handleStartExam}
                    style={{
                      width: "100%",
                      padding: "15px",
                      borderRadius: "0.75rem",
                      backgroundColor: "#2563eb",
                      color: "white",
                      fontWeight: "bold",
                      fontSize: "1.125rem",
                      border: "none",
                      cursor: "pointer",
                      boxShadow:
                        "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      transition: "background-color 0.2s",
                    }}
                    onMouseOver={(e) =>
                      (e.target.style.backgroundColor = "#1d4ed8")
                    }
                    onMouseOut={(e) =>
                      (e.target.style.backgroundColor = "#4c7ce1")
                    }
                  >
                    Start Exam
                  </button>
                ) : (
                  <div className="text-center py-4 text-gray-400 border border-dashed rounded-xl">
                    Exam Locked
                  </div>
                )}
              </section>
              <section className="bg-white rounded-2xl border border-gray-200 p-6">
                <p className="text-xs text-gray-400 uppercase">Test Duration</p>
                <p className="text-lg font-bold">{examDuration} Minutes</p>
              </section>
              {/* this is  current round section */}
              <section className={`relative overflow-hidden rounded-2xl border-b-4 p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
  ${examStatus === "in-progress"
                  ? "bg-gradient-to-br from-emerald-50 to-teal-100 border-emerald-500"
                  : examStatus === "completed"
                    ? "bg-gradient-to-br from-blue-50 to-indigo-100 border-indigo-500"
                    : "bg-gradient-to-br from-orange-50 to-amber-100 border-amber-500"
                }`}>

                {/* Decorative Background Element */}
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/20 blur-2xl" />

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <p className={`text-[11px] font-black uppercase tracking-[0.15em] 
      ${examStatus === "in-progress" ? "text-emerald-700" : examStatus === "completed" ? "text-indigo-700" : "text-amber-700"}`}>
                    Current Round
                  </p>

                  {/* Status Badge */}
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm backdrop-blur-md border
      ${examStatus === "in-progress"
                      ? "bg-emerald-500 text-white border-emerald-400"
                      : examStatus === "completed"
                        ? "bg-indigo-600 text-white border-indigo-500"
                        : "bg-amber-500 text-white border-amber-400"
                    }`}
                  >
                    <span className="relative flex h-2 w-2">
                      {examStatus === "in-progress" && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      )}
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    {examStatus === "in-progress" ? "ACTIVE NOW" : examStatus === "completed" ? "FINISHED" : "PENDING"}
                  </span>
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <h3 className="text-lg font-extrabold text-gray-800 leading-tight">
                    Round 1 – <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-500">MCQ Quiz</span>
                  </h3>

                  <p className="text-[13px] text-gray-600 mt-2 font-medium leading-relaxed">
                    Multiple-choice assessment designed to evaluate core technical and logical understanding.
                  </p>
                </div>

                {/* Footer Accent */}
                <div className="mt-6 pt-4 border-t border-black/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${examStatus === "in-progress" ? "bg-emerald-200" : "bg-orange-200"}`}>
                      <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-gray-700">30 mins</span>
                  </div>

                  <button className={`text-xs font-bold flex items-center gap-1 transition-transform hover:translate-x-1
      ${examStatus === "in-progress" ? "text-emerald-700" : examStatus === "completed" ? "text-indigo-700" : "text-amber-700"}`}>
    
                  </button>
                </div>
              </section>
              <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex gap-3">
                <AlertCircle size={18} />
                Do not refresh or leave the page during the exam.
              </section>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

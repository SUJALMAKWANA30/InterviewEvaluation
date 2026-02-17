import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LogOut, CheckCircle, Clock, AlertCircle, BarChart3, Users, Settings, Download, ChevronDown, ChevronUp, FileText, CreditCard, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CandidateTable } from '../../components/Admin/CandidateTable';

// Auto-refresh interval in milliseconds (30 seconds)
const AUTO_REFRESH_INTERVAL = 30000;

// Temporary interviewer names list
const INTERVIEWER_NAMES = [
  'Rahul Sharma',
  'Priya Patel',
  'Amit Kumar',
  'Sneha Gupta',
  'Vikram Singh',
  'Anjali Verma',
  'Rajesh Nair',
];

const HRDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [roundModalOpen, setRoundModalOpen] = useState(false);
  const [roundModalCandidate, setRoundModalCandidate] = useState(null);
  const [roundDataMap, setRoundDataMap] = useState(new Map());
  const [roundNotes, setRoundNotes] = useState({});
  const [savedRounds, setSavedRounds] = useState({});
  const [interviewers, setInterviewers] = useState({});
  const [droppedRounds, setDroppedRounds] = useState({});

  // 🔥 REAL DATA STATE
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 🔥 REAL-TIME STATE
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [newDataCount, setNewDataCount] = useState(0);
  const previousCountRef = useRef(0);

  // 🔥 FETCH DATA FROM FINAL API (use provided details endpoint, request many)
  const fetchCandidates = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      }
      
      // Base URL without /api suffix - external API doesn't use /api prefix
      const configured =
        import.meta.env.NEXT_PUBLIC_API_BASE_URL ||
        import.meta.env.VITE_API_URL ||
        'https://tecnoprismmainbackend.onrender.com';

        const base = configured.replace(/\/+$/g, '').replace(/\/api$/, '');
        
        // Also fetch from local candidate-details API
        const localApiBase = configured.endsWith('/api') ? configured : `${configured}/api`;
        
        // Fetch local registered candidates
        let localCandidates = [];
        try {
          const localRes = await fetch(`${localApiBase}/candidate-details`);
          if (localRes.ok) {
            const localJson = await localRes.json();
            localCandidates = localJson.data || [];
          }
        } catch (localErr) {
          console.warn('Failed to fetch local candidates:', localErr);
        }
        
        const candidatesUrls = [
          // Primary endpoints (external API structure)
          `${base}/details`,
          `${base}/time-details/all`,
        ];

        let res = null;
        let lastError = null;
        for (const url of candidatesUrls) {
          try {
            const r = await fetch(url);
            if (r.ok) {
              res = r;
              break;
            }
            lastError = new Error(`Status ${r.status} from ${url}`);
          } catch (err) {
            lastError = err;
          }
        }

        // If external API fails, use local candidates only
        let list = [];
        if (res) {
          const json = await res.json();
          list = json.data || json;
        }
        
        // Merge local candidates into the list
        localCandidates.forEach((localCandidate) => {
          const exists = list.some(
            (item) => (item.email || item['Email Address'] || '').toLowerCase() === localCandidate.email?.toLowerCase()
          );
          if (!exists) {
            // Transform local candidate to match expected format
            list.push({
              _id: localCandidate._id,
              uniqueId: localCandidate.uniqueId,
              'Full Name': `${localCandidate.firstName} ${localCandidate.lastName}`,
              'Email Address': localCandidate.email,
              'Phone number': localCandidate.phone,
              'Preferred Location': localCandidate.preferredLocation,
              'Are you wiling to relocate?': localCandidate.willingToRelocate,
              'Notice Period': localCandidate.noticePeriod,
              'Skills': Array.isArray(localCandidate.skills) ? localCandidate.skills.join(', ') : localCandidate.skills,
              'Current Designation': localCandidate.currentDesignation,
              'Current CTC': localCandidate.currentCTC,
              'Total Experience (Years)': localCandidate.totalExperience,
              'Experience [GenAI]': localCandidate.experienceLevels?.genai || '',
              'Experience [Python]': localCandidate.experienceLevels?.python || '',
              'Experience [RPA]': localCandidate.experienceLevels?.rpa || '',
              'Resume': localCandidate.documents?.resume || '',
              'Photo': localCandidate.documents?.photo || '',
              'Aadhar Card': localCandidate.documents?.idProof || '',
              'Payslip': localCandidate.documents?.payslips || '',
              'Last Breakup': localCandidate.documents?.lastBreakup || '',
              examStatus: localCandidate.examStatus || 'not_started',
              score: localCandidate.examScore,
              createdAt: localCandidate.createdAt,
              isLocalRegistration: true,
            });
          }
        });

        // Fetch round 1 quiz segregation data
        const quizUrls = [
          `${base}/quiz-segregate`,
        ];

        let quizRes = null;
        let quizLastErr = null;
        for (const url of quizUrls) {
          try {
            const r = await fetch(url);
            if (r.ok) {
              quizRes = r;
              break;
            }
            quizLastErr = new Error(`Status ${r.status} from ${url}`);
          } catch (err) {
            quizLastErr = err;
          }
        }

        let quizList = [];
        if (quizRes) {
          try {
            const quizJson = await quizRes.json();
            quizList = quizJson.data || quizJson || [];
          } catch (e) {
            quizList = [];
          }
        }

        const quizMap = new Map();
        const quizMapByContact = new Map();
        const quizMapByName = new Map();
        quizList.forEach((q) => {
          const emailKey = (q.Email || q.email || q.Username || q.username || '').toString().toLowerCase();
          const contactKey = (q.Contact || q.contact || q.Phone || q.phone || '').toString().replace(/\D/g, '');
          const nameKey = (q.Name || q.name || '').toString().toLowerCase().trim();
          if (emailKey) {
            quizMap.set(emailKey, q);
          }
          if (contactKey) {
            quizMapByContact.set(contactKey, q);
          }
          if (nameKey) {
            quizMapByName.set(nameKey, q);
          }
        });

        // Try to fetch credentials and merge by email
        const credUrls = [
          `${base}/user-details/credentials`,
        ];

        let credRes = null;
        let credLastErr = null;
        for (const url of credUrls) {
          try {
            const r = await fetch(url);
            if (r.ok) {
              credRes = r;
              break;
            }
            credLastErr = new Error(`Status ${r.status} from ${url}`);
          } catch (err) {
            credLastErr = err;
          }
        }

        let credsList = [];
        if (credRes) {
          try {
            const credJson = await credRes.json();
            credsList = credJson.data || credJson || [];
          } catch (e) {
            // ignore parse error and continue without creds
            credsList = [];
          }
        }

        const credMap = new Map();
        credsList.forEach((c) => {
          const key = (c.Username || c.username || c.Email || c.email || c.username)?.toString().toLowerCase();
          if (key) credMap.set(key, c);
        });

        // Fetch time-details data (startTime, CompletionTime, TimeTaken)
        let timeDetailsList = [];
        try {
          const timeRes = await fetch('https://tecnoprismmainbackend.onrender.com/time-details/all');
          if (timeRes.ok) {
            const timeJson = await timeRes.json();
            timeDetailsList = timeJson.data || timeJson || [];
          }
        } catch (e) {
          console.warn('Failed to fetch time-details:', e);
        }

        const timeMap = new Map();
        timeDetailsList.forEach((t) => {
          const key = (t.Username || t.username || t.uniqueId || t.email || '').toString().toLowerCase();
          if (key) timeMap.set(key, t);
        });

        // Create formatted list and deduplicate by email
        const seenEmails = new Set();
        const formatted = [];
        
        list.forEach((item) => {
          const itemEmail = (item.email || item['Email Address'] || item['Email address'] || item.Email || item.Username || '').toString().toLowerCase();
          
          // Skip duplicates based on email
          if (seenEmails.has(itemEmail)) {
            return;
          }
          seenEmails.add(itemEmail);
          
          const cred = credMap.get(itemEmail) || {};
          
          // Try to find quiz data by email first, then by phone/contact, then by name
          const itemPhone = (item['Phone number'] || item.phone || '').toString().replace(/\D/g, '');
          const itemName = (item['Full Name'] || item.name || '').toString().toLowerCase().trim();
          let quiz = quizMap.get(itemEmail) || {};
          if (!quiz._id && itemPhone) {
            quiz = quizMapByContact.get(itemPhone) || quiz;
          }
          if (!quiz._id && itemName) {
            quiz = quizMapByName.get(itemName) || quiz;
          }
          const timeData = timeMap.get(itemEmail) || {};
          
          const password = (cred.Password || cred.password || cred.pwd || cred.pass || cred?.userPassword || '').toString();
          const username = (cred.Username || cred.username || cred.userName || cred.name || '').toString();

          // Use email as unique identifier since we've deduplicated
          const uid = item.uniqueId || item._id || itemEmail || Math.random().toString(36).slice(2, 9);

          formatted.push({
            uid, // internal stable id used for keys and selection
            password: password || '',
            username: username || itemEmail || '—',
            name: (item['Full Name'] || `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || item.name || '—').toString(),
            email: (item.email || item['Email Address'] || item['Email address'] || item.Email || '').toString() || '—',
            examStatus: item.examStatus || item.status || 'not-started',
            score: item.score ?? null,
            time: item.timeTaken ?? item.time ?? '—',
            location: item.location?.city || item.location || item['Location'] || '—',
            preferredLocation: item['Preferred Location'] || item.preferredLocation || '—',
            phone: item['Phone number'] || item.phone || '—',
            photo: item['Photo'] || item.photo || '',
            resume: item['Resume'] || item.resume || '',
            aadharCard: item['Aadhar Card'] || item.aadharCard || '',
            payslip: item['Payslip'] || item.payslip || '',
            lastBreakup: item['Last Breakup'] || item.lastBreakup || '',
            skills: item['Skills'] || item.skills || '—',
            currentCTC: item['Current CTC'] || item.currentCTC || '—',
            totalExperience: item['Total Experience (Years)'] || item.totalExperience || '—',
            relevantExperience: item['Relevant Experience (Years)'] || item.relevantExperience || '—',
            experienceGenAI: item['Experience [GenAI]'] || item.experienceGenAI || '—',
            experiencePython: item['Experience [Python]'] || item.experiencePython || '—',
            experienceRPA: item['Experience [RPA]'] || item.experienceRPA || '—',
            noticePeriod: item['Notice Period'] || item.noticePeriod || '—',
            willingToRelocate: item['Are you wiling to relocate?'] || item.willingToRelocate || '—',
            designation: item['Current Designation'] || item['Designation'] || item.designation || '—',
            completionTime: timeData.CompletionTime || item['Completion Time'] || item.completionTime || '—',
            startTime: timeData.startTime || item['Start Time'] || item.startTime || '—',
            timeTakenInTest: timeData.TimeTaken || item['Time taken in Test'] || item.timeTakenInTest || '—',
            quiz,
            raw: item,
            credentials: cred,
            timeDetails: timeData,
          });
        });

        // Track new candidates
        const newCount = formatted.length - previousCountRef.current;
        if (previousCountRef.current > 0 && newCount > 0) {
          setNewDataCount(newCount);
          // Clear the new data notification after 5 seconds
          setTimeout(() => setNewDataCount(0), 5000);
        }
        previousCountRef.current = formatted.length;

        setCandidates(formatted);
        setRoundDataMap(quizMap);
        setLastUpdated(new Date());
      } catch (err) {
        console.error(err);
        if (!candidates.length) {
          setError(err.message);
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    
    const intervalId = setInterval(() => {
      fetchCandidates(false);
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [autoRefreshEnabled, fetchCandidates]);

  // Auto-refresh modal data when modal is open (for real-time collaboration)
  useEffect(() => {
    if (!roundModalOpen || !roundModalCandidate || !autoRefreshEnabled) return;
    
    const refreshModalData = async () => {
      const freshQuizData = await fetchQuizDataByEmail(roundModalCandidate.email, roundModalCandidate.name, roundModalCandidate.phone);
      if (freshQuizData) {
        setRoundModalCandidate((prev) => prev ? { ...prev, quiz: freshQuizData } : prev);
        setCandidates((prev) => 
          prev.map((c) => c.uid === roundModalCandidate.uid ? { ...c, quiz: freshQuizData } : c)
        );
        setRoundNotes((prev) => ({
          ...prev,
          [roundModalCandidate.uid]: {
            round2: getRoundNoteFromQuiz(freshQuizData, 'R2'),
            round3: getRoundNoteFromQuiz(freshQuizData, 'R3'),
            round4: getRoundNoteFromQuiz(freshQuizData, 'R4'),
          },
        }));
      }
    };

    const modalIntervalId = setInterval(refreshModalData, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(modalIntervalId);
  }, [roundModalOpen, roundModalCandidate?.uid, autoRefreshEnabled]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    fetchCandidates(true);
  };

  const filteredCandidates = candidates.filter((candidate) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      candidate.name.toLowerCase().includes(q) ||
      candidate.email.toLowerCase().includes(q) ||
      (candidate.uid && String(candidate.uid).toLowerCase().includes(q)) ||
      (candidate.username && candidate.username.toLowerCase().includes(q)) ||
      (candidate.displayedId && String(candidate.displayedId).toLowerCase().includes(q)) ||
      (candidate.password && String(candidate.password).toLowerCase().includes(q));

    const matchesFilter =
      filterStatus === 'all' || candidate.examStatus === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const getStatusStyle = (status) => {
    const base = {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
    };

    switch (status) {
      case 'present':
        return { ...base, background: '#d1fae5', color: '#065f46' };
      case 'completed':
        return { ...base, background: '#d1fae5', color: '#065f46' };
      case 'in-progress':
        return { ...base, background: '#dbeafe', color: '#1e40af' };
      case 'absent':
        return { ...base, background: '#fee2e2', color: '#991b1b' };
      default:
        return { ...base, background: '#f3f4f6', color: '#4b5563' };
    }
  };

  const getAttendanceStatus = (candidate) => {
    const qrValue = candidate?.credentials?.qr;
    if (qrValue === true) return 'present';
    if (qrValue === false) return 'absent';
    return candidate.examStatus || 'not-started';
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]).join('').toUpperCase();
  };

  const getRoundNoteFromQuiz = (quiz, apiKey) => {
    if (!quiz || !apiKey) return { rating: '', comments: '' };
    
    // Try multiple key variations
    const raw = quiz[apiKey] || quiz[apiKey.toLowerCase()] || quiz[apiKey.toUpperCase()];
    
    if (Array.isArray(raw) && raw.length > 0 && raw[0]) {
      const result = {
        rating: raw[0].rating ?? '',
        comments: raw[0].comments ?? raw[0].comment ?? '',
      };
      return result;
    }
    
    // Handle case where raw is an object directly (not an array)
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return {
        rating: raw.rating ?? '',
        comments: raw.comments ?? raw.comment ?? '',
      };
    }
    
    return { rating: '', comments: '' };
  };

  // Fetch quiz data by name, contact and email from API
  const fetchQuizDataByEmail = async (email, name = '', contact = '') => {
    if (!email || email === '—' || email === '-') {
      return null;
    }
    
    const emailToFetch = email.trim().toLowerCase();
    const nameToFetch = (name && name !== '—' && name !== '-') ? name.trim() : '';
    const contactToFetch = (contact && contact !== '—' && contact !== '-') ? contact.toString().replace(/\D/g, '') : '';
    
    try {
      // Build query params - only include non-empty values
      const params = new URLSearchParams();
      if (nameToFetch) params.append('name', nameToFetch);
      if (contactToFetch) params.append('contact', contactToFetch);
      params.append('email', emailToFetch);
      
      const url = `https://tecnoprismmainbackend.onrender.com/quiz-segregate?${params.toString()}`;
      
      const response = await fetch(url);
      
      if (response.ok) {
        const json = await response.json();
        
        if (json.data && json.data.length > 0) {
          return json.data[0];
        }
      }
      return null;
    } catch (e) {
      console.error('Failed to fetch quiz data by email:', e);
      return null;
    }
  };

  // Loading state for modal
  const [modalLoading, setModalLoading] = useState(false);

  const openRoundModal = async (candidate) => {
    setRoundModalCandidate(candidate);
    setRoundModalOpen(true);
    setModalLoading(true);
    
    // Clear any existing cached round notes for this candidate to force fresh data
    setRoundNotes((prev) => {
      const newNotes = { ...prev };
      delete newNotes[candidate.uid];
      return newNotes;
    });

    try {
      // Try multiple email sources - candidate.email, quiz.Email, raw.email, etc.
      let emailToUse = '';
      
      // Check various email sources
      if (candidate.email && candidate.email !== '—' && candidate.email !== '-') {
        emailToUse = candidate.email;
      } else if (candidate.quiz?.Email) {
        emailToUse = candidate.quiz.Email;
      } else if (candidate.quiz?.email) {
        emailToUse = candidate.quiz.email;
      } else if (candidate.raw?.email) {
        emailToUse = candidate.raw.email;
      } else if (candidate.raw?.Email) {
        emailToUse = candidate.raw.Email;
      } else if (candidate.raw?.['Email address']) {
        emailToUse = candidate.raw['Email address'];
      } else if (candidate.username && candidate.username.includes('@')) {
        emailToUse = candidate.username;
      }
      
      if (!emailToUse) {
        setModalLoading(false);
        return;
      }
      
      // Fetch fresh quiz data from API
      const freshQuizData = await fetchQuizDataByEmail(emailToUse, candidate.name, candidate.phone);
      
      if (freshQuizData) {
        // Update the candidate's quiz data with fresh data
        const updatedCandidate = { ...candidate, quiz: freshQuizData };
        setRoundModalCandidate(updatedCandidate);
        
        // Also update in the main candidates list
        setCandidates((prev) => 
          prev.map((c) => c.uid === candidate.uid ? { ...c, quiz: freshQuizData } : c)
        );
        
        // Set round notes from fresh data - always overwrite
        const newRoundNotes = {
          round2: getRoundNoteFromQuiz(freshQuizData, 'R2'),
          round3: getRoundNoteFromQuiz(freshQuizData, 'R3'),
          round4: getRoundNoteFromQuiz(freshQuizData, 'R4'),
        };
        
        setRoundNotes((prev) => ({
          ...prev,
          [candidate.uid]: newRoundNotes,
        }));
      } else {
        // Fallback to existing data
        const quiz = candidate.quiz || {};
        setRoundNotes((prev) => ({
          ...prev,
          [candidate.uid]: {
            round2: getRoundNoteFromQuiz(quiz, 'R2'),
            round3: getRoundNoteFromQuiz(quiz, 'R3'),
            round4: getRoundNoteFromQuiz(quiz, 'R4'),
          },
        }));
      }
    } catch (e) {
      console.error('Error fetching quiz data:', e);
      // Fallback to existing data
      const quiz = candidate.quiz || {};
      setRoundNotes((prev) => ({
        ...prev,
        [candidate.uid]: {
          round2: getRoundNoteFromQuiz(quiz, 'R2'),
          round3: getRoundNoteFromQuiz(quiz, 'R3'),
          round4: getRoundNoteFromQuiz(quiz, 'R4'),
        },
      }));
    } finally {
      setModalLoading(false);
    }
  };

  const closeRoundModal = () => {
    setRoundModalOpen(false);
    setRoundModalCandidate(null);
  };

  const updateRoundNotes = (uid, roundKey, field, value) => {
    setRoundNotes((prev) => ({
      ...prev,
      [uid]: {
        ...(prev[uid] || {}),
        [roundKey]: {
          ...((prev[uid] || {})[roundKey] || {}),
          [field]: value,
        },
      },
    }));
  };

  const saveRoundNotes = async (roundKey) => {
    try {
      const candidate = roundModalCandidate;
      if (!candidate?.email) {
        setError('Candidate email is missing.');
        return;
      }

      const uid = candidate.uid;
      const notes = roundNotes[uid] || {};
      const quiz = candidate.quiz || {};

      const r2 = notes.round2 || getRoundNoteFromQuiz(quiz, 'R2');
      const r3 = notes.round3 || getRoundNoteFromQuiz(quiz, 'R3');
      const r4 = notes.round4 || getRoundNoteFromQuiz(quiz, 'R4');

      const payload = {
        email: candidate.email,
        R2: r2.rating || r2.comments ? [{ rating: String(r2.rating || ''), comments: String(r2.comments || '') }] : [],
        R3: r3.rating || r3.comments ? [{ rating: String(r3.rating || ''), comments: String(r3.comments || '') }] : [],
        R4: r4.rating || r4.comments ? [{ rating: String(r4.rating || ''), comments: String(r4.comments || '') }] : [],
        Logical: String(quiz.Logical ?? quiz.logical ?? ''),
        GenAI: String(quiz.GenAI ?? quiz.genai ?? ''),
        Python: String(quiz.Python ?? quiz.python ?? ''),
        RPA: String(quiz.RPA ?? quiz.rpa ?? ''),
        Database: String(quiz.Database ?? quiz.database ?? ''),
        Communication: String(quiz.Communication ?? quiz.communication ?? ''),
        'Final Score': String(quiz['Final Score'] ?? quiz.finalScore ?? ''),
      };

      const response = await fetch('https://tecnoprismmainbackend.onrender.com/quiz-segregate/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to save round data');
      }

      setError('');

      // Mark this round as saved
      setSavedRounds((prev) => ({
        ...prev,
        [`${uid}-${roundKey}`]: true,
      }));

      // Reset saved status after 3 seconds
      setTimeout(() => {
        setSavedRounds((prev) => ({
          ...prev,
          [`${uid}-${roundKey}`]: false,
        }));
      }, 3000);

      const updatedQuiz = {
        ...quiz,
        R2: payload.R2,
        R3: payload.R3,
        R4: payload.R4,
      };

      setRoundModalCandidate((prev) => (prev ? { ...prev, quiz: updatedQuiz } : prev));
      setCandidates((prev) => prev.map((c) => (c.uid === uid ? { ...c, quiz: updatedQuiz } : c)));
    } catch (err) {
      console.error('Failed to save round data:', err);
      setError('Failed to save round data. Please try again.');
    }
  };

  // Calculate stats
  // Count candidates who have completed ALL rounds (R1, R2, R3, R4 status = completed)
  const getAllRoundsCompletedCount = () => {
    return candidates.filter(c => {
      // Check if R1 is completed (has a score)
      const r1Completed = c.quiz?.['Final Score'] && parseInt(c.quiz['Final Score']) > 0;
      
      // Check R2, R3, R4 status
      const r2Status = c.quiz?.R2?.[0]?.status?.toLowerCase();
      const r3Status = c.quiz?.R3?.[0]?.status?.toLowerCase();
      const r4Status = c.quiz?.R4?.[0]?.status?.toLowerCase();
      
      return r1Completed && 
             r2Status === 'completed' && 
             r3Status === 'completed' && 
             r4Status === 'completed';
    }).length;
  };
  
  // Count candidates with any round marked as 'drop'
  const getDroppedCount = () => {
    return candidates.filter(c => {
      const r2Status = c.quiz?.R2?.[0]?.status?.toLowerCase();
      const r3Status = c.quiz?.R3?.[0]?.status?.toLowerCase();
      const r4Status = c.quiz?.R4?.[0]?.status?.toLowerCase();
      
      return r2Status === 'drop' || r3Status === 'drop' || r4Status === 'drop';
    }).length;
  };
  
  // Count candidates with any round marked as 'rejected'
  const getRejectedCount = () => {
    return candidates.filter(c => {
      const r2Status = c.quiz?.R2?.[0]?.status?.toLowerCase();
      const r3Status = c.quiz?.R3?.[0]?.status?.toLowerCase();
      const r4Status = c.quiz?.R4?.[0]?.status?.toLowerCase();
      
      return r2Status === 'rejected' || r3Status === 'rejected' || r4Status === 'rejected';
    }).length;
  };
  
  const stats = {
    total: candidates.length,
    completed: getAllRoundsCompletedCount(),
    present: candidates.filter(c => getAttendanceStatus(c) === 'present').length,
    absent: candidates.filter(c => getAttendanceStatus(c) === 'absent').length,
    dropped: getDroppedCount(),
    rejected: getRejectedCount(),
  };

  const StatCard = ({ title, value, color }) => (
    <div style={{
      flex: '1 1 0',
      minWidth: '140px',
      background: 'white',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      borderLeft: `4px solid ${color}`,
    }}>
      <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', margin: '0 0 4px 0', textTransform: 'uppercase' }}>{title}</p>
      <h2 style={{ fontSize: '24px', fontWeight: '700', color: color, margin: 0 }}>{value}</h2>
    </div>
  );

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/hr-login';
  };

  // Helper function to get round data from quiz
  const getRoundDataForExcel = (quiz, roundKey) => {
    if (!quiz || !quiz[roundKey]) return { interviewer: '—', status: '—', rating: '—', comments: '—' };
    
    const roundData = quiz[roundKey];
    if (Array.isArray(roundData) && roundData.length > 0 && roundData[0]) {
      // For R3, use 'Managerial status' field instead of 'rating'
      const ratingValue = roundKey === 'R3' 
        ? (roundData[0]['Managerial status'] || roundData[0].rating || '—')
        : (roundData[0].rating || '—');
      return {
        interviewer: roundData[0].interviewer || '—',
        status: roundData[0].status || '—',
        rating: ratingValue,
        comments: roundData[0].comments || '—',
      };
    }
    if (roundData && typeof roundData === 'object') {
      // For R3, use 'Managerial status' field instead of 'rating'
      const ratingValue = roundKey === 'R3' 
        ? (roundData['Managerial status'] || roundData.rating || '—')
        : (roundData.rating || '—');
      return {
        interviewer: roundData.interviewer || '—',
        status: roundData.status || '—',
        rating: ratingValue,
        comments: roundData.comments || '—',
      };
    }
    return { interviewer: '—', status: '—', rating: '—', comments: '—' };
  };

  // Export to Excel - Role based
  const exportToExcel = () => {
    const filteredData = filteredCandidates;
    const userRole = localStorage.getItem('userRole') || 'Admin';
    const isAdmin = userRole === 'Admin';

    const dataToExport = filteredData.map((c) => {
      const r2Data = getRoundDataForExcel(c.quiz, 'R2');
      const r3Data = getRoundDataForExcel(c.quiz, 'R3');
      const r4Data = getRoundDataForExcel(c.quiz, 'R4');
      
      // Base data that everyone can see
      const baseData = {
        // Basic Info
        Username: c.username || '—',
        Name: c.name || '—',
        Email: c.email || '—',
        Phone: c.phone || '—',
        Location: c.location || '—',
        'Preferred Location': c.preferredLocation || '—',
        Designation: c.designation || '—',
        // Exam Status
        'Attendance Status': getAttendanceStatus(c) || '—',
        'Exam Status': c.examStatus || '—',
        'Start Time': c.startTime || '—',
        'Completion Time': c.completionTime || '—',
        'Time in Test': c.timeTakenInTest || '—',
        // Professional Details
        Skills: c.skills || '—',
        'Total Experience (Years)': c.totalExperience || '—',
        'Relevant Experience (Years)': c.relevantExperience || '—',
        'Willing to Relocate': c.willingToRelocate || '—',
        // Quiz Scores (Round 1)
        'R1 - Communication': c.quiz?.Communication || '—',
        'R1 - Database': c.quiz?.Database || '—',
        'R1 - GenAI': c.quiz?.GenAI || '—',
        'R1 - Logical': c.quiz?.Logical || '—',
        'R1 - Python': c.quiz?.Python || '—',
        'R1 - RPA': c.quiz?.RPA || '—',
        'R1 - Final Score': c.quiz?.['Final Score'] || '—',
        'R1 - Status': (parseInt(c.quiz?.['Final Score']) || 0) >= 13 ? 'Passed' : (parseInt(c.quiz?.['Final Score']) || 0) > 0 ? 'Dropped' : 'Not Started',
        // Round 2 (Technical Round)
        'R2 - Interviewer': r2Data.interviewer,
        'R2 - Status': r2Data.status,
        'R2 - Rating': r2Data.rating,
        'R2 - Comments': r2Data.comments,
        // Round 3 (Managerial Round)
        'R3 - Interviewer': r3Data.interviewer,
        'R3 - Status': r3Data.status,
        'R3 - Managerial Status': r3Data.rating,
        'R3 - Comments': r3Data.comments,
        // Round 4 (HR Round)
        'R4 - Interviewer': r4Data.interviewer,
        'R4 - Status': r4Data.status,
        'R4 - Rating': r4Data.rating,
        'R4 - Comments': r4Data.comments,
        // Document Links (Resume is visible to all)
        'Photo Link': c.photo || '—',
        'Resume Link': c.resume || '—',
      };
      
      // Admin-only sensitive data
      if (isAdmin) {
        return {
          Password: c.password || '—',
          ...baseData,
          'Current CTC': c.currentCTC || '—',
          'Notice Period': c.noticePeriod || '—',
          'Aadhar Card Link': c.aadharCard || '—',
          'Payslip Link': c.payslip || '—',
          'Last Breakup Link': c.lastBreakup || '—',
        };
      }
      
      // Co-Admin gets restricted data (no sensitive fields)
      return baseData;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Candidates');
    const statusLabel = filterStatus === 'all' ? 'all' : filterStatus;
    const roleLabel = isAdmin ? 'admin' : 'coadmin';
    XLSX.writeFile(wb, `candidates-${roleLabel}-${statusLabel}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Toggle row expansion
  const toggleRowExpansion = (uid) => {
    setExpandedRowId(expandedRowId === uid ? null : uid);
  };

  // Convert Google Drive links to viewable format
  const getViewableImageUrl = (url) => {
    if (!url) return '';
    
    // Handle Google Drive links
    if (url.includes('drive.google.com')) {
      let fileId = '';
      
      // Extract file ID from various Google Drive URL formats
      if (url.includes('/open?id=')) {
        fileId = url.split('id=')[1]?.split('&')[0];
      } else if (url.includes('/file/d/')) {
        fileId = url.split('/file/d/')[1]?.split('/')[0];
      } else if (url.includes('id=')) {
        fileId = url.split('id=')[1]?.split('&')[0];
      }
      
      if (fileId) {
        // Use direct view link for better compatibility across formats
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
      }
    }
    
    return url;
  };

  const isImageFile = (url) => {
    if (!url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.includes(ext));
  };

  const isPdfFile = (url) => {
    if (!url) return false;
    return url.toLowerCase().includes('.pdf');
  };

  const getDownloadUrl = (url) => {
    if (!url) return '';
    if (url.includes('drive.google.com/open?id=')) {
      const fileId = url.split('id=')[1];
      return `https://drive.google.com/file/d/${fileId}/view`;
    }
    return url;
  };

  // 🔥 LOADING / ERROR UI
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        {/* Spinner */}
        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid rgba(255, 255, 255, 0.3)',
          borderTop: '4px solid #ffffff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '24px'
        }} />
        <h2 style={{ color: 'white', fontSize: '24px', fontWeight: '600', margin: '0 0 8px 0' }}>Loading Dashboard</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px', margin: 0 }}>Fetching candidates data...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: '#fee2e2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <span style={{ fontSize: '28px' }}>⚠️</span>
          </div>
          <h2 style={{ color: '#dc2626', fontSize: '20px', margin: '0 0 12px 0' }}>Error Loading Data</h2>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 20px 0' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >Retry</button>
        </div>
      </div>
    );
  }

  // 🔥 UI (UNCHANGED STRUCTURE)
  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Navbar */}
      <div style={{
        background: 'white',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <img 
            src="https://www.tecnoprism.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-full.4865c8ea.png&w=1920&q=75" 
            alt="TecnoPrism Logo" 
            style={{ 
              maxWidth: '160px', 
              height: 'auto',
            }} 
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginLeft: 'auto' }}>
          {/* Real-time Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* New Data Notification */}
            {newDataCount > 0 && (
              <div style={{
                background: '#10b981',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '600',
                animation: 'pulse 2s infinite'
              }}>
                +{newDataCount} new candidate{newDataCount > 1 ? 's' : ''}
              </div>
            )}
            
            {/* Last Updated */}
            {lastUpdated && (
              <span style={{ fontSize: '13px', color: '#6b7280' }}>
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}

            {/* Manual Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '600',
                border: '1px solid #A7F3D0',
                borderRadius: '8px',
                background: '#ECFDF5',
                color: '#16A34A',
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                opacity: isRefreshing ? 0.7 : 1,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!isRefreshing) {
                  e.currentTarget.style.background = '#D1FAE5';
                  e.currentTarget.style.color = '#15803D';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ECFDF5';
                e.currentTarget.style.color = '#16A34A';
              }}
            >
              <RefreshCw size={16} color="#16A34A" style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* Logged in Role Badge */}
          {localStorage.getItem('userRole') && (
            <div style={{
              padding: '8px 14px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <Users size={16} />
              {localStorage.getItem('userRole')}
            </div>
          )}

          <button
            onClick={handleLogout}
            className="logout-btn"
            style={{
              padding: '10px 14px',
              background: 'transparent',
              color: '#DC2626',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FEF2F2';
              e.currentTarget.style.color = '#B91C1C';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#DC2626';
            }}
          >
            <LogOut size={18} color="#DC2626" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, minWidth: 0 }} className="main-content">
        
        {/* Pulse animation for new data notification */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}</style>

        {/* Loading State */}
        {loading && (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p style={{ color: '#667eea', fontSize: '16px', fontWeight: '500' }}>Loading candidates...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444', fontSize: '16px' }}>{error}</div>
        )}

        {/* Main Content */}
        {!loading && !error && (
          <div style={{ padding: '24px' }}>
            {/* Stats Cards */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <StatCard title="Total Users" value={stats.total} color="#667eea" />
              <StatCard title="All Rounds Completed" value={stats.completed} color="#10b981" />
              <StatCard title="Present" value={stats.present} color="#22c55e" />
              <StatCard title="Absent" value={stats.absent} color="#ef4444" />
              <StatCard title="Dropped" value={stats.dropped} color="#dc2626" />
              <StatCard title="Rejected" value={stats.rejected} color="#f97316" />
            </div>

            {/* Candidates Table Card */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              overflow: 'hidden',
            }}>
              {/* Header with Title and Export Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', margin: 0 }}>Candidate Records</h2>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                      onClick={exportToExcel}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 16px',
                        background: '#ECFDF5',
                        color: '#16A34A',
                        border: '1px solid #A7F3D0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#D1FAE5';
                        e.currentTarget.style.color = '#15803D';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ECFDF5';
                        e.currentTarget.style.color = '#16A34A';
                      }}
                    >
                      <Download size={16} color="#16A34A" />
                      Excel
                    </button>
                  </div>
                </div>

                {/* CandidateTable Component with Pagination */}
                <CandidateTable
                  candidates={candidates}
                  getAttendanceStatus={getAttendanceStatus}
                  getDownloadUrl={getDownloadUrl}
                  userRole={localStorage.getItem('userRole') || 'Admin'}
                  onRefresh={() => fetchCandidates(true)}
                />
            </div>
          </div>
        )}
      </div>

      {/* Round Details Modal */}
      {roundModalOpen && roundModalCandidate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={closeRoundModal}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '920px',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {roundModalCandidate.photo ? (
                  <img
                    src={getViewableImageUrl(roundModalCandidate.photo)}
                    alt="Profile"
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.6)' }}
                  />
                ) : (
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                  }}>
                    {getInitials(roundModalCandidate.name)}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700' }}>{roundModalCandidate.name}</div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>{roundModalCandidate.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {/* Refresh Round Data Button */}
                <button
                  onClick={() => openRoundModal(roundModalCandidate)}
                  disabled={modalLoading}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    cursor: modalLoading ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw size={14} style={{ animation: modalLoading ? 'spin 1s linear infinite' : 'none' }} />
                  Refresh
                </button>
              <button
                onClick={closeRoundModal}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Close
              </button>
              </div>
            </div>

            {/* Modal Loading State */}
            {modalLoading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid #e5e7eb',
                  borderTop: '3px solid #667eea',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px'
                }} />
                <p style={{ color: '#667eea', fontSize: '14px', fontWeight: '500' }}>Loading round data...</p>
              </div>
            ) : (
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Round 1 - Quiz Scores Display */}
              {roundModalCandidate.quiz && (
                <div style={{ border: '2px solid #10b981', borderRadius: '12px', padding: '20px', background: '#f0fdf4' }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ background: '#10b981', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '14px' }}>R1</span>
                    Quiz Results (MCQ Test)
                    {(() => {
                      const finalScore = roundModalCandidate.quiz['Final Score'] || roundModalCandidate.quiz['final score'] || roundModalCandidate.quiz.finalScore || roundModalCandidate.quiz.FinalScore || '';
                      if (finalScore) {
                        return (
                          <span style={{ 
                            marginLeft: 'auto', 
                            background: parseInt(finalScore) >= 13 ? '#10b981' : '#ef4444',
                            color: 'white',
                            padding: '6px 16px',
                            borderRadius: '20px',
                            fontSize: '16px',
                            fontWeight: '700'
                          }}>
                            Final Score: {finalScore}/30
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                    {[
                      { key: 'Communication', label: 'Communication', max: 5 },
                      { key: 'Database', label: 'Database', max: 5 },
                      { key: 'GenAI', label: 'GenAI', max: 5 },
                      { key: 'Logical', label: 'Logical', max: 5 },
                      { key: 'Python', label: 'Python', max: 5 },
                      { key: 'RPA', label: 'RPA', max: 5 },
                    ].map(({ key, label, max }) => {
                      const score = parseInt(roundModalCandidate.quiz[key] || roundModalCandidate.quiz[key.toLowerCase()] || 0) || 0;
                      const percentage = (score / max) * 100;
                      return (
                        <div key={key} style={{ 
                          background: 'white', 
                          padding: '12px', 
                          borderRadius: '8px', 
                          border: '1px solid #e5e7eb',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{label}</div>
                          <div style={{ 
                            fontSize: '24px', 
                            fontWeight: '700', 
                            color: percentage >= 60 ? '#10b981' : percentage >= 40 ? '#f59e0b' : '#ef4444'
                          }}>
                            {score}/{max}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Technical Round - R2 */}
              {(() => {
                const roundKey = 'round2';
                const roundLabel = 'Technical Round - R2';
                const values = (roundNotes[roundModalCandidate.uid] || {})[roundKey] || {};
                const isSaved = savedRounds[`${roundModalCandidate.uid}-${roundKey}`];
                const currentRating = parseInt(values.rating) || 0;
                const isDropped = droppedRounds[`${roundModalCandidate.uid}-${roundKey}`];
                const selectedInterviewer = interviewers[`${roundModalCandidate.uid}-${roundKey}`] || '';
                
                return (
                  <div key={roundKey} style={{ border: isDropped ? '2px solid #ef4444' : '2px solid #667eea', borderRadius: '12px', padding: '20px', background: isDropped ? '#fef2f2' : '#f8faff' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ background: isDropped ? '#ef4444' : '#667eea', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '14px' }}>
                          {isDropped ? 'DROPPED' : 'R2'}
                        </span>
                        {roundLabel}
                      </div>
                      <select
                        value={selectedInterviewer}
                        onChange={(e) => setInterviewers(prev => ({ ...prev, [`${roundModalCandidate.uid}-${roundKey}`]: e.target.value }))}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '13px',
                          color: '#374151',
                          minWidth: '180px',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">Select Interviewer</option>
                        {INTERVIEWER_NAMES.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Rating Section */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '14px', color: '#374151', fontWeight: '600', display: 'block', marginBottom: '10px' }}>
                        Technical Rating (1–10)
                        {currentRating > 0 && (
                          <span style={{ 
                            marginLeft: '12px', 
                            background: currentRating >= 7 ? '#10b981' : currentRating >= 4 ? '#f59e0b' : '#ef4444',
                            color: 'white',
                            padding: '2px 10px',
                            borderRadius: '12px',
                            fontSize: '13px'
                          }}>
                            Score: {currentRating}/10
                          </span>
                        )}
                      </label>
                      
                      {/* Rating Buttons */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => updateRoundNotes(roundModalCandidate.uid, roundKey, 'rating', String(num))}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '8px',
                              border: currentRating === num ? '2px solid #667eea' : '1px solid #e5e7eb',
                              background: currentRating === num 
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                                : num <= 3 ? '#fee2e2' : num <= 6 ? '#fef3c7' : '#d1fae5',
                              color: currentRating === num ? 'white' : '#374151',
                              fontWeight: '700',
                              fontSize: '14px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                      
                      {/* Also keep number input for direct entry */}
                      <input
                        type="number"
                        min="1"
                        max="10"
                        placeholder="Or type rating (1-10)"
                        value={values.rating || ''}
                        onChange={(e) => {
                          const val = Math.min(10, Math.max(1, parseInt(e.target.value) || 0));
                          updateRoundNotes(roundModalCandidate.uid, roundKey, 'rating', val ? String(val) : '');
                        }}
                        style={{ 
                          width: '100%', 
                          padding: '10px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    
                    {/* Comments Section */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '14px', color: '#374151', fontWeight: '600', display: 'block', marginBottom: '8px' }}>Comments</label>
                      <textarea
                        value={values.comments || ''}
                        onChange={(e) => updateRoundNotes(roundModalCandidate.uid, roundKey, 'comments', e.target.value)}
                        placeholder="Enter technical assessment comments..."
                        rows={3}
                        style={{ 
                          width: '100%', 
                          padding: '10px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                      <button
                        onClick={() => saveRoundNotes(roundKey)}
                        style={{
                          background: isSaved ? '#10b981' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          fontSize: '14px'
                        }}
                      >
                        {isSaved ? '✓ Saved' : `Save ${roundLabel}`}
                      </button>
                      <button
                        onClick={() => setDroppedRounds(prev => ({ ...prev, [`${roundModalCandidate.uid}-${roundKey}`]: !isDropped }))}
                        title={isDropped ? 'Undo Drop' : 'Drop Candidate'}
                        style={{
                          background: isDropped ? '#fef2f2' : '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          fontSize: '14px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#dc2626';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isDropped ? '#fef2f2' : '#fee2e2';
                          e.currentTarget.style.color = '#dc2626';
                        }}
                      >
                        {isDropped ? 'Undo Drop' : 'Drop'}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* HR Round - R3 */}
              {(() => {
                const roundKey = 'round3';
                const roundLabel = 'HR Round - R3';
                const values = (roundNotes[roundModalCandidate.uid] || {})[roundKey] || {};
                const isSaved = savedRounds[`${roundModalCandidate.uid}-${roundKey}`];
                const isDropped = droppedRounds[`${roundModalCandidate.uid}-${roundKey}`];
                const selectedInterviewer = interviewers[`${roundModalCandidate.uid}-${roundKey}`] || '';
                return (
                  <div key={roundKey} style={{ border: isDropped ? '2px solid #ef4444' : '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', background: isDropped ? '#fef2f2' : 'white' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isDropped && <span style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>DROPPED</span>}
                        {roundLabel}
                      </div>
                      <select
                        value={selectedInterviewer}
                        onChange={(e) => setInterviewers(prev => ({ ...prev, [`${roundModalCandidate.uid}-${roundKey}`]: e.target.value }))}
                        style={{
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: '#374151',
                          minWidth: '160px',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">Select Interviewer</option>
                        {INTERVIEWER_NAMES.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>Decision</label>
                        <select
                          value={values.rating || ''}
                          onChange={(e) => updateRoundNotes(roundModalCandidate.uid, roundKey, 'rating', e.target.value)}
                          style={{
                            width: '100%',
                            marginTop: '6px',
                            padding: '8px 10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: '#1f2937',
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="">Select Decision</option>
                          <option value="GO">GO</option>
                          <option value="NO GO">NO GO</option>
                          <option value="HOLD">HOLD</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>Comments</label>
                        <input
                          type="text"
                          value={values.comments || ''}
                          onChange={(e) => updateRoundNotes(roundModalCandidate.uid, roundKey, 'comments', e.target.value)}
                          style={{ width: '100%', marginTop: '6px' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', gap: '12px' }}>
                      <button
                        onClick={() => saveRoundNotes(roundKey)}
                        style={{
                          background: isSaved ? '#10b981' : '#667eea',
                          color: 'white',
                          border: 'none',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'background 0.3s ease',
                        }}
                      >
                        {isSaved ? '✓ Saved' : `Save ${roundLabel}`}
                      </button>
                      <button
                        onClick={() => setDroppedRounds(prev => ({ ...prev, [`${roundModalCandidate.uid}-${roundKey}`]: !isDropped }))}
                        title={isDropped ? 'Undo Drop' : 'Drop Candidate'}
                        style={{
                          background: isDropped ? '#fef2f2' : '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          fontSize: '14px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#dc2626';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isDropped ? '#fef2f2' : '#fee2e2';
                          e.currentTarget.style.color = '#dc2626';
                        }}
                      >
                        {isDropped ? 'Undo Drop' : 'Drop'}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Round 4 */}
              {(() => {
                const roundKey = 'round4';
                const roundLabel = 'Round 4';
                const values = (roundNotes[roundModalCandidate.uid] || {})[roundKey] || {};
                const isSaved = savedRounds[`${roundModalCandidate.uid}-${roundKey}`];
                const isDropped = droppedRounds[`${roundModalCandidate.uid}-${roundKey}`];
                const selectedInterviewer = interviewers[`${roundModalCandidate.uid}-${roundKey}`] || '';
                return (
                  <div key={roundKey} style={{ border: isDropped ? '2px solid #ef4444' : '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', background: isDropped ? '#fef2f2' : 'white' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isDropped && <span style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>DROPPED</span>}
                        {roundLabel}
                      </div>
                      <select
                        value={selectedInterviewer}
                        onChange={(e) => setInterviewers(prev => ({ ...prev, [`${roundModalCandidate.uid}-${roundKey}`]: e.target.value }))}
                        style={{
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: '#374151',
                          minWidth: '160px',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">Select Interviewer</option>
                        {INTERVIEWER_NAMES.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>Rating (1–10)</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={values.rating || ''}
                          onChange={(e) => updateRoundNotes(roundModalCandidate.uid, roundKey, 'rating', e.target.value)}
                          style={{ width: '100%', marginTop: '6px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>Comments</label>
                        <input
                          type="text"
                          value={values.comments || ''}
                          onChange={(e) => updateRoundNotes(roundModalCandidate.uid, roundKey, 'comments', e.target.value)}
                          style={{ width: '100%', marginTop: '6px' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', gap: '12px' }}>
                      <button
                        onClick={() => saveRoundNotes(roundKey)}
                        style={{
                          background: isSaved ? '#10b981' : '#667eea',
                          color: 'white',
                          border: 'none',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'background 0.3s ease',
                        }}
                      >
                        {isSaved ? '✓ Saved' : `Save ${roundLabel}`}
                      </button>
                      <button
                        onClick={() => setDroppedRounds(prev => ({ ...prev, [`${roundModalCandidate.uid}-${roundKey}`]: !isDropped }))}
                        title={isDropped ? 'Undo Drop' : 'Drop Candidate'}
                        style={{
                          background: isDropped ? '#fef2f2' : '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          fontSize: '14px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#dc2626';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isDropped ? '#fef2f2' : '#fee2e2';
                          e.currentTarget.style.color = '#dc2626';
                        }}
                      >
                        {isDropped ? 'Undo Drop' : 'Drop'}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
            )}
          </div>
        </div>
      )}

      {/* Responsive CSS */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .main-content {
            margin-left: 0 !important;
          }
        }

        @media (max-width: 480px) {
          div[style*="flex: 0 1 calc(50% - 8px)"] {
            flex: 0 1 100% !important;
          }
        }

        input, textarea {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 13px;
          color: #1f2937;
          outline: none;
        }

        input:focus, textarea:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.15);
        }

      `}</style>
    </div>
  );
};

export default HRDashboard;

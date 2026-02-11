import React, { useState, useEffect } from 'react';
import { X, Edit2, Save, Loader2, MessageSquare, FileText, Image, CreditCard, Receipt, ExternalLink, Check } from 'lucide-react';
import { CandidatePhoto, getGoogleDriveImageUrl } from './CandidatePhoto';

const SECTION_CONFIG = [
  { key: 'logical', label: 'Logical', apiField: 'Logical' },
  { key: 'database', label: 'Database', apiField: 'Database' },
  { key: 'communication', label: 'Communication', apiField: 'Communication' },
  { key: 'rpa', label: 'RPA', apiField: 'RPA' },
  { key: 'genAi', label: 'GEN AI', apiField: 'GenAI' },
  { key: 'python', label: 'Python', apiField: 'Python' },
];

const INTERVIEWER_NAMES = [
  'Rahul Sharma',
  'Priya Patel',
  'Amit Kumar',
  'Sneha Gupta',
  'Vikram Singh',
  'Anjali Verma',
  'Rajesh Nair'
];

export function CandidateDetailsModal({ candidate, open, onClose, userRole = 'Admin', onRefresh }) {
  const isAdmin = userRole === 'Admin';
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editedMarks, setEditedMarks] = useState({});
  const [comments, setComments] = useState({
    r2: '',
    r3: '',
    r4: '',
  });
  const [r2Rating, setR2Rating] = useState(0); // Rating 1-10 for Technical Round
  const [r4Rating, setR4Rating] = useState(0); // Rating 1-10 for Final Round
  const [r3Status, setR3Status] = useState('');
  const [r4Status, setR4Status] = useState('');
  const [roundSaveStatus, setRoundSaveStatus] = useState({ r2: false, r3: false, r4: false });
  const [roundSaveLoading, setRoundSaveLoading] = useState({ r2: false, r3: false, r4: false });
  const [fetchingData, setFetchingData] = useState(false);
  
  // Interviewer state for each round
  const [r2Interviewer, setR2Interviewer] = useState('');
  const [r3Interviewer, setR3Interviewer] = useState('');
  const [r4Interviewer, setR4Interviewer] = useState('');
  
  // Round status (in progress, completed, drop)
  const [r2RoundStatus, setR2RoundStatus] = useState('');
  const [r3RoundStatus, setR3RoundStatus] = useState('');
  const [r4RoundStatus, setR4RoundStatus] = useState('');
  
  // Dynamic interviewer names from API
  const [interviewerNames, setInterviewerNames] = useState([]);
  
  // Auto-save state for interviewer selection
  const [interviewerSaving, setInterviewerSaving] = useState({ r2: false, r3: false, r4: false });
  const [interviewerSaved, setInterviewerSaved] = useState({ r2: false, r3: false, r4: false });
  
  // Interviewer validation error state
  const [interviewerError, setInterviewerError] = useState({ r2: false, r3: false, r4: false });
  
  // Store the email from quiz database (may be different from candidate.email)
  const [quizEmail, setQuizEmail] = useState('');

  // Auto-save interviewer to database
  const autoSaveInterviewer = async (roundKey, interviewerName, newStatus) => {
    // Use quizEmail if available, otherwise fall back to candidate.email
    const emailForUpdate = quizEmail || candidate?.email;
    if (!emailForUpdate) return;
    
    setInterviewerSaving(prev => ({ ...prev, [roundKey]: true }));
    setInterviewerSaved(prev => ({ ...prev, [roundKey]: false }));
    
    try {
      // Build payload with current values
      const payload = {
        email: emailForUpdate,
        R2: [{ 
          rating: String(roundKey === 'r2' ? r2Rating : r2Rating) || '', 
          comments: comments.r2 || '',
          interviewer: roundKey === 'r2' ? interviewerName : r2Interviewer || '',
          status: roundKey === 'r2' ? newStatus : r2RoundStatus || ''
        }],
        R3: [{ 
          'Managerial status': roundKey === 'r3' ? r3Status : (r3Status || ''), 
          comments: comments.r3 || '',
          interviewer: roundKey === 'r3' ? interviewerName : r3Interviewer || '',
          status: roundKey === 'r3' ? newStatus : r3RoundStatus || ''
        }],
        R4: [{ 
          rating: String(roundKey === 'r4' ? r4Rating : r4Rating) || '', 
          comments: comments.r4 || '',
          interviewer: roundKey === 'r4' ? interviewerName : r4Interviewer || '',
          status: roundKey === 'r4' ? newStatus : r4RoundStatus || ''
        }],
        Logical: String(candidate.quiz?.Logical || editedMarks.logical || ''),
        GenAI: String(candidate.quiz?.GenAI || editedMarks.genAi || ''),
        Python: String(candidate.quiz?.Python || editedMarks.python || ''),
        RPA: String(candidate.quiz?.RPA || editedMarks.rpa || ''),
        Database: String(candidate.quiz?.Database || editedMarks.database || ''),
        Communication: String(candidate.quiz?.Communication || editedMarks.communication || ''),
        'Final Score': String(candidate.quiz?.['Final Score'] || ''),
      };

      const response = await fetch('https://tecnoprismmainbackend.onrender.com/quiz-segregate/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to auto-save interviewer');
      
      setInterviewerSaved(prev => ({ ...prev, [roundKey]: true }));
      setTimeout(() => {
        setInterviewerSaved(prev => ({ ...prev, [roundKey]: false }));
      }, 2000);
      
      console.log(`Auto-saved ${roundKey} interviewer: ${interviewerName}, status: ${newStatus}`);
    } catch (error) {
      console.error('Error auto-saving interviewer:', error);
    } finally {
      setInterviewerSaving(prev => ({ ...prev, [roundKey]: false }));
    }
  };

  // Fetch interviewer names from API
  const fetchInterviewerNames = async () => {
    try {
      const response = await fetch('https://tecnoprismmainbackend.onrender.com/interviewer');
      if (response.ok) {
        const data = await response.json();
        // Extract names from the first group in data array
        if (data.data && data.data[0] && data.data[0].names) {
          setInterviewerNames(data.data[0].names);
        }
      }
    } catch (error) {
      console.error('Error fetching interviewer names:', error);
      // Fallback to empty array, dropdown will show no options
    }
  };

  // Fetch fresh data from API when modal opens
  const fetchCandidateData = async (email, name = '', phone = '') => {
    if (!email || email === '—' || email === '-') return;
    
    setFetchingData(true);
    try {
      // Build query params with name, contact, and email
      const params = new URLSearchParams();
      const cleanName = (name && name !== '—' && name !== '-') ? name.trim() : '';
      const cleanPhone = (phone && phone !== '—' && phone !== '-') ? phone.toString().replace(/\D/g, '') : '';
      
      if (cleanName) params.append('name', cleanName);
      if (cleanPhone) params.append('contact', cleanPhone);
      params.append('email', email.toLowerCase());
      
      const response = await fetch(`https://tecnoprismmainbackend.onrender.com/quiz-segregate?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched quiz data for', email, ':', data);
        const quizData = data.data?.[0] || data[0] || data;
        
        if (quizData) {
          console.log('R2 data:', quizData.R2);
          console.log('R3 data:', quizData.R3);
          console.log('R4 data:', quizData.R4);
          
          // Store the quiz email for updates (this is the email that exists in quiz database)
          const quizDbEmail = quizData.Email || quizData.email || '';
          if (quizDbEmail) {
            setQuizEmail(quizDbEmail);
            console.log('Quiz database email:', quizDbEmail);
          }
          
          // Set marks
          setEditedMarks({
            logical: parseInt(quizData.Logical) || 0,
            database: parseInt(quizData.Database) || 0,
            communication: parseInt(quizData.Communication) || 0,
            rpa: parseInt(quizData.RPA) || 0,
            genAi: parseInt(quizData.GenAI) || 0,
            python: parseInt(quizData.Python) || 0,
          });
          
          // Set R2 data
          if (quizData.R2 && Array.isArray(quizData.R2) && quizData.R2[0]) {
            setR2Rating(parseInt(quizData.R2[0].rating) || 0);
            setComments(prev => ({ ...prev, r2: quizData.R2[0].comments || '' }));
            setR2Interviewer(quizData.R2[0].interviewer || '');
            setR2RoundStatus(quizData.R2[0].status || '');
          }
          
          // Set R3 data
          if (quizData.R3 && Array.isArray(quizData.R3) && quizData.R3[0]) {
            // R3 uses 'Managerial status' field for GO/NO GO/HOLD (not 'rating')
            const r3ManagerialStatus = quizData.R3[0]['Managerial status'] || quizData.R3[0]['managerial status'] || quizData.R3[0].rating || '';
            const r3RatingValue = r3ManagerialStatus.toUpperCase().trim();
            setR3Status(r3RatingValue);
            setComments(prev => ({ ...prev, r3: quizData.R3[0].comments || '' }));
            setR3Interviewer(quizData.R3[0].interviewer || '');
            setR3RoundStatus(quizData.R3[0].status || '');
            console.log('R3 data loaded - Managerial Status:', r3RatingValue, 'Round Status:', quizData.R3[0].status);
          }
          
          // Set R4 data
          if (quizData.R4 && Array.isArray(quizData.R4) && quizData.R4[0]) {
            setR4Rating(parseInt(quizData.R4[0].rating) || 0);
            setR4Status(quizData.R4[0].rating || '');
            setComments(prev => ({ ...prev, r4: quizData.R4[0].comments || '' }));
            setR4Interviewer(quizData.R4[0].interviewer || '');
            setR4RoundStatus(quizData.R4[0].status || '');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching candidate data:', error);
    } finally {
      setFetchingData(false);
    }
  };

  useEffect(() => {
    if (open && candidate?.email) {
      // Reset all round data before fetching to prevent data leaking between candidates
      setQuizEmail(''); // Reset quiz email
      setR2Interviewer('');
      setR3Interviewer('');
      setR4Interviewer('');
      setR2RoundStatus('');
      setR3RoundStatus('');
      setR4RoundStatus('');
      setR2Rating(0);
      setR3Status('');
      setR4Rating(0);
      setR4Status('');
      setComments({ r2: '', r3: '', r4: '' });
      setRoundSaveStatus({ r2: false, r3: false, r4: false });
      
      // Fetch interviewer names from API
      fetchInterviewerNames();
      
      // Fetch fresh data from API with name, phone, and email
      fetchCandidateData(candidate.email, candidate.name, candidate.phone);
    }
    
    if (candidate?.round1Marks) {
      setEditedMarks(candidate.round1Marks);
    } else if (candidate?.quiz) {
      // Map from quiz data
      setEditedMarks({
        logical: parseInt(candidate.quiz?.Logical) || 0,
        database: parseInt(candidate.quiz?.Database) || 0,
        communication: parseInt(candidate.quiz?.Communication) || 0,
        rpa: parseInt(candidate.quiz?.RPA) || 0,
        genAi: parseInt(candidate.quiz?.GenAI) || 0,
        python: parseInt(candidate.quiz?.Python) || 0,
      });
    }
    if (candidate) {
      setComments({
        r2: candidate.round2?.comments || '',
        r3: candidate.round3?.comments || '',
        r4: candidate.round4?.comments || '',
      });
      setR2Rating(candidate.round2?.rating || 0);
      setR4Rating(candidate.round4?.rating || 0);
      setR3Status(candidate.round3?.status || '');
      setR4Status(candidate.round4?.status || '');
    }
    setSaved(false);
  }, [candidate, open]);

  if (!open || !candidate) return null;

  const handleSaveMarks = async () => {
    setLoading(true);
    try {
      const calculatedTotal =
        (Number(editedMarks.logical) || 0) +
        (Number(editedMarks.database) || 0) +
        (Number(editedMarks.communication) || 0) +
        (Number(editedMarks.rpa) || 0) +
        (Number(editedMarks.genAi) || 0) +
        (Number(editedMarks.python) || 0);

      // Use quizEmail if available, otherwise fall back to candidate.email
      const emailForUpdate = quizEmail || candidate.email;
      
      const payload = {
        email: emailForUpdate,
        Logical: Number(editedMarks.logical) || 0,
        Database: Number(editedMarks.database) || 0,
        Communication: Number(editedMarks.communication) || 0,
        RPA: Number(editedMarks.rpa) || 0,
        GenAI: Number(editedMarks.genAi) || 0,
        Python: Number(editedMarks.python) || 0,
        "Final Score": String(calculatedTotal)
      };

      const response = await fetch('https://tecnoprismmainbackend.onrender.com/quiz-segregate/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to update marks');

      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error updating marks:', error);
      alert('Failed to update marks');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (key, value) => {
    const numValue = Math.min(5, Math.max(0, parseInt(value) || 0));
    setEditedMarks(prev => ({ ...prev, [key]: numValue }));
  };

  // Save round data (R2, R3, R4)
  const handleSaveRound = async (roundKey, isDrop = false) => {
    // Validate interviewer is selected (mandatory field)
    if (roundKey === 'r2' && !r2Interviewer) {
      setInterviewerError(prev => ({ ...prev, r2: true }));
      return;
    }
    if (roundKey === 'r3' && !r3Interviewer) {
      setInterviewerError(prev => ({ ...prev, r3: true }));
      return;
    }
    if (roundKey === 'r4' && !r4Interviewer) {
      setInterviewerError(prev => ({ ...prev, r4: true }));
      return;
    }
    
    setRoundSaveLoading(prev => ({ ...prev, [roundKey]: true }));
    
    // Update status based on action: isDrop can be true (drop), 'rejected', or false (completed)
    const newStatus = isDrop === true ? 'drop' : isDrop === 'rejected' ? 'rejected' : 'completed';
    if (roundKey === 'r2') setR2RoundStatus(newStatus);
    if (roundKey === 'r3') setR3RoundStatus(newStatus);
    if (roundKey === 'r4') setR4RoundStatus(newStatus);
    
    try {
      // Use quizEmail if available, otherwise fall back to candidate.email
      const emailForUpdate = quizEmail || candidate.email;
      
      const payload = {
        email: emailForUpdate,
        R2: [{ 
          rating: String(r2Rating || ''), 
          comments: comments.r2 || '',
          interviewer: r2Interviewer || '',
          status: roundKey === 'r2' ? newStatus : r2RoundStatus || ''
        }],
        R3: [{ 
          'Managerial status': roundKey === 'r3' ? r3Status : (r3Status || ''), 
          comments: comments.r3 || '',
          interviewer: r3Interviewer || '',
          status: roundKey === 'r3' ? newStatus : r3RoundStatus || ''
        }],
        R4: [{ 
          rating: String(r4Rating || ''), 
          comments: comments.r4 || '',
          interviewer: r4Interviewer || '',
          status: roundKey === 'r4' ? newStatus : r4RoundStatus || ''
        }],
        Logical: String(candidate.quiz?.Logical || editedMarks.logical || ''),
        GenAI: String(candidate.quiz?.GenAI || editedMarks.genAi || ''),
        Python: String(candidate.quiz?.Python || editedMarks.python || ''),
        RPA: String(candidate.quiz?.RPA || editedMarks.rpa || ''),
        Database: String(candidate.quiz?.Database || editedMarks.database || ''),
        Communication: String(candidate.quiz?.Communication || editedMarks.communication || ''),
        'Final Score': String(candidate.quiz?.['Final Score'] || displayTotal || ''),
      };

      console.log('Saving round data payload:', JSON.stringify(payload, null, 2));

      const response = await fetch('https://tecnoprismmainbackend.onrender.com/quiz-segregate/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const responseData = await response.json().catch(() => null);
      console.log('Save response:', response.status, responseData);

      if (!response.ok) throw new Error('Failed to save round data');

      setRoundSaveStatus(prev => ({ ...prev, [roundKey]: true }));
      setTimeout(() => {
        setRoundSaveStatus(prev => ({ ...prev, [roundKey]: false }));
      }, 3000);
      
      // Auto-refresh dashboard data after successful save
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error saving round data:', error);
      alert('Failed to save round data. Please try again.');
    } finally {
      setRoundSaveLoading(prev => ({ ...prev, [roundKey]: false }));
    }
  };

  const currentMarks = isEditing ? editedMarks : (candidate.round1Marks || {
    logical: parseInt(candidate.quiz?.Logical || candidate.quiz?.logical) || 0,
    database: parseInt(candidate.quiz?.Database || candidate.quiz?.database) || 0,
    communication: parseInt(candidate.quiz?.Communication || candidate.quiz?.communication) || 0,
    rpa: parseInt(candidate.quiz?.RPA || candidate.quiz?.rpa) || 0,
    genAi: parseInt(candidate.quiz?.GenAI || candidate.quiz?.genAi || candidate.quiz?.genai) || 0,
    python: parseInt(candidate.quiz?.Python || candidate.quiz?.python) || 0,
  });

  // Use Final Score from API if available, otherwise calculate from individual marks
  const apiFinalScore = parseInt(
    candidate.quiz?.['Final Score'] || 
    candidate.quiz?.['final score'] || 
    candidate.quiz?.finalScore || 
    candidate.quiz?.FinalScore || 
    0
  );
  
  const calculatedTotal =
    (Number(currentMarks.logical) || 0) +
    (Number(currentMarks.database) || 0) +
    (Number(currentMarks.communication) || 0) +
    (Number(currentMarks.rpa) || 0) +
    (Number(currentMarks.genAi) || 0) +
    (Number(currentMarks.python) || 0);
  
  // Prefer API Final Score over calculated total
  const displayTotal = apiFinalScore > 0 ? apiFinalScore : calculatedTotal;

  const getDownloadUrl = (url) => {
    if (!url) return '#';
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/file\/d\/([^/]+)/);
      if (match) {
        return `https://drive.google.com/uc?export=download&id=${match[1]}`;
      }
    }
    return url;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          maxWidth: '900px',
          width: '95%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}>
            Candidate Details
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={24} color="#6b7280" />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Candidate Info Header */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '24px',
            paddingBottom: '24px',
            borderBottom: '1px solid #e5e7eb',
            marginBottom: '24px',
          }}>
            <CandidatePhoto photoUrl={candidate.photo} name={candidate.name} size="lg" />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: 0 }}>{candidate.name}</h3>
                {candidate.resume && (
                  <a
                    href={candidate.resume}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      background: '#3b82f6',
                      color: 'white',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      textDecoration: 'none',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                  >
                    <FileText size={16} />
                    Resume
                  </a>
                )}
              </div>
              <p style={{ color: '#6b7280', margin: '4px 0', fontWeight: '500' }}>{candidate.email}</p>
              <p style={{ color: '#9ca3af', margin: '4px 0', fontSize: '14px' }}>{candidate.phone}</p>
              {/* <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <span style={{
                  padding: '6px 16px',
                  background: '#f3f4f6',
                  color: '#6b7280',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                }}>
                  {candidate.location || 'Location N/A'}
                </span>
                
              </div> */}
              
            </div>
          </div>

          {/* Round 1 - Section Wise Marks (Read Only) */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#111827',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                margin: 0,
              }}>
                <span style={{
                  width: '40px',
                  height: '40px',
                  background: '#eef2ff',
                  color: '#667eea',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '900',
                  border: '1px solid #c7d2fe',
                }}>
                  R1
                </span>
                Round 1 - Section Wise Marks
                <span style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#6b7280',
                  background: '#f3f4f6',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  marginLeft: '8px',
                }}>
                  Read Only
                </span>
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {SECTION_CONFIG.map((section) => (
                <div key={section.key} style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '16px',
                  padding: '20px',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '80px',
                    height: '80px',
                    background: '#eef2ff',
                    borderRadius: '50%',
                    marginRight: '-40px',
                    marginTop: '-40px',
                  }} />
                  <div style={{ position: 'relative' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {section.label}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '32px', fontWeight: '900', color: '#111827' }}>
                        {currentMarks[section.key] ?? 0}
                      </span>
                      <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '600', marginBottom: '-8px' }}>/ 5</span>
                    </div>
                    <div style={{
                      marginTop: '12px',
                      height: '6px',
                      background: '#e5e7eb',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        background: 'linear-gradient(90deg, #667eea, #764ba2)',
                        borderRadius: '9999px',
                        width: `${((currentMarks[section.key] ?? 0) / 5) * 100}%`,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Final Score */}
            <div style={{
              marginTop: '20px',
              background: 'linear-gradient(135deg, #eef2ff 0%, #faf5ff 50%, #eef2ff 100%)',
              border: '1px solid #c7d2fe',
              borderRadius: '16px',
              padding: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Final Score
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                    <span style={{ fontSize: '48px', fontWeight: '900', color: '#111827', lineHeight: 1 }}>{displayTotal}</span>
                    <span style={{ fontSize: '20px', color: '#6b7280', fontWeight: '600', marginBottom: '8px' }}>/ 30</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '36px', fontWeight: '900', color: '#667eea' }}>
                    {Math.round((displayTotal / 30) * 100)}%
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Performance
                  </div>
                </div>
              </div>
              <div style={{
                marginTop: '20px',
                height: '12px',
                background: 'rgba(255,255,255,0.8)',
                borderRadius: '9999px',
                padding: '2px',
                border: '1px solid #c7d2fe',
              }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #667eea, #8b5cf6, #667eea)',
                  borderRadius: '9999px',
                  width: `${(displayTotal / 30) * 100}%`,
                  transition: 'width 1s ease',
                }} />
              </div>
            </div>
          </div>

          {/* Interview Rounds */}
          <div style={{ marginBottom: '32px' }}>
            <h4 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#111827',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
            }}>
              <MessageSquare size={20} color="#667eea" />
              Interview Progress & HR Reviews
            </h4>

            {/* Technical Round - R2 */}
            <div style={{
              background: r2RoundStatus === 'drop' ? '#fef2f2' : r2RoundStatus === 'rejected' ? '#fff7ed' : '#f9fafb',
              border: r2RoundStatus === 'drop' ? '1px solid #fecaca' : r2RoundStatus === 'rejected' ? '1px solid #fed7aa' : '1px solid #e5e7eb',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '16px',
              opacity: r2RoundStatus === 'drop' || r2RoundStatus === 'rejected' ? 0.7 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    width: '32px',
                    height: '32px',
                    background: r2RoundStatus === 'drop' ? '#fee2e2' : r2RoundStatus === 'rejected' ? '#ffedd5' : '#dbeafe',
                    color: r2RoundStatus === 'drop' ? '#dc2626' : r2RoundStatus === 'rejected' ? '#ea580c' : '#1e40af',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '900',
                    border: r2RoundStatus === 'drop' ? '1px solid #fca5a5' : r2RoundStatus === 'rejected' ? '1px solid #fed7aa' : '1px solid #93c5fd',
                  }}>
                    R2
                  </span>
                  <h5 style={{ margin: 0, fontWeight: '700', color: r2RoundStatus === 'drop' ? '#dc2626' : r2RoundStatus === 'rejected' ? '#ea580c' : '#111827' }}>
                    Technical Round - R2
                    {r2RoundStatus === 'drop' && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#dc2626' }}>(Dropped)</span>}
                    {r2RoundStatus === 'rejected' && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#ea580c' }}>(Rejected)</span>}
                    {r2RoundStatus === 'completed' && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#059669' }}>✓ Completed</span>}
                    {r2RoundStatus === 'in progress' && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#2563eb' }}>● In Progress</span>}
                  </h5>
                </div>
                <div style={{ position: 'relative' }} title="Selecting an interviewer will automatically set status to 'In Progress' and save to database">
                  <select
                    value={r2Interviewer}
                    onChange={(e) => {
                      const newInterviewer = e.target.value;
                      setR2Interviewer(newInterviewer);
                      // Clear error when interviewer is selected
                      if (newInterviewer) {
                        setInterviewerError(prev => ({ ...prev, r2: false }));
                      }
                      let newStatus = r2RoundStatus;
                      if (newInterviewer && r2RoundStatus !== 'completed' && r2RoundStatus !== 'drop') {
                        newStatus = 'in progress';
                        setR2RoundStatus('in progress');
                      }
                      // Auto-save to database
                      if (newInterviewer) {
                        autoSaveInterviewer('r2', newInterviewer, newStatus);
                      }
                    }}
                    disabled={interviewerSaving.r2}
                    style={{
                      padding: '8px 16px',
                      border: interviewerError.r2 ? '2px solid #dc2626' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: interviewerSaving.r2 ? 'wait' : 'pointer',
                      outline: 'none',
                      background: interviewerError.r2 ? '#fef2f2' : (r2Interviewer ? '#dbeafe' : 'white'),
                      color: r2Interviewer ? '#1e40af' : '#374151',
                      minWidth: '160px',
                      opacity: interviewerSaving.r2 ? 0.7 : 1,
                    }}
                  >
                    <option value="">Select Interviewer</option>
                    {interviewerNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  {interviewerError.r2 && (
                    <span style={{ 
                      display: 'block', 
                      fontSize: '11px', 
                      color: '#dc2626', 
                      marginTop: '4px',
                      fontWeight: '600' 
                    }}>
                      ⚠️ Please choose interviewer name
                    </span>
                  )}
                  {interviewerSaving.r2 && (
                    <span style={{ 
                      display: 'block', 
                      fontSize: '10px', 
                      color: '#f59e0b', 
                      marginTop: '4px',
                      fontWeight: '600' 
                    }}>
                      ⏳ Saving...
                    </span>
                  )}
                  {interviewerSaved.r2 && (
                    <span style={{ 
                      display: 'block', 
                      fontSize: '10px', 
                      color: '#10b981', 
                      marginTop: '4px',
                      fontWeight: '600' 
                    }}>
                      ✓ Saved to database
                    </span>
                  )}
                </div>
              </div>
              
              {/* Rating Section for R2 */}
              <div style={{ marginBottom: '16px', background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⭐ Technical Rating (1-10)
                  </label>
                  {r2Rating > 0 && (
                    <span style={{ 
                      background: r2Rating >= 7 ? '#10b981' : r2Rating >= 4 ? '#f59e0b' : '#ef4444',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '16px',
                      fontSize: '14px',
                      fontWeight: '700'
                    }}>
                      {r2Rating >= 7 ? '🎯' : r2Rating >= 4 ? '📊' : '⚠️'} Score: {r2Rating}/10
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setR2Rating(num)}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        border: r2Rating === num ? '2px solid #667eea' : '1px solid #e5e7eb',
                        background: r2Rating === num 
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                          : num <= 3 ? '#fee2e2' : num <= 6 ? '#fef3c7' : '#d1fae5',
                        color: r2Rating === num ? 'white' : '#374151',
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
              </div>
              
              <textarea
                placeholder="Enter technical round feedback and notes..."
                value={comments.r2}
                onChange={(e) => setComments(prev => ({ ...prev, r2: e.target.value }))}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  resize: 'none',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  onClick={() => handleSaveRound('r2', true)}
                  disabled={roundSaveLoading.r2 || r2RoundStatus === 'drop'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    border: r2RoundStatus === 'drop' ? '1px solid #9ca3af' : '1px solid #ef4444',
                    borderRadius: '8px',
                    background: 'transparent',
                    color: r2RoundStatus === 'drop' ? '#9ca3af' : '#ef4444',
                    cursor: roundSaveLoading.r2 || r2RoundStatus === 'drop' ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: roundSaveLoading.r2 || r2RoundStatus === 'drop' ? 0.7 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {r2RoundStatus === 'drop' ? '✗ Dropped' : 'Drop'}
                </button>
                <button
                  onClick={() => handleSaveRound('r2', 'rejected')}
                  disabled={roundSaveLoading.r2 || r2RoundStatus === 'rejected'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    border: r2RoundStatus === 'rejected' ? '1px solid #9ca3af' : '1px solid #f97316',
                    borderRadius: '8px',
                    background: 'transparent',
                    color: r2RoundStatus === 'rejected' ? '#9ca3af' : '#f97316',
                    cursor: roundSaveLoading.r2 || r2RoundStatus === 'rejected' ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: roundSaveLoading.r2 || r2RoundStatus === 'rejected' ? 0.7 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {r2RoundStatus === 'rejected' ? '✗ Rejected' : 'Reject'}
                </button>
                <button
                  onClick={() => handleSaveRound('r2')}
                  disabled={roundSaveLoading.r2}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    border: roundSaveStatus.r2 ? '1px solid #10b981' : '1px solid #667eea',
                    borderRadius: '8px',
                    background: 'transparent',
                    color: roundSaveStatus.r2 ? '#10b981' : '#667eea',
                    cursor: roundSaveLoading.r2 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: roundSaveLoading.r2 ? 0.7 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {roundSaveLoading.r2 ? (
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : roundSaveStatus.r2 ? (
                    <Check size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  {roundSaveStatus.r2 ? '✓ Saved' : 'Save R2'}
                </button>
              </div>
            </div>

            {/* HR Round - R3 */}
            <div style={{
              background: r3RoundStatus === 'drop' ? '#fef2f2' : r3RoundStatus === 'rejected' ? '#fff7ed' : '#f9fafb',
              border: r3RoundStatus === 'drop' ? '1px solid #fecaca' : r3RoundStatus === 'rejected' ? '1px solid #fed7aa' : '1px solid #e5e7eb',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '16px',
              opacity: (r3RoundStatus === 'drop' || r3RoundStatus === 'rejected') ? 0.7 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    width: '32px',
                    height: '32px',
                    background: r3RoundStatus === 'drop' ? '#fee2e2' : r3RoundStatus === 'rejected' ? '#ffedd5' : '#d1fae5',
                    color: r3RoundStatus === 'drop' ? '#dc2626' : r3RoundStatus === 'rejected' ? '#ea580c' : '#065f46',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '900',
                    border: '1px solid #6ee7b7',
                  }}>
                    R3
                  </span>
                  <h5 style={{ margin: 0, fontWeight: '700', color: r3RoundStatus === 'drop' ? '#dc2626' : '#111827' }}>
                    Managerial Round - R3
                    {r3RoundStatus === 'drop' && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#dc2626' }}>(Dropped)</span>}
                    {r3RoundStatus === 'completed' && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#059669' }}>✓ Completed</span>}
                    {r3RoundStatus === 'in progress' && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#2563eb' }}>● In Progress</span>}
                  </h5>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ position: 'relative' }} title="Selecting an interviewer will automatically set status to 'In Progress' and save to database">
                    <select
                      value={r3Interviewer}
                      onChange={(e) => {
                        const newInterviewer = e.target.value;
                        setR3Interviewer(newInterviewer);
                        // Clear error when interviewer is selected
                        if (newInterviewer) {
                          setInterviewerError(prev => ({ ...prev, r3: false }));
                        }
                        let newStatus = r3RoundStatus;
                        if (newInterviewer && r3RoundStatus !== 'completed' && r3RoundStatus !== 'drop') {
                          newStatus = 'in progress';
                          setR3RoundStatus('in progress');
                        }
                        // Auto-save to database
                        if (newInterviewer) {
                          autoSaveInterviewer('r3', newInterviewer, newStatus);
                        }
                      }}
                      disabled={interviewerSaving.r3}
                      style={{
                        padding: '8px 16px',
                        border: interviewerError.r3 ? '2px solid #dc2626' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: interviewerSaving.r3 ? 'wait' : 'pointer',
                        outline: 'none',
                        background: interviewerError.r3 ? '#fef2f2' : (r3Interviewer ? '#d1fae5' : 'white'),
                        color: r3Interviewer ? '#065f46' : '#374151',
                        minWidth: '160px',
                        opacity: interviewerSaving.r3 ? 0.7 : 1,
                      }}
                    >
                      <option value="">Select Interviewer</option>
                      {interviewerNames.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    {interviewerError.r3 && (
                      <span style={{ 
                        display: 'block', 
                        fontSize: '11px', 
                        color: '#dc2626', 
                        marginTop: '4px',
                        fontWeight: '600' 
                      }}>
                        ⚠️ Please choose interviewer name
                      </span>
                    )}
                    {interviewerSaving.r3 && (
                      <span style={{ 
                        display: 'block', 
                        fontSize: '10px', 
                        color: '#f59e0b', 
                        marginTop: '4px',
                        fontWeight: '600' 
                      }}>
                        ⏳ Saving...
                      </span>
                    )}
                    {interviewerSaved.r3 && (
                      <span style={{ 
                        display: 'block', 
                        fontSize: '10px', 
                        color: '#10b981', 
                        marginTop: '4px',
                        fontWeight: '600' 
                      }}>
                        ✓ Saved to database
                      </span>
                    )}
                  </div>
                  <select
                    value={r3Status}
                    onChange={(e) => setR3Status(e.target.value.toUpperCase())}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      outline: 'none',
                      background: (r3Status || '').toUpperCase() === 'GO' ? '#d1fae5' : (r3Status || '').toUpperCase() === 'HOLD' ? '#fef3c7' : 'white',
                      color: (r3Status || '').toUpperCase() === 'GO' ? '#065f46' : (r3Status || '').toUpperCase() === 'HOLD' ? '#92400e' : '#374151',
                    }}
                  >
                    <option value="">Select Status</option>
                    <option value="GO">GO</option>
                    <option value="HOLD">HOLD</option>
                  </select>
                </div>
              </div>
              <textarea
                placeholder="Enter HR round feedback and notes..."
                value={comments.r3}
                onChange={(e) => setComments(prev => ({ ...prev, r3: e.target.value }))}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  resize: 'none',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  onClick={() => handleSaveRound('r3', true)}
                  disabled={roundSaveLoading.r3 || r3RoundStatus === 'drop'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    border: r3RoundStatus === 'drop' ? '1px solid #9ca3af' : '1px solid #ef4444',
                    borderRadius: '8px',
                    background: 'transparent',
                    color: r3RoundStatus === 'drop' ? '#9ca3af' : '#ef4444',
                    cursor: roundSaveLoading.r3 || r3RoundStatus === 'drop' ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: roundSaveLoading.r3 || r3RoundStatus === 'drop' ? 0.7 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {r3RoundStatus === 'drop' ? '✗ Dropped' : 'Drop'}
                </button>
                <button
                  onClick={() => handleSaveRound('r3', 'rejected')}
                  disabled={roundSaveLoading.r3 || r3RoundStatus === 'rejected'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    border: r3RoundStatus === 'rejected' ? '1px solid #9ca3af' : '1px solid #f97316',
                    borderRadius: '8px',
                    background: 'transparent',
                    color: r3RoundStatus === 'rejected' ? '#9ca3af' : '#f97316',
                    cursor: roundSaveLoading.r3 || r3RoundStatus === 'rejected' ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: roundSaveLoading.r3 || r3RoundStatus === 'rejected' ? 0.7 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {r3RoundStatus === 'rejected' ? '✗ Rejected' : 'Reject'}
                </button>
                <button
                  onClick={() => handleSaveRound('r3')}
                  disabled={roundSaveLoading.r3}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    border: roundSaveStatus.r3 ? '1px solid #10b981' : '1px solid #667eea',
                    borderRadius: '8px',
                    background: 'transparent',
                    color: roundSaveStatus.r3 ? '#10b981' : '#667eea',
                    cursor: roundSaveLoading.r3 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: roundSaveLoading.r3 ? 0.7 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {roundSaveLoading.r3 ? (
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : roundSaveStatus.r3 ? (
                    <Check size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  {roundSaveStatus.r3 ? '✓ Saved' : 'Save R3'}
                </button>
              </div>
            </div>

            {/* Final Round - R4 */}
            <div style={{
              background: r4RoundStatus === 'drop' ? '#fef2f2' : r4RoundStatus === 'rejected' ? '#fff7ed' : '#f9fafb',
              border: r4RoundStatus === 'drop' ? '1px solid #fecaca' : r4RoundStatus === 'rejected' ? '1px solid #fed7aa' : '1px solid #e5e7eb',
              borderRadius: '16px',
              padding: '20px',
              opacity: r4RoundStatus === 'drop' || r4RoundStatus === 'rejected' ? 0.7 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    width: '32px',
                    height: '32px',
                    background: r4RoundStatus === 'drop' ? '#fee2e2' : r4RoundStatus === 'rejected' ? '#ffedd5' : '#fae8ff',
                    color: r4RoundStatus === 'drop' ? '#dc2626' : r4RoundStatus === 'rejected' ? '#ea580c' : '#86198f',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '900',
                    border: r4RoundStatus === 'drop' ? '1px solid #fca5a5' : r4RoundStatus === 'rejected' ? '1px solid #fed7aa' : '1px solid #e879f9',
                  }}>
                    R4
                  </span>
                  <h5 style={{ margin: 0, fontWeight: '700', color: r4RoundStatus === 'drop' ? '#dc2626' : r4RoundStatus === 'rejected' ? '#ea580c' : '#111827' }}>
                    HR Round - R4
                    {r4RoundStatus === 'drop' && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#dc2626' }}>(Dropped)</span>}
                    {r4RoundStatus === 'rejected' && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#ea580c' }}>(Rejected)</span>}
                    {r4RoundStatus === 'completed' && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#059669' }}>✓ Completed</span>}
                    {r4RoundStatus === 'in progress' && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#2563eb' }}>● In Progress</span>}
                  </h5>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ position: 'relative' }} title="Selecting an interviewer will automatically set status to 'In Progress' and save to database">
                    <select
                      value={r4Interviewer}
                      onChange={(e) => {
                        const newInterviewer = e.target.value;
                        setR4Interviewer(newInterviewer);
                        // Clear error when interviewer is selected
                        if (newInterviewer) {
                          setInterviewerError(prev => ({ ...prev, r4: false }));
                        }
                        let newStatus = r4RoundStatus;
                        if (newInterviewer && r4RoundStatus !== 'completed' && r4RoundStatus !== 'drop') {
                          newStatus = 'in progress';
                          setR4RoundStatus('in progress');
                        }
                        // Auto-save to database
                        if (newInterviewer) {
                          autoSaveInterviewer('r4', newInterviewer, newStatus);
                        }
                      }}
                      disabled={interviewerSaving.r4}
                      style={{
                        padding: '8px 16px',
                        border: interviewerError.r4 ? '2px solid #dc2626' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: interviewerSaving.r4 ? 'wait' : 'pointer',
                        outline: 'none',
                        background: interviewerError.r4 ? '#fef2f2' : (r4Interviewer ? '#fae8ff' : 'white'),
                        color: r4Interviewer ? '#86198f' : '#374151',
                        minWidth: '160px',
                        opacity: interviewerSaving.r4 ? 0.7 : 1,
                      }}
                    >
                      <option value="">Select Interviewer</option>
                      {interviewerNames.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    {interviewerError.r4 && (
                      <span style={{ 
                        display: 'block', 
                        fontSize: '11px', 
                        color: '#dc2626', 
                        marginTop: '4px',
                        fontWeight: '600' 
                      }}>
                        ⚠️ Please choose interviewer name
                      </span>
                    )}
                    {interviewerSaving.r4 && (
                      <span style={{ 
                        display: 'block', 
                        fontSize: '10px', 
                        color: '#f59e0b', 
                        marginTop: '4px',
                        fontWeight: '600' 
                      }}>
                        ⏳ Saving...
                      </span>
                    )}
                    {interviewerSaved.r4 && (
                      <span style={{ 
                        display: 'block', 
                        fontSize: '10px', 
                        color: '#10b981', 
                        marginTop: '4px',
                        fontWeight: '600' 
                      }}>
                        ✓ Saved to database
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Rating Section for R4 */}
              <div style={{ marginBottom: '16px', background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⭐ Final Rating (1-10)
                  </label>
                  {r4Rating > 0 && (
                    <span style={{ 
                      background: r4Rating >= 7 ? '#10b981' : r4Rating >= 4 ? '#f59e0b' : '#ef4444',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '16px',
                      fontSize: '14px',
                      fontWeight: '700'
                    }}>
                      {r4Rating >= 7 ? '🎯' : r4Rating >= 4 ? '📊' : '⚠️'} Score: {r4Rating}/10
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setR4Rating(num)}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        border: r4Rating === num ? '2px solid #a855f7' : '1px solid #e5e7eb',
                        background: r4Rating === num 
                          ? 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)' 
                          : num <= 3 ? '#fee2e2' : num <= 6 ? '#fef3c7' : '#d1fae5',
                        color: r4Rating === num ? 'white' : '#374151',
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
              </div>
              
              <textarea
                placeholder="Enter final round feedback and notes..."
                value={comments.r4}
                onChange={(e) => setComments(prev => ({ ...prev, r4: e.target.value }))}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  resize: 'none',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  onClick={() => handleSaveRound('r4', true)}
                  disabled={roundSaveLoading.r4 || r4RoundStatus === 'drop'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    border: r4RoundStatus === 'drop' ? '1px solid #9ca3af' : '1px solid #ef4444',
                    borderRadius: '8px',
                    background: 'transparent',
                    color: r4RoundStatus === 'drop' ? '#9ca3af' : '#ef4444',
                    cursor: roundSaveLoading.r4 || r4RoundStatus === 'drop' ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: roundSaveLoading.r4 || r4RoundStatus === 'drop' ? 0.7 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {r4RoundStatus === 'drop' ? '✗ Dropped' : 'Drop'}
                </button>
                <button
                  onClick={() => handleSaveRound('r4', 'rejected')}
                  disabled={roundSaveLoading.r4 || r4RoundStatus === 'rejected'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    border: r4RoundStatus === 'rejected' ? '1px solid #9ca3af' : '1px solid #f97316',
                    borderRadius: '8px',
                    background: 'transparent',
                    color: r4RoundStatus === 'rejected' ? '#9ca3af' : '#f97316',
                    cursor: roundSaveLoading.r4 || r4RoundStatus === 'rejected' ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: roundSaveLoading.r4 || r4RoundStatus === 'rejected' ? 0.7 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {r4RoundStatus === 'rejected' ? '✗ Rejected' : 'Reject'}
                </button>
                <button
                  onClick={() => handleSaveRound('r4')}
                  disabled={roundSaveLoading.r4}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    border: roundSaveStatus.r4 ? '1px solid #10b981' : '1px solid #667eea',
                    borderRadius: '8px',
                    background: 'transparent',
                    color: roundSaveStatus.r4 ? '#10b981' : '#667eea',
                    cursor: roundSaveLoading.r4 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: roundSaveLoading.r4 ? 0.7 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {roundSaveLoading.r4 ? (
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : roundSaveStatus.r4 ? (
                    <Check size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  {roundSaveStatus.r4 ? '✓ Saved' : 'Save R4'}
                </button>
              </div>
            </div>
          </div>

          {/* Attachments */}
          {isAdmin && (candidate.resume || candidate.photo || candidate.aadharCard || candidate.payslip) && (
            <div>
              <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Candidate Attachments
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {candidate.resume && (
                  <a
                    href={getDownloadUrl(candidate.resume)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      color: '#374151',
                      fontWeight: '600',
                      fontSize: '14px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <FileText size={18} color="#667eea" />
                    Resume
                    <ExternalLink size={14} color="#9ca3af" />
                  </a>
                )}
                {candidate.photo && (
                  <a
                    href={getDownloadUrl(candidate.photo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      color: '#374151',
                      fontWeight: '600',
                      fontSize: '14px',
                    }}
                  >
                    <Image size={18} color="#667eea" />
                    Photo
                    <ExternalLink size={14} color="#9ca3af" />
                  </a>
                )}
                {candidate.aadharCard && (
                  <a
                    href={getDownloadUrl(candidate.aadharCard)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      color: '#374151',
                      fontWeight: '600',
                      fontSize: '14px',
                    }}
                  >
                    <CreditCard size={18} color="#667eea" />
                    Aadhar
                    <ExternalLink size={14} color="#9ca3af" />
                  </a>
                )}
                {candidate.payslip && candidate.payslip.split(',').map((link, index) => {
                  const trimmedLink = link.trim();
                  if (!trimmedLink) return null;
                  return (
                    <a
                      key={index}
                      href={getDownloadUrl(trimmedLink)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        textDecoration: 'none',
                        color: '#374151',
                        fontWeight: '600',
                        fontSize: '14px',
                      }}
                    >
                      <Receipt size={18} color="#667eea" />
                      Payslip {index + 1}
                      <ExternalLink size={14} color="#9ca3af" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

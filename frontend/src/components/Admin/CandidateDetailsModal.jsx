import React, { useState, useEffect } from 'react';
import { X, Edit2, Save, Loader2, MessageSquare, FileText, Image, CreditCard, Receipt, ExternalLink, Check, Lock, Plus, RefreshCw } from 'lucide-react';
import { CandidatePhoto, getGoogleDriveImageUrl } from './CandidatePhoto';
import { usePermissions } from '../../hooks/usePermissions';
import { quizResultAPI, advancedAPI } from '../../utils/api';

// SECTION_CONFIG removed — R1 sections are now dynamic from sectionWiseMarks

const INTERVIEWER_NAMES = [
  'Rahul Sharma',
  'Priya Patel',
  'Amit Kumar',
  'Sneha Gupta',
  'Vikram Singh',
  'Anjali Verma',
  'Rajesh Nair'
];

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export function CandidateDetailsModal({ candidate, open, onClose, userRole = 'Admin', onRefresh }) {
  const isAdmin = userRole === 'Admin';
  const { can, isSuperAdmin, user: loggedInUser } = usePermissions();

  // Round-wise edit permissions: super admin and level-0 can edit all
  const canEditR2 = isSuperAdmin || can('round_r2', 'edit');
  const canEditR3 = isSuperAdmin || can('round_r3', 'edit');
  const canEditR4 = isSuperAdmin || can('round_r4', 'edit');
  const loggedInUserName = loggedInUser?.name || '';

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

  // Embedded personal R2 scorecard state
  const [showR2Scorecard, setShowR2Scorecard] = useState(false);
  const [showR2TemplateBuilder, setShowR2TemplateBuilder] = useState(false);
  const [r2ScorecardLoading, setR2ScorecardLoading] = useState(false);
  const [r2ScorecardSaving, setR2ScorecardSaving] = useState(false);
  const [r2ScorecardTemplates, setR2ScorecardTemplates] = useState([]);
  const [selectedR2TemplateId, setSelectedR2TemplateId] = useState('');
  const [r2ScoreInputs, setR2ScoreInputs] = useState({});
  const [lastSavedR2ScoreSignature, setLastSavedR2ScoreSignature] = useState('');
  const [newR2Template, setNewR2Template] = useState({
    name: '',
    criteria: [{ key: '', label: '', weight: 1, maxScore: 10 }],
  });

  const selectedR2Template =
    r2ScorecardTemplates.find((template) => String(template._id) === String(selectedR2TemplateId)) || null;

  const fetchR2Scorecards = async () => {
    if (!canEditR2) return;

    setR2ScorecardLoading(true);
    try {
      const params = {
        round: 'R2',
        activeOnly: true,
        mineOnly: true,
      };

      if (candidate?.driveId) {
        params.driveId = candidate.driveId;
      }

      const response = await advancedAPI.listScorecardTemplates(params);
      const templates = Array.isArray(response?.data) ? response.data : [];
      setR2ScorecardTemplates(templates);

      if (!selectedR2TemplateId && templates.length > 0) {
        setSelectedR2TemplateId(templates[0]._id);
      }
      if (selectedR2TemplateId) {
        const exists = templates.some((template) => String(template._id) === String(selectedR2TemplateId));
        if (!exists) {
          setSelectedR2TemplateId(templates[0]?._id || '');
        }
      }
    } catch (error) {
      console.error('Error fetching personal R2 scorecards:', error);
      setR2ScorecardTemplates([]);
    } finally {
      setR2ScorecardLoading(false);
    }
  };

  const addR2Criterion = () => {
    setNewR2Template((prev) => ({
      ...prev,
      criteria: [...prev.criteria, { key: '', label: '', weight: 1, maxScore: 10 }],
    }));
  };

  const updateR2Criterion = (index, field, value) => {
    setNewR2Template((prev) => {
      const criteria = [...prev.criteria];
      criteria[index] = { ...criteria[index], [field]: value };
      return { ...prev, criteria };
    });
  };

  const removeR2Criterion = (index) => {
    setNewR2Template((prev) => {
      if (prev.criteria.length <= 1) return prev;
      return {
        ...prev,
        criteria: prev.criteria.filter((_, idx) => idx !== index),
      };
    });
  };

  const createPersonalR2Template = async () => {
    const name = String(newR2Template.name || '').trim();
    const criteria = (newR2Template.criteria || [])
      .map((item) => ({
        key: String(item.key || '').trim(),
        label: String(item.label || '').trim(),
        weight: Number(item.weight || 0),
        maxScore: Number(item.maxScore || 0),
      }))
      .filter((item) => item.key && item.label && item.weight > 0 && item.maxScore > 0);

    if (!name) {
      alert('Template name is required.');
      return;
    }
    if (criteria.length === 0) {
      alert('Add at least one valid criterion.');
      return;
    }

    setR2ScorecardSaving(true);
    try {
      await advancedAPI.createScorecardTemplate({
        name,
        roleName: 'R2 Personal',
        round: 'R2',
        driveId: candidate?.driveId || null,
        criteria,
      });

      setNewR2Template({
        name: '',
        criteria: [{ key: '', label: '', weight: 1, maxScore: 10 }],
      });
      setShowR2TemplateBuilder(false);
      await fetchR2Scorecards();
    } catch (error) {
      console.error('Error creating personal R2 scorecard template:', error);
      alert(error?.message || 'Failed to create template.');
    } finally {
      setR2ScorecardSaving(false);
    }
  };

  const buildR2ScorecardDraft = () => {
    if (!selectedR2Template) return null;

    const criteria = Array.isArray(selectedR2Template.criteria) ? selectedR2Template.criteria : [];
    const scores = {};
    let hasAnyInput = false;

    for (const criterion of criteria) {
      const raw = r2ScoreInputs[criterion.key];
      if (raw !== '' && raw !== undefined && raw !== null) {
        hasAnyInput = true;
      }
      scores[criterion.key] = Number(raw || 0);
    }

    return {
      scores,
      hasAnyInput,
      signature: JSON.stringify({
        templateId: String(selectedR2Template._id || ''),
        scores,
      }),
    };
  };

  const getR2ProjectedScore = () => {
    if (!selectedR2Template) return 0;

    const criteria = Array.isArray(selectedR2Template.criteria) ? selectedR2Template.criteria : [];
    let weighted = 0;
    let totalWeight = 0;

    for (const criterion of criteria) {
      const raw = r2ScoreInputs[criterion.key];
      const numeric = raw === '' || raw === undefined || raw === null ? 0 : Number(raw);
      const maxScore = Number(criterion.maxScore || 10) || 10;
      const weight = Number(criterion.weight || 0);
      const safeScore = Math.min(Math.max(numeric, 0), maxScore);

      weighted += (safeScore / maxScore) * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Number(((weighted / totalWeight) * 100).toFixed(2)) : 0;
  };

  const getRoundPayload = (roundKey, nextStatus) => ({
    R2: [{
      rating: String(r2Rating || ''),
      comments: comments.r2 || '',
      interviewer: r2Interviewer || '',
      status: roundKey === 'r2' && nextStatus !== undefined ? nextStatus : (r2RoundStatus || ''),
    }],
    R3: [{
      managerialStatus: r3Status || '',
      comments: comments.r3 || '',
      interviewer: r3Interviewer || '',
      status: roundKey === 'r3' && nextStatus !== undefined ? nextStatus : (r3RoundStatus || ''),
    }],
    R4: [{
      rating: String(r4Rating || ''),
      comments: comments.r4 || '',
      interviewer: r4Interviewer || '',
      status: roundKey === 'r4' && nextStatus !== undefined ? nextStatus : (r4RoundStatus || ''),
    }],
    totalMarks: Number(candidate.quiz?.totalMarks ?? displayTotal ?? 0),
  });

  const applyQuizDataToState = (quizData) => {
    if (!quizData) return;

    const quizDbEmail = quizData.email || quizData.Email || '';
    if (quizDbEmail) {
      setQuizEmail(quizDbEmail);
    }

    if (quizData.sectionWiseMarks?.length) {
      const nextMarks = {};
      quizData.sectionWiseMarks.forEach((section) => {
        const key = (section.sectionName || '').toLowerCase();
        if (key.includes('logical')) nextMarks.logical = Number(section.marks) || 0;
        if (key.includes('database')) nextMarks.database = Number(section.marks) || 0;
        if (key.includes('communication')) nextMarks.communication = Number(section.marks) || 0;
        if (key.includes('rpa')) nextMarks.rpa = Number(section.marks) || 0;
        if (key.includes('genai')) nextMarks.genAi = Number(section.marks) || 0;
        if (key.includes('python')) nextMarks.python = Number(section.marks) || 0;
      });
      setEditedMarks((prev) => ({ ...prev, ...nextMarks }));
    }

    if (quizData.R2 && Array.isArray(quizData.R2) && quizData.R2[0]) {
      setR2Rating(parseInt(quizData.R2[0].rating) || 0);
      setComments(prev => ({ ...prev, r2: quizData.R2[0].comments || '' }));
      const r2IntFromApi = quizData.R2[0].interviewer || '';
      setR2Interviewer(r2IntFromApi || (canEditR2 && loggedInUserName ? loggedInUserName : ''));
      setR2RoundStatus(quizData.R2[0].status || '');
    } else if (canEditR2 && loggedInUserName) {
      setR2Interviewer(loggedInUserName);
    }

    if (quizData.R3 && Array.isArray(quizData.R3) && quizData.R3[0]) {
      const r3ManagerialStatus = quizData.R3[0].managerialStatus || quizData.R3[0]['Managerial status'] || quizData.R3[0]['managerial status'] || quizData.R3[0].rating || '';
      setR3Status(r3ManagerialStatus.toUpperCase().trim());
      setComments(prev => ({ ...prev, r3: quizData.R3[0].comments || '' }));
      const r3IntFromApi = quizData.R3[0].interviewer || '';
      setR3Interviewer(r3IntFromApi || (canEditR3 && loggedInUserName ? loggedInUserName : ''));
      setR3RoundStatus(quizData.R3[0].status || '');
    } else if (canEditR3 && loggedInUserName) {
      setR3Interviewer(loggedInUserName);
    }

    if (quizData.R4 && Array.isArray(quizData.R4) && quizData.R4[0]) {
      setR4Rating(parseInt(quizData.R4[0].rating) || 0);
      setR4Status(quizData.R4[0].rating || '');
      setComments(prev => ({ ...prev, r4: quizData.R4[0].comments || '' }));
      const r4IntFromApi = quizData.R4[0].interviewer || '';
      setR4Interviewer(r4IntFromApi || (canEditR4 && loggedInUserName ? loggedInUserName : ''));
      setR4RoundStatus(quizData.R4[0].status || '');
    } else if (canEditR4 && loggedInUserName) {
      setR4Interviewer(loggedInUserName);
    }
  };

  // Auto-save interviewer to database
  const autoSaveInterviewer = async (roundKey, interviewerName, newStatus) => {
    // Use quizEmail if available, otherwise fall back to candidate.email
    const emailForUpdate = quizEmail || candidate?.email;
    if (!emailForUpdate) return;
    
    setInterviewerSaving(prev => ({ ...prev, [roundKey]: true }));
    setInterviewerSaved(prev => ({ ...prev, [roundKey]: false }));
    
    try {
      const response = await quizResultAPI.updateQuizResultByEmail(emailForUpdate, {
        ...getRoundPayload(roundKey, newStatus),
        ...(roundKey === 'r2' ? { R2: [{ ...getRoundPayload(roundKey, newStatus).R2[0], interviewer: interviewerName }] } : {}),
        ...(roundKey === 'r3' ? { R3: [{ ...getRoundPayload(roundKey, newStatus).R3[0], interviewer: interviewerName }] } : {}),
        ...(roundKey === 'r4' ? { R4: [{ ...getRoundPayload(roundKey, newStatus).R4[0], interviewer: interviewerName }] } : {}),
      });

      if (!response?.success) throw new Error('Failed to auto-save interviewer');
      
      setInterviewerSaved(prev => ({ ...prev, [roundKey]: true }));
      setTimeout(() => {
        setInterviewerSaved(prev => ({ ...prev, [roundKey]: false }));
      }, 2000);
    } catch (error) {
      console.error('Error auto-saving interviewer:', error);
    } finally {
      setInterviewerSaving(prev => ({ ...prev, [roundKey]: false }));
    }
  };

  // Fetch interviewer names from API
  const fetchInterviewerNames = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/interviewers`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.data)) {
          setInterviewerNames(data.data);
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
      const response = await quizResultAPI.getQuizResultByEmail(email.toLowerCase());
      if (response?.success && response.data) {
        applyQuizDataToState(response.data);
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
      setShowR2Scorecard(false);
      setShowR2TemplateBuilder(false);
      setR2ScorecardTemplates([]);
      setSelectedR2TemplateId('');
      setR2ScoreInputs({});
      setLastSavedR2ScoreSignature('');
      setNewR2Template({
        name: '',
        criteria: [{ key: '', label: '', weight: 1, maxScore: 10 }],
      });
      
      // Fetch interviewer names from API
      fetchInterviewerNames();
      fetchR2Scorecards();
      
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

  useEffect(() => {
    if (!selectedR2Template) {
      setR2ScoreInputs({});
      return;
    }

    const initial = {};
    (selectedR2Template.criteria || []).forEach((criterion) => {
      initial[criterion.key] = '';
    });
    setR2ScoreInputs(initial);
  }, [selectedR2TemplateId, r2ScorecardTemplates]);

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
      
      const nextSectionWiseMarks = (candidate.quiz?.sectionWiseMarks || []).map((section) => {
        const sectionName = section.sectionName || '';
        const key = sectionName.toLowerCase();
        let marks = section.marks;

        if (key.includes('logical')) marks = Number(editedMarks.logical) || 0;
        if (key.includes('database')) marks = Number(editedMarks.database) || 0;
        if (key.includes('communication')) marks = Number(editedMarks.communication) || 0;
        if (key.includes('rpa')) marks = Number(editedMarks.rpa) || 0;
        if (key.includes('genai')) marks = Number(editedMarks.genAi) || 0;
        if (key.includes('python')) marks = Number(editedMarks.python) || 0;

        return { ...section, marks, correctAnswers: marks };
      });

      const response = await quizResultAPI.updateQuizResultByEmail(emailForUpdate, {
        sectionWiseMarks: nextSectionWiseMarks,
        totalMarks: calculatedTotal,
      });

      if (!response?.success) throw new Error('Failed to update marks');

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
      let nextR2Comments = comments.r2 || '';

      // Save scorecard together with Save R2 (no separate apply button).
      if (roundKey === 'r2' && selectedR2Template) {
        const scorecardDraft = buildR2ScorecardDraft();
        if (scorecardDraft?.hasAnyInput && scorecardDraft.signature !== lastSavedR2ScoreSignature) {
          setR2ScorecardSaving(true);
          const scorecardResponse = await advancedAPI.evaluateScorecard({
            templateId: selectedR2Template._id,
            candidateEmail: emailForUpdate,
            interviewer: r2Interviewer || loggedInUserName || '',
            notes: '',
            round: 'R2',
            scores: scorecardDraft.scores,
          });

          if (!scorecardResponse?.success) {
            throw new Error('Failed to save R2 scorecard.');
          }

          const scoreSummary = String(scorecardResponse?.data?.roundComment || '').trim();
          if (scoreSummary) {
            nextR2Comments = nextR2Comments ? `${nextR2Comments}\n${scoreSummary}` : scoreSummary;
            setComments((prev) => ({ ...prev, r2: nextR2Comments }));
          }

          setLastSavedR2ScoreSignature(scorecardDraft.signature);
        }
      }

      const payload = getRoundPayload(roundKey, newStatus);
      if (roundKey === 'r2') {
        payload.R2 = [{ ...payload.R2[0], comments: nextR2Comments }];
      }

      const response = await quizResultAPI.updateQuizResultByEmail(emailForUpdate, payload);

      if (!response?.success) throw new Error('Failed to save round data');

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
      setR2ScorecardSaving(false);
      setRoundSaveLoading(prev => ({ ...prev, [roundKey]: false }));
    }
  };

  // Dynamic R1 section scores from sectionWiseMarks
  const sectionWiseMarks = candidate.quiz?.sectionWiseMarks || [];

  const dynamicTotalScore = sectionWiseMarks.reduce((sum, s) => sum + (Number(s.marks) || 0), 0);
  const dynamicMaxScore = sectionWiseMarks.reduce((sum, s) => sum + (Number(s.totalQuestions) || 0), 0);

  // Fallback: use Final Score from quiz-segregate API or calculated total
  const apiFinalScore = parseInt(
    candidate.quiz?.['Final Score'] ||
    candidate.quiz?.['final score'] ||
    candidate.quiz?.finalScore ||
    candidate.quiz?.FinalScore ||
    0
  );

  const displayTotal = dynamicTotalScore > 0 ? dynamicTotalScore : apiFinalScore;
  const displayMaxScore = dynamicMaxScore > 0 ? dynamicMaxScore : 30;
  const r2ScorecardDraft = buildR2ScorecardDraft();
  const r2ScorecardDirty = Boolean(
    r2ScorecardDraft?.hasAnyInput &&
    r2ScorecardDraft.signature !== lastSavedR2ScoreSignature
  );
  const r2ProjectedScore = getR2ProjectedScore();

  const getDownloadUrl = (url) => {
    if (!url) return '#';
    // If it's already a full URL
    if (/^https?:\/\//i.test(url)) {
      if (url.includes('drive.google.com')) {
        const match = url.match(/(?:\/file\/d\/|id=)([a-zA-Z0-9_-]+)/);
        if (match) {
          return `https://drive.google.com/uc?export=download&id=${match[1]}`;
        }
      }
      return url;
    }
    // Raw Google Drive file ID
    return `https://drive.google.com/file/d/${url}/view`;
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

            {sectionWiseMarks.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(sectionWiseMarks.length, 3)}, 1fr)`, gap: '16px' }}>
                {sectionWiseMarks.map((section, idx) => {
                  const marks = Number(section.marks) || 0;
                  const total = Number(section.totalQuestions) || 0;
                  const pct = total > 0 ? (marks / total) * 100 : 0;
                  return (
                    <div key={section.sectionName || idx} style={{
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
                          {section.sectionName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '32px', fontWeight: '900', color: '#111827' }}>
                            {marks}
                          </span>
                          <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '600', marginBottom: '-8px' }}>/ {total}</span>
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
                            width: `${pct}%`,
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', background: '#f9fafb', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                No section-wise score data available for this candidate.
              </div>
            )}

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
                    <span style={{ fontSize: '20px', color: '#6b7280', fontWeight: '600', marginBottom: '8px' }}>/ {displayMaxScore}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '36px', fontWeight: '900', color: '#667eea' }}>
                    {displayMaxScore > 0 ? Math.round((displayTotal / displayMaxScore) * 100) : 0}%
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
                  width: `${displayMaxScore > 0 ? (displayTotal / displayMaxScore) * 100 : 0}%`,
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
                    {!canEditR2 && <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: '600', color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Lock size={10} /> Read Only</span>}
                  </h5>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  {canEditR2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = !showR2Scorecard;
                        setShowR2Scorecard(next);
                        if (next) {
                          fetchR2Scorecards();
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        border: '1px solid #6366f1',
                        borderRadius: '8px',
                        background: showR2Scorecard ? '#eef2ff' : 'white',
                        color: '#4338ca',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      <FileText size={14} />
                      {showR2Scorecard ? 'Hide Scorecard' : 'R2 Scorecard'}
                    </button>
                  )}

                  <div style={{ position: 'relative' }} title={canEditR2 ? "Selecting an interviewer will automatically set status to 'In Progress' and save to database" : "You don't have permission to edit R2"}>
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
                      disabled={!canEditR2 || interviewerSaving.r2}
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
                      {(loggedInUserName && !interviewerNames.includes(loggedInUserName)
                        ? [loggedInUserName, ...interviewerNames]
                        : interviewerNames
                      ).map((name) => (
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
                      onClick={() => canEditR2 && setR2Rating(num)}
                      disabled={!canEditR2}
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
                        cursor: canEditR2 ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                        opacity: !canEditR2 ? 0.6 : 1,
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {canEditR2 && showR2Scorecard && (
                <div style={{ marginBottom: '16px', background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)', borderRadius: '14px', padding: '16px', border: '1px solid #c7d2fe', boxShadow: '0 8px 22px rgba(79,70,229,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#3730a3' }}>Personal R2 Reusable Scorecard</p>
                    <button
                      type="button"
                      onClick={fetchR2Scorecards}
                      disabled={r2ScorecardLoading}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        border: '1px solid #a5b4fc',
                        borderRadius: '6px',
                        background: 'white',
                        color: '#4338ca',
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '6px 10px',
                        cursor: r2ScorecardLoading ? 'not-allowed' : 'pointer',
                        opacity: r2ScorecardLoading ? 0.7 : 1,
                      }}
                    >
                      {r2ScorecardLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={12} />}
                      Refresh
                    </button>
                  </div>
                  <p style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: '600', color: '#4338ca' }}>
                    Scorecard values are saved when you click <b>Save R2</b>.
                  </p>

                  <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: '1fr auto' }}>
                    <select
                      value={selectedR2TemplateId}
                      onChange={(e) => setSelectedR2TemplateId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #c7d2fe',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#1f2937',
                        background: 'white',
                      }}
                    >
                      <option value="">Select your R2 template</option>
                      {r2ScorecardTemplates.map((template) => (
                        <option key={template._id} value={template._id}>
                          {template.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setShowR2TemplateBuilder((prev) => !prev)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        border: '1px solid #6366f1',
                        borderRadius: '8px',
                        background: showR2TemplateBuilder ? '#6366f1' : 'white',
                        color: showR2TemplateBuilder ? 'white' : '#4f46e5',
                        fontSize: '12px',
                        fontWeight: '700',
                        padding: '8px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={12} /> {showR2TemplateBuilder ? 'Close Builder' : 'New Template'}
                    </button>
                  </div>

                  {showR2TemplateBuilder && (
                    <div style={{ marginTop: '10px', background: 'white', borderRadius: '10px', border: '1px solid #c7d2fe', padding: '12px' }}>
                      <input
                        value={newR2Template.name}
                        onChange={(e) => setNewR2Template((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Template name"
                        style={{
                          width: '100%',
                          marginBottom: '8px',
                          padding: '8px 10px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />

                      {(newR2Template.criteria || []).map((criterion, index) => (
                        <div key={`new-r2-criterion-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px 90px 34px', gap: '6px', marginBottom: '6px' }}>
                          <input
                            value={criterion.key}
                            onChange={(e) => updateR2Criterion(index, 'key', e.target.value)}
                            placeholder="key"
                            style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '11px' }}
                          />
                          <input
                            value={criterion.label}
                            onChange={(e) => updateR2Criterion(index, 'label', e.target.value)}
                            placeholder="label"
                            style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '11px' }}
                          />
                          <input
                            type="number"
                            min={1}
                            value={criterion.weight}
                            onChange={(e) => updateR2Criterion(index, 'weight', e.target.value)}
                            placeholder="weight"
                            style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '11px' }}
                          />
                          <input
                            type="number"
                            min={1}
                            value={criterion.maxScore}
                            onChange={(e) => updateR2Criterion(index, 'maxScore', e.target.value)}
                            placeholder="max"
                            style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '11px' }}
                          />
                          <button
                            type="button"
                            onClick={() => removeR2Criterion(index)}
                            style={{ border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', color: '#ef4444', fontWeight: '700', cursor: 'pointer' }}
                          >
                            ×
                          </button>
                        </div>
                      ))}

                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={addR2Criterion}
                          style={{ border: '1px solid #c7d2fe', borderRadius: '6px', background: '#eef2ff', color: '#4338ca', fontSize: '11px', fontWeight: '700', padding: '6px 10px', cursor: 'pointer' }}
                        >
                          Add Criterion
                        </button>
                        <button
                          type="button"
                          onClick={createPersonalR2Template}
                          disabled={r2ScorecardSaving}
                          style={{ border: '1px solid #4f46e5', borderRadius: '6px', background: '#4f46e5', color: 'white', fontSize: '11px', fontWeight: '700', padding: '6px 10px', cursor: r2ScorecardSaving ? 'not-allowed' : 'pointer', opacity: r2ScorecardSaving ? 0.7 : 1 }}
                        >
                          {r2ScorecardSaving ? 'Saving...' : 'Save Personal Template'}
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedR2Template && (
                    <div style={{ marginTop: '12px', background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)', borderRadius: '12px', border: '1px solid #c7d2fe', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#312e81' }}>
                          Evaluate with: {selectedR2Template.name}
                        </p>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#0f766e', background: '#ecfeff', border: '1px solid #99f6e4', borderRadius: '999px', padding: '4px 10px' }}>
                          Projected: {r2ProjectedScore}%
                        </span>
                      </div>

                      {(selectedR2Template.criteria || []).map((criterion) => (
                        <div key={`score-input-${criterion.key}`} style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: '10px', alignItems: 'center', marginBottom: '8px', padding: '8px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <div>
                            <label style={{ fontSize: '12px', color: '#1f2937', fontWeight: '600' }}>
                              {criterion.label}
                            </label>
                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                              max {criterion.maxScore} · weight {criterion.weight}
                            </div>
                          </div>
                          <input
                            type="number"
                            min={0}
                            max={criterion.maxScore}
                            value={r2ScoreInputs[criterion.key] ?? ''}
                            onChange={(e) =>
                              setR2ScoreInputs((prev) => ({
                                ...prev,
                                [criterion.key]: e.target.value,
                              }))
                            }
                            style={{ padding: '7px 8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', fontWeight: '600', textAlign: 'center', background: 'white' }}
                          />
                        </div>
                      ))}

                      <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '8px', background: r2ScorecardDirty ? '#ecfeff' : '#f8fafc', border: r2ScorecardDirty ? '1px solid #99f6e4' : '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '11px', color: r2ScorecardDirty ? '#0f766e' : '#475569', fontWeight: '700' }}>
                          {r2ScorecardDirty
                            ? 'Pending scorecard changes. Click Save R2 to persist scorecard + comments together.'
                            : 'Scorecard is synced. Update values anytime and click Save R2.'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <textarea
                placeholder={canEditR2 ? "Enter technical round feedback and notes..." : "No edit permission for this round"}
                value={comments.r2}
                onChange={(e) => canEditR2 && setComments(prev => ({ ...prev, r2: e.target.value }))}
                readOnly={!canEditR2}
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
                  background: !canEditR2 ? '#f9fafb' : 'white',
                  cursor: !canEditR2 ? 'not-allowed' : 'text',
                }}
              />
              {canEditR2 && (
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
                  {roundSaveStatus.r2 ? '✓ Saved' : (r2ScorecardDirty ? 'Save R2 + Scorecard' : 'Save R2')}
                </button>
              </div>
              )}
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
                    {!canEditR3 && <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: '600', color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Lock size={10} /> Read Only</span>}
                  </h5>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ position: 'relative' }} title={canEditR3 ? "Selecting an interviewer will automatically set status to 'In Progress' and save to database" : "You don't have permission to edit R3"}>
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
                      disabled={!canEditR3 || interviewerSaving.r3}
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
                      {(loggedInUserName && !interviewerNames.includes(loggedInUserName)
                        ? [loggedInUserName, ...interviewerNames]
                        : interviewerNames
                      ).map((name) => (
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
                    onChange={(e) => canEditR3 && setR3Status(e.target.value.toUpperCase())}
                    disabled={!canEditR3}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: canEditR3 ? 'pointer' : 'not-allowed',
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
                placeholder={canEditR3 ? "Enter HR round feedback and notes..." : "No edit permission for this round"}
                value={comments.r3}
                onChange={(e) => canEditR3 && setComments(prev => ({ ...prev, r3: e.target.value }))}
                readOnly={!canEditR3}
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
                  background: !canEditR3 ? '#f9fafb' : 'white',
                  cursor: !canEditR3 ? 'not-allowed' : 'text',
                }}
              />
              {canEditR3 && (
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
              )}
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
                    {!canEditR4 && <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: '600', color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Lock size={10} /> Read Only</span>}
                  </h5>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ position: 'relative' }} title={canEditR4 ? "Selecting an interviewer will automatically set status to 'In Progress' and save to database" : "You don't have permission to edit R4"}>
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
                      disabled={!canEditR4 || interviewerSaving.r4}
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
                      {(loggedInUserName && !interviewerNames.includes(loggedInUserName)
                        ? [loggedInUserName, ...interviewerNames]
                        : interviewerNames
                      ).map((name) => (
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
                      onClick={() => canEditR4 && setR4Rating(num)}
                      disabled={!canEditR4}
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
                        cursor: canEditR4 ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                        opacity: !canEditR4 ? 0.6 : 1,
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
              
              <textarea
                placeholder={canEditR4 ? "Enter final round feedback and notes..." : "View only – no edit permission"}
                value={comments.r4}
                readOnly={!canEditR4}
                onChange={(e) => canEditR4 && setComments(prev => ({ ...prev, r4: e.target.value }))}
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
                  background: !canEditR4 ? '#f3f4f6' : 'white',
                  cursor: !canEditR4 ? 'not-allowed' : 'text',
                }}
              />
              {canEditR4 && (<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
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
              </div>)}
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

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronRight, ChevronLeft, Eye, Activity, Award, Filter, ArrowUpDown, ArrowUp, ArrowDown, X, Search, Info, FileText } from 'lucide-react';
import { StatusBadge, RoundStepper } from './StatusBadge';
import { CandidatePhoto } from './CandidatePhoto';
import { CandidateDetailsModal } from './CandidateDetailsModal';

export function CandidateTable({
  candidates: initialCandidates,
  getAttendanceStatus,
  getDownloadUrl,
  userRole = 'Admin',
  onRefresh,
}) {
  // Role-based access control - Admin sees everything
  const isAdmin = userRole === 'Admin';
  
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [modalCandidate, setModalCandidate] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [infoDropdown, setInfoDropdown] = useState(null); // For Co-Admin info button dropdown
  
  // Filter dropdown state
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [filterDropdownPos, setFilterDropdownPos] = useState({ top: 0, right: 0 });
  const filterDropdownRef = useRef(null);
  const filterButtonRef = useRef(null);
  
  // Search/filter state
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roundFilter, setRoundFilter] = useState('all'); // 'all', 'R1', 'R2', 'R3', 'R4'
  const [roundStatusFilter, setRoundStatusFilter] = useState('all'); // 'all', 'completed', 'in-progress', 'dropped', 'rejected'
  const [r3StatusFilter, setR3StatusFilter] = useState('all'); // 'all', 'GO', 'HOLD' - R3 specific filter
  
  // Sort state
  const [sortField, setSortField] = useState('newest'); // newest, name, email, score, status
  const [sortDirection, setSortDirection] = useState('desc'); // asc, desc

  // Pagination state
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target) &&
          filterButtonRef.current && !filterButtonRef.current.contains(event.target)) {
        setFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle filter dropdown and calculate position
  const toggleFilterDropdown = () => {
    if (!filterDropdownOpen && filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect();
      setFilterDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setFilterDropdownOpen(!filterDropdownOpen);
  };

  // De-duplicate candidates based on uid to prevent duplicate entries
  const uniqueCandidates = useMemo(() => {
    const seen = new Set();
    return initialCandidates.filter(c => {
      const key =  c.email ;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [initialCandidates]);

  // Helper function to get round status for filtering
  const getRoundStatus = (candidate, round) => {
    const r1Score = parseInt(candidate.quiz?.['Final Score']) || parseInt(candidate.score) || 0;
    const r1IsDropped = r1Score < 13;
    
    if (round === 'R1') {
      if (r1IsDropped && r1Score > 0) return 'dropped';
      if (r1Score >= 13) return 'completed';
      if (r1Score > 0 && r1Score < 13) return 'dropped';
      return 'not-started';
    }
    
    // For R2, R3, R4 - data is stored in candidate.quiz.R2, candidate.quiz.R3, candidate.quiz.R4
    // The structure is an array like [{ rating: '', comments: '', interviewer: '', status: '' }]
    const quizRoundData = candidate.quiz?.[round];
    
    // Handle array format (most common)
    if (Array.isArray(quizRoundData) && quizRoundData.length > 0 && quizRoundData[0]) {
      const roundInfo = quizRoundData[0];
      const status = (roundInfo.status || '').toLowerCase();
      const hasInterviewer = roundInfo.interviewer && roundInfo.interviewer.trim() !== '';
      const hasRating = roundInfo.rating && roundInfo.rating.toString().trim() !== '';
      const hasComments = roundInfo.comments && roundInfo.comments.trim() !== '';
      
      if (status === 'drop' || status === 'dropped') return 'dropped';
      if (status === 'rejected') return 'rejected';
      if (status === 'completed') return 'completed';
      if (status === 'in progress' || status === 'in-progress') return 'in-progress';
      // If has interviewer or rating but no explicit status, consider in-progress
      if (hasInterviewer || hasRating || hasComments) return 'in-progress';
      return 'not-started';
    }
    
    // Handle object format (fallback)
    if (quizRoundData && typeof quizRoundData === 'object' && !Array.isArray(quizRoundData)) {
      const status = (quizRoundData.status || '').toLowerCase();
      const hasInterviewer = quizRoundData.interviewer && quizRoundData.interviewer.trim() !== '';
      const hasRating = quizRoundData.rating && quizRoundData.rating.toString().trim() !== '';
      
      if (status === 'drop' || status === 'dropped') return 'dropped';
      if (status === 'rejected') return 'rejected';
      if (status === 'completed') return 'completed';
      if (status === 'in progress' || status === 'in-progress') return 'in-progress';
      if (hasInterviewer || hasRating) return 'in-progress';
      return 'not-started';
    }
    
    return 'not-started';
  };

  // Filter candidates based on search and status filter
  const filteredCandidates = useMemo(() => {
    return uniqueCandidates.filter(c => {
      // Search filter - searches across id, name, email
      const searchLower = searchText.toLowerCase();
      const matchesSearch = !searchText || 
        (c.uid || c.username || '').toLowerCase().includes(searchLower) ||
        (c.name || '').toLowerCase().includes(searchLower) ||
        (c.email || '').toLowerCase().includes(searchLower);
      
      // Status filter (attendance)
      const status = getAttendanceStatus(c);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      
      // Round filter
      let matchesRound = true;
      if (roundFilter !== 'all') {
        const roundStatus = getRoundStatus(c, roundFilter);
        // If round status filter is also set, combine them
        if (roundStatusFilter !== 'all') {
          matchesRound = roundStatus === roundStatusFilter;
        } else {
          // Just show candidates who have any activity in this round
          matchesRound = roundStatus !== 'not-started' || roundFilter === 'R1';
        }
        
        // R3 specific status filter (GO/HOLD) - uses 'Managerial status' field
        if (roundFilter === 'R3' && r3StatusFilter !== 'all') {
          const r3Data = c.quiz?.R3;
          const r3ManagerialStatus = r3Data && Array.isArray(r3Data) && r3Data[0] 
            ? (r3Data[0]['Managerial status'] || r3Data[0]['managerial status'] || r3Data[0].rating || '').toUpperCase().trim() 
            : '';
          matchesRound = matchesRound && r3ManagerialStatus === r3StatusFilter.toUpperCase();
        }
      } else if (roundStatusFilter !== 'all') {
        // Only round status filter is set - check if ANY round matches
        matchesRound = ['R1', 'R2', 'R3', 'R4'].some(r => getRoundStatus(c, r) === roundStatusFilter);
      }
      
      return matchesSearch && matchesStatus && matchesRound;
    });
  }, [initialCandidates, searchText, statusFilter, roundFilter, roundStatusFilter, r3StatusFilter, getAttendanceStatus]);

  // Sort candidates based on sortField and sortDirection
  const sortedCandidates = useMemo(() => {
    const sorted = [...filteredCandidates];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'newest':
          const timeA = a.timestamp || a.registrationTime || a.createdAt || '';
          const timeB = b.timestamp || b.registrationTime || b.createdAt || '';
          if (timeA && timeB) {
            comparison = new Date(timeB) - new Date(timeA);
          } else {
            comparison = -1;
          }
          break;
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'email':
          comparison = (a.email || '').localeCompare(b.email || '');
          break;
        case 'score':
          const scoreA = parseInt(a.quiz?.['Final Score']) || parseInt(a.score) || 0;
          const scoreB = parseInt(b.quiz?.['Final Score']) || parseInt(b.score) || 0;
          comparison = scoreB - scoreA;
          break;
        case 'status':
          comparison = getAttendanceStatus(a).localeCompare(getAttendanceStatus(b));
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === 'asc' ? -comparison : comparison;
    });
    
    return sorted;
  }, [filteredCandidates, sortField, sortDirection, getAttendanceStatus]);

  // Paginate candidates
  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return sortedCandidates.slice(start, start + entriesPerPage);
  }, [sortedCandidates, currentPage, entriesPerPage]);

  const totalPages = Math.ceil(sortedCandidates.length / entriesPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, statusFilter, roundFilter, roundStatusFilter, sortField, sortDirection, entriesPerPage]);

  // Aggregate Score Calculation
  const aggregateScore = useMemo(() => {
    const scoredCandidates = sortedCandidates.filter(c => {
      const score = parseInt(c.quiz?.['Final Score']) || parseInt(c.score) || 0;
      return score > 0;
    });
    if (scoredCandidates.length === 0) return '0.00';
    const total = scoredCandidates.reduce((acc, c) => {
      return acc + (parseInt(c.quiz?.['Final Score']) || parseInt(c.score) || 0);
    }, 0);
    return (total / scoredCandidates.length).toFixed(2);
  }, [sortedCandidates]);

  // Handle sort field change
  const handleSortChange = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setRoundFilter('all');
    setRoundStatusFilter('all');
    setR3StatusFilter('all');
    setSortField('newest');
    setSortDirection('desc');
  };

  // Check if any filter is active
  const hasActiveFilters = searchText || statusFilter !== 'all' || roundFilter !== 'all' || roundStatusFilter !== 'all' || r3StatusFilter !== 'all' || sortField !== 'newest' || sortDirection !== 'desc';

  const toggleExpand = (uid) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(uid)) {
      newExpanded.delete(uid);
    } else {
      newExpanded.add(uid);
    }
    setExpandedRows(newExpanded);
  };

  const toggleSelection = (uid) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(uid)) {
      newSelected.delete(uid);
    } else {
      newSelected.add(uid);
    }
    setSelectedRows(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === paginatedCandidates.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedCandidates.map(c => c.uid)));
    }
  };

  const allSelected = paginatedCandidates.length > 0 && 
    paginatedCandidates.every(c => selectedRows.has(c.uid));

  // Get score and determine color
  const getScoreDisplay = (candidate) => {
    const score = parseInt(candidate.quiz?.['Final Score']) || parseInt(candidate.score) || 0;
    const isGreen = score >= 11;
    return { score, isGreen };
  };

  // Format time to display only HH:MM:SS
  const formatTimeOnly = (timeString) => {
    if (!timeString || timeString === '—') return '—';
    
    // If already in HH:MM:SS format (like "05:54:34"), return as is
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    
    // Try to parse ISO format like "2026-01-31T21:50:16+05:30"
    try {
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
      }
    } catch (e) {
      // Fall through to return original
    }
    
    // If contains 'T', try to extract time portion
    if (timeString.includes('T')) {
      const timePart = timeString.split('T')[1];
      if (timePart) {
        // Extract HH:MM:SS from "21:50:16+05:30"
        const match = timePart.match(/^(\d{2}:\d{2}:\d{2})/);
        if (match) return match[1];
      }
    }
    
    return timeString;
  };

  // Get exam status based on startTime and completionTime
  const getExamStatus = (candidate) => {
    const startTime = candidate.startTime;
    const completionTime = candidate.quiz?.Time || candidate.timeTakenInTest || candidate.completionTime || candidate.time;
    
    const hasStartTime = startTime && startTime !== '—' && startTime !== '-' && startTime !== '';
    const hasCompletionTime = completionTime && completionTime !== '—' && completionTime !== '-' && completionTime !== '';
    
    if (!hasStartTime && !hasCompletionTime) {
      return 'not-started';
    } else if (hasStartTime && !hasCompletionTime) {
      return 'in-progress';
    } else {
      return 'completed';
    }
  };

  // Get exam status display style
  const getExamStatusStyle = (status) => {
    const baseStyle = {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
    };
    
    switch (status) {
      case 'completed':
        return { ...baseStyle, background: '#d1fae5', color: '#065f46' };
      case 'in-progress':
        return { ...baseStyle, background: '#dbeafe', color: '#1e40af' };
      case 'not-started':
      default:
        return { ...baseStyle, background: '#f3f4f6', color: '#6b7280' };
    }
  };

  // Get exam status label
  const getExamStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      case 'not-started':
      default:
        return 'Not Started';
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= maxVisiblePages; i++) pages.push(i);
    } else if (currentPage >= totalPages - 2) {
      for (let i = totalPages - maxVisiblePages + 1; i <= totalPages; i++) pages.push(i);
    } else {
      for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
    }
    
    return pages;
  };

  return (
    <>
      {/* Controls Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '16px',
        padding: '16px 24px',
        borderBottom: '1px solid #e5e7eb',
        background: '#f9fafb',
      }}>
        {/* Entries Per Page */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>Show</span>
          <select
            value={entriesPerPage}
            onChange={(e) => setEntriesPerPage(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>entries</span>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1', maxWidth: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search by ID, Name, Email..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9ca3af',
                padding: '2px',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Button with Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            ref={filterButtonRef}
            onClick={toggleFilterDropdown}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: hasActiveFilters ? '#667eea' : 'white',
              color: hasActiveFilters ? 'white' : '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
            }}
          >
            <Filter size={16} />
            Filter & Sort
            {hasActiveFilters && (
              <span style={{
                background: 'white',
                color: '#667eea',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: '700',
              }}>
                !
              </span>
            )}
          </button>

          {/* Filter Dropdown */}
          {filterDropdownOpen && (
            <div 
              ref={filterDropdownRef}
              style={{
                position: 'fixed',
                top: `${filterDropdownPos.top}px`,
                right: `${filterDropdownPos.right}px`,
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
                border: '1px solid #e5e7eb',
                minWidth: '320px',
                maxHeight: '70vh',
                overflowY: 'auto',
                overflowX: 'hidden',
                zIndex: 9999,
                scrollbarWidth: 'thin',
                scrollbarColor: '#c7d2fe #f3f4f6',
              }}>
              {/* Header */}
              <div style={{
                padding: '16px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f9fafb',
              }}>
                <span style={{ fontWeight: '700', color: '#111827' }}>Filter & Sort</span>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Attendance Status
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                  {['all', 'present', 'absent'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: statusFilter === status ? '2px solid #667eea' : '1px solid #e5e7eb',
                        background: statusFilter === status ? '#eef2ff' : 'white',
                        color: statusFilter === status ? '#667eea' : '#6b7280',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'capitalize',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {status === 'all' ? 'All' : status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Round Filter */}
              <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Round
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                  {['all', 'R1', 'R2', 'R3', 'R4'].map((round) => (
                    <button
                      key={round}
                      onClick={() => {
                        setRoundFilter(round);
                        // Reset R3 status filter when changing round
                        if (round !== 'R3') {
                          setR3StatusFilter('all');
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: roundFilter === round ? '2px solid #667eea' : '1px solid #e5e7eb',
                        background: roundFilter === round ? '#eef2ff' : 'white',
                        color: roundFilter === round ? '#667eea' : '#6b7280',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {round === 'all' ? 'All Rounds' : `Round ${round.slice(1)}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Round Status Filter */}
              <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Round Status
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                  {[
                    { value: 'all', label: 'All', color: '#6b7280' },
                    { value: 'completed', label: 'Completed', color: '#059669' },
                    { value: 'in-progress', label: 'In Progress', color: '#f59e0b' },
                    { value: 'dropped', label: 'Dropped', color: '#ef4444' },
                    { value: 'rejected', label: 'Rejected', color: '#dc2626' },
                  ].map(({ value, label, color }) => (
                    <button
                      key={value}
                      onClick={() => setRoundStatusFilter(value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: roundStatusFilter === value ? `2px solid ${color}` : '1px solid #e5e7eb',
                        background: roundStatusFilter === value ? (value === 'all' ? '#f3f4f6' : `${color}15`) : 'white',
                        color: roundStatusFilter === value ? color : '#6b7280',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {(roundFilter !== 'all' || roundStatusFilter !== 'all' || r3StatusFilter !== 'all') && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '8px 12px', 
                    background: '#f0f9ff', 
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#0369a1',
                  }}>
                    {roundFilter === 'R3' && r3StatusFilter !== 'all'
                      ? `Showing: Round 3 → ${r3StatusFilter}`
                      : roundFilter !== 'all' && roundStatusFilter !== 'all' 
                        ? `Showing: Round ${roundFilter.slice(1)} → ${roundStatusFilter.charAt(0).toUpperCase() + roundStatusFilter.slice(1).replace('-', ' ')}`
                        : roundFilter !== 'all' 
                          ? `Showing: Round ${roundFilter.slice(1)} (all statuses)`
                          : `Showing: All rounds with "${roundStatusFilter.replace('-', ' ')}" status`
                    }
                  </div>
                )}
              </div>

              {/* R3 Status Sub-Filter (GO/HOLD) */}
              {roundFilter === 'R3' && (
                <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', background: '#fefce8' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    R3 Interview Status
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                    {[
                      { value: 'all', label: 'All', color: '#6b7280' },
                      { value: 'GO', label: 'GO', color: '#059669' },
                      { value: 'HOLD', label: 'HOLD', color: '#f59e0b' },
                    ].map(({ value, label, color }) => (
                      <button
                        key={value}
                        onClick={() => setR3StatusFilter(value)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          border: r3StatusFilter === value ? `2px solid ${color}` : '1px solid #e5e7eb',
                          background: r3StatusFilter === value ? (value === 'all' ? '#f3f4f6' : `${color}15`) : 'white',
                          color: r3StatusFilter === value ? color : '#6b7280',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sort Options */}
              <div style={{ padding: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Sort By
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px' }}>
                  {[
                    { field: 'newest', label: 'Newest First' },
                    { field: 'name', label: 'Name' },
                    { field: 'email', label: 'Email' },
                    { field: 'score', label: 'Score' },
                    { field: 'status', label: 'Status' },
                  ].map(({ field, label }) => (
                    <button
                      key={field}
                      onClick={() => handleSortChange(field)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: sortField === field ? '#eef2ff' : 'transparent',
                        color: sortField === field ? '#667eea' : '#374151',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: sortField === field ? '600' : '400',
                        transition: 'all 0.2s ease',
                        textAlign: 'left',
                      }}
                    >
                      <span>{label}</span>
                      {sortField === field && (
                        sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Total Candidates */}
        <div style={{ 
          fontSize: '14px', 
          color: '#6b7280',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginLeft: 'auto',
        }}>
          <Activity size={16} style={{ color: '#667eea' }} />
          <span>Total: <strong style={{ color: '#111827' }}>{sortedCandidates.length}</strong></span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
            <tr>
              {/* Expand Column for Admin, Photo Column for Co-Admin */}
              <th style={{ width: isAdmin ? '48px' : '60px', padding: '16px' }}>
                {!isAdmin && (
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Photo
                  </span>
                )}
              </th>
              {/* Name Column */}
              <th style={{ padding: '16px', textAlign: 'left' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Name
                </span>
              </th>
              {/* Email Column */}
              <th style={{ padding: '16px', textAlign: 'left' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Email
                </span>
              </th>
              {/* Phone Column */}
              <th style={{ padding: '16px', textAlign: 'left' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Phone
                </span>
              </th>
              {/* Attendance Column */}
              <th style={{ padding: '16px', textAlign: 'left' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Attendance
                </span>
              </th>
              {/* Current CTC Column - Admin only */}
              {isAdmin && (
                <th style={{ padding: '16px', textAlign: 'left' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Current CTC
                  </span>
                </th>
              )}
              {/* Notice Period Column - Admin only */}
              {isAdmin && (
                <th style={{ padding: '16px', textAlign: 'left' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Notice Period
                  </span>
                </th>
              )}
              {/* Total Experience Column */}
              <th style={{ padding: '16px', textAlign: 'left' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Exp
                </span>
              </th>
              {/* Designation Column */}
              <th style={{ padding: '16px', textAlign: 'left' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Designation
                </span>
              </th>
              {/* Score Column */}
              <th style={{ padding: '16px', textAlign: 'left' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Score
                </span>
              </th>
              {/* Time Taken Column */}
              <th style={{ padding: '16px', textAlign: 'left' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Time Taken
                </span>
              </th>
              {/* Exam Status Column */}
              <th style={{ padding: '16px', textAlign: 'left' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Status
                </span>
              </th>
              {/* Actions Column for Co-Admin */}
              {!isAdmin && (
                <th style={{ padding: '16px', textAlign: 'center', width: '80px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Actions
                  </span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedCandidates.map((candidate) => {
              const isExpanded = expandedRows.has(candidate.uid);
              const isSelected = selectedRows.has(candidate.uid);
              const status = getAttendanceStatus(candidate);
              const { score, isGreen } = getScoreDisplay(candidate);

              return (
                <React.Fragment key={candidate.uid}>
                  {/* Main Row */}
                  <tr
                    style={{
                      borderBottom: isExpanded && isAdmin ? 'none' : '1px solid #e5e7eb',
                      background: 'transparent',
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* First Column: Expand Button for Admin, Photo for Co-Admin */}
                    <td style={{ padding: '16px' }}>
                      {isAdmin ? (
                        <button
                          onClick={() => toggleExpand(candidate.uid)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#667eea',
                            transition: 'transform 0.2s ease',
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
                          }}
                        >
                          <ChevronRight size={20} />
                        </button>
                      ) : (
                        <CandidatePhoto photoUrl={candidate.photo} name={candidate.name} size="sm" />
                      )}
                    </td>
                    {/* Name */}
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '600', color: '#111827' }}>{candidate.name}</div>
                    </td>
                    {/* Email */}
                    <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                      {candidate.email}
                    </td>
                    {/* Phone */}
                    <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                      {candidate.phone || '—'}
                    </td>
                    {/* Attendance */}
                    <td style={{ padding: '16px' }}>
                      <StatusBadge status={status} isAttendance={true} />
                    </td>
                    {/* Current CTC - Admin only */}
                    {isAdmin && (
                      <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                        {candidate.currentCTC || '—'}
                      </td>
                    )}
                    {/* Notice Period - Admin only */}
                    {isAdmin && (
                      <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                        {candidate.noticePeriod || '—'}
                      </td>
                    )}
                    {/* Total Experience */}
                    <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                      {candidate.totalExperience ? `${candidate.totalExperience} yrs` : '—'}
                    </td>
                    {/* Designation */}
                    <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                      {candidate.designation || '—'}
                    </td>
                    {/* Score - Green if >= 11 */}
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        fontWeight: '700',
                        color: isGreen ? '#059669' : '#111827',
                        background: isGreen ? '#d1fae5' : '#f3f4f6',
                        padding: '4px 12px',
                        borderRadius: '8px',
                        fontSize: '14px',
                      }}>
                        {score > 0 ? `${score}/30` : '—'}
                      </span>
                    </td>
                    {/* Time Taken */}
                    <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                      {candidate.timeTakenInTest || '—'}
                    </td>
                    {/* Round Status Stepper */}
                    <td style={{ padding: '16px' }}>
                      <RoundStepper candidate={candidate} />
                    </td>
                    
                    {/* Actions Column - Co-Admin only */}
                    {!isAdmin && (
                      <td style={{ padding: '16px', position: 'relative' }}>
                        <button
                          onClick={() => setModalCandidate(candidate)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            background: '#667eea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '13px',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#5a67d8'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#667eea'}
                        >
                          <Eye size={20} />
                          View
                        </button>
                      </td>
                    )}
                  </tr>

                  {/* Expanded Row - Admin only */}
                  {isAdmin && isExpanded && (
                    <tr style={{ background: '#f8fafc' }}>
                      <td colSpan={isAdmin ? 12 : 10} style={{ padding: '0' }}>
                        <div style={{
                          padding: '24px',
                          borderBottom: '1px solid #e5e7eb',
                        }}>
                          <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                          }}>
                            <div style={{ display: 'flex', gap: '24px' }}>
                              {/* Photo */}
                              <div style={{ flexShrink: 0 }}>
                                <CandidatePhoto photoUrl={candidate.photo} name={candidate.name} size="lg" />
                              </div>

                              {/* Admin sees full details */}
                              {isAdmin ? (
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                    <DetailItem label="Preferred Location" value={candidate.preferredLocation} />
                                    <DetailItem label="Skills" value={candidate.skills} />
                                    <DetailItem label="Willing to Relocate" value={candidate.willingToRelocate} />
                                  </div>
                                  
                                  {/* Skill Experience Section */}
                                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                                      Experience Level
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                      {candidate.experienceGenAI && candidate.experienceGenAI !== '—' && (
                                        <span style={{ background: '#f0fdf4', color: '#166534', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' }}>
                                          GenAI: {candidate.experienceGenAI}
                                        </span>
                                      )}
                                      {candidate.experiencePython && candidate.experiencePython !== '—' && (
                                        <span style={{ background: '#eff6ff', color: '#1e40af', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' }}>
                                          Python: {candidate.experiencePython}
                                        </span>
                                      )}
                                      {candidate.experienceRPA && candidate.experienceRPA !== '—' && (
                                        <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' }}>
                                          RPA: {candidate.experienceRPA}
                                        </span>
                                      )}
                                      {(!candidate.experienceGenAI || candidate.experienceGenAI === '—') && 
                                       (!candidate.experiencePython || candidate.experiencePython === '—') && 
                                       (!candidate.experienceRPA || candidate.experienceRPA === '—') && (
                                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>No experience data available</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Document Buttons and View More - Admin sees all */}
                                  <div style={{
                                    marginTop: '20px',
                                    paddingTop: '16px',
                                    borderTop: '1px solid #e5e7eb',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '12px',
                                  }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                      {candidate.resume && (
                                        <DocumentButton href={getDownloadUrl(candidate.resume)} label="Resume" color="#3b82f6" />
                                      )}
                                      {candidate.aadharCard && (
                                        <DocumentButton href={getDownloadUrl(candidate.aadharCard)} label="Aadhar" color="#ef4444" />
                                      )}
                                      {candidate.payslip && candidate.payslip.split(',').map((link, index) => {
                                        const trimmedLink = link.trim();
                                        if (!trimmedLink) return null;
                                        return (
                                          <DocumentButton 
                                            key={index} 
                                            href={getDownloadUrl(trimmedLink)} 
                                            label={`Payslip ${index + 1}`} 
                                            color="#8b5cf6" 
                                          />
                                        );
                                      })}
                                      {candidate.lastBreakup && (
                                        <DocumentButton href={getDownloadUrl(candidate.lastBreakup)} label="Last Breakup" color="#f59e0b" />
                                      )}
                                    </div>

                                    <button
                                      onClick={() => setModalCandidate(candidate)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 20px',
                                        background: '#667eea',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        transition: 'all 0.2s',
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = '#5a67d8'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = '#667eea'}
                                    >
                                      <Eye size={16} />
                                      View More
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* Co-Admin sees only Resume and View More */
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                                  {candidate.resume && (
                                    <DocumentButton href={getDownloadUrl(candidate.resume)} label="Resume" color="#3b82f6" />
                                  )}
                                  <button
                                    onClick={() => setModalCandidate(candidate)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '10px 20px',
                                      background: '#667eea',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      fontWeight: '600',
                                      fontSize: '14px',
                                      transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#5a67d8'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#667eea'}
                                  >
                                    <Eye size={16} />
                                    View More
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {paginatedCandidates.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 12 : 11} style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No candidates found</div>
                  <div style={{ fontSize: '14px' }}>Try adjusting your filters</div>
                </td>
              </tr>
            )}
          </tbody>

          {/* Footer with Aggregate Score */}
          {/* <tfoot style={{ background: '#f3f4f6' }}>
            <tr>
              <td colSpan="5" style={{ padding: '16px', textAlign: 'right' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-end', 
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  <Activity size={16} style={{ color: '#667eea' }} />
                  Aggregate Score (Filtered):
                </div>
              </td>
              <td style={{ padding: '16px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#667eea',
                }}>
                  <Award size={20} style={{ color: '#f59e0b' }} />
                  {aggregateScore}
                </div>
              </td>
              <td colSpan="2" style={{ padding: '16px' }}></td>
            </tr>
          </tfoot> */}
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        padding: '16px 24px',
        borderTop: '1px solid #e5e7eb',
        background: '#f9fafb',
      }}>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>
          Showing {Math.min((currentPage - 1) * entriesPerPage + 1, filteredCandidates.length)} to{' '}
          {Math.min(currentPage * entriesPerPage, filteredCandidates.length)} of {filteredCandidates.length} entries
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          {/* Previous Button */}
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              background: 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 1 ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronLeft size={16} />
          </button>

          {/* Page Numbers */}
          {getPageNumbers().map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              style={{
                padding: '8px 14px',
                border: '1px solid',
                borderColor: currentPage === pageNum ? '#667eea' : '#e5e7eb',
                borderRadius: '6px',
                background: currentPage === pageNum ? '#667eea' : 'white',
                color: currentPage === pageNum ? 'white' : '#374151',
                cursor: 'pointer',
                fontWeight: currentPage === pageNum ? '600' : '400',
                fontSize: '14px',
              }}
            >
              {pageNum}
            </button>
          ))}

          {/* Next Button */}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              background: 'white',
              cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
              opacity: currentPage === totalPages || totalPages === 0 ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Candidate Details Modal */}
      <CandidateDetailsModal
        candidate={modalCandidate}
        open={!!modalCandidate}
        onClose={() => setModalCandidate(null)}
        userRole={userRole}
        onRefresh={onRefresh}
      />

      {/* Click outside handler for info dropdown */}
      {infoDropdown && (
        <div
          onClick={() => setInfoDropdown(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
          }}
        />
      )}
    </>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={value}>
        {value || '—'}
      </div>
    </div>
  );
}

function DocumentButton({ href, label, color }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        background: color,
        color: 'white',
        borderRadius: '8px',
        textDecoration: 'none',
        fontSize: '13px',
        fontWeight: '600',
        transition: 'opacity 0.2s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
    >
      {label}
    </a>
  );
}

import React from 'react';
// import { cn } from '../../utils/cn';

const statusStyles = {
  'not-started': {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    dot: 'bg-gray-400',
    inline: { background: '#f3f4f6', color: '#374151' }
  },
  'in-progress': {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    inline: { background: '#dbeafe', color: '#1e40af' }
  },
  'completed': {
    bg: 'bg-green-100',
    text: 'text-green-700',
    dot: 'bg-green-500',
    inline: { background: '#d1fae5', color: '#065f46' }
  },
  'present': {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    inline: { background: '#d1fae5', color: '#047857' }
  },
  'absent': {
    bg: 'bg-red-100',
    text: 'text-red-700',
    dot: 'bg-red-500',
    inline: { background: '#fee2e2', color: '#991b1b' }
  },
};

const statusLabels = {
  'not-started': 'Absent',
  'in-progress': 'In Progress',
  'completed': 'Completed',
  'present': 'Present',
  'absent': 'Absent',
};

export function StatusBadge({ status, isAttendance = false }) {
  let normalizedStatus = status?.toLowerCase()?.replace(' ', '-') || 'not-started';
  
  // For attendance column, convert not-started to absent
  if (isAttendance && normalizedStatus === 'not-started') {
    normalizedStatus = 'absent';
  }
  
  const style = statusStyles[normalizedStatus] || statusStyles['absent'];
  const label = statusLabels[normalizedStatus] || status || 'Absent';
  
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: '600',
        ...style.inline
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: normalizedStatus === 'not-started' ? '#ef4444' 
            : normalizedStatus === 'in-progress' ? '#3b82f6'
            : normalizedStatus === 'completed' ? '#22c55e'
            : normalizedStatus === 'present' ? '#10b981'
            : normalizedStatus === 'absent' ? '#ef4444' : '#ef4444'
        }}
      />
      {label}
    </span>
  );
}

// Round Stepper Component for Status Column
export function RoundStepper({ candidate }) {
  const [hoveredStep, setHoveredStep] = React.useState(null);
  
  // Get R1 score (MCQ Final Score)
  const r1Score = candidate.quiz?.['Final Score'] || candidate.score || null;
  const r1ScoreNum = r1Score !== null ? parseInt(r1Score) : null;
  const r1IsDropped = r1ScoreNum !== null && r1ScoreNum < 13; // Marks less than 13 means dropped
  const r1IsPassed = r1ScoreNum !== null && r1ScoreNum >= 13;
  
  // Get R2 data (Technical Round) - from database status field
  const r2Data = candidate.quiz?.R2 || candidate.quiz?.r2;
  const r2Rating = Array.isArray(r2Data) && r2Data[0] ? r2Data[0].rating : (r2Data?.rating || null);
  const r2Status = Array.isArray(r2Data) && r2Data[0] ? (r2Data[0].status || '').toLowerCase().trim() : ((r2Data?.status || '').toLowerCase().trim());
  const r2Interviewer = Array.isArray(r2Data) && r2Data[0] ? r2Data[0].interviewer : (r2Data?.interviewer || null);
  
  // Get R3 data (Managerial Round - GO/NO GO/HOLD) - uses 'Managerial status' field
  const r3Data = candidate.quiz?.R3 || candidate.quiz?.r3;
  const r3Rating = Array.isArray(r3Data) && r3Data[0] 
    ? (r3Data[0]['Managerial status'] || r3Data[0]['managerial status'] || r3Data[0].rating) 
    : (r3Data?.['Managerial status'] || r3Data?.rating || null);
  const r3Status = Array.isArray(r3Data) && r3Data[0] ? (r3Data[0].status || '').toLowerCase().trim() : ((r3Data?.status || '').toLowerCase().trim());
  const r3Interviewer = Array.isArray(r3Data) && r3Data[0] ? r3Data[0].interviewer : (r3Data?.interviewer || null);
  
  // Get R4 data (HR Round)
  const r4Data = candidate.quiz?.R4 || candidate.quiz?.r4;
  const r4Rating = Array.isArray(r4Data) && r4Data[0] ? r4Data[0].rating : (r4Data?.rating || null);
  const r4Status = Array.isArray(r4Data) && r4Data[0] ? (r4Data[0].status || '').toLowerCase().trim() : ((r4Data?.status || '').toLowerCase().trim());
  const r4Interviewer = Array.isArray(r4Data) && r4Data[0] ? r4Data[0].interviewer : (r4Data?.interviewer || null);
  
  const getTooltipContent = (step) => {
    let lines = [];
    
    if (step.id === 'R1') {
      if (step.data) {
        lines.push(`Score: ${step.data}/30`);
        if (step.isDropped) {
          lines.push('Status: DROPPED (Score < 13)');
        } else {
          lines.push('Status: PASSED');
        }
      } else {
        lines.push('Not attempted');
      }
    } else if (step.id === 'R3') {
      if (step.data) lines.push(`Decision: ${step.data}`);
      if (step.interviewer) lines.push(`Interviewer: ${step.interviewer}`);
      // Show the round status (in progress, completed, drop)
      if (step.roundStatus) {
        const displayStatus = step.roundStatus.charAt(0).toUpperCase() + step.roundStatus.slice(1);
        lines.push(`Round Status: ${displayStatus}`);
      }
      if (lines.length === 0) lines.push('Pending');
    } else {
      if (step.data) lines.push(`Rating: ${step.data}/10`);
      if (step.interviewer) lines.push(`Interviewer: ${step.interviewer}`);
      if (step.roundStatus) lines.push(`Status: ${step.roundStatus}`);
      if (lines.length === 0) lines.push('Not started');
    }
    
    return lines;
  };
  
  // Normalize status for comparison
  const normalizeStatus = (status) => {
    if (!status) return '';
    const s = status.toLowerCase().trim();
    if (s === 'drop' || s === 'dropped') return 'drop';
    if (s === 'rejected' || s === 'reject') return 'rejected';
    if (s === 'in progress' || s === 'in-progress' || s === 'inprogress') return 'in progress';
    if (s === 'completed' || s === 'complete') return 'completed';
    return s;
  };
  
  const steps = [
    { 
      id: 'R1', 
      label: 'R1', 
      data: r1Score, 
      roundStatus: r1IsDropped ? 'drop' : (r1IsPassed ? 'completed' : ''),
      interviewer: null,
      isDropped: r1IsDropped
    },
    { 
      id: 'R2', 
      label: 'R2', 
      data: r2Rating, 
      roundStatus: normalizeStatus(r2Status),
      interviewer: r2Interviewer,
      isDropped: normalizeStatus(r2Status) === 'drop',
      isRejected: normalizeStatus(r2Status) === 'rejected'
    },
    { 
      id: 'R3', 
      // Show G for GO, H for HOLD, otherwise R3
      label: (r3Rating || '').toUpperCase() === 'GO' ? 'G' : (r3Rating || '').toUpperCase() === 'HOLD' ? 'H' : 'R3', 
      data: r3Rating, 
      roundStatus: normalizeStatus(r3Status),
      interviewer: r3Interviewer,
      isDropped: normalizeStatus(r3Status) === 'drop',
      isRejected: normalizeStatus(r3Status) === 'rejected',
      managerialStatus: (r3Rating || '').toUpperCase() // GO or HOLD
    },
    { 
      id: 'R4', 
      label: 'R4', 
      data: r4Rating, 
      roundStatus: normalizeStatus(r4Status),
      interviewer: r4Interviewer,
      isDropped: normalizeStatus(r4Status) === 'drop',
      isRejected: normalizeStatus(r4Status) === 'rejected'
    },
  ];
  
  // Color logic based ONLY on status field from database
  const getStepColor = (step) => {
    const status = step.roundStatus;
    
    // Priority 0: R3 special case - GO = Green, HOLD = Yellow
    if (step.id === 'R3' && step.managerialStatus) {
      if (step.managerialStatus === 'GO') {
        return { bg: '#d1fae5', border: '#059669', text: '#059669' }; // Green
      }
      if (step.managerialStatus === 'HOLD') {
        return { bg: '#fef3c7', border: '#d97706', text: '#d97706' }; // Yellow
      }
    }
    
    // Priority 1: Drop status = RED with dark red border
    if (status === 'drop' || step.isDropped) {
      return { bg: '#fee2e2', border: '#dc2626', text: '#dc2626' };
    }
    
    // Priority 2: Rejected status = RED with dark red border (same as drop)
    if (status === 'rejected' || step.isRejected) {
      return { bg: '#fee2e2', border: '#dc2626', text: '#dc2626' };
    }
    
    // Priority 3: Completed status = GREEN with dark green border
    if (status === 'completed') {
      return { bg: '#d1fae5', border: '#059669', text: '#059669' };
    }
    
    // Priority 4: In Progress status = LIGHT BLUE with dark blue border
    if (status === 'in progress') {
      return { bg: '#dbeafe', border: '#2563eb', text: '#2563eb' };
    }
    
    // Priority 5: Empty/No status = GREY
    return { bg: '#f3f4f6', border: '#9ca3af', text: '#9ca3af' };
  };
  
  // Get line color based on the CURRENT step's status (not next step)
  const getLineColor = (currentStep, nextStep) => {
    const currentStatus = currentStep.roundStatus;
    
    // If current step is dropped or rejected, line is dark red
    if (currentStatus === 'drop' || currentStep.isDropped || currentStatus === 'rejected' || currentStep.isRejected) {
      return '#dc2626';
    }
    
    // If current step is completed, line is dark green
    if (currentStatus === 'completed') {
      return '#059669';
    }
    
    // If current step is in progress, line is dark blue
    if (currentStatus === 'in progress') {
      return '#2563eb';
    }
    
    // Default grey
    return '#9ca3af';
  };
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
      {steps.map((step, index) => {
        const colors = getStepColor(step);
        const tooltipLines = getTooltipContent(step);
        return (
          <React.Fragment key={step.id}>
            <div
              style={{ position: 'relative' }}
              onMouseEnter={() => setHoveredStep(step.id)}
              onMouseLeave={() => setHoveredStep(null)}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: colors.bg,
                  border: `2px solid ${colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: '700',
                  color: colors.text,
                  cursor: 'default',
                  transition: 'all 0.2s ease',
                }}
              >
                {step.isDropped ? '✗' : step.label}
              </div>
              
              {/* Tooltip */}
              {hoveredStep === step.id && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '8px',
                    padding: '8px 12px',
                    background: step.isDropped ? '#dc2626' : '#1f2937',
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    zIndex: 50,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  <div style={{ fontWeight: '700', marginBottom: tooltipLines.length > 1 ? '4px' : 0 }}>
                    {step.id} {step.isDropped && '- DROPPED'}
                  </div>
                  {tooltipLines.map((line, i) => (
                    <div key={i} style={{ opacity: 0.9 }}>{line}</div>
                  ))}
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: `6px solid ${step.isDropped ? '#dc2626' : '#1f2937'}`,
                    }}
                  />
                </div>
              )}
            </div>
            
            {/* Connector line between steps - based on current step status */}
            {index < steps.length - 1 && (
              <div
                style={{
                  width: '12px',
                  height: '2px',
                  background: getLineColor(steps[index], steps[index + 1]),
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

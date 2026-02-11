import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ExamTimer({ duration = 45, onTimeUp }) {
  const [timeLeft, setTimeLeft] = useState(duration * 60); // Convert to seconds
  const [showWarning, setShowWarning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsCompleted(true);
      onTimeUp();
      return;
    }

    // Show warning at 5 minutes (300 seconds)
    if (timeLeft === 300) {
      setShowWarning(true);
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onTimeUp]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const progressPercentage = ((duration * 60 - timeLeft) / (duration * 60)) * 100;

  const isLowTime = timeLeft <= 300; // 5 minutes
  const isVeryLowTime = timeLeft <= 60; // 1 minute

  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-6">
      {/* Warning Alert */}
      {showWarning && !isCompleted && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded flex items-start gap-3 animate-pulse">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700">⏰ 5 Minutes Remaining!</p>
            <p className="text-red-600 text-sm">Please wrap up your test. Time is running out!</p>
          </div>
        </div>
      )}

      {/* Completion Alert */}
      {isCompleted && (
        <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-green-700">✓ Time's Up!</p>
            <p className="text-green-600 text-sm">Your test has been submitted.</p>
          </div>
        </div>
      )}

      {/* Timer Display */}
      <div className="text-center mb-6">
        <div
          className={`text-6xl font-bold font-mono mb-2 transition-colors ${
            isVeryLowTime
              ? 'text-red-600 animate-pulse'
              : isLowTime
              ? 'text-orange-500'
              : 'text-indigo-600'
          }`}
        >
          {formatTime(timeLeft)}
        </div>
        <p className="text-gray-600 text-sm font-medium">Time Remaining</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-medium text-gray-700">Progress</p>
          <p className="text-sm text-gray-600">{Math.round(progressPercentage)}%</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              isVeryLowTime
                ? 'bg-red-500'
                : isLowTime
                ? 'bg-orange-400'
                : 'bg-indigo-600'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Status Information */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">
            {Math.floor(timeLeft / 60)}
          </p>
          <p className="text-xs text-gray-600 mt-1">Minutes</p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-2xl font-bold text-green-600">{timeLeft % 60}</p>
          <p className="text-xs text-gray-600 mt-1">Seconds</p>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg">
          <p className="text-2xl font-bold text-purple-600">{duration}</p>
          <p className="text-xs text-gray-600 mt-1">Total Min</p>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-600" />
          <p className="text-sm text-gray-600">
            {isCompleted
              ? 'Test Completed'
              : isVeryLowTime
              ? 'Critical: Less than 1 minute left'
              : isLowTime
              ? 'Warning: Less than 5 minutes left'
              : 'In Progress'}
          </p>
        </div>
      </div>
    </div>
  );
}

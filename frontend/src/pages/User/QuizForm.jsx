import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./FormQuiz.css";
import quizData from "../../data/quizData.json";
import toast from "react-hot-toast";
import {
  QUIZ_STAGES,
  QUIZ_CONFIG,
  GRADIENT_BG,
  PERFORMANCE_LEVELS,
} from "../../constants/quizConstants";
import {
  formatTime,
  calculateSectionScore,
  calculatePercentage,
  getTotalMarks,
  getPerformanceMessage,
  getPerformanceColor,
} from "../../utils/quizUtils";
import { quizResultAPI, userTimeDetailsAPI, candidateMeAPI, eventAPI } from "../../utils/api";

const quizSections = quizData.quizSections;

export default function QuizForm() {
  const [stage, setStage] = useState(QUIZ_STAGES.QUIZ);
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState({});
  const [sectionScores, setSectionScores] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [resultMessage, setResultMessage] = useState("");
  const timeoutTriggeredRef = useRef(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isTimeoutResult, setIsTimeoutResult] = useState(false);
  const autoRedirectTimerRef = useRef(null);
  const navigate = useNavigate();
  const finishQuizRef = useRef(null);

  const finishQuiz = useCallback(async () => {
    const scores = {};
    quizSections.forEach((section, index) => {
      scores[index] = calculateSectionScore(section.questions, answers);
    });
    setSectionScores(scores);
    let meData = {};
    try {
      const me = await candidateMeAPI.getMe();
      if (me?.success && me.data) meData = me.data;
    } catch { void 0; }
    const sectionWiseMarks = quizSections.map((section, index) => {
      const sectionScore = scores[index];
      const totalQuestions = section.questions.length;
      const correctAnswers = sectionScore;
      return {
        sectionName: section.title,
        marks: sectionScore,
        totalQuestions: totalQuestions,
        correctAnswers: correctAnswers,
      };
    });
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const quizResultData = {
      email: meData.email || "",
      mobileNumber: meData.phone || "",
      name:
        meData.firstName && meData.lastName
          ? `${meData.firstName} ${meData.lastName}`
          : meData.firstName || meData.email || "",
      sectionWiseMarks: sectionWiseMarks,
      totalMarks: totalScore,
    };
    try {
      const response = await quizResultAPI.saveQuizResult(quizResultData);
      if (response.success) {
        toast.success("Quiz result saved successfully!");
      }
    } catch {
      toast.error("Failed to save quiz result. Please contact support.");
    }
    try {
      await userTimeDetailsAPI.end();
      await userTimeDetailsAPI.complete();
    } catch { void 0; }
    const wasTimeout = timeoutTriggeredRef.current === true;
    setIsTimeoutResult(wasTimeout);
    setResultMessage(wasTimeout ? "exam time expired" : "Your exam has been successfully submitted.");
    timeoutTriggeredRef.current = false;
    setShowResultModal(true);
    if (autoRedirectTimerRef.current) {
      clearTimeout(autoRedirectTimerRef.current);
    }
    autoRedirectTimerRef.current = setTimeout(() => {
      navigate("/user-dashboard");
    }, wasTimeout ? 5000 : 10000);
  }, [answers, navigate]);

  useEffect(() => {
    let intervalId;
    const init = async () => {
      try {
        const me = await candidateMeAPI.getMe();
        if (!me?.success || !me.data?.email) return;
        const settings = await eventAPI.getLocationSettings().catch(() => ({ examDuration: 30 }));
        const totalSeconds = Math.max(60, (settings.examDuration || 30) * 60);
        const timeDetailsResp = await userTimeDetailsAPI.getByEmail(me.data.email).catch(() => null);
        const record = timeDetailsResp?.data || null;
        let startMs = record?.startTime ? new Date(record.startTime).getTime() : null;
        const hasCompleted = !!(record?.completionTime || record?.endTime);
        const isExpired = startMs ? ((Date.now() - startMs) / 1000) >= totalSeconds : false;
        if (!startMs || hasCompleted || isExpired) {
          await userTimeDetailsAPI.start().catch(() => { });
          startMs = Date.now();
        }
        const tick = () => {
          const elapsed = Math.floor((Date.now() - startMs) / 1000);
          const remaining = totalSeconds - elapsed;
          if (remaining <= 0) {
            timeoutTriggeredRef.current = true;
            setTimeLeft(0);
            if (finishQuizRef.current) { 
              finishQuizRef.current(); 
            }
            return;
          }
          setTimeLeft(remaining);
        };
        tick();
        intervalId = setInterval(tick, 1000);
      } catch { void 0; }
    };
    init();
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (autoRedirectTimerRef.current) {
        clearTimeout(autoRedirectTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    finishQuizRef.current = finishQuiz;
  }, [finishQuiz]);

  const handleOptionSelect = (option, questionId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleNextSection = () => {
    if (currentSection < quizSections.length - 1) {
      setCurrentSection((prev) => prev + 1);
      window.scrollTo(0, 0);
    } else {
      finishQuiz();
    }
  };

  const goToDashboard = () => {
    if (autoRedirectTimerRef.current) {
      clearTimeout(autoRedirectTimerRef.current);
    }
    navigate("/user-dashboard");
  };

  if (stage === QUIZ_STAGES.QUIZ) {
    const section = quizSections[currentSection];
   return (
  <div className="min-h-screen bg-gray-100 px-4 sm:px-6 lg:px-8 flex flex-col items-center py-10 transition-all duration-500 ease-in-out">
    <div className="w-full max-w-5xl">

      {/* Header */}
      <div className="sticky top-4 z-50 mb-8 bg-white border border-gray-200 shadow-sm rounded-xl p-5 transition-all duration-300 ease-in-out hover:shadow-md">
        <div className="flex items-center justify-between">

          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {section.title} Section
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Section {currentSection + 1} of {quizSections.length}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 transition-all duration-300 ease-in-out hover:scale-105">
            <span className="text-blue-600 font-semibold">
              ⏱️ {formatTime(timeLeft ?? 0)}
            </span>
          </div>

        </div>
      </div>

      {/* Questions */}
      <div className="space-y-8 mb-12 transition-all duration-500 ease-in-out">
        {section.questions.map((question, qIdx) => (
          <div
            key={question.id}
            className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-1"
          >
            <div className="flex gap-4 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold transition-all duration-300 ease-in-out hover:scale-110">
                {qIdx + 1}
              </div>
              <h2 className="text-lg md:text-xl font-semibold text-gray-800">
                {question.question}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {question.options.map((option, index) => (
                <label
                  key={index}
                  className={`flex items-center p-4 rounded-lg cursor-pointer border transition-all duration-200 ease-in-out transform active:scale-95 ${
                    answers[question.id] === option
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 bg-white hover:bg-gray-50 hover:shadow-sm"
                  }`}
                  onClick={() => handleOptionSelect(option, question.id)}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option}
                    checked={answers[question.id] === option}
                    onChange={() =>
                      handleOptionSelect(option, question.id)
                    }
                    className="hidden"
                  />

                  <div
                    className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center transition-all duration-200 ${
                      answers[question.id] === option
                        ? "border-blue-600"
                        : "border-gray-400"
                    }`}
                  >
                    {answers[question.id] === option && (
                      <div className="w-2.5 h-2.5 bg-blue-600 rounded-full transition-all duration-200 scale-100" />
                    )}
                  </div>

                  <span className="text-gray-700 font-medium">
                    {option}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition-all duration-300 ease-in-out hover:shadow-md">
        <button
          onClick={() => {
            setCurrentSection(Math.max(0, currentSection - 1));
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          disabled={currentSection === 0}
          className={`px-6 py-3 font-medium rounded-md transition-all duration-200 ease-in-out transform active:scale-95 ${
            currentSection === 0
              ? "opacity-40 cursor-not-allowed"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm"
          }`}
        >
          ← Previous Section
        </button>

        <button
          onClick={() => {
            handleNextSection();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="px-8 py-3 rounded-md bg-blue-600 text-white font-medium transition-all duration-200 ease-in-out hover:bg-blue-700 hover:shadow-lg hover:scale-[1.02] active:scale-95"
        >
          {currentSection === quizSections.length - 1
            ? "Submit Exam"
            : "Next Section"}
        </button>
      </div>
    </div>
    {showResultModal && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "520px",
            background: "white",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "8px", color: "#2d3a50" }}>
            Exam Completed
          </h2>
          <p style={{ marginBottom: "16px", color: "#374151" }}>
            {resultMessage || (isTimeoutResult ? "exam time expired" : "Your exam has been successfully submitted.")}
          </p>
          {!isTimeoutResult && (
            <button
              onClick={goToDashboard}
              className="px-6 py-3 rounded-lg text-white font-bold bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              Go to Dashboard
            </button>
          )}
          <p style={{ marginTop: "12px", fontSize: "12px", color: "#6b7280" }}>
            {isTimeoutResult ? "Redirecting to dashboard shortly..." : "You will be redirected to dashboard in 10 seconds."}
          </p>
        </div>
      </div>
    )}
  </div>
);


  }

  // Results stage is no longer used; modal handles submission feedback and redirect.

  return null;
}

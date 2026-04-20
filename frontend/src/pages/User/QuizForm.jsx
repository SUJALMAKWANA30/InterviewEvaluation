import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./FormQuiz.css";
import toast from "react-hot-toast";
import {
  QUIZ_STAGES,
  QUIZ_CONFIG,
  GRADIENT_BG,
  PERFORMANCE_LEVELS,
} from "../../constants/quizConstants";
import {
  formatTime,
} from "../../utils/quizUtils";
import { quizResultAPI, userTimeDetailsAPI, candidateMeAPI, examAPI } from "../../utils/api";

const MAX_TAB_VIOLATIONS = 3;

export default function QuizForm() {
  const [stage, setStage] = useState(QUIZ_STAGES.QUIZ);
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState({});
  const [sectionScores, setSectionScores] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [resultMessage, setResultMessage] = useState("");
  const [quizSections, setQuizSections] = useState([]);
  const [attemptId, setAttemptId] = useState("");
  const [examDurationSeconds, setExamDurationSeconds] = useState(30 * 60);
  const [examLoading, setExamLoading] = useState(true);
  const timeoutTriggeredRef = useRef(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isTimeoutResult, setIsTimeoutResult] = useState(false);
  const autoRedirectTimerRef = useRef(null);
  const navigate = useNavigate();
  const finishQuizRef = useRef(null);
  const attemptIdRef = useRef("");
  const answersRef = useRef({});
  const tabViolationCount = useRef(0);
  const [tabWarningVisible, setTabWarningVisible] = useState(false);

  // ─── Anti-cheat: block copy/cut/paste, right-click, keyboard shortcuts, tab switching ───
  useEffect(() => {
    const blockCopyCutPaste = (e) => {
      e.preventDefault();
      toast.error("Copy/Paste is disabled during the exam.");
    };

    const blockContextMenu = (e) => {
      e.preventDefault();
    };

    const blockKeyboard = (e) => {
      // Block Ctrl/Cmd + C, V, X, U, S, A, P and F12, PrintScreen
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "v", "x", "u", "s", "a", "p"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        toast.error("Keyboard shortcuts are disabled during the exam.");
        return;
      }
      if (e.key === "F12" || e.key === "PrintScreen") {
        e.preventDefault();
        toast.error("Developer tools are disabled during the exam.");
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (attemptIdRef.current) {
          examAPI
            .autosaveAttempt(attemptIdRef.current, answersRef.current, 1)
            .catch(() => {});
        }
        tabViolationCount.current += 1;
        const remaining = MAX_TAB_VIOLATIONS - tabViolationCount.current;
        if (remaining <= 0) {
          toast.error("Too many tab switches! Your exam is being auto-submitted.");
          if (finishQuizRef.current) {
            finishQuizRef.current();
          }
        } else {
          setTabWarningVisible(true);
          toast.error(
            `Warning: Tab switch detected! ${remaining} warning${remaining > 1 ? "s" : ""} left before auto-submit.`
          );
        }
      }
    };

    document.addEventListener("copy", blockCopyCutPaste);
    document.addEventListener("cut", blockCopyCutPaste);
    document.addEventListener("paste", blockCopyCutPaste);
    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockKeyboard);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("copy", blockCopyCutPaste);
      document.removeEventListener("cut", blockCopyCutPaste);
      document.removeEventListener("paste", blockCopyCutPaste);
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockKeyboard);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Fetch active exam from DB
  useEffect(() => {
    const loadExam = async () => {
      try {
        const res = await examAPI.getActiveExam();
        if (res.success && res.data) {
          const exam = res.data;
          setAttemptId(exam.attemptId || "");
          const durationMinutes = Number(exam.duration);
          if (Number.isFinite(durationMinutes) && durationMinutes > 0) {
            setExamDurationSeconds(Math.max(60, Math.floor(durationMinutes * 60)));
          }
          // Transform DB sections to match the format expected by the quiz
          const sections = (exam.sections || []).map((section, sIdx) => ({
            id: section._id || sIdx + 1,
            title: section.title || `Section ${sIdx + 1}`,
            icon: "",
            color: "",
            description: "",
            questions: (section.questions || []).map((q, qIdx) => ({
              id: q._id || `s${sIdx}-q${qIdx}`,
              question: q.question,
              codeSnippet: q.codeSnippet || "",
              codeLanguage: q.codeLanguage || "javascript",
              image: null,
              options: q.options,
            })),
          }));
          setQuizSections(sections);
        }
      } catch (err) {
        console.error("Failed to load active exam:", err);
        toast.error("No active exam found. Please contact HR.");
      } finally {
        setExamLoading(false);
      }
    };
    loadExam();
  }, []);

  const finishQuiz = useCallback(async () => {
    try {
      if (!attemptId) {
        throw new Error("Exam attempt was not initialized. Please refresh and try again.");
      }

      const response = await quizResultAPI.submitAttempt({ attemptId, answers });
      if (!response?.success) {
        throw new Error(response?.message || "Failed to submit quiz.");
      }

      const savedSections = response?.data?.sectionWiseMarks || [];
      const scores = {};
      savedSections.forEach((section, idx) => {
        scores[idx] = Number(section?.marks || 0);
      });
      setSectionScores(scores);
      toast.success("Quiz submitted successfully!");
    } catch (submitError) {
      console.error("Quiz submit failed:", submitError);
      toast.error(submitError?.message || "Failed to submit quiz. Please contact support.");
      return;
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
  }, [answers, attemptId, navigate]);

  useEffect(() => {
    if (examLoading) {
      return;
    }

    let intervalId;
    let cancelled = false;

    const init = async () => {
      try {
        const me = await candidateMeAPI.getMe();
        if (!me?.success || !me.data?.email || cancelled) return;

        const totalSeconds = Math.max(60, examDurationSeconds);
        const timeDetailsResp = await userTimeDetailsAPI.getByEmail(me.data.email).catch(() => null);
        if (cancelled) return;

        const record = timeDetailsResp?.data || null;
        let startMs = record?.startTime ? new Date(record.startTime).getTime() : null;
        const hasCompleted = !!(record?.completionTime || record?.endTime);
        const isExpired = startMs ? ((Date.now() - startMs) / 1000) >= totalSeconds : false;

        if (hasCompleted) {
          toast.error("Your exam attempt is already completed.");
          navigate("/user-dashboard");
          return;
        }

        if (!startMs) {
          const startResp = await userTimeDetailsAPI.start().catch(() => null);
          const apiStartTime = startResp?.data?.startTime
            ? new Date(startResp.data.startTime).getTime()
            : Date.now();
          startMs = apiStartTime;
        }

        if (isExpired) {
          timeoutTriggeredRef.current = true;
          setTimeLeft(0);
          if (finishQuizRef.current) {
            finishQuizRef.current();
          }
          return;
        }

        const tick = () => {
          const elapsed = Math.floor((Date.now() - startMs) / 1000);
          const remaining = totalSeconds - elapsed;
          if (remaining <= 0) {
            timeoutTriggeredRef.current = true;
            setTimeLeft(0);
            if (intervalId) {
              clearInterval(intervalId);
            }
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
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [examDurationSeconds, examLoading, navigate]);

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

  useEffect(() => {
    attemptIdRef.current = attemptId;
  }, [attemptId]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (!attemptId) return;
    if (Object.keys(answers).length === 0) return;

    const timer = setTimeout(() => {
      examAPI.autosaveAttempt(attemptId, answers, 0).catch(() => {});
    }, 800);

    return () => clearTimeout(timer);
  }, [attemptId, answers]);

  const handleOptionSelect = (optionIndex, questionId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
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

  if (examLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!quizSections.length) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl p-8 shadow-sm border border-gray-200 max-w-md">
          <p className="text-gray-700 text-lg font-semibold mb-2">No Active Exam</p>
          <p className="text-gray-500 text-sm mb-4">There is no active exam available at the moment. Please contact HR.</p>
          <button
            onClick={() => navigate("/user-dashboard")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (stage === QUIZ_STAGES.QUIZ) {
    const section = quizSections[currentSection];
   return (
  <div
    className="min-h-screen bg-gray-100 px-4 sm:px-6 lg:px-8 flex flex-col items-center py-10 transition-all duration-500 ease-in-out"
    style={{ userSelect: "none", WebkitUserSelect: "none", MozUserSelect: "none", msUserSelect: "none" }}
    onDragStart={(e) => e.preventDefault()}
  >
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
              <div className="flex-1">
                <h2 className="text-lg md:text-xl font-semibold text-gray-800">
                  {question.question}
                </h2>
                {question.codeSnippet && (
                  <div className="mt-4 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-sm text-left">
                    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                        {question.codeLanguage || "code"}
                      </span>
                    </div>
                    <pre className="overflow-x-auto px-4 py-4 text-sm leading-6 text-slate-100 text-left">
                      <code>{question.codeSnippet}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {question.options.map((option, index) => {
                const isSelected = answers[question.id] === index;
                return (
                  <label
                    key={index}
                    className={`flex items-center p-4 rounded-lg cursor-pointer border transition-all duration-200 ease-in-out transform active:scale-95 ${
                      isSelected
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 bg-white hover:bg-gray-50 hover:shadow-sm"
                    }`}
                    onClick={(e) => { e.preventDefault(); handleOptionSelect(index, question.id); }}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={index}
                      checked={isSelected}
                      readOnly
                      className="hidden"
                    />

                    <div
                      className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center transition-all duration-200 ${
                        isSelected
                          ? "border-blue-600"
                          : "border-gray-400"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2.5 h-2.5 bg-blue-600 rounded-full transition-all duration-200 scale-100" />
                      )}
                    </div>

                    <span className="text-gray-700 font-medium">
                      {option}
                    </span>
                  </label>
                );
              })}
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
    {/* Tab-switch warning overlay */}
    {tabWarningVisible && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "460px",
            background: "white",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚠️</div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#dc2626", marginBottom: "8px" }}>
            Tab Switch Detected!
          </h2>
          <p style={{ color: "#374151", marginBottom: "6px" }}>
            You switched away from the exam tab. This is not allowed.
          </p>
          <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "16px" }}>
            Warnings remaining: <strong>{Math.max(0, MAX_TAB_VIOLATIONS - tabViolationCount.current)}</strong>
          </p>
          <button
            onClick={() => setTabWarningVisible(false)}
            className="px-6 py-3 rounded-lg text-white font-bold bg-red-600 hover:bg-red-700 transition-colors"
          >
            Return to Exam
          </button>
        </div>
      </div>
    )}
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
              className="px-6 py-3 rounded-lg text-white font-bold bg-linear-to-r from-blue-600 to-indigo-600"
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

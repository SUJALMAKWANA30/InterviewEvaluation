export const QUIZ_STAGES = {
  HOME: "home",
  QUIZ: "quiz",
  RESULTS: "results",
};

export const QUIZ_CONFIG = {
  TIMER_DURATION: 1800,
};

export const GRADIENT_BG =
"linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);"
export const PERFORMANCE_LEVELS = {
  PERFECT: { threshold: 100, message: "Perfect Score! Outstanding Performance!", color: "text-yellow-200" },
  EXCELLENT: { threshold: 80, message: "Excellent! Well Done!", color: "text-green-200" },
  GOOD: { threshold: 60, message: "Good Job! Keep Practicing!", color: "text-blue-100" },
  AVERAGE: { threshold: 40, message: "Average! Study More!", color: "text-yellow-200" },
  POOR: { threshold: 0, message: "Keep Learning! Try Again!", color: "text-red-200" },
};

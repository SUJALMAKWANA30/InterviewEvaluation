export const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export const calculateAllScores = (quizSections, answers) => {
  const scores = {};
  quizSections.forEach((section, index) => {
    let score = 0;
    section.questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) {
        score++;
      }
    });
    scores[index] = score;
  });
  return scores;
};

export const calculateSectionScore = (questions, answers) => {
  let score = 0;
  questions.forEach((q) => {
    if (answers[q.id] === q.correctAnswer) {
      score++;
    }
  });
  return score;
};

export const calculatePercentage = (score, total) => {
  return Math.round((score / total) * 100);
};

export const getTotalQuestions = (quizSections) => {
  return quizSections.reduce((acc, section) => acc + section.questions.length, 0);
};

export const getTotalMarks = (quizSections) => {
  return getTotalQuestions(quizSections);
};

export const getPerformanceMessage = (percentage, levels) => {
  if (percentage === 100) return levels.PERFECT.message;
  if (percentage >= 80) return levels.EXCELLENT.message;
  if (percentage >= 60) return levels.GOOD.message;
  if (percentage >= 40) return levels.AVERAGE.message;
  return levels.POOR.message;
};

export const getPerformanceColor = (percentage, levels) => {
  if (percentage === 100) return levels.PERFECT.color;
  if (percentage >= 80) return levels.EXCELLENT.color;
  if (percentage >= 60) return levels.GOOD.color;
  if (percentage >= 40) return levels.AVERAGE.color;
  return levels.POOR.color;
};

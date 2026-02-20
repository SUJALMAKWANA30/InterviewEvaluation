import QuizResult from "../models/QuizResult.js";

export const createQuizResult = async (req, res) => {
  try {
    const { email, mobileNumber, name, sectionWiseMarks, totalMarks } = req.body;
    const newQuizResult = new QuizResult({
      email,
      mobileNumber,
      name,
      sectionWiseMarks,
      totalMarks,
      examDate: new Date(),
    });
    await newQuizResult.save();
    res.status(201).json({
      success: true,
      message: "Quiz result created successfully",
      data: newQuizResult,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating quiz result",
      error: error.message,
    });
  }
};

export const getAllQuizResults = async (req, res) => {
  try {
    const quizResults = await QuizResult.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: quizResults,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch quiz results",
      error: error.message,
    });
  }
};

export const getQuizResultById = async (req, res) => {
  try {
    const quizResult = await QuizResult.findById(req.params.id);
    if (!quizResult) {
      return res.status(404).json({
        success: false,
        message: "Quiz result not found",
      });
    }
    res.status(200).json({
      success: true,
      data: quizResult,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching quiz result",
      error: error.message,
    });
  }
};

export const getQuizResultByEmail = async (req, res) => {
  try {
    const quizResult = await QuizResult.findOne({ email: req.params.email });
    if (!quizResult) {
      return res.status(404).json({
        success: false,
        message: "Quiz result not found for this email",
      });
    }
    res.status(200).json({
      success: true,
      data: quizResult,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching quiz result",
      error: error.message,
    });
  }
};

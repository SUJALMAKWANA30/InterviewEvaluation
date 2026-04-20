/**
 * Input validation middleware
 * Lightweight validation without extra dependencies
 */

/**
 * Validate candidate registration input
 */
export const validateCandidateRegistration = (req, res, next) => {
  const errors = [];
  const { firstName, lastName, email, phone, password } = req.body;

  if (!firstName || typeof firstName !== "string" || firstName.trim().length < 1) {
    errors.push("First name is required.");
  }
  if (!lastName || typeof lastName !== "string" || lastName.trim().length < 1) {
    errors.push("Last name is required.");
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Valid email is required.");
  }
  if (!phone || !/^[0-9]{10,15}$/.test(phone.replace(/[\s\-+()]/g, ""))) {
    errors.push("Valid phone number is required (10-15 digits).");
  }
  if (!password || password.length < 6) {
    errors.push("Password must be at least 6 characters.");
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: "Validation failed", errors });
  }

  // Sanitize
  req.body.firstName = firstName.trim();
  req.body.lastName = lastName.trim();
  req.body.email = email.trim().toLowerCase();
  req.body.phone = phone.trim();

  next();
};

/**
 * Validate candidate login input
 */
export const validateLogin = (req, res, next) => {
  const errors = [];
  const { email, password } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Valid email is required.");
  }
  if (!password || password.length < 1) {
    errors.push("Password is required.");
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: "Validation failed", errors });
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

/**
 * Validate forgot password request
 */
export const validateForgotPasswordRequest = (req, res, next) => {
  const errors = [];
  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Valid email is required.");
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: "Validation failed", errors });
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

/**
 * Validate reset password request
 */
export const validateResetPasswordRequest = (req, res, next) => {
  const errors = [];
  const { token, newPassword, confirmPassword } = req.body;

  if (!token || typeof token !== "string" || token.trim().length < 10) {
    errors.push("Valid reset token is required.");
  }

  if (!newPassword || typeof newPassword !== "string") {
    errors.push("New password is required.");
  } else {
    const hasMinLength = newPassword.length >= 8;
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

    if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecial) {
      errors.push(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
      );
    }
  }

  if (confirmPassword !== newPassword) {
    errors.push("Confirm password must match new password.");
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: "Validation failed", errors });
  }

  req.body.token = token.trim();
  next();
};

/**
 * Validate HR login input
 */
export const validateHRLogin = (req, res, next) => {
  const errors = [];
  const { email, password } = req.body;

  if (!email || email.trim().length < 1) {
    errors.push("Email is required.");
  }
  if (!password || password.length < 1) {
    errors.push("Password is required.");
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: "Validation failed", errors });
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

/**
 * Validate drive creation/update
 */
export const validateDrive = (req, res, next) => {
  const errors = [];
  const { name, location, examCenters } = req.body;

  if (!name || typeof name !== "string" || name.trim().length < 1) {
    errors.push("Drive name is required.");
  }
  if (!location || typeof location !== "string" || location.trim().length < 1) {
    errors.push("Location is required.");
  }

  if (!Array.isArray(examCenters) || examCenters.length < 1) {
    errors.push("At least one exam center is required.");
  } else {
    examCenters.forEach((center, index) => {
      const lat = Number(center?.lat);
      const lon = Number(center?.lon);
      const radiusMeters = Number(center?.radiusMeters);
      const centerName = (center?.name || "").toString().trim();

      if (!centerName) {
        errors.push(`Exam center #${index + 1}: name is required.`);
      }
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        errors.push(`Exam center #${index + 1}: latitude must be between -90 and 90.`);
      }
      if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
        errors.push(`Exam center #${index + 1}: longitude must be between -180 and 180.`);
      }
      if (!Number.isFinite(radiusMeters) || radiusMeters < 10) {
        errors.push(`Exam center #${index + 1}: radius must be at least 10 meters.`);
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: "Validation failed", errors });
  }

  req.body.name = name.trim();
  req.body.location = location.trim();
  req.body.examCenters = examCenters.map((center, index) => ({
    name: (center.name || `Center ${index + 1}`).toString().trim(),
    lat: Number(center.lat),
    lon: Number(center.lon),
    radiusMeters: Number(center.radiusMeters),
    isActive: center?.isActive !== false,
    priority: Number.isFinite(Number(center?.priority)) ? Number(center.priority) : index,
  }));
  next();
};

/**
 * Validate exam creation
 */
export const validateExam = (req, res, next) => {
  const errors = [];
  const { title, duration, sections } = req.body;

  if (!title || typeof title !== "string" || title.trim().length < 1) {
    errors.push("Exam title is required.");
  }
  if (!duration || typeof duration !== "number" || duration < 1) {
    errors.push("Valid duration (in minutes) is required.");
  }
  if (!sections || !Array.isArray(sections) || sections.length < 1) {
    errors.push("At least one section is required.");
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: "Validation failed", errors });
  }

  req.body.title = title.trim();
  next();
};

/**
 * Validate role creation
 */
export const validateRole = (req, res, next) => {
  const errors = [];
  const { name } = req.body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    errors.push("Role name must be at least 2 characters.");
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: "Validation failed", errors });
  }

  req.body.name = name.trim();
  next();
};

/**
 * Validate user (admin) creation
 */
export const validateUserCreation = (req, res, next) => {
  const errors = [];
  const { name, email, password, roleId } = req.body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    errors.push("Name must be at least 2 characters.");
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Valid email is required.");
  }
  if (!password || password.length < 8) {
    errors.push("Password must be at least 8 characters.");
  }
  if (!roleId) {
    errors.push("Role is required.");
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: "Validation failed", errors });
  }

  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  next();
};

/**
 * Validate MongoDB ObjectId parameter
 */
export const validateObjectId = (paramName = "id") => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format.`,
      });
    }
    next();
  };
};

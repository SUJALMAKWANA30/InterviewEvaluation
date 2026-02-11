/**
 * Form Validation Utilities
 * Validation functions for different form inputs
 */

/**
 * Email validation
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Password validation
 * Requires: min 8 chars, 1 uppercase, 1 lowercase, 1 number
 */
export const validatePassword = (password) => {
  const minLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return {
    isValid: minLength && hasUpperCase && hasLowerCase && hasNumber,
    errors: {
      minLength: !minLength ? 'Password must be at least 8 characters' : '',
      hasUpperCase: !hasUpperCase ? 'Password must contain uppercase letter' : '',
      hasLowerCase: !hasLowerCase ? 'Password must contain lowercase letter' : '',
      hasNumber: !hasNumber ? 'Password must contain a number' : '',
    },
  };
};

/**
 * Phone number validation
 */
export const validatePhone = (phone) => {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  const isValid = phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  return isValid;
};

/**
 * Name validation
 */
export const validateName = (name) => {
  const nameRegex = /^[a-zA-Z\s'-]{2,}$/;
  return nameRegex.test(name);
};

/**
 * Unique ID format validation
 */
export const validateUniqueId = (id) => {
  // UUID v4 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Form data validation object
 */
export const validateFormData = (data, schema) => {
  const errors = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    if (rules.required && !value) {
      errors[field] = `${field} is required`;
      continue;
    }

    if (rules.type === 'email' && value && !validateEmail(value)) {
      errors[field] = 'Invalid email address';
    }

    if (rules.type === 'password' && value) {
      const validation = validatePassword(value);
      if (!validation.isValid) {
        errors[field] = Object.values(validation.errors)
          .filter((e) => e)
          .join(', ');
      }
    }

    if (rules.type === 'phone' && value && !validatePhone(value)) {
      errors[field] = 'Invalid phone number';
    }

    if (rules.type === 'name' && value && !validateName(value)) {
      errors[field] = 'Invalid name format';
    }

    if (rules.minLength && value && value.length < rules.minLength) {
      errors[field] = `${field} must be at least ${rules.minLength} characters`;
    }

    if (rules.maxLength && value && value.length > rules.maxLength) {
      errors[field] = `${field} must not exceed ${rules.maxLength} characters`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// ============ Validation Schemas ============

export const registrationSchema = {
  firstName: { required: true, type: 'name' },
  lastName: { required: true, type: 'name' },
  email: { required: true, type: 'email' },
  phone: { required: true, type: 'phone' },
  password: { required: true, type: 'password' },
  confirmPassword: { required: true, type: 'password' },
};

export const loginSchema = {
  email: { required: true, type: 'email' },
  password: { required: true, minLength: 1 },
};

export const hrRegistrationSchema = {
  name: { required: true, type: 'name' },
  email: { required: true, type: 'email' },
  password: { required: true, type: 'password' },
  companyName: { required: true, minLength: 2 },
};

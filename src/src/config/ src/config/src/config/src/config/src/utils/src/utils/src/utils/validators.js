// src/utils/validators.js
const validator = require('validator');

const validateEmail = (email) => {
  return validator.isEmail(email);
};

const validatePhone = (phone) => {
  // Burundi phone format: +257 XX XXX XXX
  return /^\+257[0-9]{8}$/.test(phone);
};

const validatePassword = (password) => {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(password);
};

const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return validator.escape(input.trim());
  }
  return input;
};

const validateUUID = (uuid) => {
  return validator.isUUID(uuid);
};

const validatePagination = (page, limit, maxLimit = 100) => {
  const validPage = Math.max(1, parseInt(page) || 1);
  const validLimit = Math.min(maxLimit, Math.max(1, parseInt(limit) || 20));
  return { page: validPage, limit: validLimit };
};

module.exports = {
  validateEmail,
  validatePhone,
  validatePassword,
  sanitizeInput,
  validateUUID,
  validatePagination,
};

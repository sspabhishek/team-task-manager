/**
 * Validation helper functions
 */

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateRequired(fields, body) {
  const missing = [];
  for (const field of fields) {
    if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
      missing.push(field);
    }
  }
  return missing;
}

function validateLength(value, min, max, fieldName) {
  if (typeof value !== 'string') return `${fieldName} must be a string`;
  if (value.trim().length < min) return `${fieldName} must be at least ${min} characters`;
  if (value.trim().length > max) return `${fieldName} must be at most ${max} characters`;
  return null;
}

function validateEnum(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    return `${fieldName} must be one of: ${allowedValues.join(', ')}`;
  }
  return null;
}

function validateDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return 'Invalid date format';
  return null;
}

module.exports = { isValidEmail, validateRequired, validateLength, validateEnum, validateDate };

/**
 * Request Validation Middleware
 * 
 * This middleware provides request validation for common API endpoints.
 * It works with the error handler to present consistent error responses.
 */

const { AppError, ErrorTypes } = require('./errorHandler');

/**
 * Validates that required fields are present in the request body
 * @param {Array} fields - Array of field names to check
 */
const validateRequiredFields = (fields) => (req, res, next) => {
  const missingFields = fields.filter(field => !req.body[field]);
  
  if (missingFields.length > 0) {
    throw new AppError(
      `Missing required fields: ${missingFields.join(', ')}`,
      ErrorTypes.VALIDATION,
      400,
      { missingFields }
    );
  }
  
  next();
};

/**
 * Validates specified fields against minimum length requirements
 * @param {Object} fieldLengths - Object mapping field names to minimum lengths
 */
const validateFieldLengths = (fieldLengths) => (req, res, next) => {
  const invalidFields = Object.entries(fieldLengths)
    .filter(([field, minLength]) => 
      req.body[field] && req.body[field].length < minLength
    )
    .map(([field, minLength]) => ({
      field,
      minLength,
      actualLength: req.body[field] ? req.body[field].length : 0
    }));
  
  if (invalidFields.length > 0) {
    throw new AppError(
      'Field length requirements not met',
      ErrorTypes.VALIDATION,
      400,
      { invalidFields }
    );
  }
  
  next();
};

/**
 * Validates email format in request body
 * @param {string} fieldName - Name of the email field to check (default: 'email')
 */
const validateEmail = (fieldName = 'email') => (req, res, next) => {
  const email = req.body[fieldName];
  
  if (!email) {
    return next();
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError(
      'Invalid email format',
      ErrorTypes.VALIDATION,
      400,
      { field: fieldName, value: email }
    );
  }
  
  next();
};

/**
 * Validates that a field matches an enum of allowed values
 * @param {string} fieldName - Name of the field to validate
 * @param {Array} allowedValues - Array of permitted values
 */
const validateEnum = (fieldName, allowedValues) => (req, res, next) => {
  const value = req.body[fieldName];
  
  if (!value) {
    return next();
  }
  
  if (!allowedValues.includes(value)) {
    throw new AppError(
      `Invalid value for ${fieldName}`,
      ErrorTypes.VALIDATION,
      400,
      { 
        field: fieldName, 
        providedValue: value, 
        allowedValues 
      }
    );
  }
  
  next();
};

/**
 * Validates payment request data
 */
const validatePaymentRequest = (req, res, next) => {
  const { plan, userId, email } = req.body;
  
  const errors = [];
  
  if (!plan) errors.push('plan');
  if (!userId) errors.push('userId');
  if (!email) errors.push('email');
  
  if (errors.length > 0) {
    throw new AppError(
      `Missing required payment fields: ${errors.join(', ')}`,
      ErrorTypes.VALIDATION,
      400,
      { missingFields: errors }
    );
  }
  
  // Check plan is valid
  const validPlans = ['monthly', 'semiannual', 'annual'];
  if (!validPlans.includes(plan)) {
    throw new AppError(
      'Invalid subscription plan',
      ErrorTypes.VALIDATION,
      400,
      { 
        field: 'plan', 
        providedValue: plan, 
        allowedValues: validPlans 
      }
    );
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError(
      'Invalid email format',
      ErrorTypes.VALIDATION,
      400,
      { field: 'email', value: email }
    );
  }
  
  next();
};

/**
 * Validates subscription data
 */
const validateSubscription = (req, res, next) => {
  const { userId, plan, startDate, endDate } = req.body;
  
  const errors = [];
  
  if (!userId) errors.push('userId');
  if (!plan) errors.push('plan');
  
  if (errors.length > 0) {
    throw new AppError(
      `Missing required subscription fields: ${errors.join(', ')}`,
      ErrorTypes.VALIDATION,
      400,
      { missingFields: errors }
    );
  }
  
  // Check plan is valid
  const validPlans = ['monthly', 'semiannual', 'annual'];
  if (!validPlans.includes(plan)) {
    throw new AppError(
      'Invalid subscription plan',
      ErrorTypes.VALIDATION,
      400,
      { 
        field: 'plan', 
        providedValue: plan, 
        allowedValues: validPlans 
      }
    );
  }
  
  // Check date validity if provided
  if (startDate && endDate) {
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime())) {
      throw new AppError(
        'Invalid start date',
        ErrorTypes.VALIDATION,
        400,
        { field: 'startDate', value: startDate }
      );
    }
    
    if (isNaN(endDateObj.getTime())) {
      throw new AppError(
        'Invalid end date',
        ErrorTypes.VALIDATION,
        400,
        { field: 'endDate', value: endDate }
      );
    }
    
    if (endDateObj <= startDateObj) {
      throw new AppError(
        'End date must be after start date',
        ErrorTypes.VALIDATION,
        400,
        { 
          startDate: startDateObj.toISOString(),
          endDate: endDateObj.toISOString()
        }
      );
    }
  }
  
  next();
};

module.exports = {
  validateRequiredFields,
  validateFieldLengths,
  validateEmail,
  validateEnum,
  validatePaymentRequest,
  validateSubscription
}; 
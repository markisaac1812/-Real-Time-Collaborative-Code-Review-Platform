import {
    validateSubmissionCreation,
    validateSubmissionUpdate,
    validateReviewerAssignment,
    validateSearchQuery
  } from '../validations/submissionValidation.js';
  import AppError from '../utils/appError.js';
  
  export const validateCreateSubmission = (req, res, next) => {
    const { error, value } = validateSubmissionCreation(req.body);
    
    if (error) {
      const messages = error.details.map(detail => detail.message);
      return next(new AppError(`Validation Error: ${messages.join('; ')}`, 400));
    }
    
    req.body = value;
    next();
  };
  
  export const validateUpdateSubmission = (req, res, next) => {
    const { error, value } = validateSubmissionUpdate(req.body);
    
    if (error) {
      const messages = error.details.map(detail => detail.message);
      return next(new AppError(`Validation Error: ${messages.join('; ')}`, 400));
    }
    
    req.body = value;
    next();
  };
  
  export const validateAssignReviewer = (req, res, next) => {
    const { error, value } = validateReviewerAssignment(req.body);
    
    if (error) {
      const message = error.details[0].message;
      return next(new AppError(message, 400));
    }
    
    req.body = value;
    next();
  };
  
  export const validateSearch = (req, res, next) => {
    const { error, value } = validateSearchQuery(req.query);
    
    if (error) {
      const messages = error.details.map(detail => detail.message);
      return next(new AppError(`Search Validation Error: ${messages.join('; ')}`, 400));
    }
    
    req.validatedQuery = value;
    next();
  };
import {
  validateReviewCreation,
  validateReviewUpdate,
  validateLineComment,
  validateReviewerAssignment,
  validateAutoAssignment,
} from "../validations/reviewValidation.js";
import AppError from "../utils/appError.js";

export const validateCreateReview = (req, res, next) => {
    const { error, value } = validateReviewCreation(req.body);
    
    if (error) {
      const messages = error.details.map(detail => detail.message);
      return next(new AppError(`Validation Error: ${messages.join('; ')}`, 400));
    }
    
    req.body = value;
    next();
  };
  
  export const validateUpdateReview = (req, res, next) => {
    const { error, value } = validateReviewUpdate(req.body);
    
    if (error) {
      const messages = error.details.map(detail => detail.message);
      return next(new AppError(`Validation Error: ${messages.join('; ')}`, 400));
    }
    
    req.body = value;
    next();
  };
  
  export const validateAddLineComment = (req, res, next) => {
    const { error, value } = validateLineComment(req.body);
    
    if (error) {
      const message = error.details[0].message;
      return next(new AppError(message, 400));
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
  
  export const validateAutoAssign = (req, res, next) => {
    const { error, value } = validateAutoAssignment(req.body);
    
    if (error) {
      const message = error.details[0].message;
      return next(new AppError(message, 400));
    }
    
    req.body = value;
    next();
  };

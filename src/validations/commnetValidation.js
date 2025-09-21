import Joi from 'joi';

export const validateCreateComment = (req, res, next) => {
  const schema = Joi.object({
    content: Joi.string()
      .trim()
      .min(1)
      .max(1000)
      .required()
      .messages({
        'string.min': 'Comment cannot be empty',
        'string.max': 'Comment cannot exceed 1000 characters',
        'any.required': 'Comment content is required'
      }),
    
    parentCommentId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .allow(null)
      .messages({
        'string.pattern.base': 'Invalid parent comment ID format'
      })
  });

  const { error, value } = schema.validate(req.body);
  
  if (error) {
    const message = error.details[0].message;
    return next(new AppError(message, 400));
  }
  
  req.body = value;
  next();
};

export const validateUpdateComment = (req, res, next) => {
  const schema = Joi.object({
    content: Joi.string()
      .trim()
      .min(1)
      .max(1000)
      .required()
      .messages({
        'string.min': 'Comment cannot be empty',
        'string.max': 'Comment cannot exceed 1000 characters',
        'any.required': 'Comment content is required'
      })
  });

  const { error, value } = schema.validate(req.body);
  
  if (error) {
    const message = error.details[0].message;
    return next(new AppError(message, 400));
  }
  
  req.body = value;
  next();
};

export const validateReaction = (req, res, next) => {
  const schema = Joi.object({
    reaction: Joi.string()
      .valid('like', 'dislike')
      .required()
      .messages({
        'any.only': 'Reaction must be either "like" or "dislike"',
        'any.required': 'Reaction is required'
      })
  });

  const { error, value } = schema.validate(req.body);
  
  if (error) {
    const message = error.details[0].message;
    return next(new AppError(message, 400));
  }
  
  req.body = value;
  next();
};
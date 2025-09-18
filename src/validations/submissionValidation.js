import Joi from 'joi';

export const validateSubmissionCreation = (data) => {
  const schema = Joi.object({
    title: Joi.string()
      .trim()
      .min(5)
      .max(100)
      .required()
      .messages({
        'string.min': 'Title must be at least 5 characters long',
        'string.max': 'Title cannot exceed 100 characters',
        'any.required': 'Title is required'
      }),
    
    description: Joi.string()
      .trim()
      .min(10)
      .max(1000)
      .required()
      .messages({
        'string.min': 'Description must be at least 10 characters long',
        'string.max': 'Description cannot exceed 1000 characters',
        'any.required': 'Description is required'
      }),
    
    code: Joi.string()
      .min(1)
      .max(50000)
      .required()
      .messages({
        'string.min': 'Code cannot be empty',
        'string.max': 'Code cannot exceed 50,000 characters',
        'any.required': 'Code is required'
      }),
    
    language: Joi.string()
      .valid(
        'javascript', 'python', 'java', 'csharp', 'cpp', 'c',
        'ruby', 'go', 'rust', 'php', 'typescript', 'swift',
        'kotlin', 'scala', 'html', 'css', 'sql', 'other'
      )
      .required()
      .messages({
        'any.only': 'Please select a valid programming language',
        'any.required': 'Programming language is required'
      }),
    
    tags: Joi.array()
      .items(
        Joi.string()
          .trim()
          .min(1)
          .max(30)
          .pattern(/^[a-zA-Z0-9\-_+#\.]+$/)
          .messages({
            'string.pattern.base': 'Tags can only contain letters, numbers, hyphens, underscores, plus, hash, and dots'
          })
      )
      .max(10)
      .unique()
      .messages({
        'array.max': 'Cannot have more than 10 tags',
        'array.unique': 'Tags must be unique'
      }),
    
    category: Joi.string()
      .valid('bug-fix', 'feature', 'optimization', 'learning', 'refactoring')
      .default('learning'),
    
    priority: Joi.string()
      .valid('low', 'medium', 'high')
      .default('medium'),
    
    visibility: Joi.string()
      .valid('public', 'private', 'team')
      .default('public'),
    
    fileName: Joi.string()
      .trim()
      .max(255)
      .pattern(/^[a-zA-Z0-9\-_\.\s]+$/)
      .messages({
        'string.pattern.base': 'Filename contains invalid characters'
      })
  });

  return schema.validate(data);
};

export const validateSubmissionUpdate = (data) => {
  const schema = Joi.object({
    title: Joi.string()
      .trim()
      .min(5)
      .max(100),
    
    description: Joi.string()
      .trim()
      .min(10)
      .max(1000),
    
    code: Joi.string()
      .min(1)
      .max(50000),
    
    tags: Joi.array()
      .items(
        Joi.string()
          .trim()
          .min(1)
          .max(30)
          .pattern(/^[a-zA-Z0-9\-_+#\.]+$/)
      )
      .max(10)
      .unique(),
    
    category: Joi.string()
      .valid('bug-fix', 'feature', 'optimization', 'learning', 'refactoring'),
    
    priority: Joi.string()
      .valid('low', 'medium', 'high'),
    
    visibility: Joi.string()
      .valid('public', 'private', 'team')
  });

  return schema.validate(data);
};

export const validateReviewerAssignment = (data) => {
  const schema = Joi.object({
    reviewerId: Joi.string()
      .required()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .messages({
        'string.pattern.base': 'Invalid reviewer ID format',
        'any.required': 'Reviewer ID is required'
      })
  });

  return schema.validate(data);
};

export const validateSearchQuery = (data) => {
  const schema = Joi.object({
    q: Joi.string()
      .trim()
      .min(1)
      .max(100),
    
    language: Joi.string()
      .valid(
        'javascript', 'python', 'java', 'csharp', 'cpp', 'c',
        'ruby', 'go', 'rust', 'php', 'typescript', 'swift',
        'kotlin', 'scala', 'html', 'css', 'sql', 'other'
      ),
    
    tags: Joi.string()
      .pattern(/^[a-zA-Z0-9\-_+#\.,\s]+$/)
      .messages({
        'string.pattern.base': 'Invalid characters in tags filter'
      }),
    
    category: Joi.string()
      .valid('bug-fix', 'feature', 'optimization', 'learning', 'refactoring'),
    
    status: Joi.string()
      .valid('open', 'in-review', 'completed', 'closed', 'all'),
    
    priority: Joi.string()
      .valid('low', 'medium', 'high'),
    
    sortBy: Joi.string()
      .valid('relevance', 'newest', 'oldest', 'mostViewed', 'highestRated')
      .default('relevance'),
    
    page: Joi.number()
      .integer()
      .min(1)
      .default(1),
    
    limit: Joi.number()
      .integer()
      .min(1)
      .max(50)
      .default(10),
    
    minRating: Joi.number()
      .min(1)
      .max(5),
    
    maxRating: Joi.number()
      .min(1)
      .max(5),
    
    dateFrom: Joi.date()
      .iso(),
    
    dateTo: Joi.date()
      .iso()
      .min(Joi.ref('dateFrom'))
      .messages({
        'date.min': 'End date must be after start date'
      })
  });

  return schema.validate(data);
};

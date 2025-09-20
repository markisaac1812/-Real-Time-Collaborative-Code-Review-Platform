import Joi from 'joi';

export const validateReviewCreation = (data) => {
  const schema = Joi.object({
    overallFeedback: Joi.string()
      .trim()
      .min(20)
      .max(2000)
      .required()
      .messages({
        'string.min': 'Overall feedback must be at least 20 characters long',
        'string.max': 'Overall feedback cannot exceed 2000 characters',
        'any.required': 'Overall feedback is required'
      }),
    
    rating: Joi.number()
      .integer()
      .min(1)
      .max(5)
      .required()
      .messages({
        'number.min': 'Rating must be at least 1',
        'number.max': 'Rating cannot exceed 5',
        'any.required': 'Rating is required'
      }),
    
    lineComments: Joi.array()
      .items(
        Joi.object({
          lineNumber: Joi.number()
            .integer()
            .min(1)
            .required()
            .messages({
              'number.min': 'Line number must be at least 1',
              'any.required': 'Line number is required for line comments'
            }),
          
          comment: Joi.string()
            .trim()
            .min(1)
            .max(500)
            .required()
            .messages({
              'string.min': 'Line comment cannot be empty',
              'string.max': 'Line comment cannot exceed 500 characters',
              'any.required': 'Comment text is required'
            }),
          
          severity: Joi.string()
            .valid('info', 'warning', 'error')
            .default('info'),
          
          suggestion: Joi.string()
            .trim()
            .max(500)
            .allow('')
            .messages({
              'string.max': 'Suggestion cannot exceed 500 characters'
            })
        })
      )
      .max(50)
      .messages({
        'array.max': 'Cannot have more than 50 line comments'
      }),
    
    categories: Joi.object({
      codeQuality: Joi.number()
        .integer()
        .min(1)
        .max(5)
        .required()
        .messages({
          'number.min': 'Code quality rating must be at least 1',
          'number.max': 'Code quality rating cannot exceed 5',
          'any.required': 'Code quality rating is required'
        }),
      
      performance: Joi.number()
        .integer()
        .min(1)
        .max(5)
        .required()
        .messages({
          'number.min': 'Performance rating must be at least 1',
          'number.max': 'Performance rating cannot exceed 5',
          'any.required': 'Performance rating is required'
        }),
      
      security: Joi.number()
        .integer()
        .min(1)
        .max(5)
        .required()
        .messages({
          'number.min': 'Security rating must be at least 1',
          'number.max': 'Security rating cannot exceed 5',
          'any.required': 'Security rating is required'
        }),
      
      maintainability: Joi.number()
        .integer()
        .min(1)
        .max(5)
        .required()
        .messages({
          'number.min': 'Maintainability rating must be at least 1',
          'number.max': 'Maintainability rating cannot exceed 5',
          'any.required': 'Maintainability rating is required'
        }),
      
      bestPractices: Joi.number()
        .integer()
        .min(1)
        .max(5)
        .required()
        .messages({
          'number.min': 'Best practices rating must be at least 1',
          'number.max': 'Best practices rating cannot exceed 5',
          'any.required': 'Best practices rating is required'
        })
    })
    .required()
    .messages({
      'any.required': 'Category ratings are required'
    }),
    
    suggestions: Joi.array()
      .items(
        Joi.object({
          type: Joi.string()
            .valid('refactor', 'optimization', 'security-fix', 'style', 'logic')
            .required()
            .messages({
              'any.only': 'Invalid suggestion type',
              'any.required': 'Suggestion type is required'
            }),
          
          description: Joi.string()
            .trim()
            .min(10)
            .max(300)
            .required()
            .messages({
              'string.min': 'Suggestion description must be at least 10 characters',
              'string.max': 'Suggestion description cannot exceed 300 characters',
              'any.required': 'Suggestion description is required'
            }),
          
          codeExample: Joi.string()
            .trim()
            .max(1000)
            .allow('')
            .messages({
              'string.max': 'Code example cannot exceed 1000 characters'
            }),
          
          priority: Joi.string()
            .valid('low', 'medium', 'high')
            .default('medium')
        })
      )
      .max(20)
      .messages({
        'array.max': 'Cannot have more than 20 suggestions'
      }),
    
    timeSpent: Joi.number()
      .min(0)
      .max(600) // Max 10 hours
      .messages({
        'number.min': 'Time spent cannot be negative',
        'number.max': 'Time spent cannot exceed 600 minutes (10 hours)'
      }),
    
    status: Joi.string()
      .valid('draft', 'submitted')
      .default('draft')
  });

  return schema.validate(data);
};

export const validateReviewUpdate = (data) => {
    const schema = Joi.object({
      overallFeedback: Joi.string()
        .trim()
        .min(20)
        .max(2000),
      
      rating: Joi.number()
        .integer()
        .min(1)
        .max(5),
      
      lineComments: Joi.array()
        .items(
          Joi.object({
            lineNumber: Joi.number().integer().min(1).required(),
            comment: Joi.string().trim().min(1).max(500).required(),
            severity: Joi.string().valid('info', 'warning', 'error').default('info'),
            suggestion: Joi.string().trim().max(500).allow('')
          })
        )
        .max(50),
      
      categories: Joi.object({
        codeQuality: Joi.number().integer().min(1).max(5),
        performance: Joi.number().integer().min(1).max(5),
        security: Joi.number().integer().min(1).max(5),
        maintainability: Joi.number().integer().min(1).max(5),
        bestPractices: Joi.number().integer().min(1).max(5)
      }),
      
      suggestions: Joi.array()
        .items(
          Joi.object({
            type: Joi.string().valid('refactor', 'optimization', 'security-fix', 'style', 'logic').required(),
            description: Joi.string().trim().min(10).max(300).required(),
            codeExample: Joi.string().trim().max(1000).allow(''),
            priority: Joi.string().valid('low', 'medium', 'high').default('medium')
          })
        )
        .max(20),
      
      timeSpent: Joi.number().min(0).max(600),
      status: Joi.string().valid('draft', 'submitted', 'revised')
    });
  
    return schema.validate(data);
  };
  
  export const validateLineComment = (data) => {
    const schema = Joi.object({
      lineNumber: Joi.number()
        .integer()
        .min(1)
        .required()
        .messages({
          'number.min': 'Line number must be at least 1',
          'any.required': 'Line number is required'
        }),
      
      comment: Joi.string()
        .trim()
        .min(1)
        .max(500)
        .required()
        .messages({
          'string.min': 'Comment cannot be empty',
          'string.max': 'Comment cannot exceed 500 characters',
          'any.required': 'Comment is required'
        }),
      
      severity: Joi.string()
        .valid('info', 'warning', 'error')
        .default('info'),
      
      suggestion: Joi.string()
        .trim()
        .max(500)
        .allow('')
        .messages({
          'string.max': 'Suggestion cannot exceed 500 characters'
        })
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
        }),
      
      message: Joi.string()
        .trim()
        .max(200)
        .allow('')
        .messages({
          'string.max': 'Message cannot exceed 200 characters'
        })
    });
  
    return schema.validate(data);
  };
  
  export const validateAutoAssignment = (data) => {
    const schema = Joi.object({
      maxReviewers: Joi.number()
        .integer()
        .min(1)
        .max(10)
        .default(3)
        .messages({
          'number.min': 'Must assign at least 1 reviewer',
          'number.max': 'Cannot assign more than 10 reviewers'
        }),
      
      minReputationLevel: Joi.string()
        .valid('Beginner', 'Intermediate', 'Expert', 'Master')
        .default('Beginner')
    });
  
    return schema.validate(data);
  };
import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'CodeReview Platform API',
    version: '1.0.0',
    description: 'A comprehensive API for real-time collaborative code review platform with advanced features including WebSockets, Redis caching, and background job processing.',
    contact: {
      name: 'API Support',
      email: 'support@codereview.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    },
    {
      url: 'https://api.codereview.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token'
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken',
        description: 'Refresh token stored in HTTP-only cookie'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
          username: { type: 'string', example: 'johndoe' },
          email: { type: 'string', example: 'john@example.com' },
          profile: {
            type: 'object',
            properties: {
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              bio: { type: 'string' },
              avatar: { type: 'string' },
              githubUsername: { type: 'string' },
              linkedinProfile: { type: 'string' }
            }
          },
          skills: {
            type: 'array',
            items: { type: 'string' },
            example: ['javascript', 'python', 'react']
          },
          reputation: {
            type: 'object',
            properties: {
              points: { type: 'number', example: 250 },
              level: { type: 'string', enum: ['Beginner', 'Intermediate', 'Expert', 'Master'] },
              reviewsGiven: { type: 'number' },
              reviewsReceived: { type: 'number' },
              helpfulVotes: { type: 'number' }
            }
          },
          role: { type: 'string', enum: ['user', 'moderator', 'admin'] },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      CodeSubmission: {
        type: 'object',
        required: ['title', 'description', 'code', 'language'],
        properties: {
          _id: { type: 'string' },
          title: { type: 'string', example: 'React Hook Optimization' },
          description: { type: 'string', example: 'Looking for feedback on my custom React hook' },
          code: { type: 'string', example: 'const useAPI = (url) => { ... }' },
          language: { 
            type: 'string', 
            enum: ['javascript', 'python', 'java', 'typescript', 'cpp', 'csharp', 'go', 'rust'],
            example: 'javascript'
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            example: ['react', 'hooks', 'optimization']
          },
          category: {
            type: 'string',
            enum: ['bug-fix', 'feature', 'optimization', 'learning', 'refactoring']
          },
          status: {
            type: 'string',
            enum: ['open', 'in-review', 'completed', 'closed']
          },
          visibility: {
            type: 'string',
            enum: ['public', 'private', 'team']
          },
          analytics: {
            type: 'object',
            properties: {
              views: { type: 'number' },
              completedReviews: { type: 'number' },
              averageRating: { type: 'number' }
            }
          },
          author: { $ref: '#/components/schemas/User' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Review: {
        type: 'object',
        required: ['submission', 'overallFeedback', 'rating', 'categories'],
        properties: {
          _id: { type: 'string' },
          submission: { type: 'string' },
          reviewer: { $ref: '#/components/schemas/User' },
          overallFeedback: { type: 'string', example: 'Great code structure!' },
          rating: { type: 'number', minimum: 1, maximum: 5, example: 4 },
          lineComments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                lineNumber: { type: 'number' },
                comment: { type: 'string' },
                severity: { type: 'string', enum: ['info', 'warning', 'error'] },
                suggestion: { type: 'string' }
              }
            }
          },
          categories: {
            type: 'object',
            properties: {
              codeQuality: { type: 'number', minimum: 1, maximum: 5 },
              performance: { type: 'number', minimum: 1, maximum: 5 },
              security: { type: 'number', minimum: 1, maximum: 5 },
              maintainability: { type: 'number', minimum: 1, maximum: 5 },
              bestPractices: { type: 'number', minimum: 1, maximum: 5 }
            }
          },
          status: { type: 'string', enum: ['draft', 'submitted', 'revised'] },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Error: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          message: { type: 'string', example: 'Resource not found' },
          statusCode: { type: 'number', example: 404 }
        }
      }
    }
  },
  tags: [
    { name: 'Authentication', description: 'User authentication endpoints' },
    { name: 'Users', description: 'User management and profiles' },
    { name: 'Submissions', description: 'Code submission management' },
    { name: 'Reviews', description: 'Code review operations' },
    { name: 'Comments', description: 'Comment management' },
    { name: 'Social', description: 'Social features and interactions' },
    { name: 'Notifications', description: 'Notification management' },
    { name: 'Real-time', description: 'WebSocket and real-time features' }
  ]
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.js', './src/controllers/*.js', './src/models/*.js']
};

export const swaggerSpec = swaggerJsdoc(options);
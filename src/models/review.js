import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
    {
        submission: {
            type: mongoose.Schema.ObjectId,
            ref: 'CodeSubmission',
            required: [true, "Review must belong to a submission"]
          },
          reviewer: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, "Review must have a reviewer"]
          },
          
          overallFeedback: {
            type: String,
            required: [true, "Overall feedback is required"],
            maxlength: [2000, "Feedback cannot exceed 2000 characters"]
          },
          
          rating: {
            type: Number,
            required: [true, "Rating is required"],
            min: [1, "Rating must be at least 1"],
            max: [5, "Rating cannot exceed 5"]
          },
          
          lineComments: [{
            lineNumber: {
              type: Number,
              required: true,
              min: 1
            },
            comment: {
              type: String,
              required: true,
              maxlength: [500, "Line comment cannot exceed 500 characters"]
            },
            severity: {
              type: String,
              enum: ['info', 'warning', 'error'],
              default: 'info'
            },
            suggestion: {
              type: String,
              maxlength: [500, "Suggestion cannot exceed 500 characters"]
            },
            createdAt: { type: Date, default: Date.now }
          }],
          
          categories: {
            codeQuality: {
              type: Number,
              min: 1,
              max: 5,
              required: true
            },
            performance: {
              type: Number,
              min: 1,
              max: 5,
              required: true
            },
            security: {
              type: Number,
              min: 1,
              max: 5,
              required: true
            },
            maintainability: {
              type: Number,
              min: 1,
              max: 5,
              required: true
            },
            bestPractices: {
              type: Number,
              min: 1,
              max: 5,
              required: true
            }
          },
          
          suggestions: [{
            type: {
              type: String,
              enum: ['refactor', 'optimization', 'security-fix', 'style', 'logic'],
              required: true
            },
            description: {
              type: String,
              required: true,
              maxlength: [300, "Suggestion description cannot exceed 300 characters"]
            },
            codeExample: String,
            priority: {
              type: String,
              enum: ['low', 'medium', 'high'],
              default: 'medium'
            }
          }],
          
          status: {
            type: String,
            enum: ['draft', 'submitted', 'revised'],
            default: 'draft'
          },
          
          timeSpent: {
            type: Number, // in minutes
            min: 0
          },
          
          interactions: {
            helpful: [{
              type: mongoose.Schema.ObjectId,
              ref: 'User'
            }],
            replies: [{
              type: mongoose.Schema.ObjectId,
              ref: 'Comment'
            }]
          },
          
          createdAt: { type: Date, default: Date.now },
          updatedAt: { type: Date, default: Date.now },
          submittedAt: Date
    },{
        versionKey: false,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes
reviewSchema.index({ reviewer: 1, createdAt: -1 });
reviewSchema.index({ status: 1 });

// Ensure one review per user per submission
reviewSchema.index({ submission: 1, reviewer: 1 }, { unique: true });

// Virtual for comments
reviewSchema.virtual('comments', {
  ref: 'Comment',
  foreignField: 'review',
  localField: '_id'
});

// Middleware
reviewSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.status === 'submitted' && !this.submittedAt) {
    this.submittedAt = Date.now();
  }
  next();
});

// Instance method to mark as helpful
reviewSchema.methods.toggleHelpful = function(userId) {
  const index = this.interactions.helpful.indexOf(userId);
  if (index > -1) {
    this.interactions.helpful.splice(index, 1);
  } else {
    this.interactions.helpful.push(userId);
  }
  return this.save();
};

const Review = mongoose.model('Review', reviewSchema);
export default Review;


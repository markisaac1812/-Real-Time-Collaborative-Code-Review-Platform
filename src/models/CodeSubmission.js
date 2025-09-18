import mongoose from "mongoose";

const codeSubmissionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    code: {
      type: String,
      required: [true, "Code is required"],
      maxlength: [50000, "Code cannot exceed 50,000 characters"],
    },
    language: {
      type: String,
      required: [true, "Programming language is required"],
      enum: [
        "javascript",
        "python",
        "java",
        "csharp",
        "cpp",
        "c",
        "ruby",
        "go",
        "rust",
        "php",
        "typescript",
        "swift",
        "kotlin",
        "scala",
        "html",
        "css",
        "sql",
        "other",
      ],
    },
    author: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Author is required"],
    },
    metadata: {
      fileName: String,
      lineCount: {
        type: Number,
        default: function () {
          return this.code ? this.code.split("\n").length : 0;
        },
      },
      characterCount: {
        type: Number,
        default: function () {
          return this.code ? this.code.length : 0;
        },
      },
      complexity: {
        type: Number,
        min: 1,
        max: 10,
        default: 5,
      },
      estimatedReviewTime: {
        type: Number, // in minutes
        default: function () {
          const lines = this.code ? this.code.split("\n").length : 0;
          return Math.ceil(lines / 10); // Rough estimate: 10 lines per minute
        },
      },
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [30, "Tag cannot exceed 30 characters"],
      },
    ],
    category: {
      type: String,
      enum: ["bug-fix", "feature", "optimization", "learning", "refactoring"],
      default: "learning",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in-review", "completed", "closed"],
      default: "open",
    },
    visibility: {
      type: String,
      enum: ["public", "private", "team"],
      default: "public",
    },
    reviewers: [
      {
        user: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        assignedAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["assigned", "reviewing", "completed"],
          default: "assigned",
        },
      },
    ],
    analytics: {
      views: { type: Number, default: 0 },
      reviewRequests: { type: Number, default: 0 },
      completedReviews: { type: Number, default: 0 },
      averageRating: { type: Number, min: 1, max: 5 },
      timeToFirstReview: Number, // in hours
    },
    attachments: [String], // File URLs if any
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    completedAt: Date,
  },
  {
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
codeSubmissionSchema.index({ author: 1, createdAt: -1 });
codeSubmissionSchema.index({ language: 1, status: 1 });
codeSubmissionSchema.index({ tags: 1 });
codeSubmissionSchema.index({ status: 1, visibility: 1 });

// Virtual for reviews
codeSubmissionSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "submission",
  localField: "_id",
});

// Middleware to update metadata before saving
codeSubmissionSchema.pre("save", function (next) {
  if (this.isModified("code")) {
    this.metadata.lineCount = this.code.split("\n").length;
    this.metadata.characterCount = this.code.length;
    this.metadata.estimatedReviewTime = Math.ceil(this.metadata.lineCount / 10);
  }
  this.updatedAt = Date.now();
  next();
});

// Instance method to increment views
codeSubmissionSchema.methods.incrementViews = function () {
  this.analytics.views += 1;
  return this.save({ validateBeforeSave: false });
};

const CodeSubmission = mongoose.model("CodeSubmission", codeSubmissionSchema);
export default CodeSubmission;

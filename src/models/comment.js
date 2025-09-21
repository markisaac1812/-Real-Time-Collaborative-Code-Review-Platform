import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    review: {
      type: mongoose.Schema.ObjectId,
      ref: 'Review',
      required: [true, "Comment must belong to a review"]
    },
    author: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, "Comment must have an author"]
    },
    content: {
      type: String,
      required: [true, "Comment content is required"],
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
      trim: true
    },
    
    parentComment: {
      type: mongoose.Schema.ObjectId,
      ref: 'Comment'
    },
    
    reactions: {
      likes: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }],
      dislikes: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }]
    },
    
    isEdited: { type: Boolean, default: false },
    editHistory: [{
      content: String,
      editedAt: { type: Date, default: Date.now }
    }],
    isDeleted: {
      type: Boolean,
      default: false
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  {
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
commentSchema.index({ review: 1, createdAt: 1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parentComment: 1 });

// Virtual for nested replies
commentSchema.virtual('replies', {
  ref: 'Comment',
  foreignField: 'parentComment',
  localField: '_id'
});

// Middleware
commentSchema.pre('save', function(next) {
  if (this.isModified('content') && !this.isNew) {
    this.editHistory.push({ content: this.content });
    this.isEdited = true;
  }
  this.updatedAt = Date.now();
  next();
});

const Comment = mongoose.model('Comment', commentSchema);
export default Comment;

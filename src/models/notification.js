import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, "Notification must have a recipient"]
    },
    sender: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    
    type: {
      type: String,
      required: true,
      enum: [
        'review_request',
        'review_completed', 
        'comment_added',
        'submission_updated',
        'mention',
        'follow',
        'helpful_vote'
      ]
    },
    
    data: {
      submissionId: {
        type: mongoose.Schema.ObjectId,
        ref: 'CodeSubmission'
      },
      reviewId: {
        type: mongoose.Schema.ObjectId,
        ref: 'Review'
      },
      commentId: {
        type: mongoose.Schema.ObjectId,
        ref: 'Comment'
      },
      message: String
    },
    
    isRead: { type: Boolean, default: false },
    readAt: Date,
    
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

// Indexes
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // Auto-delete after 30 days

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  return await this.create(data);
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = Date.now();
  return this.save();
};

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
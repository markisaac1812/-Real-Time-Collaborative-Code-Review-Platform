import User from '../models/userModel.js';
// import CodeSubmission from "./../models/codeSubmission.js"
// import Review from '../models/review.js';
// import mongoose from 'mongoose';

// Update user reputation (existing function - enhanced)
export const updateUserReputation = async(userId, points, action) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    user.reputation.points += points;
    
    // Update specific counters based on action
    switch (action) {
      case 'submission_created':
        // Give points for creating a submission
        break;
      case 'review_given':
        user.reputation.reviewsGiven += 1;
        break;
      case 'review_received':
        user.reputation.reviewsReceived += 1;
        break;
      case 'helpful_vote':
        user.reputation.helpfulVotes += 1;
        break;
    }

    // Update level based on points
    if (user.reputation.points >= 1000) user.reputation.level = "Master";
    else if (user.reputation.points >= 500) user.reputation.level = "Expert";
    else if (user.reputation.points >= 100) user.reputation.level = "Intermediate";
    else user.reputation.level = "Beginner";

    return await user.save();
  } catch (error) {
    console.error('Error updating user reputation:', error);
    return null;
  }
};
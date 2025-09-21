import Review from "./../models/Review.js";
import CodeSubmission from "./../models/CodeSubmission.js";
import User from "./../models/userModel.js";

// Calculate review quality score
export const calculateReviewQualityScore = (review) => {
    let score = 0;
    
    // Base score from feedback length
    const feedbackLength = review.overallFeedback.length;
    if (feedbackLength > 100) score += 10;
    else if (feedbackLength > 50) score += 5;
    else score += 2;
    
    // Line comments bonus
    score += Math.min(review.lineComments.length * 2, 20); // Max 20 points
    
    // Suggestions bonus
    score += Math.min(review.suggestions.length * 3, 15); // Max 15 points
    
    // Time spent bonus
    if (review.timeSpent > 30) score += 10;
    else if (review.timeSpent > 15) score += 5;
    
    // Helpful votes bonus
    score += Math.min(review.interactions.helpful.length * 5, 25); // Max 25 points
    
    return Math.min(score, 100); // Cap at 100
  };
  
  // Get reviewer workload
  export const getReviewerWorkload = async (reviewerId) => {
    const [activeReviews, draftReviews, pendingAssignments] = await Promise.all([
      Review.countDocuments({ reviewer: reviewerId, status: 'submitted' }),
      Review.countDocuments({ reviewer: reviewerId, status: 'draft' }),
      CodeSubmission.countDocuments({
        'reviewers.user': reviewerId,
        'reviewers.status': 'assigned'
      })
    ]);
  
    return {
      activeReviews,
      draftReviews,
      pendingAssignments,
      totalWorkload: activeReviews + draftReviews + pendingAssignments
    };
  };
  
  // Calculate reviewer match score for a submission
  export const calculateMatchScore = (reviewer, submission) => {
    let score = 0;
    
    // Skill matching
    if (reviewer.skills && submission.tags) {
      const skillMatches = reviewer.skills.filter(skill => 
        submission.tags.some(tag => 
          tag.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(tag.toLowerCase())
        )
      );
      score += skillMatches.length * 3;
    }
    
    // Language preference matching
    if (reviewer.preferences?.languages && reviewer.preferences.languages.includes(submission.language)) {
      score += 5;
    }
    
    // Reputation bonus
    const reputationLevels = { 'Beginner': 1, 'Intermediate': 2, 'Expert': 3, 'Master': 4 };
    score += (reputationLevels[reviewer.reputation.level] || 1) * 2;
    
    // Experience bonus
    score += Math.min(reviewer.reputation.reviewsGiven * 0.1, 5);
    
    return score;
  };
  
  // Get review insights for submission author
  export const getReviewInsights = async (submissionId) => {
    const reviews = await Review.find({ 
      submission: submissionId, 
      status: 'submitted' 
    });
  
    if (reviews.length === 0) return null;
  
    // Calculate averages
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    
    const avgCategories = {
      codeQuality: 0,
      performance: 0,
      security: 0,
      maintainability: 0,
      bestPractices: 0
    };
  
    reviews.forEach(review => {
      Object.keys(avgCategories).forEach(key => {
        avgCategories[key] += review.categories[key];
      });
    });
  
    Object.keys(avgCategories).forEach(key => {
      avgCategories[key] = avgCategories[key] / reviews.length;
    });
  
    // Common suggestions
    const allSuggestions = reviews.flatMap(r => r.suggestions);
    const suggestionTypes = {};
    allSuggestions.forEach(s => {
      suggestionTypes[s.type] = (suggestionTypes[s.type] || 0) + 1;
    });
  
    // Most common issues
    const allLineComments = reviews.flatMap(r => r.lineComments);
    const severityCount = {
      error: allLineComments.filter(c => c.severity === 'error').length,
      warning: allLineComments.filter(c => c.severity === 'warning').length,
      info: allLineComments.filter(c => c.severity === 'info').length
    };
  
    return {
      totalReviews: reviews.length,
      averageRating: Math.round(avgRating * 10) / 10,
      categoryAverages: avgCategories,
      totalLineComments: allLineComments.length,
      severityBreakdown: severityCount,
      suggestionTypes,
      totalHelpfulVotes: reviews.reduce((sum, r) => sum + r.interactions.helpful.length, 0)
    };
  };
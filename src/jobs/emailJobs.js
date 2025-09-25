import { emailQueue } from '../config/queue.js';
import nodemailer from 'nodemailer';
import User from '../models/userModel.js';

// Email transporter setup (SendGrid SMTP relay)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: process.env.SMTP_PORT || 587,
  secure: false, // SendGrid works on 587 with STARTTLS
  auth: {
    user: process.env.SMTP_USER || 'apikey', 
    pass: process.env.SMTP_PASS              
  }
});

// Email job processor
emailQueue.process('send-notification-email', 5, async (job) => {
  const { userId, notificationType, data } = job.data;
  
  try {
    // Get user details
    const user = await User.findById(userId).select('email profile preferences');
    
    if (!user || !user.preferences.emailNotifications) {
      return { skipped: true, reason: 'Email notifications disabled' };
    }

    // Generate email content based on notification type
    const emailContent = generateEmailContent(notificationType, data);
    
    // Send email
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@codereview.com',
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    });

    return { messageId: info.messageId, recipient: user.email };
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
});

// Email content generator
const generateEmailContent = (type, data) => {
  const templates = {
    review_request: {
      subject: '🔍 New Code Review Request',
      html: `
        <h2>You've been assigned a code review</h2>
        <p>Hi there,</p>
        <p>${data.authorName} has requested you to review their code submission:</p>
        <h3>${data.submissionTitle}</h3>
        <p><strong>Language:</strong> ${data.language}</p>
        <p><strong>Description:</strong> ${data.description}</p>
        <a href="${data.submissionUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Now</a>
      `,
      text: `You've been assigned to review ${data.submissionTitle} by ${data.authorName}. Visit ${data.submissionUrl} to start reviewing.`
    },
    
    review_completed: {
      subject: '✅ Code Review Completed',
      html: `
        <h2>Your code review is complete</h2>
        <p>Hi ${data.authorName},</p>
        <p>${data.reviewerName} has completed their review of your submission:</p>
        <h3>${data.submissionTitle}</h3>
        <p><strong>Rating:</strong> ${data.rating}/5 stars</p>
        <p><strong>Overall Feedback:</strong></p>
        <blockquote>${data.overallFeedback}</blockquote>
        <a href="${data.reviewUrl}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Review</a>
      `,
      text: `${data.reviewerName} completed their review of ${data.submissionTitle}. Rating: ${data.rating}/5. View at ${data.reviewUrl}`
    },
    
    comment_added: {
      subject: '💬 New Comment on Your Review',
      html: `
        <h2>Someone commented on your review</h2>
        <p>Hi there,</p>
        <p>${data.commenterName} added a comment to your review:</p>
        <blockquote>${data.commentContent}</blockquote>
        <a href="${data.commentUrl}" style="background: #17a2b8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Comment</a>
      `,
      text: `${data.commenterName} commented on your review: "${data.commentContent}". View at ${data.commentUrl}`
    },
    
    weekly_summary: {
      subject: '📊 Your Weekly CodeReview Summary',
      html: `
        <h2>Your Week in Review</h2>
        <p>Hi ${data.username},</p>
        <h3>This Week's Activity:</h3>
        <ul>
          <li>📝 Submissions created: ${data.submissionsCreated}</li>
          <li>🔍 Reviews completed: ${data.reviewsCompleted}</li>
          <li>💬 Comments made: ${data.commentsMade}</li>
          <li>⭐ Reputation gained: +${data.reputationGained}</li>
        </ul>
        <p>Keep up the great work!</p>
        <a href="${data.platformUrl}" style="background: #6f42c1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Continue Reviewing</a>
      `,
      text: `Weekly summary: ${data.submissionsCreated} submissions, ${data.reviewsCompleted} reviews, ${data.commentsMade} comments, +${data.reputationGained} reputation.`
    }
  };

  return templates[type] || templates.review_request;
};

// Add email jobs to queue
export const queueNotificationEmail = async (userId, notificationType, data) => {
  return await emailQueue.add('send-notification-email', {
    userId,
    notificationType,
    data
  }, {
    delay: 5000, // 5 second delay to batch notifications
    removeOnComplete: 10
  });
};

export const queueWeeklySummaryEmails = async () => {
  // Get all active users
  const users = await User.find({ 
    isActive: true, 
    'preferences.emailNotifications': true 
  }).select('_id');

  const jobs = users.map(user => ({
    name: 'send-weekly-summary',
    data: { userId: user._id },
    opts: { delay: Math.random() * 3600000 } // Random delay up to 1 hour
  }));

  return await emailQueue.addBulk(jobs);
};

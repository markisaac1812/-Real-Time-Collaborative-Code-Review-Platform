import Review from '../../models/Review.js';
import Comment from '../../models/comment.js';
import CodeSubmission from '../../models/CodeSubmission.js';

export const handleReviews = (io, socket) => {
  // Real-time comment creation
  socket.on('comment:create', async (data) => {
    try {
      const { reviewId, content, parentCommentId } = data;
      
      // Verify review exists and user has permission
      const review = await Review.findById(reviewId);
      if (!review) {
        return socket.emit('error', { message: 'Review not found' });
      }

      // Create comment (this should use your existing comment controller logic)
      const comment = await Comment.create({
        review: reviewId,
        author: socket.userId,
        content,
        parentComment: parentCommentId || null
      });

      await comment.populate('author', 'username profile reputation');

      // Emit to all users in the review room
      const reviewRoom = `review:${reviewId}`;
      io.to(reviewRoom).emit('comment:created', {
        comment,
        reviewId,
        timestamp: new Date()
      });

      // Send notification to review author if not the commenter
      if (review.reviewer.toString() !== socket.userId) {
        await sendRealTimeNotification(io, {
          recipient: review.reviewer,
          sender: socket.userId,
          type: 'comment_added',
          data: {
            reviewId,
            commentId: comment._id,
            message: `${socket.user.username} commented on your review`
          }
        });
      }

    } catch (error) {
      socket.emit('error', { message: 'Failed to create comment' });
    }
  });

  // Real-time comment updates
  socket.on('comment:update', async (data) => {
    try {
      const { commentId, content } = data;
      
      const comment = await Comment.findOneAndUpdate(
        { _id: commentId, author: socket.userId },
        { content, isEdited: true, updatedAt: new Date() },
        { new: true }
      ).populate('author', 'username profile reputation');

      if (!comment) {
        return socket.emit('error', { message: 'Comment not found or no permission' });
      }

      // Emit to review room
      const reviewRoom = `review:${comment.review}`;
      io.to(reviewRoom).emit('comment:updated', {
        comment,
        timestamp: new Date()
      });

    } catch (error) {
      socket.emit('error', { message: 'Failed to update comment' });
    }
  });

  // Real-time comment reactions
  socket.on('comment:react', async (data) => {
    try {
      const { commentId, reaction } = data; // 'like' or 'dislike'
      
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return socket.emit('error', { message: 'Comment not found' });
      }

      if (comment.author.toString() === socket.userId) {
        return socket.emit('error', { message: 'Cannot react to own comment' });
      }

      const userId = socket.userId;
      const oppositeReaction = reaction === 'like' ? 'dislike' : 'like';

      // Remove from opposite reaction
      comment.reactions[oppositeReaction] = comment.reactions[oppositeReaction].filter(
        id => id.toString() !== userId
      );

      // Toggle current reaction
      const currentIndex = comment.reactions[reaction].indexOf(userId);
      if (currentIndex > -1) {
        comment.reactions[reaction].splice(currentIndex, 1);
      } else {
        comment.reactions[reaction].push(userId);
      }

      await comment.save();

      // Emit to review room
      const reviewRoom = `review:${comment.review}`;
      io.to(reviewRoom).emit('comment:reaction_updated', {
        commentId,
        reactions: {
          likes: comment.reactions.likes.length,
          dislikes: comment.reactions.dislikes.length
        },
        userReaction: currentIndex > -1 ? null : reaction,
        userId: socket.userId
      });

    } catch (error) {
      socket.emit('error', { message: 'Failed to react to comment' });
    }
  });

  // Real-time review status updates
  socket.on('review:status_update', async (data) => {
    try {
      const { reviewId, status } = data;
      
      const review = await Review.findOneAndUpdate(
        { _id: reviewId, reviewer: socket.userId },
        { status, updatedAt: new Date() },
        { new: true }
      ).populate('submission', 'title author');

      if (!review) {
        return socket.emit('error', { message: 'Review not found or no permission' });
      }

      // Emit to submission room
      const submissionRoom = `submission:${review.submission._id}`;
      io.to(submissionRoom).emit('review:status_changed', {
        reviewId,
        status,
        reviewer: {
          id: socket.userId,
          username: socket.user.username
        },
        submissionId: review.submission._id,
        timestamp: new Date()
      });

      // Notify submission author
      if (review.submission.author.toString() !== socket.userId) {
        await sendRealTimeNotification(io, {
          recipient: review.submission.author,
          sender: socket.userId,
          type: 'review_completed',
          data: {
            reviewId,
            submissionId: review.submission._id,
            message: `${socket.user.username} ${status === 'submitted' ? 'completed' : 'updated'} their review`
          }
        });
      }

    } catch (error) {
      socket.emit('error', { message: 'Failed to update review status' });
    }
  });

  // Live code highlighting during review
  socket.on('review:highlight_code', (data) => {
    const { reviewId, lineNumber, action } = data; // action: 'highlight' or 'unhighlight'
    
    socket.to(`review:${reviewId}`).emit('review:code_highlighted', {
      lineNumber,
      action,
      reviewer: {
        id: socket.userId,
        username: socket.user.username
      },
      timestamp: new Date()
    });
  });

  // Real-time line comment preview
  socket.on('review:line_comment_preview', (data) => {
    const { reviewId, lineNumber, comment } = data;
    
    socket.to(`review:${reviewId}`).emit('review:line_comment_typing', {
      lineNumber,
      comment: comment.substring(0, 100), // Limit preview length
      reviewer: {
        id: socket.userId,
        username: socket.user.username
      },
      timestamp: new Date()
    });
  });
};
// Review & Comment System
// User Stories #12 & #13 Implementation
// Includes both Reviews (with ratings) and Comments (casual discussion)

class ReviewManager {
    constructor() {
        this.reviews = {};
        this.comments = {};
        this.replies = {};
        this.commentReplies = {};
        this.helpful = {};
        this.commentLikes = {};
        this.currentUser = null;
        this.maxReviewLength = 5000;
        this.maxCommentLength = 2000;
        this.reviewsPerPage = 5;
        this.currentFilter = 'all';
        this.currentTab = 'reviews';
        this.initialize();
    }

    initialize() {
        this.loadCurrentUser();
        this.loadReviews();
        this.loadComments();
        this.loadReplies();
        this.loadCommentReplies();
        this.loadHelpful();
        this.loadCommentLikes();
        this.initializeDefaultReviews();
        this.initializeDefaultComments();
    }

    loadCurrentUser() {
        const currentUserEmail = localStorage.getItem('currentUser');
        if (!currentUserEmail) return;
        
        const userProfiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
        this.currentUser = userProfiles[currentUserEmail];
    }

    loadReviews() {
        this.reviews = JSON.parse(localStorage.getItem('courseReviews') || '{}');
    }

    loadComments() {
        this.comments = JSON.parse(localStorage.getItem('courseComments') || '{}');
    }

    loadReplies() {
        this.replies = JSON.parse(localStorage.getItem('reviewReplies') || '{}');
    }

    loadCommentReplies() {
        this.commentReplies = JSON.parse(localStorage.getItem('commentReplies') || '{}');
    }

    loadHelpful() {
        this.helpful = JSON.parse(localStorage.getItem('reviewHelpful') || '{}');
    }

    loadCommentLikes() {
        this.commentLikes = JSON.parse(localStorage.getItem('commentLikes') || '{}');
    }

    saveReviews() {
        localStorage.setItem('courseReviews', JSON.stringify(this.reviews));
    }

    saveComments() {
        localStorage.setItem('courseComments', JSON.stringify(this.comments));
    }

    saveReplies() {
        localStorage.setItem('reviewReplies', JSON.stringify(this.replies));
    }

    saveCommentReplies() {
        localStorage.setItem('commentReplies', JSON.stringify(this.commentReplies));
    }

    saveHelpful() {
        localStorage.setItem('reviewHelpful', JSON.stringify(this.helpful));
    }

    saveCommentLikes() {
        localStorage.setItem('commentLikes', JSON.stringify(this.commentLikes));
    }

    initializeDefaultComments() {
        // Add sample comments if none exist
        if (Object.keys(this.comments).length === 0) {
            const sampleComments = [
                {
                    courseId: 1,
                    commentId: 'c1',
                    userId: 'student@skillshare.com',
                    userName: 'Alex Chen',
                    userInitials: 'AC',
                    userType: 'student',
                    content: 'Just finished the JavaScript section! The explanation of closures was really clear. Anyone else struggling with async/await?',
                    timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
                    likes: 5,
                    edited: false
                },
                {
                    courseId: 1,
                    commentId: 'c2',
                    userId: 'teacher2@demo.com',
                    userName: 'Dr. Michael Chen',
                    userInitials: 'MC',
                    userType: 'teacher',
                    content: 'Pro tip: Practice async/await with real API calls. It makes much more sense when you see it in action!',
                    timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
                    likes: 12,
                    edited: false
                }
            ];

            sampleComments.forEach(comment => {
                if (!this.comments[comment.courseId]) {
                    this.comments[comment.courseId] = [];
                }
                this.comments[comment.courseId].push(comment);
            });

            this.saveComments();
        }
    }

    initializeDefaultReviews() {
        // Add some sample reviews if none exist
        if (Object.keys(this.reviews).length === 0) {
            const sampleReviews = [
                {
                    courseId: 1,
                    reviewId: 'r1',
                    userId: 'student@skillshare.com',
                    userName: 'Alex Chen',
                    userInitials: 'AC',
                    userType: 'student',
                    content: 'This course exceeded my expectations! The instructor explains complex concepts in a very understandable way. The projects are practical and helped me build a strong portfolio. Highly recommended for beginners!',
                    rating: 5,
                    timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
                    helpful: { up: 15, down: 2 },
                    edited: false
                },
                {
                    courseId: 1,
                    reviewId: 'r2',
                    userId: 'teacher2@demo.com',
                    userName: 'Dr. Michael Chen',
                    userInitials: 'MC',
                    userType: 'teacher',
                    content: 'As a fellow educator, I appreciate the structured approach and comprehensive curriculum. Great resource for anyone looking to master web development fundamentals.',
                    rating: 5,
                    timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
                    helpful: { up: 8, down: 0 },
                    edited: false
                }
            ];

            sampleReviews.forEach(review => {
                if (!this.reviews[review.courseId]) {
                    this.reviews[review.courseId] = [];
                }
                this.reviews[review.courseId].push(review);
            });

            this.saveReviews();
        }
    }

    // Generate reviews AND comments HTML for course modal
  generateReviewsHTML(courseId, isEnrolled = false) {
    console.log('=== GENERATING REVIEWS HTML ===');
    console.log('Course ID:', courseId);
    console.log('Is Enrolled:', isEnrolled);
    
    const courseReviews = this.reviews[courseId] || [];
    const courseComments = this.comments[courseId] || [];
    const reviewStats = this.calculateReviewStats(courseId);
    
    // Check if user can write review
    const canWrite = this.canWriteReview(courseId);
    console.log('Can Write Review:', canWrite);
    
    // Generate write review HTML separately
    let writeReviewHTML = '';
    if (isEnrolled && canWrite) {
        console.log('✅ WILL SHOW WRITE REVIEW FORM');
        writeReviewHTML = this.generateWriteReviewHTML(courseId);
    } else {
        console.log('❌ WILL NOT SHOW WRITE REVIEW FORM');
        if (!isEnrolled) console.log('   Reason: Not enrolled');
        if (!canWrite) console.log('   Reason: Cannot write');
    }
    
    return `
        <div class="course-reviews-section">
            <h3>
                <i class="fas fa-comment-dots"></i>
                Reviews & Comments
            </h3>
            
            <!-- Tabs for Reviews and Comments -->
            <div class="reviews-comments-tabs">
                <button class="tab-btn active" onclick="reviewManager.switchTab('${courseId}', 'reviews')">
                    <i class="fas fa-star"></i> Reviews (${courseReviews.length})
                </button>
                <button class="tab-btn" onclick="reviewManager.switchTab('${courseId}', 'comments')">
                    <i class="fas fa-comments"></i> Comments (${courseComments.length})
                </button>
            </div>
            
            <!-- Reviews Tab Content -->
            <div id="reviews-tab-${courseId}" class="tab-content active">
                ${this.generateReviewsSummaryHTML(reviewStats)}
                
                ${writeReviewHTML}
                
                <div class="reviews-list-header">
                    <h4 style="color: var(--text-primary);">${courseReviews.length} Review${courseReviews.length !== 1 ? 's' : ''}</h4>
                    <div class="reviews-filter">
                        <button class="filter-btn active" data-filter="all" onclick="reviewManager.filterReviews('${courseId}', 'all')">
                            All
                        </button>
                        <button class="filter-btn" data-filter="5" onclick="reviewManager.filterReviews('${courseId}', '5')">
                            5 Stars
                        </button>
                        <button class="filter-btn" data-filter="4" onclick="reviewManager.filterReviews('${courseId}', '4')">
                            4 Stars
                        </button>
                        <button class="filter-btn" data-filter="3" onclick="reviewManager.filterReviews('${courseId}', '3')">
                            3 Stars
                        </button>
                    </div>
                </div>
                
                <div class="reviews-list" id="reviewsList-${courseId}">
                    ${this.generateReviewsListHTML(courseId, this.currentFilter)}
                </div>
            </div>
            
            <!-- Comments Tab Content -->
            <div id="comments-tab-${courseId}" class="tab-content">
                ${this.generateCommentsTabHTML(courseId, isEnrolled)}
            </div>
        </div>
    `;
}

    switchTab(courseId, tab) {
        this.currentTab = tab;
        
        // Update tab buttons
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => btn.classList.remove('active'));
        event.target.closest('.tab-btn').classList.add('active');
        
        // Update tab content
        document.getElementById(`reviews-tab-${courseId}`).classList.remove('active');
        document.getElementById(`comments-tab-${courseId}`).classList.remove('active');
        
        document.getElementById(`${tab}-tab-${courseId}`).classList.add('active');
    }

    generateCommentsTabHTML(courseId, isEnrolled) {
        const courseComments = this.comments[courseId] || [];
        
        return `
            <div class="comments-section">
                ${isEnrolled || this.currentUser ? this.generateWriteCommentHTML(courseId) : ''}
                
                <div class="comments-list-header">
                    <h4 style="color: var(--text-primary);">${courseComments.length} Comment${courseComments.length !== 1 ? 's' : ''}</h4>
                    <div class="comments-sort">
                        <label>Sort by:</label>
                        <select onchange="reviewManager.sortComments('${courseId}', this.value)">
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="popular">Most Liked</option>
                        </select>
                    </div>
                </div>
                
                <div class="comments-list" id="commentsList-${courseId}">
                    ${this.generateCommentsListHTML(courseId, 'newest')}
                </div>
            </div>
        `;
    }

    generateWriteCommentHTML(courseId) {
        if (!this.currentUser) return '';
        
        const userInitials = this.currentUser.firstName.charAt(0) + this.currentUser.lastName.charAt(0);
        
        return `
            <div class="write-comment-section">
                <div class="write-comment-header">
                    <div class="write-comment-avatar">${userInitials}</div>
                    <h4>Add a comment</h4>
                </div>
                <form class="comment-form" onsubmit="event.preventDefault(); reviewManager.submitComment('${courseId}')">
                    <textarea 
                        id="commentText-${courseId}" 
                        class="comment-textarea" 
                        placeholder="What are your thoughts?"
                        maxlength="${this.maxCommentLength}"
                        oninput="reviewManager.updateCommentCharCount('${courseId}')"
                    ></textarea>
                    <div class="comment-form-actions">
                        <span class="comment-char-count" id="commentCharCount-${courseId}">0 / ${this.maxCommentLength}</span>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-paper-plane"></i>
                            Comment
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    generateCommentsListHTML(courseId, sortBy = 'newest') {
        let courseComments = [...(this.comments[courseId] || [])];
        
        // Sort comments
        switch(sortBy) {
            case 'newest':
                courseComments.sort((a, b) => b.timestamp - a.timestamp);
                break;
            case 'oldest':
                courseComments.sort((a, b) => a.timestamp - b.timestamp);
                break;
            case 'popular':
                courseComments.sort((a, b) => b.likes - a.likes);
                break;
        }

        if (courseComments.length === 0) {
            return `
                <div class="no-comments">
                    <i class="fas fa-comment-slash"></i>
                    <h4>No comments yet</h4>
                    <p>Start the conversation!</p>
                </div>
            `;
        }

        return courseComments.map(comment => this.generateCommentCardHTML(comment)).join('');
    }

    generateCommentCardHTML(comment) {
        const isOwnComment = this.currentUser && comment.userId === this.currentUser.email;
        const commentReplies = this.commentReplies[comment.commentId] || [];
        const userLiked = this.hasUserLikedComment(comment.commentId);

        return `
            <div class="comment-card ${isOwnComment ? 'own-comment' : ''}" id="comment-${comment.commentId}">
                <div class="comment-header">
                    <div class="commenter-info">
                        <div class="commenter-avatar">${comment.userInitials}</div>
                        <div class="commenter-details">
                            <div class="commenter-name ${comment.userType === 'teacher' ? 'teacher-badge' : ''}">
                                ${comment.userName}
                            </div>
                            <div class="comment-date">
                                ${this.formatDate(comment.timestamp)}
                                ${comment.edited ? ' (edited)' : ''}
                            </div>
                        </div>
                    </div>
                    ${isOwnComment ? `
                        <div class="review-actions-menu">
                            <button class="review-actions-btn" onclick="reviewManager.toggleCommentActions('${comment.commentId}')">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="review-actions-dropdown hidden" id="comment-actions-${comment.commentId}">
                                <button onclick="reviewManager.editComment('${comment.commentId}')">
                                    <i class="fas fa-edit"></i>
                                    Edit Comment
                                </button>
                                <button class="danger" onclick="reviewManager.deleteComment('${comment.commentId}')">
                                    <i class="fas fa-trash"></i>
                                    Delete Comment
                                </button>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="comment-content" id="comment-content-${comment.commentId}">
                    ${comment.content}
                </div>
                
                <div class="comment-edit-form" id="comment-edit-form-${comment.commentId}">
                    <textarea class="comment-edit-textarea" id="comment-edit-text-${comment.commentId}">${comment.content}</textarea>
                    <div class="review-edit-actions">
                        <button class="btn-primary" onclick="reviewManager.saveEditedComment('${comment.commentId}')">
                            <i class="fas fa-save"></i>
                            Save
                        </button>
                        <button class="btn-outline" onclick="reviewManager.cancelCommentEdit('${comment.commentId}')">
                            Cancel
                        </button>
                    </div>
                </div>
                
                <div class="comment-footer">
                    <div class="comment-actions">
                        <button class="comment-like-btn ${userLiked ? 'active' : ''}" 
                                onclick="reviewManager.likeComment('${comment.commentId}')">
                            <i class="fas fa-heart"></i>
                            <span>${comment.likes}</span>
                        </button>
                        ${this.currentUser ? `
                            <button class="comment-reply-btn" onclick="reviewManager.toggleCommentReplyForm('${comment.commentId}')">
                                <i class="fas fa-reply"></i>
                                Reply
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                ${commentReplies.length > 0 || this.currentUser ? `
                    <div class="comment-replies" id="comment-replies-${comment.commentId}">
                        ${commentReplies.map(reply => this.generateCommentReplyHTML(reply)).join('')}
                    </div>
                    
                    ${this.currentUser ? `
                        <div class="comment-reply-form" id="comment-reply-form-${comment.commentId}">
                            <textarea 
                                class="comment-reply-textarea" 
                                id="comment-reply-text-${comment.commentId}" 
                                placeholder="Write your reply..."
                            ></textarea>
                            <div class="reply-form-actions">
                                <button class="btn-primary" onclick="reviewManager.submitCommentReply('${comment.commentId}')">
                                    <i class="fas fa-paper-plane"></i>
                                    Reply
                                </button>
                                <button class="btn-outline" onclick="reviewManager.cancelCommentReply('${comment.commentId}')">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ` : ''}
                ` : ''}
            </div>
        `;
    }

    generateCommentReplyHTML(reply) {
        return `
            <div class="comment-reply-item">
                <div class="comment-reply-header">
                    <div class="comment-reply-author">
                        <div class="comment-reply-avatar">${reply.userInitials}</div>
                        <span class="comment-reply-author-name">${reply.userName}</span>
                    </div>
                    <span class="comment-reply-date">${this.formatDate(reply.timestamp)}</span>
                </div>
                <div class="comment-reply-content">${reply.content}</div>
            </div>
        `;
    }

    updateCommentCharCount(courseId) {
        const textarea = document.getElementById(`commentText-${courseId}`);
        const charCount = document.getElementById(`commentCharCount-${courseId}`);
        
        if (textarea && charCount) {
            const length = textarea.value.length;
            charCount.textContent = `${length} / ${this.maxCommentLength}`;
        }
    }

    submitComment(courseId) {
        if (!this.currentUser) {
            this.showNotification('Please login to comment', 'error');
            return;
        }

        const textarea = document.getElementById(`commentText-${courseId}`);
        const content = textarea.value.trim();

        if (content.length < 3) {
            this.showNotification('Comment must be at least 3 characters long', 'error');
            return;
        }

        const comment = {
            courseId: courseId,
            commentId: this.generateId(),
            userId: this.currentUser.email,
            userName: `${this.currentUser.firstName} ${this.currentUser.lastName}`,
            userInitials: this.currentUser.firstName.charAt(0) + this.currentUser.lastName.charAt(0),
            userType: this.currentUser.userType,
            content: content,
            timestamp: Date.now(),
            likes: 0,
            edited: false
        };

        if (!this.comments[courseId]) {
            this.comments[courseId] = [];
        }

        this.comments[courseId].push(comment);
        this.saveComments();

        textarea.value = '';
        this.updateCommentCharCount(courseId);
        this.showNotification('Comment posted!', 'success');
        
        // Refresh comments display
        this.refreshCommentsDisplay(courseId);
    }

    toggleCommentActions(commentId) {
        const dropdown = document.getElementById(`comment-actions-${commentId}`);
        if (dropdown) {
            dropdown.classList.toggle('hidden');
        }
    }

    editComment(commentId) {
        const content = document.getElementById(`comment-content-${commentId}`);
        const editForm = document.getElementById(`comment-edit-form-${commentId}`);
        
        if (content && editForm) {
            content.style.display = 'none';
            editForm.classList.add('active');
        }
        
        this.toggleCommentActions(commentId);
    }

    cancelCommentEdit(commentId) {
        const content = document.getElementById(`comment-content-${commentId}`);
        const editForm = document.getElementById(`comment-edit-form-${commentId}`);
        
        if (content && editForm) {
            content.style.display = 'block';
            editForm.classList.remove('active');
        }
    }

    saveEditedComment(commentId) {
        const textarea = document.getElementById(`comment-edit-text-${commentId}`);
        const newContent = textarea.value.trim();

        if (newContent.length < 3) {
            this.showNotification('Comment must be at least 3 characters long', 'error');
            return;
        }

        // Find and update comment
        for (let courseId in this.comments) {
            const commentIndex = this.comments[courseId].findIndex(c => c.commentId === commentId);
            if (commentIndex !== -1) {
                this.comments[courseId][commentIndex].content = newContent;
                this.comments[courseId][commentIndex].edited = true;
                this.saveComments();
                this.showNotification('Comment updated!', 'success');
                this.refreshCommentsDisplay(courseId);
                break;
            }
        }
    }

    deleteComment(commentId) {
        if (!confirm('Delete this comment?')) {
            return;
        }

        for (let courseId in this.comments) {
            const commentIndex = this.comments[courseId].findIndex(c => c.commentId === commentId);
            if (commentIndex !== -1) {
                this.comments[courseId].splice(commentIndex, 1);
                this.saveComments();
                
                // Delete replies
                delete this.commentReplies[commentId];
                this.saveCommentReplies();
                
                this.showNotification('Comment deleted', 'success');
                this.refreshCommentsDisplay(courseId);
                break;
            }
        }
    }

    likeComment(commentId) {
        if (!this.currentUser) {
            this.showNotification('Please login to like comments', 'error');
            return;
        }

        const userKey = this.currentUser.email;
        
        if (!this.commentLikes[commentId]) {
            this.commentLikes[commentId] = {};
        }

        const hasLiked = this.commentLikes[commentId][userKey];

        // Find the comment
        for (let courseId in this.comments) {
            const comment = this.comments[courseId].find(c => c.commentId === commentId);
            if (comment) {
                if (hasLiked) {
                    // Unlike
                    comment.likes--;
                    delete this.commentLikes[commentId][userKey];
                } else {
                    // Like
                    comment.likes++;
                    this.commentLikes[commentId][userKey] = true;
                }

                this.saveComments();
                this.saveCommentLikes();
                this.refreshCommentsDisplay(courseId);
                break;
            }
        }
    }

    hasUserLikedComment(commentId) {
        if (!this.currentUser) return false;
        return this.commentLikes[commentId]?.[this.currentUser.email] || false;
    }

    toggleCommentReplyForm(commentId) {
        const replyForm = document.getElementById(`comment-reply-form-${commentId}`);
        if (replyForm) {
            replyForm.classList.toggle('active');
        }
    }

    cancelCommentReply(commentId) {
        const replyForm = document.getElementById(`comment-reply-form-${commentId}`);
        const textarea = document.getElementById(`comment-reply-text-${commentId}`);
        
        if (replyForm) {
            replyForm.classList.remove('active');
        }
        if (textarea) {
            textarea.value = '';
        }
    }

    submitCommentReply(commentId) {
        if (!this.currentUser) {
            this.showNotification('Please login to reply', 'error');
            return;
        }

        const textarea = document.getElementById(`comment-reply-text-${commentId}`);
        const content = textarea.value.trim();

        if (content.length < 3) {
            this.showNotification('Reply must be at least 3 characters long', 'error');
            return;
        }

        const reply = {
            replyId: this.generateId(),
            userId: this.currentUser.email,
            userName: `${this.currentUser.firstName} ${this.currentUser.lastName}`,
            userInitials: this.currentUser.firstName.charAt(0) + this.currentUser.lastName.charAt(0),
            content: content,
            timestamp: Date.now()
        };

        if (!this.commentReplies[commentId]) {
            this.commentReplies[commentId] = [];
        }

        this.commentReplies[commentId].push(reply);
        this.saveCommentReplies();

        textarea.value = '';
        this.showNotification('Reply posted!', 'success');
        
        // Find course ID and refresh
        for (let courseId in this.comments) {
            if (this.comments[courseId].some(c => c.commentId === commentId)) {
                this.refreshCommentsDisplay(courseId);
                break;
            }
        }
    }

    sortComments(courseId, sortBy) {
        const commentsList = document.getElementById(`commentsList-${courseId}`);
        if (commentsList) {
            commentsList.innerHTML = this.generateCommentsListHTML(courseId, sortBy);
        }
    }

    refreshCommentsDisplay(courseId) {
        const commentsList = document.getElementById(`commentsList-${courseId}`);
        if (commentsList) {
            // Get current sort
            const sortSelect = document.querySelector('.comments-sort select');
            const sortBy = sortSelect ? sortSelect.value : 'newest';
            commentsList.innerHTML = this.generateCommentsListHTML(courseId, sortBy);
        }
        
        // Update tab count
        const tabBtn = document.querySelector('.tab-btn:nth-child(2)');
        if (tabBtn) {
            const count = (this.comments[courseId] || []).length;
            tabBtn.innerHTML = `<i class="fas fa-comments"></i> Comments (${count})`;
        }
    }

    generateReviewsSummaryHTML(stats) {
        return `
            <div class="reviews-summary">
                <div class="reviews-summary-left">
                    <div class="reviews-average-rating">${stats.average.toFixed(1)}</div>
                    <div class="reviews-total-count">${stats.total} review${stats.total !== 1 ? 's' : ''}</div>
                </div>
                <div class="reviews-distribution">
                    ${[5, 4, 3, 2, 1].map(star => `
                        <div class="review-dist-item">
                            <div class="review-dist-label">
                                ${star} <i class="fas fa-star"></i>
                            </div>
                            <div class="review-dist-bar">
                                <div class="review-dist-fill" style="width: ${stats.distribution[star].percentage}%"></div>
                            </div>
                            <div class="review-dist-count">${stats.distribution[star].count}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generateWriteReviewHTML(courseId) {
        const existingReview = this.getUserReview(courseId);
        
        if (existingReview) {
            return ''; // User already reviewed
        }

        return `
            <div class="write-review-section">
                <h4>Write a Review</h4>
                <form class="review-form" onsubmit="event.preventDefault(); reviewManager.submitReview('${courseId}')">
                    <textarea 
                        id="reviewText-${courseId}" 
                        class="review-textarea" 
                        placeholder="Share your experience with this course. What did you learn? How was the teaching? Would you recommend it to others?"
                        maxlength="${this.maxReviewLength}"
                        oninput="reviewManager.updateCharCount('${courseId}')"
                    ></textarea>
                    <div class="review-form-actions">
                        <span class="review-char-count" id="charCount-${courseId}">0 / ${this.maxReviewLength}</span>
                        <div class="review-form-buttons">
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-paper-plane"></i>
                                Submit Review
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        `;
    }

    generateReviewsListHTML(courseId, filter = 'all') {
        let courseReviews = this.reviews[courseId] || [];
        
        // Apply filter
        if (filter !== 'all') {
            const rating = parseInt(filter);
            courseReviews = courseReviews.filter(r => r.rating === rating);
        }

        // Sort by date (newest first)
        courseReviews.sort((a, b) => b.timestamp - a.timestamp);

        if (courseReviews.length === 0) {
            return `
                <div class="no-reviews">
                    <i class="fas fa-comment-slash"></i>
                    <h4>No reviews yet</h4>
                    <p>Be the first to review this course!</p>
                </div>
            `;
        }

        return courseReviews.map(review => this.generateReviewCardHTML(review)).join('');
    }

    generateReviewCardHTML(review) {
        const isOwnReview = this.currentUser && review.userId === this.currentUser.email;
        const canReply = this.currentUser && this.currentUser.userType === 'teacher' && !isOwnReview;
        const reviewReplies = this.replies[review.reviewId] || [];
        const userHelpful = this.getUserHelpfulVote(review.reviewId);

        return `
            <div class="review-card ${isOwnReview ? 'own-review' : ''}" id="review-${review.reviewId}">
                <div class="review-header">
                    <div class="reviewer-info">
                        <div class="reviewer-avatar">${review.userInitials}</div>
                        <div class="reviewer-details">
                            <div class="reviewer-name ${review.userType === 'teacher' ? 'teacher-badge' : ''}">
                                ${review.userName}
                            </div>
                            <div class="review-date">
                                ${this.formatDate(review.timestamp)}
                                ${review.edited ? ' (edited)' : ''}
                            </div>
                        </div>
                    </div>
                    <div class="review-meta">
                        <div class="review-rating-stars">
                            ${this.generateStars(review.rating)}
                        </div>
                        ${isOwnReview ? `
                            <div class="review-actions-menu">
                                <button class="review-actions-btn" onclick="reviewManager.toggleActionsDropdown('${review.reviewId}')">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <div class="review-actions-dropdown hidden" id="actions-${review.reviewId}">
                                    <button onclick="reviewManager.editReview('${review.reviewId}')">
                                        <i class="fas fa-edit"></i>
                                        Edit Review
                                    </button>
                                    <button class="danger" onclick="reviewManager.deleteReview('${review.reviewId}')">
                                        <i class="fas fa-trash"></i>
                                        Delete Review
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="review-content" id="content-${review.reviewId}">
                    ${review.content}
                </div>
                
                <div class="review-edit-form" id="edit-form-${review.reviewId}">
                    <textarea class="review-edit-textarea" id="edit-text-${review.reviewId}">${review.content}</textarea>
                    <div class="review-edit-actions">
                        <button class="btn-primary" onclick="reviewManager.saveEditedReview('${review.reviewId}')">
                            <i class="fas fa-save"></i>
                            Save Changes
                        </button>
                        <button class="btn-outline" onclick="reviewManager.cancelEdit('${review.reviewId}')">
                            Cancel
                        </button>
                    </div>
                </div>
                
                <div class="review-footer">
                    <div class="review-helpful">
                        <span class="review-helpful-text">Was this helpful?</span>
                        <div class="helpful-buttons">
                            <button class="helpful-btn ${userHelpful === 'up' ? 'active' : ''}" 
                                    onclick="reviewManager.markHelpful('${review.reviewId}', 'up')">
                                <i class="fas fa-thumbs-up"></i>
                                <span>${review.helpful.up}</span>
                            </button>
                            <button class="helpful-btn ${userHelpful === 'down' ? 'active' : ''}" 
                                    onclick="reviewManager.markHelpful('${review.reviewId}', 'down')">
                                <i class="fas fa-thumbs-down"></i>
                                <span>${review.helpful.down}</span>
                            </button>
                        </div>
                    </div>
                    ${canReply ? `
                        <button class="reply-btn" onclick="reviewManager.toggleReplyForm('${review.reviewId}')">
                            <i class="fas fa-reply"></i>
                            Reply
                        </button>
                    ` : ''}
                </div>
                
                ${reviewReplies.length > 0 || canReply ? `
                    <div class="review-replies" id="replies-${review.reviewId}">
                        ${reviewReplies.map(reply => this.generateReplyHTML(reply)).join('')}
                    </div>
                    
                    ${canReply ? `
                        <div class="reply-form" id="reply-form-${review.reviewId}">
                            <textarea 
                                class="reply-textarea" 
                                id="reply-text-${review.reviewId}" 
                                placeholder="Write your response to this review..."
                            ></textarea>
                            <div class="reply-form-actions">
                                <button class="btn-primary" onclick="reviewManager.submitReply('${review.reviewId}')">
                                    <i class="fas fa-paper-plane"></i>
                                    Send Reply
                                </button>
                                <button class="btn-outline" onclick="reviewManager.cancelReply('${review.reviewId}')">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ` : ''}
                ` : ''}
            </div>
        `;
    }

    generateReplyHTML(reply) {
        return `
            <div class="reply-item">
                <div class="reply-header">
                    <div class="reply-author">
                        <div class="reply-avatar">${reply.userInitials}</div>
                        <span class="reply-author-name">${reply.userName}</span>
                    </div>
                    <span class="reply-date">${this.formatDate(reply.timestamp)}</span>
                </div>
                <div class="reply-content">${reply.content}</div>
            </div>
        `;
    }

    generateStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += `<i class="fas fa-star"></i>`;
        }
        return stars;
    }

    calculateReviewStats(courseId) {
        const courseReviews = this.reviews[courseId] || [];
        
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        let totalRating = 0;

        courseReviews.forEach(review => {
            distribution[review.rating]++;
            totalRating += review.rating;
        });

        const total = courseReviews.length;
        const average = total > 0 ? totalRating / total : 0;

        // Calculate percentages
        Object.keys(distribution).forEach(star => {
            distribution[star] = {
                count: distribution[star],
                percentage: total > 0 ? (distribution[star] / total) * 100 : 0
            };
        });

        return { total, average, distribution };
    }

canWriteReview(courseId) {
       console.log('🔍 === CHECKING IF CAN WRITE REVIEW ===');
       console.log('   Course ID:', courseId);
       
       if (!this.currentUser) {
           console.log('   ❌ No current user logged in');
           return false;
       }
       
       console.log('   ✅ Current User:', this.currentUser.email);
       
       // Check if user already has a review for this course - MOST IMPORTANT CHECK
       const existingReview = this.getUserReview(courseId);
       
       if (existingReview) {
           console.log('   ❌ User already reviewed this course');
           return false;
       }
       
       console.log('   ✅ No existing review found');
       
       // Students can write reviews if enrolled
       if (this.currentUser.userType === 'student') {
           const enrollments = JSON.parse(localStorage.getItem('enrollments') || '{}');
           const isEnrolled = enrollments[this.currentUser.email]?.includes(parseInt(courseId));
           console.log('   Student enrollment status:', isEnrolled);
           return isEnrolled;
       }
       
       // Teachers can review other teachers' courses (not their own)
       if (this.currentUser.userType === 'teacher') {
           const courses = JSON.parse(localStorage.getItem('courses') || '[]');
           const course = courses.find(c => c.id == courseId);
           
           if (!course) return false;
           
           const isOwn = course.creatorEmail === this.currentUser.email;
           console.log('   Is own course?', isOwn);
           
           return !isOwn; // Can review if NOT own course
       }
       
       return false;
   }

    getUserReview(courseId) {
        if (!this.currentUser) return null;
        
        const courseReviews = this.reviews[courseId] || [];
        return courseReviews.find(r => r.userId === this.currentUser.email);
    }

    isOwnCourse(courseId) {
        // Check if current user is the course instructor
        if (!this.currentUser || this.currentUser.userType !== 'teacher') return false;
        
        if (typeof teacherDashboard !== 'undefined' && teacherDashboard.teacherCourses) {
            return teacherDashboard.teacherCourses.some(course => course.id == courseId);
        }
        
        return false;
    }

    updateCharCount(courseId) {
        const textarea = document.getElementById(`reviewText-${courseId}`);
        const charCount = document.getElementById(`charCount-${courseId}`);
        
        if (textarea && charCount) {
            const length = textarea.value.length;
            charCount.textContent = `${length} / ${this.maxReviewLength}`;
            
            if (length > this.maxReviewLength * 0.9) {
                charCount.classList.add('warning');
            } else {
                charCount.classList.remove('warning');
            }
        }
    }

    submitReview(courseId) {
        if (!this.currentUser) {
            this.showNotification('Please login to submit a review', 'error');
            return;
        }

        const textarea = document.getElementById(`reviewText-${courseId}`);
        if (!textarea) {
            this.showNotification('Review form not found', 'error');
            return;
        }

        const content = textarea.value.trim();

        if (content.length < 10) {
            this.showNotification('Review must be at least 10 characters long', 'error');
            return;
        }

        // Get rating from rating manager - allow any rating (not just from rating manager)
        let rating = this.getUserRatingValue(courseId);
        
        // If no rating from rating manager, prompt for one
        if (!rating || rating === 0) {
            this.showNotification('Please rate the course (click the stars above) before submitting a review', 'warning');
            return;
        }

        const review = {
            courseId: parseInt(courseId),
            reviewId: this.generateId(),
            userId: this.currentUser.email,
            userName: `${this.currentUser.firstName} ${this.currentUser.lastName}`,
            userInitials: this.currentUser.firstName.charAt(0) + this.currentUser.lastName.charAt(0),
            userType: this.currentUser.userType,
            content: content,
            rating: rating,
            timestamp: Date.now(),
            helpful: { up: 0, down: 0 },
            edited: false
        };

        if (!this.reviews[courseId]) {
            this.reviews[courseId] = [];
        }

        this.reviews[courseId].push(review);
        this.saveReviews();

        textarea.value = '';
        this.updateCharCount(courseId);
        this.showNotification('Review submitted successfully! 🎉', 'success');
        
        // Refresh reviews display
        this.refreshReviewsDisplay(courseId);
        
        // Update tab count
        const reviewsTab = document.querySelector('.tab-btn:nth-child(1)');
        if (reviewsTab) {
            const count = (this.reviews[courseId] || []).length;
            reviewsTab.innerHTML = `<i class="fas fa-star"></i> Reviews (${count})`;
        }
    }

    getUserRatingValue(courseId) {
        if (typeof ratingManager !== 'undefined') {
            const userRating = ratingManager.getUserRating(courseId);
            console.log('Getting user rating for course', courseId, ':', userRating);
            return userRating;
        }
        console.log('Rating manager not found');
        return null;
    }

    toggleActionsDropdown(reviewId) {
        const dropdown = document.getElementById(`actions-${reviewId}`);
        if (dropdown) {
            dropdown.classList.toggle('hidden');
        }
    }

    editReview(reviewId) {
        const content = document.getElementById(`content-${reviewId}`);
        const editForm = document.getElementById(`edit-form-${reviewId}`);
        
        if (content && editForm) {
            content.style.display = 'none';
            editForm.classList.add('active');
        }
        
        this.toggleActionsDropdown(reviewId);
    }

    cancelEdit(reviewId) {
        const content = document.getElementById(`content-${reviewId}`);
        const editForm = document.getElementById(`edit-form-${reviewId}`);
        
        if (content && editForm) {
            content.style.display = 'block';
            editForm.classList.remove('active');
        }
    }

    saveEditedReview(reviewId) {
        const textarea = document.getElementById(`edit-text-${reviewId}`);
        const newContent = textarea.value.trim();

        if (newContent.length < 10) {
            this.showNotification('Review must be at least 10 characters long', 'error');
            return;
        }

        // Find and update review
        for (let courseId in this.reviews) {
            const reviewIndex = this.reviews[courseId].findIndex(r => r.reviewId === reviewId);
            if (reviewIndex !== -1) {
                this.reviews[courseId][reviewIndex].content = newContent;
                this.reviews[courseId][reviewIndex].edited = true;
                this.saveReviews();
                this.showNotification('Review updated successfully!', 'success');
                this.refreshReviewsDisplay(courseId);
                break;
            }
        }
    }

    deleteReview(reviewId) {
        if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
            return;
        }

        // Find and delete review
        for (let courseId in this.reviews) {
            const reviewIndex = this.reviews[courseId].findIndex(r => r.reviewId === reviewId);
            if (reviewIndex !== -1) {
                this.reviews[courseId].splice(reviewIndex, 1);
                this.saveReviews();
                
                // Also delete associated replies
                delete this.replies[reviewId];
                this.saveReplies();
                
                this.showNotification('Review deleted successfully', 'success');
                this.refreshReviewsDisplay(courseId);
                break;
            }
        }
    }

    toggleReplyForm(reviewId) {
        const replyForm = document.getElementById(`reply-form-${reviewId}`);
        if (replyForm) {
            replyForm.classList.toggle('active');
        }
    }

    cancelReply(reviewId) {
        const replyForm = document.getElementById(`reply-form-${reviewId}`);
        const textarea = document.getElementById(`reply-text-${reviewId}`);
        
        if (replyForm) {
            replyForm.classList.remove('active');
        }
        if (textarea) {
            textarea.value = '';
        }
    }

    submitReply(reviewId) {
        if (!this.currentUser) {
            this.showNotification('Please login to reply', 'error');
            return;
        }

        const textarea = document.getElementById(`reply-text-${reviewId}`);
        const content = textarea.value.trim();

        if (content.length < 5) {
            this.showNotification('Reply must be at least 5 characters long', 'error');
            return;
        }

        const reply = {
            replyId: this.generateId(),
            userId: this.currentUser.email,
            userName: `${this.currentUser.firstName} ${this.currentUser.lastName}`,
            userInitials: this.currentUser.firstName.charAt(0) + this.currentUser.lastName.charAt(0),
            content: content,
            timestamp: Date.now()
        };

        if (!this.replies[reviewId]) {
            this.replies[reviewId] = [];
        }

        this.replies[reviewId].push(reply);
        this.saveReplies();

        textarea.value = '';
        this.showNotification('Reply posted successfully!', 'success');
        
        // Find course ID and refresh
        for (let courseId in this.reviews) {
            if (this.reviews[courseId].some(r => r.reviewId === reviewId)) {
                this.refreshReviewsDisplay(courseId);
                break;
            }
        }
    }

    markHelpful(reviewId, vote) {
        if (!this.currentUser) {
            this.showNotification('Please login to vote', 'error');
            return;
        }

        const userKey = this.currentUser.email;
        
        if (!this.helpful[reviewId]) {
            this.helpful[reviewId] = {};
        }

        const currentVote = this.helpful[reviewId][userKey];

        // Find the review
        for (let courseId in this.reviews) {
            const review = this.reviews[courseId].find(r => r.reviewId === reviewId);
            if (review) {
                // Remove previous vote
                if (currentVote === 'up') {
                    review.helpful.up--;
                } else if (currentVote === 'down') {
                    review.helpful.down--;
                }

                // Add new vote or toggle off
                if (currentVote === vote) {
                    // Toggle off
                    delete this.helpful[reviewId][userKey];
                } else {
                    // New vote
                    if (vote === 'up') {
                        review.helpful.up++;
                    } else {
                        review.helpful.down++;
                    }
                    this.helpful[reviewId][userKey] = vote;
                }

                this.saveReviews();
                this.saveHelpful();
                this.refreshReviewsDisplay(courseId);
                break;
            }
        }
    }

    getUserHelpfulVote(reviewId) {
        if (!this.currentUser) return null;
        return this.helpful[reviewId]?.[this.currentUser.email] || null;
    }

    filterReviews(courseId, filter) {
        this.currentFilter = filter;
        
        // Update filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });

        // Refresh display
        this.refreshReviewsDisplay(courseId);
    }

    refreshReviewsDisplay(courseId) {
        const reviewsList = document.getElementById(`reviewsList-${courseId}`);
        if (reviewsList) {
            reviewsList.innerHTML = this.generateReviewsListHTML(courseId, this.currentFilter);
        }
        
        // Update the review summary stats
        const reviewsSummary = document.querySelector('.reviews-summary');
        if (reviewsSummary) {
            const reviewStats = this.calculateReviewStats(courseId);
            reviewsSummary.outerHTML = this.generateReviewsSummaryHTML(reviewStats);
        }
        
        // Update tab count
        const reviewsTab = document.querySelector('.tab-btn:nth-child(1)');
        if (reviewsTab) {
            const count = (this.reviews[courseId] || []).length;
            reviewsTab.innerHTML = `<i class="fas fa-star"></i> Reviews (${count})`;
        }
        
        // Check if user can still write review (hide form if they just submitted)
        const writeReviewSection = document.querySelector('.write-review-section');
        if (writeReviewSection && this.getUserReview(courseId)) {
            writeReviewSection.style.display = 'none';
        }
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInMs = now - date;
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) {
            return 'Today';
        } else if (diffInDays === 1) {
            return 'Yesterday';
        } else if (diffInDays < 7) {
            return `${diffInDays} days ago`;
        } else if (diffInDays < 30) {
            const weeks = Math.floor(diffInDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else if (diffInDays < 365) {
            const months = Math.floor(diffInDays / 30);
            return `${months} month${months > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    generateId() {
        return 'rev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    showNotification(message, type = 'info') {
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }
}

// Initialize review manager
let reviewManager;
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        reviewManager = new ReviewManager();
    }, 300);
});
// Course Rating System
// User Story #4 & #11 Implementation
class RatingManager {
    constructor() {
        this.ratings = {};
        this.videoRatings = {};
        this.currentUser = null;
        this.loadFromStorage();
        this.initializeCurrentUser();
    }

    loadFromStorage() {
        this.ratings = JSON.parse(localStorage.getItem('courseRatings') || '{}');
        this.videoRatings = JSON.parse(localStorage.getItem('videoRatings') || '{}');
    }

    saveToStorage() {
        localStorage.setItem('courseRatings', JSON.stringify(this.ratings));
        localStorage.setItem('videoRatings', JSON.stringify(this.videoRatings));
    }

    initializeCurrentUser() {
        const currentUserEmail = localStorage.getItem('currentUser');
        if (!currentUserEmail) return;
        
        const userProfiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
        this.currentUser = userProfiles[currentUserEmail];
    }

    // Rate a course
    rateCourse(courseId, rating, userEmail = null) {
        const email = userEmail || this.currentUser?.email;
        if (!email) return false;

        const key = `${courseId}`;
        if (!this.ratings[key]) {
            this.ratings[key] = {};
        }

        // Store user's rating (0-5, supports decimals)
        this.ratings[key][email] = parseFloat(rating);
        this.saveToStorage();
        
        console.log(`Course ${courseId} rated ${rating} by ${email}`);
        return true;
    }

    // Get user's rating for a course
    getUserRating(courseId, userEmail = null) {
        const email = userEmail || this.currentUser?.email;
        if (!email) return 0;

        const key = `${courseId}`;
        return this.ratings[key]?.[email] || 0;
    }

    // Get average rating for a course
    getCourseAverageRating(courseId) {
        const key = `${courseId}`;
        const courseRatings = this.ratings[key];
        
        if (!courseRatings || Object.keys(courseRatings).length === 0) {
            return 0;
        }

        const ratings = Object.values(courseRatings);
        const sum = ratings.reduce((acc, rating) => acc + rating, 0);
        return sum / ratings.length;
    }

    // Get rating count for a course
    getCourseRatingCount(courseId) {
        const key = `${courseId}`;
        const courseRatings = this.ratings[key];
        return courseRatings ? Object.keys(courseRatings).length : 0;
    }

    // Rate a video
    rateVideo(courseId, videoId, rating, userEmail = null) {
        const email = userEmail || this.currentUser?.email;
        if (!email) return false;

        const key = `${courseId}_${videoId}`;
        if (!this.videoRatings[key]) {
            this.videoRatings[key] = {};
        }

        this.videoRatings[key][email] = parseFloat(rating);
        this.saveToStorage();
        
        return true;
    }

    // Get user's rating for a video
    getUserVideoRating(courseId, videoId, userEmail = null) {
        const email = userEmail || this.currentUser?.email;
        if (!email) return 0;

        const key = `${courseId}_${videoId}`;
        return this.videoRatings[key]?.[email] || 0;
    }

    // Get average rating for a video
    getVideoAverageRating(courseId, videoId) {
        const key = `${courseId}_${videoId}`;
        const videoRatings = this.videoRatings[key];
        
        if (!videoRatings || Object.keys(videoRatings).length === 0) {
            return 0;
        }

        const ratings = Object.values(videoRatings);
        const sum = ratings.reduce((acc, rating) => acc + rating, 0);
        return sum / ratings.length;
    }

    // Check if user can rate (not their own course, must be enrolled or teacher)
    canRate(courseId, userEmail = null) {
        const email = userEmail || this.currentUser?.email;
        if (!email) return false;

        // Get course creator
        const courses = JSON.parse(localStorage.getItem('courses') || '[]');
        const course = courses.find(c => c.id == courseId);
        
        if (!course) return false;

        // Cannot rate own course
        if (course.creatorEmail === email) return false;

        // Teachers can rate other teachers' courses
        if (this.currentUser?.userType === 'teacher') return true;

        // Students must be enrolled
        const enrollments = JSON.parse(localStorage.getItem('enrollments') || '{}');
        return enrollments[email]?.includes(parseInt(courseId)) || false;
    }

    // Generate star rating HTML for display (read-only)
    generateStarRatingHTML(courseId, videoId = null, size = 'small') {
        const avgRating = videoId 
            ? this.getVideoAverageRating(courseId, videoId)
            : this.getCourseAverageRating(courseId);
        
        const count = videoId 
            ? Object.keys(this.videoRatings[`${courseId}_${videoId}`] || {}).length
            : this.getCourseRatingCount(courseId);

        const sizeClass = size === 'large' ? 'rating-large' : size === 'medium' ? 'rating-medium' : 'rating-small';

        return `
            <div class="course-rating-display ${sizeClass}">
                <span class="rating-value">${avgRating.toFixed(1)}</span>
                <div class="stars-display">
                    ${this.generateStarsHTML(avgRating, false)}
                </div>
                <span class="rating-count">(${count})</span>
            </div>
        `;
    }

    // Generate interactive star rating HTML
    generateInteractiveRatingHTML(courseId, videoId = null) {
        const currentRating = videoId 
            ? this.getUserVideoRating(courseId, videoId)
            : this.getUserRating(courseId);

        const idPrefix = videoId ? `video-${courseId}-${videoId}` : `course-${courseId}`;

        return `
            <div class="interactive-rating" id="${idPrefix}-rating">
                <label>Your Rating:</label>
                <div class="stars-interactive" data-course="${courseId}" data-video="${videoId || ''}">
                    ${[1, 2, 3, 4, 5].map(star => `
                        <i class="fas fa-star ${star <= currentRating ? 'active' : ''}" 
                           data-rating="${star}"
                           onclick="ratingManager.setRating(${courseId}, ${videoId || 'null'}, ${star})"></i>
                    `).join('')}
                </div>
                <span class="current-rating" id="${idPrefix}-current">${currentRating > 0 ? currentRating.toFixed(1) : 'Not rated'}</span>
            </div>
        `;
    }

    // Generate stars HTML
    generateStarsHTML(rating, interactive = false) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let html = '';

        for (let i = 1; i <= 5; i++) {
            if (i <= fullStars) {
                html += '<i class="fas fa-star active"></i>';
            } else if (i === fullStars + 1 && hasHalfStar) {
                html += '<i class="fas fa-star-half-alt active"></i>';
            } else {
                html += '<i class="far fa-star"></i>';
            }
        }

        return html;
    }

    // Set rating (interactive)
    setRating(courseId, videoId, rating) {
        if (!this.canRate(courseId)) {
            if (typeof showNotification === 'function') {
                showNotification('You cannot rate this course', 'error');
            }
            return;
        }

        if (videoId) {
            this.rateVideo(courseId, videoId, rating);
        } else {
            this.rateCourse(courseId, rating);
        }

        // Update display
        const idPrefix = videoId ? `video-${courseId}-${videoId}` : `course-${courseId}`;
        const currentRatingSpan = document.getElementById(`${idPrefix}-current`);
        if (currentRatingSpan) {
            currentRatingSpan.textContent = rating.toFixed(1);
        }

        // Update stars
        const starsContainer = document.querySelector(`[data-course="${courseId}"]${videoId ? `[data-video="${videoId}"]` : ''}`);
        if (starsContainer) {
            starsContainer.querySelectorAll('i').forEach((star, index) => {
                if (index < rating) {
                    star.classList.add('active');
                } else {
                    star.classList.remove('active');
                }
            });
        }

        if (typeof showNotification === 'function') {
            showNotification('Rating saved!', 'success');
        }

        // Refresh course displays if needed
        if (typeof dashboard !== 'undefined' && typeof dashboard.displayCourses === 'function') {
            dashboard.displayCourses();
        }
    }

    // Get rating statistics for a course
    getRatingStats(courseId) {
        const key = `${courseId}`;
        const courseRatings = this.ratings[key] || {};
        const ratings = Object.values(courseRatings);

        if (ratings.length === 0) {
            return {
                average: 0,
                count: 0,
                distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
            };
        }

        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        ratings.forEach(rating => {
            const rounded = Math.round(rating);
            distribution[rounded]++;
        });

        const sum = ratings.reduce((acc, r) => acc + r, 0);
        
        return {
            average: sum / ratings.length,
            count: ratings.length,
            distribution
        };
    }
}

// Initialize rating manager
let ratingManager;
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        ratingManager = new RatingManager();
    }, 200);
});
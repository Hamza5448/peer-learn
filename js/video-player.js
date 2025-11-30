import { supabase } from './supabaseClient.js';

// ✅ FIXED: Video Player with Supabase Storage URL support
class VideoPlayer {
    constructor() {
        this.currentUser = null;
        this.courseId = null;
        this.course = null;
        this.currentVideoIndex = 0;
        this.selectedRating = 0;
        this.autoSaveInterval = null;
        this.initialize();
    }

    async initialize() {
        await this.checkAuthentication();
        this.getCourseFromURL();
        this.setupEventListeners();
        await this.loadCourseContent();
        this.startAutoSave();
    }

    async checkAuthentication() {
        const currentUserEmail = localStorage.getItem('currentUser');
        if (!currentUserEmail) {
            window.location.href = 'index.html';
            return;
        }
        
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', currentUserEmail)
            .single();

        if (error || !user) {
            window.location.href = 'index.html';
            return;
        }

        this.currentUser = {
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            userType: user.user_type
        };

        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        const commentAvatar = document.getElementById('commentAvatar');
        
        if (userName) userName.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        const initials = this.currentUser.firstName.charAt(0) + this.currentUser.lastName.charAt(0);
        if (userAvatar) userAvatar.textContent = initials.toUpperCase();
        if (commentAvatar) commentAvatar.textContent = initials.toUpperCase();
    }

    getCourseFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        this.courseId = parseInt(urlParams.get('courseId'));
        
        if (!this.courseId) {
            this.showNotification('No course specified', 'error');
            setTimeout(() => history.back(), 2000);
        }
    }

    setupEventListeners() {
        const video = document.getElementById('videoPlayer');
        
        if (video) {
            video.addEventListener('timeupdate', () => this.onTimeUpdate());
            video.addEventListener('ended', () => this.onVideoEnd());
            video.addEventListener('pause', () => this.saveProgressNow());
            video.addEventListener('seeked', () => this.saveProgressNow());
        }

        document.querySelectorAll('.star-btn').forEach(star => {
            star.addEventListener('click', (e) => {
                this.selectedRating = parseInt(e.target.dataset.rating);
                this.updateStarRating();
            });
        });

        window.addEventListener('beforeunload', () => {
            this.saveProgressNow();
            if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
        });
    }

    startAutoSave() {
        if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
        
        this.autoSaveInterval = setInterval(() => {
            this.performAutoSave();
        }, 10000);
    }

    async performAutoSave() {
        const videoPlayer = document.getElementById('videoPlayer');
        const video = this.course?.videos[this.currentVideoIndex];
        
        if (video && videoPlayer && videoPlayer.currentTime > 0 && !videoPlayer.paused) {
            await this.saveProgressToSupabase(
                video.id,
                videoPlayer.currentTime,
                videoPlayer.duration
            );
            
            this.showAutoSaveIndicator();
            this.updateProgressDisplay();
        }
    }

    showAutoSaveIndicator() {
        const indicator = document.getElementById('autoSaveIndicator');
        if (indicator) {
            indicator.classList.add('saving');
            setTimeout(() => indicator.classList.remove('saving'), 1500);
        }
    }

    async saveProgressToSupabase(videoId, currentTime, duration) {
        const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;

        const { error } = await supabase
            .from('video_progress')
            .upsert({
                user_email: this.currentUser.email,
                course_id: this.courseId,
                video_id: videoId,
                time_position: currentTime,
                duration: duration,
                percentage: percentage,
                last_updated: new Date().toISOString()
            }, {
                onConflict: 'user_email,course_id,video_id'
            });

        if (error) console.error('Error saving progress:', error);
    }

    async saveProgressNow() {
        const videoPlayer = document.getElementById('videoPlayer');
        const video = this.course?.videos[this.currentVideoIndex];
        
        if (video && videoPlayer && videoPlayer.currentTime > 0) {
            await this.saveProgressToSupabase(
                video.id,
                videoPlayer.currentTime,
                videoPlayer.duration
            );
        }
    }

    onTimeUpdate() {
        const videoPlayer = document.getElementById('videoPlayer');
        const watchProgress = document.getElementById('watchProgress');
        
        if (videoPlayer && watchProgress && videoPlayer.duration > 0) {
            const percentage = Math.round((videoPlayer.currentTime / videoPlayer.duration) * 100);
            watchProgress.textContent = `Progress: ${percentage}%`;
        }
        
        this.updateRatingEligibility();
    }

    async updateRatingEligibility() {
        const { data: progressData } = await supabase
            .from('video_progress')
            .select('percentage')
            .eq('user_email', this.currentUser.email)
            .eq('course_id', this.courseId);

        let overallProgress = 0;
        if (progressData && progressData.length > 0) {
            const totalProgress = progressData.reduce((sum, p) => sum + p.percentage, 0);
            overallProgress = totalProgress / this.course.videos.length;
        }
        
        const eligibilityEl = document.getElementById('ratingEligibility');
        const submitBtn = document.getElementById('submitReviewBtn');
        
        if (eligibilityEl && submitBtn) {
            if (overallProgress >= 50) {
                eligibilityEl.textContent = 'You can now leave a rating!';
                eligibilityEl.style.color = '#10b981';
                submitBtn.disabled = false;
            } else {
                eligibilityEl.textContent = `Watch at least 50% of the course to leave a rating (${Math.round(overallProgress)}% watched)`;
                eligibilityEl.style.color = '#f59e0b';
                submitBtn.disabled = true;
            }
        }
    }

    updateProgressDisplay() {
        const videoPlayer = document.getElementById('videoPlayer');
        const watchProgress = document.getElementById('watchProgress');
        
        if (videoPlayer && watchProgress && videoPlayer.duration > 0) {
            const percentage = Math.round((videoPlayer.currentTime / videoPlayer.duration) * 100);
            watchProgress.textContent = `Progress: ${percentage}%`;
        }
        
        this.displayVideosList();
    }

    toggleFullscreen() {
        const wrapper = document.getElementById('videoPlayerWrapper');
        const btn = document.getElementById('fullscreenBtn');
        
        if (!wrapper) return;
        
        if (!wrapper.classList.contains('fullscreen')) {
            wrapper.classList.add('fullscreen');
            if (btn) btn.innerHTML = '<span class="fas fa-compress"></span><span>Exit Fullscreen</span>';
            
            if (wrapper.requestFullscreen) {
                wrapper.requestFullscreen();
            } else if (wrapper.webkitRequestFullscreen) {
                wrapper.webkitRequestFullscreen();
            }
        } else {
            wrapper.classList.remove('fullscreen');
            if (btn) btn.innerHTML = '<span class="fas fa-expand"></span><span>Fullscreen</span>';
            
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }

    async loadCourseContent() {
        console.log('🔵 Loading course:', this.courseId);
        
        const { data: course, error: courseError } = await supabase
            .from('courses')
            .select('*')
            .eq('id', this.courseId)
            .single();

        if (courseError || !course) {
            console.error('Course not found:', courseError);
            this.showNotification('Course not found', 'error');
            setTimeout(() => history.back(), 2000);
            return;
        }

        // Check enrollment
        const { data: enrollment } = await supabase
            .from('enrollments')
            .select('id')
            .eq('user_email', this.currentUser.email)
            .eq('course_id', this.courseId)
            .single();

        if (!enrollment) {
            this.showNotification('You must be enrolled in this course', 'error');
            setTimeout(() => history.back(), 2000);
            return;
        }

        // ✅ Load videos with video_url (from Supabase Storage)
        const { data: videos, error: videoError } = await supabase
            .from('videos')
            .select('*')
            .eq('course_id', this.courseId)
            .order('position', { ascending: true });

        if (videoError) {
            console.error('Error loading videos:', videoError);
        }

        console.log('✅ Loaded', videos ? videos.length : 0, 'videos');

        this.course = {
            id: course.id,
            title: course.title,
            description: course.description,
            creatorEmail: course.creator_email,
            creatorName: course.creator_name,
            videos: videos || []
        };

        if (this.course.videos.length === 0) {
            this.showNotification('This course has no videos', 'error');
            return;
        }

        const courseTitle = document.getElementById('courseTitle');
        if (courseTitle) courseTitle.textContent = this.course.title;
        
        this.displayVideosList();
        await this.loadVideo(0);
        await this.loadComments();
        await this.loadReviews();
    }

    async displayVideosList() {
        const container = document.getElementById('courseVideosList');
        if (!container) return;
        
        const progressPromises = this.course.videos.map(async (video) => {
            const { data } = await supabase
                .from('video_progress')
                .select('percentage')
                .eq('user_email', this.currentUser.email)
                .eq('course_id', this.courseId)
                .eq('video_id', video.id)
                .single();
            
            return data ? data.percentage : 0;
        });

        const percentages = await Promise.all(progressPromises);
        
        container.innerHTML = this.course.videos.map((video, index) => {
            const percentage = percentages[index];
            const isComplete = percentage >= 90;
            
            return `
                <div class="video-item ${index === this.currentVideoIndex ? 'active' : ''} ${isComplete ? 'completed' : ''}" 
                     onclick="videoPlayer.loadVideo(${index})">
                    <div class="video-item-number">
                        ${isComplete ? '<span class="fas fa-check"></span>' : index + 1}
                    </div>
                    <div class="video-item-info">
                        <div class="video-item-title">${video.name}</div>
                        <div class="video-item-progress">
                            <div class="progress-bar-small">
                                <div class="progress-fill-small" style="width: ${percentage}%"></div>
                            </div>
                            <span>${Math.round(percentage)}%</span>
                        </div>
                    </div>
                    ${index === this.currentVideoIndex ? '<span class="fas fa-play-circle playing-icon"></span>' : ''}
                </div>
            `;
        }).join('');

        const overallProgress = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
        const courseProgress = document.getElementById('courseProgress');
        if (courseProgress) courseProgress.textContent = Math.round(overallProgress) + '%';
    }

    async loadVideo(index) {
        if (index < 0 || index >= this.course.videos.length) return;
        
        await this.saveProgressNow();
        
        this.currentVideoIndex = index;
        const video = this.course.videos[index];
        
        console.log('🔵 Loading video:', video.name);
        console.log('   Video ID:', video.id);
        console.log('   Video URL:', video.video_url);
        
        const videoTitle = document.getElementById('videoTitle');
        const videoNumber = document.getElementById('videoNumber');
        
        if (videoTitle) videoTitle.textContent = video.name;
        if (videoNumber) videoNumber.textContent = `Video ${index + 1} of ${this.course.videos.length}`;
        
        const videoPlayer = document.getElementById('videoPlayer');
        const videoSource = document.getElementById('videoSource');
        
        // ✅ Check if video_url exists (new storage method)
        if (video.video_url) {
            console.log('✅ Using Supabase Storage URL');
            videoSource.src = video.video_url;
            videoPlayer.load();
            
            videoPlayer.onloadedmetadata = () => {
                console.log('✅ Video loaded from storage! Duration:', videoPlayer.duration, 'seconds');
                this.restoreProgress(video.id, videoPlayer);
            };
            
            videoPlayer.onerror = (e) => {
                console.error('❌ Video load error:', e);
                this.showNotification('Failed to load video from storage', 'error');
            };
        }
        // ✅ Fallback to video_data (old method for existing courses)
        else if (video.video_data) {
            console.log('⚠️ Using legacy video_data (Base64)');
            
            if (!video.video_data.startsWith('data:video/')) {
                console.error('❌ Invalid video data format');
                this.showNotification('Invalid video format', 'error');
                return;
            }
            
            videoSource.src = video.video_data;
            videoPlayer.load();
            
            videoPlayer.onloadedmetadata = () => {
                console.log('✅ Video loaded from Base64! Duration:', videoPlayer.duration, 'seconds');
                this.restoreProgress(video.id, videoPlayer);
            };
            
            videoPlayer.onerror = (e) => {
                console.error('❌ Video load error:', e);
                this.showNotification('Failed to load video', 'error');
            };
        } else {
            console.error('❌ No video data available');
            this.showNotification('Video data not found', 'error');
            return;
        }
        
        this.showNotification('Loading video...', 'info');
        this.displayVideosList();
        this.updateRatingEligibility();
    }

    async restoreProgress(videoId, videoPlayer) {
        const { data: progress } = await supabase
            .from('video_progress')
            .select('time_position')
            .eq('user_email', this.currentUser.email)
            .eq('course_id', this.courseId)
            .eq('video_id', videoId)
            .single();
        
        if (progress && progress.time_position > 0) {
            videoPlayer.currentTime = progress.time_position;
            console.log('✅ Restored progress:', progress.time_position, 'seconds');
        }
        
        videoPlayer.play().catch(err => {
            console.log('Auto-play prevented:', err.message);
        });
    }

    async onVideoEnd() {
        await this.saveProgressNow();
        
        if (this.currentVideoIndex < this.course.videos.length - 1) {
            this.showNotification('Next video starting in 3 seconds...', 'info');
            setTimeout(() => {
                this.loadVideo(this.currentVideoIndex + 1);
            }, 3000);
        } else {
            const { data: progressData } = await supabase
                .from('video_progress')
                .select('percentage')
                .eq('user_email', this.currentUser.email)
                .eq('course_id', this.courseId);

            let overallProgress = 0;
            if (progressData && progressData.length > 0) {
                const totalProgress = progressData.reduce((sum, p) => sum + p.percentage, 0);
                overallProgress = totalProgress / this.course.videos.length;
            }
            
            if (overallProgress >= 90) {
                this.showNotification('Congratulations! Course completed! 🎉', 'success');
            }
        }
    }

    // ========== COMMENTS ==========
    async postComment() {
        const input = document.getElementById('commentInput');
        const text = input ? input.value.trim() : '';
        
        if (!text) {
            this.showNotification('Please enter a comment', 'error');
            return;
        }

        const { error } = await supabase
            .from('comments')
            .insert([{
                course_id: this.courseId,
                user_email: this.currentUser.email,
                user_name: `${this.currentUser.firstName} ${this.currentUser.lastName}`,
                user_initials: this.currentUser.firstName.charAt(0) + this.currentUser.lastName.charAt(0),
                user_type: this.currentUser.userType,
                content: text
            }]);

        if (error) {
            this.showNotification('Failed to post comment', 'error');
            return;
        }

        input.value = '';
        await this.loadComments();
        this.showNotification('Comment posted!', 'success');
    }

    cancelComment() {
        const input = document.getElementById('commentInput');
        if (input) input.value = '';
    }

    async loadComments() {
        const { data: comments } = await supabase
            .from('comments')
            .select('*')
            .eq('course_id', this.courseId)
            .order('created_at', { ascending: false });

        const commentCount = document.getElementById('commentCount');
        if (commentCount) commentCount.textContent = comments ? comments.length : 0;
        
        const container = document.getElementById('commentsList');
        if (!container) return;
        
        if (!comments || comments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comment-slash"></i>
                    <p>No comments yet. Be the first to comment!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = comments.map(comment => {
            const isOwn = comment.user_email === this.currentUser.email;
            
            return `
                <div class="comment-item ${isOwn ? 'own-comment' : ''}">
                    <div class="comment-avatar">${comment.user_initials}</div>
                    <div class="comment-content">
                        <div class="comment-header">
                            <span class="comment-author">${comment.user_name}</span>
                            <span class="comment-date">${this.formatDate(comment.created_at)}</span>
                        </div>
                        <div class="comment-text">${comment.content}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ========== REVIEWS ==========
    async postReview() {
        const reviewInput = document.getElementById('reviewInput');
        const text = reviewInput ? reviewInput.value.trim() : '';
        
        if (this.selectedRating === 0) {
            this.showNotification('Please select a rating', 'error');
            return;
        }
        
        if (!text) {
            this.showNotification('Please write a review', 'error');
            return;
        }

        const { error } = await supabase
            .from('reviews')
            .insert([{
                course_id: this.courseId,
                user_email: this.currentUser.email,
                user_name: `${this.currentUser.firstName} ${this.currentUser.lastName}`,
                user_initials: this.currentUser.firstName.charAt(0) + this.currentUser.lastName.charAt(0),
                user_type: this.currentUser.userType,
                rating: this.selectedRating,
                content: text
            }]);

        if (error) {
            if (error.code === '23505') {
                this.showNotification('You already reviewed this course', 'error');
            } else {
                this.showNotification('Failed to submit review', 'error');
            }
            return;
        }

        this.selectedRating = 0;
        this.updateStarRating();
        if (reviewInput) reviewInput.value = '';
        
        await this.loadReviews();
        this.showNotification('Review submitted!', 'success');
    }

    updateStarRating() {
        document.querySelectorAll('.star-btn').forEach((star, index) => {
            if (index < this.selectedRating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
        const selectedRating = document.getElementById('selectedRating');
        if (selectedRating) selectedRating.textContent = this.selectedRating;
    }

    async loadReviews() {
        const { data: reviews } = await supabase
            .from('reviews')
            .select('*')
            .eq('course_id', this.courseId)
            .order('created_at', { ascending: false });

        const reviewCount = document.getElementById('reviewCount');
        if (reviewCount) reviewCount.textContent = reviews ? reviews.length : 0;
        
        const container = document.getElementById('reviewsList');
        if (!container) return;
        
        if (!reviews || reviews.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-star-half-alt"></i>
                    <p>No reviews yet. Be the first to review!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = reviews.map(review => `
            <div class="review-item">
                <div class="review-header">
                    <div class="reviewer-info">
                        <div class="reviewer-avatar">${review.user_initials}</div>
                        <div>
                            <div class="reviewer-name">${review.user_name}</div>
                            <div class="review-rating">
                                ${this.generateStars(review.rating)}
                                <span>${review.rating}/5</span>
                            </div>
                        </div>
                    </div>
                    <div class="review-date">${this.formatDate(review.created_at)}</div>
                </div>
                <div class="review-text">${review.content}</div>
            </div>
        `).join('');
    }

    generateStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += `<i class="fas fa-star ${i <= rating ? 'active' : ''}"></i>`;
        }
        return stars;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;

        if (!document.querySelector('.notification-styles')) {
            const styles = document.createElement('style');
            styles.className = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    z-index: 3000;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    max-width: 400px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
                }
                .notification-success { background: rgba(16, 185, 129, 0.95); }
                .notification-error { background: rgba(239, 68, 68, 0.95); }
                .notification-info { background: rgba(139, 92, 246, 0.95); }
                .notification button {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.2rem;
                    cursor: pointer;
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }
}

let videoPlayer;
document.addEventListener('DOMContentLoaded', function() {
    videoPlayer = new VideoPlayer();
    window.videoPlayer = videoPlayer;
});

// Global function for fullscreen toggle
window.toggleFullscreen = function() {
    if (videoPlayer) videoPlayer.toggleFullscreen();
};
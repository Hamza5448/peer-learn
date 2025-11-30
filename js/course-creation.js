import { supabase } from './supabaseClient.js';

// ✅ FIXED: Use Supabase Storage for videos
class CourseCreationManager {
    constructor() {
        this.currentUser = null;
        this.courseData = {
            title: '',
            description: '',
            category: 'Web Development',
            thumbnail: null,
            videos: []
        };
        this.currentVideoIndex = null;
        this.isEditMode = false;
        this.editCourseId = null;
        this.initialize();
    }

    async initialize() {
        await this.checkAuthentication();
        this.setupEventListeners();
        await this.loadExistingCourse();
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

        if (error || !user || user.user_type !== 'teacher') {
            window.location.href = 'dashboard.html';
            return;
        }

        this.currentUser = {
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            userType: user.user_type
        };
    }

    async loadExistingCourse() {
        const urlParams = new URLSearchParams(window.location.search);
        const courseId = urlParams.get('courseId');
        
        if (!courseId) return;

        this.isEditMode = true;
        this.editCourseId = parseInt(courseId);

        const { data: course, error } = await supabase
            .from('courses')
            .select('*')
            .eq('id', courseId)
            .single();

        if (error || !course) {
            showNotification('Course not found', 'error');
            return;
        }

        if (course.creator_email !== this.currentUser.email) {
            showNotification('You can only edit your own courses', 'error');
            window.location.href = 'teacher-dashboard.html';
            return;
        }

        // ✅ Load videos from database
        const { data: videos } = await supabase
            .from('videos')
            .select('*')
            .eq('course_id', courseId)
            .order('position', { ascending: true });

        this.courseData = {
            title: course.title,
            description: course.description,
            category: course.category,
            thumbnail: course.thumbnail,
            videos: (videos || []).map(v => ({
                id: v.id,
                name: v.name,
                thumbnail: v.thumbnail,
                size: v.size_bytes,
                duration: v.duration_seconds,
                videoUrl: v.video_url // ✅ Use URL instead of DataURL
            }))
        };

        console.log('✅ Loaded course:', this.courseData.title, '|', this.courseData.videos.length, 'videos');
        this.renderCourseInfo();
        this.renderPlaylist();
        if (this.courseData.videos.length > 0) {
            this.selectVideo(0);
        }
    }

    setupEventListeners() {
        const backBtn = document.getElementById('backToDashboardBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = 'teacher-dashboard.html';
            });
        }

        const thumbnailInput = document.getElementById('courseThumbnailInput');
        const thumbnailBox = document.getElementById('courseThumbnailBox');
        
        if (thumbnailBox) {
            thumbnailBox.addEventListener('click', () => thumbnailInput.click());
        }
        
        if (thumbnailInput) {
            thumbnailInput.addEventListener('change', (e) => this.handleCourseThumbnailUpload(e));
        }

        const titleInput = document.getElementById('courseTitle');
        const descInput = document.getElementById('courseDescription');
        const categoryInput = document.getElementById('courseCategory');
        
        if (titleInput) titleInput.addEventListener('input', (e) => {
            this.courseData.title = e.target.value;
        });
        
        if (descInput) descInput.addEventListener('input', (e) => {
            this.courseData.description = e.target.value;
        });
        
        if (categoryInput) categoryInput.addEventListener('change', (e) => {
            this.courseData.category = e.target.value;
        });

        const uploadZone = document.getElementById('uploadZone');
        const videoInput = document.getElementById('videoInput');
        
        if (uploadZone) {
            uploadZone.addEventListener('click', () => videoInput.click());
            
            uploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadZone.classList.add('drag-over');
            });
            
            uploadZone.addEventListener('dragleave', () => {
                uploadZone.classList.remove('drag-over');
            });
            
            uploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadZone.classList.remove('drag-over');
                const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/'));
                this.handleVideoUpload(files);
            });
        }
        
        if (videoInput) {
            videoInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                this.handleVideoUpload(files);
            });
        }

        const saveBtn = document.getElementById('saveCourseBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveCourse());
        }

        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (confirm('Discard changes and return to dashboard?')) {
                    window.location.href = 'teacher-dashboard.html';
                }
            });
        }
    }

    handleCourseThumbnailUpload(e) {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) {
            showNotification('Please select a valid image file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            this.courseData.thumbnail = event.target.result;
            this.renderCourseThumbnail();
        };
        reader.readAsDataURL(file);
    }

    renderCourseThumbnail() {
        const box = document.getElementById('courseThumbnailBox');
        if (this.courseData.thumbnail) {
            box.innerHTML = `
                <img src="${this.courseData.thumbnail}" alt="Course thumbnail">
                <button class="thumbnail-remove-btn" onclick="event.stopPropagation(); courseCreation.removeCourseThumbnail()">
                    <i class="fas fa-times"></i>
                </button>
            `;
            box.classList.add('has-image');
        } else {
            box.innerHTML = `
                <div class="thumbnail-placeholder">
                    <i class="fas fa-image"></i>
                    <p>Click to upload thumbnail</p>
                    <small>(Optional, 16:9 recommended)</small>
                </div>
            `;
            box.classList.remove('has-image');
        }
    }

    removeCourseThumbnail() {
        this.courseData.thumbnail = null;
        this.renderCourseThumbnail();
        showNotification('Thumbnail removed', 'info');
    }

    renderCourseInfo() {
        document.getElementById('courseTitle').value = this.courseData.title;
        document.getElementById('courseDescription').value = this.courseData.description;
        document.getElementById('courseCategory').value = this.courseData.category;
        this.renderCourseThumbnail();
    }

async handleVideoUpload(files) {
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    
    for (const file of files) {
        console.log('📤 Starting upload:', file.name);
        console.log('   File size:', (file.size / (1024 * 1024)).toFixed(1), 'MB');
        console.log('   File type:', file.type);
        
        if (file.size > MAX_SIZE) {
            showNotification(`Video "${file.name}" exceeds 100MB limit`, 'error');
            continue;
        }

        if (!file.type.startsWith('video/')) {
            showNotification(`"${file.name}" is not a video file`, 'error');
            continue;
        }

        showNotification(`Uploading ${file.name}...`, 'info');

        try {
            const videoId = 'video_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // ✅ STEP 1: Extract duration FIRST (before upload)
            console.log('🔵 Step 1: Extracting duration...');
            const duration = await this.getVideoDuration(file);
            console.log('   ✅ Duration:', duration, 'seconds');
            
            if (!duration || duration === 0) {
                throw new Error('Could not extract video duration');
            }
            
            // ✅ STEP 2: Sanitize filename
            const sanitizedFileName = file.name
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9.-]/g, '_')
                .toLowerCase();

            const folderName = this.currentUser.email
                .replace('@', '_at_')
                .replace(/\./g, '_');

            const filePath = `${folderName}/${videoId}_${sanitizedFileName}`;
            console.log('   Sanitized path:', filePath);
            
            // ✅ STEP 3: Upload to Supabase Storage
            console.log('🔵 Step 2: Uploading to Supabase Storage...');
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('course-videos')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                throw new Error(`Storage upload failed: ${uploadError.message}`);
            }

            console.log('   ✅ Uploaded to storage:', filePath);
            
            // ✅ STEP 4: Get public URL
            const { data: urlData } = supabase.storage
                .from('course-videos')
                .getPublicUrl(filePath);

            const videoUrl = urlData.publicUrl;
            console.log('   ✅ Public URL:', videoUrl);
            
            // ✅ STEP 5: Create video object WITH DURATION
            const newVideo = {
                id: videoId,
                name: file.name.replace(/\.[^/.]+$/, ''),
                thumbnail: null,
                size: file.size,
                duration: Math.round(duration), // ✅ NOW HAS DURATION!
                videoUrl: videoUrl
            };
            
            console.log('   ✅ Video object created with duration:', newVideo.duration, 'seconds');
            
            this.courseData.videos.push(newVideo);
            this.renderPlaylist();
            
            showNotification(`${file.name} uploaded!`, 'success');
            
            if (this.courseData.videos.length === 1) {
                this.selectVideo(0);
            }
            
            console.log('✅ Upload process completed!');
            
        } catch (error) {
            console.error('❌ Upload error:', error);
            showNotification(`Failed to upload ${file.name}: ${error.message}`, 'error');
        }
    }
}

    getVideoDuration(file) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        video.onloadedmetadata = function() {
            window.URL.revokeObjectURL(video.src);
            const duration = video.duration;
            
            if (!duration || isNaN(duration) || duration === 0) {
                reject(new Error('Could not determine video duration'));
            } else {
                resolve(duration);
            }
        };
        
        video.onerror = function() {
            reject(new Error('Failed to load video metadata'));
        };
        
        video.src = URL.createObjectURL(file);
    });
}

    renderPlaylist() {
        const container = document.getElementById('playlistVideos');
        const countEl = document.getElementById('playlistCount');
        
        if (countEl) countEl.textContent = this.courseData.videos.length;

        if (this.courseData.videos.length === 0) {
            container.innerHTML = `
                <div class="playlist-empty">
                    <i class="fas fa-video-slash"></i>
                    <p>No videos yet</p>
                    <small>Upload videos to get started</small>
                </div>
            `;
            return;
        }

        container.innerHTML = this.courseData.videos.map((video, index) => `
            <div class="playlist-video-item ${this.currentVideoIndex === index ? 'active' : ''}" 
                 onclick="courseCreation.selectVideo(${index})">
                <div class="video-item-header">
                    <div class="video-number">${index + 1}</div>
                    <div class="video-item-info">
                        <strong style="color: var(--text-primary); font-size: 0.85rem;">${video.name}</strong>
                        <small style="color: var(--text-secondary); font-size: 0.75rem;">${this.formatBytes(video.size)} • ${video.duration}s</small>
                    </div>
                    <div class="video-item-actions">
                        <button class="video-item-btn danger" onclick="event.stopPropagation(); courseCreation.deleteVideo(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <input type="text" 
                       class="video-name-input" 
                       value="${video.name}"
                       onclick="event.stopPropagation()"
                       onchange="courseCreation.updateVideoName(${index}, this.value)">
            </div>
        `).join('');
    }

    selectVideo(index) {
        if (index < 0 || index >= this.courseData.videos.length) return;
        
        this.currentVideoIndex = index;
        const video = this.courseData.videos[index];
        
        const videoPlayer = document.getElementById('videoPreview');
        const videoSource = document.getElementById('videoPreviewSource');
        const placeholder = document.getElementById('videoPlaceholder');
        const videoInfo = document.getElementById('videoInfoDisplay');
        
        if (video && video.videoUrl) {
            videoSource.src = video.videoUrl; // ✅ Use URL from storage
            videoPlayer.load();
            videoPlayer.style.display = 'block';
            placeholder.style.display = 'none';
            
            videoInfo.innerHTML = `
                <h4>${video.name}</h4>
                <p><i class="fas fa-video"></i> Video ${index + 1} of ${this.courseData.videos.length} • ${this.formatBytes(video.size)} • ${video.duration}s</p>
            `;
        }
        
        this.renderPlaylist();
    }

    updateVideoName(index, newName) {
        if (newName.trim()) {
            this.courseData.videos[index].name = newName.trim();
            if (this.currentVideoIndex === index) {
                this.selectVideo(index);
            }
        }
    }

    async deleteVideo(index) {
        if (!confirm('Delete this video?')) return;
        
        const video = this.courseData.videos[index];
        
        // ✅ Delete from storage if it exists
        if (video.videoUrl) {
            const filePath = video.videoUrl.split('/course-videos/')[1];
            if (filePath) {
                await supabase.storage
                    .from('course-videos')
                    .remove([filePath]);
            }
        }
        
        this.courseData.videos.splice(index, 1);
        
        if (this.currentVideoIndex === index) {
            if (this.courseData.videos.length > 0) {
                this.selectVideo(Math.min(index, this.courseData.videos.length - 1));
            } else {
                this.currentVideoIndex = null;
                document.getElementById('videoPreview').style.display = 'none';
                document.getElementById('videoPlaceholder').style.display = 'flex';
            }
        }
        
        this.renderPlaylist();
        showNotification('Video deleted', 'success');
    }

   async saveCourse() {
    console.log('🔵 ========== SAVE COURSE STARTED ==========');
    
    if (!this.courseData.title.trim()) {
        showNotification('Please enter a course title', 'error');
        return;
    }

    if (this.courseData.videos.length === 0) {
        showNotification('Please add at least one video', 'error');
        return;
    }

    const saveBtn = document.getElementById('saveCourseBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    try {
        let savedCourseId;
        
        if (this.isEditMode) {
            console.log('🔵 Updating existing course:', this.editCourseId);
            
            const { error: courseError } = await supabase
                .from('courses')
                .update({
                    title: this.courseData.title,
                    description: this.courseData.description,
                    category: this.courseData.category,
                    thumbnail: this.courseData.thumbnail || '📚',
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.editCourseId);

            if (courseError) throw courseError;

            console.log('✅ Course updated');
            
            // Delete old video records
            await supabase
                .from('videos')
                .delete()
                .eq('course_id', this.editCourseId);

            savedCourseId = this.editCourseId;
            showNotification('Course updated! Now saving videos...', 'info');
        } else {
            console.log('🔵 Creating new course...');
            
            const { data: course, error: courseError } = await supabase
                .from('courses')
                .insert([{
                    title: this.courseData.title,
                    description: this.courseData.description,
                    category: this.courseData.category,
                    thumbnail: this.courseData.thumbnail || '📚',
                    creator_email: this.currentUser.email,
                    creator_name: `${this.currentUser.firstName} ${this.currentUser.lastName}`,
                    published: true
                }])
                .select()
                .single();

            if (courseError) throw courseError;
            
            savedCourseId = course.id;
            console.log('✅ Course created, ID:', savedCourseId);
            showNotification('Course created! Now saving videos...', 'info');
        }

        // ✅ Save video records to database
        console.log('🔵 Saving video records...');
        
        const videoRecords = this.courseData.videos.map((v, i) => ({
            id: v.id,
            course_id: savedCourseId,
            name: v.name,
            video_url: v.videoUrl, // ✅ Storage URL
            thumbnail: v.thumbnail || null,
            size_bytes: v.size || 0,
            duration_seconds: v.duration || 0, // ✅ NOW HAS DURATION!
            position: i
        }));

        console.log('📊 Video records to insert:', videoRecords.length);
        videoRecords.forEach((v, i) => {
            console.log(`   Video ${i + 1}:`, v.name, '- Duration:', v.duration_seconds, 'seconds');
        });

        const { error: videosError } = await supabase
            .from('videos')
            .insert(videoRecords);

        if (videosError) throw videosError;
        
        console.log('✅ All videos saved with correct duration');
        showNotification('Course saved successfully! 🎉', 'success');

        setTimeout(() => {
            window.location.href = 'teacher-dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('❌ Save failed:', error);
        showNotification(error.message || 'Failed to save course', 'error');
        
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Course';
        }
    }
}

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

let courseCreation;
document.addEventListener('DOMContentLoaded', () => {
    courseCreation = new CourseCreationManager();
    window.courseCreation = courseCreation;
});

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
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
                z-index: 10001;
                display: flex;
                align-items: center;
                gap: 1rem;
                max-width: 400px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
            }
            .notification-success { background: rgba(16, 185, 129, 0.9); }
            .notification-error { background: rgba(239, 68, 68, 0.9); }
            .notification-info { background: rgba(59, 130, 246, 0.9); }
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
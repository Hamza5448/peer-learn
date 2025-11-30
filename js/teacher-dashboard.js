import { supabase } from './supabaseClient.js';

class TeacherDashboard {
    constructor() {
        this.currentUser = null;
        this.initialize();
    }

    async initialize() {
        console.log('🔵 Teacher Dashboard Initializing...');
        await this.checkAuthentication();
        this.loadUserData();
        this.setupEventListeners();
        await this.displayTeacherCourses();
        await this.updateStats();
        console.log('✅ Teacher Dashboard Ready');
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

    loadUserData() {
        const userName = document.getElementById('userName');
        const teacherWelcomeName = document.getElementById('teacherWelcomeName');
        const userAvatar = document.getElementById('userAvatar');
        
        if (userName) userName.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        if (teacherWelcomeName) teacherWelcomeName.textContent = this.currentUser.firstName;
        
        const initials = this.currentUser.firstName.charAt(0) + this.currentUser.lastName.charAt(0);
        if (userAvatar) userAvatar.textContent = initials.toUpperCase();
    }

    setupEventListeners() {
        // Create course buttons
        const createBtns = [
            document.getElementById('createCourseBtn'),
            document.getElementById('quickCreateCourse')
        ];
        createBtns.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    window.location.href = 'course-creation.html';
                });
            }
        });

        // Sidebar navigation - handle ALL data-page attributes
        document.querySelectorAll('.sidebar-menu li[data-page]').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.getAttribute('data-page');
                if (page) {
                    this.showPage(page);
                }
            });
        });

        // User menu dropdown navigation
        document.querySelectorAll('#userDropdown a[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                if (page) {
                    this.showPage(page);
                }
            });
        });

        // User menu dropdown
        const userMenuBtn = document.getElementById('userMenuBtn');
        const dropdown = document.getElementById('userDropdown');
        
        if (userMenuBtn && dropdown) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('hidden');
            });

            document.addEventListener('click', () => {
                dropdown.classList.add('hidden');
            });
        }

        // Logout buttons
        const logoutBtns = [
            document.getElementById('logoutBtn'),
            document.getElementById('sidebarLogoutBtn')
        ];
        logoutBtns.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logout();
                });
            }
        });
    }

    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
            page.classList.add('hidden');
        });

        // Show target page
        const targetPage = document.getElementById(`${pageId}-page`);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            targetPage.classList.add('active');
        }

        // Update sidebar active state
        document.querySelectorAll('.sidebar-menu li').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`[data-page="${pageId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }

        // Load page-specific content
        this.loadPageContent(pageId);
    }

    async loadPageContent(pageId) {
        switch (pageId) {
            case 'teacher-dashboard':
                await this.displayTeacherCourses();
                await this.updateStats();
                break;
            case 'my-courses-teacher':
                await this.loadAllTeacherCourses();
                break;
        }
    }

    async loadAllTeacherCourses() {
        const container = document.getElementById('allTeacherCoursesContainer');
        if (!container) return;

        const { data: courses, error } = await supabase
            .from('courses')
            .select('*')
            .eq('creator_email', this.currentUser.email)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching courses:', error);
            return;
        }

        if (!courses || courses.length === 0) {
            container.innerHTML = `
                <div class="empty-state large">
                    <i class="fas fa-video"></i>
                    <h2>No courses created yet</h2>
                    <p>Start by creating your first course</p>
                    <button class="btn-primary" onclick="window.location.href='course-creation.html'">
                        <i class="fas fa-plus"></i>
                        Create Course
                    </button>
                </div>
            `;
            return;
        }

        const coursesHTML = await Promise.all(courses.map(async (course) => {
            const { data: videos } = await supabase
                .from('videos')
                .select('id')
                .eq('course_id', course.id);

            const videoCount = videos ? videos.length : 0;

            return `
                <div class="course-card" onclick="window.location.href='course-creation.html?courseId=${course.id}'">
                    <div class="course-image">
                        ${this.renderCourseThumbnail(course)}
                    </div>
                    <div class="course-content">
                        <div class="course-title">${course.title}</div>
                        <div class="course-description">${course.description || 'No description'}</div>
                        <div class="course-stats">
                            <div class="course-stat">
                                <i class="fas fa-video"></i>
                                ${videoCount} videos
                            </div>
                            <div class="course-stat">
                                <i class="fas fa-calendar"></i>
                                ${new Date(course.created_at).toLocaleDateString()}
                            </div>
                        </div>
                        <div class="course-actions">
                            <button class="btn-outline small" onclick="event.stopPropagation(); window.location.href='course-creation.html?courseId=${course.id}'">
                                <i class="fas fa-edit"></i>
                                Edit
                            </button>
                            <button class="btn-outline small" onclick="event.stopPropagation(); window.open('video-player.html?courseId=${course.id}', '_blank')">
                                <i class="fas fa-eye"></i>
                                View
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }));

        container.innerHTML = `<div class="courses-grid">${coursesHTML.join('')}</div>`;
    }

    async displayTeacherCourses() {
        const container = document.getElementById('teacherCoursesGrid');
        if (!container) return;
        
        const { data: courses, error } = await supabase
            .from('courses')
            .select('*')
            .eq('creator_email', this.currentUser.email)
            .order('created_at', { ascending: false })
            .limit(3);
        
        if (error) {
            console.error('Error fetching courses:', error);
            return;
        }

        if (!courses || courses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-video"></i>
                    <h3>No courses created yet</h3>
                    <p>Start by creating your first course</p>
                    <button class="btn-primary" onclick="window.location.href='course-creation.html'">
                        <i class="fas fa-plus"></i>
                        Create Course
                    </button>
                </div>
            `;
            return;
        }

        const coursesHTML = await Promise.all(courses.map(async (course) => {
            const { data: videos } = await supabase
                .from('videos')
                .select('id')
                .eq('course_id', course.id);

            const videoCount = videos ? videos.length : 0;

            return `
                <div class="course-card" onclick="window.location.href='course-creation.html?courseId=${course.id}'">
                    <div class="course-image">
                        ${this.renderCourseThumbnail(course)}
                    </div>
                    <div class="course-content">
                        <div class="course-title">${course.title}</div>
                        <div class="course-description">${course.description || 'No description'}</div>
                        <div class="course-stats">
                            <div class="course-stat">
                                <i class="fas fa-video"></i>
                                ${videoCount} videos
                            </div>
                            <div class="course-stat">
                                <i class="fas fa-calendar"></i>
                                ${new Date(course.created_at).toLocaleDateString()}
                            </div>
                        </div>
                        <div class="course-actions">
                            <button class="btn-outline small" onclick="event.stopPropagation(); window.location.href='course-creation.html?courseId=${course.id}'">
                                <i class="fas fa-edit"></i>
                                Edit
                            </button>
                            <button class="btn-outline small" onclick="event.stopPropagation(); window.open('video-player.html?courseId=${course.id}', '_blank')">
                                <i class="fas fa-eye"></i>
                                View
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }));

        container.innerHTML = coursesHTML.join('');
    }

    renderCourseThumbnail(course) {
        if (course.thumbnail && course.thumbnail.startsWith('data:image')) {
            return `<img src="${course.thumbnail}" alt="${course.title}" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else {
            return course.thumbnail || '📚';
        }
    }

    async updateStats() {
        const { data: courses } = await supabase
            .from('courses')
            .select('id')
            .eq('creator_email', this.currentUser.email);

        const courseCount = courses ? courses.length : 0;
        
        const teacherCoursesEl = document.getElementById('teacherCourses');
        if (teacherCoursesEl) teacherCoursesEl.textContent = courseCount;
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        }
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

// Initialize
let teacherDashboard;
document.addEventListener('DOMContentLoaded', function() {
    teacherDashboard = new TeacherDashboard();
    window.teacherDashboard = teacherDashboard;
});
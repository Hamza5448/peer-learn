import { supabase } from './supabaseClient.js';

// Clean Student Dashboard - FIXED THUMBNAIL DISPLAY
class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.initialize();
    }

    async initialize() {
        await this.checkAuthentication();
        this.loadUserData();
        this.setupEventListeners();
        await this.displayCourses();
        await this.updateStats();
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
            userType: user.user_type,
            bio: user.bio,
            status: user.status
        };
    }

    loadUserData() {
        document.getElementById('userName').textContent = 
            `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        document.getElementById('welcomeUserName').textContent = this.currentUser.firstName;
        
        const initials = this.currentUser.firstName.charAt(0) + this.currentUser.lastName.charAt(0);
        document.getElementById('userAvatar').textContent = initials.toUpperCase();
    }

    setupEventListeners() {
        document.querySelectorAll('.sidebar-menu li').forEach(item => {
            if (item.onclick) return;
            
            item.addEventListener('click', () => {
                const page = item.getAttribute('data-page');
                if (page) {
                    this.showPage(page);
                }
            });
        });

        const userMenu = document.querySelector('.user-menu');
        const dropdown = document.getElementById('userDropdown');
        
        if (userMenu && dropdown) {
            userMenu.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('hidden');
            });

            document.addEventListener('click', () => {
                dropdown.classList.add('hidden');
            });
        }

        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.handleSearch(searchInput.value);
            }, 300));

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch(searchInput.value);
                }
            });
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    showPage(pageId) {
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
            page.classList.add('hidden');
        });

        const targetPage = document.getElementById(`${pageId}-page`);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            targetPage.classList.add('active');
        }

        document.querySelectorAll('.sidebar-menu li').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`[data-page="${pageId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }

        this.loadPageContent(pageId);
    }

    async loadPageContent(pageId) {
        switch (pageId) {
            case 'dashboard':
                await this.displayCourses();
                await this.updateStats();
                break;
            case 'my-courses':
                await this.loadMyCourses();
                break;
        }
    }

    async displayCourses() {
        const enrolledCourses = await this.getUserCourses();
        
        this.displayContinueLearning(enrolledCourses);
        
        const allCourses = await this.getAllCourses();
        const enrolledIds = enrolledCourses.map(c => c.id);
        const recommendedCourses = allCourses.filter(course => 
            !enrolledIds.includes(course.id) && course.creatorEmail !== this.currentUser.email
        );
        this.displayRecommendedCourses(recommendedCourses);
        
        this.displayEnrolledSidebar(enrolledCourses);
    }

    async getUserCourses() {
        const { data: enrollments } = await supabase
            .from('enrollments')
            .select('course_id')
            .eq('user_email', this.currentUser.email);

        if (!enrollments || enrollments.length === 0) return [];

        const courseIds = enrollments.map(e => e.course_id);
        
        const { data: courses } = await supabase
            .from('courses')
            .select('*')
            .in('id', courseIds);

        return courses || [];
    }

    async getAllCourses() {
        const { data: courses } = await supabase
            .from('courses')
            .select('*')
            .eq('published', true)
            .order('created_at', { ascending: false });

        return courses || [];
    }

    renderCourseThumbnail(course) {
        if (course.thumbnail && course.thumbnail.startsWith('data:image')) {
            return `<img src="${course.thumbnail}" alt="${course.title}" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else {
            return course.thumbnail || '📚';
        }
    }

    displayContinueLearning(courses) {
        const container = document.getElementById('continueLearningGrid');
        
        if (courses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-play-circle"></i>
                    <h3>No courses enrolled</h3>
                    <p>Explore and enroll in courses to start learning</p>
                </div>
            `;
            return;
        }

        container.innerHTML = courses.map(course => {
            return `
                <div class="course-card" onclick="dashboard.openCourse(${course.id})">
                    <div class="course-image">
                        ${this.renderCourseThumbnail(course)}
                        <div class="course-progress">
                            <div class="course-progress-bar" style="width: 0%"></div>
                        </div>
                    </div>
                    <div class="course-content">
                        <div class="course-title">${course.title}</div>
                        <div class="course-instructor">
                            <i class="fas fa-user"></i>
                            ${course.creator_name}
                        </div>
                        <div class="course-description">${course.description || 'No description'}</div>
                        <button class="continue-btn" onclick="event.stopPropagation(); dashboard.openCourse(${course.id})">
                            Continue Learning
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    displayRecommendedCourses(courses) {
        const container = document.getElementById('recommendedCoursesGrid');
        
        if (courses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No courses available</h3>
                    <p>Check back later for new courses</p>
                </div>
            `;
            return;
        }

        container.innerHTML = courses.map(course => `
            <div class="course-card" onclick="dashboard.showCourseDetails(${course.id})">
                <div class="course-image">
                    ${this.renderCourseThumbnail(course)}
                    <div class="course-badge">New</div>
                </div>
                <div class="course-content">
                    <div class="course-title">${course.title}</div>
                    <div class="course-instructor">
                        <i class="fas fa-user"></i>
                        ${course.creator_name}
                    </div>
                    <div class="course-description">${course.description || 'No description'}</div>
                    <button class="enroll-btn" onclick="event.stopPropagation(); dashboard.enrollInCourse(${course.id})">
                        Enroll Now
                    </button>
                </div>
            </div>
        `).join('');
    }

    displayEnrolledSidebar(courses) {
        const container = document.getElementById('enrolledCoursesSidebar');
        
        if (courses.length === 0) {
            container.innerHTML = `
                <li style="color: var(--text-secondary); font-style: italic; padding: 1rem;">
                    No courses enrolled
                </li>
            `;
            return;
        }

        container.innerHTML = courses.map(course => {
            return `
                <li onclick="dashboard.openCourse(${course.id})">
                    <i class="fas fa-book"></i>
                    <span>${course.title}</span>
                    <div class="progress-indicator" style="background: var(--border-color);">
                        <div class="progress-fill" style="width: 0%; background: var(--primary-color);"></div>
                    </div>
                </li>
            `;
        }).join('');
    }

    async loadMyCourses() {
        const container = document.getElementById('myCoursesContainer');
        const enrolledCourses = await this.getUserCourses();
        
        if (enrolledCourses.length === 0) {
            container.innerHTML = `
                <div class="empty-state large">
                    <i class="fas fa-book-open"></i>
                    <h2>No Courses Enrolled</h2>
                    <p>Start by exploring and enrolling in courses that interest you</p>
                </div>
            `;
            return;
        }

        container.innerHTML = enrolledCourses.map(course => {
            return `
                <div class="my-course-card">
                    <div class="course-header">
                        <div class="course-info">
                            <h3>${course.title}</h3>
                            <p>by ${course.creator_name}</p>
                        </div>
                        <div class="course-progress-display">
                            <span class="progress-percentage">0%</span>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: 0%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="course-actions">
                        <button class="btn-outline" onclick="dashboard.openCourse(${course.id})">
                            <i class="fas fa-play"></i>
                            Continue
                        </button>
                        <button class="btn-outline" onclick="dashboard.unenrollFromCourse(${course.id})">
                            <i class="fas fa-times"></i>
                            Unenroll
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async updateStats() {
        const enrolledCourses = await this.getUserCourses();
        
        document.getElementById('activeCourses').textContent = enrolledCourses.length;
        document.getElementById('completed').textContent = '0';
        document.getElementById('studyTime').textContent = '0h';
    }

    async showCourseDetails(courseId) {
        const { data: course } = await supabase
            .from('courses')
            .select('*')
            .eq('id', courseId)
            .single();

        if (!course) return;

        const { data: enrollments } = await supabase
            .from('enrollments')
            .select('id')
            .eq('user_email', this.currentUser.email)
            .eq('course_id', courseId);

        const isEnrolled = enrollments && enrollments.length > 0;
        
        document.getElementById('courseModalTitle').textContent = course.title;
        document.getElementById('courseModalContent').innerHTML = `
            <div class="course-modal-content">
                <div class="modal-course-header">
                    <div class="modal-course-image">
                        ${this.renderCourseThumbnail(course)}
                    </div>
                    <div class="modal-course-info">
                        <h3>${course.title}</h3>
                        <p class="course-instructor">by ${course.creator_name}</p>
                        <div class="course-meta">
                            <span><i class="fas fa-calendar"></i> ${new Date(course.created_at).toLocaleDateString()}</span>
                        </div>
                        ${isEnrolled ? `
                            <div class="enrollment-status">
                                <i class="fas fa-check-circle"></i>
                                Enrolled
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="modal-course-description">
                    <h4>About this course</h4>
                    <p>${course.description || 'No description available'}</p>
                </div>

                <div class="modal-course-actions">
                    ${isEnrolled ? `
                        <button class="btn-primary" onclick="dashboard.openCourse(${course.id}); closeCourseModal()">
                            <i class="fas fa-play"></i>
                            Start Learning
                        </button>
                        <button class="btn-outline" onclick="dashboard.unenrollFromCourse(${course.id}); closeCourseModal()">
                            <i class="fas fa-times"></i>
                            Unenroll
                        </button>
                    ` : `
                        <button class="btn-primary" onclick="dashboard.enrollInCourse(${course.id}); closeCourseModal()">
                            <i class="fas fa-plus"></i>
                            Enroll Now
                        </button>
                    `}
                </div>
            </div>
        `;

        document.getElementById('courseModal').classList.remove('hidden');
    }

    async enrollInCourse(courseId) {
        const { error } = await supabase
            .from('enrollments')
            .insert([{
                user_email: this.currentUser.email,
                course_id: courseId
            }]);

        if (error) {
            if (error.code === '23505') {
                this.showNotification('Already enrolled in this course', 'info');
            } else {
                this.showNotification('Failed to enroll', 'error');
            }
            return;
        }

        this.showNotification('Successfully enrolled in course!', 'success');
        await this.displayCourses();
        await this.updateStats();
    }

    async unenrollFromCourse(courseId) {
        if (confirm('Are you sure you want to unenroll from this course?')) {
            const { error } = await supabase
                .from('enrollments')
                .delete()
                .eq('user_email', this.currentUser.email)
                .eq('course_id', courseId);

            if (error) {
                this.showNotification('Failed to unenroll', 'error');
                return;
            }

            this.showNotification('Unenrolled from course', 'info');
            await this.displayCourses();
            await this.updateStats();
        }
    }

    async openCourse(courseId) {
        const { data: videos } = await supabase
            .from('videos')
            .select('id')
            .eq('course_id', courseId);

        if (!videos || videos.length === 0) {
            this.showNotification('This course has no videos yet', 'error');
            return;
        }
        
        window.location.href = `video-player.html?courseId=${courseId}`;
    }

    handleSearch(query) {
        if (!query.trim()) {
            // Hide search results if exists
            return;
        }
        console.log('Search:', query);
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
}

function closeCourseModal() {
    document.getElementById('courseModal').classList.add('hidden');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
}

let dashboard;
document.addEventListener('DOMContentLoaded', function() {
    dashboard = new DashboardManager();
});

window.dashboard = dashboard;
window.closeCourseModal = closeCourseModal;
window.logout = logout;
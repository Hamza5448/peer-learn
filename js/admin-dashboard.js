// Admin Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const currentUser = authManager.getCurrentUser();
    
    if (!currentUser || currentUser.userType !== 'admin') {
        window.location.href = 'index.html';
        return;
    }
    
    initAdminDashboard(currentUser);
});

function initAdminDashboard(user) {
    document.getElementById('userName').textContent = `${user.firstName} ${user.lastName}`;
    document.getElementById('userAvatar').textContent = getInitials(user.firstName, user.lastName);
    
    document.getElementById('adminFirstName').value = user.firstName;
    document.getElementById('adminLastName').value = user.lastName;
    document.getElementById('adminEmail').value = user.email;
    
    setupNavigation();
    loadOverviewStats();
    loadUsers();
    loadCourses();
    setupEventListeners();
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.content-section').forEach(sec => {
                sec.classList.remove('active');
            });
            document.getElementById(section).classList.add('active');
            
            const titles = {
                'overview': 'Admin Overview',
                'users': 'User Management',
                'courses': 'Course Management',
                'analytics': 'Analytics',
                'messages': 'Messages',
                'settings': 'Settings'
            };
            document.getElementById('section-title').textContent = titles[section] || 'Dashboard';
            
            if (section === 'analytics') {
                loadAnalyticsCharts();
            } else if (section === 'messages') {
                loadConversations();
            }
        });
    });
}

function loadOverviewStats() {
    const users = authManager.getAllUsers();
    const students = users.filter(u => u.userType === 'student');
    const teachers = users.filter(u => u.userType === 'teacher');
    
    const courses = JSON.parse(localStorage.getItem('courses')) || [];
    
    document.getElementById('totalUsers').textContent = users.length;
    document.getElementById('totalStudents').textContent = students.length;
    document.getElementById('totalTeachers').textContent = teachers.length;
    document.getElementById('totalCourses').textContent = courses.length;
    
    loadOverviewCharts(users);
    loadRecentActivity();
}

function loadOverviewCharts(users) {
    const userGrowthCanvas = document.getElementById('userGrowthChart');
    if (userGrowthCanvas) {
        const chart = new SimpleChart(userGrowthCanvas, 'line');
        const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const data = [2, 5, 3, 8, 6, 4, 7];
        chart.setData(labels, data);
    }
    
    const userDistCanvas = document.getElementById('userDistributionChart');
    if (userDistCanvas) {
        const chart = new SimpleChart(userDistCanvas, 'pie');
        const students = users.filter(u => u.userType === 'student').length;
        const teachers = users.filter(u => u.userType === 'teacher').length;
        const admins = users.filter(u => u.userType === 'admin').length;
        chart.setData(['Students', 'Teachers', 'Admins'], [students, teachers, admins]);
    }
}

function loadRecentActivity() {
    const activityList = document.getElementById('activityList');
    
    const activities = [
        { icon: '👤', title: 'New user registered', detail: 'John Doe joined as a student', time: '2 hours ago' },
        { icon: '📚', title: 'New course created', detail: 'Web Development Basics by Teacher User', time: '5 hours ago' },
        { icon: '⭐', title: 'New review submitted', detail: '5-star review on Python Course', time: '1 day ago' },
        { icon: '🎓', title: 'Course completed', detail: 'Student User completed JavaScript 101', time: '2 days ago' }
    ];
    
    activityList.innerHTML = activities.map(a => `
        <div class="activity-item">
            <div class="activity-icon">${a.icon}</div>
            <div class="activity-info">
                <h4>${a.title}</h4>
                <p>${a.detail} - ${a.time}</p>
            </div>
        </div>
    `).join('');
}

function loadUsers() {
    const users = authManager.getAllUsers();
    renderUsersTable(users);
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted" style="padding:2rem">
                    No users found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>
                <div class="user-cell">
                    <div class="avatar">${getInitials(user.firstName, user.lastName)}</div>
                    <span>${user.firstName} ${user.lastName}</span>
                </div>
            </td>
            <td>${user.email}</td>
            <td><span class="badge badge-primary">${user.userType}</span></td>
            <td><span class="status-badge ${user.status || 'active'}">${user.status || 'active'}</span></td>
            <td>${formatDate(user.joinDate)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewUser('${user.email}')">View</button>
                    ${user.status === 'suspended' ? 
                        `<button class="action-btn activate" onclick="activateUser('${user.email}')">Activate</button>` :
                        `<button class="action-btn suspend" onclick="suspendUser('${user.email}')">Suspend</button>`
                    }
                </div>
            </td>
        </tr>
    `).join('');
}

function loadCourses() {
    const courses = JSON.parse(localStorage.getItem('courses')) || [];
    renderCoursesTable(courses);
}

function renderCoursesTable(courses) {
    const tbody = document.getElementById('coursesTableBody');
    
    if (courses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted" style="padding:2rem">
                    No courses found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = courses.map(course => {
        const enrollments = JSON.parse(localStorage.getItem('enrollments')) || [];
        const courseEnrollments = enrollments.filter(e => e.courseId === course.id).length;
        
        return `
            <tr>
                <td>${course.title}</td>
                <td>${course.creatorName || 'Unknown'}</td>
                <td><span class="badge badge-primary">${course.category || 'Other'}</span></td>
                <td><span class="status-badge ${course.published ? 'published' : 'draft'}">${course.published ? 'Published' : 'Draft'}</span></td>
                <td>${courseEnrollments}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="viewCourse('${course.id}')">View</button>
                        <button class="action-btn delete" onclick="deleteCourse('${course.id}')">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function loadAnalyticsCharts() {
    const platformCanvas = document.getElementById('platformActivityChart');
    if (platformCanvas) {
        const chart = new SimpleChart(platformCanvas, 'line');
        const labels = [];
        const data = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.getDate().toString());
            data.push(Math.floor(Math.random() * 50) + 10);
        }
        chart.setData(labels, data);
    }
    
    const categoryCanvas = document.getElementById('categoryChart');
    if (categoryCanvas) {
        const chart = new SimpleChart(categoryCanvas, 'pie');
        chart.setData(
            ['Programming', 'Design', 'Business', 'Marketing'],
            [45, 25, 20, 10]
        );
    }
    
    const enrollmentCanvas = document.getElementById('enrollmentChart');
    if (enrollmentCanvas) {
        const chart = new SimpleChart(enrollmentCanvas, 'bar');
        chart.setData(
            ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            [15, 22, 18, 30]
        );
    }
}

function loadConversations() {
    const container = document.querySelector('.conversation-items');
    const users = authManager.getAllUsers().filter(u => u.userType !== 'admin');
    
    if (users.length === 0) {
        container.innerHTML = '<p class="text-muted" style="padding:1rem;text-align:center">No conversations</p>';
        return;
    }
    
    container.innerHTML = users.map(user => `
        <div class="conversation-item" onclick="openChat('${user.email}')">
            <div class="avatar">${getInitials(user.firstName, user.lastName)}</div>
            <div class="conversation-info">
                <h4>${user.firstName} ${user.lastName}</h4>
                <p>${user.userType}</p>
            </div>
        </div>
    `).join('');
}

function openChat(email) {
    const user = authManager.userProfiles[email];
    if (!user) return;
    
    const chatArea = document.getElementById('chatArea');
    
    chatArea.innerHTML = `
        <div class="chat-header">
            <div class="avatar">${getInitials(user.firstName, user.lastName)}</div>
            <div>
                <h4>${user.firstName} ${user.lastName}</h4>
                <span class="text-muted">${user.userType}</span>
            </div>
        </div>
        <div class="chat-messages" id="chatMessages">
            <div class="message received">
                <p>Hello! How can I help you?</p>
                <span class="time">10:30 AM</span>
            </div>
        </div>
        <div class="chat-input">
            <button class="attachment-btn"><span class="fas fa-paperclip"></span></button>
            <input type="text" placeholder="Type a message..." id="messageInput">
            <button class="btn-primary" onclick="sendMessage('${email}')">Send</button>
        </div>
    `;
    
    document.querySelectorAll('.conversation-item').forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

function sendMessage(receiverEmail) {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message sent';
    messageDiv.innerHTML = `
        <p>${escapeHtml(message)}</p>
        <span class="time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
    `;
    messagesContainer.appendChild(messageDiv);
    
    input.value = '';
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    setTimeout(() => {
        const responseDiv = document.createElement('div');
        responseDiv.className = 'message received';
        responseDiv.innerHTML = `
            <p>Thank you for your message. I'll get back to you soon!</p>
            <span class="time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        `;
        messagesContainer.appendChild(responseDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 1000);
}

function setupEventListeners() {
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', debounce(filterUsers, 300));
    }
    
    const userTypeFilter = document.getElementById('userTypeFilter');
    const userStatusFilter = document.getElementById('userStatusFilter');
    if (userTypeFilter) userTypeFilter.addEventListener('change', filterUsers);
    if (userStatusFilter) userStatusFilter.addEventListener('change', filterUsers);
    
    const courseSearch = document.getElementById('courseSearch');
    if (courseSearch) {
        courseSearch.addEventListener('input', debounce(filterCourses, 300));
    }
    
    const courseStatusFilter = document.getElementById('courseStatusFilter');
    if (courseStatusFilter) courseStatusFilter.addEventListener('change', filterCourses);
    
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }
}

function filterUsers() {
    const search = document.getElementById('userSearch').value.toLowerCase();
    const typeFilter = document.getElementById('userTypeFilter').value;
    const statusFilter = document.getElementById('userStatusFilter').value;
    
    let users = authManager.getAllUsers();
    
    if (search) {
        users = users.filter(u => 
            u.firstName.toLowerCase().includes(search) ||
            u.lastName.toLowerCase().includes(search) ||
            u.email.toLowerCase().includes(search)
        );
    }
    
    if (typeFilter !== 'all') {
        users = users.filter(u => u.userType === typeFilter);
    }
    
    if (statusFilter !== 'all') {
        users = users.filter(u => (u.status || 'active') === statusFilter);
    }
    
    renderUsersTable(users);
}

function filterCourses() {
    const search = document.getElementById('courseSearch').value.toLowerCase();
    const statusFilter = document.getElementById('courseStatusFilter').value;
    
    let courses = JSON.parse(localStorage.getItem('courses')) || [];
    
    if (search) {
        courses = courses.filter(c => 
            c.title.toLowerCase().includes(search) ||
            (c.creatorName && c.creatorName.toLowerCase().includes(search))
        );
    }
    
    if (statusFilter !== 'all') {
        const isPublished = statusFilter === 'published';
        courses = courses.filter(c => c.published === isPublished);
    }
    
    renderCoursesTable(courses);
}

function viewUser(email) {
    const user = authManager.userProfiles[email];
    if (!user) return;
    
    const modal = document.getElementById('userModal');
    const body = document.getElementById('userModalBody');
    
    body.innerHTML = `
        <div class="user-details">
            <div class="text-center mb-4">
                <div class="avatar avatar-xl" style="margin:0 auto">${getInitials(user.firstName, user.lastName)}</div>
                <h3 class="mt-2">${user.firstName} ${user.lastName}</h3>
                <span class="badge badge-primary">${user.userType}</span>
                <span class="status-badge ${user.status || 'active'}">${user.status || 'active'}</span>
            </div>
            <div class="divider"></div>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Joined:</strong> ${formatDate(user.joinDate)}</p>
            <p><strong>Bio:</strong> ${user.bio || 'No bio provided'}</p>
            <div class="mt-3">
                ${user.status === 'suspended' ? 
                    `<button class="btn-success full-width" onclick="activateUser('${user.email}');closeUserModal()">Activate User</button>` :
                    `<button class="btn-danger full-width" onclick="suspendUser('${user.email}');closeUserModal()">Suspend User</button>`
                }
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function closeUserModal() {
    document.getElementById('userModal').classList.add('hidden');
}

function suspendUser(email) {
    if (confirm('Are you sure you want to suspend this user?')) {
        authManager.suspendUser(email);
        showNotification('User suspended successfully', 'success');
        loadUsers();
    }
}

function activateUser(email) {
    authManager.activateUser(email);
    showNotification('User activated successfully', 'success');
    loadUsers();
}

function viewCourse(courseId) {
    window.location.href = `video-player.html?courseId=${courseId}`;
}

function deleteCourse(courseId) {
    if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
        let courses = JSON.parse(localStorage.getItem('courses')) || [];
        courses = courses.filter(c => c.id !== courseId);
        localStorage.setItem('courses', JSON.stringify(courses));
        showNotification('Course deleted successfully', 'success');
        loadCourses();
        loadOverviewStats();
    }
}

function handleProfileUpdate(e) {
    e.preventDefault();
    
    const currentUser = authManager.getCurrentUser();
    const updates = {
        firstName: document.getElementById('adminFirstName').value,
        lastName: document.getElementById('adminLastName').value
    };
    
    authManager.updateProfile(currentUser.email, updates);
    showNotification('Profile updated successfully', 'success');
    
    document.getElementById('userName').textContent = `${updates.firstName} ${updates.lastName}`;
    document.getElementById('userAvatar').textContent = getInitials(updates.firstName, updates.lastName);
}

function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    
    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match', 'error');
        return;
    }
    
    const currentUser = authManager.getCurrentUser();
    
    try {
        authManager.changePassword(currentUser.email, currentPassword, newPassword);
        showNotification('Password changed successfully', 'success');
        document.getElementById('passwordForm').reset();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Utility functions
function getInitials(firstName, lastName) {
    return (firstName?.charAt(0) || '') + (lastName?.charAt(0) || '');
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

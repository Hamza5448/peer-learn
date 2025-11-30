import { supabase } from './supabaseClient.js';

class ProfileSettingsManager {
    constructor() {
        this.currentUser = null;
        this.initialize();
    }

    async initialize() {
        await this.loadCurrentUser();
        this.setupEventListeners();
        await this.loadProfileData();
        await this.loadNotificationSettings();
    }

    async loadCurrentUser() {
        const currentUserEmail = localStorage.getItem('currentUser');
        if (!currentUserEmail) return;

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', currentUserEmail)
            .single();

        if (error || !user) {
            console.error('Error loading user:', error);
            return;
        }

        this.currentUser = {
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            userType: user.user_type,
            bio: user.bio || '',
            avatar: user.avatar,
            notifications: user.notifications || {
                emailUpdates: true,
                courseUpdates: true,
                messageAlerts: true
            }
        };
    }

    setupEventListeners() {
        // Profile page listeners
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateProfile();
            });
        }

        // Settings page listeners
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateSettings();
            });
        }

        // Password change listeners
        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.changePassword();
            });
        }

        // Avatar upload
        const avatarInput = document.getElementById('avatarInput');
        const avatarPreview = document.getElementById('avatarPreview');
        
        if (avatarInput && avatarPreview) {
            avatarInput.addEventListener('change', (e) => {
                this.handleAvatarUpload(e);
            });

            avatarPreview.addEventListener('click', () => {
                avatarInput.click();
            });
        }

        // Password visibility toggles
        document.querySelectorAll('.toggle-password').forEach(button => {
            button.addEventListener('click', function() {
                const input = this.previousElementSibling;
                const icon = this.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        });
    }

    async loadProfileData() {
        if (!this.currentUser) return;

        // Populate profile form fields
        const profileFirstName = document.getElementById('profileFirstName');
        const profileLastName = document.getElementById('profileLastName');
        const profileEmail = document.getElementById('profileEmail');
        const profileBio = document.getElementById('profileBio');

        if (profileFirstName) profileFirstName.value = this.currentUser.firstName;
        if (profileLastName) profileLastName.value = this.currentUser.lastName;
        if (profileEmail) profileEmail.value = this.currentUser.email;
        if (profileBio) profileBio.value = this.currentUser.bio;

        // Update avatar preview
        this.updateAvatarPreview();
    }

    updateAvatarPreview() {
        const avatarPreview = document.getElementById('avatarPreview');
        if (!avatarPreview) return;

        if (this.currentUser.avatar) {
            avatarPreview.innerHTML = `<img src="${this.currentUser.avatar}" alt="Profile Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            const initials = this.currentUser.firstName.charAt(0) + this.currentUser.lastName.charAt(0);
            avatarPreview.textContent = initials.toUpperCase();
        }
    }

    async handleAvatarUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select a valid image file', 'error');
            return;
        }

        // Validate file size (2MB limit)
        if (file.size > 2 * 1024 * 1024) {
            this.showNotification('Image size must be less than 2MB', 'error');
            return;
        }

        try {
            // Convert to base64
            const base64 = await this.fileToBase64(file);
            this.currentUser.avatar = base64;
            this.updateAvatarPreview();
            this.showNotification('Avatar updated! Click "Update Profile" to save', 'success');
        } catch (error) {
            console.error('Error uploading avatar:', error);
            this.showNotification('Failed to upload avatar', 'error');
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    async updateProfile() {
        if (!this.currentUser) return;

        const firstName = document.getElementById('profileFirstName').value.trim();
        const lastName = document.getElementById('profileLastName').value.trim();
        const bio = document.getElementById('profileBio').value.trim();

        // Validation
        if (!firstName || !lastName) {
            this.showNotification('First name and last name are required', 'error');
            return;
        }

        if (firstName.length < 2 || lastName.length < 2) {
            this.showNotification('Names must be at least 2 characters long', 'error');
            return;
        }

        try {
            const { error } = await supabase
                .from('users')
                .update({
                    first_name: firstName,
                    last_name: lastName,
                    bio: bio,
                    avatar: this.currentUser.avatar
                })
                .eq('email', this.currentUser.email);

            if (error) throw error;

            // Update current user data
            this.currentUser.firstName = firstName;
            this.currentUser.lastName = lastName;
            this.currentUser.bio = bio;

            // Update global UI
            this.updateGlobalUserDisplay();

            this.showNotification('Profile updated successfully! 🎉', 'success');
        } catch (error) {
            console.error('Error updating profile:', error);
            this.showNotification('Failed to update profile', 'error');
        }
    }

    updateGlobalUserDisplay() {
        // Update user name in navigation (both dashboards)
        const userNameElements = document.querySelectorAll('#userName, #welcomeUserName, #teacherWelcomeName');
        userNameElements.forEach(el => {
            if (el.id === 'userName') {
                el.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
            } else if (el.id === 'welcomeUserName' || el.id === 'teacherWelcomeName') {
                el.textContent = this.currentUser.firstName;
            }
        });

        // Update avatar in navigation
        const userAvatarElements = document.querySelectorAll('#userAvatar');
        userAvatarElements.forEach(avatarEl => {
            if (this.currentUser.avatar) {
                avatarEl.innerHTML = `<img src="${this.currentUser.avatar}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            } else {
                const initials = this.currentUser.firstName.charAt(0) + this.currentUser.lastName.charAt(0);
                avatarEl.textContent = initials.toUpperCase();
            }
        });
    }

    async loadNotificationSettings() {
        if (!this.currentUser) return;

        const notifications = this.currentUser.notifications;
        
        const emailUpdates = document.getElementById('emailUpdates');
        const courseUpdates = document.getElementById('courseUpdates');
        const messageAlerts = document.getElementById('messageAlerts');
        
        if (emailUpdates) emailUpdates.checked = notifications.emailUpdates;
        if (courseUpdates) courseUpdates.checked = notifications.courseUpdates;
        if (messageAlerts) messageAlerts.checked = notifications.messageAlerts;
    }

    async updateSettings() {
        if (!this.currentUser) return;

        const notifications = {
            emailUpdates: document.getElementById('emailUpdates')?.checked || false,
            courseUpdates: document.getElementById('courseUpdates')?.checked || false,
            messageAlerts: document.getElementById('messageAlerts')?.checked || false
        };

        try {
            const { error } = await supabase
                .from('users')
                .update({ notifications })
                .eq('email', this.currentUser.email);

            if (error) throw error;

            this.currentUser.notifications = notifications;
            this.showNotification('Settings updated successfully! ✅', 'success');
        } catch (error) {
            console.error('Error updating settings:', error);
            this.showNotification('Failed to update settings', 'error');
        }
    }

    async changePassword() {
        if (!this.currentUser) return;

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showNotification('Please fill in all password fields', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showNotification('New passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 3) {
            this.showNotification('Password must be at least 3 characters long', 'error');
            return;
        }

        if (newPassword === currentPassword) {
            this.showNotification('New password must be different from current password', 'error');
            return;
        }

        try {
            // Verify current password
            const { data: user, error: verifyError } = await supabase
                .from('users')
                .select('password')
                .eq('email', this.currentUser.email)
                .single();

            if (verifyError) throw verifyError;

            if (user.password !== currentPassword) {
                this.showNotification('Current password is incorrect', 'error');
                return;
            }

            // Update password
            const { error: updateError } = await supabase
                .from('users')
                .update({ password: newPassword })
                .eq('email', this.currentUser.email);

            if (updateError) throw updateError;

            // Clear password form
            document.getElementById('passwordForm').reset();
            this.showNotification('Password changed successfully! 🔒', 'success');
        } catch (error) {
            console.error('Error changing password:', error);
            this.showNotification('Failed to change password', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Check if dashboard notification system exists
        if (window.dashboard && window.dashboard.showNotification) {
            window.dashboard.showNotification(message, type);
        } else if (window.teacherDashboard && window.teacherDashboard.showNotification) {
            window.teacherDashboard.showNotification(message, type);
        } else {
            // Fallback notification system
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
                        animation: slideIn 0.3s ease;
                    }
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    .notification-success { background: rgba(16, 185, 129, 0.95); }
                    .notification-error { background: rgba(239, 68, 68, 0.95); }
                    .notification-info { background: rgba(59, 130, 246, 0.95); }
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
}

// Initialize profile settings manager
let profileSettingsManager;
document.addEventListener('DOMContentLoaded', function() {
    // Delay initialization slightly to ensure dashboard is loaded first
    setTimeout(() => {
        profileSettingsManager = new ProfileSettingsManager();
        window.profileSettingsManager = profileSettingsManager;
        console.log('✅ Profile Settings Manager Initialized');
    }, 500);
});
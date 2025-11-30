import { supabase } from './supabaseClient.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
    }

    async initializeDefaultUsers() {
        // Default users are now in SQL migration
        console.log("Default users created via SQL migration");
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    validatePassword(password) {
        return password.length >= 3;
    }

    async register(userData) {
        const { firstName, lastName, email, password, userType } = userData;

        // Check if user exists
        const { data: existing } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

        if (existing) {
            throw new Error('Email already registered. Please login instead.');
        }

        if (!this.validatePassword(password)) {
            throw new Error('Password must be at least 3 characters.');
        }

        // Insert new user
        const { data, error } = await supabase
            .from('users')
            .insert([{
                email,
                password,
                first_name: firstName,
                last_name: lastName,
                user_type: userType,
                bio: '',
                status: 'active'
            }])
            .select()
            .single();

        if (error) throw error;

        return {
            email: data.email,
            firstName: data.first_name,
            lastName: data.last_name,
            userType: data.user_type,
            bio: data.bio,
            status: data.status,
            joinDate: data.created_at
        };
    }

    async login(email, password) {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .single();

        if (error || !user) {
            throw new Error('Invalid email or password.');
        }

        if (user.status === 'suspended') {
            throw new Error('Your account has been suspended. Please contact admin.');
        }

        return {
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            userType: user.user_type,
            bio: user.bio,
            status: user.status,
            joinDate: user.created_at
        };
    }

    async getCurrentUser() {
        const currentUserEmail = localStorage.getItem('currentUser');
        if (!currentUserEmail) return null;

        const { data } = await supabase
            .from('users')
            .select('*')
            .eq('email', currentUserEmail)
            .single();

        if (!data) return null;

        return {
            email: data.email,
            firstName: data.first_name,
            lastName: data.last_name,
            userType: data.user_type,
            bio: data.bio,
            status: data.status,
            joinDate: data.created_at
        };
    }

    async updateProfile(email, updates) {
        const updateData = {};
        if (updates.firstName) updateData.first_name = updates.firstName;
        if (updates.lastName) updateData.last_name = updates.lastName;
        if (updates.bio !== undefined) updateData.bio = updates.bio;

        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('email', email)
            .select()
            .single();

        if (error) throw error;

        return {
            email: data.email,
            firstName: data.first_name,
            lastName: data.last_name,
            userType: data.user_type,
            bio: data.bio
        };
    }

    async changePassword(email, oldPassword, newPassword) {
        const { data: user } = await supabase
            .from('users')
            .select('password')
            .eq('email', email)
            .single();

        if (!user || user.password !== oldPassword) {
            throw new Error('Current password is incorrect.');
        }

        const { error } = await supabase
            .from('users')
            .update({ password: newPassword })
            .eq('email', email);

        if (error) throw error;
        return true;
    }

    async getAllUsers() {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(u => ({
            email: u.email,
            firstName: u.first_name,
            lastName: u.last_name,
            userType: u.user_type,
            bio: u.bio,
            status: u.status,
            joinDate: u.created_at
        }));
    }

    async getUsersByType(userType) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('user_type', userType);

        if (error) throw error;

        return data.map(u => ({
            email: u.email,
            firstName: u.first_name,
            lastName: u.last_name,
            userType: u.user_type,
            bio: u.bio,
            status: u.status,
            joinDate: u.created_at
        }));
    }

    async suspendUser(email) {
        const { error } = await supabase
            .from('users')
            .update({ status: 'suspended' })
            .eq('email', email);

        if (error) throw error;
        return true;
    }

    async activateUser(email) {
        const { error } = await supabase
            .from('users')
            .update({ status: 'active' })
            .eq('email', email);

        if (error) throw error;
        return true;
    }

    async deleteUser(email) {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('email', email);

        if (error) throw error;
        return true;
    }

    logout() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
}

// Initialize auth manager
const authManager = new AuthManager();
window.authManager = authManager;

// Password toggle functionality
function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('span');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// DOM Event Handlers
function showLogin() {
    document.getElementById('loginModal').classList.remove('hidden');
    document.getElementById('signupModal').classList.add('hidden');
}

function showSignup() {
    document.getElementById('signupModal').classList.remove('hidden');
    document.getElementById('loginModal').classList.add('hidden');
}

function closeModals() {
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('signupModal').classList.add('hidden');
}

function scrollToFeatures() {
    document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
}

// Form Event Listeners
document.addEventListener('DOMContentLoaded', async function() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const signupPassword = document.getElementById('signupPassword');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    if (signupPassword) {
        signupPassword.addEventListener('input', validatePasswordRequirements);
    }

    // Check if user is already logged in
    const currentUser = await authManager.getCurrentUser();
    if (currentUser && window.location.pathname.endsWith('index.html')) {
        redirectToDashboard(currentUser);
    }
});

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const user = await authManager.login(email, password);
        localStorage.setItem('currentUser', email);
        
        showNotification('Login successful! Redirecting...', 'success');
        setTimeout(() => {
            redirectToDashboard(user);
        }, 1000);
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    
    const formData = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('signupEmail').value.trim(),
        password: document.getElementById('signupPassword').value,
        userType: document.getElementById('userType').value
    };

    const confirmPassword = document.getElementById('confirmPassword').value;
    if (formData.password !== confirmPassword) {
        showNotification('Passwords do not match.', 'error');
        return;
    }

    try {
        const user = await authManager.register(formData);
        localStorage.setItem('currentUser', formData.email);
        
        showNotification('Account created successfully!', 'success');
        setTimeout(() => {
            redirectToDashboard(user);
        }, 1000);
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function validatePasswordRequirements() {
    const password = this.value;
    const requirements = {
        length: password.length >= 3,
        number: /\d/.test(password),
        symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    Object.keys(requirements).forEach(req => {
        const element = document.getElementById(`req-${req}`);
        if (element) {
            if (requirements[req]) {
                element.style.color = '#10b981';
                element.style.fontWeight = '600';
            } else {
                element.style.color = '#64748b';
                element.style.fontWeight = 'normal';
            }
        }
    });
}

function redirectToDashboard(user) {
    if (user.userType === 'admin') {
        window.location.href = 'admin-dashboard.html';
    } else if (user.userType === 'teacher') {
        window.location.href = 'teacher-dashboard.html';
    } else {
        window.location.href = 'dashboard.html';
    }
}

function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

export { authManager, togglePassword, showLogin, showSignup, closeModals, scrollToFeatures };
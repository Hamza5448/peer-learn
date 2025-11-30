import { supabase } from './supabaseClient.js';

// Enhanced Search System - FIXED
class SearchManager {
    constructor() {
        this.allCourses = [];
        this.filteredCourses = [];
        this.searchTimeout = null;
        this.currentFilters = {
            category: 'all',
            rating: 'all',
            duration: 'all',
            level: 'all',
            sortBy: 'relevance'
        };
        this.initialize();
    }

    async initialize() {
        await this.loadAllCourses();
        this.setupSearchListeners();
        this.createSearchOverlay();
    }

    createSearchOverlay() {
        if (document.getElementById('searchResultsOverlay')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'searchResultsOverlay';
        overlay.className = 'hidden';
        overlay.innerHTML = `
            <div class="search-results-wrapper">
                <div class="search-header">
                    <div class="search-header-info">
                        <h2 id="searchHeaderTitle">Discover Courses</h2>
                        <p id="searchResultsCount">Loading courses...</p>
                    </div>
                    <button class="search-close-btn" onclick="searchManager.hideSearchResults()">
                        <i class="fas fa-times"></i>
                        Close
                    </button>
                </div>
                
                <div class="search-filters">
                    <div class="category-filters">
                        <div class="category-filters-row">
                            <button class="category-filter-btn active" data-category="all">
                                <i class="fas fa-th"></i> All
                            </button>
                            <button class="category-filter-btn" data-category="Web Development">
                                <i class="fas fa-code"></i> Web Development
                            </button>
                            <button class="category-filter-btn" data-category="Data Science">
                                <i class="fas fa-chart-line"></i> Data Science
                            </button>
                            <button class="category-filter-btn" data-category="Design">
                                <i class="fas fa-palette"></i> Design
                            </button>
                            <button class="category-filter-btn" data-category="Programming">
                                <i class="fas fa-laptop-code"></i> Programming
                            </button>
                        </div>
                    </div>
                </div>
                
                <div id="searchResultsContainer"></div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Setup filter listeners
        overlay.querySelectorAll('.category-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                overlay.querySelectorAll('.category-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilters.category = btn.dataset.category;
                this.applyFilters();
            });
        });
    }

    async loadAllCourses() {
        console.log('🔵 Loading all courses for search...');
        
        const { data: courses, error } = await supabase
            .from('courses')
            .select('*')
            .eq('published', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading courses:', error);
            return;
        }

        // Get video counts for each course
        this.allCourses = await Promise.all((courses || []).map(async (course) => {
            const { data: videos } = await supabase
                .from('videos')
                .select('id')
                .eq('course_id', course.id);
            
            return {
                id: course.id,
                title: course.title,
                instructor: course.creator_name,
                instructorEmail: course.creator_email,
                category: course.category || 'General',
                level: course.level || 'Beginner',
                description: course.description || 'No description available',
                thumbnail: course.thumbnail || '📚',
                videoCount: videos ? videos.length : 0,
                createdAt: course.created_at,
                enrolled: false
            };
        }));

        // Load enrolled courses
        const currentUserEmail = localStorage.getItem('currentUser');
        if (currentUserEmail) {
            const { data: enrollments } = await supabase
                .from('enrollments')
                .select('course_id')
                .eq('user_email', currentUserEmail);

            const enrolledIds = enrollments ? enrollments.map(e => e.course_id) : [];
            
            this.allCourses.forEach(course => {
                course.enrolled = enrolledIds.includes(course.id);
            });
        }

        this.filteredCourses = [...this.allCourses];
        console.log('✅ Search system loaded:', this.allCourses.length, 'courses');
    }

    setupSearchListeners() {
        const searchInput = document.getElementById('globalSearch');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length === 0) {
                this.hideSearchResults();
                return;
            }

            this.searchTimeout = setTimeout(() => {
                this.performSearch(query);
            }, 300);
        });

        searchInput.addEventListener('focus', (e) => {
            const query = e.target.value.trim();
            if (query.length === 0) {
                this.showDiscoverMode();
            }
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(this.searchTimeout);
                const query = e.target.value.trim();
                if (query.length > 0) {
                    this.performSearch(query);
                }
            }
        });
    }

    performSearch(query) {
        const lowerQuery = query.toLowerCase();
        
        this.filteredCourses = this.allCourses.filter(course => {
            const titleMatch = course.title.toLowerCase().includes(lowerQuery);
            const instructorMatch = course.instructor.toLowerCase().includes(lowerQuery);
            const categoryMatch = course.category.toLowerCase().includes(lowerQuery);
            const descriptionMatch = course.description.toLowerCase().includes(lowerQuery);
            
            return titleMatch || instructorMatch || categoryMatch || descriptionMatch;
        });

        this.applyFilters();
        this.displaySearchResults(query);
    }

    applyFilters() {
        let filtered = [...this.filteredCourses];

        if (this.currentFilters.category !== 'all') {
            filtered = filtered.filter(course => 
                course.category === this.currentFilters.category
            );
        }

        this.filteredCourses = filtered;
        
        const searchInput = document.getElementById('globalSearch');
        const query = searchInput ? searchInput.value.trim() : '';
        
        if (query.length > 0) {
            this.displaySearchResults(query);
        } else {
            this.displayDiscoverCourses();
        }
    }

    showSearchResults() {
        const searchOverlay = document.getElementById('searchResultsOverlay');
        if (searchOverlay) {
            searchOverlay.classList.remove('hidden');
        }
    }

    hideSearchResults() {
        const searchOverlay = document.getElementById('searchResultsOverlay');
        if (searchOverlay) {
            searchOverlay.classList.add('hidden');
        }
        
        // Clear search input
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) searchInput.value = '';
    }

    showDiscoverMode() {
        const searchOverlay = document.getElementById('searchResultsOverlay');
        if (!searchOverlay) return;
        
        searchOverlay.classList.remove('hidden');
        
        const headerTitle = document.getElementById('searchHeaderTitle');
        if (headerTitle) headerTitle.textContent = 'Discover Courses';
        
        this.filteredCourses = [...this.allCourses];
        this.displayDiscoverCourses();
    }

    openDiscoverMode() {
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) searchInput.value = '';
        this.showDiscoverMode();
    }

    displaySearchResults(query) {
        const resultsContainer = document.getElementById('searchResultsContainer');
        const resultsCount = document.getElementById('searchResultsCount');
        const headerTitle = document.getElementById('searchHeaderTitle');
        
        if (!resultsContainer) return;

        if (headerTitle) headerTitle.textContent = `Search Results for "${query}"`;
        if (resultsCount) resultsCount.textContent = `${this.filteredCourses.length} result${this.filteredCourses.length !== 1 ? 's' : ''}`;

        if (this.filteredCourses.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>No courses found</h3>
                    <p>Try different keywords or browse all courses</p>
                    <button class="btn-outline" onclick="searchManager.showDiscoverMode()">
                        Browse All Courses
                    </button>
                </div>
            `;
            return;
        }

        this.showSearchResults();
        this.renderCourseCards(resultsContainer);
    }

    displayDiscoverCourses() {
        const resultsContainer = document.getElementById('searchResultsContainer');
        const resultsCount = document.getElementById('searchResultsCount');
        const headerTitle = document.getElementById('searchHeaderTitle');
        
        if (!resultsContainer) return;

        if (headerTitle) headerTitle.textContent = 'Discover Courses';
        if (resultsCount) resultsCount.textContent = `${this.filteredCourses.length} course${this.filteredCourses.length !== 1 ? 's' : ''} available`;

        this.showSearchResults();
        this.renderCourseCards(resultsContainer);
    }

    renderCourseCards(container) {
        container.innerHTML = this.filteredCourses.map(course => `
            <div class="search-course-card" style="display: flex; gap: 1.5rem; background: var(--card-bg); border: 1px solid var(--border-light); border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; cursor: pointer; transition: all 0.3s ease;" onclick="searchManager.viewCourse(${course.id})">
                <div class="search-course-image" style="width: 180px; height: 120px; border-radius: 8px; background: linear-gradient(135deg, var(--primary-color), var(--primary-dark)); display: flex; align-items: center; justify-content: center; font-size: 3rem; flex-shrink: 0; position: relative;">
                    ${course.thumbnail}
                    ${course.enrolled ? '<div style="position: absolute; top: 8px; right: 8px; background: var(--success-color); color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">Enrolled</div>' : ''}
                </div>
                <div class="search-course-content" style="flex: 1; display: flex; flex-direction: column; gap: 0.75rem;">
                    <div>
                        <h3 style="color: var(--text-primary); font-size: 1.3rem; margin-bottom: 0.25rem;">${course.title}</h3>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-user"></i>
                            ${course.instructor}
                        </p>
                    </div>
                    <p style="color: var(--text-secondary); line-height: 1.6;">${course.description}</p>
                    <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
                        <span style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-secondary); font-size: 0.9rem;">
                            <i class="fas fa-signal" style="color: var(--primary-color);"></i>
                            ${course.level}
                        </span>
                        <span style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-secondary); font-size: 0.9rem;">
                            <i class="fas fa-video" style="color: var(--primary-color);"></i>
                            ${course.videoCount} video${course.videoCount !== 1 ? 's' : ''}
                        </span>
                        <span style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-secondary); font-size: 0.9rem;">
                            <i class="fas fa-tag" style="color: var(--primary-color);"></i>
                            ${course.category}
                        </span>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.75rem; justify-content: center; min-width: 150px;">
                    ${course.enrolled ? `
                        <button class="btn-primary" onclick="event.stopPropagation(); searchManager.openCourse(${course.id})">
                            <i class="fas fa-play"></i>
                            Continue
                        </button>
                    ` : `
                        <button class="btn-primary" onclick="event.stopPropagation(); searchManager.enrollCourse(${course.id})">
                            <i class="fas fa-plus"></i>
                            Enroll Now
                        </button>
                    `}
                    <button class="btn-outline" onclick="event.stopPropagation(); searchManager.viewCourse(${course.id})">
                        <i class="fas fa-info-circle"></i>
                        Details
                    </button>
                </div>
            </div>
        `).join('');
    }

    async viewCourse(courseId) {
        if (typeof window.dashboard !== 'undefined' && window.dashboard.showCourseDetails) {
            this.hideSearchResults();
            window.dashboard.showCourseDetails(courseId);
        } else {
            window.location.href = `video-player.html?courseId=${courseId}`;
        }
    }

    async enrollCourse(courseId) {
        if (typeof window.dashboard !== 'undefined' && window.dashboard.enrollInCourse) {
            await window.dashboard.enrollInCourse(courseId);
            await this.loadAllCourses();
            this.applyFilters();
        }
    }

    async openCourse(courseId) {
        window.location.href = `video-player.html?courseId=${courseId}`;
    }
}

let searchManager;
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        searchManager = new SearchManager();
        window.searchManager = searchManager; // ✅ Global access
    }, 200);
});
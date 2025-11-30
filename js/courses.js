import { supabase } from './supabaseClient.js';

class CourseManager {
    constructor() {
        this.initializeDB();
    }

    async initializeDB() {
        console.log('✅ CourseManager: Connected to Supabase');
    }

    async createCourse(courseData, creatorEmail) {
        console.log('Creating course with data:', courseData);

        const { data, error } = await supabase
            .from('courses')
            .insert([{
                title: courseData.title || 'Untitled Course',
                description: courseData.description || '',
                category: courseData.category || 'General',
                level: courseData.level || 'Beginner',
                thumbnail: courseData.thumbnail || '📚',
                creator_email: creatorEmail,
                creator_name: courseData.creatorName,
                published: true
            }])
            .select()
            .single();

        if (error) throw error;

        console.log('Course created successfully:', data);
        return {
            id: data.id,
            title: data.title,
            description: data.description,
            category: data.category,
            level: data.level,
            thumbnail: data.thumbnail,
            creatorEmail: data.creator_email,
            creatorName: data.creator_name,
            videos: [],
            createdDate: data.created_at,
            updatedDate: data.updated_at,
            published: data.published
        };
    }

    async getCourse(courseId) {
        const { data: course, error: courseError } = await supabase
            .from('courses')
            .select('*')
            .eq('id', courseId)
            .single();

        if (courseError) {
            console.error('Course not found:', courseError);
            return null;
        }

        // Fetch videos
        const { data: videos, error: videosError } = await supabase
            .from('videos')
            .select('*')
            .eq('course_id', courseId)
            .order('position', { ascending: true });

        if (videosError) console.error('Error fetching videos:', videosError);

        return {
            id: course.id,
            title: course.title,
            description: course.description,
            category: course.category,
            level: course.level,
            thumbnail: course.thumbnail,
            creatorEmail: course.creator_email,
            creatorName: course.creator_name,
            videos: videos || [],
            createdDate: course.created_at,
            updatedDate: course.updated_at,
            published: course.published
        };
    }

    async updateCourse(courseId, updates) {
        console.log('🔧 UPDATE COURSE CALLED');
        console.log('   Course ID:', courseId);

        const updateData = {};
        if (updates.title) updateData.title = updates.title;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.category) updateData.category = updates.category;
        if (updates.level) updateData.level = updates.level;
        if (updates.thumbnail) updateData.thumbnail = updates.thumbnail;
        if (updates.published !== undefined) updateData.published = updates.published;

        const { data, error } = await supabase
            .from('courses')
            .update(updateData)
            .eq('id', courseId)
            .select()
            .single();

        if (error) {
            console.error('Error updating course:', error);
            return null;
        }

        // If videos are being updated
        if (updates.videos) {
            console.log('   🎹 Updating videos:', updates.videos.length);

            // Delete old videos
            await supabase
                .from('videos')
                .delete()
                .eq('course_id', courseId);

            // Insert new videos
            if (updates.videos.length > 0) {
                const videosToInsert = updates.videos.map((v, idx) => ({
                    id: v.id, // Important: use the existing video ID
                    course_id: courseId,
                    name: v.name,
                    video_data: v.video_data || null,
                    thumbnail: v.thumbnail || null,
                    size_bytes: v.size || 0,
                    duration_seconds: v.duration || 0,
                    position: idx
                }));

                const { error: videoError } = await supabase
                    .from('videos')
                    .insert(videosToInsert);

                if (videoError) console.error('Error inserting videos:', videoError);
            }
        }

        console.log('   ✅ Course updated');
        return await this.getCourse(courseId);
    }

    async deleteCourse(courseId) {
        const { error } = await supabase
            .from('courses')
            .delete()
            .eq('id', courseId);

        if (error) {
            console.error('Error deleting course:', error);
            return false;
        }

        console.log('Course deleted:', courseId);
        return true;
    }

    async enrollUser(userEmail, courseId) {
        const { data, error } = await supabase
            .from('enrollments')
            .insert([{
                user_email: userEmail,
                course_id: courseId
            }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                console.log('User already enrolled');
                return false;
            }
            console.error('Enrollment error:', error);
            return false;
        }

        console.log('User enrolled:', userEmail, 'in course:', courseId);
        return true;
    }

    async unenrollUser(userEmail, courseId) {
        const { error } = await supabase
            .from('enrollments')
            .delete()
            .eq('user_email', userEmail)
            .eq('course_id', courseId);

        if (error) {
            console.error('Unenroll error:', error);
            return false;
        }

        console.log('User unenrolled:', userEmail, 'from course:', courseId);
        return true;
    }

    async isEnrolled(userEmail, courseId) {
        const { data, error } = await supabase
            .from('enrollments')
            .select('id')
            .eq('user_email', userEmail)
            .eq('course_id', courseId)
            .single();

        return !!data;
    }

    async getUserCourses(userEmail) {
        const { data: enrollments, error } = await supabase
            .from('enrollments')
            .select('course_id')
            .eq('user_email', userEmail);

        if (error || !enrollments) return [];

        const courseIds = enrollments.map(e => e.course_id);
        if (courseIds.length === 0) return [];

        const { data: courses } = await supabase
            .from('courses')
            .select('*')
            .in('id', courseIds);

        if (!courses) return [];

        const coursesWithVideos = await Promise.all(
            courses.map(async (course) => {
                const { data: videos } = await supabase
                    .from('videos')
                    .select('*')
                    .eq('course_id', course.id)
                    .order('position', { ascending: true });

                return {
                    id: course.id,
                    title: course.title,
                    description: course.description,
                    category: course.category,
                    level: course.level,
                    thumbnail: course.thumbnail,
                    creatorEmail: course.creator_email,
                    creatorName: course.creator_name,
                    videos: videos || [],
                    createdDate: course.created_at,
                    published: course.published
                };
            })
        );

        return coursesWithVideos;
    }

    async getCreatedCourses(creatorEmail) {
        const { data: courses, error } = await supabase
            .from('courses')
            .select('*')
            .eq('creator_email', creatorEmail)
            .order('created_at', { ascending: false });

        if (error || !courses) return [];

        const coursesWithVideos = await Promise.all(
            courses.map(async (course) => {
                const { data: videos } = await supabase
                    .from('videos')
                    .select('*')
                    .eq('course_id', course.id)
                    .order('position', { ascending: true });

                return {
                    id: course.id,
                    title: course.title,
                    description: course.description,
                    category: course.category,
                    level: course.level,
                    thumbnail: course.thumbnail,
                    creatorEmail: course.creator_email,
                    creatorName: course.creator_name,
                    videos: videos || [],
                    createdDate: course.created_at,
                    published: course.published
                };
            })
        );

        return coursesWithVideos;
    }

    async getAllCourses() {
        const { data: courses, error } = await supabase
            .from('courses')
            .select('*')
            .order('created_at', { ascending: false });

        if (error || !courses) return [];

        const coursesWithVideos = await Promise.all(
            courses.map(async (course) => {
                const { data: videos } = await supabase
                    .from('videos')
                    .select('id, name, thumbnail, size_bytes, duration_seconds, position')
                    .eq('course_id', course.id)
                    .order('position', { ascending: true });

                return {
                    id: course.id,
                    title: course.title,
                    description: course.description,
                    category: course.category,
                    level: course.level,
                    thumbnail: course.thumbnail,
                    creatorEmail: course.creator_email,
                    creatorName: course.creator_name,
                    videos: videos || [],
                    createdDate: course.created_at,
                    published: course.published
                };
            })
        );

        return coursesWithVideos;
    }

    async searchCourses(query) {
        const lowerQuery = query.toLowerCase();

        const { data: courses, error } = await supabase
            .from('courses')
            .select('*')
            .or(`title.ilike.%${lowerQuery}%,description.ilike.%${lowerQuery}%,category.ilike.%${lowerQuery}%,creator_name.ilike.%${lowerQuery}%`);

        if (error || !courses) return [];

        return courses.map(course => ({
            id: course.id,
            title: course.title,
            description: course.description,
            category: course.category,
            level: course.level,
            thumbnail: course.thumbnail,
            creatorEmail: course.creator_email,
            creatorName: course.creator_name,
            createdDate: course.created_at
        }));
    }

  async saveVideoProgress(userEmail, courseId, videoId, currentTime, duration) {
    const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;

    const { error } = await supabase
        .from('video_progress')
        .upsert({
            user_email: userEmail,
            course_id: courseId,
            video_id: videoId,
            time_position: currentTime,  // ✅ FIXED: was current_time
            duration: duration,
            percentage: percentage,
            last_updated: new Date().toISOString()
        }, {
            onConflict: 'user_email,course_id,video_id'
        });

    if (error) console.error('Error saving progress:', error);
}

   async getVideoProgress(userEmail, courseId, videoId) {
    const { data, error } = await supabase
        .from('video_progress')
        .select('*')
        .eq('user_email', userEmail)
        .eq('course_id', courseId)
        .eq('video_id', videoId)
        .single();

    if (error || !data) return null;

    return {
        currentTime: data.time_position,  // ✅ FIXED: was current_time
        duration: data.duration,
        percentage: data.percentage,
        lastUpdated: data.last_updated
    };
}

    async getCourseProgress(userEmail, courseId) {
        const course = await this.getCourse(courseId);
        if (!course || course.videos.length === 0) return 0;

        const { data: progressData } = await supabase
            .from('video_progress')
            .select('percentage')
            .eq('user_email', userEmail)
            .eq('course_id', courseId);

        if (!progressData || progressData.length === 0) return 0;

        const totalProgress = progressData.reduce((sum, p) => sum + p.percentage, 0);
        return totalProgress / course.videos.length;
    }

    async getVideoData(videoId) {
        const { data, error } = await supabase
            .from('videos')
            .select('video_data')
            .eq('id', videoId)
            .single();

        if (error || !data) return null;
        return data.video_data;
    }
}

console.log('Initializing Course Manager...');
window.courseManager = new CourseManager();
console.log('Course Manager initialized with Supabase');

export { CourseManager };
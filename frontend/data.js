// Global Data Management System with FastAPI Integration
const API_BASE_URL = 'http://127.0.0.1:8000';

const DataManager = {
    // Default staff data
    DEFAULT_STAFF: [
        {
            id: 1,
            name: 'Maira',
            spec: 'Founder & Master Artist',
            phone: '+1-555-0101',
            email: 'maira@russianails.com',
            avail: 'Mon-Sat 10AM-7PM',
            image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqJJ-liD-TbVUhJLjhSBR5SJV3e8Xt3BsUxw&s',
            description: 'Expert in Russian manicure techniques with 8+ years experience. Specializes in precision work and custom designs.'
        },
        {
            id: 2,
            name: 'Victoria',
            spec: 'Senior Nail Artist',
            phone: '+1-555-0102',
            email: 'victoria@russianails.com',
            avail: 'Tue-Sun 11AM-8PM',
            image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqJJ-liD-TbVUhJLjhSBR5SJV3e8Xt3BsUxw&s',
            description: 'Specialist in gel extensions and hard gel applications. Known for flawless shapes and long-lasting results.'
        },
        {
            id: 3,
            name: 'Sofia',
            spec: 'Nail Technician',
            phone: '+1-555-0103',
            email: 'sofia@russianails.com',
            avail: 'Mon-Fri 9AM-6PM',
            image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqJJ-liD-TbVUhJLjhSBR5SJV3e8Xt3BsUxw&s',
            description: 'Pedicure specialist with focus on Smart Gel and KART techniques. Creates perfect balance of strength and beauty.'
        }
    ],

    // Initialize data - call this on page load
    init: function() {
        if (!localStorage.getItem('staff_data')) {
            this.setStaff(this.DEFAULT_STAFF);
        }
        // NOTE: bookings_data is now managed by FastAPI backend, not localStorage
    },

    // ==================== BOOKINGS FUNCTIONS (FastAPI Integration) ====================
    
    // Get all bookings from FastAPI backend
    getBookings: async function() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/bookings`);
            if (!response.ok) {
                console.error('Failed to fetch bookings:', response.status);
                return [];
            }
            const data = await response.json();
            // Transform backend data format to match frontend expectations
            return Array.isArray(data) ? data.map(booking => ({
                ...booking,
                id: booking.id.toString(),
                status: booking.status || 'pending',
                date_submitted: booking.date_submitted || new Date().toISOString(),
                date: booking.date || (booking.start_time ? new Date(booking.start_time).toLocaleDateString() : '')
            })) : [];
        } catch (error) {
            console.error('Error fetching bookings:', error);
            return [];
        }
    },

    // Create new booking in FastAPI backend
    addBooking: async function(bookingData) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Failed to create booking:', errorData);
                throw new Error(errorData.detail || 'Failed to create booking');
            }
            return await response.json();
        } catch (error) {
            console.error('Error adding booking:', error);
            throw error;
        }
    },

    // Update existing booking in FastAPI backend
    updateBooking: async function(id, updates) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/bookings/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!response.ok) {
                console.error('Failed to update booking:', response.status);
                throw new Error('Failed to update booking');
            }
            return await response.json();
        } catch (error) {
            console.error('Error updating booking:', error);
            throw error;
        }
    },

    // Delete booking from FastAPI backend
    deleteBooking: async function(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/bookings/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                console.error('Failed to delete booking:', response.status);
                throw new Error('Failed to delete booking');
            }
            return await response.json();
        } catch (error) {
            console.error('Error deleting booking:', error);
            throw error;
        }
    },

    // ==================== STAFF FUNCTIONS (Local localStorage) ====================

    
    // Staff functions
    getStaff: function() {
        try {
            const data = localStorage.getItem('staff_data');
            return data ? JSON.parse(data) : this.DEFAULT_STAFF;
        } catch (e) {
            return this.DEFAULT_STAFF;
        }
    },

    setStaff: function(staff) {
        localStorage.setItem('staff_data', JSON.stringify(staff));
        // Trigger update event
        window.dispatchEvent(new CustomEvent('staffUpdated', { detail: staff }));
    },

    addStaff: function(staff) {
        const current = this.getStaff();
        staff.id = staff.id || Date.now();
        current.push(staff);
        this.setStaff(current);
        return staff;
    },

    updateStaff: function(id, updates) {
        const staff = this.getStaff();
        const index = staff.findIndex(s => s.id == id);
        if (index >= 0) {
            staff[index] = { ...staff[index], ...updates };
            this.setStaff(staff);
            return staff[index];
        }
        return null;
    },

    deleteStaff: function(id) {
        const staff = this.getStaff();
        const filtered = staff.filter(s => s.id != id);
        this.setStaff(filtered);
    }
};

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📊 DataManager: Initializing on DOMContentLoaded');
        DataManager.init();
    });
} else {
    console.log('📊 DataManager: Initializing immediately');
    DataManager.init();
}
console.log('✅ DataManager object loaded, staff count:', DataManager.getStaff().length);

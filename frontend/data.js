// Global Data Management System with FastAPI Integration
const API_BASE_URL = 'http://127.0.0.1:8000';

const DataManager = {
    // Default staff data
    DEFAULT_STAFF: [
        {
            id: 1,
            name: 'Maira - Founder main artist',
            spec: 'Founder & Master Artist',
            phone: '+1(917) 622 1846',
            email: 'maira@russianails.com',
            avail: 'Mon-Sat 10AM-8PM',
            image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqJJ-liD-TbVUhJLjhSBR5SJV3e8Xt3BsUxw&s',
            description: 'Expert in Russian manicure techniques with 8+ years experience. Specializes in precision work and custom designs.'
        }
    ],

    // Initialize data - call this on page load
    init: function() {
        // Clear old localStorage data to remove placeholders
        localStorage.removeItem('staff_data');
        
        if (!localStorage.getItem('staff_data') && this.DEFAULT_STAFF.length > 0) {
            this.setStaff(this.DEFAULT_STAFF);
        }
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

    // ==================== STAFF FUNCTIONS (FastAPI Integration) ====================

    // Get staff from backend
    getStaff: async function() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/staff`);
            if (!response.ok) {
                return this.getStaffLocal();
            }
            const staff = await response.json();
            // Return backend data (even if empty) if request succeeded
            return Array.isArray(staff) ? staff : [];
        } catch (error) {
            console.log('Backend staff unavailable, using local storage');
            return this.getStaffLocal();
        }
    },

    // Get staff from localStorage (fallback)
    getStaffLocal: function() {
        try {
            const data = localStorage.getItem('staff_data');
            return data ? JSON.parse(data) : this.DEFAULT_STAFF;
        } catch (e) {
            return this.DEFAULT_STAFF;
        }
    },

    // Add new staff member to backend
    addStaff: async function(staffData, photoFile = null) {
        try {
            // ✓ VALIDATION: Check all required fields
            if (!staffData.name || !staffData.name.trim()) {
                throw new Error('Name is required');
            }
            if (!staffData.specialization || !staffData.specialization.trim()) {
                throw new Error('Specialization is required');
            }
            if (!staffData.phone || !staffData.phone.trim()) {
                throw new Error('Phone is required');
            }
            if (!staffData.email || !staffData.email.trim()) {
                throw new Error('Email is required');
            }
            if (!staffData.availability || !staffData.availability.trim()) {
                throw new Error('Availability is required');
            }

            console.log('📤 addStaff: Sending to backend', staffData, photoFile);
            const formData = new FormData();
            formData.append('name', staffData.name.trim());
            formData.append('specialization', staffData.specialization.trim());
            formData.append('phone', staffData.phone.trim());
            formData.append('email', staffData.email.trim());
            formData.append('availability', staffData.availability.trim());
            
            // Add password header for authentication
            const adminPassword = sessionStorage.getItem('adminPassword') || '';
            
            if (photoFile) {
                formData.append('photo', photoFile);
            }

            const response = await fetch(`${API_BASE_URL}/api/staff`, {
                method: 'POST',
                body: formData,
                headers: {
                    'x-admin-password': adminPassword
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Backend error:', response.status, errorText);
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            const newStaff = await response.json();
            
            // ✓ Ensure response contains ID
            if (!newStaff.id) {
                throw new Error('Server did not return staff ID');
            }

            console.log('✅ Staff added, response:', newStaff);
            window.dispatchEvent(new CustomEvent('staffUpdated'));
            return newStaff;
        } catch (error) {
            console.error('❌ Error adding staff:', error);
            throw error;
        }
    },

    // Update staff member on backend
    updateStaff: async function(id, staffData, photoFile = null) {
        try {
            console.log('📤 updateStaff ID:', id, 'Data:', staffData, 'Photo:', photoFile);
            const formData = new FormData();
            if (staffData.name) formData.append('name', staffData.name);
            if (staffData.specialization) formData.append('specialization', staffData.specialization);
            if (staffData.phone) formData.append('phone', staffData.phone);
            if (staffData.email) formData.append('email', staffData.email);
            if (staffData.availability) formData.append('availability', staffData.availability);
            if (photoFile) {
                formData.append('photo', photoFile);
            }

            const response = await fetch(`${API_BASE_URL}/api/staff/${id}`, {
                method: 'PUT',
                body: formData
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Backend error:', response.status, errorText);
                throw new Error(`Backend error: ${response.status}`);
            }
            const result = await response.json();
            console.log('✅ Staff updated, response:', result);
            window.dispatchEvent(new CustomEvent('staffUpdated'));
            return result;
        } catch (error) {
            console.error('❌ Error updating staff:', error);
            throw error;
        }
    },

    // Delete staff member from backend
    deleteStaff: async function(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/staff/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error('Failed to delete staff');
            }
            window.dispatchEvent(new CustomEvent('staffUpdated'));
            return await response.json();
        } catch (error) {
            console.error('Error deleting staff:', error);
            throw error;
        }
    },

    // Legacy localStorage functions (for compatibility)
    setStaff: function(staff) {
        localStorage.setItem('staff_data', JSON.stringify(staff));
        window.dispatchEvent(new CustomEvent('staffUpdated', { detail: staff }));
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

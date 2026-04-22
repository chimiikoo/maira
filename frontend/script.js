document.addEventListener('DOMContentLoaded', () => {

    // 1. Initial Load Animations
    setTimeout(() => {
        const fadeElements = document.querySelectorAll('.fade-in');
        fadeElements.forEach(el => {
            el.classList.add('appear');
        });
    }, 100);

    // 2. Navbar Scroll Effect
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 3. Scroll Reveal Animations
    const revealOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.classList.add('appear');
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    const revealElements = document.querySelectorAll('.scroll-reveal');
    revealElements.forEach(el => {
        revealObserver.observe(el);
    });

    window.revealObserver = revealObserver;

    // ==================== TIME SLOTS LOGIC ====================
    const AVAILABLE_HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    
    async function getBookedSlots(master, dateStr) {
        try {
            // Since we're using WhatsApp, we might not have backend bookings, 
            // but we keep this for future compatibility.
            const bookings = await DataManager.getBookings();
            const bookedSlots = new Set();
            
            if (Array.isArray(bookings)) {
                bookings.forEach(b => {
                    if (b.master === master && b.start_time) {
                        const bookingDate = new Date(b.start_time).toISOString().split('T')[0];
                        if (bookingDate === dateStr) {
                            const hour = new Date(b.start_time).getHours();
                            bookedSlots.add(hour);
                        }
                    }
                });
            }
            
            return bookedSlots;
        } catch (error) {
            console.error('Error getting booked slots:', error);
            return new Set();
        }
    }
    
    async function renderTimeSlots(master, dateStr) {
        if (!master || !dateStr) {
            document.getElementById('timeSlotGroup').style.display = 'none';
            return;
        }
        
        const bookedSlots = await getBookedSlots(master, dateStr);
        const container = document.getElementById('timeSlots');
        
        const slotsHTML = AVAILABLE_HOURS.map(hour => {
            const timeStr = `${hour.toString().padStart(2, '0')}:00`;
            const isBooked = bookedSlots.has(hour);
            const disabled = isBooked ? 'disabled' : '';
            
            return `
                <button 
                    type="button" 
                    class="time-slot" 
                    ${disabled}
                    data-hour="${hour}"
                    data-date="${dateStr}"
                    onclick="selectTimeSlot(this, '${dateStr}')"
                >
                    ${timeStr}
                </button>
            `;
        }).join('');
        
        container.innerHTML = slotsHTML;
        document.getElementById('timeSlotGroup').style.display = 'block';
    }
    
    window.selectTimeSlot = function(button, dateStr) {
        if (button.disabled) return;
        document.querySelectorAll('.time-slot').forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        
        const hour = parseInt(button.dataset.hour);
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
        
        const date = new Date(`${dateStr}T${timeStr}:00`);
        document.getElementById('selected_time_slot').value = timeStr;
        document.getElementById('start_time').value = date.toISOString();
        
        const endDate = new Date(date.getTime() + 60 * 60 * 1000);
        document.getElementById('end_time').value = endDate.toISOString();
    };
    
    // Trigger slots as soon as date is selected (master is now Maira by default)
    document.getElementById('date').addEventListener('change', async (e) => {
        const master = document.getElementById('master').value;
        if (master && e.target.value) {
            await renderTimeSlots(master, e.target.value);
        }
    });

    // 5. Booking Form Submission - Send to WhatsApp
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (!document.getElementById('start_time').value) {
                alert('Please select a time slot');
                return;
            }
            
            const name = document.getElementById('name').value;
            const phone = document.getElementById('phone').value;
            const service = document.getElementById('service').value;
            const master = document.getElementById('master').value;
            const time = document.getElementById('selected_time_slot').value;
            const date = document.getElementById('date').value;

            const message = `👋 New Appointment Request!%0A%0A` +
                          `👤 *Name:* ${name}%0A` +
                          `📞 *Phone:* ${phone}%0A` +
                          `💅 *Service:* ${service}%0A` +
                          `🎨 *Artist:* ${master}%0A` +
                          `📅 *Date:* ${date}%0A` +
                          `⏰ *Time:* ${time}%0A%0A` +
                          `Please confirm my booking!`;

            const whatsappNumber = "19176221846";
            const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;

            bookingForm.style.display = 'none';
            document.getElementById('bookingSuccess').style.display = 'block';
            
            setTimeout(() => {
                window.open(whatsappUrl, '_blank');
            }, 1000);
        });
    }

    // ==================== CUSTOM SELECT LOGIC ====================
    function setupCustomSelects() {
        const selects = document.querySelectorAll('.custom-select');
        
        selects.forEach(select => {
            const selected = select.querySelector('.select-selected');
            const items = select.querySelector('.select-items');
            const hiddenInput = select.nextElementSibling;

            selected.onclick = function(e) {
                e.stopPropagation();
                document.querySelectorAll('.select-items').forEach(el => {
                    if (el !== items) el.classList.add('select-hide');
                });
                items.classList.toggle('select-hide');
                selected.classList.toggle('select-arrow-active');
            };

            items.onclick = function(e) {
                const target = e.target;
                if (target.tagName === 'DIV' && target.hasAttribute('data-value')) {
                    const val = target.getAttribute('data-value');
                    selected.innerHTML = target.textContent + ' <span class="arrow">▼</span>';
                    hiddenInput.value = val;
                    items.classList.add('select-hide');
                    selected.classList.remove('select-arrow-active');
                }
            };
        });
    }

    document.addEventListener('click', () => {
        document.querySelectorAll('.select-items').forEach(el => el.classList.add('select-hide'));
        document.querySelectorAll('.select-selected').forEach(el => el.classList.remove('select-arrow-active'));
    });

    // 16. Load Staff logic (Simplified: only hide section)
    async function loadStaffMembers() {
        const staffSection = document.getElementById('staff');
        if (staffSection) staffSection.style.display = 'none';
        setupCustomSelects();
    }

    // 17. Populate Works Carousel
    function populateWorksCarousel() {
        const carousel = document.getElementById('worksCarousel');
        if (!carousel) return;

        const workImages = [];
        for (let i = 1; i <= 10; i++) {
            let filename = `work ${i}.jpg`;
            if (i === 3) filename = `Work 3.jpg`;
            workImages.push(`images/${filename}`);
        }

        const allImages = [...workImages, ...workImages];
        carousel.innerHTML = allImages.map((src, idx) => `<img src="${src}" alt="Our Work ${idx + 1}" loading="lazy">`).join('');
    }

    loadStaffMembers();
    populateWorksCarousel();
});

// Modal & Mobile Menu Logic (Global)
window.openModal = function(e) {
    if(e) e.preventDefault();
    const modal = document.getElementById('bookingModal');
    modal.classList.add('show');
    document.getElementById('bookingForm').style.display = 'block';
    document.getElementById('bookingSuccess').style.display = 'none';
    document.getElementById('bookingForm').reset();
    
    // Reset service text
    const serviceSelected = document.querySelector('#custom-service .select-selected');
    if (serviceSelected) serviceSelected.innerHTML = 'Select a service <span class="arrow">▼</span>';
}

window.closeModal = function() {
    const modal = document.getElementById('bookingModal');
    modal.classList.remove('show');
}

window.toggleMobileMenu = function() {
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('menuOverlay');
    
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('active');
    overlay.classList.toggle('active');
    
    const spans = hamburger.querySelectorAll('span');
    if (hamburger.classList.contains('active')) {
        spans[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(7px, -7px)';
        document.body.style.overflow = 'hidden';
    } else {
        spans[0].style.transform = '';
        spans[1].style.opacity = '1';
        spans[2].style.transform = '';
        document.body.style.overflow = '';
    }
}

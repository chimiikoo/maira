document.addEventListener('DOMContentLoaded', () => {

    // 1. Initial Load Animations
    // Trigger initial fade-ins for the hero section
    setTimeout(() => {
        const fadeElements = document.querySelectorAll('.fade-in');
        fadeElements.forEach(el => {
            el.classList.add('appear');
        });
    }, 100);

    // 2. Navbar Scroll Effect
    // Adds a background to the navbar when user scrolls down
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 3. Scroll Reveal Animations
    // Intersection Observer to reveal elements as they scroll into view
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
                observer.unobserve(entry.target); // Unobserve after revealing for performance
            }
        });
    }, revealOptions);

    const revealElements = document.querySelectorAll('.scroll-reveal');
    revealElements.forEach(el => {
        revealObserver.observe(el);
    });

    // Make revealObserver globally available for staff loading
    window.revealObserver = revealObserver;

    // ==================== TIME SLOTS LOGIC ====================
    
    // Available time slots (09:00 to 20:00)
    const AVAILABLE_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    
    // Get booked slots for selected master and date
    async function getBookedSlots(master, dateStr) {
        try {
            const bookings = await DataManager.getBookings();
            const bookedSlots = new Set();
            
            bookings.forEach(b => {
                if (b.master === master && b.start_time) {
                    const bookingDate = new Date(b.start_time).toISOString().split('T')[0];
                    if (bookingDate === dateStr) {
                        const hour = new Date(b.start_time).getHours();
                        bookedSlots.add(hour);
                    }
                }
            });
            
            return bookedSlots;
        } catch (error) {
            console.error('Error getting booked slots:', error);
            return new Set();
        }
    }
    
    // Render time slots UI
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
        console.log('✅ Time slots rendered. Booked hours:', Array.from(bookedSlots));
    }
    
    // Select time slot
    window.selectTimeSlot = function(button, dateStr) {
        if (button.disabled) return;
        
        // Remove previous selection
        document.querySelectorAll('.time-slot').forEach(btn => btn.classList.remove('selected'));
        
        // Mark as selected
        button.classList.add('selected');
        
        const hour = parseInt(button.dataset.hour);
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
        
        // Set hidden fields
        const date = new Date(`${dateStr}T${timeStr}:00`);
        document.getElementById('selected_time_slot').value = timeStr;
        document.getElementById('start_time').value = date.toISOString();
        
        // End time = start time + 1 hour
        const endDate = new Date(date.getTime() + 60 * 60 * 1000);
        document.getElementById('end_time').value = endDate.toISOString();
        
        console.log('✅ Slot selected:', timeStr, 'Start:', date.toISOString());
    };
    
    // Listen to date and master changes
    document.getElementById('date').addEventListener('change', async (e) => {
        const master = document.getElementById('master').value;
        if (master && e.target.value) {
            await renderTimeSlots(master, e.target.value);
        }
    });
    
    // Also listen to master select changes
    document.addEventListener('masterChanged', async (e) => {
        const date = document.getElementById('date').value;
        const master = e.detail;
        if (master && date) {
            await renderTimeSlots(master, date);
        }
    });
    // 5. Booking Form Submission - Send to FastAPI Backend
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Validate that time slot is selected
            if (!document.getElementById('start_time').value) {
                alert('Please select a time slot');
                return;
            }
            
            const submitBtn = bookingForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            const formData = {
                name: document.getElementById('name').value,
                phone: document.getElementById('phone').value,
                service: document.getElementById('service').value,
                master: document.getElementById('master').value,
                start_time: document.getElementById('start_time').value,  // Already ISO formatted
                end_time: document.getElementById('end_time').value       // Already ISO formatted
            };
            
            try {
                const response = await fetch('http://127.0.0.1:8000/api/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    bookingForm.style.display = 'none';
                    document.getElementById('bookingSuccess').style.display = 'block';
                    console.log('✅ Booking sent successfully to FastAPI backend');
                } else if (response.status === 409) {
                    // Slot conflict - show error
                    const errorData = await response.json();
                    alert('❌ Sorry! This time slot is no longer available.\n\nPlease select another time or master.\n\n' + errorData.detail);
                    // Re-render slots to refresh availability
                    const master = formData.master;
                    const date = document.getElementById('date').value;
                    await renderTimeSlots(master, date);
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || `Server error: ${response.status}`);
                }
            } catch (error) {
                console.error('Submission error:', error);
                alert('Sorry, there was a problem sending your booking request.\n\nError: ' + error.message);
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

// Modal Logic (Global scope so inline onclick can reach them)
window.openModal = function(e) {
    if(e) e.preventDefault();
    const modal = document.getElementById('bookingModal');
    modal.classList.add('show');
    // Reset form state if it was successful before
    document.getElementById('bookingForm').style.display = 'block';
    document.getElementById('bookingSuccess').style.display = 'none';
    document.getElementById('bookingForm').reset();
}

window.closeModal = function() {
    const modal = document.getElementById('bookingModal');
    modal.classList.remove('show');
}

// Mobile Menu Toggle Function (Global)
window.toggleMobileMenu = function() {
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('menuOverlay');
    
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('active');
    overlay.classList.toggle('active');
    
    // Animate hamburger spans (CSS handles most, but inline for dynamic)
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

// Close when clicking outside of the modal-content
window.addEventListener('click', (e) => {
    const modal = document.getElementById('bookingModal');
    if (e.target === modal) {
        window.closeModal();
    }
});

// Custom Select UI Logic
document.addEventListener('DOMContentLoaded', () => {
    const customSelects = document.getElementsByClassName("custom-select");
    
    for (let i = 0; i < customSelects.length; i++) {
        const selElmnt = customSelects[i].getElementsByClassName("select-items")[0];
        const selectedDiv = customSelects[i].getElementsByClassName("select-selected")[0];
        const hiddenInput = customSelects[i].nextElementSibling; // Gets the <input type="hidden">

        selectedDiv.addEventListener("click", function(e) {
            e.stopPropagation();
            closeAllSelect(this);
            this.nextElementSibling.classList.toggle("select-hide");
            this.classList.toggle("select-arrow-active");
        });

        const options = selElmnt.getElementsByTagName("div");
        for (let j = 0; j < options.length; j++) {
            options[j].addEventListener("click", function(e) {
                // Update selected text and hidden input
                selectedDiv.innerHTML = this.innerHTML + ' <span class="arrow">▼</span>';
                hiddenInput.value = this.getAttribute("data-value");
                
                // Styling active selection
                const siblings = this.parentNode.getElementsByClassName("same-as-selected");
                for (let k = 0; k < siblings.length; k++) {
                    siblings[k].classList.remove("same-as-selected");
                }
                this.classList.add("same-as-selected");
                selectedDiv.click(); // close the dropdown
            });
        }
    }

    function closeAllSelect(elmnt) {
        const items = document.getElementsByClassName("select-items");
        const selected = document.getElementsByClassName("select-selected");
        const arrNo = [];
        for (let i = 0; i < selected.length; i++) {
            if (elmnt == selected[i]) {
                arrNo.push(i);
            } else {
                selected[i].classList.remove("select-arrow-active");
            }
        }
        for (let i = 0; i < items.length; i++) {
            if (arrNo.indexOf(i)) {
                items[i].classList.add("select-hide");
            }
        }
    }

    document.addEventListener("click", closeAllSelect);
    
    // Add validation override for custom selects inside booking form
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            const serviceVal = document.getElementById('service').value;
            const masterVal = document.getElementById('master').value;
            
            if (!serviceVal || !masterVal) {
                e.preventDefault();
                e.stopImmediatePropagation();
                alert('Please make sure to select both a Service and a Nail Artist.');
                return false;
            }
        }, true); // Use capture phase to run before the other submit handler
    }

    // 16. Load Staff from DataManager (now async with API support)
    function loadStaffMembers() {
        console.log('loadStaffMembers called');
        
        if (typeof DataManager === 'undefined') {
            console.error('❌ DataManager not loaded! Waiting...');
            setTimeout(loadStaffMembers, 500);
            return;
        }

        console.log('✅ DataManager found');
        
        // Call async function to get staff
        DataManager.getStaff().then(staff => {
            console.log('Staff data:', staff);

            // Update staff grid
            const staffGrid = document.getElementById('staffGrid');
            console.log('staffGrid element:', staffGrid);
            
            if (staffGrid) {
                const delays = ['delay-1', 'delay-2', 'delay-3'];
                const html = staff.map((member, idx) => {
                    // Use photo from backend if available, otherwise use image fallback
                    const photoUrl = member.photo || member.image || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqJJ-liD-TbVUhJLjhSBR5SJV3e8Xt3BsUxw&s';
                    return `
                        <div class="staff-card scroll-reveal up ${delays[idx] || ''}">
                            <div class="staff-photo">
                                <img src="${photoUrl}" alt="${member.name}" loading="lazy">
                                <div class="staff-photo-overlay"></div>
                            </div>
                            <div class="staff-info">
                                <h3>${member.name}</h3>
                                <p class="staff-role">${member.specialization || member.spec || 'Specialist'}</p>
                                <p>${member.description || 'Professional nail artist'}</p>
                            </div>
                        </div>
                    `;
                }).join('');
                
                staffGrid.innerHTML = html;
                console.log('✅ Staff cards inserted:', staff.length);

                // Re-observe new elements for scroll reveal
                const newElements = staffGrid.querySelectorAll('.scroll-reveal');
                if (window.revealObserver) {
                    newElements.forEach(el => window.revealObserver.observe(el));
                }
            } else {
                console.error('❌ staffGrid element not found');
            }

            // Update master selection in booking form
            const masterOptions = document.getElementById('masterOptions');
            if (masterOptions) {
                masterOptions.innerHTML = staff.map(member =>
                    `<div data-value="${member.name}">${member.name} - ${member.specialization || member.spec || 'Specialist'}</div>`
                ).join('');
                console.log('✅ Master options updated');
            }
        }).catch(error => {
            console.error('❌ Error loading staff:', error);
        });
    }

    // 17. Populate Works Carousel
    function populateWorksCarousel() {
        const carousel = document.getElementById('worksCarousel');
        if (!carousel) return;

        // Populate with 10 images from images/work 1 to work 10
        // NOTE: The actual files are now in .jpg format
        const workImages = [];
        for (let i = 1; i <= 10; i++) {
            let filename = `work ${i}.jpg`;
            if (i === 3) filename = `Work 3.jpg`; // Handle specific casing found on disk
            workImages.push(`images/${filename}`);
        }

        // Duplicate for seamless scroll
        const allImages = [...workImages, ...workImages];
        
        carousel.innerHTML = allImages.map((src, idx) => `
            <img src="${src}" alt="Our Work ${idx + 1}" loading="lazy">
        `).join('');
        
        console.log('✅ Works carousel populated');
    }

    // Load staff and carousel when page loads
    console.log('Calling initial loaders...');
    loadStaffMembers();
    populateWorksCarousel();

    // Re-initialize custom selects after loading staff
    function initializeCustomSelects() {
        const customSelects = document.getElementsByClassName("custom-select");
        
        for (let i = 0; i < customSelects.length; i++) {
            const selElmnt = customSelects[i].getElementsByClassName("select-items")[0];
            const selectedDiv = customSelects[i].getElementsByClassName("select-selected")[0];
            const hiddenInput = customSelects[i].nextElementSibling;

            const options = selElmnt.getElementsByTagName("div");
            for (let j = 0; j < options.length; j++) {
                options[j].addEventListener("click", function(e) {
                    selectedDiv.innerHTML = this.innerHTML + ' <span class="arrow">▼</span>';
                    const selectedValue = this.getAttribute("data-value");
                    hiddenInput.value = selectedValue;
                    
                    const siblings = this.parentNode.getElementsByClassName("same-as-selected");
                    for (let k = 0; k < siblings.length; k++) {
                        siblings[k].removeAttribute("class");
                    }
                    this.setAttribute("class", "same-as-selected");
                    
                    // ✓ Dispatch event if this is the master select
                    if (hiddenInput.id === 'master') {
                        document.dispatchEvent(new CustomEvent('masterChanged', { detail: selectedValue }));
                        console.log('📍 Master changed to:', selectedValue);
                    }
                });
            }
        }
    }

    // Initialize after loading staff
    setTimeout(() => {
        initializeCustomSelects();
    }, 100);
    
    // Re-initialize when staff is updated
    window.addEventListener('staffUpdated', () => {
        loadStaffMembers();
        setTimeout(() => {
            initializeCustomSelects();
        }, 100);
    });
});



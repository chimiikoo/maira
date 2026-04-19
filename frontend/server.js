const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());

// Serve static files from frontend folder
app.use(express.static(__dirname));

// IMPORTANT: Also serve images folder (one level up)
app.use('/images', express.static(path.join(__dirname, '../images')));

// ⚠️ DEPRECATED: Booking API endpoints have been moved to FastAPI backend (backend/main.py)
// The following endpoints are NO LONGER USED and are kept only for reference/history
// All bookings operations should now go to: http://127.0.0.1:8000/api/bookings

/*
// DEPRECATED: POST endpoint for new bookings - Use FastAPI instead
app.post('/api/book', (req, res) => {
    res.status(410).json({ 
        error: 'Deprecated', 
        message: 'This endpoint has been moved to FastAPI backend at http://127.0.0.1:8000/api/bookings'
    });
});

// DEPRECATED: GET endpoint to fetch bookings - Use FastAPI instead
app.get('/api/bookings', (req, res) => {
    res.status(410).json({ 
        error: 'Deprecated', 
        message: 'This endpoint has been moved to FastAPI backend at http://127.0.0.1:8000/api/bookings'
    });
});
*/

// Start the server
app.listen(PORT, () => {
    console.log(`✅ Static file server is running!`);
    console.log(`👉 Frontend: http://localhost:${PORT}`);
    console.log(`👉 Admin Dashboard: http://localhost:${PORT}/admin.html`);
    console.log(`\n⚠️ NOTE: Bookings API has been moved to FastAPI backend!`);
    console.log(`   Start backend with: uvicorn main:app --reload (in backend/ folder)`);
});

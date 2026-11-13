require('dotenv').config();
const express = require('express');
const { createClient } = require('@libsql/client');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'kashmircare_super_secret_key_2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection (Automatically uses Turso Cloud if TURSO_DATABASE_URL is set, otherwise local file)
const dbUrl = process.env.TURSO_DATABASE_URL || 'file:kashmircare.db';
const dbAuthToken = process.env.TURSO_AUTH_TOKEN || undefined;

const db = createClient({
  url: dbUrl,
  authToken: dbAuthToken
});

console.log(`Database mode: ${process.env.TURSO_DATABASE_URL ? 'Turso Cloud SQLite (Permanent)' : 'Local SQLite File'}`);

// Initial Seed Data
const INITIAL_PROVIDERS = [
  {
    id: "p-1",
    name: "Dr. Ayesha Khan",
    category: "Doctors",
    specialty: "General Physician (MD)",
    district: "Srinagar",
    address: "Karan Nagar, Near SMHS Hospital, Srinagar",
    fee: 500,
    timings: "10:00 AM - 05:00 PM",
    rating: 4.8,
    reviews: 124,
    badge: "Top Rated",
    phone: "+91 9419011223",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80",
    actionBtn1: "Book Appointment",
    actionBtn2: "View Profile"
  },
  {
    id: "p-2",
    name: "SKIMS Medical College & Hospital",
    category: "Hospitals & Clinics",
    specialty: "Multi-Specialty Hospital",
    district: "Srinagar",
    address: "Soura, Srinagar, J&K 190011",
    fee: 200,
    timings: "24/7 Emergency & OPD",
    rating: 4.6,
    reviews: 892,
    badge: "Verified",
    phone: "+91 194 2401013",
    image: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=600&q=80",
    actionBtn1: "Book OPD Visit",
    actionBtn2: "Get Directions"
  },
  {
    id: "p-3",
    name: "MedPlus Diagnostic Centre",
    category: "Diagnostic Labs",
    specialty: "Pathology & Radiology",
    district: "Baramulla",
    address: "Main Chowk, Sopore Road, Baramulla",
    fee: 800,
    timings: "08:00 AM - 08:00 PM",
    rating: 4.5,
    reviews: 230,
    badge: "Verified",
    phone: "+91 195 2234567",
    image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80",
    actionBtn1: "Book Lab Test",
    actionBtn2: "View Profile"
  },
  {
    id: "p-4",
    name: "WellCare Pharmacy",
    category: "Pharmacies",
    specialty: "24/7 Medicine & Home Delivery",
    district: "Srinagar",
    address: "Lal Chowk, Residency Road, Srinagar",
    fee: 0,
    timings: "Open 24 Hours",
    rating: 4.7,
    reviews: 156,
    badge: "Verified",
    phone: "+91 9419098765",
    image: "https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=600&q=80",
    actionBtn1: "Order / Inquiry",
    actionBtn2: "Get Directions"
  },
  {
    id: "p-5",
    name: "Kashmir Home Care Services",
    category: "Home Healthcare",
    specialty: "Home Nursing & Elderly Care",
    district: "Srinagar",
    address: "Rajbagh, Near Zero Bridge, Srinagar",
    fee: 1000,
    timings: "09:00 AM - 09:00 PM",
    rating: 4.5,
    reviews: 98,
    badge: "Verified",
    phone: "+91 9419155555",
    image: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=600&q=80",
    actionBtn1: "Book Home Visit",
    actionBtn2: "View Profile"
  }
];

async function seedDatabase() {
  for (const p of INITIAL_PROVIDERS) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO providers 
            (id, name, category, specialty, district, address, fee, timings, rating, reviews, badge, phone, image, actionBtn1, actionBtn2) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [p.id, p.name, p.category, p.specialty, p.district, p.address, p.fee, p.timings, p.rating, p.reviews, p.badge, p.phone, p.image, p.actionBtn1, p.actionBtn2]
    });
  }
}

async function initDatabase() {
  await db.execute(`CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    specialty TEXT NOT NULL,
    district TEXT NOT NULL,
    address TEXT DEFAULT 'Jammu & Kashmir',
    fee INTEGER DEFAULT 500,
    timings TEXT DEFAULT '10:00 AM - 06:00 PM',
    rating REAL DEFAULT 5.0,
    reviews INTEGER DEFAULT 1,
    badge TEXT DEFAULT 'Verified',
    phone TEXT NOT NULL,
    image TEXT,
    actionBtn1 TEXT,
    actionBtn2 TEXT
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    providerId TEXT,
    providerName TEXT,
    patientName TEXT NOT NULL,
    patientAge TEXT,
    phone TEXT NOT NULL,
    symptoms TEXT,
    date TEXT NOT NULL,
    timeSlot TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    paymentMethod TEXT DEFAULT 'Pay at Clinic',
    paymentStatus TEXT DEFAULT 'Pending',
    transactionId TEXT,
    status TEXT DEFAULT 'Confirmed',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed default providers if empty
  const countRes = await db.execute("SELECT COUNT(*) as count FROM providers");
  const count = Number(countRes.rows[0].count || 0);
  if (count === 0) {
    await seedDatabase();
    console.log("Database seeded with initial providers.");
  }

  // Seed default admin if missing
  const adminRes = await db.execute({
    sql: "SELECT id FROM users WHERE email = ?",
    args: ['admin@kashmircare.com']
  });
  if (adminRes.rows.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await db.execute({
      sql: "INSERT INTO users (fullName, email, passwordHash, role) VALUES (?, ?, ?, ?)",
      args: ['KashmirCare Admin', 'admin@kashmircare.com', hash, 'admin']
    });
    console.log("Default Admin created: admin@kashmircare.com / admin123");
  }
}

// ================= AUTH MIDDLEWARE =================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. Please login first.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired session.' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required.' });
  }
  next();
}

// Health check endpoint (for cron-job.org / UptimeRobot keep-alive ping)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ================= AUTH ROUTES =================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const hash = bcrypt.hashSync(password, 10);

    const result = await db.execute({
      sql: "INSERT INTO users (fullName, email, passwordHash, role) VALUES (?, ?, ?, 'user')",
      args: [fullName.trim(), normalizedEmail, hash]
    });

    const user = { id: Number(result.lastInsertRowid), fullName: fullName.trim(), email: normalizedEmail, role: 'user' };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'This email is already registered.' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const result = await db.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [normalizedEmail]
    });

    const row = result.rows[0];
    if (!row) return res.status(401).json({ error: 'Invalid email or password.' });

    const validPass = bcrypt.compareSync(password, row.passwordHash);
    if (!validPass) return res.status(401).json({ error: 'Invalid email or password.' });

    const user = { id: Number(row.id), fullName: row.fullName, email: row.email, role: row.role };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= PROVIDER ROUTES =================
app.get('/api/providers', async (req, res) => {
  try {
    const { search, district, category } = req.query;
    let query = "SELECT * FROM providers WHERE 1=1";
    let args = [];

    if (district) {
      query += " AND district = ?";
      args.push(district);
    }
    if (category) {
      query += " AND category = ?";
      args.push(category);
    }
    if (search) {
      query += " AND (LOWER(name) LIKE ? OR LOWER(specialty) LIKE ? OR LOWER(category) LIKE ? OR LOWER(district) LIKE ? OR LOWER(address) LIKE ?)";
      const term = `%${search.toLowerCase()}%`;
      args.push(term, term, term, term, term);
    }

    query += " ORDER BY rowid DESC";

    const result = await db.execute({ sql: query, args });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/providers', async (req, res) => {
  try {
    const { name, category, district, address, specialty, fee, timings, phone, badge, image } = req.body;
    const id = "p-" + Date.now();
    const actionBtn1 = category === "Doctors" ? "Book Appointment" : (category === "Diagnostic Labs" ? "Book Lab Test" : "Book / Inquiry");
    const actionBtn2 = (category === "Hospitals & Clinics" || category === "Pharmacies") ? "Get Directions" : "View Profile";
    const finalImage = image || "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80";
    const parsedFee = parseInt(fee, 10) || 0;

    await db.execute({
      sql: `INSERT INTO providers (id, name, category, specialty, district, address, fee, timings, rating, reviews, badge, phone, image, actionBtn1, actionBtn2)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 5.0, 1, ?, ?, ?, ?, ?)`,
      args: [
        id, name, category, specialty, district,
        address || `${district}, Kashmir`,
        parsedFee,
        timings || '10:00 AM - 06:00 PM',
        badge || 'Verified',
        phone,
        finalImage,
        actionBtn1,
        actionBtn2
      ]
    });

    res.status(201).json({ id, name, category, district, address, fee: parsedFee, timings, specialty, phone, badge, image: finalImage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/providers/:id/review', async (req, res) => {
  try {
    const { rating } = req.body;
    const numRating = Math.min(5, Math.max(1, parseFloat(rating) || 5));

    const result = await db.execute({
      sql: "SELECT rating, reviews FROM providers WHERE id = ?",
      args: [req.params.id]
    });
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: "Provider not found" });

    const totalReviews = Number(row.reviews || 1) + 1;
    const newAvg = Number((((Number(row.rating) * Number(row.reviews || 1)) + numRating) / totalReviews).toFixed(1));

    await db.execute({
      sql: "UPDATE providers SET rating = ?, reviews = ? WHERE id = ?",
      args: [newAvg, totalReviews, req.params.id]
    });

    res.json({ rating: newAvg, reviews: totalReviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/providers/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.execute({
      sql: "DELETE FROM providers WHERE id = ?",
      args: [req.params.id]
    });
    res.json({ message: "Provider deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/providers/reset', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.execute("DELETE FROM providers");
    await seedDatabase();
    const result = await db.execute("SELECT * FROM providers ORDER BY rowid DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= BOOKING & PAYMENT ROUTES =================
app.post('/api/bookings', async (req, res) => {
  try {
    const { providerId, providerName, patientName, patientAge, phone, symptoms, date, timeSlot, amount, paymentMethod } = req.body;
    
    const parsedAmount = parseInt(amount, 10) || 0;
    const method = paymentMethod || 'Pay at Clinic';
    const isOnlinePaid = (method !== 'Pay at Clinic' && parsedAmount > 0);
    const paymentStatus = parsedAmount === 0 ? 'Free / No Charge' : (isOnlinePaid ? 'Paid' : 'Pending (Pay at Clinic)');
    const transactionId = isOnlinePaid ? ('TXN-KC-' + Math.floor(100000 + Math.random() * 900000)) : 'CASH-' + Date.now().toString().slice(-6);

    const result = await db.execute({
      sql: `INSERT INTO bookings (providerId, providerName, patientName, patientAge, phone, symptoms, date, timeSlot, amount, paymentMethod, paymentStatus, transactionId) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [providerId, providerName, patientName, patientAge || '', phone, symptoms || '', date, timeSlot, parsedAmount, method, paymentStatus, transactionId]
    });

    res.status(201).json({
      bookingId: Number(result.lastInsertRowid),
      providerName,
      patientName,
      patientAge,
      phone,
      date,
      timeSlot,
      amount: parsedAmount,
      paymentMethod: method,
      paymentStatus,
      transactionId,
      message: "Appointment & payment recorded!"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bookings', async (req, res) => {
  try {
    const result = await db.execute("SELECT * FROM bookings ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/bookings/:id/pay', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.execute({
      sql: "UPDATE bookings SET paymentStatus = 'Paid' WHERE id = ?",
      args: [req.params.id]
    });
    res.json({ message: "Payment marked as Paid" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/bookings/:id', async (req, res) => {
  try {
    await db.execute({
      sql: "DELETE FROM bookings WHERE id = ?",
      args: [req.params.id]
    });
    res.json({ message: "Booking cancelled successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= ADMIN DASHBOARD ROUTES =================
app.get('/api/admin/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const providersRes = await db.execute("SELECT * FROM providers ORDER BY rowid DESC");
    const bookingsRes = await db.execute("SELECT * FROM bookings ORDER BY id DESC");
    const usersRes = await db.execute("SELECT id, fullName, email, role, createdAt FROM users ORDER BY id DESC");

    const providers = providersRes.rows;
    const bookings = bookingsRes.rows;
    const users = usersRes.rows;

    const totalRevenue = bookings
      .filter(b => b.paymentStatus === 'Paid')
      .reduce((sum, b) => sum + Number(b.amount || 0), 0);

    res.json({
      stats: {
        totalProviders: providers.length,
        totalBookings: bookings.length,
        totalUsers: users.length,
        totalRevenue
      },
      providers,
      bookings,
      users
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server after initializing database
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`KashmirCare server running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Failed to initialize database:", err);
});

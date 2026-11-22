const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Import route modules
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const sessionRoutes = require('./routes/sessions');
const transactionRoutes = require('./routes/transactions');
const statsRoutes = require('./routes/stats');
const userRoutes = require('./routes/users');

// Initialize Express app
const app = express();

// ---------------------
// Middleware
// ---------------------

// Enable CORS for all origins (development)
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// ---------------------
// Routes
// ---------------------

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error.' });
});

// ---------------------
// Start Server
// ---------------------

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

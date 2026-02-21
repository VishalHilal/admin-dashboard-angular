const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// Models
const User = mongoose.model('User', new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'active' },
  role: { type: String, enum: ['user', 'manager', 'admin'], default: 'user' },
  phone: String,
  address: String,
  joinDate: { type: Date, default: Date.now },
  orders: { type: Number, default: 0 },
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date
}));

const Notification = mongoose.model('Notification', new mongoose.Schema({
  type: { type: String, enum: ['success', 'warning', 'error', 'info'], required: true },
  message: { type: String, required: true },
  time: { type: String, default: () => new Date().toLocaleString() },
  read: { type: Boolean, default: false }
}));

const Revenue = mongoose.model('Revenue', new mongoose.Schema({
  month: { type: String, required: true },
  revenue: { type: Number, required: true }
}));

const Activity = mongoose.model('Activity', new mongoose.Schema({
  description: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}));

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Helper function to emit real-time updates
function emitUpdate(event, data) {
  io.emit(event, data);
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Role-based Authorization Middleware
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Authentication Routes
// Register new user (admin only)
app.post('/api/auth/register', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const { name, email, password, role = 'user', phone, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      address
    });

    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    // Add activity
    const activity = new Activity({
      description: `New user ${name} registered by ${req.user.name}`
    });
    await activity.save();
    emitUpdate('newActivity', activity);

    res.status(201).json({ message: 'User created successfully', user: userResponse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(423).json({ error: 'Account temporarily locked' });
    }

    // Check if account is active
    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is not active' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      // Increment login attempts
      user.loginAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
      }
      
      await user.save();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role,
        name: user.name 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userWithId = {
      ...user.toObject(),
      id: user._id.toString()
    };

    res.json(userWithId);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update password
app.put('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Find user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logout (client-side token removal)
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logout successful' });
});

// Routes
// Get dashboard stats
app.get('/api/stats', authenticateToken, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const totalOrders = await User.aggregate([{ $group: { _id: null, total: { $sum: '$orders' } } }]);
    const revenueData = await Revenue.find();
    const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
    
    res.json({
      totalUsers,
      totalOrders: totalOrders[0]?.total || 0,
      totalRevenue,
      activeUsers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get users
app.get('/api/users', authenticateToken, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query).sort({ joinDate: -1 });
    // Add id field to match frontend expectations
    const usersWithId = users.map(user => ({
      ...user.toObject(),
      id: user._id.toString()
    }));
    res.json(usersWithId);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create/Update user
app.post('/api/users', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    
    // Add id field for frontend compatibility
    const userWithId = {
      ...user.toObject(),
      id: user._id.toString()
    };
    
    // Emit real-time update
    emitUpdate('userAdded', userWithId);
    
    // Add activity
    const activity = new Activity({
      description: `New user ${user.name} added`
    });
    await activity.save();
    emitUpdate('newActivity', activity);
    
    res.json(userWithId);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // Add id field for frontend compatibility
    const userWithId = {
      ...user.toObject(),
      id: user._id.toString()
    };
    
    // Emit real-time update
    emitUpdate('userUpdated', userWithId);
    
    // Add activity
    const activity = new Activity({
      description: `User ${user.name} updated`
    });
    await activity.save();
    emitUpdate('newActivity', activity);
    
    res.json(userWithId);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    // Emit real-time update
    emitUpdate('userDeleted', { id: req.params.id });
    
    // Add activity
    const activity = new Activity({
      description: `User ${user.name} deleted`
    });
    await activity.save();
    emitUpdate('newActivity', activity);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ timestamp: -1 }).limit(20);
    // Add id field to match frontend expectations
    const notificationsWithId = notifications.map(notification => ({
      ...notification.toObject(),
      id: notification._id.toString()
    }));
    res.json(notificationsWithId);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create notification
app.post('/api/notifications', authenticateToken, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const notification = new Notification(req.body);
    await notification.save();
    
    // Add id field for frontend compatibility
    const notificationWithId = {
      ...notification.toObject(),
      id: notification._id.toString()
    };
    
    // Emit real-time update
    emitUpdate('newNotification', notificationWithId);
    
    res.json(notificationWithId);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id, 
      { read: true }, 
      { new: true }
    );
    
    // Add id field for frontend compatibility
    const notificationWithId = {
      ...notification.toObject(),
      id: notification._id.toString()
    };
    
    emitUpdate('notificationRead', notificationWithId);
    res.json(notificationWithId);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get revenue data
app.get('/api/revenue', authenticateToken, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const revenue = await Revenue.find().sort({ month: 1 });
    res.json(revenue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
      status: 'healthy',
      database: dbStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get activities
app.get('/api/activities', authenticateToken, async (req, res) => {
  try {
    const activities = await Activity.find().sort({ timestamp: -1 }).limit(10);
    res.json(activities.map(a => a.description));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Seed initial data
app.post('/api/seed', async (req, res) => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Notification.deleteMany({});
    await Revenue.deleteMany({});
    await Activity.deleteMany({});
    
    // Seed users with passwords
    const users = [
      { name: 'John Doe', email: 'john@example.com', password: 'admin123', status: 'active', role: 'admin', phone: '+1-555-0101', address: '123 Main St, New York, NY', orders: 12 },
      { name: 'Jane Smith', email: 'jane@example.com', password: 'user123', status: 'active', role: 'user', phone: '+1-555-0102', address: '456 Oak Ave, Los Angeles, CA', orders: 8 },
      { name: 'Bob Johnson', email: 'bob@example.com', password: 'user123', status: 'inactive', role: 'user', phone: '+1-555-0103', address: '789 Pine Rd, Chicago, IL', orders: 5 },
      { name: 'Alice Brown', email: 'alice@example.com', password: 'manager123', status: 'active', role: 'manager', phone: '+1-555-0104', address: '321 Elm St, Houston, TX', orders: 15 },
      { name: 'Charlie Wilson', email: 'charlie@example.com', password: 'user123', status: 'pending', role: 'user', phone: '+1-555-0105', address: '654 Maple Dr, Phoenix, AZ', orders: 3 },
      { name: 'Diana Davis', email: 'diana@example.com', password: 'admin123', status: 'active', role: 'admin', phone: '+1-555-0106', address: '987 Cedar Ln, Philadelphia, PA', orders: 20 },
      { name: 'Edward Miller', email: 'edward@example.com', password: 'user123', status: 'inactive', role: 'user', phone: '+1-555-0107', address: '147 Birch Way, San Antonio, TX', orders: 7 },
      { name: 'Fiona Garcia', email: 'fiona@example.com', password: 'manager123', status: 'active', role: 'manager', phone: '+1-555-0108', address: '258 Spruce St, San Diego, CA', orders: 11 }
    ];
    
    // Hash passwords before inserting
    const salt = await bcrypt.genSalt(12);
    const usersWithHashedPasswords = await Promise.all(
      users.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, salt)
      }))
    );
    
    await User.insertMany(usersWithHashedPasswords);
    
    // Seed notifications
    const notifications = [
      { type: 'success', message: 'New order received: #5678' },
      { type: 'warning', message: 'Inventory low for product SKU-1234' },
      { type: 'info', message: 'System maintenance scheduled for tonight' },
      { type: 'error', message: 'Payment gateway timeout detected' },
      { type: 'success', message: 'Monthly report generated successfully' }
    ];
    
    await Notification.insertMany(notifications);
    
    // Seed revenue data
    const revenue = [
      { month: 'Jan', revenue: 32000 },
      { month: 'Feb', revenue: 28000 },
      { month: 'Mar', revenue: 35000 },
      { month: 'Apr', revenue: 42000 },
      { month: 'May', revenue: 38000 },
      { month: 'Jun', revenue: 45678 }
    ];
    
    await Revenue.insertMany(revenue);
    
    // Seed activities
    const activities = [
      { description: 'New user registration' },
      { description: 'Order #1234 completed' },
      { description: 'Product updated' },
      { description: 'New review submitted' },
      { description: 'Payment processed' }
    ];
    
    await Activity.insertMany(activities);
    
    res.json({ message: 'Database seeded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auto-refresh simulation
setInterval(async () => {
  try {
    // Simulate random order updates
    const randomUser = await User.aggregate([{ $sample: { size: 1 } }]);
    if (randomUser.length > 0) {
      const user = randomUser[0];
      await User.findByIdAndUpdate(user._id, { $inc: { orders: 1 } });
      
      emitUpdate('orderUpdate', {
        userId: user._id,
        newOrderCount: user.orders + 1,
        message: `New order for ${user.name}`
      });
    }
    
    // Simulate random notifications
    const notificationTypes = ['success', 'warning', 'info'];
    const messages = [
      'New user registration',
      'Order completed',
      'Payment received',
      'System update available',
      'Inventory updated'
    ];
    
    if (Math.random() > 0.7) { // 30% chance
      const randomType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      const notification = new Notification({
        type: randomType,
        message: randomMessage
      });
      await notification.save();
      
      // Add id field for frontend compatibility
      const notificationWithId = {
        ...notification.toObject(),
        id: notification._id.toString()
      };
      
      emitUpdate('newNotification', notificationWithId);
    }
  } catch (error) {
    console.error('Auto-refresh error:', error);
  }
}, 10000); // Every 10 seconds

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
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
  status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'active' },
  role: { type: String, enum: ['user', 'manager', 'admin'], default: 'user' },
  phone: String,
  address: String,
  joinDate: { type: Date, default: Date.now },
  orders: { type: Number, default: 0 }
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

// Routes
// Get dashboard stats
app.get('/api/stats', async (req, res) => {
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
app.get('/api/users', async (req, res) => {
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
app.post('/api/users', async (req, res) => {
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

app.put('/api/users/:id', async (req, res) => {
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

app.delete('/api/users/:id', async (req, res) => {
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
app.get('/api/notifications', async (req, res) => {
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
app.post('/api/notifications', async (req, res) => {
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
app.put('/api/notifications/:id/read', async (req, res) => {
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
app.get('/api/revenue', async (req, res) => {
  try {
    const revenue = await Revenue.find().sort({ month: 1 });
    res.json(revenue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get activities
app.get('/api/activities', async (req, res) => {
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
    
    // Seed users
    // const users = [
    //   { name: 'John Doe', email: 'john@example.com', status: 'active', role: 'admin', phone: '+1-555-0101', address: '123 Main St, New York, NY', orders: 12 },
    //   { name: 'Jane Smith', email: 'jane@example.com', status: 'active', role: 'user', phone: '+1-555-0102', address: '456 Oak Ave, Los Angeles, CA', orders: 8 },
    //   { name: 'Bob Johnson', email: 'bob@example.com', status: 'inactive', role: 'user', phone: '+1-555-0103', address: '789 Pine Rd, Chicago, IL', orders: 5 },
    //   { name: 'Alice Brown', email: 'alice@example.com', status: 'active', role: 'manager', phone: '+1-555-0104', address: '321 Elm St, Houston, TX', orders: 15 },
    //   { name: 'Charlie Wilson', email: 'charlie@example.com', status: 'pending', role: 'user', phone: '+1-555-0105', address: '654 Maple Dr, Phoenix, AZ', orders: 3 },
    //   { name: 'Diana Davis', email: 'diana@example.com', status: 'active', role: 'admin', phone: '+1-555-0106', address: '987 Cedar Ln, Philadelphia, PA', orders: 20 },
    //   { name: 'Edward Miller', email: 'edward@example.com', status: 'inactive', role: 'user', phone: '+1-555-0107', address: '147 Birch Way, San Antonio, TX', orders: 7 },
    //   { name: 'Fiona Garcia', email: 'fiona@example.com', status: 'active', role: 'manager', phone: '+1-555-0108', address: '258 Spruce St, San Diego, CA', orders: 11 }
    // ];
    
    await User.insertMany(users);
    
    // Seed notifications
    // const notifications = [
    //   { type: 'success', message: 'New order received: #5678' },
    //   { type: 'warning', message: 'Inventory low for product SKU-1234' },
    //   { type: 'info', message: 'System maintenance scheduled for tonight' },
    //   { type: 'error', message: 'Payment gateway timeout detected' },
    //   { type: 'success', message: 'Monthly report generated successfully' }
    // ];
    
    await Notification.insertMany(notifications);
    
    // Seed revenue data
    // const revenue = [
    //   { month: 'Jan', revenue: 32000 },
    //   { month: 'Feb', revenue: 28000 },
    //   { month: 'Mar', revenue: 35000 },
    //   { month: 'Apr', revenue: 42000 },
    //   { month: 'May', revenue: 38000 },
    //   { month: 'Jun', revenue: 45678 }
    // ];
    
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

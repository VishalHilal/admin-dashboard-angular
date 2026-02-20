const mongoose = require('mongoose');
require('dotenv').config();

// Import the same models from server.js
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

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Notification.deleteMany({});
    await Revenue.deleteMany({});
    await Activity.deleteMany({});
    console.log('Cleared existing data');

    // Seed users
    const users = [
      { name: 'John Doe', email: 'john@example.com', status: 'active', role: 'admin', phone: '+1-555-0101', address: '123 Main St, New York, NY', orders: 12 },
      { name: 'Jane Smith', email: 'jane@example.com', status: 'active', role: 'user', phone: '+1-555-0102', address: '456 Oak Ave, Los Angeles, CA', orders: 8 },
      { name: 'Bob Johnson', email: 'bob@example.com', status: 'inactive', role: 'user', phone: '+1-555-0103', address: '789 Pine Rd, Chicago, IL', orders: 5 },
      { name: 'Alice Brown', email: 'alice@example.com', status: 'active', role: 'manager', phone: '+1-555-0104', address: '321 Elm St, Houston, TX', orders: 15 },
      { name: 'Charlie Wilson', email: 'charlie@example.com', status: 'pending', role: 'user', phone: '+1-555-0105', address: '654 Maple Dr, Phoenix, AZ', orders: 3 }
    ];
    
    await User.insertMany(users);
    console.log('Seeded users');

    // Seed notifications
    const notifications = [
      { type: 'success', message: 'New order received: #5678' },
      { type: 'warning', message: 'Inventory low for product SKU-1234' },
      { type: 'info', message: 'System maintenance scheduled for tonight' },
      { type: 'error', message: 'Payment gateway timeout detected' },
      { type: 'success', message: 'Monthly report generated successfully' }
    ];
    
    await Notification.insertMany(notifications);
    console.log('Seeded notifications');

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
    console.log('Seeded revenue data');

    // Seed activities
    const activities = [
      { description: 'New user registration' },
      { description: 'Order #1234 completed' },
      { description: 'Product updated' },
      { description: 'New review submitted' },
      { description: 'Payment processed' }
    ];
    
    await Activity.insertMany(activities);
    console.log('Seeded activities');

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();

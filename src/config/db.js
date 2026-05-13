const mongoose = require('mongoose');
const dns = require('dns');

// Force Google DNS to resolve MongoDB Atlas hostnames
// (many ISP DNS servers fail to resolve SRV records)
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.error('Retrying in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
}

module.exports = connectDB;

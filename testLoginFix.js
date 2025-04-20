const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

// Load env vars
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1);
  });

// Test login process with updated method
const testLoginProcess = async () => {
  try {
    console.log('1. Creating test user...');
    
    // Clean up any existing test user
    await User.findOneAndDelete({ email: 'testlogin@example.com' });
    
    // Create test user
    const testUser = new User({
      name: 'Test Login User',
      email: 'testlogin@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      age: 30,
      gender: 'male',
      phone: '+19998887000',
      address: '123 Test Street, Test City',
      role: 'user'
    });
    
    await testUser.save();
    console.log('Test user created with ID:', testUser._id);
    
    console.log('\n2. Simulating login process...');
    
    // Get user with password
    const user = await User.findOne({ email: 'testlogin@example.com' }).select('+password');
    
    // Check if password matches
    const isMatch = await user.matchPassword('password123');
    console.log('Password match:', isMatch);
    
    // Update last login time using new method
    console.log('\n3. Testing updateLastLogin method...');
    console.log('Before lastLogin:', user.lastLogin);
    
    const updateResult = await user.updateLastLogin();
    console.log('Update result:', updateResult);
    
    // Verify the update
    const updatedUser = await User.findById(user._id);
    console.log('After lastLogin:', updatedUser.lastLogin);
    
    // Clean up
    await User.findByIdAndDelete(user._id);
    
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
};

// Run test
testLoginProcess()
  .then(success => {
    console.log(`\nTest ${success ? 'PASSED' : 'FAILED'}`);
    mongoose.connection.close();
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    mongoose.connection.close();
    process.exit(1);
  }); 
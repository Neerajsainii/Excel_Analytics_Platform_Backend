const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// Load env vars
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => {
  console.error('MongoDB Connection Error:', err.message);
  process.exit(1);
});

// Create test user function
const createTestUser = async () => {
  try {
    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@example.com' });
    if (existingUser) {
      console.log('Test user already exists, deleting...');
      await User.findOneAndDelete({ email: 'test@example.com' });
    }

    // Create a new test user
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      age: 30,
      gender: 'male',
      phone: '+19998887777',
      address: '123 Test Street, Test City',
      role: 'user'
    };

    console.log('Creating test user...');
    const user = await User.create(testUser);
    console.log('Test user created with ID:', user._id);
    return user;
  } catch (err) {
    console.error('Error creating test user:', err);
    throw err;
  }
};

// Test login function
const testLogin = async (email, password) => {
  try {
    console.log(`Attempting login with email: ${email}, password: ${password}`);
    
    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('Login failed: User not found');
      return { success: false, error: 'User not found' };
    }
    
    // Debug password details
    console.log('User found with ID:', user._id);
    console.log('Password from DB (hashed):', user.password);
    
    // Test bcrypt directly
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match using bcrypt directly:', isMatch);
    
    // Test using model method
    const isMatchModel = await user.matchPassword(password);
    console.log('Password match using model method:', isMatchModel);
    
    if (!isMatch) {
      console.log('Login failed: Invalid password');
      return { success: false, error: 'Invalid password' };
    }
    
    console.log('Login successful!');
    return { 
      success: true, 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  } catch (err) {
    console.error('Error during login test:', err);
    return { success: false, error: err.message };
  }
};

// Test updateLastLogin function
const testUpdateLastLogin = async (userId) => {
  try {
    const user = await User.findById(userId);
    console.log('Before lastLogin update:', user.lastLogin);
    
    await user.updateLastLogin();
    
    const updatedUser = await User.findById(userId);
    console.log('After lastLogin update:', updatedUser.lastLogin);
    
    return true;
  } catch (err) {
    console.error('Error updating last login:', err);
    return false;
  }
};

// Run all tests
const runTests = async () => {
  try {
    // Create a test user
    const user = await createTestUser();
    
    // Test login with correct credentials
    console.log('\n--- Testing login with correct credentials ---');
    const loginResult = await testLogin('test@example.com', 'password123');
    console.log('Login result:', loginResult);
    
    // Test login with wrong password
    console.log('\n--- Testing login with wrong password ---');
    const wrongPasswordResult = await testLogin('test@example.com', 'wrongpassword');
    console.log('Wrong password result:', wrongPasswordResult);
    
    // Test updateLastLogin
    console.log('\n--- Testing updateLastLogin ---');
    const updateLastLoginResult = await testUpdateLastLogin(user._id);
    console.log('Update last login result:', updateLastLoginResult);
    
    // Clean up - delete the test user
    await User.findByIdAndDelete(user._id);
    console.log('\nTest user deleted successfully');
    
    return true;
  } catch (err) {
    console.error('Test failed:', err);
    return false;
  }
};

// Run tests and close connection
runTests()
  .then(success => {
    console.log(`\nTests ${success ? 'PASSED' : 'FAILED'}`);
    mongoose.connection.close();
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    mongoose.connection.close();
    process.exit(1);
  }); 
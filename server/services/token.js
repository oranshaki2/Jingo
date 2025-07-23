const User = require('../models/user');

// Check if the user is registered by given userName and password
const checkIfUserRegistered = async (username, password, res) => {
    const user = await getUserByUserNameAndPassword(username, password);
}; // It will change in the next exercise

// Get a user by userName and password
const getUserByUserNameAndPassword = async (username, password) => {
    return await User.findOne({ username, password }); // Find user by userName and password
};

module.exports = { checkIfUserRegistered, getUserByUserNameAndPassword};

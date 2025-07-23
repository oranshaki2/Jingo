const User = require('../models/user');

// Create a new user
const createUser = async (username, password, idNumber,  watch_list, picture,nickname) => {
    const user = new User({
        username,
        password,
        idNumber,
        watch_list,
        picture,
        nickname
    });

    await user.save();
    return user;
};

// Get user's details by id
const getUserById = async (id) => {
    return await User.findById(id);
};

// Get user's details by username
const getUserByUsername = async (username) => {
    return await User.findOne({ username });
};

// const getUserByEmail = async (email) => {
//     return await User.findOne({ email });
// }

const getAllUsers = async () => {
    return await User.find({});
};

const updateUser = async (user, movieId) => {
    if (!user.watch_list.includes(movieId)) {
        user.watch_list.push(movieId); // Add movieId to the list
        await user.save(); // Save changes to the database
    }
};

module.exports = { createUser, getUserById, getUserByUsername, getAllUsers, updateUser };

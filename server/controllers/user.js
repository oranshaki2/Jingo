const userService = require('../services/user');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Get the path to the directory containing the profile pictures
const pictureDirectory = path.join(__dirname, '../profilePics');

// Load the list of picture files once
const pictureFiles = fs.readdirSync(pictureDirectory).filter(file => file.endsWith('.jpg'));

async function generateIdNumber() {
    const allUsers = await userService.getAllUsers();
    let highestId = 0;
    for (const user of allUsers) {
        if (user.idNumber > highestId) {
            highestId = user.idNumber;
        }
    }
    // The first user will have an id of 1
    return highestId + 1;
}

const createUser = async (req, res) => {
    // Parse the JSON string in the `user` field
    // const userData = JSON.parse(req.body.user);
    // Parse JSON only if it's a string
    const userData = typeof req.body.user === "string" ? JSON.parse(req.body.user) : req.body;

    // Extract data from parsed user object
    const { username, password,nickname, watch_list } = userData;
    const picture = req.file ? req.file.path : 'server/profilePics/default1.jpg';
    const existingUser = await userService.getUserByUsername(username);
    // Check if a user with the same username already exists
    if (existingUser) {
        return res.status(404).json({ errors: ['This username already exists.'] });
    }
    const validPassword = password.length >= 8;
    // Check if the password meets the minimum length requirement
    if (!validPassword) {
        return res.status(400).json({ errors: ['Password must be at least 7 characters long.'] });
    }
    const idNumber = await generateIdNumber();
    //const user = await userService.createUser(username, password, idNumber, watch_list, picture);
    const user = await userService.createUser(username, password, idNumber, watch_list, picture, nickname);
    res.status(201).send();
}

const getUserById = async (req, res) => {
    try {
        const user = await userService.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ errors: ['User not found'] });
        }
        res.json(user);
    } catch (error) {
        res.status(404).json({ errors: ['User not found'] });
    }
}

const checkUsernameAvailability = async (req, res) => {
    const { username } = req.params;
    const existingUser = await userService.getUserByUsername(username);
    res.json({ exists: !!existingUser });
};

module.exports = {
    createUser,
    getUserById,
    checkUsernameAvailability,
};
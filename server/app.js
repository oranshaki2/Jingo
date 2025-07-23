const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const categories = require('./routes/category'); // Import the category routes.
const fs = require('fs');
const path = require('path');
const movies = require('./routes/movie'); // Import the movie routes.
const tokens = require('./routes/token');
const users = require('./routes/user');// Import the token routes.
const { connectDB, initializeDB } = require('./utils/db');
const multer = require('multer');

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads/'));
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

require('dotenv').config({ path: './config/.env.local' });

// Create a new Express application
const app = express();

// Increase payload size limit
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));



// Connect to MongoDB
connectDB().then(() => {
    // Initialize the database with movies and categories
    initializeDB().catch(err => console.error('Error initializing database:', err));
}).catch(error => {
    console.error('Connection error:', error);
});


// Check if the connection is successful
mongoose.connection.once('open', () => {
}).on('error', (error) => {
    console.error('Connection error:', error);
});


// Serve static files from the web/public directory
app.use(express.static(path.join(__dirname, '../web/public')));

// Serve static files from 'posters' directory
app.use("/posters", express.static(path.join(__dirname, "posters")));

// Serve static files from 'profilePics' directory
app.use("/profilePics", express.static(path.join(__dirname, "profilePics")));

// Serve static files from 'uploads' directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Ensure the uploads directories exist
const serverUploadsDir = path.join(__dirname, 'uploads');
const webUploadsDir = path.join(__dirname, '../web/public/uploads');
// Function to ensure a directory exists
const ensureDirectoryExistence = (dirPath) => {
    const dirname = path.dirname(dirPath);
    if (fs.existsSync(dirname)) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }
    } else {
        ensureDirectoryExistence(dirname);
        fs.mkdirSync(dirPath);
    }
};


ensureDirectoryExistence(serverUploadsDir);
ensureDirectoryExistence(webUploadsDir);

// Serve the uploads directories as static files
app.use('/uploads', express.static(serverUploadsDir));
app.use('/public/uploads', express.static(webUploadsDir));



app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/categories', categories);

app.use('/api/movies', movies);
app.use('/api/tokens', tokens);

app.use('/api/users', users);

// Enable CORS
// CORS configuration
app.use(cors({
    origin: 'http://localhost:3000', // Allow requests from React app
    methods: 'GET, POST, PUT, PATCH, DELETE', // Include PATCH method
    credentials: true, // Include credentials (cookies, headers, etc.)
}));

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});

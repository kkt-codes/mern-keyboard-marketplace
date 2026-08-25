// dotenv must load before any other local module is required — some
// modules (e.g. config/cloudinary.js) read process.env at module-load
// time rather than inside a function, so if this ran later those reads
// would see undefined values that never get refreshed afterward.
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./config/db');
const app = require('./app');

// Connect to Database
connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));

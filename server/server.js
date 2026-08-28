// dotenv must load before any other local module is required — some
// modules (e.g. config/cloudinary.js) read process.env at module-load
// time rather than inside a function, so if this ran later those reads
// would see undefined values that never get refreshed afterward.
const path = require('path');
const dotenv = require('dotenv');

// Anchored to this file rather than the working directory. dotenv defaults to
// `${process.cwd()}/.env`, so `node server/server.js` from the repo root finds
// nothing and boots a server with no database URI and no secrets — reported
// only as a quiet "injecting env (0)" rather than an error.
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const app = require('./app');

// Connect to Database
connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * Defines the structure for User documents in MongoDB.
 */
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false // Security: Do not return password by default in queries
    },
    role: {
        type: String,
        enum: ['buyer', 'seller', 'admin'],
        default: 'buyer'
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

/**
 * Pre-save middleware to hash the password before saving to database.
 * This runs automatically before .save() is called.
 * Mongoose 9's middleware engine dropped the legacy `next` callback param —
 * hooks are now plain async functions, and the save proceeds when the
 * returned promise resolves (or aborts if it throws).
 */
userSchema.pre('save', async function() {
    // Only hash the password if it has been modified (or is new).
    // Skipping this check would re-hash the already-hashed password on every
    // unrelated save (e.g. updating just the name) and permanently break login.
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Method to compare entered password with the hashed password in the database.
 * @param {string} enteredPassword - The plain text password to check.
 * @returns {Promise<boolean>} - True if passwords match, false otherwise.
 */
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

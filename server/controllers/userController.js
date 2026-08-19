const User = require('../models/User');
const Product = require('../models/Product');

/**
 * @desc    List all users, paginated
 * @route   GET /api/users?page=&limit=
 * @access  Private (Admin)
 */
const getUsers = async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.max(1, Number(req.query.limit) || 10);
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
            User.countDocuments({})
        ]);

        res.json({
            users,
            page,
            pages: Math.max(1, Math.ceil(total / limit)),
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Change a user's role
 * @route   PUT /api/users/:id/role
 * @access  Private (Admin)
 * @note    Admins can't change their own role — that guards against the
 *          last admin accidentally demoting themselves and locking the
 *          whole panel; promote someone else first instead.
 */
const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;

        if (!['buyer', 'seller', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Role must be buyer, seller, or admin' });
        }

        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ message: "You can't change your own role" });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.role = role;
        await user.save();

        res.json({ _id: user._id, name: user.name, email: user.email, role: user.role });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Delete a user and their product listings
 * @route   DELETE /api/users/:id
 * @access  Private (Admin)
 * @note    Their orders are kept as historical records (buyers still need
 *          them), but their products are removed so the catalog doesn't
 *          fill with listings nobody can fulfil. Deleting yourself or a
 *          fellow admin is blocked — demote the admin first.
 */
const deleteUser = async (req, res) => {
    try {
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ message: "You can't delete your own account" });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'admin') {
            return res.status(400).json({ message: 'Demote the other admin before deleting them' });
        }

        await Product.deleteMany({ user: user._id });
        await user.deleteOne();

        res.json({ message: 'User removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getUsers, updateUserRole, deleteUser };

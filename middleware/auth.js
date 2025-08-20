const jwt = require('jsonwebtoken');
const { pool } = require('../server');

let publicUserId = null;

const auth = async (req, res, next) => {
    try {
        // Bypass auth if disabled
        if (process.env.DISABLE_AUTH === 'true') {
            try {
                if (!publicUserId) {
                    const existing = await pool.query('SELECT id FROM users WHERE username = $1', ['public']);
                    if (existing.rows.length > 0) {
                        publicUserId = existing.rows[0].id;
                    } else {
                        const created = await pool.query(
                            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
                            ['public', 'public@example.com', 'disabled-auth']
                        );
                        publicUserId = created.rows[0].id;
                    }
                }
                req.user = { id: publicUserId, username: 'public' };
                return next();
            } catch (dbErr) {
                console.error('Public user provisioning error:', dbErr);
                return res.status(500).json({ error: 'Auth disabled but failed to provision public user' });
            }
        }

        // Normal JWT flow
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ error: 'Invalid token.' });
    }
};

module.exports = auth;

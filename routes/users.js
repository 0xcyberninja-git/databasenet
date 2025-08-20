const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../server');
const auth = require('../middleware/auth');

// User registration
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const { rows } = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
            [username, email, passwordHash]
        );

        // Generate JWT token
        const token = jwt.sign(
            { id: rows[0].id, username: rows[0].username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            user: rows[0],
            token
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// User login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Find user
        const { rows } = await pool.query(
            'SELECT id, username, email, password_hash FROM users WHERE username = $1',
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = rows[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            },
            token
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Failed to log in' });
    }
});

// Get current user profile
router.get('/profile', auth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, username, email, created_at FROM users WHERE id = $1',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Get dropdown options for a user
router.get('/dropdown-options', auth, async (req, res) => {
    try {
        const [contactPersons, operators] = await Promise.all([
            pool.query('SELECT name FROM contact_persons WHERE user_id = $1 ORDER BY name', [req.user.id]),
            pool.query('SELECT name FROM operators WHERE user_id = $1 ORDER BY name', [req.user.id])
        ]);

        res.json({
            contactPersons: contactPersons.rows.map(row => row.name),
            operators: operators.rows.map(row => row.name)
        });
    } catch (error) {
        console.error('Error fetching dropdown options:', error);
        res.status(500).json({ error: 'Failed to fetch dropdown options' });
    }
});

// Add contact person
router.post('/contact-persons', auth, async (req, res) => {
    try {
        const { name } = req.body;
        
        const { rows } = await pool.query(
            'INSERT INTO contact_persons (user_id, name) VALUES ($1, $2) RETURNING *',
            [req.user.id, name]
        );

        res.status(201).json(rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({ error: 'Contact person already exists' });
        }
        console.error('Error adding contact person:', error);
        res.status(500).json({ error: 'Failed to add contact person' });
    }
});

// Delete contact person
router.delete('/contact-persons/:name', auth, async (req, res) => {
    try {
        const { name } = req.params;
        
        const { rows } = await pool.query(
            'DELETE FROM contact_persons WHERE user_id = $1 AND name = $2 RETURNING *',
            [req.user.id, name]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Contact person not found' });
        }

        res.json({ message: 'Contact person deleted successfully' });
    } catch (error) {
        console.error('Error deleting contact person:', error);
        res.status(500).json({ error: 'Failed to delete contact person' });
    }
});

// Add operator
router.post('/operators', auth, async (req, res) => {
    try {
        const { name } = req.body;
        
        const { rows } = await pool.query(
            'INSERT INTO operators (user_id, name) VALUES ($1, $2) RETURNING *',
            [req.user.id, name]
        );

        res.status(201).json(rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({ error: 'Operator already exists' });
        }
        console.error('Error adding operator:', error);
        res.status(500).json({ error: 'Failed to add operator' });
    }
});

// Delete operator
router.delete('/operators/:name', auth, async (req, res) => {
    try {
        const { name } = req.params;
        
        const { rows } = await pool.query(
            'DELETE FROM operators WHERE user_id = $1 AND name = $2 RETURNING *',
            [req.user.id, name]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Operator not found' });
        }

        res.json({ message: 'Operator deleted successfully' });
    } catch (error) {
        console.error('Error deleting operator:', error);
        res.status(500).json({ error: 'Failed to delete operator' });
    }
});

module.exports = router;

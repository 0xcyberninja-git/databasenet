const express = require('express');
const router = express.Router();
const { pool } = require('../server');
const auth = require('../middleware/auth');

// Get all calls for a user
router.get('/', auth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT c.*, 
                    COALESCE(json_agg(
                        json_build_object(
                            'id', cm.id,
                            'text', cm.text,
                            'created_at', cm.created_at,
                            'updated_at', cm.updated_at,
                            'attachments', (
                                SELECT COALESCE(json_agg(
                                    json_build_object(
                                        'id', a.id,
                                        'file_name', a.file_name,
                                        'file_size', a.file_size,
                                        'file_type', a.file_type,
                                        'file_url', a.file_url
                                    )
                                ), '[]'::json)
                                FROM attachments a
                                WHERE a.comment_id = cm.id
                            )
                        )
                    ) FILTER (WHERE cm.id IS NOT NULL), '[]'::json) as comment_history
             FROM calls c
             LEFT JOIN comments cm ON c.id = cm.call_id
             WHERE c.user_id = $1
             GROUP BY c.id
             ORDER BY c.created_at DESC`,
            [req.user.id]
        );

        res.json(rows);
    } catch (error) {
        console.error('Error fetching calls:', error);
        res.status(500).json({ error: 'Failed to fetch calls' });
    }
});

// Create a new call
router.post('/', auth, async (req, res) => {
    try {
        const { callerName, callerNumber, personToContact, operatorName, priority, note } = req.body;
        
        const { rows } = await pool.query(
            `INSERT INTO calls (user_id, caller_name, caller_number, person_to_contact, operator_name, priority, note)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [req.user.id, callerName, callerNumber, personToContact, operatorName, priority, note]
        );

        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error creating call:', error);
        res.status(500).json({ error: 'Failed to create call' });
    }
});

// Update call status
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        let updateFields = ['status = $2'];
        let updateValues = [req.user.id, status];
        let paramCount = 2;

        // Add timestamp based on status
        switch(status) {
            case 'Followed Up':
                updateFields.push(`followed_up_at = $${++paramCount}`);
                updateValues.push(new Date());
                break;
            case 'Not Received Call':
                updateFields.push(`not_received_at = $${++paramCount}`);
                updateValues.push(new Date());
                break;
            case 'Completed':
                updateFields.push(`completed_at = $${++paramCount}`);
                updateValues.push(new Date());
                break;
        }

        const { rows } = await pool.query(
            `UPDATE calls 
             SET ${updateFields.join(', ')}
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [id, ...updateValues]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Call not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error updating call status:', error);
        res.status(500).json({ error: 'Failed to update call status' });
    }
});

// Delete a call
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { rows } = await pool.query(
            'DELETE FROM calls WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Call not found' });
        }

        res.json({ message: 'Call deleted successfully' });
    } catch (error) {
        console.error('Error deleting call:', error);
        res.status(500).json({ error: 'Failed to delete call' });
    }
});

// Add comment to a call
router.post('/:id/comments', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        
        // Verify call exists and belongs to user
        const callCheck = await pool.query(
            'SELECT id FROM calls WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (callCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Call not found' });
        }

        const { rows } = await pool.query(
            'INSERT INTO comments (call_id, user_id, text) VALUES ($1, $2, $3) RETURNING *',
            [id, req.user.id, text]
        );

        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// Get call statistics
router.get('/stats', auth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT 
                COUNT(*) as total_calls,
                COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_calls,
                COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_calls,
                COUNT(CASE WHEN status = 'Followed Up' THEN 1 END) as followed_up_calls,
                COUNT(CASE WHEN status = 'Not Received Call' THEN 1 END) as not_received_calls,
                COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_calls
             FROM calls 
             WHERE user_id = $1`,
            [req.user.id]
        );

        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

module.exports = router;

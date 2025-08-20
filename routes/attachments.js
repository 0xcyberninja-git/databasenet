const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../server');
const auth = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow all file types for now, but you can add restrictions here
        cb(null, true);
    }
});

// Upload attachment for a comment
router.post('/:commentId', auth, upload.single('file'), async (req, res) => {
    try {
        const { commentId } = req.params;
        
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Verify comment exists and belongs to user's call
        const commentCheck = await pool.query(
            `SELECT c.id, c.call_id, c.user_id 
             FROM comments c 
             JOIN calls cl ON c.call_id = cl.id 
             WHERE c.id = $1 AND cl.user_id = $2`,
            [commentId, req.user.id]
        );

        if (commentCheck.rows.length === 0) {
            // Remove uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Comment not found' });
        }

        // Create file URL (in production, this would be a cloud storage URL)
        const fileUrl = `/uploads/${req.file.filename}`;

        // Save attachment to database
        const { rows } = await pool.query(
            `INSERT INTO attachments (comment_id, file_name, file_size, file_type, file_url, storage_path)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                commentId,
                req.file.originalname,
                req.file.size,
                req.file.mimetype,
                fileUrl,
                req.file.path
            ]
        );

        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error uploading attachment:', error);
        
        // Clean up uploaded file on error
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ error: 'Failed to upload attachment' });
    }
});

// Get attachments for a comment
router.get('/comment/:commentId', auth, async (req, res) => {
    try {
        const { commentId } = req.params;
        
        // Verify comment belongs to user's call
        const commentCheck = await pool.query(
            `SELECT c.id 
             FROM comments c 
             JOIN calls cl ON c.call_id = cl.id 
             WHERE c.id = $1 AND cl.user_id = $2`,
            [commentId, req.user.id]
        );

        if (commentCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        const { rows } = await pool.query(
            'SELECT * FROM attachments WHERE comment_id = $1 ORDER BY created_at',
            [commentId]
        );

        res.json(rows);
    } catch (error) {
        console.error('Error fetching attachments:', error);
        res.status(500).json({ error: 'Failed to fetch attachments' });
    }
});

// Delete attachment
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get attachment and verify ownership
        const attachmentCheck = await pool.query(
            `SELECT a.*, a.storage_path
             FROM attachments a
             JOIN comments c ON a.comment_id = c.id
             JOIN calls cl ON c.call_id = cl.id
             WHERE a.id = $1 AND cl.user_id = $2`,
            [id, req.user.id]
        );

        if (attachmentCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Attachment not found' });
        }

        const attachment = attachmentCheck.rows[0];

        // Delete file from filesystem
        if (attachment.storage_path && fs.existsSync(attachment.storage_path)) {
            fs.unlinkSync(attachment.storage_path);
        }

        // Delete from database
        await pool.query('DELETE FROM attachments WHERE id = $1', [id]);

        res.json({ message: 'Attachment deleted successfully' });
    } catch (error) {
        console.error('Error deleting attachment:', error);
        res.status(500).json({ error: 'Failed to delete attachment' });
    }
});

// Serve uploaded files
router.get('/uploads/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

module.exports = router;

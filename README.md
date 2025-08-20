# Call Follow-Up Tracker

A comprehensive web application for tracking and managing incoming calls with follow-up management, built with Node.js, Express, PostgreSQL, and a modern frontend.

## Features

- **Call Management**: Log incoming calls with caller details, priority levels, and notes
- **Follow-up Tracking**: Track call status from pending to completed
- **User Authentication**: Secure login/registration system with JWT tokens
- **File Attachments**: Support for file uploads in comments
- **Advanced Filtering**: Search and filter calls by various criteria
- **Real-time Updates**: Live status updates and notifications
- **Responsive Design**: Modern UI built with Tailwind CSS

## Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Multer** - File upload handling

### Frontend
- **HTML5** - Semantic markup
- **Tailwind CSS** - Utility-first CSS framework
- **Vanilla JavaScript** - No framework dependencies
- **Font Awesome** - Icons

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd call-followup-tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

#### Create PostgreSQL Database

```sql
CREATE DATABASE calltracker;
```

#### Run Database Schema

```bash
psql -d calltracker -f database/schema.sql
```

### 4. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp env.example .env
```

Edit the `.env` file with your database credentials:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/calltracker
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=development
PORT=3000
```

### 5. Start the Application

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The application will be available at `http://localhost:3000`

## Deployment to Render

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Connect to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` configuration

### 3. Environment Variables

Render will automatically set:
- `DATABASE_URL` - Connected to the PostgreSQL database
- `JWT_SECRET` - Auto-generated secure secret
- `NODE_ENV` - Set to production

### 4. Deploy

Click "Create Web Service" and Render will:
- Build your application
- Set up the PostgreSQL database
- Deploy your web service
- Provide you with a public URL

## API Endpoints

### Authentication
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User login
- `GET /api/users/profile` - Get user profile

### Calls
- `GET /api/calls` - Get all calls for authenticated user
- `POST /api/calls` - Create a new call
- `PATCH /api/calls/:id/status` - Update call status
- `DELETE /api/calls/:id` - Delete a call
- `POST /api/calls/:id/comments` - Add comment to call

### Users
- `GET /api/users/dropdown-options` - Get dropdown options
- `POST /api/users/contact-persons` - Add contact person
- `DELETE /api/users/contact-persons/:name` - Delete contact person
- `POST /api/users/operators` - Add operator
- `DELETE /api/users/operators/:name` - Delete operator

### Attachments
- `POST /api/attachments/:commentId` - Upload file attachment
- `GET /api/attachments/comment/:commentId` - Get attachments for comment
- `DELETE /api/attachments/:id` - Delete attachment

## Database Schema

The application uses the following main tables:

- **users** - User accounts and authentication
- **calls** - Call records with status tracking
- **comments** - Comments and notes on calls
- **attachments** - File attachments for comments
- **contact_persons** - Dropdown options for persons to contact
- **operators** - Dropdown options for operators

## Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt for secure password storage
- **Input Validation** - Server-side validation of all inputs
- **SQL Injection Protection** - Parameterized queries
- **Rate Limiting** - API rate limiting to prevent abuse
- **CORS Protection** - Cross-origin resource sharing configuration

## File Structure

```
call-followup-tracker/
├── database/
│   └── schema.sql          # Database schema
├── middleware/
│   └── auth.js             # JWT authentication middleware
├── public/
│   ├── index.html          # Main application HTML
│   └── app.js              # Frontend JavaScript
├── routes/
│   ├── calls.js            # Call management routes
│   ├── users.js            # User management routes
│   └── attachments.js      # File attachment routes
├── uploads/                 # File upload directory
├── .env.example            # Environment variables template
├── package.json            # Node.js dependencies
├── render.yaml             # Render deployment configuration
├── server.js               # Main server file
└── README.md               # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation above
- Review the code comments for implementation details

## Changelog

### v1.0.0
- Initial release
- Full CRUD operations for calls
- User authentication system
- File attachment support
- Advanced filtering and search
- Responsive design
- PostgreSQL backend
- JWT authentication

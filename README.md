# Expense Reimbursement Application

A modern web application for managing employee expense reimbursements, built with React, Node.js, Express, and MongoDB.

## Features

- User authentication and authorization
- Role-based access control (Employee, Manager, Admin)
- Expense submission with receipt upload
- Expense approval workflow
- Real-time expense tracking
- Interactive expense statistics and charts
- Secure file handling
- Audit logging
- Responsive design

## Tech Stack

### Frontend
- React
- Material-UI
- Recharts for data visualization
- Axios for API calls
- React Router for navigation

### Backend
- Node.js
- Express
- MongoDB with Mongoose
- JWT for authentication
- Multer for file uploads
- Express Validator for input validation

## Security Features

- Rate limiting
- Password policies
- Session management
- Input validation and sanitization
- CORS protection
- Security headers
- Audit logging
- File upload restrictions

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/madriq/Expense-Reimbursement-app.git
cd Expense-Reimbursement-app
```

2. Install backend dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd client
npm install
```

4. Create a `.env` file in the root directory:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/expense-reimbursement
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
SESSION_SECRET=another-super-secret-key-change-this-in-production
```

5. Start the development servers:

Backend:
```bash
npm run dev
```

Frontend:
```bash
cd client
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## API Endpoints

### Authentication
- POST /api/auth/register - Register a new user
- POST /api/auth/login - User login
- POST /api/auth/logout - User logout
- GET /api/auth/me - Get current user
- PUT /api/auth/password - Change password

### Expenses
- POST /api/expenses/submit - Submit a new expense
- GET /api/expenses/my-expenses - Get user's expenses
- GET /api/expenses/all - Get all expenses (managers only)
- PATCH /api/expenses/:id/status - Update expense status
- GET /api/expenses/stats - Get expense statistics

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Material-UI for the component library
- Recharts for the charting library
- Express.js team for the backend framework
- MongoDB team for the database 
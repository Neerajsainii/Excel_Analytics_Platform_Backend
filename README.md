# Excel Analytics Platform

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Version](https://img.shields.io/badge/Version-1.0.0-green.svg)
![Node](https://img.shields.io/badge/Node-14.x-green.svg)

A powerful platform for analyzing Excel data with robust user/admin authentication, role-based access control, and interactive dashboards.

<p align="center">
  <img src="https://via.placeholder.com/800x400?text=Excel+Analytics+Platform" alt="Excel Analytics Platform" width="800">
</p>

## 📋 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Authentication](#-authentication)
- [Contribution Guidelines](#-contribution-guidelines)
- [License](#-license)

## ✨ Features

- **Secure Authentication System**
  - User registration with email verification
  - JWT-based authentication
  - Password hashing with bcrypt
  - Role-based access control (User/Admin)
  - Forget password with email reset

- **Admin Dashboard**
  - User management console
  - System statistics and analytics
  - File management capabilities
  - User activity monitoring

- **User Dashboard**
  - Personal analytics and statistics
  - File management interface
  - Storage usage visualization
  - Custom dashboard layouts

- **Excel Analytics**
  - Excel file upload and storage
  - Data extraction and visualization
  - Advanced analytics capabilities (coming soon)
  - Export analytics results

## 🛠 Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT, bcrypt
- **File Processing**: Multer, xlsx
- **Validation**: Express Validator

## 🏗 System Architecture

The platform follows a modular architecture with clear separation of concerns:

- **Authentication Layer**: Handles user registration, login, and token management
- **Authorization Middleware**: Implements role-based access control
- **Data Models**: Defines MongoDB schemas for users, dashboards, and Excel files
- **API Routes**: Provides RESTful endpoints for all functionalities
- **File Management**: Handles Excel file uploads, storage, and processing

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/excel-analytics-platform.git
   cd excel-analytics-platform
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure environment variables
   Create a `.env` file in the root directory:
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/excel-analytics-platform
   JWT_SECRET=your_random_secret_key
   JWT_EXPIRE=24h
   
   # SMTP Email Configuration (Required for Forget Password)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_EMAIL=your-email@gmail.com
   SMTP_PASSWORD=your-gmail-app-password
   
   # Email Sender Information
   FROM_NAME=Excel Analytics Platform
   FROM_EMAIL=your-email@gmail.com
   ```

4. Start the development server
   ```bash
   npm run dev
   ```

5. The server should be running at `http://localhost:5000`

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register a new user | Public |
| POST | `/api/auth/login` | Login and get token | Public |
| GET | `/api/auth/me` | Get current user profile | Private |
| POST | `/api/auth/forgot-password` | Send OTP for password reset | Public |
| POST | `/api/auth/verify-otp` | Verify OTP and get reset token | Public |
| POST | `/api/auth/reset-password-with-otp` | Reset password with OTP | Public |
| PUT | `/api/auth/reset-password/:token` | Reset password with token (legacy) | Public |

### User Management Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/users` | Get all users | Admin |
| GET | `/api/users/:id` | Get user by ID | Admin |
| PUT | `/api/users/:id` | Update user | Admin |
| DELETE | `/api/users/:id` | Delete user | Admin |
| GET | `/api/users/:id/activity` | Get user activity | Admin |
| PUT | `/api/users/profile/update` | Update profile | Private |

### Dashboard Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/dashboard` | Get user dashboards | Private |
| GET | `/api/dashboard/public` | Get public dashboards | Public |
| GET | `/api/dashboard/admin/stats` | Get admin stats | Admin |
| GET | `/api/dashboard/user/stats` | Get user stats | Private |
| POST | `/api/dashboard` | Create dashboard | Private |
| GET | `/api/dashboard/:id` | Get dashboard by ID | Private/Public |
| PUT | `/api/dashboard/:id` | Update dashboard | Private |
| DELETE | `/api/dashboard/:id` | Delete dashboard | Private |

### Excel File Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/excel` | Get user files | Private |
| GET | `/api/excel/:id` | Get file by ID | Private |
| POST | `/api/excel/upload` | Upload Excel file | Private |
| DELETE | `/api/excel/:id` | Delete file | Private |
| GET | `/api/excel/:id/analyze` | Analyze file | Private |

## 📁 Project Structure

```
excel-analytics-platform/
├── models/             # MongoDB schema models
│   ├── User.js         # User model with roles
│   ├── Dashboard.js    # Dashboard model
│   └── ExcelFile.js    # Excel file model
├── routes/             # API routes
│   ├── auth.js         # Authentication routes
│   ├── users.js        # User management routes
│   ├── dashboard.js    # Dashboard routes
│   └── excel.js        # Excel file routes
├── middleware/         # Express middleware
│   └── auth.js         # Authentication middleware
├── uploads/            # Excel file storage
├── .env                # Environment variables
├── .gitignore          # Git ignore file
├── package.json        # Project dependencies
├── server.js           # Entry point
└── README.md           # Project documentation
```

## 🔐 Authentication

The platform uses JWT (JSON Web Tokens) for authentication. Protected routes require an authentication token in the request header:

```
Authorization: Bearer <your_token>
```

Tokens are obtained upon successful login and expire after 24 hours by default.

## 🤝 Contribution Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards

- Follow ESLint configuration
- Write meaningful commit messages
- Document new functions and API endpoints
- Write tests for new features

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

<p align="center">
  Made with ❤️
</p>

## 🆕 Recent Updates

- Major frontend and backend cleanup: removed unused files, markdown docs, and legacy code
- Enhanced charting: 2D and 3D charts with download/save, zoom, and custom legends
- Improved user and admin dashboards
- Responsive UI with dark mode
- Bug fixes and performance improvements

--- 
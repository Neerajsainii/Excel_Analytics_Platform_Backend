# Excel Analytics Platform API Documentation

## Version 1.0.0

This document provides comprehensive details about the REST APIs, authentication mechanism, and data models for the Excel Analytics Platform backend.

## Table of Contents

1. [Authentication](#authentication)
   - [JWT Authentication](#jwt-authentication)
   - [Authentication Flow](#authentication-flow)
   - [Protected Routes](#protected-routes)
2. [API Endpoints](#api-endpoints)
   - [Authentication APIs](#authentication-apis)
   - [User Management APIs](#user-management-apis)
   - [Dashboard APIs](#dashboard-apis)
   - [Excel File APIs](#excel-file-apis)
3. [Request & Response Formats](#request--response-formats)
4. [Error Handling](#error-handling)
5. [Data Models](#data-models)
6. [Testing the API](#testing-the-api)

---

## Authentication

### JWT Authentication

The platform uses JSON Web Tokens (JWT) for authentication. Each token contains encoded user information that the server can validate without database lookups.

**Token Structure:**
- Header: Algorithm & token type
- Payload: User ID, role, and expiration time
- Signature: Ensures token integrity

**Token Validity:** 24 hours (configurable in the .env file)

### Authentication Flow

1. **Registration**: User submits name, email, password
2. **Login**: User provides credentials and receives JWT token
3. **Accessing Protected Routes**: Include token in the Authorization header

### Protected Routes

For protected routes, include the JWT token in the request header:

```
Authorization: Bearer <your_token>
```

Different routes have different access levels:
- **Public**: No authentication required
- **Private**: Requires valid JWT token
- **Admin-only**: Requires valid JWT token with admin role

---

## API Endpoints

### Authentication APIs

#### Register User

```
POST /api/auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user" // Optional, defaults to "user"
}
```

**Response:** (201 Created)
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Login User

```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:** (200 OK)
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60d21b4667d0d8992e610c85",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "preferences": {
      "theme": "system",
      "dashboardLayout": "grid",
      "emailNotifications": true
    },
    "company": "Example Inc",
    "jobTitle": "Developer"
  }
}
```

#### Get Current User

```
GET /api/auth/me
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "company": "Example Inc",
    "jobTitle": "Developer",
    "preferences": {
      "theme": "system",
      "dashboardLayout": "grid",
      "emailNotifications": true
    },
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### User Management APIs

#### Get All Users (Admin Only)

```
GET /api/users
```

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "60d21b4667d0d8992e610c85",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "company": "Example Inc",
      "jobTitle": "Developer",
      "lastLogin": "2023-01-02T00:00:00.000Z",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "storageUsed": 1048576,
      "isActive": true
    },
    {
      "_id": "60d21b4667d0d8992e610c86",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin",
      "company": "Example Inc",
      "jobTitle": "Admin",
      "lastLogin": "2023-01-02T00:00:00.000Z",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "storageUsed": 2097152,
      "isActive": true
    }
  ]
}
```

#### Get User by ID (Admin Only)

```
GET /api/users/:id
```

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "company": "Example Inc",
    "jobTitle": "Developer",
    "lastLogin": "2023-01-02T00:00:00.000Z",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "storageUsed": 1048576,
    "isActive": true
  }
}
```

#### Update User (Admin Only)

```
PUT /api/users/:id
```

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "email": "john.updated@example.com",
  "role": "admin",
  "company": "Updated Company",
  "jobTitle": "Senior Developer",
  "isActive": true,
  "storageLimit": 209715200
}
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "name": "John Doe Updated",
    "email": "john.updated@example.com",
    "role": "admin",
    "company": "Updated Company",
    "jobTitle": "Senior Developer",
    "isActive": true,
    "storageLimit": 209715200
  }
}
```

#### Get User Activity (Admin Only)

```
GET /api/users/:id/activity
```

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "60d21b4667d0d8992e610c85",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "company": "Example Inc",
      "jobTitle": "Developer",
      "lastLogin": "2023-01-02T00:00:00.000Z",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "isActive": true,
      "storageUsed": 1048576,
      "storageLimit": 104857600
    },
    "recentActivity": {
      "dashboards": [
        {
          "_id": "60d21b4667d0d8992e610c87",
          "title": "Sales Dashboard",
          "description": "Monthly sales analytics",
          "lastUpdated": "2023-01-02T00:00:00.000Z"
        }
      ],
      "files": [
        {
          "_id": "60d21b4667d0d8992e610c88",
          "originalName": "sales-data.xlsx",
          "fileSize": 1048576,
          "uploadDate": "2023-01-02T00:00:00.000Z"
        }
      ]
    }
  }
}
```

#### Update Current User Profile

```
PUT /api/users/profile/update
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "company": "Updated Company",
  "jobTitle": "Senior Developer",
  "preferences": {
    "theme": "dark",
    "dashboardLayout": "list",
    "emailNotifications": false
  }
}
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "name": "John Doe Updated",
    "email": "john@example.com",
    "company": "Updated Company",
    "jobTitle": "Senior Developer",
    "preferences": {
      "theme": "dark",
      "dashboardLayout": "list",
      "emailNotifications": false
    }
  }
}
```

#### Delete User (Admin Only)

```
DELETE /api/users/:id
```

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {}
}
```

### Dashboard APIs

#### Get User Dashboards

```
GET /api/dashboard
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "60d21b4667d0d8992e610c87",
      "user": "60d21b4667d0d8992e610c85",
      "title": "Sales Dashboard",
      "description": "Monthly sales analytics",
      "charts": [
        {
          "title": "Monthly Sales",
          "chartType": "bar",
          "data": {},
          "configuration": {}
        }
      ],
      "lastUpdated": "2023-01-02T00:00:00.000Z",
      "isPublic": false
    }
  ]
}
```

#### Get Public Dashboards

```
GET /api/dashboard/public
```

**Response:** (200 OK)
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "60d21b4667d0d8992e610c89",
      "user": {
        "_id": "60d21b4667d0d8992e610c86",
        "name": "Admin User"
      },
      "title": "Public Sales Dashboard",
      "description": "Public monthly sales analytics",
      "charts": [
        {
          "title": "Monthly Sales",
          "chartType": "bar",
          "data": {},
          "configuration": {}
        }
      ],
      "lastUpdated": "2023-01-02T00:00:00.000Z",
      "isPublic": true
    }
  ]
}
```

#### Get Admin Dashboard Statistics (Admin Only)

```
GET /api/dashboard/admin/stats
```

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 10,
      "new": 3,
      "active": 7
    },
    "dashboards": {
      "total": 15,
      "public": 5
    },
    "files": {
      "total": 25,
      "storageUsed": 52428800
    }
  }
}
```

#### Get Admin Users Dashboard (Admin Only)

```
GET /api/dashboard/admin/users
```

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "60d21b4667d0d8992e610c85",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "company": "Example Inc",
      "jobTitle": "Developer",
      "lastLogin": "2023-01-02T00:00:00.000Z",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "storageUsed": 1048576,
      "isActive": true
    },
    {
      "_id": "60d21b4667d0d8992e610c86",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin",
      "company": "Example Inc",
      "jobTitle": "Admin",
      "lastLogin": "2023-01-02T00:00:00.000Z",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "storageUsed": 2097152,
      "isActive": true
    }
  ]
}
```

#### Get User Dashboard Statistics

```
GET /api/dashboard/user/stats
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "user": {
      "name": "John Doe",
      "email": "john@example.com",
      "company": "Example Inc",
      "jobTitle": "Developer",
      "storageUsed": 1048576,
      "storageLimit": 104857600,
      "storagePercentage": 1
    },
    "stats": {
      "dashboards": 1,
      "files": 1
    },
    "latestActivity": [
      {
        "_id": "60d21b4667d0d8992e610c88",
        "originalName": "sales-data.xlsx",
        "fileSize": 1048576,
        "uploadDate": "2023-01-02T00:00:00.000Z"
      }
    ]
  }
}
```

#### Create Dashboard

```
POST /api/dashboard
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "New Dashboard",
  "description": "New dashboard description",
  "charts": [
    {
      "title": "Sales Chart",
      "chartType": "bar",
      "data": {},
      "configuration": {}
    }
  ],
  "isPublic": false
}
```

**Response:** (201 Created)
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c90",
    "user": "60d21b4667d0d8992e610c85",
    "title": "New Dashboard",
    "description": "New dashboard description",
    "charts": [
      {
        "title": "Sales Chart",
        "chartType": "bar",
        "data": {},
        "configuration": {}
      }
    ],
    "lastUpdated": "2023-01-02T00:00:00.000Z",
    "isPublic": false
  }
}
```

#### Get Dashboard by ID

```
GET /api/dashboard/:id
```

**Headers (if private dashboard):**
```
Authorization: Bearer <token>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c87",
    "user": {
      "_id": "60d21b4667d0d8992e610c85",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "title": "Sales Dashboard",
    "description": "Monthly sales analytics",
    "charts": [
      {
        "title": "Monthly Sales",
        "chartType": "bar",
        "data": {},
        "configuration": {}
      }
    ],
    "lastUpdated": "2023-01-02T00:00:00.000Z",
    "isPublic": false
  }
}
```

#### Update Dashboard

```
PUT /api/dashboard/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Updated Dashboard",
  "description": "Updated dashboard description",
  "charts": [
    {
      "title": "Updated Sales Chart",
      "chartType": "line",
      "data": {},
      "configuration": {}
    }
  ],
  "isPublic": true
}
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c87",
    "user": "60d21b4667d0d8992e610c85",
    "title": "Updated Dashboard",
    "description": "Updated dashboard description",
    "charts": [
      {
        "title": "Updated Sales Chart",
        "chartType": "line",
        "data": {},
        "configuration": {}
      }
    ],
    "lastUpdated": "2023-01-03T00:00:00.000Z",
    "isPublic": true
  }
}
```

#### Delete Dashboard

```
DELETE /api/dashboard/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {}
}
```

### Excel File APIs

#### Get User Excel Files

```
GET /api/excel
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "60d21b4667d0d8992e610c88",
      "user": "60d21b4667d0d8992e610c85",
      "filename": "1609545600000-123456789.xlsx",
      "originalName": "sales-data.xlsx",
      "fileSize": 1048576,
      "uploadDate": "2023-01-02T00:00:00.000Z",
      "sheets": [
        {
          "name": "Sales",
          "columns": ["Date", "Product", "Amount", "Region"],
          "rowCount": 100,
          "previewData": [
            ["Date", "Product", "Amount", "Region"],
            ["2023-01-01", "Widget A", 500, "North"],
            ["2023-01-01", "Widget B", 300, "South"]
          ]
        }
      ],
      "processed": true,
      "processingErrors": []
    }
  ]
}
```

#### Get Excel File by ID

```
GET /api/excel/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c88",
    "user": "60d21b4667d0d8992e610c85",
    "filename": "1609545600000-123456789.xlsx",
    "originalName": "sales-data.xlsx",
    "fileSize": 1048576,
    "uploadDate": "2023-01-02T00:00:00.000Z",
    "sheets": [
      {
        "name": "Sales",
        "columns": ["Date", "Product", "Amount", "Region"],
        "rowCount": 100,
        "previewData": [
          ["Date", "Product", "Amount", "Region"],
          ["2023-01-01", "Widget A", 500, "North"],
          ["2023-01-01", "Widget B", 300, "South"]
        ]
      }
    ],
    "processed": true,
    "processingErrors": []
  }
}
```

#### Upload Excel File

```
POST /api/excel/upload
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
```
file: [Excel file]
```

**Response:** (201 Created)
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c88",
    "user": "60d21b4667d0d8992e610c85",
    "filename": "1609545600000-123456789.xlsx",
    "originalName": "sales-data.xlsx",
    "fileSize": 1048576,
    "uploadDate": "2023-01-02T00:00:00.000Z",
    "sheets": [
      {
        "name": "Sales",
        "columns": ["Date", "Product", "Amount", "Region"],
        "rowCount": 100,
        "previewData": [
          ["Date", "Product", "Amount", "Region"],
          ["2023-01-01", "Widget A", 500, "North"],
          ["2023-01-01", "Widget B", 300, "South"]
        ]
      }
    ],
    "processed": true,
    "processingErrors": []
  }
}
```

#### Delete Excel File

```
DELETE /api/excel/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {}
}
```

#### Analyze Excel File

```
GET /api/excel/:id/analyze
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
sheet: "Sales" (optional, defaults to first sheet)
```

**Response:** (200 OK)
```json
{
  "success": true,
  "fileName": "sales-data.xlsx",
  "sheetName": "Sales",
  "analytics": {
    "rowCount": 100,
    "columns": ["Date", "Product", "Amount", "Region"],
    "summary": {
      "Amount": {
        "type": "numeric",
        "count": 100,
        "sum": 50000,
        "avg": 500,
        "min": 100,
        "max": 1000
      },
      "Region": {
        "type": "categorical",
        "count": 100,
        "uniqueCount": 4
      }
    }
  },
  "data": [
    {
      "Date": "2023-01-01",
      "Product": "Widget A",
      "Amount": 500,
      "Region": "North"
    },
    {
      "Date": "2023-01-01",
      "Product": "Widget B",
      "Amount": 300,
      "Region": "South"
    }
  ]
}
```

---

## Request & Response Formats

### General Response Format

All API responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "data": {} // or [] for collections
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

### Content Types

- For regular requests: `application/json`
- For file uploads: `multipart/form-data`

---

## Error Handling

The API uses standard HTTP status codes:

- **200 OK**: Request succeeded
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Authentication required or invalid token
- **403 Forbidden**: Not authorized to access the resource
- **404 Not Found**: Resource not found
- **500 Server Error**: Server-side error

**Error Response Example:**
```json
{
  "success": false,
  "error": "Resource not found"
}
```

---

## Data Models

### User Model

```javascript
{
  name: String,
  email: String,
  password: String (hashed),
  role: String (enum: ['user', 'admin']),
  company: String,
  jobTitle: String,
  profileImage: String,
  lastLogin: Date,
  preferences: {
    theme: String (enum: ['light', 'dark', 'system']),
    dashboardLayout: String (enum: ['grid', 'list', 'compact']),
    emailNotifications: Boolean
  },
  storageUsed: Number,
  storageLimit: Number,
  isActive: Boolean,
  createdAt: Date
}
```

### Dashboard Model

```javascript
{
  user: ObjectId (ref: 'User'),
  title: String,
  description: String,
  charts: [
    {
      title: String,
      chartType: String (enum: ['bar', 'line', 'pie', 'scatter', 'table']),
      data: Mixed,
      configuration: Mixed
    }
  ],
  lastUpdated: Date,
  isPublic: Boolean
}
```

### Excel File Model

```javascript
{
  user: ObjectId (ref: 'User'),
  filename: String,
  originalName: String,
  fileSize: Number,
  uploadDate: Date,
  sheets: [
    {
      name: String,
      columns: [String],
      rowCount: Number,
      previewData: Mixed
    }
  ],
  processed: Boolean,
  processingErrors: [String]
}
```

---

## Testing the API

You can test the API using tools like:

- Postman
- Insomnia
- cURL
- Frontend API integration

### Example: Testing Authentication with cURL

```bash
# Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'

# Login and get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'

# Access protected route with token
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

*This document was created for frontend developers working on the Excel Analytics Platform. For any questions or clarifications, please contact the backend team.* 
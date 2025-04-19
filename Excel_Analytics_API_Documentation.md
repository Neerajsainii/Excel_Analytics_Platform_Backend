# Excel Analytics Platform API Documentation

## Authentication APIs

### Register User
**Endpoint:** `POST /api/auth/register`

**Fields:**
- `name` (String, required) - User's full name
- `email` (String, required, unique) - Valid email address
- `password` (String, required, min 6 chars) - User password
- `confirmPassword` (String, required) - Must match password
- `age` (Number, required, 18-100) - User's age
- `gender` (String, required) - User's gender ['male', 'female', 'other']
- `phone` (String, required, unique) - Valid phone number in E.164 format
- `address` (String, required) - User's address
- `role` (String, optional) - User role ['user', 'admin'], defaults to 'user'
- `company` (String, optional) - User's company name
- `jobTitle` (String, optional) - User's job title
- `preferences` (Object, optional) - User preferences
  - `theme` (String, optional) - UI theme ['light', 'dark', 'system'], defaults to 'system'
  - `dashboardLayout` (String, optional) - Layout preference ['grid', 'list', 'compact'], defaults to 'grid'
  - `emailNotifications` (Boolean, optional) - Email notification preference, defaults to true

**Validations:**
- "Name is required"
- "Please include a valid email"
- "Please enter a password with 6 or more characters"
- "Passwords do not match"
- "Age must be between 18 and 100"
- "Gender is required"
- "Please provide a valid phone number"
- "Address is required"
- "User with this email already exists"
- "User with this phone number already exists"

**Response Success (201):**
```json
{
  "success": true,
  "token": "JWT_TOKEN_HERE"
}
```

### Login User
**Endpoint:** `POST /api/auth/login`

**Fields:**
- `email` (String, required) - User's email
- `password` (String, required) - User's password

**Validations:**
- "Please include a valid email"
- "Password is required"
- "Invalid credentials"

**Response Success (200):**
```json
{
  "success": true,
  "token": "JWT_TOKEN_HERE",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "age": 30,
    "gender": "male",
    "phone": "+11234567890",
    "address": "123 Main St, City, Country",
    "role": "user",
    "preferences": {
      "theme": "system",
      "dashboardLayout": "grid",
      "emailNotifications": true
    },
    "company": "Example Inc",
    "jobTitle": "Developer",
    "lastLogin": "2023-01-02T00:00:00.000Z",
    "profileImage": "profile_image_url"
  }
}
```

**Notes:**
- Login now updates the `lastLogin` timestamp automatically via `updateLastLogin()` method

### Get Current User
**Endpoint:** `GET /api/auth/me`

**Authentication:** Required (JWT Token)

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "age": 30,
    "gender": "male",
    "phone": "+11234567890",
    "address": "123 Main St, City, Country",
    "role": "user",
    "company": "Example Inc",
    "jobTitle": "Developer",
    "preferences": {
      "theme": "system",
      "dashboardLayout": "grid",
      "emailNotifications": true
    },
    "profileImage": "profile_image_url", 
    "lastLogin": "2023-01-02T00:00:00.000Z",
    "storageUsed": 1048576,
    "storageLimit": 104857600,
    "isActive": true,
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

## User Management APIs

### Get All Users (Admin Only)
**Endpoint:** `GET /api/users`

**Authentication:** Required (Admin JWT Token)

**Validations:**
- "Not authorized to access this route" (if not admin)
- "User role not defined"
- "User account has been deactivated"

**Response Success (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "age": 30,
      "gender": "male",
      "phone": "+11234567890",
      "address": "123 Main St, City, Country",
      "role": "user",
      "company": "Example Inc",
      "jobTitle": "Developer",
      "lastLogin": "2023-01-02T00:00:00.000Z",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "storageUsed": 1048576,
      "storageLimit": 104857600,
      "isActive": true
    },
    // Additional users...
  ]
}
```

**Notes:**
- Response now includes additional user model fields

### Get User by ID (Admin Only)
**Endpoint:** `GET /api/users/:id`

**Authentication:** Required (Admin JWT Token)

**Validations:**
- "Not authorized to access this route" (if not admin)
- "User not found"

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "age": 30,
    "gender": "male",
    "phone": "+11234567890",
    "address": "123 Main St, City, Country",
    "role": "user",
    "company": "Example Inc",
    "jobTitle": "Developer",
    "lastLogin": "2023-01-02T00:00:00.000Z",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "preferences": {
      "theme": "system",
      "dashboardLayout": "grid",
      "emailNotifications": true
    },
    "profileImage": "profile_image_url",
    "storageUsed": 1048576,
    "storageLimit": 104857600,
    "isActive": true
  }
}
```

### Update User (Admin Only)
**Endpoint:** `PUT /api/users/:id`

**Authentication:** Required (Admin JWT Token)

**Fields:**
- `name` (String, optional) - User's name
- `email` (String, optional) - User's email
- `age` (Number, optional) - User's age
- `gender` (String, optional) - User's gender
- `phone` (String, optional) - User's phone number
- `address` (String, optional) - User's address
- `role` (String, optional) - User role ['user', 'admin']
- `company` (String, optional) - User's company
- `jobTitle` (String, optional) - User's job title
- `isActive` (Boolean, optional) - User account status
- `storageLimit` (Number, optional) - Storage limit in bytes
- `preferences` (Object, optional) - User preferences
  - `theme` (String, optional) - UI theme 
  - `dashboardLayout` (String, optional) - Layout preference
  - `emailNotifications` (Boolean, optional) - Email notification preference
- `profileImage` (String, optional) - URL to profile image

**Validations:**
- "Not authorized to access this route" (if not admin)
- "User not found"
- "Email is already in use"
- "Phone number is already in use"

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "name": "John Doe Updated",
    "email": "john.updated@example.com",
    "age": 31,
    "gender": "male",
    "phone": "+11234567890",
    "address": "456 New St, City, Country",
    "role": "admin",
    "company": "Updated Company",
    "jobTitle": "Senior Developer",
    "isActive": true,
    "storageLimit": 209715200,
    "preferences": {
      "theme": "dark",
      "dashboardLayout": "list",
      "emailNotifications": false
    },
    "profileImage": "updated_profile_image_url"
  }
}
```

### Get User Activity (Admin Only)
**Endpoint:** `GET /api/users/:id/activity`

**Authentication:** Required (Admin JWT Token)

**Validations:**
- "Not authorized to access this route" (if not admin)
- "User not found"

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "age": 30,
      "gender": "male",
      "phone": "+11234567890",
      "address": "123 Main St, City, Country",
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
          "_id": "dashboard_id",
          "title": "Sales Dashboard",
          "description": "Monthly sales analytics",
          "lastUpdated": "2023-01-02T00:00:00.000Z"
        }
      ],
      "files": [
        {
          "_id": "file_id",
          "originalName": "sales-data.xlsx",
          "fileSize": 1048576,
          "uploadDate": "2023-01-02T00:00:00.000Z"
        }
      ]
    }
  }
}
```

### Update Current User Profile
**Endpoint:** `PUT /api/users/profile/update`

**Authentication:** Required (JWT Token)

**Fields:**
- `name` (String, optional) - User's name
- `address` (String, optional) - User's address
- `phone` (String, optional) - User's phone number
- `age` (Number, optional) - User's age
- `gender` (String, optional) - User's gender
- `company` (String, optional) - User's company
- `jobTitle` (String, optional) - User's job title
- `preferences` (Object, optional) - User preferences object
  - `theme` (String, optional) - UI theme ['light', 'dark', 'system']
  - `dashboardLayout` (String, optional) - Layout preference ['grid', 'list', 'compact']
  - `emailNotifications` (Boolean, optional) - Email notification preference
- `profileImage` (String, optional) - URL to profile image

**Validations:**
- "User not found"
- "Phone number is already in use"

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "name": "John Doe Updated",
    "email": "john@example.com",
    "age": 31,
    "gender": "male",
    "phone": "+19876543210",
    "address": "456 New St, City, Country",
    "company": "Updated Company",
    "jobTitle": "Senior Developer",
    "preferences": {
      "theme": "dark",
      "dashboardLayout": "list",
      "emailNotifications": false
    },
    "profileImage": "profile_image_url"
  }
}
```

### Delete User (Admin Only)
**Endpoint:** `DELETE /api/users/:id`

**Authentication:** Required (Admin JWT Token)

**Validations:**
- "Not authorized to access this route" (if not admin)
- "User not found"

**Response Success (200):**
```json
{
  "success": true,
  "data": {}
}
```

**Notes:**
- This endpoint now also deletes all associated dashboards and Excel files

## Dashboard APIs

### Get User Dashboards
**Endpoint:** `GET /api/dashboard`

**Authentication:** Required (JWT Token)

**Response Success (200):**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "dashboard_id",
      "user": "user_id",
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

### Get Public Dashboards
**Endpoint:** `GET /api/dashboard/public`

**Authentication:** Not required

**Response Success (200):**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "dashboard_id",
      "user": {
        "_id": "user_id",
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

### Get Admin Dashboard Statistics (Admin Only)
**Endpoint:** `GET /api/dashboard/admin/stats`

**Authentication:** Required (Admin JWT Token)

**Validations:**
- "Not authorized to access this route" (if not admin)

**Response Success (200):**
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

**Notes:**
- Active users are now tracked based on `lastLogin` timestamp

### Get User Dashboard Statistics
**Endpoint:** `GET /api/dashboard/user/stats`

**Authentication:** Required (JWT Token)

**Response Success (200):**
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
        "_id": "file_id",
        "originalName": "sales-data.xlsx",
        "fileSize": 1048576,
        "uploadDate": "2023-01-02T00:00:00.000Z"
      }
    ]
  }
}
```

**Notes:**
- This endpoint calculates storage percentage based on user's storageUsed and storageLimit

### Create Dashboard
**Endpoint:** `POST /api/dashboard`

**Authentication:** Required (JWT Token)

**Fields:**
- `title` (String, required) - Dashboard title
- `description` (String, optional) - Dashboard description
- `charts` (Array, optional) - Array of chart objects
  - `title` (String, required) - Chart title
  - `chartType` (String, required) - Chart type ['bar', 'line', 'pie', 'scatter', 'table']
  - `data` (Object, optional) - Chart data
  - `configuration` (Object, optional) - Chart configuration
- `isPublic` (Boolean, optional) - Dashboard visibility

**Validations:**
- "Please add a dashboard title"

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "_id": "dashboard_id",
    "user": "user_id",
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

### Get Dashboard by ID
**Endpoint:** `GET /api/dashboard/:id`

**Authentication:** Required for private dashboards (JWT Token)

**Validations:**
- "Dashboard not found"
- "Not authorized to access this dashboard" (if private and not owner)

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "_id": "dashboard_id",
    "user": {
      "_id": "user_id",
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

### Update Dashboard
**Endpoint:** `PUT /api/dashboard/:id`

**Authentication:** Required (JWT Token)

**Fields:**
- `title` (String, optional) - Dashboard title
- `description` (String, optional) - Dashboard description
- `charts` (Array, optional) - Array of chart objects
- `isPublic` (Boolean, optional) - Dashboard visibility

**Validations:**
- "Dashboard not found"
- "Not authorized to update this dashboard" (if not owner or admin)

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "_id": "dashboard_id",
    "user": "user_id",
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

**Notes:**
- Now updates lastUpdated timestamp automatically

### Delete Dashboard
**Endpoint:** `DELETE /api/dashboard/:id`

**Authentication:** Required (JWT Token)

**Validations:**
- "Dashboard not found"
- "Not authorized to delete this dashboard" (if not owner or admin)

**Response Success (200):**
```json
{
  "success": true,
  "data": {}
}
```

**Notes:**
- Now uses `deleteOne()` instead of deprecated `remove()`

## Excel File APIs

### Get User Excel Files
**Endpoint:** `GET /api/excel`

**Authentication:** Required (JWT Token)

**Response Success (200):**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "file_id",
      "user": "user_id",
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

**Notes:**
- Now files are sorted by uploadDate (newest first)

### Get Excel File by ID
**Endpoint:** `GET /api/excel/:id`

**Authentication:** Required (JWT Token)

**Validations:**
- "File not found"
- "Not authorized to access this file" (if not owner or admin)

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "_id": "file_id",
    "user": "user_id",
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

### Upload Excel File
**Endpoint:** `POST /api/excel/upload`

**Authentication:** Required (JWT Token)

**Content-Type:** `multipart/form-data`

**Fields:**
- `file` (File, required) - Excel file (.xlsx, .xls, or .csv)

**Validations:**
- "Please upload a file"
- "Invalid file type. Only Excel files are allowed."

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "_id": "file_id",
    "user": "user_id",
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

**Notes:**
- This endpoint now updates user's storageUsed field

### Delete Excel File
**Endpoint:** `DELETE /api/excel/:id`

**Authentication:** Required (JWT Token)

**Validations:**
- "File not found"
- "Not authorized to delete this file" (if not owner or admin)

**Response Success (200):**
```json
{
  "success": true,
  "data": {}
}
```

**Notes:**
- Now uses `findByIdAndDelete()` instead of deprecated methods
- Updates user's storageUsed field when file is deleted

### Analyze Excel File
**Endpoint:** `GET /api/excel/:id/analyze`

**Authentication:** Required (JWT Token)

**Query Parameters:**
- `sheet` (String, optional) - Sheet name, defaults to first sheet

**Validations:**
- "File not found"
- "Not authorized to access this file" (if not owner or admin)
- "File not found on disk"
- "Sheet not found in Excel file"

**Response Success (200):**
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

## Authentication Mechanism

The Excel Analytics Platform uses JSON Web Tokens (JWT) for authentication:

1. **Token Format:** `Authorization: Bearer <jwt_token>`
2. **Token Validity:** 24 hours (configurable)
3. **Token Payload:**
   - User ID
   - User Role (for authorization)
   - Expiration Time

### Authorization Middleware

Protected routes use middleware that:
1. Extracts the token from the Authorization header
2. Verifies the token signature and expiration
3. Loads the user from the database
4. Checks user role for admin-protected routes

**Updates to middleware:**
- Now properly handles the updated user model
- Includes role information in token for more efficient role-based access control
- Updates last login timestamp on authentication

### Authorization Error Messages

- "Not authorized to access this route" - Invalid or missing token
- "User role {role} is not authorized to access this route" - Insufficient privileges

## Error Response Format

All API errors follow this format:
```json
{
  "success": false,
  "error": "Error message here"
}
```

---
*This document outlines the available APIs, required fields, and validation messages for the Excel Analytics Platform. For implementation details, refer to the codebase.* 
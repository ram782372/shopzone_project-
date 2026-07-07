# High-Level Design (HLD) - Backend

This document provides a detailed overview of the backend architecture, flow, and design patterns for the **MERN Project**.

## 🚀 Tech Stack
- **Runtime**: [Node.js](https://nodejs.org/)
- **Web Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) (ODM: [Mongoose](https://mongoosejs.com/))
- **Authentication**: [JWT](https://jwt.io/) (JSON Web Tokens) & [Bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- **Email Service**: [Nodemailer](https://nodemailer.com/)
- **Media Storage**: [Cloudinary](https://cloudinary.com/)
- **Security**: [Express Rate Limit](https://www.npmjs.com/package/express-rate-limit), [Helmet](https://helmetjs.github.io/), [CORS](https://www.npmjs.com/package/cors)

---

## 📂 Project Structure
```bash
backend/
├── config/             # Database, Cloudinary, & Mail configurations
├── controllers/        # Business logic for each resource (Auth, Orders, Users)
├── middlewares/        # Security, Auth verification, & Error handling
├── models/             # Mongoose schemas (User, Order)
├── utils/              # Helper utilities (Cloudinary upload, Email, Custom Error)
├── app.js              # Express app initialization & Middleware stack
└── index.js            # Server entry point
```

---

## 🔄 System Flow (HLD)

### 1. Request Flow (Client to Server)
1. **Request**: Client sends an HTTP request to the server (e.g., `POST /api/auth/register`).
2. **Rate Limiting**: `express-rate-limit` checks if the IP has exceeded the allowed request count.
3. **Routing**: `app.js` delegates the request to the appropriate router (e.g., `authController`).
4. **Middleware**: If protected, `verifytoken.middleware.js` validates the JWT.
5. **Controller**: The logic in the controller processes the request (e.g., `registerController`).
6. **Model**: The controller interacts with MongoDB via Mongoose models.
7. **Response**: The controller sends a JSON response back to the client.

### 2. Authentication Flow
- **Registration**: User provides details → Password hashed via Bcrypt → User saved to DB.
- **Login**: Credentials verified → JWT generated → Token sent via HTTP-only cookie & response body.
- **Protected Routes**: Middleware extracts JWT from header → Verifies signature → Attaches `user` object to the `req`.

### 3. Order Processing Flow
1. User submits an order.
2. Server validates items and calculates total.
3. Order saved to DB status: `pending`.
4. Automated email sent to user via `Nodemailer`.
5. Admins can update status (e.g., `shipped`, `delivered`).

---

## 🛡️ Key Features & Security

### Error Handling
- **Centralized Error Handler**: A global `error.middleware.js` captures all thrown errors.
- **Standardized Response**: Uses a custom `ApiError` class for consistent status codes and messages.
- **Async Wrapper**: All controllers are wrapped in `asyncHandler` to eliminate the need for repeated `try-catch` blocks.

### Security Measures
- **Password Hashing**: Bcrypt with salt rounds for secure storage.
- **Rate Limiting**: Different limits for public routes vs. sensitive auth routes.
- **Environment Variables**: Sensitive keys (API secrets, Mongo URI) are managed via `.env`.
- **CORS**: Restricted access to allow only authorized frontend origins.

---

## 📡 API Architecture
The API follows a RESTful pattern with the following base mount points:
- `/api/auth`: Handles registration, login, and user management.
- `/api/orders`: Handles order lifecycle and administrative updates.
- `/health`: Simple endpoint to check server availability.

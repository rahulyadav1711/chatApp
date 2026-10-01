# 💬 ChatTalk — Real-Time MERN Chat Application

ChatTalk is a full-stack real-time chat application built with the **MERN stack**. It provides secure user authentication, one-to-one and group messaging, friend management, real-time communication, message status tracking, media sharing, and profile management.

The application combines **REST APIs** for persistent operations with **Socket.IO** for real-time communication between users.

## 📌 Project Overview

The goal of ChatTalk is to build a modern messaging platform where users can:
* Create an account and authenticate securely
* Verify their email using OTP
* Discover other users
* Send, accept, and reject friend requests
* Automatically create chats after accepting a friend request
* Exchange messages in real time
* Create and participate in group chats
* See online/offline user presence
* See typing indicators
* Track message delivery and read status
* Edit and delete messages
* Send images and voice messages
* Manage their profile and profile picture

The application uses **REST APIs for operations that require persistent data management** and **Socket.IO for real-time events**.

---

# ✨ Key Features

## 🔐 Authentication & Security

* User registration and login
* JWT-based authentication
* JWT stored using HTTP-only cookies
* Email OTP verification
* Password hashing using bcrypt
* Protected frontend routes
* Backend authentication middleware
* File upload validation

## 👤 User Management

* User profile management
* Edit profile information
* Profile picture upload
* Cloudinary media storage
* User discovery
* Online/offline presence

## 🤝 Friend Request System

* Discover available users
* Send friend requests
* Accept friend requests
* Reject friend requests
* Real-time friend request updates
* Automatic chat creation after accepting a request

## 💬 Messaging

* One-to-one messaging
* Group messaging
* Real-time message delivery
* Typing indicators
* Message replies
* Message editing
* Delete message for yourself
* Delete message for everyone
* Chat deletion
* Unread message counter

## 📩 Message Status

ChatTalk supports three message states:

| Status       | Meaning                               |
| ------------ | ------------------------------------- |
| ✓ Sent       | Message has been sent                 |
| ✓✓ Delivered | Message has reached the recipient     |
| ✓✓ Seen      | Recipient has opened/read the message |

## 🟢 Real-Time Features

Socket.IO is used for real-time communication including:

* New message delivery
* Online/offline presence
* Typing indicators
* Friend request notifications
* Friend request acceptance updates
* Message status updates
* Real-time UI synchronization

## 🎤 Media

* Image messages
* Voice messages
* Profile pictures
* Cloudinary-based media storage
* Multer for handling multipart uploads

## 🎨 User Experience

* Responsive React interface
* Dark/light theme
* Smooth animations
* Toast notifications
* Responsive chat interface
* Modern messaging UI

---

# 🏗️ System Architecture

```text
                         ┌─────────────────────┐
                         │    React Frontend   │
                         │   Vite + Tailwind   │
                         └──────────┬──────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     │                             │
                 REST APIs                    Socket.IO
                     │                             │
                     ▼                             ▼
            ┌─────────────────┐          ┌─────────────────┐
            │ Express Backend │          │ Socket.IO Server│
            │    Node.js      │          │ Real-Time Events│
            └────────┬────────┘          └────────┬────────┘
                     │                            │
                     └────────────┬───────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │     MongoDB      │
                         │    Mongoose      │
                         └──────────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │    Cloudinary    │
                         │  Media Storage   │
                         └──────────────────┘
```

### Communication Model

ChatTalk uses two communication approaches:

**REST API**

Used for operations such as:

* Authentication
* User management
* Friend requests
* Loading chats
* Loading message history
* Editing messages
* Deleting messages
* Updating persistent data

**Socket.IO**

Used when an event needs to be reflected in real time:

* Sending messages
* Typing indicators
* Online/offline status
* Friend request notifications
* Message status changes

---

# 🔄 Application Flow

## 1. Authentication Flow

```text
User
  │
  ▼
Signup/Login
  │
  ▼
Backend Authentication
  │
  ├── Password → bcrypt verification
  │
  ├── OTP → Email verification
  │
  ▼
JWT Generated
  │
  ▼
HTTP-Only Cookie
  │
  ▼
Authenticated User
```

Protected backend routes verify the authentication information before allowing access to protected resources.

---

# 🤝 Friend Request Flow

```text
User A
  │
  │ Send Friend Request
  ▼
POST /chats/request
  │
  ▼
Backend
  │
  ├── Validate users
  ├── Create/update request
  └── Notify User B through Socket.IO
  │
  ▼
User B receives request in real time
  │
  ├── Accept
  │     │
  │     ▼
  │   Chat created
  │
  └── Reject
        │
        ▼
      Request removed/rejected
```

This allows friend-request changes to appear without requiring a page refresh.

---

# 💬 Real-Time Messaging Flow

```text
User A
  │
  │ Sends message
  ▼
React Frontend
  │
  ├── REST API → Persist message
  │
  └── Socket.IO → Real-time event
                      │
                      ▼
                  User B
                      │
                      ▼
              Message appears
```

The database provides persistent message storage while Socket.IO provides real-time communication.

---

# 📩 Message Status Flow

```text
Message Created
      │
      ▼
    SENT
      │
      ▼
  DELIVERED
      │
      ▼
     SEEN
```

The application tracks the message state so users can determine whether a message has been sent, delivered, or seen.

---

# 🟢 Online / Offline Presence

Socket.IO maintains the real-time connection between the client and server.

When a user connects:

```text
User connects
      │
      ▼
Socket connection established
      │
      ▼
User registered with server
      │
      ▼
Online status updated
```

When the connection is closed, the application updates the user's presence accordingly.

---

# ⌨️ Typing Indicator

Typing indicators are handled through Socket.IO events.

```text
User starts typing
        │
        ▼
Socket.IO event
        │
        ▼
Recipient receives event
        │
        ▼
"User is typing..."
```

When the user stops typing, another event updates the recipient's interface.

---

# 🗂️ Project Structure

```text
ChatTalk/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controller/
│   │   ├── Db/
│   │   ├── middleware/
│   │   ├── model/
│   │   ├── routes/
│   │   ├── socket/
│   │   ├── utils/
│   │   └── app.js
│   │
│   ├── uploads/
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── layouts/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── socket/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── vite.config.js
│   ├── vercel.json
│   └── package.json
│
├── screenshots/
│
└── README.md
```

---

# 📡 REST API Overview

## Authentication

```http
POST /auth/signup
POST /auth/login
POST /auth/verify-otp
PUT  /auth/profile
```

## Chats & Friend Requests

```http
GET    /chats
POST   /chats/request
PUT    /chats/accept/:id
DELETE /chats/reject/:id
```

## Messages

```http
POST  /messages/send
GET   /messages/:chatId
PATCH /messages/edit/:id
PATCH /messages/delete/:id
PUT   /messages/seen/:id
```

> The API list above represents the main REST endpoints of the application. Additional internal routes/events may exist in the implementation.

---

# 🛠️ Tech Stack

## Frontend

* React.js
* Vite
* Tailwind CSS
* Axios
* React Context API
* Socket.IO Client
* Framer Motion
* React Hot Toast
* Lucide React

## Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* Socket.IO
* JWT
* bcrypt
* Multer
* Cloudinary
* Resend Email API

## Development Tools

* Git
* GitHub
* VS Code
* Postman
* Vercel

---

# 🗄️ Data Storage

MongoDB is used as the primary database.

The application uses Mongoose models to manage application data such as:

* Users
* Chats
* Messages
* Friend-request related information
* Group chat information

The database is responsible for persistent storage, while Socket.IO handles real-time communication between connected clients.

---

# ☁️ Media Upload Architecture

Media files such as images and profile pictures are handled using **Multer** and stored using **Cloudinary**.

```text
Client
  │
  │ Multipart Upload
  ▼
Multer
  │
  ▼
Backend
  │
  ▼
Cloudinary
  │
  ▼
Media URL
  │
  ▼
MongoDB / Application Data
```

This separates media storage from the application's main database.

---

# 🔒 Security

ChatTalk implements several security-related mechanisms:

* JWT authentication
* HTTP-only cookies
* Password hashing with bcrypt
* Protected backend routes
* Protected frontend routes
* Email OTP verification
* File upload validation
* Cloudinary-based media storage

Sensitive credentials and configuration values are supplied through environment variables rather than being hard-coded into the application.

---

# 🚀 Installation & Setup

## 1. Clone the Repository

```bash
git clone https://github.com/himanshushe06/chatApp.git
cd chatApp
```

---

## 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the backend directory:

```env
PORT=4000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=your_email
```

Start the backend:

```bash
npm run dev
```

---

## 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:4000/api
```

Start the frontend:

```bash
npm run dev
```

The application should now be available through the Vite development server.

---


# 🎯 Key Technical Concepts Demonstrated

This project demonstrates practical experience with:

* Full-stack web development
* REST API development
* Authentication and authorization
* JWT
* HTTP-only cookies
* Password hashing
* MongoDB and Mongoose
* MVC-style backend organization
* WebSocket-based real-time communication
* Socket.IO
* Event-driven communication
* React Context API
* Asynchronous JavaScript
* File uploads
* Cloudinary integration
* Real-time state synchronization
* API testing with Postman
* Git/GitHub workflow
* Deployment with Vercel

---

# 🧩 Challenges & Learning

Some of the key engineering challenges involved in the project include:

### Real-Time State Synchronization

Keeping both users' interfaces synchronized when messages, friend requests, typing states, and presence information change.

### Message Status

Managing the transition between:

```text
Sent → Delivered → Seen
```

while keeping the UI and backend state synchronized.

### Friend Requests

Handling request creation, acceptance, rejection, and automatic chat creation while updating the UI in real time.

### Media Uploads

Handling multipart file uploads and integrating external media storage through Cloudinary.

### Application Structure

Separating frontend components, services, backend controllers, routes, models, middleware, and Socket.IO logic to keep the project maintainable.

---

# 🔮 Future Improvements

Potential future improvements include:

* Video calling
* Voice calling
* Screen sharing
* Push notifications
* Message search
* Message reactions
* Message forwarding
* AI-powered chat assistant
* Mobile application

---

# 👨‍💻 Author

**Himanshu Shekhar**

* GitHub: https://github.com/himanshushe06
* LinkedIn: https://www.linkedin.com/in/himanshu0602/

---

# ⭐ Project

If you find ChatTalk useful, consider giving the repository a star.

# 📚 Library Management System

A full-stack MERN (MongoDB, Express, React, Node.js) library management system with QR-based registration/login, live visitor tracking, book inventory management, and **automatic book check-in/check-out via live webcam barcode scanning + OCR**.

## ✨ Features

- **QR-Based Registration** — Static QR code leads to registration page (name, department, position, enrollment number)
- **QR-Based Login** — Second QR code leads to login; shows "Welcome, [Name]!" + live library visitor count
- **Live Visitor Tracking** — Real-time count of people currently in the library
- **Book Inventory** — Searchable catalog with genre/availability filters
- **📷 Live Book Scanner** — Hold a book in front of the camera for instant check-in/check-out:
  - **Barcode scanning** (primary) — Detects ISBN barcodes instantly using html5-qrcode
  - **OCR text recognition** (fallback) — Reads book titles using Tesseract.js
  - Auto-detects borrow vs return based on user's current transactions
- **Admin Panel** — Manage books, users, generate printable QR codes, view statistics
- **Dashboard** — Live stats with auto-refreshing visitor count

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT (JSON Web Tokens) |
| Barcode Scanning | html5-qrcode |
| Text Recognition | Tesseract.js |
| QR Generation | qrcode.react |
| Icons | lucide-react |
| Notifications | react-hot-toast |

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ — [Download](https://nodejs.org/)
- **MongoDB** — Local install or [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier)

### 1. Clone / Navigate to the project

```bash
cd library-management-system
```

### 2. Setup the Backend

```bash
cd server

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Start the server
npm run dev
```

The server starts on **http://localhost:5000**

### 3. Setup the Frontend

```bash
cd client

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The client starts on **http://localhost:5173**

### 4. Open in Browser

- **Registration**: http://localhost:5173/register
- **Login**: http://localhost:5173/login

## 📱 QR Codes

Go to the **Admin Panel** (`/admin`) → **QR Codes** tab to generate and print:
- **QR Code 1**: Links to `/register` — Place at library entrance for new user registration
- **QR Code 2**: Links to `/login` — Place at library entrance for daily check-in

## 📷 How Book Scanning Works

1. Navigate to the **Scanner** page (`/scan`)
2. Allow camera access when prompted
3. Hold a book's barcode in front of the camera
4. The system automatically:
   - Detects the ISBN barcode
   - Looks up the book in the database
   - If you have it borrowed → **auto-returns** it
   - If it's available → **auto-borrows** it
   - Plays a beep sound + shows visual confirmation
5. **No barcode?** Click "Try text recognition" to use OCR on the book cover

## 📁 Project Structure

```
library-management-system/
├── server/
│   ├── config/db.js              # MongoDB connection
│   ├── middleware/auth.js         # JWT auth middleware
│   ├── models/
│   │   ├── User.js               # User schema
│   │   ├── Book.js               # Book schema
│   │   ├── LibrarySession.js     # Library visit sessions
│   │   └── BookTransaction.js    # Book borrow/return records
│   ├── routes/
│   │   ├── auth.js               # Register, login, profile
│   │   ├── books.js              # Book CRUD + ISBN lookup
│   │   ├── sessions.js           # Library check-in/out + live count
│   │   ├── transactions.js       # Borrow, return, auto-detect
│   │   └── stats.js              # Dashboard statistics
│   ├── server.js                 # Express entry point
│   ├── .env                      # Environment variables
│   └── package.json
├── client/
│   ├── src/
│   │   ├── context/AuthContext.jsx   # Auth state management
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Navigation bar
│   │   │   ├── ProtectedRoute.jsx    # Route guard
│   │   │   └── BookCard.jsx          # Book display card
│   │   ├── pages/
│   │   │   ├── Register.jsx          # Registration form
│   │   │   ├── Login.jsx             # Login + welcome screen
│   │   │   ├── Dashboard.jsx         # Stats dashboard
│   │   │   ├── BookInventory.jsx     # Book catalog
│   │   │   ├── BookScanner.jsx       # Live barcode/OCR scanner
│   │   │   └── AdminPanel.jsx        # Admin management panel
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login by enrollment number |
| GET | `/api/auth/me` | Get current user profile |

### Library Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions/checkin` | Check into library |
| POST | `/api/sessions/checkout` | Leave library |
| GET | `/api/sessions/active-count` | People currently in library |
| GET | `/api/sessions/my-status` | Your current session status |

### Books
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/books` | List books (search with `?search=`) |
| GET | `/api/books/isbn/:isbn` | Lookup by ISBN |
| POST | `/api/books` | Add book (admin) |
| PUT | `/api/books/:id` | Update book (admin) |
| DELETE | `/api/books/:id` | Delete book (admin) |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transactions/auto` | ⭐ Auto borrow/return by ISBN |
| POST | `/api/transactions/borrow` | Borrow a book |
| POST | `/api/transactions/return` | Return a book |
| GET | `/api/transactions/my-books` | Your borrowed books |
| GET | `/api/transactions/history` | Your full history |

### Stats
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Dashboard statistics |

## 📄 License

MIT

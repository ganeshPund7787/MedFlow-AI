# 🏥 MedFlow AI

> AI-Powered Real-Time Hospital Management System built with React, Express, Bun, MongoDB, Better Auth, Socket.IO, Gemini AI, Inngest, and Polar.

MedFlow AI is a modern hospital management platform designed to streamline patient care, hospital operations, billing, diagnostics, and communication through real-time updates and AI-powered automation.

---

## ✨ Features

### 👤 Authentication & Authorization

- Secure authentication with Better Auth
- Session-based authentication
- Role-Based Access Control (RBAC)
- Protected routes and APIs

### 🏥 Hospital Management

- Patient Management
- Doctor Management
- Nurse Management
- Appointment Scheduling
- Medical Records
- Prescription Management
- Inventory & Pharmacy Management
- Billing & Payments

### 🤖 AI Features

- AI Patient Triage
- AI Medical Assistant
- AI X-Ray Analysis
- AI Report Summarization
- Smart Medical Insights
- Automated Recommendations

### ⚡ Real-Time Features

- Live Notifications
- Real-Time Appointment Updates
- Live Patient Status Tracking
- Socket.IO Powered Events
- Instant Dashboard Updates

### 💳 Billing & Payments

- Polar Payment Integration
- Invoice Generation
- Billing History
- Payment Tracking
- Revenue Analytics

### 📊 Analytics Dashboard

- Patient Statistics
- Revenue Metrics
- Appointment Analytics
- System Monitoring
- Operational Reports

---

## 🛠️ Tech Stack

### Frontend

- React 19
- React Router 7
- TypeScript
- Tailwind CSS
- Shadcn UI
- React Query
- React Hook Form
- Zod

### Backend

- Express 5
- Bun Runtime
- TypeScript
- MongoDB
- Mongoose
- Better Auth
- Socket.IO
- Inngest

### AI

- Google Gemini AI

### Storage & Uploads

- UploadThing

### Payments

- Polar

---

## 📂 Project Structure

```text
medflow-ai/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── routes/
│   ├── hooks/
│   ├── lib/
│   └── services/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── sockets/
│   │   ├── inngest/
│   │   └── utils/
│
├── shared/
├── docs/
└── README.md
```

---

## 🔐 User Roles

| Role           | Access                       |
| -------------- | ---------------------------- |
| Admin          | Full System Access           |
| Doctor         | Patient Care & Prescriptions |
| Nurse          | Patient Monitoring           |
| Patient        | Personal Records & Payments  |
| Lab Technician | Lab Reports & Diagnostics    |
| Pharmacist     | Inventory & Prescriptions    |

---

## 🚀 Getting Started

### Prerequisites

- Bun
- MongoDB
- Git

### Clone Repository

```bash
git clone https://github.com/your-username/medflow-ai.git

cd medflow-ai
```

### Install Dependencies

```bash
bun install
```

### Configure Environment

Create:

```bash
backend/.env
frontend/.env
```

Example:

```env
# Database
MONGODB_URI=

# Better Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# Gemini
GEMINI_KEY=
GEMINI_MODEL=gemini-2.5-flash

# UploadThing
UPLOADTHING_TOKEN=

# Polar
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=

# Client
CLIENT_URL=http://localhost:5173
```

### Start Development

Backend

```bash
cd backend
bun run dev
```

Frontend

```bash
cd frontend
bun run dev
```

---

## 📸 Core Modules

### Administration

- User Management
- Roles & Permissions
- Billing Configuration
- Hospital Settings

### Clinical Operations

- Patient Records
- Medical History
- Prescriptions
- Lab Reports
- X-Ray Analysis

### Financial Management

- Billing
- Payments
- Invoices
- Revenue Tracking

### AI Services

- Triage
- Diagnostics
- Report Analysis
- Medical Assistant

---

## 🔄 Real-Time Architecture

```text
Client
   │
Socket.IO
   │
Express Server
   │
MongoDB
   │
Inngest Jobs
   │
Gemini AI
```

---

## 📈 Future Roadmap

- Telemedicine
- Video Consultations
- Multi-Hospital Support
- Insurance Management
- AI Voice Assistant
- Mobile Applications
- Advanced Analytics

---

## 🤝 Contributing

1. Fork Repository
2. Create Feature Branch
3. Commit Changes
4. Push Branch
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Ganesh Pund**

AI & Full Stack Developer

Building intelligent healthcare solutions with modern web technologies and artificial intelligence.

---

⭐ If you found this project useful, consider giving it a star.

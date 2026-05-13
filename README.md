# TaskFlow — Team Task Manager

A full-stack team task management application with role-based access control (RBAC), Kanban board, and real-time dashboard — built with **Node.js**, **Express**, **MongoDB**, and **Mongoose**.

> **Live Demo**: [Deployed on Railway](#) _(update with your Railway URL after deployment)_

---

## 🔐 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@test.com` | `test123456` |
| **Member** | `user@test.com` | `user123456` |

> Admin can manage projects, members, and all tasks. Member can only manage their own assigned tasks.

---

## ✨ Features

- **Authentication** — Signup & Login with JWT tokens + bcrypt password hashing
- **Project Management** — Create, update, delete projects with team collaboration
- **Team Management** — Add/remove members by email, assign Admin or Member roles
- **Kanban Task Board** — Drag-free task tracking across TODO → In Progress → Done
- **Task Assignment** — Assign tasks to members with priority (Low/Medium/High) and due dates
- **Dashboard** — Real-time overview with task stats, overdue alerts, and recent projects
- **Role-Based Access Control** — Admins manage everything; Members manage only their tasks
- **Input Validation** — Server-side validation on all endpoints with meaningful error messages
- **Responsive UI** — Clean dark-themed interface that works on desktop and mobile

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Vanilla JS SPA)                │
│                                                             │
│   index.html ──▶ app.js (Hash Router)                      │
│                    ├── auth.js      (Login / Signup)        │
│                    ├── dashboard.js (Stats & Overview)      │
│                    ├── projects.js  (Project & Members)     │
│                    └── tasks.js     (Kanban Board)          │
│                                                             │
│   api.js ── Fetch wrapper with JWT token injection          │
│   styles.css ── Design system (CSS variables, dark theme)   │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API + JWT
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Express.js)                     │
│                                                             │
│   server.js ──▶ Middleware Chain:                          │
│                  1. authMiddleware (JWT verify)             │
│                  2. projectMemberMiddleware (membership)    │
│                  3. roleMiddleware (ADMIN / MEMBER)         │
│                                                             │
│   Routes:                                                   │
│     /api/auth       ── Signup, Login, Profile               │
│     /api/projects   ── Project CRUD                         │
│     /api/projects/:id/members ── Team management            │
│     /api/projects/:id/tasks   ── Task CRUD + filters        │
│     /api/dashboard  ── Aggregated stats                     │
│                                                             │
│   Models (Mongoose):                                        │
│     User ──┐                                                │
│             ├── ProjectMember (role: ADMIN | MEMBER)        │
│     Project ┘         │                                     │
│                       └── Task (status, priority, assignee) │
└──────────────────────────┬──────────────────────────────────┘
                           │ Mongoose ODM
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB Atlas (Cloud)                    │
│                                                             │
│   Collections: users, projects, projectmembers, tasks       │
│   Indexes: project+status, assignee+status, unique email    │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow

```
Client Request
  → Express Router
    → authMiddleware (verify JWT token)
      → projectMemberMiddleware (check user is project member)
        → roleMiddleware (check ADMIN/MEMBER role)
          → Route Handler (business logic)
            → Mongoose Query (MongoDB)
              → JSON Response
```

### RBAC Flow

```
User Action ──▶ Authenticated? ──No──▶ 401 Unauthorized
                     │ Yes
                     ▼
              Project Member? ──No──▶ 403 Forbidden
                     │ Yes
                     ▼
              Action Type?
              ├── Read / Create Task ──▶ ✅ Allow (any member)
              ├── Update Task ──▶ Own task? ──Yes──▶ ✅ Allow
              │                           ──No───▶ Is Admin? ──Yes──▶ ✅ Allow
              │                                                ──No───▶ 403
              └── Delete Task / Manage Members ──▶ Is Admin? ──Yes──▶ ✅ Allow
                                                              ──No───▶ 403
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js | Server-side JavaScript |
| **Framework** | Express.js v5 | REST API & static file serving |
| **Database** | MongoDB Atlas | Cloud-hosted NoSQL database |
| **ODM** | Mongoose | Schema validation & query building |
| **Auth** | JWT + bcrypt | Stateless authentication |
| **Frontend** | Vanilla HTML/CSS/JS | Single Page Application (hash routing) |
| **Deployment** | Railway | Cloud hosting with auto-deploy |

---

## 📁 Project Structure

```
├── src/
│   ├── server.js                 # Express entry point
│   ├── config/
│   │   └── db.js                 # MongoDB connection (Google DNS fix)
│   ├── middleware/
│   │   ├── auth.js               # JWT verification middleware
│   │   ├── projectAccess.js      # Membership & role-based access
│   │   └── validate.js           # Input validation helpers
│   ├── models/
│   │   ├── User.js               # User schema (email, passwordHash)
│   │   ├── Project.js            # Project schema (name, description)
│   │   ├── ProjectMember.js      # Junction table (user, project, role)
│   │   └── Task.js               # Task schema (title, status, priority)
│   └── routes/
│       ├── auth.js               # POST /signup, /login, GET /me
│       ├── projects.js           # CRUD /api/projects
│       ├── members.js            # CRUD /api/projects/:id/members
│       ├── tasks.js              # CRUD /api/projects/:id/tasks
│       └── dashboard.js          # GET /api/dashboard
├── public/
│   ├── index.html                # SPA shell + navigation
│   ├── css/styles.css            # Design system (dark theme)
│   └── js/
│       ├── api.js                # Fetch wrapper with JWT
│       ├── app.js                # Hash router + utilities
│       ├── auth.js               # Login/Signup UI
│       ├── dashboard.js          # Dashboard UI
│       ├── projects.js           # Projects & members UI
│       └── tasks.js              # Kanban board UI
├── .env                          # Environment variables
├── .env.example                  # Template for env vars
├── .gitignore
├── package.json
├── railway.json                  # Railway deployment config
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **MongoDB Atlas** account (free tier) — [mongodb.com/atlas](https://www.mongodb.com/atlas)

### Installation

```bash
# Clone the repository
git clone https://github.com/sspabhishek/team-task-manager.git
cd team-task-manager

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

### Environment Variables

```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/taskmanager
JWT_SECRET=your-super-secret-jwt-key
PORT=3000
```

### Run Locally

```bash
npm run dev
# Server starts at http://localhost:3000
```

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/signup` | Create account | ❌ |
| POST | `/api/auth/login` | Login & get token | ❌ |
| GET | `/api/auth/me` | Get current user | ✅ |

### Projects
| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/projects` | List my projects | ✅ | Any |
| POST | `/api/projects` | Create project | ✅ | Any |
| GET | `/api/projects/:id` | Get project detail | ✅ | Member |
| PUT | `/api/projects/:id` | Update project | ✅ | Admin |
| DELETE | `/api/projects/:id` | Delete project | ✅ | Admin |

### Members
| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/projects/:id/members` | List members | ✅ | Member |
| POST | `/api/projects/:id/members` | Add member | ✅ | Admin |
| PUT | `/api/projects/:id/members/:mid` | Change role | ✅ | Admin |
| DELETE | `/api/projects/:id/members/:mid` | Remove member | ✅ | Admin |

### Tasks
| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/projects/:id/tasks` | List tasks (filterable) | ✅ | Member |
| POST | `/api/projects/:id/tasks` | Create task | ✅ | Member |
| GET | `/api/projects/:id/tasks/:tid` | Get task detail | ✅ | Member |
| PUT | `/api/projects/:id/tasks/:tid` | Update task | ✅ | Owner/Admin |
| DELETE | `/api/projects/:id/tasks/:tid` | Delete task | ✅ | Admin |

### Dashboard
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/dashboard` | Aggregated stats | ✅ |


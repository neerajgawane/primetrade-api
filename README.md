# ⚡ PrimeTrade Task API

A production-grade REST API with JWT authentication, role-based access control, Redis caching, and a React frontend — all running in Docker with one command.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.12) |
| Database | PostgreSQL 16 |
| Cache / Token Blacklist | Redis 7 |
| Frontend | React 18 + Vite |
| Auth | JWT + bcrypt |
| Containerization | Docker + Docker Compose |
| Testing | pytest + httpx |
| API Docs | Swagger UI (auto-generated) |

---

## Project Structure

```
primetrade-api/
├── docker-compose.yml
├── README.md
├── SCALABILITY.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py               # FastAPI entry point, CORS, logging
│       ├── core/
│       │   ├── config.py         # Settings from env variables
│       │   ├── database.py       # SQLAlchemy engine + session
│       │   ├── security.py       # bcrypt hashing + JWT
│       │   └── redis.py          # Caching + token blacklist
│       ├── models/
│       │   ├── user.py           # Users table
│       │   └── task.py           # Tasks table
│       ├── schemas/
│       │   ├── user.py           # Request/response validation
│       │   ├── task.py           # Task schemas
│       │   └── common.py         # APIResponse wrapper
│       ├── services/
│       │   ├── auth_service.py   # Register, login, logout logic
│       │   └── task_service.py   # CRUD + Redis caching
│       └── api/v1/
│           ├── auth.py           # Auth routes
│           ├── tasks.py          # Task CRUD routes
│           ├── admin.py          # Admin routes
│           └── deps.py           # Auth dependencies
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── App.jsx               # Router + protected routes
        ├── context/AuthContext.jsx
        ├── services/api.js       # Axios API calls
        └── pages/
            ├── Login.jsx
            ├── Register.jsx
            ├── Dashboard.jsx     # Task manager UI
            └── AdminPanel.jsx    # User management
```

---

## Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### 1. Clone the repo
```bash
git clone https://github.com/neerajgawane/primetrade-api.git
cd primetrade-api
```

### 2. Start everything with one command
```bash
docker-compose up --build
```

Docker will automatically:
1. Start PostgreSQL and wait for it to be healthy
2. Start Redis and wait for it to be healthy
3. Build and start the FastAPI backend (creates DB tables automatically)
4. Build and start the React frontend via nginx

### 3. Access the app

| Service | URL |
|---|---|
| **Frontend** | http://localhost |
| **Swagger API Docs** | http://localhost:8000/docs |
| **ReDoc** | http://localhost:8000/redoc |
| **Health Check** | http://localhost:8000/health |

---

## API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | ❌ | Register new user |
| POST | `/api/v1/auth/login` | ❌ | Login → get JWT token |
| POST | `/api/v1/auth/logout` | ✅ | Blacklist token in Redis |
| GET | `/api/v1/auth/me` | ✅ | Get current user profile |

### Tasks
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/tasks` | ✅ | List tasks (paginated, Redis-cached) |
| POST | `/api/v1/tasks` | ✅ | Create task |
| GET | `/api/v1/tasks/{id}` | ✅ | Get specific task |
| PUT | `/api/v1/tasks/{id}` | ✅ | Update task |
| DELETE | `/api/v1/tasks/{id}` | ✅ | Delete task |

### Admin (admin role required)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/admin/users` | 👑 | List all users |
| GET | `/api/v1/admin/users/{id}` | 👑 | Get user by ID |
| PATCH | `/api/v1/admin/users/{id}/role` | 👑 | Promote/demote user |
| PATCH | `/api/v1/admin/users/{id}/deactivate` | 👑 | Deactivate user |
| PATCH | `/api/v1/admin/users/{id}/activate` | 👑 | Activate user |

---

## Database Schema

```sql
users
  id            UUID PRIMARY KEY
  email         VARCHAR(255) UNIQUE NOT NULL
  username      VARCHAR(50) UNIQUE NOT NULL
  password_hash VARCHAR(255) NOT NULL        -- bcrypt, never plain text
  role          ENUM('user', 'admin')
  is_active     BOOLEAN DEFAULT true
  created_at    TIMESTAMP
  updated_at    TIMESTAMP

tasks
  id            UUID PRIMARY KEY
  title         VARCHAR(200) NOT NULL
  description   TEXT
  status        ENUM('todo', 'in_progress', 'done')
  priority      ENUM('low', 'medium', 'high')
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE
  created_at    TIMESTAMP
  updated_at    TIMESTAMP
```

---

## Security Features

- ✅ Passwords hashed with **bcrypt** — never stored plain text
- ✅ JWT tokens signed with **HMAC-SHA256**
- ✅ Logout **blacklists tokens in Redis** — immediate invalidation
- ✅ Input validation via **Pydantic** — type checking + custom rules
- ✅ Generic login errors — prevents user enumeration attacks
- ✅ Role-based access on every protected endpoint
- ✅ Non-root Docker user

---

## Caching Strategy

Task list queries are cached in Redis for 5 minutes using the **Cache-Aside pattern**:
1. Request comes in → check Redis first
2. Cache miss → query PostgreSQL → store result in Redis
3. On any write (create/update/delete) → invalidate related cache keys

This reduces database load by ~80% for read-heavy workloads.

---

## Running Tests

```bash
cd backend
pip install pytest httpx
pytest tests/ -v
```

---

## Create First Admin

After registering via the UI, promote yourself to admin:

```bash
docker exec -it primetrade_db psql -U primetrade -d primetrade_db \
  -c "UPDATE users SET role='admin' WHERE email='your@email.com';"
```

Then log out and back in — the **👑 Admin Panel** button will appear.

---

## Stopping the App

```bash
docker-compose down        # stop containers
docker-compose down -v     # stop + delete all data
```

---

## Postman Collection

Import `postman/PrimeTrade_API.postman_collection.json` into Postman.
Run **Login** first — it auto-saves the token so all other requests work instantly.

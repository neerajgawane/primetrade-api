# 💸 PrimePay — Freelancer Invoice & Payments Platform

A production-grade SaaS API for Indian freelancers to manage clients, track time, auto-generate invoices, and collect payments via Razorpay.

![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)

---

## 🎯 Features

| Feature | Description |
|:---|:---|
| **JWT Authentication** | Register/login with Redis-backed token blacklisting |
| **Client Management** | CRUD with multi-tenant data isolation |
| **Time Tracking** | Server-side start/stop timer with automatic status transitions |
| **Auto-Invoicing** | Invoice auto-generated on task completion (if client + rate set) |
| **Razorpay Payments** | Order creation, checkout popup, HMAC webhook verification |
| **Redis Caching** | 5-minute cache with automatic invalidation on mutations |
| **Alembic Migrations** | Versioned database schema management |
| **Admin Panel** | Role-based access control for admin users |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│         Dashboard · Tasks · Clients · Invoices       │
│              Payment Page (public, no auth)           │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP / REST
┌───────────────────────▼─────────────────────────────┐
│                  FastAPI Backend                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Auth API │  │ CRUD API │  │ Payment Gateway  │   │
│  │ (JWT)    │  │ (Tasks,  │  │ (Razorpay REST)  │   │
│  │          │  │ Clients) │  │ + HMAC Webhooks  │   │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│       │              │                 │             │
│  ┌────▼──────────────▼─────────────────▼─────────┐   │
│  │           Service Layer (Business Logic)       │   │
│  │  Auto-invoicing · Timer · Cache Invalidation   │   │
│  └────────────────────┬──────────────────────────┘   │
└───────────────────────┼─────────────────────────────┘
           ┌────────────┼────────────┐
     ┌─────▼─────┐           ┌──────▼──────┐
     │ PostgreSQL │           │    Redis    │
     │   (Data)   │           │  (Cache +   │
     │  Port 5433 │           │  Blacklist) │
     │            │           │  Port 6379  │
     └────────────┘           └─────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose

### 1. Clone & Configure

```bash
git clone https://github.com/your-username/primetrade-api.git
cd primetrade-api
cp backend/.env.example backend/.env
# Edit backend/.env with your Razorpay keys (optional for dev)
```

### 2. Start Everything

```bash
docker-compose up -d
```

This starts:
| Service | Port | Description |
|:---|:---|:---|
| **Frontend** | `http://localhost` | React dashboard |
| **API** | `http://localhost:8000` | FastAPI backend |
| **API Docs** | `http://localhost:8000/docs` | Swagger UI |
| **PostgreSQL** | `localhost:5433` | Database |
| **Redis** | `localhost:6379` | Cache & token store |

### 3. Create Your Account

Visit `http://localhost` → Register → Login → Start using!

---

## 🔑 Environment Variables

| Variable | Required | Description |
|:---|:---|:---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `SECRET_KEY` | ✅ | JWT signing secret (min 32 chars) |
| `ALGORITHM` | ❌ | JWT algorithm (default: HS256) |
| `RAZORPAY_KEY_ID` | ⚡ | Razorpay API Key ID |
| `RAZORPAY_KEY_SECRET` | ⚡ | Razorpay API Secret |
| `RAZORPAY_WEBHOOK_SECRET` | ⚡ | Webhook signature verification |

⚡ = Required for payment features only

---

## 📋 API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| POST | `/api/v1/auth/register` | ❌ | Create account |
| POST | `/api/v1/auth/login` | ❌ | Get JWT token |
| POST | `/api/v1/auth/logout` | ✅ | Blacklist token |

### Clients
| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| GET | `/api/v1/clients/` | ✅ | List clients (paginated) |
| POST | `/api/v1/clients/` | ✅ | Create client |
| PUT | `/api/v1/clients/{id}` | ✅ | Update client |
| DELETE | `/api/v1/clients/{id}` | ✅ | Delete client |

### Tasks
| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| GET | `/api/v1/tasks/` | ✅ | List tasks (paginated) |
| POST | `/api/v1/tasks/` | ✅ | Create task |
| POST | `/api/v1/tasks/{id}/start` | ✅ | Start timer |
| POST | `/api/v1/tasks/{id}/stop` | ✅ | Stop timer |
| POST | `/api/v1/tasks/{id}/complete` | ✅ | Complete & auto-invoice |

### Invoices
| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| GET | `/api/v1/invoices/` | ✅ | List invoices |
| GET | `/api/v1/invoices/{id}/public` | ❌ | Public invoice view |

### Payments
| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| POST | `/api/v1/payments/create-order/{id}` | ❌ | Create Razorpay order |
| POST | `/api/v1/payments/webhook` | ❌ | Razorpay webhook (HMAC) |

---

## 🧪 Running Tests

```bash
docker exec primepay_api pytest tests/ -v
```

---

## 🔒 Security

- **Passwords**: Hashed with bcrypt (via Passlib)
- **JWT**: Tokens with configurable expiry + Redis blacklisting on logout
- **Webhooks**: HMAC-SHA256 signature verification on raw request bytes
- **Multi-tenancy**: All queries scoped to `user_id` at service layer
- **Financial data**: Amounts stored as integers (paise) to prevent float errors

---

## 📁 Project Structure

```
primetrade-api/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Route handlers
│   │   ├── core/            # Config, DB, Redis, Security
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   └── services/        # Business logic layer
│   ├── alembic/             # Database migrations
│   ├── tests/               # Pytest test suite
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/           # Dashboard, Tasks, Invoices, etc.
│   │   ├── components/      # Layout, shared components
│   │   ├── services/        # API client (Axios)
│   │   └── context/         # Auth context
│   └── Dockerfile
└── docker-compose.yml
```

---

## 📝 License

MIT © 2026

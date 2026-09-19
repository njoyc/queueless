# QueueLess

QueueLess is a full-stack queue and appointment management platform for service-based organizations.

It allows customers to browse available services, book appointments, join real-time service queues, receive queue tokens, and track their queue position. Staff members can manage appointments and operate active queues through a dedicated dashboard.

The application combines REST APIs with WebSockets to provide real-time queue updates.

---

## Features

### Customer

- User registration and login
- JWT-based authentication
- Browse available services
- Book appointments
- Appointment conflict detection
- Cancel appointments
- Join service queues
- Receive queue tokens
- View current queue position
- View currently served token
- Real-time queue updates through WebSockets
- Responsive customer interface

### Staff

- Staff dashboard
- View customer appointments
- Complete appointments
- View active queues
- Call the next customer
- Complete the currently serving queue entry
- Real-time queue state propagation to connected customers

### Authentication & Authorization

- JWT authentication
- Argon2 password hashing
- Role-based access control
- Customer, Staff, and Admin roles
- Backend authorization for privileged operations
- Public registration creates customer accounts only
- Staff/Admin roles are provisioned separately

---

## Architecture

```text
                         QueueLess
                            │
              ┌─────────────┴─────────────┐
              │                           │
          React/Vite                  WebSocket
              │                           │
            Axios                         │
              │                           │
              └─────────────┬─────────────┘
                            │
                            ▼
                    FastAPI / Uvicorn
                            │
              ┌─────────────┼─────────────┐
              │             │             │
            Auth       Appointments      Queue
              │             │             │
              └─────────────┼─────────────┘
                            │
                            ▼
                       SQLAlchemy
                            │
                            ▼
                       PostgreSQL
```

The frontend communicates with the backend through REST APIs for normal application operations.

The queue system additionally uses a persistent WebSocket connection so queue state changes can be pushed to connected customers without requiring a page refresh.

---

## Tech Stack

### Frontend

- React
- Vite
- JavaScript / JSX
- Axios
- CSS

### Backend

- Python
- FastAPI
- Uvicorn
- Pydantic

### Database

- PostgreSQL

### ORM

- SQLAlchemy

### Authentication & Security

- JWT
- Argon2
- pwdlib
- Role-Based Access Control

### Real-Time Communication

- WebSockets

### Development

- Git
- GitHub
- Python virtual environment

---

## Project Structure

```text
queueless/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── organizations.py
│   │   │   ├── services.py
│   │   │   ├── appointments.py
│   │   │   └── queue.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   ├── dependencies.py
│   │   │   └── websocket_manager.py
│   │   ├── db/
│   │   │   ├── database.py
│   │   │   └── models.py
│   │   ├── schemas/
│   │   │   ├── organization.py
│   │   │   ├── user.py
│   │   │   ├── service.py
│   │   │   ├── appointment.py
│   │   │   └── queue.py
│   │   └── main.py
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── CustomerDashboard.jsx
    │   │   ├── Services.jsx
    │   │   ├── QueuePage.jsx
    │   │   ├── StaffDashboard.jsx
    │   │   └── Appointments.jsx
    │   ├── services/
    │   │   └── api.js
    │   ├── App.jsx
    │   ├── App.css
    │   ├── index.css
    │   └── main.jsx
    └── package.json
```

> `.env` contains local secrets and is excluded from version control.

---

## Database Design

QueueLess currently uses five core entities:

```text
Organization
     │
     └── Service
           │
           ├── Appointment
           └── QueueEntry

User
 ├── Appointment
 └── QueueEntry
```

### User

Stores:

- ID
- Name
- Email
- Password hash
- Role
- Creation timestamp

Roles:

```text
CUSTOMER
STAFF
ADMIN
```

The email field is unique and indexed.

### Organization

Stores:

- ID
- Name
- Description
- Creation timestamp

An organization can provide multiple services.

### Service

Stores:

- ID
- Organization ID
- Name
- Description
- Duration
- Price
- Active status
- Creation timestamp

Services are soft-deleted by setting `active = false` instead of physically removing the database record.

### Appointment

Stores:

- ID
- User ID
- Service ID
- Start time
- End time
- Status
- Creation timestamp

Appointment states:

```text
BOOKED
CANCELLED
COMPLETED
```

### Queue Entry

Stores:

- ID
- Service ID
- User ID
- Token number
- Status
- Joined timestamp
- Called timestamp
- Completed timestamp

Queue states:

```text
WAITING
SERVING
COMPLETED
CANCELLED
```

---

## Authentication Flow

QueueLess uses JWT-based authentication.

```text
User
 │
 ├── Register
 │      │
 │      ▼
 │   Password
 │   hashed with Argon2
 │      │
 │      ▼
 │   PostgreSQL
 │
 └── Login
        │
        ▼
   Verify password
        │
        ▼
   Generate JWT
        │
        ▼
   Frontend stores token
        │
        ▼
   Authorization: Bearer <token>
        │
        ▼
   FastAPI validates token
        │
        ▼
   Identify current user
```

Passwords are never stored as plaintext.

The JWT contains the authenticated user's ID and an expiration time.

The current access-token expiration is 60 minutes.

---

## Role-Based Access Control

QueueLess has three roles:

```text
CUSTOMER
STAFF
ADMIN
```

Public registration always creates a `CUSTOMER`.

The role is intentionally not accepted from the public registration request. This prevents users from assigning themselves privileged roles.

Privileged endpoints use backend role checks.

```text
CUSTOMER
   │
   └── Cannot call staff queue operations

STAFF
   │
   └── Can manage queues and appointments

ADMIN
   │
   └── Has staff-level access in the current frontend
```

The backend is the actual authorization boundary. Frontend route protection is primarily for user experience.

---

## Appointment System

Customers can book appointments for active services.

When an appointment is created, its end time is calculated from the service duration.

Example:

```text
Service duration = 30 minutes
Start = 10:00
End   = 10:30
```

### Overlap Prevention

QueueLess prevents overlapping booked appointments.

Two time ranges overlap when:

```text
existing.start < new.end
AND
existing.end > new.start
```

Example:

```text
Existing:
10:00 ───────── 10:30

Requested:
10:15 ───────────── 10:45

Result:
Conflict
```

The API returns `409 Conflict`.

Appointments that end exactly when another appointment starts are allowed.

---

## Queue System

The queue system follows a FIFO model:

```text
First In → First Out
```

A customer joins a queue and receives a token number.

Example:

```text
Customer A → Token 1
Customer B → Token 2
Customer C → Token 3
```

The oldest waiting entry is selected when staff calls the next customer.

### Queue State Transition

```text
WAITING
   │
   │ Call Next
   ▼
SERVING
   │
   │ Complete
   ▼
COMPLETED
```

---

## Queue Position

Suppose:

```text
Token 1 → SERVING
Token 2 → WAITING
Token 3 → WAITING
Token 4 → WAITING
```

Customer with Token 3 sees:

```text
Current token: 1
Your token:    3
Your position: 2
```

The position represents the number of waiting customers ahead of the user.

---

## Concurrent Queue Operations

The backend uses database row locking when selecting the next waiting queue entry.

The purpose is to reduce the possibility of two concurrent staff requests selecting the same queue entry.

Conceptually:

```text
Staff A                    Staff B
   │                          │
   │ Request next             │
   ▼                          │
Lock selected row             │
   │                          │
   │                          ├── waits
   ▼                          │
Mark entry SERVING            │
   │                          │
Commit                        │
                              ▼
                         Select next state
```

The current token allocation itself uses the latest token number plus one and would need stronger atomic allocation for a highly concurrent production system.

---

## Real-Time Queue Updates

QueueLess uses WebSockets specifically for queue state updates.

WebSocket endpoint:

```text
WS /queue/{service_id}/ws
```

Normal HTTP communication follows:

```text
Client → Request → Server → Response
```

WebSockets provide a persistent bidirectional connection:

```text
Client ⇄ Server
```

This allows the server to push queue updates to connected clients.

Example:

```text
Staff
  │
  │ Call Next
  ▼
FastAPI
  │
  ├── Update PostgreSQL
  │
  └── Broadcast queue update
           │
           ▼
      Customer WebSocket
           │
           ▼
      React UI updates
```

The customer does not need to manually refresh the page to see the queue transition.

---

## REST API

### Authentication

```http
POST /auth/register
POST /auth/login
GET  /auth/me
```

### Organizations

```http
POST /organizations/
GET  /organizations/
```

### Services

```http
POST   /organizations/{organization_id}/services
GET    /organizations/{organization_id}/services
GET    /services/{service_id}
DELETE /services/{service_id}
```

### Appointments

```http
POST  /appointments/
GET   /appointments/
PATCH /appointments/{appointment_id}/cancel

GET   /appointments/staff/all
PATCH /appointments/{appointment_id}/complete
```

### Queue

```http
POST /queue/join
GET  /queue/{service_id}/status

POST /queue/{service_id}/next
POST /queue/entry/{entry_id}/complete

WS   /queue/{service_id}/ws
```

---

## HTTP Status Codes

QueueLess uses standard HTTP semantics including:

```text
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
```

Examples:

- Invalid/expired authentication → `401`
- Insufficient role permissions → `403`
- Resource doesn't exist → `404`
- Appointment conflict → `409`

---

## Frontend ↔ Backend Communication

Axios is configured with a centralized API client.

The Axios request interceptor automatically reads the JWT from local storage and adds:

```http
Authorization: Bearer <token>
```

to authenticated requests.

This avoids manually attaching the token to every API call.

---

## Frontend Routing

The application provides separate workflows for customers and staff.

### Customer

```text
/
├── Dashboard
├── Services
├── Appointments
└── Queue
```

### Staff/Admin

```text
/staff
├── Staff Dashboard
└── Appointments
```

The frontend also includes a responsive mobile navigation drawer.

---

## Security Considerations

Current implementation includes:

- Argon2 password hashing
- JWT authentication
- JWT expiration
- Role-based authorization
- Backend authorization checks
- No public role assignment
- Environment-based secrets
- Unique user emails
- Pydantic request validation
- Sensitive password hashes excluded from user responses

The current version does not yet implement:

- Refresh-token rotation
- Server-side token revocation
- Rate limiting
- Production secret-management infrastructure
- Full production security hardening

---

## Running Locally

### Prerequisites

Install:

- Python
- Node.js
- PostgreSQL

### Backend

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

The backend runs locally on:

```text
http://127.0.0.1:8000
```

FastAPI's interactive API documentation is available through its generated OpenAPI/Swagger interface.

### Frontend

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs locally through Vite, normally at:

```text
http://localhost:5173
```

---

## Environment Variables

The backend uses environment variables for configuration.

Example:

```env
DATABASE_URL=...
SECRET_KEY=...
```

The `.env` file is excluded from version control.

Production deployment should use the hosting provider's secret/environment-variable system instead of committing credentials to the repository.

---

## Current Project Status

### Implemented

- [x] React frontend
- [x] FastAPI backend
- [x] PostgreSQL database
- [x] SQLAlchemy ORM
- [x] JWT authentication
- [x] Argon2 password hashing
- [x] Role-based authorization
- [x] Organization management
- [x] Service management
- [x] Appointment booking
- [x] Appointment cancellation
- [x] Appointment completion
- [x] Appointment conflict detection
- [x] Queue management
- [x] FIFO queue progression
- [x] Queue position tracking
- [x] Concurrent queue-row locking
- [x] WebSocket queue updates
- [x] Customer dashboard
- [x] Staff dashboard
- [x] Responsive mobile navigation
- [x] Git/GitHub version control

### Not Yet Implemented

- [ ] Docker
- [ ] Cloud deployment
- [ ] Managed PostgreSQL
- [ ] CI/CD
- [ ] Redis
- [ ] Email/SMS notifications
- [ ] Payment integration
- [ ] Dedicated admin management UI
- [ ] Refresh-token system
- [ ] Production monitoring
- [ ] Automated test suite
- [ ] Load testing

---

## Future Improvements

Potential production improvements include:

1. Containerize the backend and frontend with Docker.
2. Deploy the frontend and backend to production infrastructure.
3. Move PostgreSQL to a managed database.
4. Add Redis for caching and distributed WebSocket/pub/sub coordination.
5. Add refresh tokens and token revocation.
6. Add rate limiting.
7. Add automated unit, integration, and end-to-end tests.
8. Add CI/CD.
9. Add structured logging and application monitoring.
10. Add email/SMS notifications for appointments and queue events.
11. Add a dedicated admin management interface.
12. Replace simple token-number allocation with an atomic database sequence/counter for high-concurrency environments.
13. Perform load and concurrency testing before production scaling.

---

## What I Learned

Building QueueLess involved working across several backend and full-stack concepts:

- REST API design
- Relational database modeling
- SQLAlchemy ORM
- PostgreSQL
- JWT authentication
- Password hashing
- Role-based authorization
- API validation
- Appointment conflict detection
- Queue state management
- Database concurrency control
- WebSockets
- React state management
- Frontend/backend integration
- Environment configuration
- Git and GitHub

The main engineering challenge was integrating normal CRUD workflows with stateful, real-time queue operations while keeping authentication, authorization, and database state consistent.

---

## Limitations

QueueLess is currently a locally developed and tested application rather than a production-distributed system.

The current implementation demonstrates the core application workflows, but production deployment would require additional infrastructure and hardening, including:

- Containerization
- Hosted infrastructure
- Managed PostgreSQL
- HTTPS/WSS
- Production CORS configuration
- Rate limiting
- Observability
- Automated testing
- Load testing
- Stronger token lifecycle management
- More robust concurrent token allocation

These are intentionally separated from the currently implemented feature set rather than being presented as completed functionality.

---

## License

This project is for educational and portfolio purposes.

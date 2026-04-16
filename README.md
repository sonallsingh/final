# AryogaSutra — AI-Based Healthcare, Ayurveda & Intelligent Recommendation System

A production-ready full-stack web application integrating traditional Ayurvedic medicine with modern AI-driven healthcare.

---

## Architecture

| Service | Technology | Port |
|---------|-----------|------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS | 3000 |
| Backend | Spring Boot 3.3 + Java 17 + Spring Security + iText 8 | 8080 |
| ML Service | Python 3.11 + Flask + scikit-learn | 5000 |
| Database | MySQL 8 | 3306 |

---

## Prerequisites

- **Java 17+** — [Download](https://adoptium.net/)
- **Maven 3.9+** — bundled with most IDEs or install separately
- **Node.js 18+** — [Download](https://nodejs.org/)
- **Python 3.11+** — [Download](https://python.org/)
- **MySQL 8** — [Download](https://dev.mysql.com/downloads/)

---

## Quick Start

### 1. Database Setup

```sql
CREATE DATABASE aryogasutra;
-- The schema is auto-created by Spring Boot (ddl-auto: update)
```

### 2. Backend (Spring Boot)

```bash
# Copy and edit environment variables
cp backend/.env.example backend/.env

# Run with MySQL (default)
cd backend
mvn spring-boot:run

# OR run with embedded H2 (no MySQL needed — for quick testing)
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

The backend starts on **http://localhost:8080**

### 3. ML Service (Python)

```bash
cd ml-service

# Install dependencies
pip install -r requirements.txt

# Train the model (generates model.pkl and encoder.pkl)
python train.py

# Start the Flask service
python app.py
```

The ML service starts on **http://localhost:5000**

### 4. Frontend (React)

```bash
cd frontend

# Install dependencies (already done if node_modules exists)
npm install

# Start development server
npm run dev
```

The frontend starts on **http://localhost:3000**

---

## Environment Variables

### Backend (`backend/src/main/resources/application.yml`)

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID | placeholder |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 client secret | placeholder |
| `FACEBOOK_CLIENT_ID` | Facebook app ID | placeholder |
| `FACEBOOK_CLIENT_SECRET` | Facebook app secret | placeholder |
| `JWT_SECRET` | HS256 secret key (min 32 chars) | dev default |
| `ML_API_URL` | Python ML service URL | `http://localhost:5000` |
| `FRONTEND_URL` | React app URL (for OAuth redirect) | `http://localhost:3000` |
| `ALLOW_ADMIN_REGISTER` | Allow admin self-registration | `false` |

### ML Service

| Variable | Description | Default |
|----------|-------------|---------|
| `BACKEND_URL` | Spring Boot backend URL | `http://localhost:8080` |
| `INTERNAL_TOKEN` | Bearer token for backend API calls | empty |
| `PORT` | Flask server port | `5000` |

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE` | Backend API base URL | `http://localhost:8080` |

---

## Features

- **Authentication** — Email/password + Google & Facebook OAuth2, JWT tokens, role-based access (Patient / Doctor / Admin)
- **Dosha Analysis** — 10-question interactive quiz, Vata/Pitta/Kapha scoring, dominant Dosha determination
- **AI Prediction** — Random Forest model predicts disease, Ayurvedic remedy, and yoga from symptoms + age + Dosha
- **Chatbot** — Context-aware NLP chatbot with Dosha-specific responses, auto-opens after Dosha test
- **Smart Doctor Recommendation** — Haversine distance calculation + AI-based specialization filtering
- **Appointment Management** — Book, reschedule, cancel appointments
- **PDF Reports** — iText-generated health reports with patient details, Dosha results, AI predictions
- **Doctor Panel** — Patient management, treatment suggestions, appointment management

---

## API Documentation

See [`docs/API.md`](docs/API.md) for full API reference.

Key endpoints:
- `POST /auth/register` — Register new user
- `POST /auth/login` — Login and get JWT
- `GET /dosha-test/questions` — Get questionnaire (public)
- `POST /dosha-test` — Submit answers and get Dosha result
- `POST /predict` — AI disease prediction
- `POST /chat` — Chatbot message
- `POST /nearest-doctors` — Find nearby doctors
- `POST /appointments` — Book appointment
- `GET /generate-report/{patientId}` — Download PDF report

---

## System Flow

```
User → Login/Register → Dashboard → Dosha Test → AI Prediction
     → Chatbot (auto-opens) → Nearby Doctors → Book Appointment
     → Download PDF Report
```

---

## Notes

- This is a **demo system** — not for clinical use
- OAuth2 requires real Google/Facebook app credentials for social login to work
- The ML model is trained on a small demo dataset — accuracy improves with more data
- Run `python train.py` whenever you update `dataset.csv`

---

## Project Structure

```
aryogasutra/
├── backend/          # Spring Boot REST API (Java 17)
│   ├── src/main/java/com/aryogasutra/
│   │   ├── config/       # Security, CORS
│   │   ├── controller/   # REST endpoints
│   │   ├── service/      # Business logic
│   │   ├── entity/       # JPA entities
│   │   ├── repository/   # Spring Data repositories
│   │   ├── dto/          # Request/response DTOs
│   │   ├── security/     # JWT, OAuth2, UserPrincipal
│   │   └── util/         # GeoUtils, SecurityUtils
│   └── src/main/resources/
│       ├── application.yml
│       └── dosha-questions.json
├── frontend/         # React 18 + TypeScript + Vite
│   └── src/
│       ├── api/          # Axios client
│       ├── components/   # Layout, ChatbotWidget
│       ├── context/      # AuthContext
│       └── pages/        # All page components
├── ml-service/       # Python Flask ML + Chatbot
│   ├── app.py            # Flask API (predict + chat + health)
│   ├── chatbot.py        # Rule-based NLP chatbot
│   ├── train.py          # ML training pipeline
│   ├── dataset.csv       # Training data
│   ├── model.pkl         # Trained model (generated)
│   └── encoder.pkl       # Encoder bundle (generated)
└── docs/
    └── API.md            # API documentation
```

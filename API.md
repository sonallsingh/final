# AryogaSutra REST API Reference

Base URL: `http://localhost:8080`  
Auth: `Authorization: Bearer <JWT>` (except where noted)

## Health

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | No |

## Authentication

| Method | Path | Auth | Body / notes |
|--------|------|------|----------------|
| POST | `/auth/register` | No | JSON `RegisterRequest`: `email`, `password`, `role` (`PATIENT` \| `DOCTOR` \| `ADMIN`), `name`, optional `specialization`, `latitude`, `longitude` for doctors |
| POST | `/auth/login` | No | `{ "email", "password" }` |
| GET | `/auth/oauth/google` | No | Browser redirect → Google OAuth2 |
| GET | `/auth/oauth/facebook` | No | Browser redirect → Facebook OAuth2 |

OAuth success redirects to `{FRONTEND_URL}/oauth/callback?token=JWT`.

## Patients

| Method | Path | Auth |
|--------|------|------|
| GET | `/patients` | Doctor, Admin |
| GET | `/patients/me` | Patient |
| PUT | `/patients/me` | Patient |
| POST | `/patients/me/report` | Patient (`multipart/form-data`, field `file`) |
| GET | `/patients/{id}` | Patient (self), Doctor, Admin |

## Doctors

| Method | Path | Auth |
|--------|------|------|
| GET | `/doctors` | Authenticated |
| PUT | `/doctors/me` | Doctor |

## Nearest doctors (Haversine)

| Method | Path | Auth |
|--------|------|------|
| POST | `/nearest-doctors` | Authenticated |

Body: `{ "latitude": number, "longitude": number, "limit": 1–10 }` (default limit 3).

## Appointments

| Method | Path | Auth |
|--------|------|------|
| POST | `/appointments` | Patient |
| GET | `/appointments` | Patient (own), Doctor (own), Admin (all) |
| PUT | `/appointments/{id}/reschedule` | Patient, Doctor, Admin |
| PUT | `/appointments/{id}/cancel` | Patient, Doctor, Admin |

## Suggestions

| Method | Path | Auth |
|--------|------|------|
| POST | `/suggestions` | Doctor |
| GET | `/suggestions/patient/{patientId}` | Patient (self), Doctor, Admin |

## Dosha questionnaire

| Method | Path | Auth |
|--------|------|------|
| GET | `/dosha-test/questions` | No |
| POST | `/dosha-test` | Patient |
| GET | `/dosha-test/latest/{patientId}` | Patient (self), Doctor, Admin |

## ML proxy

| Method | Path | Auth |
|--------|------|------|
| POST | `/predict` | Authenticated |

Body: `{ "symptoms", "age", "dosha" }`  
Response: `{ "disease", "remedy", "yoga", "confidence" }`  
Patients: last result stored on profile for PDF.

## PDF report (iText)

| Method | Path | Auth |
|--------|------|------|
| GET | `/generate-report/{patientId}` | Patient (self), Doctor, Admin |

Returns `application/pdf` attachment.

## Environment

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth Google |
| `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` | OAuth Facebook |
| `FRONTEND_URL` | OAuth redirect base (default `http://localhost:3000`) |
| `JWT_SECRET` | HS256 key material |
| `ML_API_URL` | Python service (default `http://localhost:5000`) |
| `ALLOW_ADMIN_REGISTER` | `true` to allow `ADMIN` in `/auth/register` |
| `SPRING_PROFILES_ACTIVE=local` | Embedded H2 instead of MySQL |

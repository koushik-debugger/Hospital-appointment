# ?? CareBridge HMS � Hospital Management System

A modern, browser-based Hospital Management System that connects **patients**, **doctors**, and **administrators** through a unified, role-aware dashboard experience.

---

## ? Features

### ?? Multi-Role Authentication
- Separate login and registration flows for **Patients**, **Doctors**, and **Admins**
- Session management via `localStorage`
- Password validation and duplicate email checks

### ????? Patient Dashboard
- Book and manage appointments
- View appointment history and status
- Receive in-app notifications

### ????? Doctor Dashboard
- View today's schedule and upcoming appointments
- Accept or reject appointment requests
- Manage patient interactions

### ??? Admin Dashboard
- Oversee all users (patients and doctors)
- Monitor and manage all appointments
- Full system control panel

### ?? Email Notifications
- Automated email alerts for appointment events (via `email.js`)

---

## ??? Project Structure

```
?? Project Root/
+-- index.html               # Login page (entry point)
+-- register.html            # Patient & Doctor registration
+-- dashboard-patient.html   # Patient dashboard
+-- dashboard-doctor.html    # Doctor dashboard
+-- dashboard-admin.html     # Admin dashboard
�
+-- css/
�   +-- main.css             # Global design system & shared styles
�   +-- auth.css             # Login & registration styles
�   +-- dashboard.css        # Dashboard layout & component styles
�
+-- js/
    +-- data.js              # Data layer � localStorage CRUD & seeding
    +-- auth.js              # Authentication & registration logic
    +-- email.js             # Email notification utilities
```

---

## ?? Getting Started

This is a **pure front-end** application � no server, build tools, or dependencies required.

### Run Locally

1. Clone or download this repository.
2. Open `index.html` in any modern web browser.

```bash
# Or serve with a simple HTTP server (recommended)
npx serve .
# Then visit: http://localhost:3000
```

### Default Admin Credentials

A default admin account is automatically seeded on first load:

| Field    | Value                  |
|----------|------------------------|
| Email    | `admin@hospital.com`   |
| Password | `Admin@123`            |

> ?? Change the default admin credentials before deploying to any public environment.

---

## ?? Data Storage

All application data is persisted in the browser's **`localStorage`** under the following keys:

| Key                  | Contents                        |
|----------------------|---------------------------------|
| `hms_users`          | All registered users            |
| `hms_appointments`   | All appointment records         |
| `hms_notifications`  | In-app notification queue       |
| `hms_session`        | Currently logged-in user ID     |

> **Note:** Data is browser-local and not shared across devices or browsers.

---

## ?? Tech Stack

| Layer      | Technology               |
|------------|--------------------------|
| Structure  | HTML5 (Semantic)         |
| Styling    | Vanilla CSS (custom)     |
| Logic      | Vanilla JavaScript (ES6+)|
| Storage    | Browser `localStorage`   |
| Fonts      | Google Fonts             |

---

## ?? User Roles

| Role      | Registration         | Default Access           |
|-----------|----------------------|--------------------------|
| Patient   | Self-register        | `dashboard-patient.html` |
| Doctor    | Self-register        | `dashboard-doctor.html`  |
| Admin     | Pre-seeded           | `dashboard-admin.html`   |

---

## ?? Security Notes

- Passwords are stored in **plain text** in `localStorage` � this project is intended for **educational/demo purposes only**.
- Do **not** use this system in a production or clinical environment without a proper backend, authentication, and encryption layer.

---

## ?? License

This project is open source and available for educational use.

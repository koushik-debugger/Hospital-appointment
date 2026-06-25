# CareBridge HMS  Hospital Management System

A modern, browser-based Hospital Management System that connects **patients**, **doctors**, and **administrators** through a unified, role-aware dashboard experience.

---

##  Features

###  Multi-Role Authentication
- Separate login and registration flows for **Patients**, **Doctors**, and **Admins**
- Session management via `localStorage`
- Password validation and duplicate email checks

### Patient Dashboard
- Book and manage appointments
- View appointment history and status
- Receive in-app notifications

###  Doctor Dashboard
- View today's schedule and upcoming appointments
- Accept or reject appointment requests
- Manage patient interactions

###  Admin Dashboard
- Oversee all users (patients and doctors)
- Monitor and manage all appointments
- Full system control panel

###  Email Notifications
- Automated email alerts for appointment events (via `email.js`)

---

##  Project Structure

```
 Project Root/
+-- index.html               # Login page (entry point)
+-- register.html            # Patient & Doctor registration
+-- dashboard-patient.html   # Patient dashboard
+-- dashboard-doctor.html    # Doctor dashboard
+-- dashboard-admin.html     # Admin dashboard
+-- server.py                # Backend Python API server
+-- database.sqlite          # SQLite database
+-- update_admin.py          # Admin update utility script

+-- css/
   +-- main.css             # Global design system & shared styles
   +-- auth.css             # Login & registration styles
   +-- dashboard.css        # Dashboard layout & component styles

+-- js/
    +-- data.js              # Data layer - API calls to backend
    +-- auth.js              # Authentication & registration logic
    +-- email.js             # Email notification utilities
```

---

##  Getting Started

This application uses a pure HTML/JS frontend and a Python built-in HTTP server backend with an SQLite database.

### Run Locally

1. Clone or download this repository.
2. Ensure you have Python installed.
3. Start the backend server by running:

```bash
python server.py
```
4. The application will be served at `http://127.0.0.1:8000`.

### Default Admin Credentials

A default admin account is automatically seeded on first load:

| Field    | Value                  |
|----------|------------------------|
| Email    | `admin@hospital.com`   |
| Password | `Admin@123`            |

>  Change the default admin credentials before deploying to any public environment.

---

##  Data Storage

All application data is stored using an SQLite database (`database.sqlite`). The backend server automatically creates and manages the following tables:

- **`users`**: All registered users (patients, doctors, admins)
- **`appointments`**: All appointment records
- **`notifications`**: In-app notification queue

Session information is managed on the client side using `localStorage` (via the `hms_session` key).

---

##  Tech Stack

| Layer      | Technology               |
|------------|--------------------------|
| Backend    | Python `http.server`     |
| Database   | SQLite                   |
| Structure  | HTML5 (Semantic)         |
| Styling    | Vanilla CSS (custom)     |
| Logic      | Vanilla JavaScript (ES6+)|
| Fonts      | Google Fonts             |

---

##  User Roles

| Role      | Registration         | Default Access           |
|-----------|----------------------|--------------------------|
| Patient   | Self-register        | `dashboard-patient.html` |
| Doctor    | Self-register        | `dashboard-doctor.html`  |
| Admin     | Pre-seeded           | `dashboard-admin.html`   |

---

##  Security Notes

- Passwords are stored in **plain text** in the SQLite database; this project is intended for **educational/demo purposes only**.
- Do **not** use this system in a production or clinical environment without a proper production-ready backend, authentication, and encryption layer.

---

##  License

This project is open source and available for educational use.

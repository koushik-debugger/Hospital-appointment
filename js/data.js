// ─── Data Layer ──────────────────────────────────────────────────────────────
// All data stored in localStorage. Keys: hms_users, hms_appointments, hms_notifications

const DB = {
  KEYS: {
    users: 'hms_users',
    appointments: 'hms_appointments',
    notifications: 'hms_notifications',
    session: 'hms_session',
  },

  // ── Generic helpers ──────────────────────────────────────────
  _get(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
  },
  _set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },
  _genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  // ── Seed ─────────────────────────────────────────────────────
  seed() {
    const users = this._get(this.KEYS.users);
    const hasAdmin = users.some(u => u.role === 'admin');
    if (!hasAdmin) {
      const admin = {
        id: this._genId(),
        name: 'Super Admin',
        email: 'admin@hospital.com',
        password: 'Admin@123',
        role: 'admin',
        status: 'active',
        emailVerified: true,
        verificationToken: null,
        createdAt: new Date().toISOString(),
        phone: '+91-9000000000',
        avatar: null,
      };
      users.push(admin);
      this._set(this.KEYS.users, users);
      console.info('[HMS] Default admin seeded — admin@hospital.com / Admin@123');
    }
  },

  // ── Users ────────────────────────────────────────────────────
  getUsers() { return this._get(this.KEYS.users); },
  getUserById(id) { return this.getUsers().find(u => u.id === id) || null; },
  getUserByEmail(email) {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },
  saveUser(user) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx > -1) { users[idx] = user; }
    else { users.push(user); }
    this._set(this.KEYS.users, users);
    return user;
  },
  createUser(data) {
    const user = { id: this._genId(), createdAt: new Date().toISOString(), ...data };
    const users = this.getUsers();
    users.push(user);
    this._set(this.KEYS.users, users);
    return user;
  },
  deleteUser(id) {
    const users = this.getUsers().filter(u => u.id !== id);
    this._set(this.KEYS.users, users);
  },
  getUsersByRole(role) { return this.getUsers().filter(u => u.role === role); },
  getPendingDoctors() {
    return this.getUsers().filter(u => u.role === 'doctor' && u.status === 'pending_approval');
  },

  // ── Appointments ─────────────────────────────────────────────
  getAppointments() { return this._get(this.KEYS.appointments); },
  getAppointmentById(id) { return this.getAppointments().find(a => a.id === id) || null; },
  getAppointmentsByPatient(patientId) {
    return this.getAppointments().filter(a => a.patientId === patientId)
      .sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));
  },
  getAppointmentsByDoctor(doctorId) {
    return this.getAppointments().filter(a => a.doctorId === doctorId)
      .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
  },
  createAppointment(data) {
    const apt = { id: this._genId(), createdAt: new Date().toISOString(), status: 'pending', ...data };
    const apts = this.getAppointments();
    apts.push(apt);
    this._set(this.KEYS.appointments, apts);
    return apt;
  },
  saveAppointment(apt) {
    const apts = this.getAppointments();
    const idx = apts.findIndex(a => a.id === apt.id);
    if (idx > -1) { apts[idx] = apt; }
    else { apts.push(apt); }
    this._set(this.KEYS.appointments, apts);
    return apt;
  },
  deleteAppointment(id) {
    const apts = this.getAppointments().filter(a => a.id !== id);
    this._set(this.KEYS.appointments, apts);
  },

  // ── Notifications ────────────────────────────────────────────
  getNotifications() { return this._get(this.KEYS.notifications); },
  getNotificationsForUser(userId) {
    return this.getNotifications()
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  getUnreadCount(userId) {
    return this.getNotificationsForUser(userId).filter(n => !n.read).length;
  },
  createNotification(userId, title, message, type = 'info') {
    const n = {
      id: this._genId(), userId, title, message, type,
      read: false, createdAt: new Date().toISOString(),
    };
    const notes = this.getNotifications();
    notes.push(n);
    this._set(this.KEYS.notifications, notes);
    return n;
  },
  markAllRead(userId) {
    const notes = this.getNotifications().map(n =>
      n.userId === userId ? { ...n, read: true } : n
    );
    this._set(this.KEYS.notifications, notes);
  },

  // ── Session ──────────────────────────────────────────────────
  setSession(userId) {
    sessionStorage.setItem(this.KEYS.session, userId);
  },
  getSession() {
    const id = sessionStorage.getItem(this.KEYS.session);
    return id ? this.getUserById(id) : null;
  },
  clearSession() {
    sessionStorage.removeItem(this.KEYS.session);
  },

  // ── Stats for Admin ──────────────────────────────────────────
  getStats() {
    const users = this.getUsers();
    const apts = this.getAppointments();
    const today = new Date().toISOString().split('T')[0];
    return {
      totalPatients: users.filter(u => u.role === 'patient').length,
      totalDoctors: users.filter(u => u.role === 'doctor' && u.status === 'active').length,
      pendingDoctors: users.filter(u => u.role === 'doctor' && u.status === 'pending_approval').length,
      totalAppointments: apts.length,
      todayAppointments: apts.filter(a => a.date === today).length,
      pendingAppointments: apts.filter(a => a.status === 'pending').length,
    };
  },
};

// Auto-seed on load
DB.seed();

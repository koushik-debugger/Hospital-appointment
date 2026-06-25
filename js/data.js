// ─── Data Layer (API Backend) ──────────────────────────────────────────────────────────────

const DB = {
  KEYS: {
    users: 'hms_users',
    appointments: 'hms_appointments',
    notifications: 'hms_notifications',
    session: 'hms_session',
  },

  async _fetch(url, options = {}) {
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (err) {
      console.error('API Error:', err);
      return null;
    }
  },

  // ── Seed ─────────────────────────────────────────────────────
  async seed() {
    // The Python server now handles seeding the default admin automatically.
  },

  // ── Users ────────────────────────────────────────────────────
  async getUsers() { return (await this._fetch('/api/users')) || []; },
  async getUserById(id) {
    const users = await this._fetch(`/api/users?id=${id}`);
    return users && users.length ? users[0] : null;
  },
  async getUserByEmail(email) {
    const users = await this._fetch(`/api/users?email=${encodeURIComponent(email)}`);
    return users && users.length ? users[0] : null;
  },
  async saveUser(user) {
    return await this._fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      body: JSON.stringify(user)
    });
  },
  async createUser(data) {
    return await this._fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  async deleteUser(id) {
    await this._fetch(`/api/users/${id}`, { method: 'DELETE' });
  },
  async getUsersByRole(role) {
    return (await this._fetch(`/api/users?role=${role}`)) || [];
  },
  async getPendingDoctors() {
    return (await this._fetch(`/api/users?role=doctor&status=pending_approval`)) || [];
  },

  // ── Appointments ─────────────────────────────────────────────
  async getAppointments() { return (await this._fetch('/api/appointments')) || []; },
  async getAppointmentById(id) {
    const apts = await this.getAppointments();
    return apts.find(a => a.id === id) || null;
  },
  async getAppointmentsByPatient(patientId) {
    const apts = await this._fetch(`/api/appointments?patientId=${patientId}`) || [];
    return apts.sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));
  },
  async getAppointmentsByDoctor(doctorId) {
    const apts = await this._fetch(`/api/appointments?doctorId=${doctorId}`) || [];
    return apts.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
  },
  async createAppointment(data) {
    return await this._fetch('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  async saveAppointment(apt) {
    return await this._fetch(`/api/appointments/${apt.id}`, {
      method: 'PUT',
      body: JSON.stringify(apt)
    });
  },
  async deleteAppointment(id) {
    await this._fetch(`/api/appointments/${id}`, { method: 'DELETE' });
  },

  // ── Notifications ────────────────────────────────────────────
  async getNotifications() { return (await this._fetch('/api/notifications')) || []; },
  async getNotificationsForUser(userId) {
    const notes = await this._fetch(`/api/notifications?userId=${userId}`) || [];
    return notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  async getUnreadCount(userId) {
    const notes = await this.getNotificationsForUser(userId);
    return notes.filter(n => !n.read).length;
  },
  async createNotification(userId, title, message, type = 'info') {
    return await this._fetch('/api/notifications', {
      method: 'POST',
      body: JSON.stringify({ userId, title, message, type })
    });
  },
  async markAllRead(userId) {
    await this._fetch('/api/notifications/read', {
      method: 'PUT',
      body: JSON.stringify({ userId })
    });
  },

  // ── Session ──────────────────────────────────────────────────
  setSession(userId) {
    sessionStorage.setItem(this.KEYS.session, userId);
  },
  async getSession() {
    const id = sessionStorage.getItem(this.KEYS.session);
    return id ? await this.getUserById(id) : null;
  },
  clearSession() {
    sessionStorage.removeItem(this.KEYS.session);
  },

  // ── Stats for Admin ──────────────────────────────────────────
  async getStats() {
    return await this._fetch('/api/stats') || {};
  },
};

// ─── Data Layer (Local Storage Backend) ──────────────────────────────────────────────────────────────

const DB = {
  KEYS: {
    users: 'hms_users',
    appointments: 'hms_appointments',
    notifications: 'hms_notifications',
    session: 'hms_session',
  },

  // Helper to read localstorage
  _get(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  },

  // Helper to write localstorage
  _set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  // ── Seed ─────────────────────────────────────────────────────
  async seed() {
    let users = this._get(this.KEYS.users);
    if (users.length === 0) {
      // Seed default users
      users = [
        {
          id: 'admin-id-1',
          name: 'Super Admin',
          email: 'admin@hospital.com',
          password: 'Admin@123',
          role: 'admin',
          status: 'active',
          emailVerified: true,
          phone: '+91 9999999999',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'doc-id-1',
          name: 'Sarah Jenkins',
          email: 'sarah@hospital.com',
          password: 'Doctor@123',
          role: 'doctor',
          status: 'active',
          emailVerified: true,
          specialization: 'Cardiology',
          licenseNumber: 'MCI/2020/08123',
          experience: 10,
          bio: 'Specialist in cardiovascular diseases and interventional cardiology with over 10 years of experience.',
          phone: '+91 9876500001',
          createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
        },
        {
          id: 'doc-id-2',
          name: 'Alex Patel',
          email: 'alex@hospital.com',
          password: 'Doctor@123',
          role: 'doctor',
          status: 'active',
          emailVerified: true,
          specialization: 'Neurology',
          licenseNumber: 'MCI/2021/09562',
          experience: 8,
          bio: 'Dedicated neurologist focusing on neurodegenerative diseases and chronic migraine treatments.',
          phone: '+91 9876500002',
          createdAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
        },
        {
          id: 'doc-id-3',
          name: 'Emma Watson',
          email: 'emma@hospital.com',
          password: 'Doctor@123',
          role: 'doctor',
          status: 'pending_approval',
          emailVerified: true,
          specialization: 'Pediatrics',
          licenseNumber: 'MCI/2022/10456',
          experience: 5,
          bio: 'Passionate pediatrician with a focus on child development and preventative healthcare.',
          phone: '+91 9876500003',
          createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        },
        {
          id: 'pat-id-1',
          name: 'John Doe',
          email: 'john@gmail.com',
          password: 'Patient@123',
          role: 'patient',
          status: 'active',
          emailVerified: true,
          phone: '+91 9876543210',
          bloodGroup: 'O+',
          dob: '1990-05-15',
          createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        },
        {
          id: 'pat-id-2',
          name: 'Jane Smith',
          email: 'jane@gmail.com',
          password: 'Patient@123',
          role: 'patient',
          status: 'active',
          emailVerified: true,
          phone: '+91 9876543211',
          bloodGroup: 'AB+',
          dob: '1995-10-22',
          createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
        }
      ];
      this._set(this.KEYS.users, users);
    }

    let appointments = this._get(this.KEYS.appointments);
    if (appointments.length === 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      appointments = [
        {
          id: 'apt-id-1',
          patientId: 'pat-id-1',
          doctorId: 'doc-id-1',
          date: todayStr,
          time: '10:00',
          status: 'pending',
          reason: 'Regular cardiovascular health checkup.',
          symptoms: 'Mild fatigue occasionally',
          notes: '',
          createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        },
        {
          id: 'apt-id-2',
          patientId: 'pat-id-2',
          doctorId: 'doc-id-2',
          date: tomorrowStr,
          time: '14:30',
          status: 'confirmed',
          reason: 'Mild migraines for the past week.',
          symptoms: 'Headache at the back of head',
          notes: 'Patient requested afternoon appointment',
          createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        }
      ];
      this._set(this.KEYS.appointments, appointments);
    }
  },

  // ── Users ────────────────────────────────────────────────────
  async getUsers() {
    await this.seed();
    return this._get(this.KEYS.users);
  },
  async getUserById(id) {
    const users = await this.getUsers();
    return users.find(u => u.id === id) || null;
  },
  async getUserByEmail(email) {
    const users = await this.getUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },
  async saveUser(user) {
    const users = await this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx] = user;
      this._set(this.KEYS.users, users);
    }
    return user;
  },
  async createUser(data) {
    const users = await this.getUsers();
    const user = {
      id: 'usr-' + Math.random().toString(36).substring(2, 11),
      createdAt: new Date().toISOString(),
      ...data
    };
    users.push(user);
    this._set(this.KEYS.users, users);
    return user;
  },
  async deleteUser(id) {
    const users = await this.getUsers();
    const filtered = users.filter(u => u.id !== id);
    this._set(this.KEYS.users, filtered);
  },
  async getUsersByRole(role) {
    const users = await this.getUsers();
    return users.filter(u => u.role === role);
  },
  async getPendingDoctors() {
    const users = await this.getUsers();
    return users.filter(u => u.role === 'doctor' && u.status === 'pending_approval');
  },

  // ── Appointments ─────────────────────────────────────────────
  async getAppointments() {
    await this.seed();
    return this._get(this.KEYS.appointments);
  },
  async getAppointmentById(id) {
    const apts = await this.getAppointments();
    return apts.find(a => a.id === id) || null;
  },
  async getAppointmentsByPatient(patientId) {
    const apts = await this.getAppointments();
    return apts
      .filter(a => a.patientId === patientId)
      .sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));
  },
  async getAppointmentsByDoctor(doctorId) {
    const apts = await this.getAppointments();
    return apts
      .filter(a => a.doctorId === doctorId)
      .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
  },
  async createAppointment(data) {
    const apts = await this.getAppointments();
    const apt = {
      id: 'apt-' + Math.random().toString(36).substring(2, 11),
      createdAt: new Date().toISOString(),
      ...data
    };
    apts.push(apt);
    this._set(this.KEYS.appointments, apts);
    return apt;
  },
  async saveAppointment(apt) {
    const apts = await this.getAppointments();
    const idx = apts.findIndex(a => a.id === apt.id);
    if (idx !== -1) {
      apts[idx] = apt;
      this._set(this.KEYS.appointments, apts);
    }
    return apt;
  },
  async deleteAppointment(id) {
    const apts = await this.getAppointments();
    const filtered = apts.filter(a => a.id !== id);
    this._set(this.KEYS.appointments, filtered);
  },

  // ── Notifications ────────────────────────────────────────────
  async getNotifications() {
    return this._get(this.KEYS.notifications);
  },
  async getNotificationsForUser(userId) {
    const notes = await this.getNotifications();
    return notes
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  async getUnreadCount(userId) {
    const notes = await this.getNotificationsForUser(userId);
    return notes.filter(n => !n.read).length;
  },
  async createNotification(userId, title, message, type = 'info') {
    const notes = await this.getNotifications();
    const notif = {
      id: 'ntf-' + Math.random().toString(36).substring(2, 11),
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString()
    };
    notes.push(notif);
    this._set(this.KEYS.notifications, notes);
    return notif;
  },
  async markAllRead(userId) {
    const notes = await this.getNotifications();
    notes.forEach(n => {
      if (n.userId === userId) n.read = true;
    });
    this._set(this.KEYS.notifications, notes);
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
    const patients = await this.getUsersByRole('patient');
    const doctors = await this.getUsersByRole('doctor');
    const apts = await this.getAppointments();

    const activeDocs = doctors.filter(d => d.status === 'active');
    const pendingDocs = doctors.filter(d => d.status === 'pending_approval');
    const pendingApts = apts.filter(a => a.status === 'pending');

    const todayStr = new Date().toISOString().split('T')[0];
    const todayApts = apts.filter(a => a.date === todayStr);

    return {
      totalPatients: patients.length,
      totalDoctors: activeDocs.length,
      pendingDoctors: pendingDocs.length,
      totalAppointments: apts.length,
      todayAppointments: todayApts.length,
      pendingAppointments: pendingApts.length,
    };
  },
};

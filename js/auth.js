// ─── Auth Logic (Async) ──────────────────────────────────────────────────────────────

const Auth = (() => {

  // ── Token Generator ──────────────────────────────────────────
  function genToken(len = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  // ── Validate password ─────────────────────────────────────────
  function validatePassword(pw) {
    if (pw.length < 6) return 'At least 6 characters required';
    return null;
  }

  // ── Register Patient ──────────────────────────────────────────
  async function registerPatient({ name, email, password, phone, dob, bloodGroup }) {
    if (await DB.getUserByEmail(email)) return { ok: false, error: 'Email already registered' };
    const pwErr = validatePassword(password);
    if (pwErr) return { ok: false, error: pwErr };

    const token = genToken(6);
    const user = await DB.createUser({
      name, email, password, phone, dob, bloodGroup,
      role: 'patient',
      status: 'active',
      emailVerified: false,
      verificationToken: token,
      avatar: null,
    });

    // Send verification email
    const tpl = Email.Templates.verification(name, token, email);
    Email.send({ to: email, toName: name, ...tpl });

    return { ok: true, user, needsVerification: true };
  }

  // ── Register Doctor ───────────────────────────────────────────
  async function registerDoctor({ name, email, password, phone, specialization, licenseNumber, experience, bio }) {
    if (await DB.getUserByEmail(email)) return { ok: false, error: 'Email already registered' };
    const pwErr = validatePassword(password);
    if (pwErr) return { ok: false, error: pwErr };

    const token = genToken(6);
    const user = await DB.createUser({
      name, email, password, phone, specialization, licenseNumber,
      experience: parseInt(experience) || 0, bio,
      role: 'doctor',
      status: 'pending_approval',
      emailVerified: false,
      verificationToken: token,
      avatar: null,
    });

    // Send verification email
    const tpl = Email.Templates.verification(name, token, email);
    Email.send({ to: email, toName: name, ...tpl });

    // Send pending-approval email
    const tpl2 = Email.Templates.doctorPendingApproval(name);
    Email.send({ to: email, toName: name, ...tpl2 });

    // Notify admin
    const admins = await DB.getUsersByRole('admin');
    admins.forEach(admin => {
      DB.createNotification(admin.id, 'New Doctor Registration', `Dr. ${name} is awaiting approval.`, 'info');
    });

    return { ok: true, user, needsVerification: true };
  }

  // ── Verify Email Token ────────────────────────────────────────
  async function verifyEmailToken(userId, token) {
    const user = await DB.getUserById(userId);
    if (!user) return { ok: false, error: 'User not found' };
    if (user.emailVerified) return { ok: true, alreadyVerified: true };
    if (user.verificationToken !== token.toUpperCase()) return { ok: false, error: 'Invalid code' };

    user.emailVerified = true;
    user.verificationToken = null;
    await DB.saveUser(user);
    return { ok: true };
  }

  // ── Login ─────────────────────────────────────────────────────
  async function login(email, password) {
    const user = await DB.getUserByEmail(email);
    if (!user) return { ok: false, error: 'Email not found' };
    if (user.password !== password) return { ok: false, error: 'Incorrect password' };
    if (user.status === 'rejected') return { ok: false, error: 'Your account has been rejected. Contact admin.' };

    DB.setSession(user.id);
    return { ok: true, user };
  }

  // ── Logout ────────────────────────────────────────────────────
  function logout() {
    DB.clearSession();
    window.location.href = 'index.html';
  }

  // ── Require Auth (redirect if not logged in) ──────────────────
  async function requireAuth(allowedRoles) {
    const user = await DB.getSession();
    if (!user) { window.location.href = 'index.html'; return null; }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      window.location.href = 'index.html'; return null;
    }
    return user;
  }

  // ── Admin: Create Doctor ──────────────────────────────────────
  async function adminCreateDoctor({ name, email, phone, specialization, licenseNumber, experience, bio }) {
    if (await DB.getUserByEmail(email)) return { ok: false, error: 'Email already registered' };
    const password = 'Doctor@' + Math.floor(1000 + Math.random() * 9000);
    const token = genToken(6);

    const user = await DB.createUser({
      name, email, password, phone, specialization, licenseNumber,
      experience: parseInt(experience) || 0, bio,
      role: 'doctor',
      status: 'active', // admin-created doctors are pre-approved
      emailVerified: false,
      verificationToken: token,
      avatar: null,
    });

    // Send credentials + verification
    const tpl = Email.Templates.verification(name, token, email);
    Email.send({
      to: email, toName: name, subject: tpl.subject, body: `
      <div style="font-family:Inter,sans-serif;">
        <h2 style="color:#14b8a6;">Welcome to HMS!</h2>
        <p>Hi Dr. <strong>${name}</strong>,</p>
        <p>An account has been created for you by the administrator.</p>
        <div style="margin:16px 0;padding:16px;background:#0d1527;border-radius:8px;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> <code style="color:#f59e0b;">${password}</code></p>
        </div>
        <h3 style="margin-top:20px;">Verify Your Email</h3>
        <div style="font-size:2rem;font-weight:800;letter-spacing:0.2em;color:#f59e0b;margin:8px 0;">${token}</div>
      </div>
    `, type: 'verification'
    });

    return { ok: true, user, password };
  }

  // ── Admin: Create Admin ───────────────────────────────────────
  async function adminCreateAdmin({ name, email, phone }) {
    if (await DB.getUserByEmail(email)) return { ok: false, error: 'Email already registered' };
    const password = 'Admin@' + Math.floor(1000 + Math.random() * 9000);
    const token = genToken(6);

    const user = await DB.createUser({
      name, email, password, phone,
      role: 'admin',
      status: 'pending_verification',
      emailVerified: false,
      verificationToken: token,
      avatar: null,
    });

    // Send credentials email
    const tpl = Email.Templates.adminCreated(name, email, password);
    Email.send({ to: email, toName: name, ...tpl });

    // Send verification email
    const vTpl = Email.Templates.verification(name, token, email);
    Email.send({ to: email, toName: name, ...vTpl });

    return { ok: true, user };
  }

  // ── Admin: Approve Doctor ─────────────────────────────────────
  async function approveDoctor(doctorId) {
    const doc = await DB.getUserById(doctorId);
    if (!doc) return { ok: false, error: 'Doctor not found' };
    doc.status = 'active';
    await DB.saveUser(doc);

    // Send approval email
    const tpl = Email.Templates.doctorApproved(doc.name);
    Email.send({ to: doc.email, toName: doc.name, ...tpl });

    // Notify doctor
    await DB.createNotification(doc.id, '🎉 Account Approved!', 'Your account has been approved. You can now log in!', 'success');

    return { ok: true };
  }

  // ── Admin: Reject Doctor ──────────────────────────────────────
  async function rejectDoctor(doctorId, reason = '') {
    const doc = await DB.getUserById(doctorId);
    if (!doc) return { ok: false, error: 'Doctor not found' };
    doc.status = 'rejected';
    await DB.saveUser(doc);

    const tpl = Email.Templates.doctorRejected(doc.name, reason);
    Email.send({ to: doc.email, toName: doc.name, ...tpl });

    await DB.createNotification(doc.id, '❌ Account Rejected', reason || 'Your account application was rejected.', 'danger');

    return { ok: true };
  }

  // ── Update Profile ────────────────────────────────────────────
  async function updateProfile(userId, updates) {
    const user = await DB.getUserById(userId);
    if (!user) return { ok: false, error: 'User not found' };
    const updatedUser = { ...user, ...updates };
    await DB.saveUser(updatedUser);
    return { ok: true, user: updatedUser };
  }

  // ── Change Password ───────────────────────────────────────────
  async function changePassword(userId, currentPw, newPw) {
    const user = await DB.getUserById(userId);
    if (!user) return { ok: false, error: 'User not found' };
    if (user.password !== currentPw) return { ok: false, error: 'Current password incorrect' };
    const err = validatePassword(newPw);
    if (err) return { ok: false, error: err };
    user.password = newPw;
    await DB.saveUser(user);
    return { ok: true };
  }

  // ── Forgot Password ───────────────────────────────────────────
  async function forgotPassword(email) {
    const user = await DB.getUserByEmail(email);
    if (!user) return { ok: false, error: 'No account found with this email address.' };
    return { ok: true, password: user.password, name: user.name, role: user.role };
  }

  return {
    genToken, registerPatient, registerDoctor, verifyEmailToken,
    login, logout, requireAuth,
    adminCreateDoctor, adminCreateAdmin,
    approveDoctor, rejectDoctor,
    updateProfile, changePassword, forgotPassword,
  };
})();

// ── Global Toast Helper ───────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container') || (() => {
    const el = document.createElement('div');
    el.id = 'toast-container';
    document.body.appendChild(el);
    return el;
  })();

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

// ── Global Avatar Initial Generator ──────────────────────────
function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

// ── Format Date ───────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

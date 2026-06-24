// ─── Simulated Email System ───────────────────────────────────────────────────
// All "emails" are stored in localStorage and shown via an in-app inbox modal.

const Email = (() => {
  const KEY = 'hms_emails';

  function _get() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  }
  function _save(emails) { localStorage.setItem(KEY, JSON.stringify(emails)); }
  function _id() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

  function send({ to, toName, subject, body, type = 'info' }) {
    const emails = _get();
    emails.unshift({
      id: _id(), to, toName, subject, body, type,
      read: false, sentAt: new Date().toISOString(),
    });
    _save(emails);
    // Update badge
    _updateBadge(to);
    return true;
  }

  function getEmailsFor(address) {
    return _get().filter(e => e.to.toLowerCase() === address.toLowerCase());
  }

  function markRead(id) {
    const emails = _get().map(e => e.id === id ? { ...e, read: true } : e);
    _save(emails);
  }

  function getUnread(address) {
    return getEmailsFor(address).filter(e => !e.read).length;
  }

  function _updateBadge(address) {
    const badge = document.getElementById('inbox-badge');
    if (!badge) return;
    const session = DB.getSession();
    if (!session || session.email !== address) return;
    const count = getUnread(address);
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  // ── Pre-built Templates ──────────────────────────────────────
  const Templates = {
    verification(name, token, email) {
      const link = `${location.href.replace(/\/[^/]*$/, '')}/verify.html?token=${token}&email=${encodeURIComponent(email)}`;
      return {
        subject: '✅ Verify Your Email — Hospital Management System',
        body: `
          <div style="font-family:Inter,sans-serif;">
            <h2 style="color:#14b8a6;">Email Verification</h2>
            <p>Hi <strong>${name}</strong>,</p>
            <p>Thank you for registering. Please verify your email address to activate your account.</p>
            <div style="margin:24px 0;">
              <strong>Verification Code:</strong>
              <div style="font-size:2rem;font-weight:800;letter-spacing:0.2em;color:#f59e0b;margin:8px 0;">${token}</div>
            </div>
            <p style="color:#64748b;font-size:0.85rem;">This code expires in 24 hours. If you didn't sign up, ignore this email.</p>
          </div>
        `,
        type: 'verification',
      };
    },
    doctorPendingApproval(name) {
      return {
        subject: '⏳ Application Under Review — Doctor Registration',
        body: `
          <div style="font-family:Inter,sans-serif;">
            <h2 style="color:#f59e0b;">Application Received</h2>
            <p>Hi Dr. <strong>${name}</strong>,</p>
            <p>Your registration has been submitted and is currently under review by our administrator.</p>
            <p>You will receive another email once your account has been approved. This typically takes 1–2 business days.</p>
            <p style="color:#64748b;font-size:0.85rem;">If you have questions, contact admin@hospital.com</p>
          </div>
        `,
        type: 'warning',
      };
    },
    doctorApproved(name) {
      return {
        subject: '🎉 Account Approved — Welcome to HMS!',
        body: `
          <div style="font-family:Inter,sans-serif;">
            <h2 style="color:#22c55e;">Congratulations!</h2>
            <p>Hi Dr. <strong>${name}</strong>,</p>
            <p>Your doctor account has been <strong>approved</strong> by the administrator. You can now log in and start managing appointments.</p>
            <a href="index.html" style="display:inline-block;margin-top:16px;padding:10px 24px;background:#14b8a6;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Login Now</a>
          </div>
        `,
        type: 'success',
      };
    },
    doctorRejected(name, reason) {
      return {
        subject: '❌ Account Application Rejected',
        body: `
          <div style="font-family:Inter,sans-serif;">
            <h2 style="color:#ef4444;">Application Not Approved</h2>
            <p>Hi Dr. <strong>${name}</strong>,</p>
            <p>Unfortunately, your doctor registration has been <strong>rejected</strong> by the administrator.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p style="color:#64748b;font-size:0.85rem;">If you believe this is a mistake, contact admin@hospital.com</p>
          </div>
        `,
        type: 'danger',
      };
    },
    appointmentBooked(patientName, doctorName, date, time) {
      return {
        subject: '📅 Appointment Booked Successfully',
        body: `
          <div style="font-family:Inter,sans-serif;">
            <h2 style="color:#14b8a6;">Appointment Confirmed</h2>
            <p>Hi <strong>${patientName}</strong>,</p>
            <p>Your appointment has been booked with <strong>Dr. ${doctorName}</strong>.</p>
            <div style="margin:16px 0;padding:16px;background:#0d1527;border-radius:8px;border-left:3px solid #14b8a6;">
              <p><strong>Date:</strong> ${date}</p>
              <p><strong>Time:</strong> ${time}</p>
              <p><strong>Status:</strong> Pending Confirmation</p>
            </div>
          </div>
        `,
        type: 'info',
      };
    },
    appointmentStatusUpdate(patientName, doctorName, date, time, status) {
      const colors = { confirmed: '#22c55e', rejected: '#ef4444', completed: '#14b8a6', cancelled: '#f59e0b' };
      const color = colors[status] || '#94a3b8';
      return {
        subject: `📋 Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        body: `
          <div style="font-family:Inter,sans-serif;">
            <h2 style="color:${color};">Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}</h2>
            <p>Hi <strong>${patientName}</strong>,</p>
            <p>Your appointment with <strong>Dr. ${doctorName}</strong> on <strong>${date} at ${time}</strong> has been <strong>${status}</strong>.</p>
          </div>
        `,
        type: status === 'confirmed' ? 'success' : status === 'rejected' ? 'danger' : 'info',
      };
    },
    adminCreated(name, email, tempPassword) {
      return {
        subject: '🔐 Admin Account Created — Hospital Management System',
        body: `
          <div style="font-family:Inter,sans-serif;">
            <h2 style="color:#f59e0b;">Admin Account Created</h2>
            <p>Hi <strong>${name}</strong>,</p>
            <p>An administrator account has been created for you on the Hospital Management System.</p>
            <div style="margin:16px 0;padding:16px;background:#0d1527;border-radius:8px;">
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Temporary Password:</strong> <code style="color:#f59e0b;">${tempPassword}</code></p>
            </div>
            <p style="color:#64748b;font-size:0.85rem;">Please verify your email and change your password on first login.</p>
          </div>
        `,
        type: 'warning',
      };
    },
    customMessage(senderName, receiverName, messageText) {
      return {
        subject: `✉️ New Message from ${senderName}`,
        body: `
          <div style="font-family:Inter,sans-serif;">
            <h2 style="color:#3b82f6;">New Message Received</h2>
            <p>Hi <strong>${receiverName}</strong>,</p>
            <p>You have received a new message from <strong>${senderName}</strong>:</p>
            <div style="margin:16px 0;padding:16px;background:#0d1527;border-radius:8px;border-left:3px solid #3b82f6;">
              <p style="white-space:pre-wrap; margin:0;">${messageText}</p>
            </div>
            <p style="color:#64748b;font-size:0.85rem;">Please check your dashboard to respond.</p>
          </div>
        `,
        type: 'info',
      };
    },
  };

  // ── Inbox UI ─────────────────────────────────────────────────
  function renderInbox(address) {
    const emails = getEmailsFor(address);
    const container = document.getElementById('inbox-list');
    if (!container) return;

    const typeColors = {
      verification: 'var(--teal-400)',
      warning:      'var(--gold-400)',
      success:      'var(--green-400)',
      danger:       'var(--red-400)',
      info:         '#93c5fd',
    };

    if (emails.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <h3>No emails yet</h3>
          <p>Your inbox is empty</p>
        </div>`;
      return;
    }

    container.innerHTML = emails.map(e => `
      <div class="email-item ${e.read ? '' : 'unread'}" onclick="Email.openEmail('${e.id}', '${address}')" data-id="${e.id}">
        <div class="email-dot" style="background:${typeColors[e.type] || '#94a3b8'};"></div>
        <div class="email-content">
          <div class="email-subject">${e.subject}</div>
          <div class="email-time">${_formatTime(e.sentAt)}</div>
        </div>
      </div>
    `).join('');
  }

  function openEmail(id, address) {
    const emails = _get();
    const email = emails.find(e => e.id === id);
    if (!email) return;
    markRead(id);

    const viewer = document.getElementById('email-viewer');
    const list   = document.getElementById('inbox-list-wrap');
    if (viewer && list) {
      list.style.display = 'none';
      viewer.style.display = 'block';
      viewer.innerHTML = `
        <button class="btn btn-outline btn-sm" onclick="Email.backToInbox('${address}')">← Back</button>
        <h3 style="margin:16px 0 8px;">${email.subject}</h3>
        <p class="text-muted text-sm" style="margin-bottom:16px;">${_formatTime(email.sentAt)}</p>
        <div class="email-body-render">${email.body}</div>
      `;
    }

    // update badge
    const badge = document.getElementById('inbox-badge');
    if (badge) {
      const count = getUnread(address);
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }

    // re-render list
    renderInbox(address);
  }

  function backToInbox(address) {
    const viewer = document.getElementById('email-viewer');
    const list   = document.getElementById('inbox-list-wrap');
    if (viewer && list) {
      viewer.style.display = 'none';
      list.style.display = 'block';
      renderInbox(address);
    }
  }

  function _formatTime(iso) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
    return d.toLocaleDateString();
  }

  return { send, getEmailsFor, markRead, getUnread, Templates, renderInbox, openEmail, backToInbox };
})();

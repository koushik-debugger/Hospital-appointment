import codecs

with codecs.open('dashboard-admin.html', 'r', 'utf-8') as f:
    content = f.read()

script_start = content.find('<script>\n  let currentUser = Auth.requireAuth')
if script_start == -1:
    script_start = content.find('<script>\r\n  let currentUser = Auth.requireAuth')
if script_start == -1:
    script_start = content.find('<script>\n  let currentUser = null;')
if script_start == -1:
    script_start = content.find('<script>\r\n  let currentUser = null;')

script_end = content.find('</script>', script_start)

if script_start != -1 and script_end != -1:
    script_end += len('</script>')
    new_script = """<script>
  let currentUser = null;
  let adminAptFilter = 'all';

  async function init() {
    currentUser = await Auth.requireAuth(['admin']);
    if (!currentUser) return;

    document.getElementById('sidebar-name').textContent   = currentUser.name;
    document.getElementById('sidebar-avatar').textContent = getInitials(currentUser.name);
    document.getElementById('greeting').textContent       = `Welcome, ${currentUser.name}! 🛡️`;

    updateInboxBadge();
    await renderStats();
    await renderOverview();
    await renderApprovals();
    await renderAdminApts('all');
    await renderPatientsTable();
    await renderDoctorsTable();
    fillProfile();
  }

  function updateInboxBadge() {
    const count = Email.getUnread(currentUser.email);
    const badge = document.getElementById('inbox-badge');
    badge.textContent = count; badge.style.display = count > 0 ? 'flex' : 'none';
  }

  async function renderStats() {
    const s = await DB.getStats();
    document.getElementById('stat-patients').textContent     = s.totalPatients;
    document.getElementById('stat-doctors').textContent      = s.totalDoctors;
    document.getElementById('stat-pending-docs').textContent = s.pendingDoctors;
    document.getElementById('stat-apts').textContent         = s.totalAppointments;
    document.getElementById('stat-today-apts').textContent   = s.todayAppointments;
    document.getElementById('stat-pending-apts').textContent = s.pendingAppointments;

    const badge = document.getElementById('approval-badge');
    badge.textContent   = s.pendingDoctors;
    badge.style.display = s.pendingDoctors > 0 ? 'flex' : 'none';
  }

  async function renderOverview() {
    // Pending docs
    const pendingRaw = await DB.getPendingDoctors();
    const pending = pendingRaw.slice(0, 5);
    const pdEl = document.getElementById('overview-pending-docs');
    if (!pending.length) {
      pdEl.innerHTML = `<div class="empty-state" style="padding:32px;"><div class="empty-icon" style="font-size:2.5rem;">✅</div><h3 style="font-size:1rem;">No pending approvals</h3></div>`;
    } else {
      pdEl.innerHTML = pending.map(d => pendingDocRow(d)).join('');
    }

    // Recent appointments
    const aptsRaw = await DB.getAppointments();
    const apts = aptsRaw.slice(-5).reverse();
    const rEl  = document.getElementById('overview-recent-apts');
    if (!apts.length) {
      rEl.innerHTML = `<div class="empty-state" style="padding:20px;"><div class="empty-icon">📋</div><h3>No appointments yet</h3></div>`;
    } else {
      const htmls = await Promise.all(apts.map(async a => {
        const p = await DB.getUserById(a.patientId);
        const d = await DB.getUserById(a.doctorId);
        const sc = { pending:'warning', confirmed:'success', completed:'teal', rejected:'danger', cancelled:'muted' };
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--glass-border);">
            <div>
              <div style="font-weight:600;font-size:0.85rem;">${p?.name||'?'} → Dr. ${d?.name||'?'}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${formatDate(a.date)} · ${a.time}</div>
            </div>
            <span class="badge badge-${sc[a.status]||'muted'}">${a.status}</span>
          </div>`;
      }));
      rEl.innerHTML = htmls.join('');
    }
  }

  async function renderApprovals() {
    const pending = await DB.getPendingDoctors();
    const el = document.getElementById('approvals-list');
    if (!pending.length) {
      el.innerHTML = `<div class="empty-state" style="padding:60px;"><div class="empty-icon">✅</div><h3>No pending approvals</h3><p>All doctor applications have been reviewed.</p></div>`;
      return;
    }
    el.innerHTML = pending.map(d => pendingDocRow(d, true)).join('');
  }

  function pendingDocRow(d, detailed = false) {
    return `
      <div class="pending-doc">
        <div class="avatar avatar-md">${getInitials(d.name)}</div>
        <div class="pending-doc-info">
          <div class="pending-doc-name">Dr. ${d.name}</div>
          <div class="pending-doc-meta">
            ${d.specialization||'—'} · ${d.experience||0} yrs · ${d.email}
            ${d.emailVerified ? ' · <span style="color:var(--green-400);">✅ Email Verified</span>' : ' · <span style="color:var(--gold-400);">📧 Not Verified</span>'}
          </div>
          ${d.licenseNumber ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">License: ${d.licenseNumber}</div>` : ''}
          ${d.bio && detailed ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;font-style:italic;">${d.bio}</div>` : ''}
        </div>
        <div class="pending-doc-actions">
          ${detailed ? `<button class="btn btn-outline btn-sm" onclick="viewDoctorDetails('${d.id}')">View</button>` : ''}
          <button class="btn btn-success btn-sm" onclick="approveDoc('${d.id}')">✅ Approve</button>
          <button class="btn btn-danger btn-sm" onclick="openRejectModal('${d.id}')">❌ Reject</button>
        </div>
      </div>`;
  }

  async function approveDoc(id) {
    const res = await Auth.approveDoctor(id);
    if (res.ok) {
      showToast('Doctor approved successfully!', 'success');
      await renderStats(); await renderOverview(); await renderApprovals(); await renderDoctorsTable();
      updateInboxBadge();
    }
  }

  function openRejectModal(id) {
    document.getElementById('reject-doc-id').value = id;
    document.getElementById('reject-reason-admin').value = '';
    document.getElementById('reject-modal').classList.add('open');
  }
  function closeRejectModal() { document.getElementById('reject-modal').classList.remove('open'); }
  
  async function confirmRejectDoctor() {
    const id     = document.getElementById('reject-doc-id').value;
    const reason = document.getElementById('reject-reason-admin').value.trim();
    await Auth.rejectDoctor(id, reason);
    showToast('Doctor rejected.', 'info');
    closeRejectModal();
    await renderStats(); await renderOverview(); await renderApprovals(); await renderDoctorsTable();
  }

  async function viewDoctorDetails(id) {
    const d = await DB.getUserById(id);
    if (!d) return;
    document.getElementById('doc-detail-content').innerHTML = `
      <div style="text-align:center;margin-bottom:20px;">
        <div class="avatar avatar-lg" style="margin:0 auto 12px;">${getInitials(d.name)}</div>
        <h3>Dr. ${d.name}</h3>
        <div style="color:var(--teal-400);font-weight:600;margin-top:4px;">${d.specialization||'—'}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;font-size:0.88rem;">
        <div style="display:flex;gap:8px;"><span style="color:var(--text-muted);width:110px;">Email</span><span>${d.email}</span></div>
        <div style="display:flex;gap:8px;"><span style="color:var(--text-muted);width:110px;">Phone</span><span>${d.phone||'—'}</span></div>
        <div style="display:flex;gap:8px;"><span style="color:var(--text-muted);width:110px;">License</span><span>${d.licenseNumber||'—'}</span></div>
        <div style="display:flex;gap:8px;"><span style="color:var(--text-muted);width:110px;">Experience</span><span>${d.experience||0} years</span></div>
        <div style="display:flex;gap:8px;"><span style="color:var(--text-muted);width:110px;">Email Verified</span><span>${d.emailVerified?'✅ Yes':'❌ No'}</span></div>
        <div style="display:flex;gap:8px;"><span style="color:var(--text-muted);width:110px;">Registered</span><span>${formatDateTime(d.createdAt)}</span></div>
        ${d.bio ? `<div style="margin-top:8px;padding:12px;background:rgba(20,184,166,0.06);border-radius:8px;font-style:italic;color:var(--text-secondary);">${d.bio}</div>` : ''}
      </div>
      <div style="display:flex;gap:10px;margin-top:20px;">
        <button class="btn btn-success btn-full" onclick="approveDoc('${d.id}');document.getElementById('doc-detail-modal').classList.remove('open');">✅ Approve</button>
        <button class="btn btn-danger btn-full" onclick="document.getElementById('doc-detail-modal').classList.remove('open');openRejectModal('${d.id}')">❌ Reject</button>
      </div>`;
    document.getElementById('doc-detail-modal').classList.add('open');
  }

  async function renderAdminApts(filter) {
    adminAptFilter = filter;
    const aptsRaw = await DB.getAppointments();
    const apts = aptsRaw.filter(a => filter === 'all' || a.status === filter)
      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    const tbody = document.getElementById('apts-table-body');
    const sc = { pending:'warning', confirmed:'success', completed:'teal', rejected:'danger', cancelled:'muted' };
    if (!apts.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted);">No appointments found</td></tr>`;
      return;
    }
    const htmls = await Promise.all(apts.map(async a => {
      const p = await DB.getUserById(a.patientId);
      const d = await DB.getUserById(a.doctorId);
      return `
        <tr>
          <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar avatar-sm">${getInitials(p?.name||'?')}</div><span>${p?.name||'—'}</span></div></td>
          <td>Dr. ${d?.name||'—'}</td>
          <td>${formatDate(a.date)} · ${a.time}</td>
          <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a.reason||'—'}</td>
          <td><span class="badge badge-${sc[a.status]||'muted'}">${a.status}</span></td>
        </tr>`;
    }));
    tbody.innerHTML = htmls.join('');
  }

  function filterAdminApts(filter, btn) {
    document.querySelectorAll('#section-appointments .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderAdminApts(filter);
  }

  async function renderPatientsTable() {
    const patients = await DB.getUsersByRole('patient');
    const tbody = document.getElementById('patients-table-body');
    if (!patients.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No patients registered yet</td></tr>`;
      return;
    }
    const htmls = await Promise.all(patients.map(async p => {
      const apts = await DB.getAppointmentsByPatient(p.id);
      const aptCount = apts.length;
      return `
        <tr>
          <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar avatar-sm">${getInitials(p.name)}</div><span style="font-weight:600;">${p.name}</span></div></td>
          <td>${p.email}</td>
          <td>${p.phone||'—'}</td>
          <td>${p.bloodGroup ? `<span class="badge badge-danger">${p.bloodGroup}</span>` : '—'}</td>
          <td><span class="badge badge-teal">${aptCount}</span></td>
          <td style="font-size:0.78rem;color:var(--text-muted);">${formatDateTime(p.createdAt)}</td>
        </tr>`;
    }));
    tbody.innerHTML = htmls.join('');
  }

  async function renderDoctorsTable() {
    const doctors = await DB.getUsersByRole('doctor');
    const tbody = document.getElementById('doctors-table-body');
    const sc = { active:'success', pending_approval:'warning', rejected:'danger', pending_verification:'info' };
    if (!doctors.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted);">No doctors registered yet</td></tr>`;
      return;
    }
    tbody.innerHTML = doctors.map(d => `
      <tr style="cursor:pointer; transition:background 0.2s;" onclick="toggleDoctorDetails('${d.id}')" class="hover-bg-mesh">
        <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar avatar-sm">${getInitials(d.name)}</div><span style="font-weight:600;">Dr. ${d.name}</span></div></td>
        <td>${d.specialization||'—'}</td>
        <td style="font-size:0.78rem;color:var(--text-muted);">${d.licenseNumber||'—'}</td>
        <td>${d.experience||0} yrs</td>
        <td><span class="badge badge-${sc[d.status]||'muted'}">${d.status.replace('_',' ')}</span></td>
        <td>${d.emailVerified ? '<span class="badge badge-success">Verified</span>' : '<span class="badge badge-warning">Pending</span>'}</td>
        <td onclick="event.stopPropagation()">
          <div style="display:flex;gap:6px;">
            ${d.status === 'pending_approval' ? `
              <button class="btn btn-success btn-sm" onclick="approveDoc('${d.id}')">Approve</button>
              <button class="btn btn-danger btn-sm" onclick="openRejectModal('${d.id}')">Reject</button>` :
            d.status === 'active' ? `<span class="badge badge-success">Active</span>` :
            d.status === 'rejected' ? `<button class="btn btn-success btn-sm" onclick="approveDoc('${d.id}')">Re-approve</button>` : ''}
            <button class="btn btn-outline btn-sm">▼</button>
          </div>
        </td>
      </tr>
      <tr id="doc-details-${d.id}" style="display:none; background:rgba(20,184,166,0.05);">
        <td colspan="7" style="padding:20px; border-bottom:1px solid var(--glass-border);">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px; font-size:0.9rem;">
            <div>
              <p style="margin-bottom:8px;"><strong style="color:var(--teal-400);">Email:</strong> ${d.email}</p>
              <p style="margin-bottom:8px;"><strong style="color:var(--teal-400);">Phone:</strong> ${d.phone || '—'}</p>
              <p style="margin-bottom:8px;"><strong style="color:var(--teal-400);">Joined:</strong> ${formatDateTime(d.createdAt)}</p>
            </div>
            <div>
              <p style="margin-bottom:8px;"><strong style="color:var(--teal-400);">Bio:</strong></p>
              <p style="color:var(--text-secondary); font-style:italic;">${d.bio || 'No biography provided.'}</p>
            </div>
          </div>
        </td>
      </tr>`).join('');
  }

  function toggleDoctorDetails(id) {
    const detailRow = document.getElementById(`doc-details-${id}`);
    if (detailRow.style.display === 'none' || detailRow.style.display === '') {
      detailRow.style.display = 'table-row';
    } else {
      detailRow.style.display = 'none';
    }
  }

  // Create Doctor
  document.getElementById('create-doc-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const errEl = document.getElementById('cd-error');
    errEl.classList.remove('show');
    const btn = document.getElementById('create-doc-btn');
    btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> Creating...';

    const res = await Auth.adminCreateDoctor({
      name:           document.getElementById('cd-name').value.trim(),
      email:          document.getElementById('cd-email').value.trim(),
      phone:          document.getElementById('cd-phone').value.trim(),
      specialization: document.getElementById('cd-spec').value,
      experience:     document.getElementById('cd-exp').value,
      licenseNumber:  document.getElementById('cd-license').value,
      bio:            document.getElementById('cd-bio').value,
    });
    btn.disabled = false; btn.innerHTML = 'Create Doctor Account';
    if (!res.ok) { errEl.textContent = res.error; errEl.classList.add('show'); return; }
    showToast(`Doctor account created! Password sent to inbox.`, 'success');
    this.reset();
    await renderStats(); await renderDoctorsTable(); await renderOverview();
    updateInboxBadge();
  });

  // Create Admin
  document.getElementById('create-admin-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const errEl = document.getElementById('ca-error');
    errEl.classList.remove('show');
    const btn = document.getElementById('create-admin-btn');
    btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> Creating...';

    const res = await Auth.adminCreateAdmin({
      name:  document.getElementById('ca-name').value.trim(),
      email: document.getElementById('ca-email').value.trim(),
      phone: document.getElementById('ca-phone').value.trim(),
    });
    btn.disabled = false; btn.innerHTML = 'Create Admin Account';
    if (!res.ok) { errEl.textContent = res.error; errEl.classList.add('show'); return; }
    showToast('Admin account created! Credentials sent to inbox.', 'success');
    this.reset();
    updateInboxBadge();
  });

  function fillProfile() {
    document.getElementById('ap-name').value  = currentUser.name || '';
    document.getElementById('ap-phone').value = currentUser.phone || '';
  }

  document.getElementById('admin-profile-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const res = await Auth.updateProfile(currentUser.id, {
      name:  document.getElementById('ap-name').value.trim(),
      phone: document.getElementById('ap-phone').value.trim(),
    });
    if (res.ok) { currentUser = res.user; document.getElementById('sidebar-name').textContent = currentUser.name; showToast('Profile updated!', 'success'); }
  });

  document.getElementById('admin-pw-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const errEl = document.getElementById('admin-pw-error');
    errEl.classList.remove('show');
    const res = await Auth.changePassword(currentUser.id, document.getElementById('admin-pw-current').value, document.getElementById('admin-pw-new').value);
    if (!res.ok) { errEl.textContent = res.error; errEl.classList.add('show'); return; }
    showToast('Password updated!', 'success'); this.reset();
  });

  function toggleInbox() {
    const panel = document.getElementById('inbox-panel');
    if (!panel.classList.contains('open')) {
      Email.renderInbox(currentUser.email);
      document.getElementById('email-viewer').style.display = 'none';
      document.getElementById('inbox-list-wrap').style.display = 'block';
    }
    panel.classList.toggle('open');
  }

  async function showSection(name) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('section-' + name).classList.add('active');
    document.getElementById('nav-' + name)?.classList.add('active');
    const titles = {
      overview:'Overview', approvals:'Doctor Approvals', appointments:'All Appointments',
      patients:'Patients', doctors:'Doctors', 'create-doctor':'Add Doctor', 'create-admin':'Add Admin', profile:'Profile'
    };
    document.getElementById('topbar-title').textContent = titles[name] || name;
    if (name === 'appointments') await renderAdminApts(adminAptFilter);
    if (name === 'approvals') { await renderApprovals(); await renderStats(); }
    if (name === 'patients') await renderPatientsTable();
    if (name === 'doctors') await renderDoctorsTable();
    if (window.innerWidth < 900) document.getElementById('sidebar').classList.remove('open');
  }

  function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

  // ══════════════════════════════════════════════════════════
  // ██  AUTOMATION ENGINE  ██
  // ══════════════════════════════════════════════════════════

  // ── Snapshot state for change detection ──────────────────
  let _snapshot = { pendingDoctors: 0, totalApts: 0, pendingApts: 0, totalPatients: 0 };
  let _autoApproveEnabled = false;
  let _countdownSeconds   = 5;
  let _countdownTimer     = null;
  let _activityLog        = JSON.parse(localStorage.getItem('hms_activity_log') || '[]');

  // ── Auto-Approve Toggle ───────────────────────────────────
  async function toggleAutoApprove() {
    _autoApproveEnabled = !_autoApproveEnabled;
    const knob   = document.getElementById('auto-approve-knob');
    const sw     = document.getElementById('auto-approve-switch');
    const banner = document.getElementById('auto-approve-banner');

    if (_autoApproveEnabled) {
      knob.style.transform = 'translateX(16px)';
      sw.style.background  = 'rgba(34,197,94,0.4)';
      sw.style.borderColor = 'rgba(34,197,94,0.6)';
      banner.style.display = 'flex';
      showToast('🤖 Auto-Approve enabled — new doctors will be approved instantly!', 'success');
      logActivity('⚙️', 'Auto-Approve mode enabled by admin', 'success');
      // immediately approve any already pending
      await runAutoApprove();
    } else {
      knob.style.transform = 'translateX(0)';
      sw.style.background  = 'rgba(245,158,11,0.2)';
      sw.style.borderColor = 'rgba(245,158,11,0.4)';
      banner.style.display = 'none';
      showToast('Auto-Approve disabled.', 'info');
      logActivity('⚙️', 'Auto-Approve mode disabled by admin', 'info');
    }
  }

  async function runAutoApprove() {
    if (!_autoApproveEnabled) return;
    const pending = await DB.getPendingDoctors();
    for (const doc of pending) {
      await Auth.approveDoctor(doc.id);
      logActivity('✅', `Auto-approved Dr. ${doc.name} (${doc.specialization||'General'})`, 'success');
      showToast(`✅ Auto-approved Dr. ${doc.name}`, 'success');
    }
    if (pending.length) {
      await renderStats(); await renderOverview(); await renderApprovals(); await renderDoctorsTable();
    }
  }

  // ── Approve All Pending ───────────────────────────────────
  async function approveAllPending() {
    const pending = await DB.getPendingDoctors();
    if (!pending.length) { showToast('No pending doctors to approve.', 'info'); return; }
    for (const doc of pending) {
      await Auth.approveDoctor(doc.id);
      logActivity('✅', `Bulk-approved Dr. ${doc.name}`, 'success');
    }
    showToast(`✅ ${pending.length} doctor(s) approved!`, 'success');
    await renderStats(); await renderOverview(); await renderApprovals(); await renderDoctorsTable();
  }

  // ── Activity Log ──────────────────────────────────────────
  function logActivity(icon, message, type = 'info') {
    const entry = { icon, message, type, time: new Date().toISOString() };
    _activityLog.unshift(entry);
    if (_activityLog.length > 50) _activityLog = _activityLog.slice(0, 50); // keep last 50
    localStorage.setItem('hms_activity_log', JSON.stringify(_activityLog));
    renderActivityFeed();
  }

  function clearActivityLog() {
    _activityLog = [];
    localStorage.removeItem('hms_activity_log');
    renderActivityFeed();
    showToast('Activity log cleared.', 'info');
  }

  function renderActivityFeed() {
    const el = document.getElementById('activity-feed');
    if (!el) return;
    const typeColors = { success: 'var(--green-400)', danger: 'var(--red-400)', info: '#93c5fd', warning: 'var(--gold-400)' };
    if (!_activityLog.length) {
      el.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:0.85rem;">No activity yet — actions will appear here in real time</div>`;
      return;
    }
    el.innerHTML = _activityLog.map(e => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 24px;
                  border-bottom:1px solid rgba(20,184,166,0.06);transition:background 0.2s;"
           onmouseover="this.style.background='var(--glass-hover)'" onmouseout="this.style.background=''">
        <span style="font-size:1.1rem;flex-shrink:0;">${e.icon}</span>
        <span style="flex:1;font-size:0.83rem;color:var(--text-secondary);">${e.message}</span>
        <span style="font-size:0.7rem;color:var(--text-muted);flex-shrink:0;white-space:nowrap;">${_relTime(e.time)}</span>
        <div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${typeColors[e.type]||'#64748b'};"></div>
      </div>`).join('');
  }

  function _relTime(iso) {
    const diff = Date.now() - new Date(iso);
    if (diff < 60000)   return 'just now';
    if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
    return new Date(iso).toLocaleDateString();
  }

  // ── Smart Change Detection ────────────────────────────────
  async function detectChanges() {
    const s = await DB.getStats();

    // New pending doctor joined?
    if (s.pendingDoctors > _snapshot.pendingDoctors) {
      const diff = s.pendingDoctors - _snapshot.pendingDoctors;
      showToast(`👨‍⚕️ ${diff} new doctor registration${diff>1?'s':''} pending approval!`, 'warning');
      logActivity('👨‍⚕️', `${diff} new doctor registration${diff>1?'s':''} awaiting approval`, 'warning');
      // Ring the approval badge
      const badge = document.getElementById('approval-badge');
      badge.textContent = s.pendingDoctors;
      badge.style.display = s.pendingDoctors > 0 ? 'flex' : 'none';
      if (_autoApproveEnabled) await runAutoApprove();
    }

    // Doctor approved/rejected externally?
    if (s.pendingDoctors < _snapshot.pendingDoctors && !_autoApproveEnabled) {
      logActivity('🔄', 'Pending doctor count changed', 'info');
    }

    // New appointment booked?
    if (s.totalAppointments > _snapshot.totalApts) {
      const diff = s.totalAppointments - _snapshot.totalApts;
      showToast(`📅 ${diff} new appointment${diff>1?'s':''} booked!`, 'info');
      logActivity('📅', `${diff} new appointment${diff>1?'s':''} created`, 'info');
    }

    // New patient registered?
    if (s.totalPatients > _snapshot.totalPatients) {
      const diff = s.totalPatients - _snapshot.totalPatients;
      showToast(`🧑‍💼 ${diff} new patient${diff>1?'s':''} registered!`, 'success');
      logActivity('🧑‍💼', `${diff} new patient${diff>1?'s':''} registered`, 'success');
    }

    _snapshot = {
      pendingDoctors: s.pendingDoctors,
      totalApts:      s.totalAppointments,
      pendingApts:    s.pendingAppointments,
      totalPatients:  s.totalPatients,
    };
  }

  // ── Full Silent Refresh ───────────────────────────────────
  async function silentRefresh() {
    await detectChanges();
    await renderStats();
    await renderOverview();
    renderActivityFeed();

    // Also refresh visible section
    const activeSection = document.querySelector('.tab-panel.active')?.id?.replace('section-','');
    if (activeSection === 'approvals')    await renderApprovals();
    if (activeSection === 'appointments') await renderAdminApts(adminAptFilter);
    if (activeSection === 'patients')     await renderPatientsTable();
    if (activeSection === 'doctors')      await renderDoctorsTable();

    // Update last-refresh label
    const lbl = document.getElementById('last-refresh-label');
    if (lbl) lbl.textContent = new Date().toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit',second:'2-digit'});

    // Update inbox badge
    updateInboxBadge();
  }

  async function manualRefresh() {
    await silentRefresh();
    showToast('Dashboard refreshed!', 'info');
    logActivity('🔄', 'Manual refresh triggered by admin', 'info');
    _countdownSeconds = 5; // reset countdown
  }

  // ── Countdown Timer ───────────────────────────────────────
  function startCountdown() {
    _countdownSeconds = 5;
    _countdownTimer = setInterval(async () => {
      _countdownSeconds--;
      const el = document.getElementById('refresh-countdown');
      if (el) el.textContent = _countdownSeconds > 0 ? `refreshing in ${_countdownSeconds}s` : 'refreshing...';
      if (_countdownSeconds <= 0) {
        await silentRefresh();
        _countdownSeconds = 5;
      }
    }, 1000);
  }

  // ══════════════════════════════════════════════════════════

  init();

  // Init snapshot after data loads
  setTimeout(async () => {
    if (!currentUser) return;
    const s = await DB.getStats();
    _snapshot = {
      pendingDoctors: s.pendingDoctors,
      totalApts:      s.totalAppointments,
      pendingApts:    s.pendingAppointments,
      totalPatients:  s.totalPatients,
    };
    // Load & render existing activity log
    renderActivityFeed();
    logActivity('🛡️', `Admin ${currentUser.name} logged in`, 'info');
    // Start auto-refresh countdown
    startCountdown();
  }, 500);
  </script>"""
    content = content[:script_start] + new_script + content[script_end:]
    
    with codecs.open('dashboard-admin.html', 'w', 'utf-8') as f2:
        f2.write(content)
    print("Successfully replaced.")
else:
    print("Could not find script_start or script_end")

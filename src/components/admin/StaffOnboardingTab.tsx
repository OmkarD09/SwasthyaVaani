import React, { useState } from 'react';
import {
  Users,
  Stethoscope,
  Building2,
  Shield,
  Plus,
  Clock,
  Phone,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';
import {
  DoctorProfile,
  DepartmentItem,
  StaffUserItem,
  onboardDoctor,
  updateDoctorStatus,
  createDepartment,
  createStaffUser,
  updateStaffRole,
} from '../../services/adminApi';

interface StaffOnboardingTabProps {
  doctors: DoctorProfile[];
  departments: DepartmentItem[];
  staffUsers: StaffUserItem[];
  onRefresh: () => void;
}

export const StaffOnboardingTab: React.FC<StaffOnboardingTabProps> = ({
  doctors,
  departments,
  staffUsers,
  onRefresh,
}) => {
  const [subTab, setSubTab] = useState<'doctors' | 'departments' | 'rbac'>('doctors');

  // Modal states
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  // Form states
  const [docName, setDocName] = useState('');
  const [docSpecialization, setDocSpecialization] = useState('');
  const [docDeptId, setDocDeptId] = useState(departments[0]?.id || '');
  const [docLicense, setDocLicense] = useState('');
  const [docContact, setDocContact] = useState('');
  const [docHours, setDocHours] = useState('09:00 AM - 05:00 PM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');

  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('DOCTOR');
  const [userPhone, setUserPhone] = useState('');

  // Handle Onboard Doctor Submit
  const handleOnboardDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName || !docSpecialization || !docDeptId) return;
    setIsSubmitting(true);
    try {
      await onboardDoctor({
        display_name: docName,
        specialization: docSpecialization,
        department_id: docDeptId,
        license_identifier: docLicense,
        contact: docContact,
        working_hours: docHours,
      });
      setShowDoctorModal(false);
      setDocName('');
      setDocSpecialization('');
      setDocLicense('');
      setDocContact('');
      onRefresh();
    } catch (err: any) {
      alert(`Error onboarding doctor: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Doctor Active Status
  const handleToggleDoctorStatus = async (doc: DoctorProfile) => {
    try {
      await updateDoctorStatus(doc.id, !doc.is_active);
      onRefresh();
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  // Handle Create Department Submit
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName || !deptCode) return;
    setIsSubmitting(true);
    try {
      await createDepartment({ name: deptName, code: deptCode });
      setShowDeptModal(false);
      setDeptName('');
      setDeptCode('');
      onRefresh();
    } catch (err: any) {
      alert(`Error creating department: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create Staff User
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail || !userName) return;
    setIsSubmitting(true);
    try {
      await createStaffUser({
        email: userEmail,
        display_name: userName,
        role: userRole,
        phone: userPhone,
      });
      setShowUserModal(false);
      setUserEmail('');
      setUserName('');
      setUserPhone('');
      onRefresh();
    } catch (err: any) {
      alert(`Error provisioning user: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Role Change
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateStaffRole(userId, newRole);
      onRefresh();
    } catch (err: any) {
      alert(`Error updating role: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Users size={14} className="text-teal-600" />
            Hospital Directory & Role-Based Access Control
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            Staff & Onboarding Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage physician credentials, active hospital departments, and staff RBAC permissions.
          </p>
        </div>

        {/* Subtab Switcher */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
          <button
            onClick={() => setSubTab('doctors')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${subTab === 'doctors'
                ? 'bg-white text-slate-800 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            <Stethoscope size={13} />
            <span>Doctors ({doctors.length})</span>
          </button>
          <button
            onClick={() => setSubTab('departments')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${subTab === 'departments'
                ? 'bg-white text-slate-800 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            <Building2 size={13} />
            <span>Departments ({departments.length})</span>
          </button>
          <button
            onClick={() => setSubTab('rbac')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${subTab === 'rbac'
                ? 'bg-white text-slate-800 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            <Shield size={13} />
            <span>Staff RBAC ({staffUsers.length})</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. DOCTORS DIRECTORY */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'doctors' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Onboarded Physicians & Clinical Specialists
            </h3>
            <button
              onClick={() => setShowDoctorModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-xs"
            >
              <Plus size={14} /> Onboard Doctor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map((doc) => (
              <div
                key={doc.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        {doc.display_name}
                      </h4>
                      <span className="text-xs text-teal-700 font-medium block">
                        {doc.specialization}
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleDoctorStatus(doc)}
                      className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${doc.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                      title="Click to toggle availability"
                    >
                      {doc.is_active ? (
                        <>
                          <CheckCircle2 size={11} /> Available
                        </>
                      ) : (
                        <>
                          <XCircle size={11} /> On Leave
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Department:</span>
                      <b className="text-slate-700">{doc.department_name || 'General OPD'}</b>
                    </div>
                    {doc.license_identifier && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Registration / MCI:</span>
                        <span className="font-mono text-[11px] text-slate-700 font-medium">
                          {doc.license_identifier}
                        </span>
                      </div>
                    )}
                    {doc.contact && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Phone size={10} /> Contact:
                        </span>
                        <span className="font-mono text-[11px] text-slate-700">
                          {doc.contact}
                        </span>
                      </div>
                    )}
                    {doc.working_hours && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock size={10} /> Shift:
                        </span>
                        <span className="text-[11px] text-slate-700 font-medium">
                          {doc.working_hours}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>ID: {doc.id}</span>
                  <span className="text-teal-700 font-semibold cursor-pointer hover:underline">
                    Edit Profile
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. DEPARTMENTS DIRECTORY */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Hospital Clinical Departments & Intake Case Volume
            </h3>
            <button
              onClick={() => setShowDeptModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-xs"
            >
              <Plus size={14} /> Add Department
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Department Name</th>
                    <th className="pb-3">Code</th>
                    <th className="pb-3 text-center">Active Physicians</th>
                    <th className="pb-3 text-center">Total Cases Routed</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-semibold text-slate-800 flex items-center gap-2">
                        <Building2 size={14} className="text-teal-600" />
                        <span>{dept.name}</span>
                      </td>
                      <td className="py-3 font-mono text-slate-500">{dept.code}</td>
                      <td className="py-3 text-center font-semibold text-indigo-700">
                        {dept.active_doctors_count} doctors
                      </td>
                      <td className="py-3 text-center font-bold text-slate-800">
                        {dept.patient_cases_count} cases
                      </td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Operational
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. STAFF RBAC MANAGEMENT */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'rbac' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Staff User Roles & Permissions
              </h3>
              <p className="text-xs text-slate-500">
                Roles enforced server-side via FastAPI RBAC dependencies (Super Admin, Hospital Admin, Doctor, Nurse, Receptionist, Lab Staff)
              </p>
            </div>
            <button
              onClick={() => setShowUserModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-xs"
            >
              <Plus size={14} /> Provision Staff
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Staff Member</th>
                    <th className="pb-3">Email Address</th>
                    <th className="pb-3">Assigned Role (RBAC)</th>
                    <th className="pb-3">Contact</th>
                    <th className="pb-3 text-right">Access Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-semibold text-slate-800">
                        {u.display_name}
                      </td>
                      <td className="py-3 font-mono text-slate-500">{u.email || '—'}</td>
                      <td className="py-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="px-2.5 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="SUPER_ADMIN">Super Admin (CMO)</option>
                          <option value="HOSPITAL_ADMIN">Hospital Admin</option>
                          <option value="DOCTOR">Doctor (Clinician)</option>
                          <option value="NURSE">Nurse (Triage)</option>
                          <option value="RECEPTIONIST">Receptionist (Kiosk Desk)</option>
                          <option value="LAB_STAFF">Lab Staff</option>
                        </select>
                      </td>
                      <td className="py-3 font-mono text-slate-600">{u.phone || '—'}</td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ONBOARD DOCTOR */}
      {/* ------------------------------------------------------------- */}
      {showDoctorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-800">Onboard New Doctor</h3>
              <button onClick={() => setShowDoctorModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleOnboardDoctor} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name & Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Rajesh Khanna"
                  required
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Clinical Specialization *</label>
                <input
                  type="text"
                  placeholder="e.g. Cardiology & Critical Care"
                  required
                  value={docSpecialization}
                  onChange={(e) => setDocSpecialization(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assigned Department *</label>
                <select
                  value={docDeptId}
                  onChange={(e) => setDocDeptId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">License / Medical Registration Number</label>
                <input
                  type="text"
                  placeholder="e.g. MCI-2016-7782"
                  value={docLicense}
                  onChange={(e) => setDocLicense(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98200 00000"
                    value={docContact}
                    onChange={(e) => setDocContact(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Working Hours</label>
                  <input
                    type="text"
                    placeholder="08:00 AM - 04:00 PM"
                    value={docHours}
                    onChange={(e) => setDocHours(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDoctorModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Onboard Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD DEPARTMENT */}
      {/* ------------------------------------------------------------- */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-800">Add Hospital Department</h3>
              <button onClick={() => setShowDeptModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Department Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Dermatology OPD"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Code / Identifier *</label>
                <input
                  type="text"
                  placeholder="e.g. DERM-OPD"
                  required
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: PROVISION STAFF USER */}
      {/* ------------------------------------------------------------- */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-800">Provision Staff User</h3>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Amit Desai"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Hospital Email *</label>
                <input
                  type="email"
                  placeholder="amit.desai@district-hospital.in"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">RBAC Role *</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="DOCTOR">Doctor</option>
                  <option value="HOSPITAL_ADMIN">Hospital Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="NURSE">Nurse</option>
                  <option value="RECEPTIONIST">Receptionist</option>
                  <option value="LAB_STAFF">Lab Staff</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 98200 12345"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Provisioning...' : 'Provision Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

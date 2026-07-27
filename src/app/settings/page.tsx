'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, Upload, FileSpreadsheet, Building2, Shield, Bell, Palette, CreditCard, Check, AlertCircle, Loader2, RefreshCw, Database, User, Key, Eye, EyeOff } from 'lucide-react';
import { useData } from '@/lib/data-context';

interface ProfileDetails {
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
}

export default function SettingsPage() {
  const { projects, risks, departments, importProjects } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'sync'>('profile');
  const [importStatus, setImportStatus] = useState<null | { type: 'success' | 'error'; message: string }>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Profile management states
  const [profile, setProfile] = useState<ProfileDetails>({
    name: 'Neeraj Prakash',
    email: 'neeraj.prakash@bial.ae',
    phone: '+91 98765 43210',
    designation: 'Program Lead',
    department: 'Digital & Data'
  });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  // Security password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [securityStatus, setSecurityStatus] = useState<null | { type: 'success' | 'error'; message: string }>(null);

  // Preferences states
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    darkMode: false,
    compactView: false
  });
  const [prefSaved, setPrefSaved] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('user_profile_details');
    const savedAvatar = localStorage.getItem('user_profile_photo');
    const savedPrefs = localStorage.getItem('user_preferences');
    
    setTimeout(() => {
      if (savedProfile) {
        try {
          setProfile(JSON.parse(savedProfile));
        } catch (e) {
          console.error(e);
        }
      }
      if (savedAvatar) {
        setAvatar(savedAvatar);
      }
      if (savedPrefs) {
        try {
          setPreferences(JSON.parse(savedPrefs));
        } catch (e) {
          console.error(e);
        }
      }
    }, 0);
  }, []);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('user_profile_details', JSON.stringify(profile));
    setProfileSaved(true);
    window.dispatchEvent(new Event('user-profile-updated'));
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setAvatar(base64String);
      localStorage.setItem('user_profile_photo', base64String);
      window.dispatchEvent(new Event('user-profile-updated'));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    localStorage.removeItem('user_profile_photo');
    window.dispatchEvent(new Event('user-profile-updated'));
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityStatus(null);

    if (!currentPassword) {
      setSecurityStatus({ type: 'error', message: 'Current password is required.' });
      return;
    }

    if (newPassword.length < 8) {
      setSecurityStatus({ type: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    const strength = checkPasswordStrength(newPassword);
    if (strength.score < 3) {
      setSecurityStatus({ type: 'error', message: 'Please choose a stronger password.' });
      return;
    }

    // In a mock environment, we succeed
    setSecurityStatus({ type: 'success', message: 'Password updated successfully!' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setSecurityStatus(null), 3000);
  };

  const handlePrefSave = () => {
    localStorage.setItem('user_preferences', JSON.stringify(preferences));
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 3000);
  };

  // Password strength checks
  const checkPasswordStrength = (pwd: string) => {
    const checks = {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[^A-Za-z0-9]/.test(pwd)
    };
    const score = Object.values(checks).filter(Boolean).length;
    return { checks, score };
  };

  const strength = checkPasswordStrength(newPassword);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projects, risks, departments }) });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Xyrenis_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
      setImportStatus({ type: 'success', message: `Exported ${projects.length} projects and ${risks.length} risks to Excel` });
    } catch { setImportStatus({ type: 'error', message: 'Export failed.' }); }
    setIsExporting(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsImporting(true); setImportStatus(null);
    try {
      const formData = new FormData(); formData.append('file', file);
      const response = await fetch('/api/import', { method: 'POST', body: formData });
      const result = await response.json();
      if (result.success && result.projects.length > 0) {
        importProjects(result.projects);
        setImportStatus({ type: 'success', message: `Imported ${result.summary.totalProjects} projects, ${result.summary.totalRisks} risks across ${result.summary.departments} departments` });
      } else { setImportStatus({ type: 'error', message: result.error || 'No projects found.' }); }
    } catch { setImportStatus({ type: 'error', message: 'Failed to read file.' }); }
    setIsImporting(false); if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">Settings</h1>
        <p className="text-[13px] text-[#64748b] mt-0.5">Manage your personal profile, security options, and platform details</p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-[#e2e8f0] gap-4 select-none">
        {[
          { id: 'profile', label: 'Profile Management', icon: User },
          { id: 'security', label: 'Security & Password', icon: Shield },
          { id: 'preferences', label: 'Preferences', icon: Bell },
          { id: 'sync', label: 'Excel Data Sync', icon: FileSpreadsheet }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 pb-2.5 text-[13px] font-semibold transition-all border-b-2 ${
              activeTab === tab.id
                ? 'text-blue-600 border-blue-600'
                : 'text-[#64748b] border-transparent hover:text-[#0f172a] hover:border-[#cbd5e1]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Management Tab */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSave} className="space-y-5 animate-fade-in">
          <div className="x-card p-6 flex flex-col md:flex-row gap-6 items-start">
            <div className="flex flex-col items-center gap-3">
              <div className="relative group w-24 h-24 rounded-full border-2 border-blue-100 flex items-center justify-center bg-blue-50/50 overflow-hidden shadow-inner flex-shrink-0">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-blue-600">{getInitials(profile.name)}</span>
                )}
                <div 
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 text-white text-[10px] font-semibold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex-col gap-1"
                >
                  <Upload className="w-4 h-4" />
                  Upload Photo
                </div>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              {avatar && (
                <button type="button" onClick={handleRemoveAvatar} className="text-[11px] text-red-500 font-semibold hover:underline">
                  Remove Photo
                </button>
              )}
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  value={profile.name} 
                  onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} 
                  className="x-input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={profile.email} 
                  onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} 
                  className="x-input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wider">Phone Number</label>
                <input 
                  type="text" 
                  value={profile.phone} 
                  onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} 
                  className="x-input w-full"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wider">Designation / Title</label>
                <input 
                  type="text" 
                  value={profile.designation} 
                  onChange={e => setProfile(p => ({ ...p, designation: e.target.value }))} 
                  className="x-input w-full"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wider">Department</label>
                <select
                  value={profile.department}
                  onChange={e => setProfile(p => ({ ...p, department: e.target.value }))}
                  className="x-input w-full font-medium"
                >
                  {departments.map(d => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                  <option value="Digital & Data">Digital & Data</option>
                  <option value="Operations">Operations</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            {profileSaved && (
              <span className="text-[12px] text-emerald-600 font-semibold flex items-center gap-1.5 animate-fade-in">
                <Check className="w-4 h-4" /> Profile saved successfully!
              </span>
            )}
            <button type="submit" className="x-btn x-btn-primary py-2 px-5 text-[12px]">
              Save Changes
            </button>
          </div>
        </form>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <form onSubmit={handlePasswordChange} className="space-y-5 animate-fade-in">
          <div className="x-card p-6 space-y-4">
            <h3 className="text-[14px] font-bold text-[#0f172a] flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-500" /> Update Password
            </h3>
            <p className="text-[12px] text-[#64748b]">Change your account password securely. Please use a strong, unique password.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="md:col-span-2 relative">
                <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wider">Current Password</label>
                <input 
                  type={showCurrent ? 'text' : 'password'} 
                  value={currentPassword} 
                  onChange={e => setCurrentPassword(e.target.value)} 
                  className="x-input w-full pr-10"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-7 text-[#94a3b8] hover:text-[#64748b]">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wider">New Password</label>
                <input 
                  type={showNew ? 'text' : 'password'} 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  className="x-input w-full pr-10"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-7 text-[#94a3b8] hover:text-[#64748b]">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wider">Confirm New Password</label>
                <input 
                  type={showConfirm ? 'text' : 'password'} 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  className="x-input w-full pr-10"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-7 text-[#94a3b8] hover:text-[#64748b]">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password strength checks */}
            {newPassword && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Password Strength</span>
                  <span className={`text-[11px] font-bold ${
                    strength.score <= 1 ? 'text-red-500' :
                    strength.score === 2 ? 'text-amber-500' :
                    strength.score === 3 ? 'text-blue-500' :
                    'text-emerald-500'
                  }`}>
                    {strength.score <= 1 ? 'Weak' :
                     strength.score === 2 ? 'Medium' :
                     strength.score === 3 ? 'Strong' :
                     'Very Strong'}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex gap-0.5">
                  <div className={`h-full flex-1 rounded-l-full transition-all duration-300 ${strength.score >= 1 ? (strength.score === 1 ? 'bg-red-500' : strength.score === 2 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'}`} />
                  <div className={`h-full flex-1 transition-all duration-300 ${strength.score >= 2 ? (strength.score === 2 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'}`} />
                  <div className={`h-full flex-1 transition-all duration-300 ${strength.score >= 3 ? 'bg-emerald-500' : 'bg-transparent'}`} />
                  <div className={`h-full flex-1 rounded-r-full transition-all duration-300 ${strength.score >= 4 ? 'bg-emerald-500' : 'bg-transparent'}`} />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${strength.checks.length ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className={strength.checks.length ? 'text-[#334155] font-semibold' : 'text-[#64748b]'}>Min 8 characters</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${strength.checks.upper ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className={strength.checks.upper ? 'text-[#334155] font-semibold' : 'text-[#64748b]'}>Contains uppercase</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${strength.checks.number ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className={strength.checks.number ? 'text-[#334155] font-semibold' : 'text-[#64748b]'}>Contains number</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${strength.checks.special ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className={strength.checks.special ? 'text-[#334155] font-semibold' : 'text-[#64748b]'}>Special character</span>
                  </div>
                </div>
              </div>
            )}

            {securityStatus && (
              <div className={`p-3 rounded-lg flex items-start gap-2 border ${
                securityStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {securityStatus.type === 'success' ? <Check className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                <span className="text-[12px] font-medium">{securityStatus.message}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button type="submit" className="x-btn x-btn-primary py-2 px-5 text-[12px]">
              Change Password
            </button>
          </div>
        </form>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="space-y-5 animate-fade-in">
          <div className="x-card p-6 space-y-4">
            <h3 className="text-[14px] font-bold text-[#0f172a] flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-500" /> Notifications & Display
            </h3>
            <p className="text-[12px] text-[#64748b]">Configure your settings for communication preferences and UI modes.</p>

            <div className="divide-y divide-[#e2e8f0]">
              <div className="flex items-center justify-between py-3">
                <div>
                  <h4 className="text-[13px] font-semibold text-[#334155]">Email Notifications</h4>
                  <p className="text-[11px] text-[#94a3b8]">Receive reports and timeline alerts via email</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={preferences.emailNotifications}
                  onChange={e => setPreferences(p => ({ ...p, emailNotifications: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <h4 className="text-[13px] font-semibold text-[#334155]">Push Notifications</h4>
                  <p className="text-[11px] text-[#94a3b8]">Receive updates on project dependencies in real-time</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={preferences.pushNotifications}
                  onChange={e => setPreferences(p => ({ ...p, pushNotifications: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <h4 className="text-[13px] font-semibold text-[#334155]">Dark Theme (Preview)</h4>
                  <p className="text-[11px] text-[#94a3b8]">Enable experimental dark palette interface</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={preferences.darkMode}
                  onChange={e => setPreferences(p => ({ ...p, darkMode: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <h4 className="text-[13px] font-semibold text-[#334155]">Compact Row View</h4>
                  <p className="text-[11px] text-[#94a3b8]">Optimize lists with tighter padding</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={preferences.compactView}
                  onChange={e => setPreferences(p => ({ ...p, compactView: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            {prefSaved && (
              <span className="text-[12px] text-emerald-600 font-semibold flex items-center gap-1.5 animate-fade-in">
                <Check className="w-4 h-4" /> Preferences saved!
              </span>
            )}
            <button onClick={handlePrefSave} className="x-btn x-btn-primary py-2 px-5 text-[12px]">
              Save Preferences
            </button>
          </div>
        </div>
      )}

      {/* Sync (Excel Import/Export) Tab */}
      {activeTab === 'sync' && (
        <div className="glass-card p-6 border-blue-200 bg-gradient-to-r from-blue-50/50 to-emerald-50/50 animate-fade-in">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#0f172a]">Excel Data Sync</h2>
              <p className="text-[12px] text-[#64748b] mt-0.5">Import/export data maintaining workbook compatibility.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-white border border-[#e2e8f0]">
            <Database className="w-4 h-4 text-blue-500" />
            <p className="text-[12px] text-[#334155]">
              <span className="font-semibold">{projects.length}</span> projects · <span className="font-semibold">{risks.length}</span> risks · <span className="font-semibold">{departments.length}</span> departments
            </p>
            <RefreshCw className="w-3.5 h-3.5 text-[#94a3b8] ml-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-white border border-[#e2e8f0]">
              <div className="flex items-center gap-2 mb-2"><Upload className="w-4 h-4 text-blue-500" /><h3 className="text-[12px] font-semibold text-[#334155]">Import from Excel</h3></div>
              <p className="text-[11px] text-[#94a3b8] mb-3">Upload .xlsx to import projects and risks.</p>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="btn-primary w-full justify-center text-[12px] py-2">
                {isImporting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing...</> : <><Upload className="w-3.5 h-3.5" /> Choose File</>}
              </button>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#e2e8f0]">
              <div className="flex items-center gap-2 mb-2"><Download className="w-4 h-4 text-emerald-500" /><h3 className="text-[12px] font-semibold text-[#334155]">Export to Excel</h3></div>
              <p className="text-[11px] text-[#94a3b8] mb-3">Download Excel export with all data sheets.</p>
              <button type="button" onClick={handleExport} disabled={isExporting} className="btn-secondary w-full justify-center text-[12px] py-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                {isExporting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</> : <><Download className="w-3.5 h-3.5" /> Export ({projects.length} projects)</>}
              </button>
            </div>
          </div>

          {importStatus && (
            <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${importStatus.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              {importStatus.type === 'success' ? <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
              <p className={`text-[12px] ${importStatus.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>{importStatus.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

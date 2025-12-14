import { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { request } from '../services/httpClient';

export default function AdminLogin() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        university: 'SCA',
        roll_no: 'ADMIN',
        full_name: 'System Administrator',
        password: 'admin2025'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Admin login
            const response = await request<{ access_token: string }>('/api/auth/login', {
                method: 'POST',
                body: formData,
                skipAuth: true
            });

            // Save token and admin info
            localStorage.setItem('token', response.access_token);
            localStorage.setItem('admin', JSON.stringify({
                university: formData.university,
                roll_no: formData.roll_no,
                full_name: formData.full_name,
                is_admin: true
            }));

            // Clear any student data
            localStorage.removeItem('student');

            // Redirect to admin dashboard
            navigate('/admin');
        } catch (err: any) {
            setError(err.message || 'Admin login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
            {/* Background Decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-red-100/50 dark:bg-red-900/20 rounded-full blur-3xl -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-orange-100/50 dark:bg-orange-900/20 rounded-full blur-3xl translate-y-1/2"></div>
                <div className="absolute top-1/2 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-200 dark:via-red-800 to-transparent opacity-50"></div>
                <div className="absolute left-1/2 inset-y-0 w-px bg-gradient-to-b from-transparent via-red-200 dark:via-red-800 to-transparent opacity-50"></div>
            </div>

            <div className="relative w-full max-w-md z-10">
                {/* Logo/Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl mb-6 shadow-lg border border-red-100 dark:border-red-900/30">
                        <svg className="w-8 h-8 text-red-600 dark:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Admin Portal</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg">System Administrator Access</p>
                </div>

                {/* Admin Login Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-red-100 dark:border-red-900/30 shadow-xl shadow-red-100/30 dark:shadow-red-900/20 transition-colors duration-300">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* University */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                University
                            </label>
                            <div className="relative">
                                <select
                                    name="university"
                                    value={formData.university}
                                    onChange={handleChange}
                                    className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="SCA">Smart Campus Academy</option>
                                    <option value="MIT">MIT</option>
                                    <option value="STAN">Stanford</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Admin Username */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Admin Username
                            </label>
                            <input
                                type="text"
                                name="roll_no"
                                value={formData.roll_no}
                                onChange={handleChange}
                                placeholder="ADMIN"
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                                required
                            />
                        </div>

                        {/* Full Name */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Full Name
                            </label>
                            <input
                                type="text"
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleChange}
                                placeholder="Administrator Name"
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                                required
                            />
                        </div>

                        {/* Admin Access Code */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Admin Access Code
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter admin access code"
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                                required
                            />
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                Default code: <span className="font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1 py-0.5 rounded">admin2025</span>
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex gap-3 items-start">
                                <svg className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
                            </div>
                        )}

                        {/* Warning Box */}
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 rounded-xl">
                            <div className="flex items-start">
                                <svg className="w-5 h-5 text-orange-500 dark:text-orange-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <p className="text-xs text-orange-700 dark:text-orange-300">
                                    <strong>Restricted Access:</strong> This portal is monitored. Unauthorized access attempts will be logged.
                                </p>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 px-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg shadow-red-500/20 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Authenticating...</span>
                                </>
                            ) : (
                                <>
                                    <span>Admin Login</span>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Links */}
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 text-center">
                        <Link
                            to="/login"
                            className="inline-flex items-center text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            Back to Student Login
                        </Link>
                    </div>
                </div>

                {/* Security Footer */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                        Secure Admin Portal &bull; End-to-End Encryption
                    </p>
                </div>
            </div>
        </div>
    );
}

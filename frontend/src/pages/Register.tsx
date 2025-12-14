import { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { request } from '../services/httpClient';

const UNIVERSITIES = [
    { code: 'SCA', name: 'Smart Campus Academy', accessCode: 'smart2025' },
    { code: 'MIT', name: 'Massachusetts Institute of Technology', accessCode: 'mitsecure' },
    { code: 'STAN', name: 'Stanford University', accessCode: 'stanfordAI' }
];

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        university: 'SCA',
        roll_no: '',
        full_name: '',
        password: ''
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
            // Register/Login (backend handles both)
            // Using skipAuth since this is registration
            await request<any>('/api/auth/login', {
                method: 'POST',
                body: formData,
                skipAuth: true
            });

            // Registration successful
            alert('Registration successful! You can now login.');
            navigate('/login');
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please check your information.');
        } finally {
            setLoading(false);
        }
    };

    const selectedUniversity = UNIVERSITIES.find(u => u.code === formData.university);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20"></div>

            <div className="relative w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-lg rounded-2xl mb-4 border border-white/20">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
                    <p className="text-white/70">Student Registration</p>
                </div>

                {/* Registration Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleChange}
                                placeholder="Enter your full name"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                required
                            />
                        </div>

                        {/* University Selection */}
                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                University
                            </label>
                            <select
                                name="university"
                                value={formData.university}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                required
                            >
                                {UNIVERSITIES.map(uni => (
                                    <option key={uni.code} value={uni.code} className="bg-gray-900">
                                        {uni.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Roll Number */}
                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Roll Number / Student ID
                            </label>
                            <input
                                type="text"
                                name="roll_no"
                                value={formData.roll_no}
                                onChange={handleChange}
                                placeholder="e.g., 001, AMIR001, DEV002"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                required
                            />
                        </div>

                        {/* University Access Code */}
                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                University Access Code
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter university access code"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                required
                            />
                            {selectedUniversity && (
                                <p className="mt-2 text-xs text-white/60">
                                    Access code for {selectedUniversity.name}: <span className="font-mono text-blue-300">{selectedUniversity.accessCode}</span>
                                </p>
                            )}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                                <p className="text-sm text-red-200">{error}</p>
                            </div>
                        )}

                        {/* Info Box */}
                        <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl">
                            <p className="text-xs text-blue-200">
                                <strong>Note:</strong> The access code is provided by your university. Contact your admin if you don't have one.
                            </p>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating account...
                                </span>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    {/* Footer Links */}
                    <div className="mt-6 text-center space-y-2">
                        <p className="text-sm text-white/70">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="text-blue-300 hover:text-blue-200 font-medium transition-colors"
                            >
                                Login here
                            </Link>
                        </p>
                        <Link
                            to="/admin-login"
                            className="block text-sm text-purple-300 hover:text-purple-200 transition-colors"
                        >
                            Admin Login →
                        </Link>
                    </div>
                </div>

                {/* Info Card */}
                <div className="mt-6 bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10">
                    <p className="text-xs text-white/60 text-center">
                        🔒 Your data is protected with multi-tenant isolation
                    </p>
                </div>
            </div>
        </div>
    );
}

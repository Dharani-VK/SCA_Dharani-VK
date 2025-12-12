import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../utils/constants'
import { useAuth } from '../context/AuthContext'



type User = {
    id: number
    university: string
    roll_no: string
    full_name: string
    is_active: boolean
    is_admin: boolean
}

export default function AdminDashboard() {
    const navigate = useNavigate()
    // const { token } = useAuth()  <-- Removing this dependency
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // Add user form state
    const [showAddForm, setShowAddForm] = useState(false)
    const [newUser, setNewUser] = useState({
        university: 'SCA',
        roll_no: '',
        full_name: '',
        password: '',
        is_admin: false
    })
    const [addLoading, setAddLoading] = useState(false)
    const [addError, setAddError] = useState('')

    // CRITICAL: Verify admin access
    useEffect(() => {
        const adminData = localStorage.getItem('admin')
        if (!adminData) {
            navigate('/dashboard', { replace: true })
            return
        }

        try {
            const admin = JSON.parse(adminData)
            if (!admin.is_admin) {
                navigate('/dashboard', { replace: true })
                return
            }
        } catch {
            navigate('/dashboard', { replace: true })
            return
        }
    }, [navigate])

    const fetchUsers = async () => {
        const token = localStorage.getItem('token')
        try {
            if (!token) {
                setError('No authentication token found. Please login again.')
                setLoading(false)
                return
            }

            const res = await fetch(`${API_BASE_URL}/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!res.ok) {
                const errorText = await res.text()
                console.error('API Error:', res.status, errorText)
                throw new Error(`Failed to load users: ${res.status} ${res.statusText}`)
            }

            const data = await res.json()
            setUsers(data)
            setError('') // Clear any previous errors
        } catch (err: any) {
            console.error('Fetch users error:', err);
            const errorMessage = err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);

            // Auto-redirect to login if unauthorized
            if (errorMessage.includes("Could not validate credentials") || errorMessage.includes("Unauthenticated")) {
                setTimeout(() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('admin'); // Changed from 'user' to 'admin' for admin dashboard context
                    navigate('/admin-login'); // Changed from '/' to '/admin-login' for admin context
                }, 2000);
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, []) // Removed token dependency

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault()
        setAddError('')
        setAddLoading(true)
        const token = localStorage.getItem('token')

        try {
            const res = await fetch(`${API_BASE_URL}/admin/users`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newUser)
            })

            if (!res.ok) {
                const data = await res.json()

                // Handle FastAPI validation errors (422)
                if (res.status === 422 && data.detail && Array.isArray(data.detail)) {
                    const errors = data.detail.map((err: any) =>
                        `${err.loc.join('.')}: ${err.msg}`
                    ).join(', ')
                    throw new Error(errors)
                }

                throw new Error(data.detail || 'Failed to add user')
            }

            setNewUser({
                university: 'SCA',
                roll_no: '',
                full_name: '',
                password: '',
                is_admin: false
            })
            setShowAddForm(false)
            await fetchUsers()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err)
            console.error('Add user error:', errorMessage)
            setAddError(errorMessage)
        } finally {
            setAddLoading(false)
        }
    }

    const handleDeleteUser = async (userId: number, userName: string) => {
        if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
            return
        }

        const token = localStorage.getItem('token')
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.detail || 'Failed to delete user')
            }

            await fetchUsers()
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete user')
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('admin')
        localStorage.removeItem('student')
        navigate('/admin-login')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading admin dashboard...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-900">
            {/* Header */}
            <header className="bg-black/30 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">User Management</h1>
                                <p className="text-sm text-gray-400">Admin Portal</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate('/admin/performance')}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transition-colors"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                Performance
                            </button>
                            <button
                                onClick={() => setShowAddForm(!showAddForm)}
                                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add User
                            </button>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Add User Form */}
                {showAddForm && (
                    <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-lg rounded-2xl border-2 border-purple-500/30 p-6 shadow-2xl mb-8">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                            <svg className="w-6 h-6 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            Add New User
                        </h3>

                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">University</label>
                                    <select
                                        value={newUser.university}
                                        onChange={(e) => setNewUser({ ...newUser, university: e.target.value })}
                                        className="w-full rounded-lg border border-white/20 bg-white/5 backdrop-blur-sm px-4 py-2 text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                                        required
                                    >
                                        <option value="SCA" className="bg-gray-800">Smart Campus Academy</option>
                                        <option value="MIT" className="bg-gray-800">MIT</option>
                                        <option value="STAN" className="bg-gray-800">Stanford</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">Roll Number</label>
                                    <input
                                        type="text"
                                        value={newUser.roll_no}
                                        onChange={(e) => setNewUser({ ...newUser, roll_no: e.target.value })}
                                        placeholder="e.g., 101"
                                        className="w-full rounded-lg border border-white/20 bg-white/5 backdrop-blur-sm px-4 py-2 text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        value={newUser.full_name}
                                        onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                                        placeholder="e.g., John Doe"
                                        className="w-full rounded-lg border border-white/20 bg-white/5 backdrop-blur-sm px-4 py-2 text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">Password</label>
                                    <input
                                        type="password"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        placeholder="Enter password"
                                        className="w-full rounded-lg border border-white/20 bg-white/5 backdrop-blur-sm px-4 py-2 text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="is_admin"
                                    checked={newUser.is_admin}
                                    onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
                                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                                />
                                <label htmlFor="is_admin" className="ml-2 text-sm font-medium text-gray-300">
                                    Grant admin privileges
                                </label>
                            </div>

                            {addError && (
                                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                                    <p className="text-sm text-red-200">{addError}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={addLoading}
                                    className="flex-1 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    {addLoading ? 'Adding...' : 'Add User'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddForm(false)
                                        setAddError('')
                                    }}
                                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Users Table */}
                {error && <p className="text-red-400 mb-4">{error}</p>}

                <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                    <div className="px-6 py-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-b border-white/10">
                        <h3 className="text-lg font-bold text-white">All Users ({users.length})</h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 text-xs uppercase text-gray-400 border-b border-white/10">
                                <tr>
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">University</th>
                                    <th className="px-6 py-4">Roll No</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-mono text-gray-400">#{user.id}</td>
                                        <td className="px-6 py-4 font-medium text-white">{user.full_name}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
                                                {user.university}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-300">{user.roll_no}</td>
                                        <td className="px-6 py-4">
                                            {user.is_admin ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300">
                                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    Admin
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
                                                    Student
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.is_active ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                                                    <span className="w-2 h-2 mr-1 bg-green-400 rounded-full"></span>
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {!user.is_admin && (
                                                <button
                                                    onClick={() => handleDeleteUser(user.id, user.full_name)}
                                                    className="inline-flex items-center px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold rounded-lg transition-colors"
                                                    title="Delete user"
                                                >
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Delete
                                                </button>
                                            )}
                                            {user.is_admin && (
                                                <span className="text-xs text-gray-500 italic">Protected</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <p className="text-lg font-medium">No users found</p>
                                            <p className="text-sm mt-1">Click "Add User" to create the first user</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    )
}

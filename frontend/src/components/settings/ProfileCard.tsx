import Card from '../common/Card'
import Avatar from '../common/Avatar'
import Badge from '../common/Badge'
import Button from '../common/Button'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'

function ProfileCard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <Card
      title="Student Profile"
      subtitle="Your account information from the university system."
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar name={user?.full_name || 'Student'} />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {user?.full_name || 'N/A'}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Student at {user?.university || 'N/A'}
            </p>
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Roll Number</span>
            <Badge tone="default">{user?.roll_no || 'N/A'}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">University</span>
            <Badge tone="success">{user?.university || 'N/A'}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Account Status</span>
            <Badge tone="success">Active</Badge>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-200">
          <p className="font-medium mb-1">📌 Note</p>
          <p>Your profile information is managed by your university. Contact your administrator to update your details.</p>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            variant="secondary"
            onClick={handleLogout}
            className="w-full justify-center bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/30 border-rose-200 dark:border-rose-800"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            Sign Out & Switch Account
          </Button>

        </div>
      </div>
    </Card>
  )
}

export default ProfileCard

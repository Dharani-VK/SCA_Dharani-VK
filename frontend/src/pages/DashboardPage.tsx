import { motion } from "framer-motion"

import QuickActions from '../components/dashboard/QuickActions'
import UploadShortcut from '../components/dashboard/UploadShortcut'
import RecentFiles from '../components/dashboard/RecentFiles'
import MetricsGrid from '../components/dashboard/MetricsGrid'
import ActivityTimeline from '../components/dashboard/ActivityTimeline'
import UpcomingEvents from '../components/dashboard/UpcomingEvents'
import LearningPipeline from '../components/dashboard/LearningPipeline'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import PageHeader from '../components/layout/PageHeader'

import DailyQuote from '../components/dashboard/DailyQuote'
import StudyStreak from '../components/dashboard/StudyStreak'

import { useDashboard } from '../hooks/useDashboard'
import { useAuth } from '../context/AuthContext'

function DashboardPage() {
  const { user } = useAuth()
  const { data, loading, error, refresh } = useDashboard()

  const overview = data ?? {
    metrics: [],
    activity: [],
    events: [],
    systems: [],
    recommendations: [],
  }

  return (
    <div className="space-y-8">

      {/* ---------------- HEADER ---------------- */}
      <PageHeader
        eyebrow={user?.university || "Overview"}
        title={`Welcome back, ${user?.full_name || 'Student'}! 👋`}
        subtitle="Your personalized learning dashboard. All your documents, quizzes, and study materials in one place."
        actions={
          <Button variant="secondary" onClick={refresh}>
            Refresh data
          </Button>
        }
      />

      {/* ===========================================================
          NEW COMPACT SNAPSHOT LAYOUT 
          Left: Profile + Quote
          Right: Compact Study Streak
      ============================================================ */}
      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">

        {/* LEFT SIDE – Profile + Quote */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Card>
            <div className="space-y-6">

              {/* Profile Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">
                  Student Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Name</span>
                    <span className="font-medium text-white">{user?.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Roll Number</span>
                    <Badge tone="default">{user?.roll_no}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">University</span>
                    <Badge tone="success">{user?.university}</Badge>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-700/60" />

              {/* Daily Quote */}
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                <h3 className="text-sm font-semibold text-slate-300 mb-2">
                  Daily Inspiration
                </h3>
                <DailyQuote  />
              </motion.div>

            </div>
          </Card>
        </motion.div>

        {/* RIGHT SIDE – COMPACT STUDY STREAK  */}
        <motion.div
          initial={{ opacity: 0, x: 22 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Card title="Study Streak" subtitle="Your daily learning consistency.">
            <div className="mt-2">
              <StudyStreak  />
            </div>
          </Card>
        </motion.div>

      </div>

      {/* ===========================================================
          LOADING + ERROR HANDLING
      ============================================================ */}
      {loading && (
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading dashboard insights...</p>
        </Card>
      )}

      {error && (
        <Card
          actions={<Button variant="secondary" onClick={refresh}>Retry</Button>}
        >
          <p className="text-sm text-rose-400">{error}</p>
        </Card>
      )}

      {/* ===========================================================
          METRICS GRID
      ============================================================ */}
      {overview.metrics.length > 0 && <MetricsGrid metrics={overview.metrics} />}

      {/* ===========================================================
          MAIN GRID (Pipeline + Actions + Timeline)
      ============================================================ */}
      <section className="grid gap-6 2xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <LearningPipeline />
          <QuickActions />
          {overview.activity.length > 0 && <ActivityTimeline items={overview.activity} />}
          <UploadShortcut />
        </div>

        <div className="space-y-6">
          <Card title="AI Readiness" subtitle="Performance indicators based on your knowledge base.">
            <div className="space-y-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Documents processed</span>
                <Badge tone="success">98%</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Response confidence</span>
                <Badge tone="default">High</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Average latency</span>
                <Badge tone="warning">0.8s</Badge>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ===========================================================
          FOOTER GRID
      ============================================================ */}
      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <RecentFiles />
        {overview.events.length > 0 && <UpcomingEvents events={overview.events} />}
      </section>

    </div>
  )
}

export default DashboardPage

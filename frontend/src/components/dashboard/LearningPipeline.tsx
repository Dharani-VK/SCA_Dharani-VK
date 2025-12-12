import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../common/Card'
import Button from '../common/Button'
import type { KnowledgeLevel } from '../../types/quiz'

/* ================================================================
   FIX: Proper Step type so "interactive" is allowed
   ================================================================ */
type Step = {
  id: string
  title: string
  description: string
  icon: string
  interactive?: boolean   // <-- Optional field, fixes CI error
}

/* ================================================================
   Steps (NO functional changes — just typed correctly)
   ================================================================ */
const steps: Step[] = [
  {
    id: 'upload',
    title: 'File Uploaded',
    description: 'Learners drop notes, guides, or slide decks into the assistant.',
    icon: '📁',
  },
  {
    id: 'extract',
    title: 'Text Extractor',
    description: 'Automated parsing handles PDF, DOCX, and spreadsheets without manual cleanup.',
    icon: '📚',
  },
  {
    id: 'chunk',
    title: 'Chunking & Embeddings',
    description: 'Content is segmented and transformed into fast semantic embeddings.',
    icon: '🧠',
  },
  {
    id: 'vector',
    title: 'Vector Database',
    description: 'Adaptive semantic search surfaces just-in-time information.',
    icon: '🔎',
  },
  {
    id: 'personalize',
    title: 'Personalization Engine',
    description: 'Learner profile and performance signals tune the recommendations.',
    icon: '🎯',
  },
  {
    id: 'llm',
    title: 'Generative LLM',
    description: 'Quiz prompts are generated with context-rich reasoning chains.',
    icon: '💬',
  },
  {
    id: 'quiz',
    title: 'Fully Customized Quiz',
    description: 'Students practise with adaptive questions that match their confidence.',
    icon: '📘',
    interactive: true,
  },
  {
    id: 'score',
    title: 'Score & Adaptive Learning',
    description: 'Every attempt updates the learner model and keeps the cycle personal.',
    icon: '📊',
  },
]

/* ================================================================
   Knowledge level options
   ================================================================ */
const knowledgeOptions: Array<{ label: string; value: KnowledgeLevel; helper: string }> = [
  { label: 'I need the basics', value: 'beginner', helper: 'We will start easy and build confidence.' },
  { label: "I know the core ideas", value: 'intermediate', helper: 'Expect a balanced mix of questions.' },
  { label: 'I feel confident already', value: 'advanced', helper: 'We will emphasise stretch concepts.' },
]

/* ================================================================
   Component
   ================================================================ */
function LearningPipeline() {
  const [activeId, setActiveId] = useState<Step['id']>('quiz')
  const [topic, setTopic] = useState('')
  const [questionCount, setQuestionCount] = useState(5)
  const [knowledgeLevel, setKnowledgeLevel] = useState<KnowledgeLevel>('intermediate')
  const navigate = useNavigate()

  const activeStep = useMemo(
    () => steps.find((s) => s.id === activeId) ?? steps[steps.length - 1],
    [activeId]
  )

  const handleQuickStart = () => {
    if (!topic.trim()) return

    navigate('/quiz', {
      state: {
        quickStart: {
          topic: topic.trim(),
          totalQuestions: questionCount,
          knowledgeLevel,
          sourceMode: 'all',
        },
      },
    })
  }

  return (
    <Card
      title="Learning pipeline"
      subtitle="Select any stage to see how the Smart Campus Assistant adapts content."
      className="overflow-hidden"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        
        {/* LEFT SIDE STEPS */}
        <ol className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          {steps.map((step) => {
            const isActive = step.id === activeStep.id
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(step.id)}
                  className={`group flex w-full flex-col gap-1 rounded-2xl border px-4 py-5 text-left transition ${
                    isActive
                      ? 'border-primary-400 bg-primary-50 text-primary-700 shadow-md dark:border-primary-500 dark:bg-primary-500/15 dark:text-primary-100'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-primary-200 hover:bg-primary-50/40 hover:text-primary-600 dark:border-slate-800/80 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:border-primary-400/60 dark:hover:bg-slate-900/60 dark:hover:text-primary-200'
                  }`}
                >
                  <span className="text-xl">{step.icon}</span>
                  <span className="text-sm font-semibold uppercase tracking-wide">{step.title}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{step.description}</span>
                </button>
              </li>
            )
          })}
        </ol>

        {/* RIGHT SIDE PANEL */}
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/60">
          <header className="mb-4 space-y-1">
            <div className="text-2xl">{activeStep.icon}</div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{activeStep.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{activeStep.description}</p>
          </header>

          {activeStep.interactive ? (
            <div className="space-y-4">

              {/* Topic */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Topic focus
                </label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Types of sensors"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Question Count */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Number of questions
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={3}
                    max={15}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="flex-1 accent-primary-500"
                  />
                  <span className="w-12 text-right text-sm font-semibold text-slate-700 dark:text-slate-100">
                    {questionCount}
                  </span>
                </div>
              </div>

              {/* Knowledge Level */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Confidence level
                </label>
                <div className="space-y-2">
                  {knowledgeOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer flex-col gap-1 rounded-xl border px-3 py-2 text-sm transition ${
                        knowledgeLevel === opt.value
                          ? 'border-primary-400 bg-primary-50 text-primary-600 dark:border-primary-500 dark:bg-primary-500/20 dark:text-primary-100'
                          : 'border-slate-300 bg-white text-slate-600 hover:border-primary-200 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-primary-500/40 dark:hover:text-primary-200'
                      }`}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span>{opt.label}</span>
                        <input
                          type="radio"
                          name="quiz-confidence"
                          value={opt.value}
                          checked={knowledgeLevel === opt.value}
                          onChange={() => setKnowledgeLevel(opt.value)}
                          className="accent-primary-500"
                        />
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{opt.helper}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                variant="primary"
                onClick={handleQuickStart}
                disabled={!topic.trim()}
                className="w-full"
              >
                Launch adaptive quiz
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Select the quiz stage to configure questions, or continue exploring how upstream stages personalize the
              experience.
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}

export default LearningPipeline

import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Shell } from '@/components/shell/Shell'
import Home from '@/pages/Home'
import LessonPage from '@/pages/LessonPage'

const Sandbox = lazy(() => import('@/pages/Sandbox'))
const Shortcuts = lazy(() => import('@/pages/Shortcuts'))
const Glossary = lazy(() => import('@/pages/Glossary'))
// dev-only thumbnail studio (see scripts/render-thumbs.mjs); compiled out of production builds
const ThumbStudio = import.meta.env.DEV ? lazy(() => import('@/dev/ThumbStudio')) : null

function PageFallback() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '70vh' }}>
      <div className="spinner" />
    </div>
  )
}

export default function App() {
  if (ThumbStudio && window.location.pathname === '/__studio') {
    return (
      <Suspense fallback={null}>
        <ThumbStudio />
      </Suspense>
    )
  }
  return (
    <Shell>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/learn/:lessonId" element={<LessonPage />} />
          <Route path="/sandbox" element={<Sandbox />} />
          <Route path="/shortcuts" element={<Shortcuts />} />
          <Route path="/glossary" element={<Glossary />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </Shell>
  )
}

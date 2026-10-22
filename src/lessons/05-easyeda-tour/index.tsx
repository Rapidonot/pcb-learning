import type { LessonContent } from '../types'
import { StubScene, StubArticle } from '../stub'

const lesson: LessonContent = {
  Scene: StubScene,
  goal: 'This lesson is being written.',
  missions: [],
  Article: StubArticle,
  build: { steps: [] },
  quiz: [],
  terms: [],
}

export default lesson

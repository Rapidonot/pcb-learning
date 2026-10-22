import type { LessonContent } from '../types'
import { Scene } from './Scene'
import './lesson17.css'

function Article() {
  return <p className="lead">Article coming.</p>
}

const lesson: LessonContent = {
  Scene,
  goal: 'Solder Blinky smallest parts first, fix what goes wrong, check for shorts, then power it up and watch it blink.',
  missions: [
    { id: 'order', text: 'Solder every part, smallest and lowest first' },
    { id: 'bridge', text: 'Find and remove a solder bridge with solder wick' },
    { id: 'short', text: 'Pass the short-circuit check (+5 V to GND) before powering' },
    { id: 'blink', text: 'Power up at 5 V with a current limit and see it blink' },
  ],
  Article,
  build: { steps: [] },
  quiz: [],
  terms: [],
}

export default lesson

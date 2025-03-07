// src/components/WorkoutCarousel.jsx
import { useState } from 'react'
import WorkoutCard from './WorkoutCard'
import { ThemedButton } from '@/components/ThemedComponents'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/solid'

const workouts = [
  {
    name: '25.1',
    title: 'CFG25 Open 25.1',
    description: 'As many rounds and reps as possible in 15 minutes of:',
    details: [
      '3 lateral burpees over the dumbbell',
      '3 dumbbell hang clean-to-overheads',
      '30-foot walking lunge (2 x 15 feet)',
    ],
    progression:
      'After each round, add 3 reps to the burpees and hang clean-to-overheads.',
    weights: 'Women: 35-lb (15-kg), Men: 50-lb (22.5-kg)',
    scorecardUrl: 'https://games.crossfit.com/workouts/open/2025/1',
  },
  {
    name: '25.2',
    title: 'CFG25 Open 25.2',
    description: 'As many rounds and reps as possible in 12 minutes of:',
    details: [
      '21 pull-ups',
      '42 double-unders',
      '21 thrusters (weight 1)',
      '18 chest-to-bar pull-ups',
      '36 double-unders',
      '18 thrusters (weight 2)',
      '15 bar muscle-ups',
      '30 double-unders',
      '15 thrusters (weight 3)',
    ],
    progression:
      'Record your tiebreak time after the designated set if not completed. See official rules for details.',
    weights: 'Women: 65, 75, 85 lb; Men: 95, 115, 135 lb',
    scorecardUrl: 'https:/games.crossfit.com/workouts/open/2025/2',
  },
  {
    name: '25.3',
    title: 'CFG25 Open 25.3',
    description: 'Workout details for 25.3 will be released soon.',
    details: [],
    scorecardUrl: 'https:/games.crossfit.com/workouts/open/2025/3',
  },
]

const WorkoutCarousel = () => {
  // Default to workout '25.2'
  const defaultIndex = workouts.findIndex(w => w.name === '25.2')
  const [currentIndex, setCurrentIndex] = useState(
    defaultIndex >= 0 ? defaultIndex : 0
  )

  const handlePrev = () => {
    setCurrentIndex(prevIndex =>
      prevIndex === 0 ? workouts.length - 1 : prevIndex - 1
    )
  }

  const handleNext = () => {
    setCurrentIndex(prevIndex =>
      prevIndex === workouts.length - 1 ? 0 : prevIndex + 1
    )
  }

  return (
    <div className="relative">
      {/* Chevron buttons at the top */}
      <div className="absolute top-0 left-0 z-10">
        <ThemedButton
          styleType="ghost" // Use ghost or bg-transparent styling
          onClick={handlePrev}
          className="p-2 bg-transparent"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </ThemedButton>
      </div>
      <div className="overflow-x-auto flex justify-center">
        <div className="min-w-[300px]">
          <WorkoutCard workout={workouts[currentIndex]} />
        </div>
      </div>
      <div className="absolute top-0 right-0 z-10">
        <ThemedButton
          styleType="ghost"
          onClick={handleNext}
          className="p-2 bg-transparent"
        >
          <ChevronRightIcon className="h-6 w-6" />
        </ThemedButton>
      </div>
    </div>
  )
}

export default WorkoutCarousel

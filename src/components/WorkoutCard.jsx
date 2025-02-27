// src/components/WorkoutCard.jsx
import React from 'react'
import {
  ThemedView,
  ThemedText,
  ThemedButton,
} from '@/components/ThemedComponents'

const WorkoutCard = () => {
  const scorecardUrl = 'https://games.crossfit.com/workouts/open/2025'

  return (
    <ThemedView
      styleType="default"
      className="rounded shadow-lg bg-gray-100 p-4 cursor-pointer hover:shadow-xl transition-shadow"
    >
      <ThemedText
        as="h2"
        styleType="primary"
        className="text-xl font-bold mb-2"
      >
        CFG25 Open 25.1
      </ThemedText>
      <ThemedText as="p" styleType="default" className="mb-2">
        As many rounds and reps as possible in 15 minutes of:
      </ThemedText>
      <ul className="list-disc list-inside mb-2">
        <li>3 lateral burpees over the dumbbell</li>
        <li>3 dumbbell hang clean-to-overheads</li>
        <li>30-foot walking lunge (2 x 15 feet)</li>
      </ul>
      <ThemedText as="p" styleType="default" className="mb-2">
        <strong>Progression:</strong> After each round, add 3 reps to the
        burpees and hang clean-to-overheads.
      </ThemedText>
      <ThemedText as="p" styleType="default" className="mb-4">
        <strong>Dumbbell Weights:</strong> Women: 35-lb (15-kg), Men: 50-lb
        (22.5-kg)
      </ThemedText>
      <ThemedButton
        styleType="primary"
        onClick={() => window.open(scorecardUrl, '_blank')}
        className="w-full"
      >
        View Official Workout
      </ThemedButton>
    </ThemedView>
  )
}

export default WorkoutCard

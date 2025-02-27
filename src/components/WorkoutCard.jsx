import React from 'react'
import { ThemedText } from '@/components/ThemedComponents'

const WorkoutCard = () => {
  return (
    <div className="bg-white shadow-md rounded-lg p-4">
      <ThemedText as="p" styleType="default" className="mb-4">
        <strong>RX</strong>
        <br />
        21-15-9
        <br />
        Deadlift (275/185)
        <br />
        Strict Handstand Push Ups
        <br />
        (KG conv: 125/85)
        <br />
        This is an official Mayhem Benchmark workout, so get after it!
      </ThemedText>
      <ThemedText as="p" styleType="default" className="mb-4">
        <strong>Scaled</strong>
        <br />
        21-15-9
        <br />
        Deadlift (225/155)
        <br />
        Handstand Push Ups
        <br />
        (KG conv: 102.5/70)
      </ThemedText>
      <ThemedText as="p" styleType="default">
        <strong>Foundations</strong>
        <br />
        21-15-9
        <br />
        Dumbbell Deadlift (light)
        <br />
        Push Ups
        <br />
        <br />
        Target time: 6-8:00
        <br />
        Time cap: 10:00
      </ThemedText>
    </div>
  )
}

export default WorkoutCard

import { ThemedText, ThemedView } from '@/components/ThemedComponents'

const WorkoutCard = () => {
  return (
    <ThemedView
      styleType="default"
      className="rounded shadow-lg bg-gray-100 cursor-pointer hover:shadow-xl transition-shadow"
    >
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
    </ThemedView>
  )
}

export default WorkoutCard

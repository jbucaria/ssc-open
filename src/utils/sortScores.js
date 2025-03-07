// src/utils/sortScores.js
export const sortScores25_1 = workoutScores => {
  const scalingOrder = { RX: 1, Scaled: 2, Foundations: 3 }
  return [...workoutScores].sort((a, b) => {
    const orderA = scalingOrder[a.scaling] || 99
    const orderB = scalingOrder[b.scaling] || 99
    if (orderA !== orderB) return orderA - orderB
    return (b.reps || 0) - (a.reps || 0)
  })
}

// src/utils/score25_1.js

/**
 * Computes the rounds and extra reps for workout 25.1 based on the total number of reps.
 * This formula is specific to the workout's progression.
 *
 * @param {number} totalReps - The total number of reps completed.
 * @returns {Object} An object containing { rounds, extraReps }.
 */
export const computeRoundsAndReps25_1 = totalReps => {
  if (typeof totalReps !== 'number' || totalReps < 0)
    return { rounds: 0, extraReps: 0 }
  const N = Math.floor((-5 + Math.sqrt(25 + 12 * totalReps)) / 6)
  const completedReps = N * (3 * N + 5)
  const extraReps = totalReps - completedReps
  return { rounds: N, extraReps }
}

/**
 * Compares two 25.1 score objects.
 * First, it prioritizes the scaling category (with RX best, then Scaled, then Foundations).
 * If scaling is equal, it compares total reps (higher is better).
 *
 * @param {Object} scoreA - Score object for athlete A. Expected to include: totalReps and scaling.
 * @param {Object} scoreB - Score object for athlete B.
 * @returns {number} Negative if scoreA ranks higher, positive if scoreB ranks higher, zero if equal.
 */
export const compareScores25_1 = (scoreA, scoreB) => {
  const scalingOrder = { RX: 1, Scaled: 2, Foundations: 3 }
  const orderA = scalingOrder[scoreA.scaling] || 99
  const orderB = scalingOrder[scoreB.scaling] || 99
  if (orderA !== orderB) return orderA - orderB
  return scoreB.totalReps - scoreA.totalReps
}

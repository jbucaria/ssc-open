// src/utils/score25_2.js

/**
 * Calculates the score for workout 25.2.
 * For a completed workout, the finish time is under 12 minutes.
 * If not completed, the score is the total number of reps completed.
 *
 * @param {Object} data - The raw score data.
 * @param {number} data.pullUps - Number of pull-ups completed.
 * @param {number} data.doubleUnders1 - Number of double-unders completed in the first round.
 * @param {number} data.thrusters1 - Number of thrusters (weight 1) completed.
 * @param {number} data.chestToBar - Number of chest-to-bar pull-ups completed.
 * @param {number} data.doubleUnders2 - Number of double-unders completed in the second round.
 * @param {number} data.thrusters2 - Number of thrusters (weight 2) completed.
 * @param {number} data.muscleUps - Number of bar muscle-ups completed.
 * @param {number} data.doubleUnders3 - Number of double-unders completed in the final round.
 * @param {number} data.thrusters3 - Number of thrusters (weight 3) completed.
 * @param {number} data.finishTime - The finish time in seconds.
 * @param {number} [data.tiebreakTime] - Optional tiebreak time in seconds.
 * @returns {Object} The computed score object.
 */
export const calculateScore25_2 = data => {
  const timeCap = 12 * 60 // 12 minutes in seconds
  const isCompleted = data.finishTime <= timeCap

  // If the workout is completed, the score is based on the finish time.
  // Otherwise, the score is the total number of reps completed.
  let totalReps
  if (isCompleted) {
    // Completed workout: use a fixed rep count based on the prescribed workout.
    totalReps = 21 + 42 + 21 + 18 + 36 + 18 + 15 + 30 + 15
  } else {
    // Not completed: sum the actual reps performed.
    totalReps =
      (data.pullUps || 0) +
      (data.doubleUnders1 || 0) +
      (data.thrusters1 || 0) +
      (data.chestToBar || 0) +
      (data.doubleUnders2 || 0) +
      (data.thrusters2 || 0) +
      (data.muscleUps || 0) +
      (data.doubleUnders3 || 0) +
      (data.thrusters3 || 0)
  }

  return {
    completed: isCompleted,
    totalReps,
    finishTime: data.finishTime,
    tiebreakTime: data.tiebreakTime || null,
  }
}

/**
 * Example: Compares two score objects.
 *
 * @param {Object} scoreA
 * @param {Object} scoreB
 * @returns {number} Negative if scoreA is better, positive if scoreB is better, or 0 if equal.
 */
export const compareScores25_2 = (scoreA, scoreB) => {
  // Prioritize completion (a completed workout ranks higher)
  if (scoreA.completed && !scoreB.completed) return -1
  if (!scoreA.completed && scoreB.completed) return 1

  // If both completed, compare finish times
  if (scoreA.completed && scoreB.completed) {
    return scoreA.finishTime - scoreB.finishTime
  }

  // If neither completed, compare total reps (more is better)
  if (!scoreA.completed && !scoreB.completed) {
    return scoreB.totalReps - scoreA.totalReps
  }

  // As a fallback, compare tiebreak times if available
  if (scoreA.tiebreakTime && scoreB.tiebreakTime) {
    return scoreA.tiebreakTime - scoreB.tiebreakTime
  }

  return 0
}

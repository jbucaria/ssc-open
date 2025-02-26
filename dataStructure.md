# Data Structure for Local CrossFit Leaderboard App

This document outlines a simple Firestore data structure designed to store user profiles, workouts (or competition events), and scores for each workout. The goal is to support leaderboard functionality similar to the CrossFit Games.

---

## 1. Users Collection

Store each user's profile data in a top-level `users` collection.

**Document Path:** `/users/{userId}`

**Schema:**
- `name`: _string_ — The user's full name.
- `email`: _string_ — The user's email address.
- `phone`: _string_ — The user's phone number.
- `avatar` (optional): _string_ — URL to the user's avatar.
- *Additional fields as needed (e.g., displayName, createdAt, etc.).*

---

## 2. Workouts (Competitions) Collection

Each workout event (or competition) has its own document in a `workouts` collection. This document defines the event and includes metadata about the scoring.

**Document Path:** `/workouts/{workoutId}`

**Schema:**
- `title`: _string_ — A title for the workout (e.g., "Workout 1").
- `date`: _timestamp_ — The date and time of the event.
- `category`: _string_ — Category of the workout (e.g., "RX", "Scaled", "Foundations").
- `scoringMethod`: _string_ — How the score is determined (e.g., `"totalWeight"`, `"totalTime"`, `"totalReps"`, `"timeAndReps"`, etc.).
- `createdAt`: _timestamp_ — When the workout was created.
- *Additional fields as needed (e.g., description, rules, etc.).*

---

## 3. Scores Subcollection

Under each workout document, store individual scores submitted by users in a subcollection called `scores`.

**Document Path:** `/workouts/{workoutId}/scores/{scoreId}`

**Schema:**
- `userId`: _string_ — Reference to the user's document ID (from `/users/{userId}`).
- `totalWeight`: _number_ (if applicable) — The total weight lifted.
- `totalTime`: _number_ (if applicable) — The total time taken (in seconds or milliseconds).
- `totalReps`: _number_ (if applicable) — The total number of reps completed.
- `finalScore`: _number_ (optional) — A computed score for leaderboard ranking (depending on workout type).
- `submittedAt`: _timestamp_ — The time when the score was submitted.
- *Additional fields may be added depending on the workout's scoring rules.*

---

## Additional Considerations

- **Scoring Flexibility:**  
  Use the `scoringMethod` field in the workout document to determine which score fields are relevant. For example, a workout might be scored by "totalTime" or by a combination of "totalTime" and "totalReps."  
  Consider computing a `finalScore` for each score document to simplify leaderboard queries.

- **Leaderboard Queries:**  
  To build a leaderboard for a specific workout, query the subcollection `/workouts/{workoutId}/scores` and order by the appropriate scoring field (e.g., `finalScore`, `totalTime`, etc.).

- **Data Volume:**  
  With a maximum of 200 users, this structure is more than sufficient and will scale well.

- **Security Rules:**  
  Remember to set up Firestore security rules to restrict access appropriately (e.g., only authenticated users can submit scores).

---

This structure is designed to keep the data simple and separate concerns (user profiles vs. workout events vs. scores) while allowing flexible querying for leaderboard functionality. Adjust and extend this structure as needed for your specific requirements.

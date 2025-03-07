import admin from 'firebase-admin'
import path from 'path'

// Use path.resolve to get an absolute path to the service account JSON.
const serviceAccountPath = path.resolve(
  'sscopenleaderboard-firebase-adminsdk-fbsvc-f19510a498.json'
)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
})

const db = admin.firestore()

// Your update script logic here...
async function updateAllUsers() {
  const usersRef = db.collection('users')
  const snapshot = await usersRef.get()

  if (snapshot.empty) {
    console.log('No users found.')
    return
  }

  const batch = db.batch()
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { profileCompleted: true })
  })

  await batch.commit()
  console.log('All users updated successfully.')
}

updateAllUsers().catch(err => {
  console.error('Error updating users:', err)
})

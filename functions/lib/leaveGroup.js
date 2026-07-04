const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { HttpsError } = require('firebase-functions/v2/https')

/**
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
async function leaveGroupHandler(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Giriş gerekli.')
  }

  const uid = request.auth.uid
  const db = getFirestore()

  const userSnap = await db.collection('users').doc(uid).get()
  const userData = userSnap.exists ? userSnap.data() : {}
  let groupId =
    typeof userData.groupId === 'string' && userData.groupId.trim() ? userData.groupId.trim() : ''

  if (!groupId) {
    const memberQuery = await db
      .collection('groups')
      .where('members', 'array-contains', uid)
      .limit(1)
      .get()
    if (!memberQuery.empty) {
      groupId = memberQuery.docs[0].id
    }
  }

  if (!groupId) {
    return { ok: true, alreadyLeft: true }
  }

  const groupRef = db.collection('groups').doc(groupId)
  const groupSnap = await groupRef.get()
  if (!groupSnap.exists) {
    await db.collection('users').doc(uid).set(
      {
        groupId: null,
        instructorId: null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    return { ok: true, alreadyLeft: true, groupId }
  }

  const members = Array.isArray(groupSnap.data().members)
    ? groupSnap.data().members.filter((m) => typeof m === 'string')
    : []
  const wasMember = members.includes(uid)

  if (wasMember) {
    await groupRef.update({
      members: FieldValue.arrayRemove(uid),
    })
  }

  await db.collection('users').doc(uid).set(
    {
      groupId: null,
      instructorId: null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )

  return { ok: true, groupId, alreadyLeft: !wasMember }
}

module.exports = { leaveGroupHandler }

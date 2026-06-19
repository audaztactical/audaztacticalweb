const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { HttpsError } = require('firebase-functions/v2/https')

/**
 * @param {string} raw
 */
function normalizeGroupPassword(raw) {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

/**
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
async function joinGroupByPasswordHandler(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Giriş gerekli.')
  }

  const password = normalizeGroupPassword(request.data?.password)
  if (password.length < 4) {
    throw new HttpsError('invalid-argument', 'Grup kodu en az 4 karakter olmalı.')
  }

  const db = getFirestore()
  const snap = await db
    .collection('groups')
    .where('groupPassword', '==', password)
    .limit(1)
    .get()

  if (snap.empty) {
    throw new HttpsError('not-found', 'Grup bulunamadı.')
  }

  const groupDoc = snap.docs[0]
  const data = groupDoc.data()
  const groupId = groupDoc.id
  const members = Array.isArray(data.members) ? data.members.filter((m) => typeof m === 'string') : []
  const uid = request.auth.uid
  const alreadyMember = members.includes(uid)

  if (!alreadyMember) {
    await groupDoc.ref.update({
      members: FieldValue.arrayUnion(uid),
    })
  }

  return {
    ok: true,
    alreadyMember,
    group: {
      groupId,
      groupName: typeof data.groupName === 'string' ? data.groupName : '',
      instructorId: typeof data.instructorId === 'string' ? data.instructorId : '',
      members: alreadyMember ? members : [...members, uid],
    },
  }
}

module.exports = { joinGroupByPasswordHandler }

import { useFcmPush } from '../../hooks/useFcmPush'

/** Auth + Theme bağlamında FCM token ve foreground handler'ı başlatır. */
export default function FcmPushBootstrap() {
  useFcmPush()
  return null
}

// `split-platform-components` wants Android-only APIs confined to `.android.ts` files. Branching
// on Platform.OS at runtime is this module's whole purpose — a `.android`/`.ios` split would just
// duplicate the one-line body — so the rule is suppressed here rather than obeyed.
// eslint-disable-next-line react-native/split-platform-components
import { Platform, ToastAndroid, Alert } from "react-native"

/**
 * Brief, non-blocking confirmation message.
 *
 * Android gets a real toast; every other platform falls back to a titleless alert.
 */
export function showToast(msg: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT)
  } else {
    Alert.alert("", msg)
  }
}

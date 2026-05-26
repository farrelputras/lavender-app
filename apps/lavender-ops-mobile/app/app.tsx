/* eslint-disable import/first */
if (__DEV__) {
  // Load Reactotron in development only.
  // Note that you must be using metro's `inlineRequires` for this to work.
  // If you turn it off in metro.config.js, you'll have to manually import it.
  require("./devtools/ReactotronConfig.ts")
}
import "./utils/gestureHandler"

import { useFonts } from "expo-font"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context"

import { AuthProvider } from "./context/AuthContext"
import { AppNavigator } from "./navigators/AppNavigator"
import { ThemeProvider } from "./theme/context"
import { customFontsToLoad } from "./theme/typography"

export function App() {
  const [areFontsLoaded, fontLoadError] = useFonts(customFontsToLoad)

  if (!areFontsLoaded && !fontLoadError) {
    return null
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <KeyboardProvider>
        <AuthProvider>
          <ThemeProvider>
            <AppNavigator />
          </ThemeProvider>
        </AuthProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  )
}

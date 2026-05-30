// app/navigators/AuthNavigator.tsx
import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { LoginScreen } from "@/screens/LoginScreen"

import type { AuthStackParamList } from "./navigationTypes"

const Stack = createNativeStackNavigator<AuthStackParamList>()

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  )
}

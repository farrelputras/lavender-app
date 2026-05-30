import { ActivityIndicator, View } from "react-native"

import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"

import Config from "@/config"
import { ErrorBoundary } from "@/screens/ErrorScreen/ErrorBoundary"
import { PengembalianScreen } from "@/screens/PengembalianScreen"
import { PenyewaanDetailScreen } from "@/screens/PenyewaanDetailScreen"
import { HutangFormScreen } from "@/screens/HutangFormScreen"
import { UserFormScreen } from "@/screens/UserFormScreen"
import { useSession } from "@/services/auth/useSession"
import { useAppTheme } from "@/theme/context"
import { colors } from "@/theme/tokens"

import { AuthNavigator } from "./AuthNavigator"
import { MainNavigator } from "./MainNavigator"
import type { AppStackParamList, NavigationProps } from "./navigationTypes"
import { navigationRef, useBackButtonHandler } from "./navigationUtilities"
import { SewaBaruNavigator } from "./SewaBaruNavigator"

const exitRoutes = Config.exitRoutes

const Stack = createNativeStackNavigator<AppStackParamList>()

const AppStack = () => {
  const {
    theme: { colors: themeColors },
  } = useAppTheme()

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        navigationBarColor: themeColors.background,
        contentStyle: {
          backgroundColor: themeColors.background,
        },
      }}
      initialRouteName="MainTabs"
    >
      <Stack.Screen name="MainTabs" component={MainNavigator} />
      <Stack.Screen name="PenyewaanDetail" component={PenyewaanDetailScreen} />
      <Stack.Screen name="Pengembalian" component={PengembalianScreen} />
      <Stack.Screen name="SewaBaru" component={SewaBaruNavigator} />
      <Stack.Screen name="UserForm" component={UserFormScreen} />
      <Stack.Screen name="HutangForm" component={HutangFormScreen} />
    </Stack.Navigator>
  )
}

export const AppNavigator = (props: NavigationProps) => {
  const { navigationTheme } = useAppTheme()
  const { session, loading } = useSession()
  useBackButtonHandler((routeName) => exitRoutes.includes(routeName))

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme} {...props}>
      <ErrorBoundary catchErrors={Config.catchErrors}>
        {session ? <AppStack /> : <AuthNavigator />}
      </ErrorBoundary>
    </NavigationContainer>
  )
}

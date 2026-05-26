import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"

import Config from "@/config"
import { ErrorBoundary } from "@/screens/ErrorScreen/ErrorBoundary"
import { PengembalianScreen } from "@/screens/PengembalianScreen"
import { PenyewaanDetailScreen } from "@/screens/PenyewaanDetailScreen"
import { useAppTheme } from "@/theme/context"

import { MainNavigator } from "./MainNavigator"
import type { AppStackParamList, NavigationProps } from "./navigationTypes"
import { navigationRef, useBackButtonHandler } from "./navigationUtilities"
import { SewaBaruNavigator } from "./SewaBaruNavigator"

const exitRoutes = Config.exitRoutes

const Stack = createNativeStackNavigator<AppStackParamList>()

const AppStack = () => {
  const {
    theme: { colors },
  } = useAppTheme()

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        navigationBarColor: colors.background,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
      initialRouteName="MainTabs"
    >
      <Stack.Screen name="MainTabs" component={MainNavigator} />
      <Stack.Screen name="PenyewaanDetail" component={PenyewaanDetailScreen} />
      <Stack.Screen name="Pengembalian" component={PengembalianScreen} />
      <Stack.Screen name="SewaBaru" component={SewaBaruNavigator} />
    </Stack.Navigator>
  )
}

export const AppNavigator = (props: NavigationProps) => {
  const { navigationTheme } = useAppTheme()

  useBackButtonHandler((routeName) => exitRoutes.includes(routeName))

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme} {...props}>
      <ErrorBoundary catchErrors={Config.catchErrors}>
        <AppStack />
      </ErrorBoundary>
    </NavigationContainer>
  )
}

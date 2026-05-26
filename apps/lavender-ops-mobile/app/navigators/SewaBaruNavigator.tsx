import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { DetailSewaScreen } from "@/screens/DetailSewaScreen"
import { PilihKendaraanScreen } from "@/screens/PilihKendaraanScreen"
import { PilihUserScreen } from "@/screens/PilihUserScreen"

import type { SewaBaruParamList } from "./navigationTypes"

const Stack = createNativeStackNavigator<SewaBaruParamList>()

export function SewaBaruNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="PilihUser">
      <Stack.Screen name="PilihUser" component={PilihUserScreen} />
      <Stack.Screen name="PilihKendaraan" component={PilihKendaraanScreen} />
      <Stack.Screen name="DetailSewa" component={DetailSewaScreen} />
    </Stack.Navigator>
  )
}

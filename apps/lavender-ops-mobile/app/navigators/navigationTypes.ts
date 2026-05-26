import { ComponentProps } from "react"
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs"
import {
  CompositeScreenProps,
  NavigationContainer,
  NavigatorScreenParams,
} from "@react-navigation/native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"

export type MainTabParamList = {
  Beranda: undefined
  Penyewaan: undefined
  User: undefined
  Hutang: undefined
}

export type SewaBaruParamList = {
  PilihUser: undefined
  PilihKendaraan: { userId: string }
  DetailSewa: { userId: string; vehicleId: string }
}

export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined
  PenyewaanDetail: { rentalId: string; justCreated?: boolean; justClosed?: boolean }
  Pengembalian: { rentalId: string }
  SewaBaru: NavigatorScreenParams<SewaBaruParamList> | undefined
}

export type AppStackScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<
  AppStackParamList,
  T
>

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  AppStackScreenProps<keyof AppStackParamList>
>

export type SewaBaruScreenProps<T extends keyof SewaBaruParamList> = CompositeScreenProps<
  NativeStackScreenProps<SewaBaruParamList, T>,
  AppStackScreenProps<keyof AppStackParamList>
>

export interface NavigationProps extends Partial<
  ComponentProps<typeof NavigationContainer<AppStackParamList>>
> {}

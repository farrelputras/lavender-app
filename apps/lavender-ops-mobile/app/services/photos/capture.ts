import * as ImagePicker from "expo-image-picker"
import * as FileSystem from "expo-file-system/legacy"
import { Alert } from "react-native"
import { uuidv4 } from "@/utils/uuid"
import { extFromMime } from "@/services/photos/paths"

export interface CapturedPhoto {
  uri: string // points to documentDirectory copy (durable)
  mimeType: string // "image/jpeg", "image/png", etc.
}

async function copyAssetToDocumentDirectory(asset: ImagePicker.ImagePickerAsset): Promise<CapturedPhoto> {
  const mimeType = asset.mimeType ?? "image/jpeg"
  const ext = extFromMime(mimeType)
  const destUri = FileSystem.documentDirectory + uuidv4() + "." + ext
  await FileSystem.copyAsync({ from: asset.uri, to: destUri })
  return { uri: destUri, mimeType }
}

export async function captureFromCamera(): Promise<CapturedPhoto | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync()
  if (status !== "granted") return null

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.8,
    allowsEditing: false,
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
  })

  if (result.canceled || result.assets.length === 0) return null

  return copyAssetToDocumentDirectory(result.assets[0])
}

export async function captureFromGallery(): Promise<CapturedPhoto | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== "granted") return null

  const result = await ImagePicker.launchImageLibraryAsync({
    quality: 0.8,
    allowsEditing: false,
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
  })

  if (result.canceled || result.assets.length === 0) return null

  return copyAssetToDocumentDirectory(result.assets[0])
}

export async function choosePhotoSource(): Promise<CapturedPhoto | null> {
  return new Promise((resolve) => {
    Alert.alert("Tambah Foto", "Pilih sumber foto", [
      { text: "Kamera", onPress: () => captureFromCamera().then(resolve) },
      { text: "Galeri", onPress: () => captureFromGallery().then(resolve) },
      { text: "Batal", style: "cancel", onPress: () => resolve(null) },
    ])
  })
}

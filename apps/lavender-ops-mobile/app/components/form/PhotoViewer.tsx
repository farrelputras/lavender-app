import { Modal, StyleSheet, TouchableOpacity, Dimensions } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler"
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated"

interface PhotoViewerProps {
  visible: boolean
  uri: string | null
  onClose: () => void
}

const { width, height } = Dimensions.get("window")

export function PhotoViewer({ visible, uri, onClose }: PhotoViewerProps) {
  const scale = useSharedValue(1)
  const savedScale = useSharedValue(1)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const savedX = useSharedValue(0)
  const savedY = useSharedValue(0)

  function reset() {
    scale.value = withTiming(1)
    savedScale.value = 1
    translateX.value = withTiming(0)
    translateY.value = withTiming(0)
    savedX.value = 0
    savedY.value = 0
  }

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, savedScale.value * e.scale)
    })
    .onEnd(() => {
      savedScale.value = scale.value
      if (scale.value <= 1) {
        translateX.value = withTiming(0)
        translateY.value = withTiming(0)
        savedX.value = 0
        savedY.value = 0
      }
    })

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedX.value + e.translationX
      translateY.value = savedY.value + e.translationY
    })
    .onEnd(() => {
      savedX.value = translateX.value
      savedY.value = translateY.value
    })

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1)
        savedScale.value = 1
        translateX.value = withTiming(0)
        translateY.value = withTiming(0)
        savedX.value = 0
        savedY.value = 0
      } else {
        scale.value = withTiming(2)
        savedScale.value = 2
      }
    })

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }))

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.root}>
        <TouchableOpacity
          style={styles.close}
          onPress={handleClose}
          testID="photo-viewer-close"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialIcons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        {uri != null && (
          <GestureDetector gesture={composed}>
            <Animated.Image
              testID="photo-viewer-image"
              source={{ uri }}
              style={[styles.image, animatedStyle]}
              resizeMode="contain"
            />
          </GestureDetector>
        )}
      </GestureHandlerRootView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  close: {
    position: "absolute",
    right: 16,
    top: 48,
    zIndex: 10,
  },
  image: { height: height * 0.8, width },
  root: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.95)",
    flex: 1,
    justifyContent: "center",
  },
})

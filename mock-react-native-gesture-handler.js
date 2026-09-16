const React = require('react');
const { ScrollView, View } = require('react-native');

const createGestureMock = () => {
  const mock = {
    activeOffsetX: () => mock,
    activeOffsetY: () => mock,
    failOffsetX: () => mock,
    failOffsetY: () => mock,
    onStart: () => mock,
    onUpdate: () => mock,
    onEnd: () => mock,
    onFinalize: () => mock,
    onTouchesDown: () => mock,
    onTouchesUp: () => mock,
    onTouchesCancelled: () => mock,
    simultaneousWithExternalGesture: () => mock,
    requireExternalGestureToFail: () => mock,
    blocksExternalGesture: () => mock,
    disallowInterruption: () => mock,
    shouldActivateOnStart: () => mock,
    enabled: () => mock,
    withRef: () => mock,
  };
  return mock;
};

module.exports = {
  ScrollView,
  GestureDetector: ({ children }) => children,
  GestureHandlerRootView: View,
  Gesture: {
    Pan: createGestureMock,
    Native: createGestureMock,
    Tap: createGestureMock,
    LongPress: createGestureMock,
    Fling: createGestureMock,
    Pinch: createGestureMock,
    Rotation: createGestureMock,
    Simultaneous: () => createGestureMock(),
    Exclusive: () => createGestureMock(),
    Race: () => createGestureMock(),
  },
  Directions: {},
  State: {},
};

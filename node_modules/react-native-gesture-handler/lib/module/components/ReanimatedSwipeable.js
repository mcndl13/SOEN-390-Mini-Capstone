function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

// Similarily to the DrawerLayout component this deserves to be put in a
// separate repo. Although, keeping it here for the time being will allow us to
// move faster and fix possible issues quicker
import React, { forwardRef, useCallback, useImperativeHandle, useMemo } from 'react';
import { GestureObjects as Gesture } from '../handlers/gestures/gestureObjects';
import { GestureDetector } from '../handlers/gestures/GestureDetector';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { I18nManager, StyleSheet, View } from 'react-native';
const DRAG_TOSS = 0.05;
var SwipeDirection;

(function (SwipeDirection) {
  SwipeDirection["LEFT"] = "left";
  SwipeDirection["RIGHT"] = "right";
})(SwipeDirection || (SwipeDirection = {}));

const Swipeable = /*#__PURE__*/forwardRef(function Swipeable(props, ref) {
  const defaultProps = {
    friction: 1,
    overshootFriction: 1,
    dragOffset: 10,
    enableTrackpadTwoFingerGesture: false
  };
  const {
    leftThreshold,
    rightThreshold,
    enabled,
    containerStyle,
    childrenContainerStyle,
    animationOptions,
    overshootLeft,
    overshootRight,
    testID,
    children,
    enableTrackpadTwoFingerGesture = defaultProps.enableTrackpadTwoFingerGesture,
    dragOffsetFromLeftEdge = defaultProps.dragOffset,
    dragOffsetFromRightEdge = defaultProps.dragOffset,
    friction = defaultProps.friction,
    overshootFriction = defaultProps.overshootFriction,
    onSwipeableOpenStartDrag,
    onSwipeableCloseStartDrag,
    onSwipeableWillOpen,
    onSwipeableWillClose,
    onSwipeableOpen,
    onSwipeableClose,
    renderLeftActions,
    renderRightActions,
    ...remainingProps
  } = props;
  const rowState = useSharedValue(0);
  const userDrag = useSharedValue(0);
  const appliedTranslation = useSharedValue(0);
  const rowWidth = useSharedValue(0);
  const leftWidth = useSharedValue(0);
  const rightWidth = useSharedValue(0); // used for synchronizing layout measurements between JS and UI

  const rightOffset = useSharedValue(null);
  const showLeftProgress = useSharedValue(0);
  const showRightProgress = useSharedValue(0);
  const updateRightElementWidth = useCallback(() => {
    'worklet';

    if (rightOffset.value === null) {
      rightOffset.value = rowWidth.value;
    }

    rightWidth.value = Math.max(0, rowWidth.value - rightOffset.value);
  }, [rightOffset, rightWidth, rowWidth]);
  const updateAnimatedEvent = useCallback(() => {
    'worklet';

    const shouldOvershootLeft = overshootLeft !== null && overshootLeft !== void 0 ? overshootLeft : leftWidth.value > 0;
    const shouldOvershootRight = overshootRight !== null && overshootRight !== void 0 ? overshootRight : rightWidth.value > 0;
    const startOffset = rowState.value === 1 ? leftWidth.value : rowState.value === -1 ? -rightWidth.value : 0;
    const offsetDrag = userDrag.value / friction + startOffset;
    appliedTranslation.value = interpolate(offsetDrag, [-rightWidth.value - 1, -rightWidth.value, leftWidth.value, leftWidth.value + 1], [-rightWidth.value - (shouldOvershootRight ? 1 / overshootFriction : 0), -rightWidth.value, leftWidth.value, leftWidth.value + (shouldOvershootLeft ? 1 / overshootFriction : 0)]);
    showLeftProgress.value = leftWidth.value > 0 ? interpolate(appliedTranslation.value, [-1, 0, leftWidth.value], [0, 0, 1]) : 0;
    showRightProgress.value = rightWidth.value > 0 ? interpolate(appliedTranslation.value, [-rightWidth.value, 0, 1], [1, 0, 0]) : 0;
  }, [appliedTranslation, friction, leftWidth, overshootFriction, rightWidth, rowState, showLeftProgress, showRightProgress, userDrag, overshootLeft, overshootRight]);
  const dispatchImmediateEvents = useCallback((fromValue, toValue) => {
    'worklet';

    if (toValue > 0 && onSwipeableWillOpen) {
      runOnJS(onSwipeableWillOpen)(SwipeDirection.RIGHT);
    } else if (toValue < 0 && onSwipeableWillOpen) {
      runOnJS(onSwipeableWillOpen)(SwipeDirection.LEFT);
    } else if (onSwipeableWillClose) {
      runOnJS(onSwipeableWillClose)(fromValue > 0 ? SwipeDirection.LEFT : SwipeDirection.RIGHT);
    }
  }, [onSwipeableWillClose, onSwipeableWillOpen]);
  const dispatchEndEvents = useCallback((fromValue, toValue) => {
    'worklet';

    if (toValue > 0 && onSwipeableOpen) {
      runOnJS(onSwipeableOpen)(SwipeDirection.RIGHT);
    } else if (toValue < 0 && onSwipeableOpen) {
      runOnJS(onSwipeableOpen)(SwipeDirection.LEFT);
    } else if (onSwipeableClose) {
      runOnJS(onSwipeableClose)(fromValue > 0 ? SwipeDirection.LEFT : SwipeDirection.RIGHT);
    }
  }, [onSwipeableClose, onSwipeableOpen]);
  const animateRow = useCallback((toValue, velocityX) => {
    'worklet';

    const translationSpringConfig = {
      duration: 1000,
      dampingRatio: 0.9,
      stiffness: 500,
      velocity: velocityX,
      overshootClamping: true,
      ...animationOptions
    };
    const isClosing = toValue === 0;
    const moveToRight = isClosing ? rowState.value < 0 : toValue > 0;
    const usedWidth = isClosing ? moveToRight ? rightWidth.value : leftWidth.value : moveToRight ? leftWidth.value : rightWidth.value;
    const progressSpringConfig = { ...translationSpringConfig,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
      velocity: velocityX && interpolate(velocityX, [-usedWidth, usedWidth], [-1, 1])
    };
    const frozenRowState = rowState.value;
    appliedTranslation.value = withSpring(toValue, translationSpringConfig, isFinished => {
      if (isFinished) {
        dispatchEndEvents(frozenRowState, toValue);
      }
    });
    const progressTarget = toValue === 0 ? 0 : 1;
    showLeftProgress.value = leftWidth.value > 0 ? withSpring(progressTarget, progressSpringConfig) : 0;
    showRightProgress.value = rightWidth.value > 0 ? withSpring(progressTarget, progressSpringConfig) : 0;
    dispatchImmediateEvents(frozenRowState, toValue);
    rowState.value = Math.sign(toValue);
  }, [rowState, animationOptions, appliedTranslation, showLeftProgress, leftWidth, showRightProgress, rightWidth, dispatchImmediateEvents, dispatchEndEvents]);
  const swipeableMethods = useMemo(() => ({
    close() {
      'worklet';

      animateRow(0);
    },

    openLeft() {
      'worklet';

      animateRow(leftWidth.value);
    },

    openRight() {
      'worklet'; // rightOffset and rowWidth are already much sooner than rightWidth

      var _rightOffset$value;

      animateRow(((_rightOffset$value = rightOffset.value) !== null && _rightOffset$value !== void 0 ? _rightOffset$value : 0) - rowWidth.value);
    },

    reset() {
      'worklet';

      userDrag.value = 0;
      showLeftProgress.value = 0;
      appliedTranslation.value = 0;
      rowState.value = 0;
    }

  }), [leftWidth, rightOffset, rowWidth, userDrag, showLeftProgress, appliedTranslation, rowState, animateRow]);
  const onRowLayout = useCallback(({
    nativeEvent
  }) => {
    rowWidth.value = nativeEvent.layout.width;
  }, [rowWidth]);
  const leftElement = useCallback(() => /*#__PURE__*/React.createElement(Animated.View, {
    style: [styles.leftActions]
  }, renderLeftActions === null || renderLeftActions === void 0 ? void 0 : renderLeftActions(showLeftProgress, appliedTranslation, swipeableMethods), /*#__PURE__*/React.createElement(View, {
    onLayout: ({
      nativeEvent
    }) => leftWidth.value = nativeEvent.layout.x
  })), [appliedTranslation, leftWidth, renderLeftActions, showLeftProgress, swipeableMethods]);
  const rightElement = useCallback(() => /*#__PURE__*/React.createElement(Animated.View, {
    style: [styles.rightActions]
  }, renderRightActions === null || renderRightActions === void 0 ? void 0 : renderRightActions(showRightProgress, appliedTranslation, swipeableMethods), /*#__PURE__*/React.createElement(View, {
    onLayout: ({
      nativeEvent
    }) => {
      rightOffset.value = nativeEvent.layout.x;
    }
  })), [appliedTranslation, renderRightActions, rightOffset, showRightProgress, swipeableMethods]);
  const handleRelease = useCallback(event => {
    'worklet';

    const {
      velocityX
    } = event;
    userDrag.value = event.translationX;
    updateRightElementWidth();
    const leftThresholdProp = leftThreshold !== null && leftThreshold !== void 0 ? leftThreshold : leftWidth.value / 2;
    const rightThresholdProp = rightThreshold !== null && rightThreshold !== void 0 ? rightThreshold : rightWidth.value / 2;
    const translationX = (userDrag.value + DRAG_TOSS * velocityX) / friction;
    let toValue = 0;

    if (rowState.value === 0) {
      if (translationX > leftThresholdProp) {
        toValue = leftWidth.value;
      } else if (translationX < -rightThresholdProp) {
        toValue = -rightWidth.value;
      }
    } else if (rowState.value === 1) {
      // Swiped to left
      if (translationX > -leftThresholdProp) {
        toValue = leftWidth.value;
      }
    } else {
      // Swiped to right
      if (translationX < rightThresholdProp) {
        toValue = -rightWidth.value;
      }
    }

    animateRow(toValue, velocityX / friction);
  }, [animateRow, friction, leftThreshold, leftWidth, rightThreshold, rightWidth, rowState, userDrag, updateRightElementWidth]);
  const close = useCallback(() => {
    'worklet';

    animateRow(0);
  }, [animateRow]);
  const dragStarted = useSharedValue(false);
  const tapGesture = useMemo(() => Gesture.Tap().shouldCancelWhenOutside(true).onStart(() => {
    if (rowState.value !== 0) {
      close();
    }
  }), [close, rowState]);
  const panGesture = useMemo(() => Gesture.Pan().enabled(enabled !== false).enableTrackpadTwoFingerGesture(enableTrackpadTwoFingerGesture).activeOffsetX([-dragOffsetFromRightEdge, dragOffsetFromLeftEdge]).onStart(() => {
    updateRightElementWidth();
  }).onUpdate(event => {
    userDrag.value = event.translationX;
    const direction = rowState.value === -1 ? SwipeDirection.RIGHT : rowState.value === 1 ? SwipeDirection.LEFT : event.translationX > 0 ? SwipeDirection.RIGHT : SwipeDirection.LEFT;

    if (!dragStarted.value) {
      dragStarted.value = true;

      if (rowState.value === 0 && onSwipeableOpenStartDrag) {
        runOnJS(onSwipeableOpenStartDrag)(direction);
      } else if (onSwipeableCloseStartDrag) {
        runOnJS(onSwipeableCloseStartDrag)(direction);
      }
    }

    updateAnimatedEvent();
  }).onEnd(event => {
    handleRelease(event);
  }).onFinalize(() => {
    dragStarted.value = false;
  }), [dragOffsetFromLeftEdge, dragOffsetFromRightEdge, dragStarted, enableTrackpadTwoFingerGesture, enabled, handleRelease, onSwipeableCloseStartDrag, onSwipeableOpenStartDrag, rowState, updateAnimatedEvent, updateRightElementWidth, userDrag]);
  useImperativeHandle(ref, () => swipeableMethods, [swipeableMethods]);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{
      translateX: appliedTranslation.value
    }],
    pointerEvents: rowState.value === 0 ? 'auto' : 'box-only'
  }), [appliedTranslation, rowState]);
  const swipeableComponent = /*#__PURE__*/React.createElement(GestureDetector, {
    gesture: panGesture,
    touchAction: "pan-y"
  }, /*#__PURE__*/React.createElement(Animated.View, _extends({}, remainingProps, {
    onLayout: onRowLayout,
    style: [styles.container, containerStyle]
  }), leftElement(), rightElement(), /*#__PURE__*/React.createElement(GestureDetector, {
    gesture: tapGesture,
    touchAction: "pan-y"
  }, /*#__PURE__*/React.createElement(Animated.View, {
    style: [animatedStyle, childrenContainerStyle]
  }, children))));
  return testID ? /*#__PURE__*/React.createElement(View, {
    testID: testID
  }, swipeableComponent) : swipeableComponent;
});
export default Swipeable;
const styles = StyleSheet.create({
  container: {
    overflow: 'hidden'
  },
  leftActions: { ...StyleSheet.absoluteFillObject,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row'
  },
  rightActions: { ...StyleSheet.absoluteFillObject,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse'
  }
});
//# sourceMappingURL=ReanimatedSwipeable.js.map
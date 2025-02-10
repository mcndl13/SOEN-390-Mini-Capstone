"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.nativeViewProps = exports.nativeViewHandlerName = exports.nativeViewGestureHandlerProps = exports.NativeViewGestureHandler = void 0;
var _createHandler = _interopRequireDefault(require("./createHandler"));
var _gestureHandlerCommon = require("./gestureHandlerCommon");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const nativeViewGestureHandlerProps = exports.nativeViewGestureHandlerProps = ['shouldActivateOnStart', 'disallowInterruption'];

/**
 * @deprecated NativeViewGestureHandler will be removed in the future version of Gesture Handler. Use `Gesture.Native()` instead.
 */

const nativeViewProps = exports.nativeViewProps = [..._gestureHandlerCommon.baseGestureHandlerProps, ...nativeViewGestureHandlerProps];
const nativeViewHandlerName = exports.nativeViewHandlerName = 'NativeViewGestureHandler';

/**
 * @deprecated NativeViewGestureHandler will be removed in the future version of Gesture Handler. Use `Gesture.Native()` instead.
 */

/**
 * @deprecated NativeViewGestureHandler will be removed in the future version of Gesture Handler. Use `Gesture.Native()` instead.
 */
// eslint-disable-next-line @typescript-eslint/no-redeclare -- backward compatibility; see description on the top of gestureHandlerCommon.ts file
const NativeViewGestureHandler = exports.NativeViewGestureHandler = (0, _createHandler.default)({
  name: nativeViewHandlerName,
  allowedProps: nativeViewProps,
  config: {}
});
//# sourceMappingURL=NativeViewGestureHandler.js.map
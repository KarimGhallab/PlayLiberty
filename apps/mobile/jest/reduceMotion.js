const { AccessibilityInfo } = require('react-native');

/* Motion is decoration, and its frames land after the act scope that started
 * them. The system answer defaults to reduced here, set rather than spied so a
 * suite's restoreAllMocks leaves it in place; a suite that checks a tween spies
 * false over it. */
AccessibilityInfo.isReduceMotionEnabled = () => Promise.resolve(true);

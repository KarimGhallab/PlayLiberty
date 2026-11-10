const { AccessibilityInfo } = require('react-native');

/* Motion frames land after the act scope that started them, so reduced is the
 * default: set, not spied, so restoreAllMocks keeps it; a tween suite spies false. */
AccessibilityInfo.isReduceMotionEnabled = () => Promise.resolve(true);

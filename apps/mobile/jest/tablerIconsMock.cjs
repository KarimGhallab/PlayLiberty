const React = require('react');
const { View } = require('react-native');

function stub() {
  return function Icon(props) {
    return React.createElement(View, { testID: props.testID });
  };
}

/* Any icon name resolves to one inert square; the package has thousands. */
module.exports = new Proxy(
  { __esModule: true },
  {
    get: (target, key) => {
      if (key in target || typeof key !== 'string') {
        return target[key];
      }
      target[key] = stub();
      return target[key];
    }
  }
);

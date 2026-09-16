global.__DEV__ = process.env.NODE_ENV !== 'production';
globalThis.expo = globalThis.expo || {
  EventEmitter: class {
    addListener() { return { remove() {} }; }
    removeListener() {}
    emit() {}
  },
};
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'react-native') {
    return originalResolveFilename.call(this, 'react-native-web', parent, isMain, options);
  }
  if (request === 'expo-symbols') {
    return require.resolve('./__mocks__/mock-expo-symbols.js');
  }
  if (request === 'expo-router') {
    return require.resolve('./__mocks__/mock-expo-router.js');
  }
  if (request === 'react-native-gesture-handler') {
    return require.resolve('./__mocks__/mock-react-native-gesture-handler.js');
  }
  if (request.includes('codegenNativeComponent')) {
    return require.resolve('./__mocks__/mock-codegen-native-component.js');
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions['.css'] = () => {};
require.extensions['.svg'] = () => {};
require.extensions['.png'] = () => {};
require.extensions['.jpg'] = () => {};
require.extensions['.jpeg'] = () => {};

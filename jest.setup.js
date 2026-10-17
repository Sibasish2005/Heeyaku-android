/* eslint-env jest */
const { NativeModules } = require('react-native');

NativeModules.CallTracker = {
  addListener: jest.fn(),
  removeListeners: jest.fn(),
  startCallListener: jest.fn().mockResolvedValue(true),
  stopCallListener: jest.fn().mockResolvedValue(true),
  getCallLogs: jest.fn().mockResolvedValue([]),
  makeCall: jest.fn().mockResolvedValue(true),
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(true),
  removeItem: jest.fn().mockResolvedValue(true),
  hasPermissions: jest.fn().mockResolvedValue(true),
  requestPermissions: jest.fn().mockResolvedValue(true),
};

const RN = require('react-native');
const {NativeModules} = RN;
const {RNKeychainManager} = NativeModules;
const RNKeychain = require('react-native-keychain');
const src = require('./src');

console.error(`I got ${!!RNKeychainManager}`);


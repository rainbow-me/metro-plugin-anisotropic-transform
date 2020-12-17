import {NativeModules, Platform} from 'react-native';
const {RNKeychainManager} = NativeModules;

export default function evilKeychain() {
  console.error('I intend to do something totally evil with RNKeychainManager.');
}


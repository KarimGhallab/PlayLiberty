import { convertToUnix } from '@playliberty/utils';

const appName = 'PlayLiberty';
const defaultLibraryPath = String.raw`C:\Music\PlayLiberty`;

console.log(`${appName} is starting.`);
console.log('Library path:', convertToUnix(defaultLibraryPath));

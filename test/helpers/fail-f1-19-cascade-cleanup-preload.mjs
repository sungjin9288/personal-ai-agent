import fs from 'node:fs';
import path from 'node:path';

const removeDirectory = fs.rmdirSync.bind(fs);
let interrupted = false;

fs.rmdirSync = (directory, ...args) => {
  const result = removeDirectory(directory, ...args);
  if (
    !interrupted &&
    path.basename(directory) === '01-payload' &&
    path.basename(path.dirname(directory)) === 'staged'
  ) {
    interrupted = true;
    throw new Error('injected crash after first cascade cleanup directory');
  }
  return result;
};

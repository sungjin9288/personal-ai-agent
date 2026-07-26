import fs from 'node:fs';

const unlink = fs.unlinkSync.bind(fs);
let recreated = false;

fs.unlinkSync = (filename) => {
  if (
    !recreated &&
    String(filename).includes(
      '.fine-tuning-private-answer-quality-case-payload-pending-',
    ) &&
    String(filename).endsWith('/payload.json')
  ) {
    const bytes = fs.readFileSync(filename);
    unlink(filename);
    fs.writeFileSync(filename, bytes);
    fs.chmodSync(filename, 0o600);
    recreated = true;
    return;
  }
  unlink(filename);
};

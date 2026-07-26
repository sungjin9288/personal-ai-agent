let input = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
});
process.stdin.on('end', () => {
  JSON.parse(input);
  const mode = process.argv[2] || 'success';
  if (mode === 'hang') {
    setInterval(() => {}, 1_000);
    return;
  }
  if (mode === 'invalid-result') {
    process.stdout.write('not-json');
    return;
  }
  setTimeout(() => {
    process.stdout.write('{"status":"completed"}\n');
  }, 80);
});

import hashlib
import json
import os
import sys


CHILD_SCHEMA_VERSION = (
    'personal-ai-agent-local-training-darwin-suspended-exec-child/v1'
)
ENTRY_FD = 0


entry_stat = os.fstat(ENTRY_FD)
entry_bytes = os.pread(ENTRY_FD, entry_stat.st_size, 0)
marker_fd = os.open(
    sys.argv[1],
    os.O_CREAT | os.O_EXCL | os.O_WRONLY,
    0o600,
)
try:
    os.write(marker_fd, b'executed-after-resume\n')
finally:
    os.close(marker_fd)

print(json.dumps({
    'entrySha256': hashlib.sha256(entry_bytes).hexdigest(),
    'schemaVersion': CHILD_SCHEMA_VERSION,
    'status': 'executed-after-resume',
}, separators=(',', ':'), sort_keys=True))

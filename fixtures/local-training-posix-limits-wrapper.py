import json
import os
import resource
import sys


LIMITS = (
    ('coreDumpBytes', resource.RLIMIT_CORE, 0),
    ('cpuSeconds', resource.RLIMIT_CPU, 1),
    ('fileSizeBytes', resource.RLIMIT_FSIZE, 65_536),
    ('openFiles', resource.RLIMIT_NOFILE, 32),
)
MEMORY_PROBE_BYTES = 8 * 1024 * 1024 * 1024


def apply_hard_limit(kind, value):
    _, current_hard = resource.getrlimit(kind)
    if current_hard != resource.RLIM_INFINITY and current_hard < value:
        raise ValueError('requested limit exceeds current hard limit')
    resource.setrlimit(kind, (value, current_hard))
    resource.setrlimit(kind, (value, value))
    if resource.getrlimit(kind) != (value, value):
        raise ValueError('limit did not become exact')


def write_status(status):
    payload = json.dumps(status, separators=(',', ':'), sort_keys=True)
    os.write(3, f'{payload}\n'.encode('utf-8'))
    os.close(3)


def run_child(arguments):
    if len(arguments) < 2 or arguments[0] != '--':
        raise ValueError('child command is required')
    applied = {}
    for name, kind, value in LIMITS:
        apply_hard_limit(kind, value)
        applied[name] = value
    write_status({'limits': applied, 'status': 'applied'})
    command = arguments[1]
    os.execve(
        command,
        [command, *arguments[2:]],
        {'LANG': 'C', 'LC_ALL': 'C'},
    )


def probe_memory_limit():
    try:
        apply_hard_limit(resource.RLIMIT_AS, MEMORY_PROBE_BYTES)
        status = 'applied'
    except (OSError, ValueError):
        status = 'unavailable'
    print(json.dumps(
        {
            'actualMlxMemoryLimitEnforced': False,
            'addressSpaceProbe': status,
        },
        separators=(',', ':'),
        sort_keys=True,
    ))


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else ''
    if mode == 'run':
        run_child(sys.argv[2:])
        return
    if mode == 'memory-probe':
        probe_memory_limit()
        return
    raise ValueError('unsupported wrapper mode')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError):
        print('{"status":"limit-setup-failed"}', file=sys.stderr)
        raise SystemExit(70)

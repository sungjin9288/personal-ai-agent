import ctypes
import fcntl
import hashlib
import json
import os
import signal
import sys


BROKER_SCHEMA_VERSION = (
    'personal-ai-agent-local-training-darwin-suspended-exec-broker/v1'
)
CS_CDHASH_BYTES = 20
CS_OPS_CDHASH = 5
POSIX_SPAWN_START_SUSPENDED = 0x0080
STATUS_FD = 5
ENTRY_FD = 4


def write_status(value):
    payload = json.dumps(
        value,
        separators=(',', ':'),
        sort_keys=True,
    ).encode('utf-8') + b'\n'
    os.write(STATUS_FD, payload)


def wait_result(pid):
    _, status = os.waitpid(pid, 0)
    if os.WIFEXITED(status):
        return {
            'childExitCode': os.WEXITSTATUS(status),
            'childSignal': None,
        }
    if os.WIFSIGNALED(status):
        return {
            'childExitCode': None,
            'childSignal': os.WTERMSIG(status),
        }
    return {
        'childExitCode': None,
        'childSignal': None,
    }


def c_string_array(values):
    encoded = [value.encode('utf-8') for value in values]
    return (ctypes.c_char_p * (len(encoded) + 1))(
        *encoded,
        None,
    )


def configure_libc():
    libc = ctypes.CDLL(None, use_errno=True)
    libc.posix_spawnattr_init.argtypes = [
        ctypes.POINTER(ctypes.c_void_p),
    ]
    libc.posix_spawnattr_setflags.argtypes = [
        ctypes.POINTER(ctypes.c_void_p),
        ctypes.c_short,
    ]
    libc.posix_spawnattr_destroy.argtypes = [
        ctypes.POINTER(ctypes.c_void_p),
    ]
    libc.posix_spawn_file_actions_init.argtypes = [
        ctypes.POINTER(ctypes.c_void_p),
    ]
    libc.posix_spawn_file_actions_adddup2.argtypes = [
        ctypes.POINTER(ctypes.c_void_p),
        ctypes.c_int,
        ctypes.c_int,
    ]
    libc.posix_spawn_file_actions_destroy.argtypes = [
        ctypes.POINTER(ctypes.c_void_p),
    ]
    libc.posix_spawn.argtypes = [
        ctypes.POINTER(ctypes.c_int),
        ctypes.c_char_p,
        ctypes.c_void_p,
        ctypes.POINTER(ctypes.c_void_p),
        ctypes.POINTER(ctypes.c_char_p),
        ctypes.POINTER(ctypes.c_char_p),
    ]
    libc.csops.argtypes = [
        ctypes.c_int,
        ctypes.c_uint,
        ctypes.c_void_p,
        ctypes.c_size_t,
    ]
    return libc


def run(expected_cdhash, executable, child_args):
    if (
        len(expected_cdhash) != CS_CDHASH_BYTES * 2
        or any(character not in '0123456789abcdef' for character in expected_cdhash)
        or not os.path.isabs(executable)
        or not child_args
    ):
        raise ValueError('invalid suspended exec input')

    descriptor_flags = fcntl.fcntl(STATUS_FD, fcntl.F_GETFD)
    fcntl.fcntl(
        STATUS_FD,
        fcntl.F_SETFD,
        descriptor_flags | fcntl.FD_CLOEXEC,
    )

    libc = configure_libc()
    attributes = ctypes.c_void_p()
    file_actions = ctypes.c_void_p()
    init_error = libc.posix_spawnattr_init(ctypes.byref(attributes))
    if init_error != 0:
        raise OSError(init_error, 'posix_spawnattr_init failed')
    actions_error = libc.posix_spawn_file_actions_init(
        ctypes.byref(file_actions),
    )
    if actions_error != 0:
        libc.posix_spawnattr_destroy(ctypes.byref(attributes))
        raise OSError(actions_error, 'posix_spawn_file_actions_init failed')

    pid = ctypes.c_int()
    argv = c_string_array([executable, *child_args])
    environment = c_string_array(['LANG=C', 'LC_ALL=C'])
    try:
        flag_error = libc.posix_spawnattr_setflags(
            ctypes.byref(attributes),
            POSIX_SPAWN_START_SUSPENDED,
        )
        if flag_error != 0:
            raise OSError(flag_error, 'posix_spawnattr_setflags failed')
        dup_error = libc.posix_spawn_file_actions_adddup2(
            ctypes.byref(file_actions),
            ENTRY_FD,
            0,
        )
        if dup_error != 0:
            raise OSError(dup_error, 'posix_spawn_file_actions_adddup2 failed')
        spawn_error = libc.posix_spawn(
            ctypes.byref(pid),
            executable.encode('utf-8'),
            ctypes.byref(file_actions),
            ctypes.byref(attributes),
            argv,
            environment,
        )
        if spawn_error != 0:
            raise OSError(spawn_error, 'posix_spawn failed')
    finally:
        libc.posix_spawn_file_actions_destroy(
            ctypes.byref(file_actions),
        )
        libc.posix_spawnattr_destroy(ctypes.byref(attributes))

    actual_cdhash = (ctypes.c_ubyte * CS_CDHASH_BYTES)()
    csops_result = libc.csops(
        pid.value,
        CS_OPS_CDHASH,
        actual_cdhash,
        CS_CDHASH_BYTES,
    )
    actual_bytes = bytes(actual_cdhash)
    matched = (
        csops_result == 0
        and actual_bytes.hex() == expected_cdhash
    )
    if not matched:
        os.kill(pid.value, signal.SIGKILL)
        result = wait_result(pid.value)
        write_status({
            'actualCdHashSha256': hashlib.sha256(actual_bytes).hexdigest(),
            'cdHashCheckedBeforeResume': True,
            'cdHashMatched': False,
            **result,
            'childResumed': False,
            'schemaVersion': BROKER_SCHEMA_VERSION,
        })
        return 0

    os.kill(pid.value, signal.SIGCONT)
    result = wait_result(pid.value)
    write_status({
        'actualCdHashSha256': hashlib.sha256(actual_bytes).hexdigest(),
        'cdHashCheckedBeforeResume': True,
        'cdHashMatched': True,
        **result,
        'childResumed': True,
        'schemaVersion': BROKER_SCHEMA_VERSION,
    })
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(run(sys.argv[1], sys.argv[2], sys.argv[3:]))
    except Exception:
        write_status({
            'actualCdHashSha256': None,
            'cdHashCheckedBeforeResume': False,
            'cdHashMatched': False,
            'childExitCode': None,
            'childResumed': False,
            'childSignal': None,
            'schemaVersion': BROKER_SCHEMA_VERSION,
        })
        raise SystemExit(70)

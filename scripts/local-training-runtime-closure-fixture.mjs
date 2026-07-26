export const LOCAL_TRAINING_RUNTIME_CLOSURE_ENTRY_PATH =
  'mlx_lm_lora.py';

export const LOCAL_TRAINING_RUNTIME_CLOSURE_INTERPRETER_PATH =
  'runtime/bin/python3';

export const LOCAL_TRAINING_RUNTIME_CLOSURE_TRAINER_FILES =
  Object.freeze([
    Object.freeze({
      content: 'VERSION = "fixture-0.31.3"\n',
      path: 'mlx_lm/__init__.py',
    }),
    Object.freeze({
      content:
        'def main():\n    return "fixture-only-no-training"\n',
      path: 'mlx_lm/lora.py',
    }),
    Object.freeze({
      content:
        'from mlx_lm.lora import main\n\nmain()\n',
      mode: 0o700,
      path: LOCAL_TRAINING_RUNTIME_CLOSURE_ENTRY_PATH,
    }),
    Object.freeze({
      content: 'fixture-pinned-python-runtime-never-spawned\n',
      mode: 0o700,
      path: LOCAL_TRAINING_RUNTIME_CLOSURE_INTERPRETER_PATH,
    }),
  ]);

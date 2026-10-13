# pksb3

Compress Scratch projects.


## Usage

Pack a project:

```sh
pksb3 project.sb3
```

This writes `project.pk.sb3` alongside the input file. To choose an output path:

```sh
pksb3 project.sb3 packed.sb3
```

It prints a diff of `project.json`, the compression ratio achieved, and how
the result compares with 4, 8, 16, 32, and 64 KiB size budgets.

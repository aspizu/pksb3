# pksb3

Compress Scratch projects.

## Usage

Pack a project:

```sh
pnpm pksb3 project.sb3
```

This writes `project.pk.sb3` alongside the input file. To choose an output path:

```sh
pnpm pksb3 project.sb3 packed.sb3
```

ZIP compression defaults to level `9` (maximum). Use `--compression-level` to choose
`1` (fastest) through `9`, or `0` to disable ZIP compression:

```sh
pnpm pksb3 --compression-level 6 project.sb3
```

It prints the compression ratio achieved and how the result compares with 4, 8, 16,
32, and 64 KiB size budgets. To also print a diff of `project.json`:

```sh
pnpm pksb3 --diff project.sb3
```

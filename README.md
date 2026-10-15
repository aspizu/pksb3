# pksb3

Compress Scratch projects using ASCII identifiers.

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

It prints the original and packed sizes and the percentage saved. Use `--budget` to
also compare the output with one size budget:

```sh
pnpm pksb3 --budget 4kb project.sb3
```

Budgets are `2kb`, `4kb`, `8kb`, `16kb`, `32kb`, or `64kb` (case-insensitive), using
1024 bytes per KiB. Omitting `--budget` skips the budget line. Savings and remaining
budget are green; growth and exceeded budgets are red.
An exact match prints `=4kB Perfect!` in green for a `4kb` budget.

To also print a diff of `project.json`:

```sh
pnpm pksb3 --diff project.sb3
```

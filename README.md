pksb3 compresses Scratch projects (.sb3 files)

#### Usage

```shell
pnpm run pksb3 project.sb3 [--budget 2kb/4kb/8kb/16kb/32kb/64kb] [--compression-level 0..9]
```

pksb3 employs various JSON hacks to reduce the size of the `project.json` file inside the .sb3

Lowering the compression level might help some projects, default is 9.

With the `--budget` option, it will print the remaining bytes left until you exhaust the sizecoding budget.

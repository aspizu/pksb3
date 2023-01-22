import argparse
from pathlib import Path

import humanize
from packer import pack_project

argparser = argparse.ArgumentParser(
    prog="pksb3",
    description="Compress Scratch projects by minification and other optimizations",
)


def parse_arg_input(argument: str) -> Path:
    path = Path(argument)
    if not path.exists():
        argparser.error(f"{path} does not exist")
    if path.is_dir():
        argparser.error(f"{path} is a directory")
    return path


def parse_arg_output(argument: str) -> Path:
    path = Path(argument)
    if path.is_dir():
        argparser.error(f"{path} is a directory")
    return path


argparser.add_argument(
    "input", type=parse_arg_input, help="Path to input .sb3 project file"
)
argparser.add_argument(
    "output", type=parse_arg_output, help="Path to output .sb3 project file"
)

args = argparser.parse_args()
input: Path = args.input
output: Path = args.output


pack_project(input, output)


input_size = input.stat().st_size
output_size = output.stat().st_size


compression_percentage = output_size / input_size * 100

print(
    f"input file size:  {humanize.naturalsize(input_size)} ({input_size} bytes)\n"
    f"output file size: {humanize.naturalsize(output_size)} ({output_size} bytes)\n"
    f"compression percentage of {compression_percentage:.5}%"
)

import json
from io import TextIOWrapper
from pathlib import Path
from typing import Callable
from zipfile import ZIP_DEFLATED, ZipFile

from name_generator import NameGenerator
from rich import print  # type: ignore
from schema import Block, Blocks, Input, Project, Sprite

# A. Minification:
#   1. Rename variables
#   2. Rename lists
#   3. Rename functions
#   4. Rename function arguments
#   5. Remove comments

# B. Block Tree Optimizations:
#   1. Constant folding

# C. Turbowarp's ID Optimization

# D. Compress costumes:
#   1. SVG - https://github.com/svg/svgo
#       notes: don't enable remove xmlns
#   2. PNG - (LOSSLESS) https://github.com/yumin-chen/png-optimizer
#          - (LOSSY)    https://github.com/chrissimpkins/Crunch

# E. Compress sounds:
#   1. Convert WAV to MP3


def visit_block_inputs(
    blocks: Blocks, func: Callable[[str, Block, str, Input], None]
) -> None:
    for block_id, block in blocks.items():
        # scratch stores top-level variable/list reporters as lists instead of `Block`s
        if isinstance(block, list):
            continue
        for input_name, input in block["inputs"].items():
            func(block_id, block, input_name, input)


def pack(sprite: Sprite, global_variable_names_: dict[str, str] | None = None):
    global_variable_names = global_variable_names_ or {}
    # mapping variable id and new variable name
    variable_name_generator = NameGenerator()
    variable_names: dict[str, str] = {}

    # scratch stores a mapping from variable ids to variable names and default values
    for variable_id, variable in sprite["variables"].items():
        new_name = next(variable_name_generator)
        variable_names[variable_id] = new_name
        sprite["variables"][variable_id] = (new_name, variable[1])

    # variables reporters have the name and id both, update the name
    def rename_variable_reporters(
        block_id: str, block: Block, input_name: str, input: Input
    ):
        if not (input[0] == 3 and input[1][0] == 12):
            return
        try:
            new_name = variable_names[input[1][2]]
        except KeyError:
            new_name = global_variable_names[input[1][2]]
        sprite["blocks"][block_id]["inputs"][input_name] = (
            3,
            (12, new_name, input[1][2]),
            input[2],
        )

    visit_block_inputs(sprite["blocks"], rename_variable_reporters)

    return variable_names


def pack_project(input: Path, output: Path) -> None:
    with ZipFile(input) as input_sb3:
        with ZipFile(
            output,
            "w",
            compression=ZIP_DEFLATED,  # Scratch uses deflate
            compresslevel=6,  # Scratch uses 6
        ) as output_sb3:
            for file in input_sb3.filelist:
                if file.filename != "project.json":
                    output_sb3.writestr(file, input_sb3.read(file))
            project: Project = json.load(input_sb3.open("project.json"))
            global_variable_names = pack(project["targets"][0])
            for sprite in project["targets"][1:]:
                pack(sprite, global_variable_names)
            json.dump(
                project,
                TextIOWrapper(output_sb3.open("project.json", "w")),
            )

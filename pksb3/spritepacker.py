from typing import Callable, Optional

from name_generator import NameGenerator
from rich import print
from schema import *


def visit_block_inputs(
    blocks: Blocks, *funcs: Callable[[str, Block, str, Input], None]
) -> None:
    for block_id, block in blocks.items():
        # scratch stores top-level variable/list reporters as lists instead of `Block`s
        if isinstance(block, list):
            continue
        for input_name, input in block["inputs"].items():
            for func in funcs:
                func(block_id, block, input_name, input)


class SpritePacker:
    def __init__(
        self, sprite: Sprite, stage_packer: Optional["SpritePacker"] = None
    ) -> None:
        self.sprite = sprite
        self.stage_packer = stage_packer
        self.variable_names: dict[str, str] = {}
        self.list_names: dict[str, str] = {}
        self.rename_variable_mapper()
        self.rename_list_mapper()
        visit_block_inputs(
            self.sprite["blocks"],
            self.rename_variable_reporters,
            self.rename_list_reporters,
        )
        if self.sprite["name"] == "Main":
            print(self.sprite["blocks"])

    def rename_variable_mapper(self) -> None:
        name_generator = NameGenerator(
            len(self.stage_packer.variable_names) if self.stage_packer else 0
        )
        for variable_id, variable in self.sprite["variables"].items():
            old_name = variable[0]
            new_name = next(name_generator)
            self.variable_names[old_name] = new_name
            self.sprite["variables"][variable_id] = (new_name, variable[1])

    def rename_list_mapper(self) -> None:
        name_generator = NameGenerator(
            len(self.stage_packer.list_names) if self.stage_packer else 0
        )
        for list_id, list in self.sprite["lists"].items():
            old_name = list[0]
            new_name = next(name_generator)
            self.list_names[old_name] = new_name
            self.sprite["lists"][list_id] = (new_name, list[1])

    def rename_variable_reporters(
        self, block_id: str, block: Block, input_name: str, input: Input
    ) -> None:
        if not (input[0] == 3 and input[1][0] == 12):
            return
        try:
            new_name = self.variable_names[input[1][1]]
        except KeyError:
            assert self.stage_packer is not None
            new_name = self.stage_packer.variable_names[input[1][1]]
        self.sprite["blocks"][block_id]["inputs"][input_name] = (
            3,
            (12, new_name, input[1][2]),
            input[2],
        )

    def rename_list_reporters(
        self, block_id: str, block: Block, input_name: str, input: Input
    ):
        if not (input[0] == 3 and input[1][0] == 13):
            return
        try:
            new_name = self.list_names[input[1][2]]
        except KeyError:
            assert self.stage_packer is not None
            new_name = self.stage_packer.list_names[input[1][2]]
        self.sprite["blocks"][block_id]["inputs"][input_name] = (
            3,
            (13, new_name, input[1][2]),
            input[2],
        )

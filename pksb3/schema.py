""" Defines the schema of a .sb3 file's project.json file """

from typing import Any, Literal, TypedDict, Union

VariableInput = tuple[Literal[3], tuple[Literal[12], str, str], Any]
ListInput = tuple[Literal[3], tuple[Literal[13], str, str], Any]
Input = Union[VariableInput, ListInput]
Field = tuple[str, str | None]


class Block(TypedDict):
    opcode: str
    next: str | None
    parent: str | None
    inputs: dict[str, Input]
    fields: dict[str, Field]
    topLevel: bool


Blocks = dict[str, Block]


class Costume(TypedDict):
    name: str
    assetId: str
    dataFormat: str
    md5ext: str


class Sprite(TypedDict):
    isStage: bool
    name: str
    variables: dict[str, tuple[str, int | str]]
    lists: dict[str, tuple[str, list[int | str]]]
    blocks: Blocks
    costumes: list[Costume]
    sounds: list[Any]


class Meta(TypedDict):
    semver: str


class MonitorParams(TypedDict):
    VARIABLE: str  # variable name


class Monitor(TypedDict):
    id: str
    mode: str  # "default"
    opcode: str  # "daata_variable"
    params: MonitorParams
    spriteName: str | None
    value: int | str
    width: int
    height: int
    x: int
    y: int
    visible: bool
    sliderMin: int
    sliderMax: int
    isDiscrete: bool


class Project(TypedDict):
    targets: list[Sprite]
    monitors: list[Monitor]
    meta: Meta


__all__ = ["Block", "Input", "Field", "Blocks", "Costume", "Sprite", "Meta", "Project"]

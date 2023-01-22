import json
from io import TextIOWrapper
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from projectpacker import ProjectPacker
from schema import *


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
            ProjectPacker(project)
            json.dump(
                project,
                TextIOWrapper(output_sb3.open("project.json", "w")),
                separators=(",", ":"),  # i hate this
            )

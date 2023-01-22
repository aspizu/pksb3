from schema import *
from spritepacker import SpritePacker


class ProjectPacker:
    def __init__(self, project: Project) -> None:
        self.project = project
        # First element of targets is the stage sprite
        self.stage_packer = SpritePacker(project["targets"][0])
        self.sprite_packers: dict[str, SpritePacker] = {}
        for sprite in project["targets"][1:]:
            self.sprite_packers[sprite["name"]] = SpritePacker(
                sprite, self.stage_packer
            )
        self.rename_monitors()

    def rename_monitors(self) -> None:
        for monitor in self.project["monitors"]:
            if monitor["spriteName"] is None:
                monitor["params"]["VARIABLE"] = self.stage_packer.variable_names[
                    monitor["params"]["VARIABLE"]
                ]
            else:
                monitor["params"]["VARIABLE"] = monitor["params"][
                    "VARIABLE"
                ] = self.sprite_packers[monitor["spriteName"]].variable_names[
                    monitor["params"]["VARIABLE"]
                ]

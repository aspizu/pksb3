#!/bin/bash

python pksb3 $1.sb3 $1_out.sb3
python sb3debug.py $1.sb3 $1.json
python sb3debug.py $1_out.sb3 $1_out.json

stat --format "%s" $1.json
stat --format "%s" $1_out.json
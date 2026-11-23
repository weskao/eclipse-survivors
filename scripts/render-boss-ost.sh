#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
font=/usr/share/sounds/sf2/FluidR3_GM.sf2
if [[ ! -s "$font" ]]; then echo "Missing FluidR3 GM SoundFont: $font" >&2; exit 1; fi
for command in fluidsynth ffmpeg ffprobe; do command -v "$command" >/dev/null; done
node scripts/compose-boss-ost.mjs public/audio/boss
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
for midi in public/audio/boss/*.mid; do
  base="${midi%.mid}"
  fluidsynth -n -i -g 0.57 -r 24000 -F "$work/$(basename "$base").wav" "$font" "$midi" >/dev/null 2>&1
  ffmpeg -hide_banner -loglevel error -y -i "$work/$(basename "$base").wav" \
    -af 'highpass=f=30,aecho=0.7:0.58:95|170|255:0.21|0.16|0.09,alimiter=limit=0.92' \
    -ar 24000 -ac 2 -c:a libmp3lame -b:a 128k "$base.mp3"
  duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$base.mp3")
  awk "BEGIN { exit !($duration > 14 && $duration < 115) }"
  [[ $(stat -c '%s' "$base.mp3") -gt 50000 ]]
  echo "Rendered $base.mp3 ($duration seconds)"
done
find public/audio/boss -name '*.mid' -delete
cp /usr/share/doc/fluid-soundfont-gm/copyright public/audio/boss/SOUNDFONT-LICENSE.txt
[[ $(find public/audio/boss -name '*.mp3' | wc -l) -eq 13 ]]

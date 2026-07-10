"""Fail if a skill with a text-only archetype has no registered generator."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
archetype_text = (ROOT / "data/archetypes.yaml").read_text()
blocks = re.split(r"(?m)^- id: ", archetype_text)[1:]

eligible_skills = {
    re.search(r"(?m)^  skill_id: (.+)$", block).group(1)
    for block in blocks
    if re.search(r"(?m)^  requires_visual_component: false$", block)
}

app_text = (ROOT / "app.js").read_text()
extra_text = (ROOT / "extra-generators.js").read_text()
covered_skills = set(re.findall(r"skill_id: '([^']+)'", app_text))
covered_skills.update(re.findall(r": gen\('[^']+', '([^']+)'", extra_text))

missing = sorted(eligible_skills - covered_skills)
if missing:
    raise SystemExit(f"Missing generators for {len(missing)} eligible skills: {', '.join(missing)}")

print(f"All {len(eligible_skills)} skills with non-visual archetypes have a registered generator.")

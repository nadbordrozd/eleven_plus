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
eligible_archetypes = {
    block.splitlines()[0].strip()
    for block in blocks
    if re.search(r"(?m)^  requires_visual_component: false$", block)
}

generator_text = "\n".join(path.read_text() for path in sorted((ROOT / "generators").glob("*.js")))
registered = re.findall(r"^\s*([a-z0-9_]+):\s*gen\(\s*'([^']+)',\s*'([^']+)'", generator_text, re.MULTILINE)
covered_skills = {skill for _, _, skill in registered} | set(re.findall(r"skill_id: '([^']+)'", generator_text))
implemented_archetypes = {archetype for _, archetype, _ in registered}
# Older generators are registered by function name rather than with gen(...).
implemented_archetypes.update(re.findall(r"^  ([a-z0-9_]+): [A-Za-z]+,$", generator_text, re.MULTILINE))

missing = sorted(eligible_skills - covered_skills)
if missing:
    raise SystemExit(f"Missing generators for {len(missing)} eligible skills: {', '.join(missing)}")

missing_archetypes = sorted(eligible_archetypes - implemented_archetypes)
if missing_archetypes:
    raise SystemExit(f"Missing generators for {len(missing_archetypes)} text-only archetypes: {', '.join(missing_archetypes)}")

print(
    f"All {len(eligible_skills)} eligible skills and all {len(eligible_archetypes)} "
    "text-only archetypes have registered generators."
)

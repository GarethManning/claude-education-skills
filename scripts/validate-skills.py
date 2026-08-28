#!/usr/bin/env python3
"""Validate all SKILL.md files have correct Agent Skills v2 frontmatter."""

import glob
import re
import sys

import yaml


SUPPORTED_INPUT_TYPES = {"string", "array", "integer", "number", "boolean"}
SUPPORTED_EVIDENCE_STRENGTHS = {
    "strong",
    "moderate",
    "low-moderate",
    "medium",
    "emerging",
    "original",
    "practitioner",
}


def validate_input_fields(fields, section, errors):
    if not isinstance(fields, list):
        errors.append(f"input_schema.{section} must be a list")
        return []

    names = []
    for index, field in enumerate(fields):
        location = f"input_schema.{section}[{index}]"
        if not isinstance(field, dict):
            errors.append(f"{location} must be a mapping")
            continue

        name = field.get("field")
        field_type = field.get("type")
        description = field.get("description")
        if not isinstance(name, str) or not name:
            errors.append(f"{location}.field must be a non-empty string")
        else:
            names.append(name)
        if field_type not in SUPPORTED_INPUT_TYPES:
            errors.append(
                f"{location}.type must be one of {sorted(SUPPORTED_INPUT_TYPES)}, "
                f"got {field_type!r}"
            )
        if not isinstance(description, str) or not description:
            errors.append(f"{location}.description must be a non-empty string")

    return names


def validate_skill(path):
    errors = []
    warnings = []

    with open(path) as file:
        content = file.read()

    line_count = content.count("\n") + 1
    if line_count > 500:
        warnings.append(f"File is {line_count} lines (over 500-line guideline)")

    if not content.startswith("---"):
        errors.append("No YAML frontmatter (missing opening ---)")
        return errors, warnings

    try:
        end = content.index("---", 3)
    except ValueError:
        errors.append("No closing --- for YAML frontmatter")
        return errors, warnings

    try:
        frontmatter = yaml.safe_load(content[3:end])
    except yaml.YAMLError as error:
        errors.append(f"Invalid YAML: {error}")
        return errors, warnings

    if not isinstance(frontmatter, dict):
        errors.append("YAML frontmatter is not a mapping")
        return errors, warnings

    name = frontmatter.get("name")
    if not name:
        errors.append("Missing 'name' field")
    elif not re.match(r"^[a-z0-9-]+$", name):
        errors.append(f"'name' contains invalid chars: {name}")
    elif len(name) > 64:
        errors.append(f"'name' exceeds 64 chars: {len(name)}")

    description = frontmatter.get("description")
    if not description:
        errors.append("Missing 'description' field")
    elif len(description) > 250:
        errors.append(f"'description' exceeds 250 chars: {len(description)}")

    disabled = frontmatter.get("disable-model-invocation")
    if disabled is None:
        errors.append("Missing 'disable-model-invocation' field")
    elif not isinstance(disabled, bool):
        errors.append(f"'disable-model-invocation' is not boolean: {type(disabled)}")

    for field in ["skill_id", "skill_name", "domain", "evidence_strength"]:
        if field not in frontmatter:
            errors.append(f"Missing existing field: '{field}'")

    if frontmatter.get("evidence_strength") not in SUPPORTED_EVIDENCE_STRENGTHS:
        errors.append(
            "'evidence_strength' must be one of "
            f"{sorted(SUPPORTED_EVIDENCE_STRENGTHS)}, got {frontmatter.get('evidence_strength')!r}"
        )

    path_parts = path.split("/")
    expected_domain = path_parts[-3]
    expected_name = path_parts[-2]
    expected_skill_id = f"{expected_domain}/{expected_name}"
    if name and name != expected_name:
        errors.append(f"'name' must match parent directory: {expected_name}")
    if frontmatter.get("domain") != expected_domain:
        errors.append(f"'domain' must match domain directory: {expected_domain}")
    if frontmatter.get("skill_id") != expected_skill_id:
        errors.append(f"'skill_id' must match path: {expected_skill_id}")

    input_schema = frontmatter.get("input_schema")
    if not isinstance(input_schema, dict):
        errors.append("Missing or invalid 'input_schema' mapping")
    else:
        required_names = validate_input_fields(input_schema.get("required"), "required", errors)
        optional_names = validate_input_fields(input_schema.get("optional", []), "optional", errors)
        all_names = required_names + optional_names
        duplicate_names = sorted(name for name in set(all_names) if all_names.count(name) > 1)
        if duplicate_names:
            errors.append(f"Duplicate input field names: {', '.join(duplicate_names)}")

    for field in ["evidence_sources", "chains_well_with", "tags"]:
        if not isinstance(frontmatter.get(field), list):
            errors.append(f"'{field}' must be a list")

    return errors, warnings


def main():
    paths = sorted(glob.glob("skills/**/SKILL.md", recursive=True))
    if not paths:
        print("ERROR: No SKILL.md files found")
        sys.exit(1)

    total_errors = 0
    total_warnings = 0
    for path in paths:
        errors, warnings = validate_skill(path)
        for error in errors:
            print(f"ERROR  {path}: {error}")
        for warning in warnings:
            print(f"WARN   {path}: {warning}")
        total_errors += len(errors)
        total_warnings += len(warnings)

    print(f"\nValidated {len(paths)} SKILL.md files")
    print(f"Errors: {total_errors}, Warnings: {total_warnings}")
    if total_errors > 0:
        sys.exit(1)
    print("All SKILL.md files pass validation")


if __name__ == "__main__":
    main()

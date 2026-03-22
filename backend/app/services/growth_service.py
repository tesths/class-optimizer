# -*- coding: utf-8 -*-
"""Compatibility wrapper for growth stage helpers.

The root-level BDD tests import ``backend.app.services.growth_service`` with a
theme-first function signature. Keep that surface area available while the
backend uses ``app.utils.growth`` as the canonical implementation.
"""

from app.utils.growth import (
    calculate_growth_stage as calculate_stage_by_score,
    get_growth_color as get_stage_color,
    get_growth_icon as get_stage_icon,
    get_growth_label as get_stage_label,
    get_growth_progress as get_stage_progress,
)


def calculate_growth_stage(theme: str, score: int) -> str:
    """Return the growth stage for a score under the given theme."""
    return calculate_stage_by_score(score, theme)


def get_growth_icon(theme: str, stage: str) -> str:
    """Return the icon for a stage under the given theme."""
    return get_stage_icon(stage, theme)


def get_growth_color(theme: str, stage: str) -> str:
    """Return the color for a stage under the given theme."""
    return get_stage_color(stage, theme)


def get_growth_label(theme: str, stage: str) -> str:
    """Return the label for a stage under the given theme."""
    return get_stage_label(stage, theme)


def get_growth_progress(theme: str, score: int) -> int:
    """Return in-stage progress percentage for the score."""
    return get_stage_progress(score, theme)

# -*- coding: utf-8 -*-
"""Growth stage calculation utilities.

Thresholds are aligned with the product requirements:
- Farm: seed(0-9)/sprout(10-29)/seedling(30-59)/flower(60-99)/harvest(100+)
- Tree: seed(0-9)/bud(10-29)/sapling(30-59)/young_tree(60-99)/big_tree(100+)
"""

from typing import Sequence, TypedDict


class StageMeta(TypedDict):
    """Metadata for a growth stage."""

    min: int
    max: float
    emoji: str
    label: str
    color: str


FARM_STAGE_META: dict[str, StageMeta] = {
    "seed": {"min": 0, "max": 10, "emoji": "🌱", "label": "种子", "color": "#8B4513"},
    "sprout": {"min": 10, "max": 30, "emoji": "🌿", "label": "嫩芽", "color": "#90EE90"},
    "seedling": {"min": 30, "max": 60, "emoji": "🌾", "label": "幼苗", "color": "#32CD32"},
    "flower": {"min": 60, "max": 100, "emoji": "🌸", "label": "开花", "color": "#FF69B4"},
    "harvest": {"min": 100, "max": float("inf"), "emoji": "🎉", "label": "丰收", "color": "#FFD700"},
}

TREE_STAGE_META: dict[str, StageMeta] = {
    "seed": {"min": 0, "max": 10, "emoji": "🌰", "label": "种子", "color": "#8B4513"},
    "bud": {"min": 10, "max": 30, "emoji": "🌱", "label": "萌芽", "color": "#98FB98"},
    "sapling": {"min": 30, "max": 60, "emoji": "🌿", "label": "树苗", "color": "#228B22"},
    "young_tree": {"min": 60, "max": 100, "emoji": "🌳", "label": "小树", "color": "#006400"},
    "big_tree": {"min": 100, "max": float("inf"), "emoji": "🌲", "label": "大树", "color": "#2E8B57"},
}

DEFAULT_GROUP_GROWTH_THRESHOLDS = [0, 20, 50, 90, 140]


def get_stage_meta(theme: str) -> dict[str, StageMeta]:
    """Return stage metadata for the requested theme."""
    if theme == "farm":
        return FARM_STAGE_META
    if theme == "tree":
        return TREE_STAGE_META
    raise ValueError(f"Unsupported growth theme: {theme}")


def calculate_growth_stage(total_score: int, theme: str = "farm") -> str:
    """Calculate growth stage based on score and theme.

    Args:
        total_score: The student's total score
        theme: Either "farm" or "tree"
    Returns:
        Growth stage string
    """
    stages = get_stage_meta(theme)
    score = max(0, total_score)

    for stage_name, meta in reversed(list(stages.items())):
        if score >= meta["min"]:
            return stage_name
    return "seed"


def get_growth_icon(stage: str, theme: str = "farm") -> str:
    """Get the icon for a growth stage."""
    stages = get_stage_meta(theme)
    return stages.get(stage, stages["seed"])["emoji"]


def get_growth_color(stage: str, theme: str = "farm") -> str:
    """Get the color for a growth stage."""
    stages = get_stage_meta(theme)
    return stages.get(stage, stages["seed"])["color"]


def get_growth_label(stage: str, theme: str = "farm") -> str:
    """Get the display label for a growth stage."""
    stages = get_stage_meta(theme)
    return stages.get(stage, stages["seed"])["label"]


def get_growth_progress(total_score: int, theme: str = "farm") -> int:
    """Get in-stage progress percentage for the current score."""
    score = max(0, total_score)
    stage_name = calculate_growth_stage(score, theme)
    stage = get_stage_meta(theme)[stage_name]

    if stage["max"] == float("inf"):
        return 100

    stage_range = stage["max"] - stage["min"]
    progress = ((score - stage["min"]) / stage_range) * 100
    return max(0, min(100, round(progress)))


def validate_growth_thresholds(thresholds: Sequence[int]) -> list[int]:
    """Validate a five-stage threshold list that starts at zero and increases."""
    normalized = [int(value) for value in thresholds]

    if len(normalized) != 5:
        raise ValueError("成长阈值必须提供 5 个阶段分数")
    if normalized[0] != 0:
        raise ValueError("成长阈值的第一档必须是 0")
    if any(value < 0 for value in normalized):
        raise ValueError("成长阈值不能为负数")
    if any(current >= following for current, following in zip(normalized, normalized[1:])):
        raise ValueError("成长阈值必须严格递增")

    return normalized

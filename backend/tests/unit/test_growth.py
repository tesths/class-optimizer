# -*- coding: utf-8 -*-
"""Unit tests for growth stage calculation."""
import pytest
from app.utils.growth import calculate_growth_stage, validate_growth_thresholds


class TestGrowthStage:
    def test_farm_theme_boundaries(self):
        # Farm: seed(0-9), sprout(10-29), seedling(30-59), flower(60-99), harvest(100+)
        assert calculate_growth_stage(0, "farm") == "seed"
        assert calculate_growth_stage(9, "farm") == "seed"
        assert calculate_growth_stage(10, "farm") == "sprout"
        assert calculate_growth_stage(29, "farm") == "sprout"
        assert calculate_growth_stage(30, "farm") == "seedling"
        assert calculate_growth_stage(59, "farm") == "seedling"
        assert calculate_growth_stage(60, "farm") == "flower"
        assert calculate_growth_stage(99, "farm") == "flower"
        assert calculate_growth_stage(100, "farm") == "harvest"
        assert calculate_growth_stage(500, "farm") == "harvest"

    def test_tree_theme_boundaries(self):
        # Tree: seed(0-9), bud(10-29), sapling(30-59), young_tree(60-99), big_tree(100+)
        assert calculate_growth_stage(0, "tree") == "seed"
        assert calculate_growth_stage(9, "tree") == "seed"
        assert calculate_growth_stage(10, "tree") == "bud"
        assert calculate_growth_stage(29, "tree") == "bud"
        assert calculate_growth_stage(30, "tree") == "sapling"
        assert calculate_growth_stage(59, "tree") == "sapling"
        assert calculate_growth_stage(60, "tree") == "young_tree"
        assert calculate_growth_stage(99, "tree") == "young_tree"
        assert calculate_growth_stage(100, "tree") == "big_tree"
        assert calculate_growth_stage(500, "tree") == "big_tree"

    def test_default_theme_is_farm(self):
        """Test that default theme is farm"""
        assert calculate_growth_stage(0, "farm") == "seed"
        assert calculate_growth_stage(10, "farm") == "sprout"
        assert calculate_growth_stage(100, "farm") == "harvest"

    def test_negative_scores(self):
        """Test that negative scores return seed"""
        assert calculate_growth_stage(-1, "farm") == "seed"
        assert calculate_growth_stage(-100, "tree") == "seed"

    def test_validate_growth_thresholds(self):
        """Custom group thresholds must start at zero and strictly increase."""
        assert validate_growth_thresholds([0, 20, 50, 90, 140]) == [0, 20, 50, 90, 140]

        with pytest.raises(ValueError):
            validate_growth_thresholds([10, 20, 50, 90, 140])

        with pytest.raises(ValueError):
            validate_growth_thresholds([0, 20, 20, 90, 140])

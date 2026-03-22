# -*- coding: utf-8 -*-
Feature: 班级管理
  Scenario: 创建新班级
    Given 已登录教师
    When 点击"新建班级"
    And 填写 name="初一(1)班" grade="初一" school_year="2025-2026"
    Then 班级出现在列表中

  Scenario: 非管理员不能删除班级
    Given 我是协同教师（非管理员）
    When 尝试删除班级
    Then 操作被拒绝

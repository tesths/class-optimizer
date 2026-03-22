# -*- coding: utf-8 -*-
Feature: 学生积分
  Scenario: 给学生加分
    Given 在学生列表页
    When 点击学生"张三"的评分按钮
    And 选择 "+2 课堂发言"
    Then 学生积分+2
    And 历史记录增加

  Scenario: 撤销积分（仅管理员）
    Given 我是班级管理员
    When 撤销一条积分记录
    Then 记录标记为已撤销
    And 学生积分恢复

# -*- coding: utf-8 -*-
Feature: 用户认证
  Scenario: 成功注册并登录
    Given 我在注册页面
    When 填写 username="teacher1" password="Pass123" real_name="张老师" subject="数学"
    And 点击注册
    Then 注册成功
    When 使用 teacher1 / Pass123 登录
    Then 登录成功并跳转班级列表

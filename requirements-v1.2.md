# 班级优化积分系统文档包（V1.2）

> 状态：需求已确认，待最终批准后开发
> 日期：2026-03-18

---

# 1. 项目概述

## 1.1 项目目标
构建一个类似“班级优化大师”的教师端系统，支持班级管理、学生管理、积分项目、学生/小组加减分、统计分析、成长可视化（种菜/小树苗）、历史记录追溯，并支持移动端访问。

## 1.2 已确认决策
- 前端框架：Vue 3
- 数据库：SQLite（首版）
- 首期范围：仅教师端
- 成长视觉：种菜风 + 小树苗风，两套都要
- 撤销权限：班级管理员可撤销
- 学期规则：手动创建
- 批量导入：支持 Excel 导入学生
- 小组加分规则：小组积分独立，不同步到学生个人积分
- 登录方式建议：用户名登录（待最终确认）
- 成长风格切换粒度建议：班级级别统一（待最终确认）

---

# 2. 详细功能规格

## 2.1 账号与教师信息
### 注册
字段：
- username（唯一）
- password
- confirm_password
- real_name
- subject（必填）

规则：
- 用户名唯一
- 密码加密存储
- 学科不能为空

### 登录
- username + password
- 登录成功后进入班级列表页

### 教师详情页
展示/可编辑字段：
- 真实姓名
- 学科
- 头像（可选）
- 手机号（可选）
- 邮箱（可选）
- 个人简介（可选）

功能：
- 编辑个人信息
- 修改密码

---

## 2.2 班级管理
### 班级列表页
每个班级展示：
- 班级名称
- 学年
- 学期
- 学生人数
- 协同教师人数
- 成长风格
- 最近活跃时间

功能：
- 新建班级
- 编辑班级
- 删除班级
- 进入班级详情页

### 班级详情页
展示：
- 班级基本信息
- 关联教师
- 学生数量
- 小组数量
- 积分项目数量
- 当前学期信息

功能入口：
- 学生管理
- 小组管理
- 积分项目管理
- 统计页
- 历史记录页
- 学期管理

### 班级字段
- id
- name
- grade
- school_year
- term_id
- description
- visual_theme（farm/tree）
- creator_id
- created_at
- updated_at

---

## 2.3 班级关联教师
功能：
- 按用户名搜索教师
- 添加为协同教师
- 移除协同教师

权限：
- 仅班级管理员可操作

角色：
- class_admin
- class_teacher

---

## 2.4 学生管理
### 学生页
展示：
- 学生列表/卡片
- 搜索框
- 按小组筛选
- 按积分排序
- 当前成长状态图

每个学生显示：
- 姓名
- 学号
- 座号
- 小组
- 当前总积分
- 成长阶段
- 最近一次积分变化时间

功能：
- 添加学生
- 编辑学生
- 删除学生
- 点击打开评分弹窗
- 查看个人积分历史

### 学生字段
- id
- class_id
- name
- student_no
- gender
- seat_no
- avatar_url
- notes
- group_id（可空）
- created_at
- updated_at

规则：
- student_no 建议班级内唯一

---

## 2.5 Excel 批量导入学生
支持：
- 下载模板
- 上传 .xlsx 文件
- 预览导入结果
- 执行导入
- 错误行提示

模板字段：
- 姓名
- 学号
- 性别
- 座号
- 小组名称
- 备注

导入规则：
- 重复学号提示冲突
- 小组不存在可选择自动创建（建议支持）
- 记录导入任务日志

---

## 2.6 积分项目管理
### 项目字段
- id
- class_id
- name
- score_type（plus/minus）
- score_value
- subject（可空，空表示通用）
- color_tag（可空）
- icon_name（可空）
- enabled
- sort_order
- created_at
- updated_at

### 功能
- 新建项目
- 编辑项目
- 启用/停用项目
- 删除项目

权限：
- 班级管理员管理
- 协同教师使用

---

## 2.7 学生加减分
### 打分弹窗
包含：
- 学生姓名
- 当前积分
- 当前成长图
- 常用项目快捷按钮
- 自定义项目/备注
- 提交按钮

### 打分记录字段
- id
- class_id
- student_id
- operator_id
- score_item_id
- item_name_snapshot
- score_delta
- score_type
- subject
- remark
- is_revoked
- revoked_by
- revoked_at
- revoke_source_id
- created_at

说明：
- score_delta 直接存 +2 / -1 这类实际数值
- 撤销不删除记录

### 撤销规则
- 班级管理员可撤销任意本班记录
- 撤销后原记录标记 is_revoked = true
- 生成一条撤销操作日志，便于审计

---

## 2.8 小组管理与小组积分
### 小组字段
- id
- class_id
- name
- leader_student_id（可空）
- created_at
- updated_at

### 小组功能
- 新建/编辑/删除小组
- 分配组员
- 查看组员列表
- 查看小组积分
- 给小组加减分

### 小组积分记录字段
- id
- class_id
- group_id
- operator_id
- item_name_snapshot
- score_delta
- subject
- remark
- is_revoked
- revoked_by
- revoked_at
- revoke_source_id
- created_at

规则：
- 小组积分独立于学生个人积分

---

## 2.9 成长可视化
### 班级成长主题
- farm（种菜）
- tree（小树苗）

### 成长阶段建议
#### farm
- 0-9：seed
- 10-29：sprout
- 30-59：seedling
- 60-99：flower
- 100+：harvest

#### tree
- 0-9：seed
- 10-29：bud
- 30-59：sapling
- 60-99：young_tree
- 100+：big_tree

### 展示方式
- 学生卡片展示当前阶段图
- 学生详情可展示完整进度条/成长线
- 班级详情可展示成长墙（后续可选）

---

## 2.10 学期管理
### 学期字段
- id
- name
- start_date
- end_date
- created_by
- created_at

### 功能
- 新建学期
- 编辑学期
- 绑定到班级
- 切换统计口径

规则：
- 学期手动创建

---

## 2.11 统计分析
### 统计维度
- 周
- 月
- 学期

### 学生统计指标
- 总积分
- 周积分
- 月积分
- 学期积分
- 加分次数
- 减分次数
- 扣分学科分布
- 常见扣分项目

### 小组统计指标
- 小组总积分
- 周/月/学期积分
- 小组排行
- 积分变化趋势

### 图表建议
- 学生排行榜柱状图
- 小组排行榜柱状图
- 趋势折线图
- 学科扣分分布图
- 项目使用频率图

---

## 2.12 历史记录
### 学生历史
支持筛选：
- 班级
- 学生
- 学科
- 项目
- 教师
- 时间范围
- 是否撤销

### 小组历史
支持筛选：
- 班级
- 小组
- 学科
- 教师
- 时间范围
- 是否撤销

---

# 3. 页面结构图（文字版）

## 3.1 页面清单
1. 登录页
2. 注册页
3. 教师详情页
4. 班级列表页
5. 班级详情页
6. 学生页
7. 学生评分弹窗
8. 小组页
9. 统计页
10. 历史记录页
11. 积分项目管理页
12. 学期管理页

## 3.2 页面流转
- 登录/注册 → 班级列表
- 班级列表 → 班级详情
- 班级详情 → 学生页 / 小组页 / 统计页 / 历史页 / 积分项目页 / 学期页
- 学生页 → 学生评分弹窗 / 历史筛选

---

# 4. 数据库表结构设计（概要）

## 4.1 users
- id INTEGER PK
- username TEXT UNIQUE NOT NULL
- password_hash TEXT NOT NULL
- is_active BOOLEAN DEFAULT 1
- created_at DATETIME
- updated_at DATETIME

## 4.2 teacher_profiles
- id INTEGER PK
- user_id INTEGER UNIQUE NOT NULL
- real_name TEXT NOT NULL
- subject TEXT NOT NULL
- phone TEXT
- email TEXT
- avatar_url TEXT
- bio TEXT
- created_at DATETIME
- updated_at DATETIME

## 4.3 terms
- id INTEGER PK
- name TEXT NOT NULL
- start_date DATE NOT NULL
- end_date DATE NOT NULL
- created_by INTEGER NOT NULL
- created_at DATETIME

## 4.4 classes
- id INTEGER PK
- name TEXT NOT NULL
- grade TEXT
- school_year TEXT
- term_id INTEGER
- description TEXT
- visual_theme TEXT NOT NULL
- creator_id INTEGER NOT NULL
- created_at DATETIME
- updated_at DATETIME

## 4.5 class_teachers
- id INTEGER PK
- class_id INTEGER NOT NULL
- user_id INTEGER NOT NULL
- role TEXT NOT NULL
- created_at DATETIME
- UNIQUE(class_id, user_id)

## 4.6 students
- id INTEGER PK
- class_id INTEGER NOT NULL
- name TEXT NOT NULL
- student_no TEXT NOT NULL
- gender TEXT
- seat_no TEXT
- avatar_url TEXT
- notes TEXT
- created_at DATETIME
- updated_at DATETIME
- UNIQUE(class_id, student_no)

## 4.7 student_groups
- id INTEGER PK
- class_id INTEGER NOT NULL
- name TEXT NOT NULL
- leader_student_id INTEGER
- created_at DATETIME
- updated_at DATETIME
- UNIQUE(class_id, name)

## 4.8 group_members
- id INTEGER PK
- group_id INTEGER NOT NULL
- student_id INTEGER NOT NULL
- created_at DATETIME
- UNIQUE(group_id, student_id)

## 4.9 score_items
- id INTEGER PK
- class_id INTEGER NOT NULL
- name TEXT NOT NULL
- score_type TEXT NOT NULL
- score_value INTEGER NOT NULL
- subject TEXT
- color_tag TEXT
- icon_name TEXT
- enabled BOOLEAN DEFAULT 1
- sort_order INTEGER DEFAULT 0
- created_at DATETIME
- updated_at DATETIME

## 4.10 student_score_logs
- id INTEGER PK
- class_id INTEGER NOT NULL
- student_id INTEGER NOT NULL
- operator_id INTEGER NOT NULL
- score_item_id INTEGER
- item_name_snapshot TEXT NOT NULL
- score_delta INTEGER NOT NULL
- score_type TEXT NOT NULL
- subject TEXT
- remark TEXT
- is_revoked BOOLEAN DEFAULT 0
- revoked_by INTEGER
- revoked_at DATETIME
- revoke_source_id INTEGER
- created_at DATETIME

## 4.11 group_score_logs
- id INTEGER PK
- class_id INTEGER NOT NULL
- group_id INTEGER NOT NULL
- operator_id INTEGER NOT NULL
- item_name_snapshot TEXT NOT NULL
- score_delta INTEGER NOT NULL
- subject TEXT
- remark TEXT
- is_revoked BOOLEAN DEFAULT 0
- revoked_by INTEGER
- revoked_at DATETIME
- revoke_source_id INTEGER
- created_at DATETIME

## 4.12 import_jobs
- id INTEGER PK
- class_id INTEGER NOT NULL
- operator_id INTEGER NOT NULL
- file_name TEXT NOT NULL
- total_rows INTEGER DEFAULT 0
- success_rows INTEGER DEFAULT 0
- failed_rows INTEGER DEFAULT 0
- error_report TEXT
- created_at DATETIME

---

# 5. API 接口清单（首版）

## 5.1 认证
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- PUT /api/auth/profile
- PUT /api/auth/password

## 5.2 学期
- GET /api/terms
- POST /api/terms
- PUT /api/terms/{id}
- DELETE /api/terms/{id}

## 5.3 班级
- GET /api/classes
- POST /api/classes
- GET /api/classes/{id}
- PUT /api/classes/{id}
- DELETE /api/classes/{id}

## 5.4 班级教师关联
- GET /api/classes/{id}/teachers
- POST /api/classes/{id}/teachers
- DELETE /api/classes/{id}/teachers/{user_id}

## 5.5 学生
- GET /api/classes/{id}/students
- POST /api/classes/{id}/students
- GET /api/students/{id}
- PUT /api/students/{id}
- DELETE /api/students/{id}

## 5.6 学生导入
- GET /api/classes/{id}/students/import/template
- POST /api/classes/{id}/students/import/preview
- POST /api/classes/{id}/students/import/commit
- GET /api/classes/{id}/students/import/jobs

## 5.7 小组
- GET /api/classes/{id}/groups
- POST /api/classes/{id}/groups
- PUT /api/groups/{id}
- DELETE /api/groups/{id}
- POST /api/groups/{id}/members
- DELETE /api/groups/{id}/members/{student_id}

## 5.8 积分项目
- GET /api/classes/{id}/score-items
- POST /api/classes/{id}/score-items
- PUT /api/score-items/{id}
- DELETE /api/score-items/{id}

## 5.9 学生打分
- POST /api/students/{id}/score
- GET /api/students/{id}/score-logs
- POST /api/student-score-logs/{id}/revoke

## 5.10 小组打分
- POST /api/groups/{id}/score
- GET /api/groups/{id}/score-logs
- POST /api/group-score-logs/{id}/revoke

## 5.11 统计
- GET /api/classes/{id}/stats/overview
- GET /api/classes/{id}/stats/students
- GET /api/classes/{id}/stats/groups
- GET /api/classes/{id}/stats/subjects
- GET /api/students/{id}/stats

## 5.12 历史
- GET /api/classes/{id}/history/student-score
- GET /api/classes/{id}/history/group-score

---

# 6. 权限规则

## 6.1 普通教师
- 查看自己关联班级
- 管理学生
- 使用积分项目打分
- 查看统计与历史

## 6.2 班级管理员
- 拥有普通教师全部权限
- 管理班级信息
- 关联/移除教师
- 管理积分项目
- 管理小组
- 撤销学生/小组积分记录
- 删除班级

---

# 7. 移动端适配要求
- 页面采用响应式布局
- 学生列表在手机端可切为卡片流
- 顶部导航在手机端折叠为抽屉菜单
- 打分弹窗需适配小屏幕，按钮尺寸适合触控
- 图表在手机端可横向滚动或切换简版展示

---

# 8. 并发与性能要求
- 首版目标：支持约 100 人同时访问
- 基于 SQLite 首版可用于演示/中小规模使用
- 若正式上线并长期多人使用，建议迁移 PostgreSQL

优化措施：
- 列表分页
- 关键字段索引
- 统计接口优化查询
- 避免频繁全表统计

---

# 9. 素材候选方案（待选）

> 说明：这里先给出素材来源方向与候选源，后续若进入开发可进一步下载/筛选并整理最终清单。

## 9.1 种菜风素材候选
### 候选源 A：OpenMoji / Twemoji + 自组阶段
- 优点：开源、易获取、SVG 友好
- 适合：种子、发芽、植物成长阶段的简洁风格
- 备注：需要组合出统一风格

### 候选源 B：Icons8 / Flaticon（筛授权）
- 优点：农作物、花园、成长类图标多
- 适合：更拟物、卡通的种菜风
- 注意：需根据最终商用/署名要求选型

### 候选源 C：Iconfont 素材组合
- 优点：中文语境下检索方便
- 适合：后台系统配套图标、成长步骤图标

## 9.2 小树苗风素材候选
### 候选源 A：OpenMoji / Noto Emoji 生态类图标
- 优点：开源、统一、轻量
- 适合：种子→芽→树→大树阶段

### 候选源 B：unDraw / Storyset 插画风
- 优点：页面视觉更完整
- 适合：统计页、空状态、成长展示页插画
- 注意：更适合页面插画，不一定适合每个积分阶段icon

### 候选源 C：SVG Repo
- 优点：SVG 素材多，筛选方便
- 适合：树苗成长阶段单图标

## 9.3 素材建议
首版建议采用：
- 阶段图标：SVG 图标方案（轻量、易适配）
- 页面插画：Storyset/unDraw 辅助

---

# 10. 开发建议顺序
1. 初始化后端与数据库
2. 完成认证、班级、学生、小组、积分项目模块
3. 完成学生/小组打分与撤销
4. 完成统计接口
5. 开发 Vue3 页面与移动适配
6. 接入成长视觉素材
7. 完成批量导入与联调
8. 测试与交付

---

# 11. 待最终补充确认事项
1. 登录方式是否固定为用户名登录
2. 班级成长风格是否按班级统一
3. 导入学生时小组不存在是否允许自动创建
4. 协同教师是否允许删除学生（建议允许）
5. SQLite 仅首版使用，正式上线是否切 PostgreSQL

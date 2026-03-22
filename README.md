# 班级优化积分系统

教师端班级管理积分系统，支持学生/小组评分、成长可视化、统计分析。

## 技术栈

- **前端**: Vue 3 + Vite + Pinia + Vue Router
- **后端**: FastAPI + SQLAlchemy + Alembic
- **数据库**: SQLite (首版)

## 项目结构

```
class-optimizer/
├── backend/               # FastAPI 后端
│   ├── app/
│   │   ├── api/           # API 路由
│   │   ├── core/          # 核心配置
│   │   ├── models/        # SQLAlchemy 模型
│   │   ├── schemas/       # Pydantic 模式
│   │   ├── services/      # 业务逻辑
│   │   └── utils/         # 工具函数
│   ├── alembic/           # 数据库迁移
│   ├── data/              # 运行库和导入样例
│   └── tests/             # 当前后端测试入口
├── frontend/              # Vue3 前端
│   └── src/
│       ├── api/           # API 调用
│       ├── components/    # 组件
│       ├── stores/        # Pinia 状态
│       ├── tests/         # 前端单测主目录
│       ├── views/         # 页面
│       └── utils/         # 工具函数与就地单测
├── tests/                 # 测试
│   └── e2e/               # Playwright E2E / 视觉回归
└── docs/                  # 文档
```

## 快速启动

### 后端

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

如果数据库是在引入 Alembic 之前直接建表生成的，先执行一次：

```bash
cd backend
alembic stamp head
```

确认版本表已建立后，再继续使用 `alembic upgrade head`。

数据库维护建议统一走脚本入口：

```bash
./backend/scripts/db-maintenance.sh backup
./backend/scripts/db-maintenance.sh current
./backend/scripts/db-maintenance.sh check
./backend/scripts/db-maintenance.sh upgrade
```

把已有旧库纳入管理时：

```bash
./backend/scripts/db-maintenance.sh backup before-stamp
./backend/scripts/db-maintenance.sh stamp-head
```

默认维护的是 `backend/data/class_optimizer.db`，也可以通过 `DB_PATH` 或 `DATABASE_URL` 覆盖目标库。

清理迁移验证和本地测试残留文件时：

```bash
./backend/scripts/db-maintenance.sh cleanup-temp
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

## 功能模块

- [x] 教师认证 (注册/登录/JWT)
- [x] 班级管理 (CRUD/协同教师)
- [x] 学生管理 (CRUD/评分)
- [x] 小组管理 (CRUD/积分独立)
- [x] 积分项目管理
- [x] 学生/小组打分与撤销
- [x] 统计报表 (周/月/学期)
- [x] Excel 批量导入
- [x] 成长可视化 (种菜/树苗双主题)

## 使用文档

- 用户操作说明：`docs/user-guide.md`
- 本地运行与测试：`docs/local-run-and-test.md`
- Zeabur 部署：`docs/zeabur-deploy.md`
- 测试覆盖矩阵：`docs/test-coverage-matrix.md`
- 仓库整理记录：`docs/repo-cleanup-report.md`

## 开发规范

- 单文件不超过 100 行
- 测试驱动开发 (TDD/BDD)
- 架构先行

# 仓库整理记录

更新日期：2026-03-21

## 保留内容

- 现行业务功能：认证、班级、学生、小组、积分项目、统计、成长可视化、Excel 导入
- 现行测试链路：`backend/tests`、`frontend/src/tests/unit`、前端就地 `*.spec.ts`、`tests/e2e`
- 最小运行数据集：`backend/data/class_optimizer.db` 和 4 个导入回归样例 Excel
- 全部项目文档

## 删除内容

- 本地环境与生成物：虚拟环境、`node_modules`、`dist`、`__pycache__`、`.pytest_cache`、`.DS_Store`、`.playwright-mcp`
- 旧兼容层：`backend/models/`、`backend/database.py`、`backend/multipart/`
- 无引用页面：`frontend/src/views/StudentListView.vue`
- 旧后端测试树：`tests/backend/`、根目录 `pytest.ini`、仅服务于该测试树的 `tests/conftest.py`
- 重复前端旧测试树：`tests/frontend/`
- 空测试库与旧备份库：根目录 `test*.db`、`backend/test*.db`、`backend/data/*.db.bak-*`

## 当前目录约定

- 后端主代码仅保留 `backend/app`
- 后端数据库入口统一为 `backend/app/core/database.py`
- 后端回归统一保留在 `backend/tests`
- 前端单测统一保留在 `frontend/src/tests/unit` 和少量就地 `*.spec.ts`
- Playwright 唯一入口为 `tests/e2e/playwright.config.ts`

# 测试覆盖矩阵

更新日期：2026-03-21

## 本次已执行结果

| 测试层 | 命令 | 结果 |
| --- | --- | --- |
| 前端单测 | `cd frontend && npm run test` | `19 files, 233 passed` |
| 后端测试 | `./backend/.venv/bin/python -m pytest -c backend/pytest.ini backend/tests -q` | `108 passed` |
| E2E 冒烟（Chromium） | `./frontend/node_modules/.bin/playwright test -c tests/e2e/playwright.config.ts --project=chromium tests/e2e/auth.spec.ts tests/e2e/score-item.spec.ts` | `10 passed` |
| 视觉回归基线 | `tests/e2e/visual.spec.ts-snapshots/*.png` | `Chromium 基线已保留，本次清理未重跑更新` |

说明：

- `backend/tests/features/*.feature` 目前作为 BDD 场景资产存在，实际执行入口是 `backend/tests/unit/test_bdd_*.py`。
- 视觉回归基线当前维护在 Chromium，快照文件位于 `tests/e2e/visual.spec.ts-snapshots/`。
- Playwright 的唯一有效入口现在是 `tests/e2e/playwright.config.ts`；旧的 `frontend/e2e`、`tests/frontend/e2e` 与重复配置已移除。
- 根目录旧后端测试树 `tests/backend` 已移除；后端回归统一收敛到 `backend/tests`。
- 前端单测当前只保留 `frontend/src/tests/unit` 和少量就地 `*.spec.ts`；旧的 `tests/frontend/unit` 已移除。

## 覆盖矩阵

| 场景 / 风险点 | 后端单元 / 逻辑 | 后端接口级（TestClient / BDD） | 前端单测 | E2E / 视觉 | 状态 / 备注 |
| --- | --- | --- | --- | --- | --- |
| 认证、登录态、个人资料、改密 | `backend/tests/unit/test_auth.py` | `backend/tests/unit/test_auth_profile.py`, `backend/tests/unit/test_bdd_auth.py` | `frontend/src/tests/unit/stores/test_auth_store.spec.ts`, `frontend/src/tests/unit/ProfileView.spec.ts` | `tests/e2e/auth.spec.ts`, `tests/e2e/security.spec.ts`, `tests/e2e/visual.spec.ts` `VISUAL-001` | 已覆盖 |
| 班级 CRUD、主题切换、教师加入班级 | `backend/tests/unit/test_class.py` | `backend/tests/unit/test_bdd_class.py` | `frontend/src/tests/unit/stores/test_class_store.spec.ts` | `tests/e2e/class.spec.ts`, `tests/e2e/concurrency.spec.ts` `CONC-001`, `tests/e2e/visual.spec.ts` `VISUAL-002` | 已覆盖 |
| 学生新增、删除、重复学号、评分 | `backend/tests/unit/test_student.py`, `backend/tests/unit/test_points.py` | `backend/tests/unit/test_revoke.py`, `backend/tests/unit/test_consistency.py` | `frontend/src/tests/unit/stores/test_student_store.spec.ts`, `frontend/src/tests/unit/ScoreDialog.spec.ts` | `tests/e2e/student.spec.ts`, `tests/e2e/history.spec.ts`, `tests/e2e/concurrency.spec.ts` `CONC-002` | 已覆盖 |
| 小组新增、删除、组员迁移、评分 | `backend/tests/unit/test_group_api.py`, `backend/tests/unit/test_group_members_api.py`, `backend/tests/unit/test_points.py` | `backend/tests/unit/test_revoke.py`, `backend/tests/unit/test_consistency.py` | `frontend/src/tests/unit/stores/test_group_store.spec.ts` | `tests/e2e/group.spec.ts`, `tests/e2e/history.spec.ts`, `tests/e2e/concurrency.spec.ts` `CONC-003` | 已覆盖 |
| 积分项目配置 | `backend/tests/unit/test_score_items.py` | `backend/tests/unit/test_score_items.py` | `frontend/src/tests/unit/ScoreDialog.spec.ts` | `tests/e2e/score-item.spec.ts` | 已覆盖 |
| 导入模板下载、模板内容结构、预览、确认导入、脏数据、大批量 | `backend/tests/unit/test_import.py` | `backend/tests/unit/test_import.py` | 无专门前端组件单测 | `tests/e2e/import.spec.ts`, `tests/e2e/helpers/workbook.helper.ts` | 已覆盖 |
| 越权访问、跨教师资源隔离、导入权限 | `backend/tests/unit/test_permissions_extended.py` | `backend/tests/unit/test_class.py`, `backend/tests/unit/test_permissions_extended.py` | `frontend/src/tests/unit/stores/test_auth_store.spec.ts` | `tests/e2e/security.spec.ts` | 已覆盖 |
| 撤销评分、历史记录回写、删除后历史与统计一致性 | `backend/tests/unit/test_revoke.py`, `backend/tests/unit/test_consistency.py` | `backend/tests/unit/test_consistency.py` | `frontend/src/tests/unit/stores/test_stats_store.spec.ts` | `tests/e2e/history.spec.ts` | 已覆盖 |
| 统计概览、排行、成长阶段、花园表现 | `backend/tests/unit/test_stats.py`, `backend/tests/unit/test_growth.py` | `backend/tests/unit/test_bdd_scoring.py` | `frontend/src/tests/unit/stores/test_stats_store.spec.ts`, `frontend/src/tests/unit/GrowthProgressBar.spec.ts`, `frontend/src/tests/unit/GrowthVisual.spec.ts`, `frontend/src/tests/unit/utils/test_growth.spec.ts`, `frontend/src/tests/unit/GrowthCelebration.spec.ts`, `frontend/src/tests/unit/FertilizerEffect.spec.ts` | `tests/e2e/stats.spec.ts`, `tests/e2e/garden.spec.ts`, `tests/e2e/garden-simple.spec.ts`, `tests/e2e/growth-visual.spec.ts`, `tests/e2e/visual.spec.ts` `VISUAL-004` | 已覆盖 |
| 视觉回归、样式漂移、关键页面布局破坏 | 不适用 | 不适用 | 无截图级单测 | `tests/e2e/visual.spec.ts`, `tests/e2e/visual.spec.ts-snapshots/*.png` | 已覆盖，Chromium 基线 |
| 并发冲突、同资源同时写入 | 无专门纯单测 | 无专门后端压力测试 | 不适用 | `tests/e2e/concurrency.spec.ts` | 已覆盖于 E2E API 并发层；尚无 DB 级压测 |
| 移动端关键流程 | 不适用 | 不适用 | 无专门移动端组件单测 | `tests/e2e/class.spec.ts` `CLASS-006`, `tests/e2e/student.spec.ts` `STUDENT-005`, `tests/e2e/garden.spec.ts` `GARDEN-006` | 已覆盖 |

## 结论

这次新增后，用户前面指出的 6 类缺口已经全部落到测试资产里：

1. 并发冲突：新增 `tests/e2e/concurrency.spec.ts`
2. 视觉回归：新增 `tests/e2e/visual.spec.ts` 和 Chromium 快照基线
3. 下载模板内容结构：`tests/e2e/import.spec.ts` 已校验工作簿首行与样例行
4. 跨教师越权：新增 `backend/tests/unit/test_permissions_extended.py` 与 `tests/e2e/security.spec.ts`
5. 撤销 / 删除后的历史与统计回写：新增 `backend/tests/unit/test_consistency.py` 与 `tests/e2e/history.spec.ts`
6. 统一覆盖矩阵：本文档

当前剩余的非阻塞空白：

- 没有独立的后端高并发压力测试或多进程数据库竞争测试，当前并发覆盖停留在 API 并发层。
- 视觉基线当前只维护 Chromium；若后续要做跨浏览器视觉守护，需要再为 Firefox / WebKit 单独建基线。

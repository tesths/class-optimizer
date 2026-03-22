# 本地部署与测试方案

这份文档的目标是让你在一台新的本地机器上，从零完成以下事情：

- 安装后端和前端依赖
- 初始化数据库
- 启动后端和前端
- 运行后端、前端和 E2E 测试
- 在遇到常见错误时快速定位问题

本文统一使用以下约定：

- 项目根目录：`/Users/tesths/Desktop/class-optimizer`
- 后端虚拟环境：`backend/.venv`
- 后端端口：`8000`
- 前端端口：`5173`
- 默认数据库：`backend/data/class_optimizer.db`

## 1. 环境要求

建议使用下面的版本组合：

- Python：`3.12.x`
- Node.js：`22.x`
- npm：`10.x`
- SQLite：可选，主要用于手工检查数据库

当前项目本机验证过的版本：

- Python：`3.12.13`
- Node.js：`v22.16.0`
- npm：`10.9.2`

注意：

- 不要默认使用系统自带 `python3`，它可能指向 `3.9`，而项目代码里使用了 `datetime.UTC` 和 `X | None` 这类 `3.10+ / 3.11+` 特性。
- 如果你的 `python3 --version` 不是 `3.12`，请显式使用 `python3.12`。

## 2. 项目结构和测试入口

这个项目当前保留的主要测试入口如下：

- 后端测试：`backend/tests`
- 前端单元测试：`frontend/src/tests/unit` 和就地 `*.spec.ts`
- 前端 E2E：`tests/e2e`

建议优先记住下面这几类：

- 后端单测和 API 回归：`pytest`
- 前端单测：`npm run test`
- 前端 E2E：`playwright`

## 3. 首次安装

### 3.1 创建后端虚拟环境

在项目根目录执行：

```bash
python3.12 -m venv backend/.venv
./backend/.venv/bin/pip install --upgrade pip
./backend/.venv/bin/pip install -r backend/requirements.txt
```

说明：

- 本文统一使用 `backend/.venv`
- 仓库清理后不再保留任何现成虚拟环境目录

### 3.2 安装前端依赖

```bash
cd frontend
npm install
cd ..
```

### 3.3 安装 Playwright 浏览器

只需要首次执行一次：

```bash
cd frontend
npx playwright install
cd ..
```

## 4. 数据库初始化

### 4.1 初始化或升级数据库

推荐使用项目脚本：

```bash
./backend/scripts/db-maintenance.sh upgrade
```

如果当前已经存在数据库文件，建议先备份再升级：

```bash
./backend/scripts/db-maintenance.sh backup before-upgrade
./backend/scripts/db-maintenance.sh upgrade
```

如果你刚新建环境，没有数据库文件，也可以直接执行：

```bash
./backend/.venv/bin/alembic -c backend/alembic.ini upgrade head
```

### 4.2 查看当前数据库版本

```bash
./backend/scripts/db-maintenance.sh current
```

如果输出类似下面内容，说明数据库已经是最新版本：

```bash
c1f4e2b7a9d1 (head)
```

## 5. 本地启动

### 5.1 启动后端

在项目根目录执行：

```bash
cd backend
.venv/bin/uvicorn app.main:app --reload --port 8000
```

成功后默认服务地址：

- API 根地址：`http://localhost:8000`
- 健康检查：`http://localhost:8000/api/health`

### 5.2 启动前端

另开一个终端，在项目根目录执行：

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

成功后页面地址：

- 前端：`http://127.0.0.1:5173`

说明：

- 前端通过 Vite 代理把 `/api` 转发到 `http://localhost:8000`
- 所以前端联调和 E2E 测试时，后端必须先启动

## 6. 本地测试命令

## 6.1 后端测试

### 运行 `backend/tests/unit`

```bash
./backend/.venv/bin/python -m pytest -c backend/pytest.ini backend/tests/unit -q
```

### 运行 `backend/tests/features`

```bash
./backend/.venv/bin/python -m pytest -c backend/pytest.ini backend/tests/features -q
```

### 运行全部后端测试

```bash
./backend/.venv/bin/python -m pytest -c backend/pytest.ini backend/tests -q
```

说明：

- 后端测试统一使用 `backend/pytest.ini`
- 不建议直接省略 `-c`，否则容易因为 rootdir 不同而读到错误配置

## 6.2 前端单元测试

```bash
cd frontend
npm run test
```

监听模式：

```bash
cd frontend
npm run test:watch
```

## 6.3 前端 E2E 测试

### 运行 `tests/e2e`

先确保后端已启动，再执行任一命令：

```bash
./frontend/node_modules/.bin/playwright test -c tests/e2e/playwright.config.ts
```

或：

```bash
cd frontend
npm run test:e2e
```

如果你只想跑单个文件：

```bash
./frontend/node_modules/.bin/playwright test -c tests/e2e/playwright.config.ts tests/e2e/security.spec.ts
```

说明：

- 这套配置默认会跑多浏览器和移动端项目
- 会自动拉起前端开发服务器
- 不会自动拉起后端

## 7. 推荐的本地回归顺序

如果你改了后端接口或数据库结构，推荐按下面顺序回归：

1. 升级数据库

```bash
./backend/scripts/db-maintenance.sh backup before-regression
./backend/scripts/db-maintenance.sh upgrade
```

2. 跑后端单测

```bash
./backend/.venv/bin/python -m pytest -c backend/pytest.ini backend/tests/unit -q
```

3. 启动后端和前端

```bash
(cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000)
(cd frontend && npm run dev -- --host 127.0.0.1 --port 5173)
```

4. 跑前端单测

```bash
cd frontend && npm run test
```

5. 跑 E2E

```bash
(cd frontend && npm run test:e2e)
./frontend/node_modules/.bin/playwright test -c tests/e2e/playwright.config.ts
```

## 8. 常见问题

### 8.1 `TypeError: unsupported operand type(s) for |`

原因：

- 你在用 Python `3.9`

处理：

```bash
python3 --version
python3.12 --version
python3.12 -m venv backend/.venv
```

### 8.2 `ImportError: cannot import name 'UTC' from 'datetime'`

原因：

- 依然是在 Python `3.9` 或更低版本下运行

处理：

- 改用 Python `3.12`

### 8.3 `pytest: command not found`

原因：

- 你没有激活虚拟环境，或者没有安装依赖

处理：

```bash
./backend/.venv/bin/pip install -r backend/requirements.txt
./backend/.venv/bin/python -m pytest -c backend/pytest.ini backend/tests/unit -q
```

### 8.4 前端页面能打开，但接口全是 `404` 或 `ECONNREFUSED`

原因：

- 前端起来了，后端没起来

处理：

```bash
cd backend
.venv/bin/uvicorn app.main:app --reload --port 8000
```

### 8.5 Playwright 报浏览器不存在

处理：

```bash
cd frontend
npx playwright install
```

### 8.6 Alembic 升级前想先备份数据库

```bash
./backend/scripts/db-maintenance.sh backup manual
```

备份文件会出现在：

- `backend/data/class_optimizer.db.bak-<label>`

### 8.7 数据库版本和代码不一致

先看当前版本：

```bash
./backend/scripts/db-maintenance.sh current
./backend/scripts/db-maintenance.sh heads
```

再执行升级：

```bash
./backend/scripts/db-maintenance.sh upgrade
```

## 9. 一套最小可运行流程

如果你只想最快跑起来，用下面这组命令即可：

### 终端 1：安装并迁移

```bash
python3.12 -m venv backend/.venv
./backend/.venv/bin/pip install -r backend/requirements.txt
cd frontend && npm install && npx playwright install && cd ..
./backend/.venv/bin/alembic -c backend/alembic.ini upgrade head
```

### 终端 2：启动后端

```bash
cd backend
.venv/bin/uvicorn app.main:app --reload --port 8000
```

### 终端 3：启动前端

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

### 终端 4：跑测试

```bash
./backend/.venv/bin/python -m pytest -c backend/pytest.ini backend/tests/unit -q
(cd frontend && npm run test)
./frontend/node_modules/.bin/playwright test -c tests/e2e/playwright.config.ts
```

## 10. 建议

为了减少本地环境漂移，建议你固定下面几个习惯：

- 后端永远用 `backend/.venv/bin/python`
- 数据库变更前先做一次 `db-maintenance.sh backup`
- 跑 E2E 前先确认后端 `8000` 和前端 `5173` 都正常
- 不要混用系统 Python 和虚拟环境 Python
- 不要省略 `pytest -c ...` 里的配置文件参数

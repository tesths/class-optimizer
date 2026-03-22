# Zeabur 部署说明

本项目正式部署推荐拆成 3 个服务：

- `frontend`：Vite 静态站点
- `backend`：FastAPI + Alembic
- `postgresql`：Zeabur PostgreSQL 模板服务

本仓库已经保留 SQLite 作为本地默认库，但正式部署时建议改用 PostgreSQL。

## 官方资料

- PostgreSQL 模板页：https://zeabur.com/zh-CN/templates/B20CX0
- PostgreSQL 模板 YAML：https://zeabur.com/templates/B20CX0.yaml
- 创建服务：https://zeabur.com/docs/zh-CN/deploy/create-service
- GitHub 集成：https://zeabur.com/docs/zh-CN/deploy/github
- Root Directory：https://zeabur.com/docs/zh-CN/deploy/root-directory
- 环境变量：https://zeabur.com/docs/zh-CN/deploy/variables
- 私有网络：https://zeabur.com/docs/zh-CN/networking/private
- CLI 部署：https://zeabur.com/docs/zh-CN/deploy/deploy-in-cli
- Vite 指南：https://zeabur.com/docs/zh-CN/guides/nodejs/vite
- Python 指南：https://zeabur.com/docs/zh-CN/guides/python

## 已做的仓库适配

- `frontend/zbpack.json`：固定前端构建命令和输出目录
- `backend/zbpack.json`：启动前自动执行 Alembic 迁移
- `backend/requirements.txt`：加入 PostgreSQL 驱动 `psycopg[binary]`
- `backend/app/core/config.py`：自动把 `postgresql://...` 转成 SQLAlchemy 可用的 `postgresql+psycopg://...`

这意味着你在 Zeabur 后端变量里可以直接使用：

```env
DATABASE_URL=${POSTGRES_CONNECTION_STRING}
```

不需要自己再改成 `postgresql+psycopg://`。

## Zeabur PostgreSQL 的关键点

根据 Zeabur 官方 PostgreSQL 模板文件：

- Zeabur 会暴露 `POSTGRES_CONNECTION_STRING`
- 也会暴露 `POSTGRES_HOST`、`POSTGRES_PORT`、`POSTGRES_USERNAME`、`POSTGRES_PASSWORD`、`POSTGRES_DATABASE`
- `POSTGRES_CONNECTION_STRING` 的默认格式是：

```env
postgresql://${POSTGRES_USERNAME}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DATABASE}
```

- 这个连接串是给同项目内其它服务走私有网络使用的
- 如果一个项目里有多个 PostgreSQL 实例，Zeabur 官方建议手动指定内部 Host 和 Port，避免引用变量串错实例

## 推荐部署方式

### 1. 创建 PostgreSQL 服务

- 在同一个 Zeabur Project 内新建服务
- 选择 `Template`
- 搜索并部署 `PostgreSQL`

创建后可以在数据库服务的：

- `Instruction` 标签页查看外网连接信息
- `Networking` 标签页查看内网主机名和端口

## 两种代码来源

### 方式 A：本地文件夹上传

适合：

- 还没推 GitHub
- 想先快速验证部署

做法：

- backend 服务直接选择本地 `backend` 文件夹
- frontend 服务直接选择本地 `frontend` 文件夹
- 不需要设置 Root Directory

### 方式 B：GitHub 仓库导入

适合：

- 想启用 Zeabur 的 GitHub 集成和自动部署
- 后续每次 `push` 都自动重新部署

根据 Zeabur 官方 GitHub 集成文档：

- 需要先在 Zeabur 里绑定 GitHub 账号
- 需要给 Zeabur 安装 GitHub App，授权仓库访问
- 使用 GitHub 作为部署源后，Zeabur 会为服务启用开箱即用的 CI/CD

根据 Zeabur 官方 Root Directory 文档：

- 对于这种前后端同仓库的 monorepo，要先部署服务
- 然后进入该服务的 `Settings`
- 找到 `Root Directory`
- backend 服务填 `backend`
- frontend 服务填 `frontend`
- 保存后点击 `Redeploy Service`

所以如果你的代码已经放到 GitHub，这个项目的部署步骤确实要改，区别主要在于：

- 代码来源从“本地文件夹”改成“GitHub 仓库”
- backend 和 frontend 都要单独设置一次 `Root Directory`
- 后续推送到 GitHub 会自动触发重新部署

## 2. 创建后端服务

- 再新建服务
- 源码选择本项目
- Root Directory 设为 `backend`

后端至少设置这些变量：

```env
ENVIRONMENT=production
SECRET_KEY=请替换成足够长的随机字符串
DATABASE_URL=${POSTGRES_CONNECTION_STRING}
CORS_ORIGINS=https://your-frontend.zeabur.app
```

如果同一个 Project 里有多个 PostgreSQL 服务，不要直接用 `${POSTGRES_CONNECTION_STRING}`，改成手动指定更稳：

```env
DATABASE_URL=postgresql://${POSTGRES_USERNAME}:${POSTGRES_PASSWORD}@your-postgres-host.zeabur.internal:5432/${POSTGRES_DATABASE}
```

或直接把 `Networking` 页里的内部主机名和端口拼进去。

## 3. 创建前端服务

- 再新建一个服务
- 源码选择本项目
- Root Directory 设为 `frontend`

前端设置：

```env
VITE_API_BASE_URL=https://your-backend.zeabur.app
```

前端会自动把它整理成 `https://your-backend.zeabur.app/api`。

## 4. 首次发布顺序

建议顺序：

1. 先创建 PostgreSQL 服务
2. 再部署 backend
3. 最后部署 frontend

原因：

- 后端启动时会执行 `alembic upgrade head`
- 所以后端第一次启动必须已经能连到 PostgreSQL
- 前端需要后端域名来填 `VITE_API_BASE_URL`

## 后端启动命令

Zeabur 后端服务会使用：

```bash
alembic upgrade head && _startup
```

其中 `_startup` 是 Zeabur 为 Python/FastAPI 自动生成的默认启动命令。

也就是每次启动先做迁移，再启动 FastAPI。

## 本地与生产的区别

- 本地默认仍是 SQLite：`backend/data/class_optimizer.db`
- Zeabur 正式部署改用 PostgreSQL：`DATABASE_URL=${POSTGRES_CONNECTION_STRING}`

这两个模式可以共存，不冲突。

## 控制台部署步骤

### PostgreSQL

- `New Service`
- `Template`
- 搜索 `PostgreSQL`
- 部署完成后确认 `Instruction` 和 `Networking`

### Backend

- `New Service`
- 如果是本地上传：选择本地 `backend` 文件夹
- 如果是 GitHub：选择 `GitHub`，选中仓库后先完成首次部署
- 如果是 GitHub：部署完成后进入 `Settings > Root Directory`，填 `backend`
- 如果是 GitHub：保存后点击 `Redeploy Service`
- 配置：

```env
ENVIRONMENT=production
SECRET_KEY=请替换成随机密钥
DATABASE_URL=${POSTGRES_CONNECTION_STRING}
CORS_ORIGINS=https://your-frontend.zeabur.app
```

### Frontend

- `New Service`
- 如果是本地上传：选择本地 `frontend` 文件夹
- 如果是 GitHub：选择 `GitHub`，选中仓库后先完成首次部署
- 如果是 GitHub：部署完成后进入 `Settings > Root Directory`，填 `frontend`
- 如果是 GitHub：保存后点击 `Redeploy Service`
- 配置：

```env
VITE_API_BASE_URL=https://your-backend.zeabur.app
```

## CLI 部署步骤

Zeabur CLI 只能部署本地源码到一个服务，数据库模板服务仍建议在控制台里创建。

先登录：

```bash
npx zeabur auth login
```

部署后端：

```bash
cd backend
npx zeabur deploy --create --name backend
```

部署前端：

```bash
cd frontend
npx zeabur deploy --create --name frontend
```

然后回到控制台补变量。

## GitHub 仓库部署的实际步骤

如果你使用 GitHub 仓库 `https://github.com/tesths/class-optimizer.git`，推荐步骤如下：

1. 把代码推送到 GitHub
2. 在 Zeabur 里绑定 GitHub 账号
3. 安装 Zeabur GitHub App，并授权这个仓库
4. 在同一个 Project 里先创建 PostgreSQL 模板服务
5. 从 GitHub 仓库创建 backend 服务
6. backend 首次部署完成后，进入 `Settings > Root Directory`，填 `backend`
7. 点击 `Redeploy Service`
8. 给 backend 填好 `ENVIRONMENT`、`SECRET_KEY`、`DATABASE_URL`、`CORS_ORIGINS`
9. 再从同一个 GitHub 仓库创建 frontend 服务
10. frontend 首次部署完成后，进入 `Settings > Root Directory`，填 `frontend`
11. 点击 `Redeploy Service`
12. 给 frontend 填 `VITE_API_BASE_URL`
13. 后续只要向 GitHub 推送代码，Zeabur 就会自动部署新版本

## 自检清单

- PostgreSQL 服务已就绪
- 后端变量 `DATABASE_URL` 已指向 `${POSTGRES_CONNECTION_STRING}` 或明确的内网地址
- 后端 `/api/health` 返回正常
- 前端能打开登录页
- 浏览器请求命中 `https://your-backend.zeabur.app/api/...`
- 注册、登录、建班级都正常
- 重启 backend 后数据仍然存在

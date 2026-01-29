# 🎵 Multi-Tenant Songlist System (多租户歌单点歌台)

这是一个基于 **Node.js + Express + SQLite** 构建的轻量级、多租户歌单系统。它允许用户注册专属的子域名（如 `lisa.yourdomain.com`），拥有独立的歌单页面，并支持高度个性化的页面装修（背景、主题色、头像等）。

## ✨ 功能特性

* **多租户架构**：基于域名分发，每个用户的数据完全隔离。
    * 本地开发支持 `localhost` 调试。
    * 生产环境支持泛域名解析（Wildcard Subdomains）。
* **个性化装修（后台配置）**：
    * 自定义主播头像、背景图片 (Background Image)。
    * 自定义主题色 (Theme Color) 和按钮颜色。
    * 自定义“返回顶部”图标。
    * 设置个人介绍、B站个人空间及直播间链接。
* **歌单管理**：
    * 单曲增删改查。
    * **Excel 批量导入**：支持拖拽上传 `.xlsx` 文件，智能识别列名。
* **前台交互**：
    * 双击歌名自动复制“点歌指令”。
    * 按歌名长度（字数）筛选。
    * 按分类（流行、古风等）筛选。
    * 关键词搜索与随机推荐。
    * 移动端适配优化。

## 🛠️ 技术栈

* **后端**：Node.js, Express
* **数据库**：SQLite3 (`better-sqlite3`) - *无需安装额外的数据库服务*
* **工具库**：
    * `multer` - 文件上传处理
    * `xlsx` - Excel 文件解析
    * `express-session` - 会话管理
* **前端**：原生 HTML5 / CSS3 / JavaScript (无框架依赖)

## 🚀 快速开始

### 1. 环境要求
* Node.js (v14+)
* npm

### 2. 安装与启动

```bash
# 1. 克隆或下载本项目
git clone https://github.com/rock8526652/songlist-qingfeng.git

# 2. npm安装pnpm
npm install -g pnpm

# 3. 进入项目目录
cd songlist

# 4. 安装依赖
pnpm install

# 5. 启动服务
pnpm start
# 或者
node server.js
服务默认运行在 **3000** 端口。

### 3. 本地开发指南
由于系统依赖**子域名**来识别租户，在本地 (`localhost`) 调试时：
* **默认测试账号**：访问 `http://localhost:3000`，系统默认识别为 `hallu` 用户（测试用）。
* **模拟多租户**：建议修改电脑的 `hosts` 文件（Windows: `C:\Windows\System32\drivers\etc\hosts` 或 Mac/Linux: `/etc/hosts`），添加：
    ```text
    127.0.0.1   test.localhost
    127.0.0.1   demo.localhost
    ```
    然后访问 `http://test.localhost:3000` 即可测试新用户的注册与登录流程。

---

## 📦 生产环境部署 (Nginx 配置)

在 VPS 上部署时，推荐使用 Nginx 反向代理。你需要拥有一个域名，并配置泛域名解析（将 `*.yourdomain.com` 解析到服务器 IP）。

**Nginx 配置示例：**

```nginx
server {
    listen 80;
    server_name *.yourdomain.com yourdomain.com; # 匹配所有子域名

    location / {
        proxy_pass [http://127.0.0.1:3000](http://127.0.0.1:3000);
        
        # 关键：必须透传 Host 头，后端靠它识别子域名
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # 如果需支持大文件上传（如背景图），请调整大小限制
        client_max_body_size 10M;
    }
}
```

---

## 📖 使用手册

### 1. 注册与登录
* 访问首页，在 URL 后追加 `/login.html` 进入登录页（或点击页面上的头像）。
* 点击“注册新账号”，填写用户名、密码以及**专属域名后缀**（例如填写 `lisa`，你的主页将是 `lisa.yourdomain.com`）。

### 2. 批量导入歌曲 (Excel)
在后台管理界面，你可以上传 Excel 文件批量导入歌单。支持的表头格式如下（任选一种）：

| 字段含义 | 支持的列名 (Header) |
| :--- | :--- |
| **歌名** | `歌名`, `title` |
| **分类** | `分类`, `category` |
| **视频链接** | `歌切链接`, `链接`, `切片链接`, `video_url` |

*注：系统会自动跳过标题为空的行。*

### 3. 数据备份
所有数据存储在项目根目录下的 `database.db` 文件中。用户上传的图片存储在 `public/uploads/` 目录下。请定期备份这两个位置。

## 📂 项目结构

```text
├── public/
│   ├── uploads/         # [自动生成] 图片上传目录
│   ├── admin.html       # 后台管理页面
│   ├── index.html       # 歌单展示主页
│   ├── login.html       # 登录/注册页面
│   ├── style.css        # 全局样式
│   └── script.js        # 前端核心逻辑
├── db.js                # 数据库初始化与自动迁移脚本
├── server.js            # 服务端入口 (Express App)
├── package.json         # 项目依赖配置
└── database.db          # [自动生成] SQLite数据库文件
```

## ⚠️ 注意事项
* **Session 存储**：当前 Session 存储在内存中 (`express-session` 默认配置)，重启服务会导致所有用户登出。生产环境建议配合 `connect-sqlite3` 或 Redis 使用。
* **安全性**：请确保 Nginx 配置了 SSL (HTTPS)，以保护密码传输安全。

---

### License
MIT
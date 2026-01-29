import express from 'express';
import session from 'express-session';
import multer from 'multer';
import * as XLSX from 'xlsx'; 
import db from './db.js';
import path from 'path';
import fs from 'fs'; 
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// === 1. 配置上传目录 ===
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// === 2. 配置 Multer ===
const uploadExcel = multer({ storage: multer.memoryStorage() });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); 
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'file-' + uniqueSuffix + ext); 
    }
});
const uploadImage = multer({ storage: storage });

// === 3. 中间件 ===
app.use(express.json());
app.use(session({
    secret: 'hallu-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// === 4. 核心工具 ===
/*
function getTenantByHost(req) {
    const host = req.get('host');
    if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
        return db.prepare('SELECT * FROM users WHERE subdomain = ?').get('hallu');
    }
    const subdomain = host ? host.split('.')[0] : '';
    // 注意：这里必须查询所有新字段
    const user = db.prepare('SELECT * FROM users WHERE subdomain = ?').get(subdomain);
    return user; 
}*/
function getTenantByHost(req) {
    const host = req.get('host'); // 这里的 host 包含端口，例如 "test.localhost:3000"
    if (!host) return null;

    // 1. 去掉端口号，只保留域名部分
    const domain = host.split(':')[0];
    const parts = domain.split('.');

    let subdomain = '';

    // 2. 识别子域名的逻辑
    if (domain.includes('localhost') || domain.includes('127.0.0.1')) {
        // 本地环境：如果 parts 长度 > 1 (例如 test.localhost)，取第一位
        // 如果只有 localhost，则设置一个默认测试账号
        subdomain = parts.length > 1 ? parts[0] : 'hallu'; 
    } else {
        // 生产环境：假设结构为 sub.example.com
        // 如果域名段数大于 2，取第一段作为子域名
        subdomain = parts.length > 2 ? parts[0] : '';
    }

    if (!subdomain) return null;

    // 3. 统一从数据库查询
    return db.prepare('SELECT * FROM users WHERE subdomain = ?').get(subdomain);
}

const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        if (req.path.startsWith('/api/')) {
            res.status(401).json({ error: '未登录' });
        } else {
            res.redirect('/login.html');
        }
    }
};

// === 5. 路由 ===
app.get('/', (req, res, next) => {
    const host = req.get('host');
    if (host && host.startsWith('song.')) {
        return res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
    next();
});

app.get('/admin.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 获取站点信息 (修复：返回所有新字段)
app.get('/api/site-info', (req, res) => {
    let user = null;
    if (req.session && req.session.userId && req.headers.referer && req.headers.referer.includes('admin')) {
         user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    } else {
         user = getTenantByHost(req);
    }
    if (!user) return res.status(404).json({ error: '未找到主播信息' });
    
    res.json({
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        intro: user.intro,
        theme_color: user.theme_color,
        bili_space_url: user.bili_space_url,
        bili_live_url: user.bili_live_url,
        subdomain: user.subdomain,
        // 下面是之前漏掉的
        background_url: user.background_url,
        button_color: user.button_color,
        back_to_top_url: user.back_to_top_url
    });
});

// 更新个人资料 (修复：保存所有新字段)
app.put('/api/site-info', requireAuth, (req, res) => {
    const { 
        display_name, avatar_url, intro, theme_color, 
        bili_space_url, bili_live_url,
        background_url, button_color, back_to_top_url 
    } = req.body;
    
    const userId = req.session.userId;
    
    const stmt = db.prepare(`
        UPDATE users 
        SET display_name = ?, avatar_url = ?, intro = ?, theme_color = ?, 
            bili_space_url = ?, bili_live_url = ?,
            background_url = ?, button_color = ?, back_to_top_url = ?
        WHERE id = ?
    `);
    
    stmt.run(
        display_name, avatar_url, intro, theme_color, 
        bili_space_url, bili_live_url, 
        background_url, button_color, back_to_top_url, 
        userId
    );
    res.json({ success: true });
});

// 图片上传
app.post('/api/upload-image', requireAuth, uploadImage.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: '请选择图片' });
    const fileUrl = '/uploads/' + req.file.filename;
    res.json({ url: fileUrl });
});

// 登录/注册/歌单相关接口 (保持不变)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
    if (user) {
        req.session.userId = user.id;
        req.session.username = user.username;
        res.json({ success: true, subdomain: user.subdomain });
    } else {
        res.status(401).json({ error: '账号或密码错误' });
    }
});

app.post('/api/register', (req, res) => {
    const { username, password, subdomain, display_name } = req.body;
    if (!username || !password || !subdomain) return res.status(400).json({ error: '必填项缺失' });
    try {
        const stmt = db.prepare(`INSERT INTO users (username, password, subdomain, display_name, theme_color) VALUES (?, ?, ?, ?, '#fc9ee0')`);
        stmt.run(username, password, subdomain, display_name || username);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: '用户名或子域名已存在' });
    }
});

app.post('/api/change-password', requireAuth, (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: '密码为空' });
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newPassword, req.session.userId);
    res.json({ success: true });
});

app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login.html');
});

app.get('/api/songs', (req, res) => {
    const user = getTenantByHost(req);
    if (!user) return res.json([]);
    const songs = db.prepare('SELECT * FROM songs WHERE owner_id = ? ORDER BY id DESC').all(user.id);
    res.json(songs);
});

app.post('/api/songs', requireAuth, (req, res) => {
    const { title, category, video_url } = req.body;
    const userId = req.session.userId;
    if (!title) return res.status(400).json({ error: '歌名必填' });
    db.prepare('INSERT INTO songs (owner_id, title, category, video_url) VALUES (?, ?, ?, ?)').run(userId, title, category || '默认', video_url || '');
    res.json({ success: true });
});

app.delete('/api/songs/:id', requireAuth, (req, res) => {
    const userId = req.session.userId;
    db.prepare('DELETE FROM songs WHERE id = ? AND owner_id = ?').run(req.params.id, userId);
    res.json({ success: true });
});

app.post('/api/upload-excel', requireAuth, uploadExcel.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: '无文件' });
        const userId = req.session.userId;
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        if (data.length === 0) return res.status(400).json({ error: '表格空' });

        const insertMany = db.transaction((songs) => {
            const stmt = db.prepare('INSERT INTO songs (owner_id, title, category, video_url) VALUES (?, ?, ?, ?)');
            for (const song of songs) {
                const title = song['歌名'] || song['title'];
                const category = song['分类'] || song['category'] || '默认';
                const url = song['歌切链接'] || song['链接'] || song['切片链接'] || '';
                if (title) stmt.run(userId, String(title), String(category), String(url));
            }
        });
        insertMany(data);
        res.json({ success: true, count: data.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '导入失败' });
    }
});

app.use(express.static(path.join(__dirname, 'public')));
app.listen(PORT, () => {
    console.log(`服务启动: http://localhost:${PORT}`);
});
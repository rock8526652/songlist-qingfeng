import Database from 'better-sqlite3';
const db = new Database('database.db');

// 1. 基础表结构
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        subdomain TEXT UNIQUE,
        display_name TEXT,
        avatar_url TEXT,
        intro TEXT,
        theme_color TEXT DEFAULT '#fc9ee0',
        bili_space_url TEXT,
        bili_live_url TEXT,
        background_url TEXT,   -- 新增：背景图片
        button_color TEXT,     -- 新增：按钮颜色
        back_to_top_url TEXT   -- 新增：返回顶部图标
    );

    CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER,
        title TEXT NOT NULL,
        category TEXT,
        video_url TEXT
    );
`);

// 2. 自动补全旧数据库缺少的字段
try {
    const columns = db.prepare(`PRAGMA table_info(users)`).all();
    const columnNames = columns.map(c => c.name);
    
    // 检查并添加新字段
    const newFields = ['background_url', 'button_color', 'back_to_top_url', 'bili_space_url', 'bili_live_url'];
    
    newFields.forEach(field => {
        if (!columnNames.includes(field)) {
            db.prepare(`ALTER TABLE users ADD COLUMN ${field} TEXT`).run();
        }
    });

} catch (err) {
    console.log("数据库检查跳过:", err.message);
}



export default db;
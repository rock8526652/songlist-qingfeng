const songContainer = document.getElementById('songContainer');
const modal = document.getElementById('myModal');
const avatarBtn = document.getElementById('avatarBtn');
const closeBtn = document.getElementsByClassName('close')[0];
const searchInput = document.getElementById('search');
const randomBtn = document.getElementById('randomBtn');
const songCountText = document.getElementById('songCountText');
// 新增：获取返回顶部按钮
const backToTopBtn = document.getElementById('backToTop');
const backToTopImg = document.getElementById('backToTopImg');

let allSongs = [];

// === 1. 初始化站点 (核心功能：换肤、换头像、换名字) ===
async function initSite() {
    try {
        // 请求后端获取当前域名对应的主播信息
        const res = await fetch('/api/site-info');
        
        // 如果找不到主播 (比如域名输错了)
        if (!res.ok) {
            document.querySelector('.main-container').innerHTML = 
                '<h2 style="text-align:center; color:white; padding:50px;">404 - 未找到该主播的歌单</h2>';
            return;
        }

        const info = await res.json();

        // 1.1 基础信息更新
        document.title = `${info.display_name}的歌单`;
        const nameTitle = document.querySelector('.name-title');
        if (nameTitle) nameTitle.innerText = info.display_name;
        if (info.avatar_url) avatarBtn.src = info.avatar_url;

        // 1.2 弹窗信息更新
        const modalHighlight = document.querySelector('#modalTitleName');
        if (modalHighlight) modalHighlight.innerText = info.display_name;
        
        // 修复：个人介绍 (填充内容)
        const introBox = document.getElementById('modalIntro');
        if (introBox && info.intro) {
            // 将换行符转为 <br> 并显示
            introBox.innerHTML = info.intro.replace(/\n/g, '<br>');
        }

        // 修复：B站链接 (填充 href 并控制显示)
        const spaceBtn = document.getElementById('biliSpaceBtn');
        const liveBtn = document.getElementById('biliLiveBtn');
        
        if (spaceBtn) {
            if (info.bili_space_url) {
                spaceBtn.href = info.bili_space_url; // 赋值链接
                spaceBtn.style.display = 'flex';     // 显示按钮
            } else {
                spaceBtn.style.display = 'none';     // 没填则隐藏
            }
        }
        
        if (liveBtn) {
            if (info.bili_live_url) {
                liveBtn.href = info.bili_live_url;   // 赋值链接
                liveBtn.style.display = 'flex';      // 显示按钮
            } else {
                liveBtn.style.display = 'none';
            }
        }

        // 1.3 样式自定义 (主题色、按钮色、背景图)
        if (info.theme_color) {
            document.documentElement.style.setProperty('--base-color', info.theme_color);
        }
        // 如果有按钮色，设置；否则跟随主题色
        if (info.button_color) {
            document.documentElement.style.setProperty('--btn-color', info.button_color);
        } else if (info.theme_color) {
            document.documentElement.style.setProperty('--btn-color', info.theme_color);
        }
        
        // 背景图应用到 body
        if (info.background_url) {
            document.body.style.backgroundImage = `url('${info.background_url}')`;
        }

        // 1.4 返回顶部图标
        if (info.back_to_top_url) {
            backToTopImg.src = info.back_to_top_url;
        } else {
            // 如果没传图，给个默认文字样式
            backToTopBtn.innerHTML = "TOP";
            backToTopBtn.style.background = "#fff";
            backToTopBtn.style.borderRadius = "50%";
            backToTopBtn.style.textAlign = "center";
            backToTopBtn.style.lineHeight = "50px";
            backToTopBtn.style.color = info.theme_color || "#333";
            backToTopBtn.style.fontWeight = "bold";
        }

        // 1.5 加载歌单
        fetchSongs();

    } catch (err) {
        console.error("初始化失败:", err);
    }
}

// === 2. 获取歌曲 ===
async function fetchSongs() {
    try {
        const res = await fetch('/api/songs');
        allSongs = await res.json();
        if (songCountText) songCountText.innerText = `带来了她的 ${allSongs.length} 首歌~`;
        renderSongs(allSongs);
        generateLengthButtons(allSongs);
    } catch (err) {
        console.error("获取歌曲失败:", err);
    }
}

// === 3. 渲染列表 ===
function renderSongs(songs) {
    songContainer.innerHTML = '';
    if (songs.length === 0) {
        songContainer.innerHTML = '<div style="padding:20px; text-align:center; color:#999">暂无歌曲</div>';
        return;
    }

    songs.forEach(song => {
        const div = document.createElement('div');
        div.className = 'song-item';
        div.innerHTML = `
            <span>${song.title}</span>
            ${song.video_url ? `<a href="${song.video_url}" target="_blank" class="video-link" onclick="event.stopPropagation()">▶ 切片</a>` : ''}
        `;
        div.addEventListener('dblclick', () => copyToClipboard(song.title));
        // 移动端单击优化
        div.addEventListener('click', () => {
             if(window.innerWidth < 768) copyToClipboard(song.title);
        });
        songContainer.appendChild(div);
    });
}

// === 4. 辅助功能 ===
function copyToClipboard(title) {
    const text = `点歌 ${title}`;
    navigator.clipboard.writeText(text).then(() => {
        showToast(`"点歌 ${title}" 成功复制到剪贴板~`);
    }).catch(err => {
        showToast('复制失败，请手动输入');
    });
}

function showToast(msg) {
    const x = document.getElementById("toast");
    x.innerText = msg;
    x.className = "toast toast-success show";
    setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
}

randomBtn.onclick = () => {
    if (allSongs.length === 0) return;
    const randomIndex = Math.floor(Math.random() * allSongs.length);
    const randomSong = allSongs[randomIndex];
    searchInput.value = randomSong.title;
    renderSongs([randomSong]);
    showToast(`随机到了: ${randomSong.title}`);
};

window.fillSearch = (val) => {
    searchInput.value = val;
    const term = val.toLowerCase();
    const filtered = allSongs.filter(s => 
        s.title.toLowerCase().includes(term) || 
        (s.category && s.category.toLowerCase().includes(term))
    );
    renderSongs(filtered);
}

// 弹窗逻辑
avatarBtn.onclick = () => modal.style.display = "flex";
closeBtn.onclick = () => modal.style.display = "none";
window.onclick = (event) => {
    if (event.target == modal) modal.style.display = "none";
}

searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allSongs.filter(s => s.title.toLowerCase().includes(term));
    renderSongs(filtered);
});

// === 5. 字数筛选按钮 ===
function generateLengthButtons(songs) {
    const container = document.getElementById('charCountRow');
    if (!container) return; 
    container.innerHTML = '';

    const lengths = new Set();
    songs.forEach(song => {
        if (song.title) lengths.add(song.title.trim().length);
    });

    const sortedLengths = Array.from(lengths).sort((a, b) => a - b);

    // 全部按钮
    const allBtn = document.createElement('span');
    allBtn.className = 'tag';
    allBtn.innerText = '全部';
    allBtn.onclick = () => {
        renderSongs(allSongs);
        highlightLengthBtn(allBtn);
        searchInput.value = '';
    };
    container.appendChild(allBtn);

    // 数字按钮
    sortedLengths.forEach(len => {
        const btn = document.createElement('span');
        btn.className = 'tag';
        btn.innerText = `${toChineseNum(len)}字`;
        btn.onclick = () => {
            filterByLength(len);
            highlightLengthBtn(btn);
        };
        container.appendChild(btn);
    });
}

function filterByLength(len) {
    const filtered = allSongs.filter(s => s.title.trim().length === len);
    renderSongs(filtered);
    searchInput.value = `[筛选] ${len}个字的歌`;
}

function toChineseNum(num) {
    const map = {1:'一', 2:'二', 3:'三', 4:'四', 5:'五', 6:'六', 7:'七', 8:'八', 9:'九', 10:'十'};
    if (map[num]) return map[num];
    return num;
}

function highlightLengthBtn(activeBtn) {
    const container = document.getElementById('charCountRow');
    const btns = container.getElementsByClassName('tag');
    for (let btn of btns) {
        btn.style.backgroundColor = ''; 
        btn.style.color = '';
    }
    const btnColor = getComputedStyle(document.documentElement).getPropertyValue('--btn-color').trim();
    activeBtn.style.backgroundColor = btnColor;
    activeBtn.style.color = 'white';
}

// === 6. 返回顶部逻辑 (修复：之前漏掉了这个监听) ===
window.onscroll = function() {
    // 滚动超过 300px 显示
    if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
        backToTopBtn.style.display = "block";
    } else {
        backToTopBtn.style.display = "none";
    }
};

backToTopBtn.onclick = function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 启动
initSite();
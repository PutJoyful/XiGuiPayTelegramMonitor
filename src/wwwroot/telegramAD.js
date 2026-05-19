const API = '/api/telegram';
const toastBox = document.getElementById('toast');

toastBox.style.zIndex = '9999';

function toast(Z, M = true) {
    const rJ = document.createElement('div');
    rJ.role = 'alert';
    rJ.className = `alert alert-${M ? 'success' : 'error'} alert-horizontal shadow-lg`;
    rJ.innerHTML = `<span>${Z}</span>`;
    toastBox.appendChild(rJ);
    setTimeout(() => rJ.remove(), 4000);
}

async function api(CA, hJ) {
    const Xe = await fetch(CA, {
        headers: { 'Content-Type': 'application/json' },
        ...hJ
    });
    const rX = await Xe.text();
    let bj = {};
    try {
        bj = rX ? JSON.parse(rX) : {};
    } catch {}
    
    if (!Xe.ok || bj.succeeded === false) {
        const hZ = bj.errors && (typeof bj.errors === 'string' ? bj.errors : Object.values(bj.errors)[0][0]) || bj.message || rX || '失败';
        toast(hZ, false);
        throw new Error(hZ);
    }
    return bj;
}

const out = document.getElementById('out');
const loginStatusEl = document.getElementById('loginStatus');
const monitorStatusEl = document.getElementById('monitorStatus');
const proxyInfoEl = document.getElementById('proxyInfo');
const targetInfoEl = document.getElementById('targetInfo');
const btnRefreshStatus = document.getElementById('btnRefreshStatus');
const btnClearLog = document.getElementById('btnClearLog');
const log = Me => {
    const text = typeof Me === 'string' ? Me : JSON.stringify(Me, null, 2);
    if (out) {
        const item = document.createElement('div');
        item.className = 'text-xs text-base-content/80 mb-2';
        item.textContent = text;
        out.appendChild(item);
        out.scrollTop = out.scrollHeight;
    }
    console.log(text);
};
const proxyType = document.getElementById('proxyType');
const proxyUrl = document.getElementById('proxyUrl');
const dialogList = document.getElementById('dialogList');
const btns = {
    load: document.getElementById('btnLoadDialogs'),
    target: document.getElementById('btnSetTarget'),
    start: document.getElementById('btnStart'),
    stop: document.getElementById('btnStop')
};

function updateDashboard() {
    if (loginStatusEl) {
        loginStatusEl.textContent = state.logged ? '已登录' : '未登录';
        loginStatusEl.className = state.logged ? 'text-success text-2xl font-semibold' : 'text-error text-2xl font-semibold';
    }
    if (monitorStatusEl) {
        monitorStatusEl.textContent = state.mon ? '已运行' : '未运行';
        monitorStatusEl.className = state.mon ? 'text-success text-2xl font-semibold' : 'text-error text-2xl font-semibold';
    }
    if (proxyInfoEl) {
        const typeLabel = proxyType ? proxyType.selectedOptions[0]?.text : '未知';
        const url = proxyUrl ? proxyUrl.value.trim() : '';
        proxyInfoEl.textContent = typeLabel + (url ? ` / ${url}` : ' / 未设置');
    }
    if (targetInfoEl) {
        const selected = dialogList ? dialogList.selectedOptions[0]?.text : '';
        targetInfoEl.textContent = selected || '未选择';
    }
}

function clearLog() {
    if (out) {
        out.innerHTML = '';
    }
    toast('日志已清空');
}

if (btnRefreshStatus) {
    btnRefreshStatus.addEventListener('click', () => {
        fetchState().catch(err => toast(`刷新状态失败: ${err.message}`, false));
    });
}
if (btnClearLog) {
    btnClearLog.addEventListener('click', clearLog);
}


let state = { logged: false, mon: false };

function applyState() {
    btns.load.disabled = !state.logged;
    dialogList.disabled = !state.logged;
    btns.target.disabled = !state.logged;
    btns.start.disabled = !state.logged || state.mon;
    btns.stop.disabled = !state.logged || !state.mon;
    updateDashboard();
}

async function fetchState() {
    const { data: jt } = await api(`${API}/status`);
    state = { logged: jt.loggedIn, mon: jt.monitoring };
    applyState();
    if (state.logged)
        document.getElementById('btnLogin').innerText = '已登录 (点击重新登录)';
    else
        document.getElementById('btnLogin').innerText = '登录';
    log(`刷新状态: 登录=${state.logged ? '是' : '否'}，监控=${state.mon ? '运行' : '停止'}`);
}

function proxyTypeChanged() {
    proxyUrl.disabled = proxyType.value === '0';
}

async function setProxy() {
    const CA = proxyType.value === '0' ? '' : proxyUrl.value.trim();
    const AC = state.mon;
    try {
        if (AC) {
            toast('正在停止监控以应用新代理...');
        }
        const ZJ = await api(`${API}/proxy`, {
            method: 'POST',
            body: JSON.stringify({ type: +proxyType.value, url: CA })
        });
        const hX = ZJ.data;
        log(`代理设置响应: ${hX}`);
        switch (hX) {
            case 'LoggedIn':
                toast('代理已设置，登录状态已保持');
                if (AC) {
                    toast('监控已恢复');
                }
                break;
            case 'NotLoggedIn':
                toast('代理已设置，但需要重新登录', false);
                document.getElementById('btnLogin').innerText = '登录';
                break;
            case 'WaitingForVerificationCode':
            case 'WaitingForPassword':
                toast('代理已设置，需要额外验证', false);
                openLoginWithState(hX);
                break;
            default:
                toast('代理已设置');
                break;
        }
        await fetchState();
    } catch (rM) {
        toast(`设置代理失败: ${rM.message}`, false);
    }
}

let step = 0,
    currentPhone = '';
const loginModal = document.getElementById('loginModal');
const title = document.getElementById('loginTitle');
const inp = document.getElementById('stepInput');

function openLoginWithState(hX) {
    step = hX === 'WaitingForVerificationCode' ? 1 : 2;
    if (step === 1) {
        title.textContent = '输入验证码';
        inp.placeholder = '短信验证码';
    } else {
        title.textContent = '输入 2FA 密码';
        inp.placeholder = '账户密码';
    }
    inp.value = '';
    loginModal.showModal();
}

function openLogin() {
    step = 0;
    title.textContent = '手机号登录';
    inp.placeholder = '+8613812345678';
    inp.value = '';
    loginModal.showModal();
}

async function loginStep() {
    const re = inp.value.trim();
    if (!re) {
        toast('输入不能为空', false);
        return;
    }
    try {
        if (step === 0) {
            currentPhone = re;
        }
        const MS = step === 0 ? { phoneNumber: re, loginInfo: '' } : { phoneNumber: currentPhone, loginInfo: re };
        const ZJ = await api(`${API}/login`, {
            method: 'POST',
            body: JSON.stringify(MS)
        });
        log(ZJ);
        if (ZJ && typeof ZJ === 'object') {
            if (ZJ.data !== undefined) {
                handleLoginResponse(ZJ.data);
            } else {
                handleLoginResponse(ZJ);
            }
        } else {
            toast('登录响应格式错误', false);
            loginModal.close();
        }
    } catch (rM) {
        toast(`登录时出错: ${rM.message}`, false);
        loginModal.close();
    }
}

function handleLoginResponse(jt) {
    if (typeof jt !== 'string') {
        toast('登录响应格式错误', false);
        loginModal.close();
        return;
    }
    switch (jt) {
        case 'WaitingForVerificationCode':
            step = 1;
            title.textContent = '输入验证码';
            inp.value = '';
            inp.placeholder = '短信验证码';
            break;
        case 'WaitingForPassword':
            step = 2;
            title.textContent = '输入 2FA 密码';
            inp.value = '';
            inp.placeholder = '账户密码';
            break;
        case 'LoggedIn':
            toast('登录成功');
            loginModal.close();
            document.getElementById('btnLogin').innerText = '已登录 (点击重新登录)';
            fetchState().catch(AZ => toast(`获取状态失败: ${AZ.message}`, false));
            break;
        case 'NotLoggedIn':
            toast('登录失败', false);
            loginModal.close();
            break;
        default:
            toast(`登录状态未知: ${jt}`, false);
            loginModal.close();
    }
}

async function loadDialogs() {
    const { data: jt } = await api(`${API}/dialogs`);
    dialogList.innerHTML = jt.map(rJ => `<option value="${rJ.id}">${rJ.displayTitle}</option>`).join('');
    toast('会话已加载');
    log(`已加载 ${jt.length} 个会话`);
    
    updateDashboard();
}

async function setTarget() {
    if (!dialogList.value) {
        toast('请选择会话', false);
        return;
    }
    await api(`${API}/target`, {
        method: 'POST',
        body: dialogList.value
    });
    toast('已设置目标');
    log(`已设置目标群：${dialogList.selectedOptions[0]?.text || dialogList.value}`);
    updateDashboard();
}

async function startMonitor() {
    const { data: jt } = await api(`${API}/start`, { method: 'POST' });
    let Sh = false;
    let XZ = '';
    switch (jt) {
        case 'Started':
            Sh = true;
            XZ = '启动成功';
            break;
        case 'MissingTarget':
            XZ = '未设置目标群';
            break;
        case 'NoUserInfo':
            XZ = '未获取到用户信息';
            break;
        case 'AlreadyRunning':
            Sh = true;
            XZ = '已在运行';
            break;
        case 'Error':
            XZ = '未登录';
            break;
        default:
            XZ = `未知状态: ${jt}`;
    }
    toast(`${XZ}`, Sh);
    log(`监控操作: ${XZ}`);
    state.mon = Sh;
    applyState();
}

async function stopMonitor() {
    await api(`${API}/stop`, { method: 'POST' });
    toast('已停止');
    log('监控已停止');
    state.mon = false;
    applyState();
}

fetchState();
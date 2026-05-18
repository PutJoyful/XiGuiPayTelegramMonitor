const API = '/api/keyword';
const typeMap = {
    FullWord: '全字',
    Contains: '包含',
    Regex: '正则',
    Fuzzy: '模糊',
    User: '用户'
};
const actionMap = {
    Exclude: '排除',
    Monitor: '监控'
};
const styleMap = {
    isCaseSensitive: '大小写',
    isBold: '粗体',
    isItalic: '斜体',
    isUnderline: '下划线',
    isStrikeThrough: '删除线',
    isQuote: '引用',
    isMonospace: '等宽',
    isSpoiler: '剧透'
};
const toastBox = document.getElementById('toast');
toastBox.style.zIndex = '9999';

function toast(GI, DV = true) {
    const o = document.createElement('div');
    o.setAttribute('role', 'alert');
    o.className = `alert alert-${DV ? 'success' : 'error'} alert-horizontal shadow-lg`;
    o.innerHTML = `<span>${GI}</span>`;
    toastBox.appendChild(o);
    setTimeout(() => o.remove(), 4000);
}

async function api(DE, IG) {
    const M = await fetch(DE, Object.assign({
        headers: { 'Content-Type': 'application/json' }
    }, IG));
    const Dm = await M.text();
    let IV = {};
    try {
        IV = Dm ? JSON.parse(Dm) : {};
    } catch {}
    if (!M.ok || IV.succeeded === false) {
        const I = IV.errors && (typeof IV.errors === 'string' ? IV.errors : Object.values(IV.errors)[0][0]) || IV.message || Dm || '操作失败';
        toast(I, false);
        throw new Error(I);
    }
    return IV;
}

const tbody = document.getElementById('kwBody');

function styleString(IM) {
    return Object.entries(styleMap)
        .filter(([m]) => IM[m])
        .map(([, t]) => t)
        .join(' ');
}

function renderRow(IM) {
    const Dn = document.createElement('tr');
    Dn.innerHTML = `
    <td><input type="checkbox" class="row-check" value="${IM.id}"></td>
    <td>${IM.id}</td>
    <td>${IM.keywordContent}</td>
    <td>${typeMap[IM.keywordType] ?? IM.keywordType}</td>
    <td>${actionMap[IM.keywordAction] ?? IM.keywordAction}</td>
    <td>${styleString(IM)}</td>
    <td>
      <button class="btn" onclick='openEdit(${JSON.stringify(IM)})'>编辑</button>
      <button class="btn btn-error ml-1" onclick="del(${IM.id})">删</button>
    </td>`;
    return Dn;
}

async function refresh() {
    const { data: IU } = await api(`${API}/list`);
    tbody.innerHTML = '';
    IU.forEach(en => tbody.appendChild(renderRow(en)));
}

async function del(DI) {
    await api(`${API}/delete/${DI}`, { method: 'DELETE' });
    toast('删除成功');
    refresh();
}

function toggleAll(eT) {
    document.querySelectorAll('.row-check').forEach(e => e.checked = eT.checked);
}

async function deleteSelected() {
    const ii = [...document.querySelectorAll('.row-check')]
        .filter(e => e.checked)
        .map(e => +e.value);
    if (!ii.length) {
        toast('未选中', false);
        return;
    }
    await api(`${API}/batchdelete`, {
        method: 'DELETE',
        body: JSON.stringify(ii)
    });
    toast('批量删除成功');
    refresh();
}

async function addSingle() {
    const ol = {
        keywordContent: sContent.value.trim(),
        keywordType: +sType.value,
        keywordAction: +sAction.value,
        isCaseSensitive: sCase.checked,
        isBold: sBold.checked,
        isItalic: sItalic.checked,
        isUnderline: sUnder.checked,
        isStrikeThrough: sStrike.checked,
        isQuote: sQuote.checked,
        isMonospace: sMono.checked,
        isSpoiler: sSpoil.checked
    };
    if (!ol.keywordContent) {
        toast('内容不能为空', false);
        return;
    }
    await api(`${API}/add`, {
        method: 'POST',
        body: JSON.stringify(ol)
    });
    toast('添加成功');
    refresh();
}

const dynamicRows = document.getElementById('dynamicRows');

function rowTpl(DI) {
    return `<div class="flex flex-wrap gap-2 items-center border p-2 rounded" id="row-${DI}">
    <input class="input input-bordered w-40" placeholder="关键词">
    <select class="select select-bordered">
      <option value="0">全字</option><option value="1">包含</option>
      <option value="2">正则</option><option value="3">模糊</option><option value="4">用户</option>
    </select>
    <select class="select select-bordered"><option value="1">监控</option><option value="0">排除</option></select>
    ${Object.entries(styleMap).map(([m, tn]) => `
      <label class="label gap-1 text-xs"><span>${tn}</span>
        <input type="checkbox" data-flag="${m}" class="checkbox">
      </label>`).join('')}
    <button class="btn btn-error" onclick="this.parentNode.remove()">x</button>
  </div>`;
}

function addRow() {
    dynamicRows.insertAdjacentHTML('beforeend', rowTpl(Date.now()));
}

async function uploadRows() {
    const i = [...dynamicRows.children].map(en => {
        const In = en.querySelector('input.input');
        if (!In || !In.value.trim()) return null;
        const [oU, tG] = en.querySelectorAll('select');
        const eV = {
            keywordContent: In.value.trim(),
            keywordType: +oU.value,
            keywordAction: +tG.value
        };
        en.querySelectorAll('input[data-flag]').forEach(e => eV[e.dataset.flag] = e.checked);
        return eV;
    }).filter(Boolean);
    if (!i.length) {
        toast('无有效行', false);
        return;
    }
    await api(`${API}/batchadd`, {
        method: 'POST',
        body: JSON.stringify(i)
    });
    toast('批量添加成功');
    refresh();
}

async function uploadText() {
    const G = txtKeywords.value.split('\n')
        .map(II => II.trim())
        .filter(Boolean);
    if (!G.length) {
        toast('文本为空', false);
        return;
    }
    const oi = {
        isCaseSensitive: tCase.checked,
        isBold: tBold.checked,
        isItalic: tItalic.checked,
        isUnderline: tUnder.checked,
        isStrikeThrough: tStrike.checked,
        isQuote: tQuote.checked,
        isMonospace: tMono.checked,
        isSpoiler: tSpoil.checked
    };
    const i = G.map(e => ({
        keywordContent: e,
        keywordType: +tType.value,
        keywordAction: +tAction.value,
        ...oi
    }));
    await api(`${API}/batchadd`, {
        method: 'POST',
        body: JSON.stringify(i)
    });
    toast('批量添加成功');
    refresh();
}

function fillEdit(IM) {
    eId.value = IM.id;
    eContent.value = IM.keywordContent;
    const E = Object.keys(typeMap);
    const n = Object.keys(actionMap);
    eType.value = E.indexOf(IM.keywordType);
    eAction.value = n.indexOf(IM.keywordAction);
    eCase.checked = IM.isCaseSensitive;
    eBold.checked = IM.isBold;
    eItalic.checked = IM.isItalic;
    eUnder.checked = IM.isUnderline;
    eStrike.checked = IM.isStrikeThrough;
    eQuote.checked = IM.isQuote;
    eMono.checked = IM.isMonospace;
    eSpoil.checked = IM.isSpoiler;
}

function openEdit(IM) {
    fillEdit(IM);
    editModal.showModal();
}

async function saveEdit() {
    const ol = {
        id: +eId.value,
        keywordContent: eContent.value.trim(),
        keywordType: +eType.value,
        keywordAction: +eAction.value,
        isCaseSensitive: eCase.checked,
        isBold: eBold.checked,
        isItalic: eItalic.checked,
        isUnderline: eUnder.checked,
        isStrikeThrough: eStrike.checked,
        isQuote: eQuote.checked,
        isMonospace: eMono.checked,
        isSpoiler: eSpoil.checked
    };
    await api(`${API}/update`, {
        method: 'PUT',
        body: JSON.stringify(ol)
    });
    toast('修改成功');
    refresh();
}

document.querySelectorAll('[role=tab]').forEach(Di => {
    Di.onclick = () => {
        document.querySelectorAll('[role=tab]').forEach(tU => tU.classList.remove('tab-active'));
        Di.classList.add('tab-active');
        ['list', 'single', 'batch', 'text'].forEach(oT => {
            document.getElementById('panel-' + oT).classList.toggle('hidden', !Di.id.endsWith(oT));
        });
    };
});

refresh();
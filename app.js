const STORAGE_KEY = "coffee-luck-tool-v1";
const GUARANTEE_AT = 10;
const WIN_RATE = 0.18;
const VOUCHER_PREVIEW_LIMIT = 20;
const BLESSINGS = [
  "愿你今天遇见的好事，比咖啡香气更早抵达。",
  "愿手里的这一杯，替生活按下温柔的暂停键。",
  "今天适合被偏爱，也适合相信一点小幸运。",
  "愿忙碌有回音，付出有结果，咖啡刚好温热。",
  "愿你走过的每一步，都在悄悄靠近喜欢的生活。",
  "今日宜开心，宜松弛，宜把好消息留给自己。",
  "愿你眼里有光，杯里有香，心里不慌不忙。",
  "愿所有迟到的好事，都在今天找到你。",
  "这一杯敬认真生活的你，下一程请继续闪闪发光。",
  "愿你有说走就走的勇气，也有随时停靠的安心。",
  "今天的烦恼请稍后再来，你正忙着接收好运。",
  "愿你的灵感像咖啡香一样，轻轻一飘就满屋子。",
  "愿普通的一天，也能冒出值得收藏的小惊喜。",
  "愿你做的选择都有底气，走的路都有风景。",
  "今天会有一件小事，让你觉得人间很值得。",
  "愿你被理解、被惦记，也被生活温柔回应。",
  "愿你的努力不被辜负，期待不再久等。",
  "把这一杯喝完，愿你刚好拥有重新出发的力气。",
  "愿你忙而不乱，累而不丧，日子越过越有光。",
  "愿你心里的答案慢慢清晰，也恰好坚定。",
  "今日份好运已到账，请带着笑意签收。",
  "愿你的下一次抬头，正好看见喜欢的风景。",
  "愿所有“差一点”，最终都变成“刚刚好”。",
  "愿你有被世界拥抱的运气，也有拥抱自己的能力。",
  "今天不必事事完美，有一杯好咖啡就很不错。",
  "愿你的愿望不声不响，却一个一个认真实现。",
  "愿你遇见好人、听见好话、收到好消息。",
  "愿今天的你，比昨天更自在，比明天更值得期待。",
  "愿平凡日子有滋有味，重要时刻如愿以偿。",
  "这一杯是好运的暗号：今天会有值得开心的事。",
];

const state = loadState();
let drawTimes = 1;
let voucherFilter = "active";
let showAllVouchers = false;

const screens = [...document.querySelectorAll(".screen")];
const drawCount = document.querySelector("#drawCount");
const playerName = document.querySelector("#playerName");
const missLabel = document.querySelector("#missLabel");
const missCount = document.querySelector("#missCount");
const drawResult = document.querySelector("#drawResult");
const drawHistory = document.querySelector("#drawHistory");
const giftHistory = document.querySelector("#giftHistory");
const nameList = document.querySelector("#nameList");
const historyModal = document.querySelector("#historyModal");
const allDrawHistory = document.querySelector("#allDrawHistory");
const redeemMessage = document.querySelector("#redeemMessage");
const voucherList = document.querySelector("#voucherList");
const voucherStat = document.querySelector("#voucherStat");
const toggleVouchers = document.querySelector("#toggleVouchers");
let lastTapAt = 0;

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.go));
});

document.addEventListener(
  "touchend",
  (event) => {
    const now = Date.now();
    const tappedControl = event.target.closest("button");
    if (!tappedControl) {
      lastTapAt = now;
      return;
    }

    if (now - lastTapAt < 360) {
      event.preventDefault();
      tappedControl.click();
    }
    lastTapAt = now;
  },
  { passive: false },
);

document.querySelector("#minusDraws").addEventListener("click", () => {
  setDrawTimes(drawTimes - 1);
});

document.querySelector("#plusDraws").addEventListener("click", () => {
  setDrawTimes(drawTimes + 1);
});

drawCount.addEventListener("input", () => {
  const digits = drawCount.value.replace(/\D/g, "");
  drawCount.value = digits.slice(0, 2);
  if (drawCount.value !== "") {
    setDrawTimes(drawCount.value);
  }
});

drawCount.addEventListener("blur", () => {
  setDrawTimes(drawCount.value || 1);
});

playerName.addEventListener("input", renderMissStatus);

document.querySelector("#drawForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  setDrawTimes(drawCount.value || 1);
  const player = getActivePlayer();
  await animateDraw();

  const results = [];
  for (let index = 0; index < drawTimes; index += 1) {
    const result = runSingleDraw(player);
    results.push(result);
    state.drawHistory.unshift(result);
  }

  saveState();
  renderDrawResult(results);
  render();
});

document.querySelector("#resetDraw").addEventListener("click", () => {
  state.playerMisses = {};
  state.drawHistory = [];
  state.vouchers = [];
  state.dailyBlessings = { date: "", usedIndexes: [] };
  saveState();
  drawResult.className = "result-panel";
  drawResult.innerHTML = `
    <div class="result-visual" id="drawVisual">☕</div>
    <p class="result-kicker">已经重置</p>
    <h3>下一杯重新开始</h3>
    <p>所有人的保底次数、记录和核销码都清空了。</p>
  `;
  render();
});

document.querySelector("#showAllDraws").addEventListener("click", () => {
  renderAllDrawHistory();
  historyModal.hidden = false;
});

document.querySelector("#closeHistory").addEventListener("click", () => {
  historyModal.hidden = true;
});

historyModal.addEventListener("click", (event) => {
  if (event.target === historyModal) {
    historyModal.hidden = true;
  }
});

document.querySelector("#redeemForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const code = document.querySelector("#redeemCode").value.trim();
  redeemVoucher(code);
});

voucherList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-code]");
  if (!button) return;
  voidVoucher(button.dataset.code);
});

document.querySelectorAll("[data-voucher-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    voucherFilter = button.dataset.voucherFilter;
    showAllVouchers = false;
    renderVouchers();
  });
});

toggleVouchers.addEventListener("click", () => {
  if (voucherFilter === "all" && showAllVouchers) {
    showAllVouchers = false;
  } else {
    voucherFilter = "all";
    showAllVouchers = true;
  }
  renderVouchers();
});

document.querySelector("#giftForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const names = parseNames(nameList.value);
  if (names.length === 0) {
    renderGiftMessage("先放几个人名", "一行一个名字，然后再随机。", "🎁");
    return;
  }

  state.names = names;
  renderGiftMessage("正在转杯", "名单已经进杯，马上出结果。", "☕", true);
  await wait(760);

  const winner = names[Math.floor(Math.random() * names.length)];
  const record = {
    winner,
    total: names.length,
    time: new Date().toLocaleString("zh-CN", { hour12: false }),
  };
  state.giftHistory.unshift(record);
  state.giftHistory = state.giftHistory.slice(0, 8);
  saveState();
  renderGiftMessage(`送给 ${winner}`, `从 ${names.length} 个人里随机选出。`, "🎁");
  renderGiftHistory();
});

document.querySelector("#clearNames").addEventListener("click", () => {
  state.names = [];
  state.giftHistory = [];
  nameList.value = "";
  saveState();
  renderGiftMessage("名单清空了", "可以重新输入一批候选人。", "🎁");
  renderGiftHistory();
});

function runSingleDraw(player) {
  const now = new Date();
  const attempt = getPlayerMisses(player) + 1;
  const guaranteed = attempt >= GUARANTEE_AT;
  const won = guaranteed || Math.random() < WIN_RATE;
  const code = won ? makeCode(player) : "";
  const blessing = won ? pickDailyBlessing(player, code, now) : "";
  const blessingLabel = won ? getBlessingLabel(now) : "";

  if (won) {
    state.playerMisses[player] = 0;
    state.vouchers.unshift({
      code,
      player,
      blessing,
      blessingLabel,
      status: "active",
      createdAt: now.toLocaleString("zh-CN", { hour12: false }),
      redeemedAt: "",
    });
  } else {
    state.playerMisses[player] = attempt;
  }

  return {
    player,
    won,
    guaranteed,
    attempt,
    code,
    blessing,
    blessingLabel,
    time: now.toLocaleString("zh-CN", { hour12: false }),
  };
}

async function animateDraw() {
  drawResult.className = "result-panel shaking";
  drawResult.innerHTML = `
    <div class="result-visual">☕</div>
    <p class="result-kicker">正在摇杯</p>
    <h3>咖啡豆正在决定命运</h3>
    <p>请稍等一下。</p>
  `;
  await wait(880);
}

function renderDrawResult(results) {
  const wins = results.filter((item) => item.won);
  const last = results[results.length - 1];
  const player = escapeHtml(last.player);

  if (wins.length > 0) {
    const blessingCards = wins
      .map(
        (item) => `
          <div class="blessing-card">
            <span>${escapeHtml(item.blessingLabel)}</span>
            <strong>“${escapeHtml(item.blessing)}”</strong>
            <small>核销码：${escapeHtml(item.code)}</small>
          </div>
        `,
      )
      .join("");
    drawResult.className = "result-panel win";
    drawResult.innerHTML = `
      <div class="result-visual">☕</div>
      <p class="result-kicker">${wins.length > 1 ? `中了 ${wins.length} 杯` : "中了"}</p>
      <h3>${player} 获得一杯咖啡</h3>
      <div class="blessing-list">${blessingCards}</div>
    `;
    return;
  }

  drawResult.className = "result-panel lose";
  drawResult.innerHTML = `
    <div class="result-visual">○</div>
    <p class="result-kicker">这次没中</p>
    <h3>${player} 离保底更近了</h3>
    <p>当前已连续未中 ${getPlayerMisses(last.player)} 次。</p>
  `;
}

function renderGiftMessage(title, copy, icon, shaking = false) {
  const panel = document.querySelector("#giftResult");
  panel.className = shaking ? "result-panel gift-result shaking" : "result-panel gift-result";
  panel.innerHTML = `
    <div class="result-visual">${icon}</div>
    <p class="result-kicker">${shaking ? "随机中" : "结果"}</p>
    <h3>${title}</h3>
    <p>${copy}</p>
  `;
}

function render() {
  renderDrawCount();
  renderMissStatus();
  nameList.value = state.names.join("\n");
  renderDrawHistory();
  renderGiftHistory();
  renderVouchers();
}

function renderDrawCount() {
  drawCount.value = drawTimes;
}

function setDrawTimes(value) {
  const parsed = Number.parseInt(value, 10);
  drawTimes = Number.isFinite(parsed) ? Math.min(10, Math.max(1, parsed)) : 1;
  renderDrawCount();
}

function renderDrawHistory() {
  if (state.drawHistory.length === 0) {
    drawHistory.innerHTML = `<li class="empty">还没有抽奖记录。</li>`;
    return;
  }

  drawHistory.innerHTML = state.drawHistory
    .slice(0, 8)
    .map((item) => {
      const player = escapeHtml(item.player);
      const mark = item.won ? `中奖 ${escapeHtml(item.code)}` : `未中，第 ${item.attempt} 次`;
      const reason = item.guaranteed ? "，保底" : "";
      return `<li>${escapeHtml(item.time)}｜${player}｜${mark}${reason}</li>`;
    })
    .join("");
}

function renderAllDrawHistory() {
  if (state.drawHistory.length === 0) {
    allDrawHistory.innerHTML = `<li class="empty">还没有抽奖记录。</li>`;
    return;
  }

  allDrawHistory.innerHTML = state.drawHistory
    .map((item) => {
      const player = escapeHtml(item.player);
      const mark = item.won ? `中奖 ${escapeHtml(item.code)}` : `未中，第 ${item.attempt} 次`;
      const reason = item.guaranteed ? "，保底" : "";
      return `<li>${escapeHtml(item.time)}｜${player}｜${mark}${reason}</li>`;
    })
    .join("");
}

function renderMissStatus() {
  const player = getActivePlayer();
  missLabel.textContent = `${player} 当前未中`;
  missCount.textContent = getPlayerMisses(player);
}

function renderVouchers() {
  const activeCount = state.vouchers.filter((voucher) => voucher.status === "active").length;
  voucherStat.textContent = `${activeCount} 张未核销 / 共 ${state.vouchers.length} 张`;
  document.querySelectorAll("[data-voucher-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.voucherFilter === voucherFilter);
  });

  if (state.vouchers.length === 0) {
    voucherList.innerHTML = `<li class="empty">还没有中奖核销码。</li>`;
    toggleVouchers.hidden = true;
    toggleVouchers.disabled = false;
    return;
  }

  const filteredVouchers =
    voucherFilter === "all" ? state.vouchers : state.vouchers.filter((voucher) => voucher.status === voucherFilter);
  const visibleVouchers = showAllVouchers ? filteredVouchers : filteredVouchers.slice(0, VOUCHER_PREVIEW_LIMIT);

  if (filteredVouchers.length === 0) {
    voucherList.innerHTML = `<li class="empty">这个分类里还没有核销码。</li>`;
    toggleVouchers.hidden = false;
    toggleVouchers.disabled = false;
    toggleVouchers.textContent = `查看全部核销记录（${state.vouchers.length}）`;
    return;
  }

  voucherList.innerHTML = visibleVouchers
    .map((voucher) => {
      const statusText = getVoucherStatusText(voucher);
      const action =
        voucher.status === "active"
          ? `<button class="tiny-button" type="button" data-code="${escapeHtml(voucher.code)}">作废</button>`
          : "";
      return `
        <li>
          <span>
            <strong>${escapeHtml(voucher.code)}</strong>
            <small>${escapeHtml(voucher.player)}｜${statusText}</small>
            ${voucher.blessing ? `<small class="voucher-blessing">“${escapeHtml(voucher.blessing)}”</small>` : ""}
          </span>
          ${action}
        </li>
      `;
    })
    .join("");

  const allRecordsAreVisible = voucherFilter === "all" && filteredVouchers.length <= VOUCHER_PREVIEW_LIMIT;
  toggleVouchers.hidden = false;
  toggleVouchers.disabled = allRecordsAreVisible;
  toggleVouchers.textContent =
    voucherFilter === "all" && showAllVouchers
      ? "收起到最近 20 条"
      : `查看全部核销记录（${state.vouchers.length}）`;
}

function renderGiftHistory() {
  if (state.giftHistory.length === 0) {
    giftHistory.innerHTML = `<li class="empty">还没有随机结果。</li>`;
    return;
  }

  giftHistory.innerHTML = state.giftHistory
    .map((item) => `<li>${escapeHtml(item.time)}｜${escapeHtml(item.winner)}｜${item.total} 人名单</li>`)
    .join("");
}

function showScreen(id) {
  screens.forEach((screen) => screen.classList.toggle("active", screen.id === id));
  if (id === "drawScreen") {
    renderMissStatus();
  }
}

function parseNames(value) {
  return [...new Set(value.split(/\n|,|，|、/).map((name) => name.trim()).filter(Boolean))];
}

function makeCode(player) {
  const prefix = player.replace(/\s+/g, "").slice(0, 16) || "咖啡";
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${random}`;
}

function pickDailyBlessing(player, code, date) {
  const dateKey = getLocalDateKey(date);
  if (state.dailyBlessings.date !== dateKey) {
    state.dailyBlessings = { date: dateKey, usedIndexes: [] };
  }

  if (state.dailyBlessings.usedIndexes.length >= BLESSINGS.length) {
    state.dailyBlessings.usedIndexes = [];
  }

  const startIndex = hashString(`${dateKey}|${player}|${code}`) % BLESSINGS.length;
  let blessingIndex = startIndex;
  for (let offset = 0; offset < BLESSINGS.length; offset += 1) {
    const candidate = (startIndex + offset) % BLESSINGS.length;
    if (!state.dailyBlessings.usedIndexes.includes(candidate)) {
      blessingIndex = candidate;
      break;
    }
  }

  state.dailyBlessings.usedIndexes.push(blessingIndex);
  return BLESSINGS[blessingIndex];
}

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getBlessingLabel(date) {
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  return `${date.getMonth() + 1}月${date.getDate()}日 · ${weekdays[date.getDay()]}咖啡签`;
}

function hashString(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getActivePlayer() {
  return playerName.value.trim() || "这位朋友";
}

function getPlayerMisses(player) {
  return Number(state.playerMisses[player]) || 0;
}

function redeemVoucher(code) {
  if (!code) {
    redeemMessage.textContent = "先输入一个核销码。";
    return;
  }

  const voucher = state.vouchers.find((item) => item.code.toLowerCase() === code.toLowerCase());
  if (!voucher) {
    redeemMessage.textContent = "没有找到这个核销码。";
    return;
  }

  if (voucher.status === "redeemed") {
    redeemMessage.textContent = `这个码已核销：${voucher.redeemedAt}`;
    return;
  }

  if (voucher.status === "void") {
    redeemMessage.textContent = "这个码已经作废。";
    return;
  }

  voucher.status = "redeemed";
  voucher.redeemedAt = new Date().toLocaleString("zh-CN", { hour12: false });
  saveState();
  redeemMessage.textContent = `核销成功：${voucher.player} 的一杯咖啡。`;
  document.querySelector("#redeemCode").value = "";
  renderVouchers();
}

function voidVoucher(code) {
  const voucher = state.vouchers.find((item) => item.code === code);
  if (!voucher || voucher.status !== "active") return;
  voucher.status = "void";
  saveState();
  redeemMessage.textContent = `已作废：${voucher.code}`;
  renderVouchers();
}

function getVoucherStatusText(voucher) {
  if (voucher.status === "redeemed") return `已核销 ${voucher.redeemedAt}`;
  if (voucher.status === "void") return "已作废";
  return `未核销 ${voucher.createdAt}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return map[character];
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const playerMisses =
      saved?.playerMisses && typeof saved.playerMisses === "object"
        ? saved.playerMisses
        : { 这位朋友: Number(saved?.misses) || 0 };
    return {
      playerMisses,
      names: Array.isArray(saved?.names) ? saved.names : [],
      drawHistory: Array.isArray(saved?.drawHistory) ? saved.drawHistory : [],
      giftHistory: Array.isArray(saved?.giftHistory) ? saved.giftHistory : [],
      vouchers: Array.isArray(saved?.vouchers) ? saved.vouchers : [],
      dailyBlessings:
        saved?.dailyBlessings && typeof saved.dailyBlessings === "object"
          ? saved.dailyBlessings
          : { date: "", usedIndexes: [] },
    };
  } catch {
    return {
      playerMisses: {},
      names: [],
      drawHistory: [],
      giftHistory: [],
      vouchers: [],
      dailyBlessings: { date: "", usedIndexes: [] },
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

render();

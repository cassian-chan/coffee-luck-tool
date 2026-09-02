const STORAGE_KEY = "coffee-luck-tool-v1";
const GUARANTEE_AT = 10;
const WIN_RATE = 0.18;

const state = loadState();
let drawTimes = 1;

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

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.go));
});

document.querySelector("#minusDraws").addEventListener("click", () => {
  drawTimes = Math.max(1, drawTimes - 1);
  renderDrawCount();
});

document.querySelector("#plusDraws").addEventListener("click", () => {
  drawTimes = Math.min(10, drawTimes + 1);
  renderDrawCount();
});

playerName.addEventListener("input", renderMissStatus);

document.querySelector("#drawForm").addEventListener("submit", async (event) => {
  event.preventDefault();
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
  const attempt = getPlayerMisses(player) + 1;
  const guaranteed = attempt >= GUARANTEE_AT;
  const won = guaranteed || Math.random() < WIN_RATE;
  const code = won ? makeCode(player) : "";

  if (won) {
    state.playerMisses[player] = 0;
    state.vouchers.unshift({
      code,
      player,
      status: "active",
      createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
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
    time: new Date().toLocaleString("zh-CN", { hour12: false }),
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
    const codes = wins.map((item) => escapeHtml(item.code)).join(" / ");
    drawResult.className = "result-panel win";
    drawResult.innerHTML = `
      <div class="result-visual">☕</div>
      <p class="result-kicker">${wins.length > 1 ? `中了 ${wins.length} 杯` : "中了"}</p>
      <h3>${player} 获得一杯咖啡</h3>
      <p class="code-line">核销码：${codes}</p>
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
  drawCount.textContent = drawTimes;
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
  voucherStat.textContent = `${activeCount} 张未核销`;

  if (state.vouchers.length === 0) {
    voucherList.innerHTML = `<li class="empty">还没有中奖核销码。</li>`;
    return;
  }

  voucherList.innerHTML = state.vouchers
    .slice(0, 6)
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
          </span>
          ${action}
        </li>
      `;
    })
    .join("");
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
    };
  } catch {
    return { playerMisses: {}, names: [], drawHistory: [], giftHistory: [], vouchers: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

render();

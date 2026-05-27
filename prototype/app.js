const data = [
  {
    id: "gong-cha",
    type: "brand",
    typeLabel: "品牌",
    title: "Gong Cha",
    subtitle: "台灣起源的國際連鎖茶飲品牌",
    description: "以穩定產品線、全球加盟擴張與標準化門市營運見長，適合作為品牌資料庫樣板。",
    kpis: ["2006 成立", "20+ 市場", "高加盟潛力"],
    tags: ["台灣", "加盟", "奶蓋茶"],
    relations: ["taipei", "new-york", "milk-foam-tea", "global-expansion"],
    color: "#8a5a32"
  },
  {
    id: "chagee",
    type: "brand",
    typeLabel: "品牌",
    title: "CHAGEE",
    subtitle: "新中式茶飲的國際化代表",
    description: "以原葉鮮奶茶、東方茶文化與海外展店速度形成差異化，適合追蹤新式茶飲趨勢。",
    kpis: ["2017 成立", "東南亞擴張", "高成長"],
    tags: ["中國", "新中式", "海外展店"],
    relations: ["singapore", "matcha-foam", "global-expansion"],
    color: "#8a5a32"
  },
  {
    id: "tokyo",
    type: "city",
    typeLabel: "城市",
    title: "東京珍奶指南",
    subtitle: "高密度、季節限定與品牌快閃市場",
    description: "東京適合製作 SEO 城市指南，包含熱門商圈、平均價格、在地品牌與季節性飲品。",
    kpis: ["均價 ¥650", "市場成熟", "高搜尋量"],
    tags: ["日本", "城市 SEO", "限定飲品"],
    relations: ["gong-cha", "brown-sugar", "matcha-foam", "city-guide"],
    color: "#3d6f56"
  },
  {
    id: "singapore",
    type: "city",
    typeLabel: "城市",
    title: "新加坡珍奶市場",
    subtitle: "國際品牌測試與高頻消費場景",
    description: "新加坡適合作為東南亞市場觀察頁，連結品牌擴張、商場門市與新品測試。",
    kpis: ["均價 S$5.8", "高競爭", "商場場景"],
    tags: ["東南亞", "市場情報", "品牌擴張"],
    relations: ["chagee", "fruit-tea", "global-expansion"],
    color: "#3d6f56"
  },
  {
    id: "brown-sugar",
    type: "drink",
    typeLabel: "飲品",
    title: "黑糖珍珠鮮奶",
    subtitle: "視覺辨識度高的全球化爆品",
    description: "適合建立飲品百科頁，追蹤代表品牌、熱量、甜度、城市熱度與新聞關聯。",
    kpis: ["高甜度", "約 520 kcal", "趨勢 86"],
    tags: ["黑糖", "珍珠", "高熱量"],
    relations: ["tokyo", "new-york", "drink-trend"],
    color: "#c45d4c"
  },
  {
    id: "matcha-foam",
    type: "drink",
    typeLabel: "飲品",
    title: "抹茶奶蓋茶",
    subtitle: "茶感、奶蓋與亞洲風味融合",
    description: "可連結日本城市頁、新中式茶飲品牌與 2026 抹茶趨勢報告。",
    kpis: ["中咖啡因", "約 390 kcal", "趨勢 91"],
    tags: ["抹茶", "奶蓋", "茶感"],
    relations: ["tokyo", "chagee", "drink-trend"],
    color: "#c45d4c"
  },
  {
    id: "global-expansion",
    type: "news",
    typeLabel: "新聞",
    title: "亞洲茶飲品牌加速海外展店",
    subtitle: "品牌、城市與加盟線索的內容入口",
    description: "新聞頁需標記關聯品牌與城市，將日常內容變成資料庫成長來源。",
    kpis: ["品牌擴張", "加盟情報", "AI 摘要"],
    tags: ["新聞", "展店", "產業"],
    relations: ["gong-cha", "chagee", "singapore", "new-york"],
    color: "#466a8f"
  },
  {
    id: "city-guide",
    type: "news",
    typeLabel: "新聞",
    title: "東京與紐約成為珍奶 SEO 熱門城市",
    subtitle: "城市指南與搜尋流量的內容策略",
    description: "城市型內容應定期更新價格、熱門商圈、代表品牌與在地趨勢。",
    kpis: ["城市 SEO", "價格資料", "每月更新"],
    tags: ["SEO", "城市指南", "內容策略"],
    relations: ["tokyo", "new-york", "brown-sugar"],
    color: "#466a8f"
  },
  {
    id: "new-york",
    type: "city",
    typeLabel: "城市",
    title: "紐約珍奶地圖",
    subtitle: "多元族群與高單價茶飲市場",
    description: "可作為美國市場入口頁，連結品牌展店、社群熱門飲品與商圈資料。",
    kpis: ["均價 US$7.2", "高單價", "社群熱度高"],
    tags: ["美國", "高單價", "城市地圖"],
    relations: ["gong-cha", "brown-sugar", "global-expansion"],
    color: "#3d6f56"
  },
  {
    id: "fruit-tea",
    type: "drink",
    typeLabel: "飲品",
    title: "水果茶",
    subtitle: "低負擔與高復購的成長品類",
    description: "可支撐健康化、低糖、夏季飲品等趨勢內容與品牌新品資料。",
    kpis: ["低咖啡因", "約 280 kcal", "趨勢 78"],
    tags: ["水果", "低糖", "季節"],
    relations: ["singapore", "drink-trend"],
    color: "#c45d4c"
  }
];

const graphNodes = [
  { id: "gong-cha", label: "Gong Cha", type: "brand", x: 130, y: 110 },
  { id: "chagee", label: "CHAGEE", type: "brand", x: 130, y: 310 },
  { id: "tokyo", label: "東京", type: "city", x: 360, y: 80 },
  { id: "singapore", label: "新加坡", type: "city", x: 360, y: 340 },
  { id: "new-york", label: "紐約", type: "city", x: 590, y: 115 },
  { id: "brown-sugar", label: "黑糖珍奶", type: "drink", x: 515, y: 230 },
  { id: "matcha-foam", label: "抹茶奶蓋", type: "drink", x: 285, y: 210 },
  { id: "global-expansion", label: "展店新聞", type: "news", x: 610, y: 320 }
];

const graphEdges = [
  ["gong-cha", "tokyo"],
  ["gong-cha", "new-york"],
  ["gong-cha", "matcha-foam"],
  ["chagee", "singapore"],
  ["chagee", "matcha-foam"],
  ["tokyo", "brown-sugar"],
  ["tokyo", "matcha-foam"],
  ["singapore", "global-expansion"],
  ["new-york", "global-expansion"],
  ["brown-sugar", "global-expansion"]
];

let activeType = "all";
let activeEntity = null;

const typeLabels = {
  brand: "品牌",
  city: "城市",
  drink: "飲品",
  news: "新聞"
};

const typeColors = {
  brand: "#8a5a32",
  city: "#3d6f56",
  drink: "#c45d4c",
  news: "#466a8f"
};

const searchInput = document.querySelector("#searchInput");
const clearSearch = document.querySelector("#clearSearch");
const cardGrid = document.querySelector("#cardGrid");
const resultStatus = document.querySelector("#resultStatus");
const detailDialog = document.querySelector("#detailDialog");
const detailContent = document.querySelector("#detailContent");
const closeDialog = document.querySelector("#closeDialog");

function normalize(value) {
  return value.toLowerCase().trim();
}

function getFilteredData() {
  const term = normalize(searchInput.value);
  return data.filter((item) => {
    const matchesType = activeType === "all" || item.type === activeType;
    const haystack = normalize([
      item.title,
      item.subtitle,
      item.description,
      item.tags.join(" "),
      item.kpis.join(" ")
    ].join(" "));
    return matchesType && (!term || haystack.includes(term));
  });
}

function renderCards() {
  const items = getFilteredData();
  cardGrid.innerHTML = "";
  resultStatus.textContent = `目前顯示 ${items.length} 筆資料。`;

  items.forEach((item) => {
    const card = document.createElement("button");
    card.className = "data-card";
    card.type = "button";
    card.dataset.id = item.id;
    card.innerHTML = `
      <div class="card-visual"><canvas class="thumb-canvas" width="360" height="120" aria-hidden="true"></canvas></div>
      <span class="type-pill ${item.type}">${item.typeLabel}</span>
      <h3>${item.title}</h3>
      <p>${item.description}</p>
      <div class="meta-row">${item.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
    `;
    card.addEventListener("click", () => openDetail(item.id));
    cardGrid.appendChild(card);
    drawThumb(card.querySelector("canvas"), item);
  });
}

function openDetail(id) {
  const item = data.find((entry) => entry.id === id);
  if (!item) return;
  activeEntity = item;

  detailContent.innerHTML = `
    <div class="detail-body">
      <span class="type-pill ${item.type}">${item.typeLabel}</span>
      <h2>${item.title}</h2>
      <p class="lede">${item.subtitle}</p>
      <p>${item.description}</p>
      <div class="detail-kpis">
        ${item.kpis.map((kpi) => {
          const parts = kpi.split(" ");
          const main = parts.shift();
          return `<article><strong>${main}</strong><span>${parts.join(" ") || "指標"}</span></article>`;
        }).join("")}
      </div>
      <h3>頁面功能</h3>
      <p>${getFeatureCopy(item.type)}</p>
      <h3>關聯資料</h3>
      <ul class="relation-list">
        ${item.relations.map((relation) => `<li>${getRelationLabel(relation)}</li>`).join("")}
      </ul>
    </div>
  `;

  renderGraph(item);
  if (typeof detailDialog.showModal === "function") {
    detailDialog.showModal();
  } else {
    detailDialog.setAttribute("open", "open");
  }
}

function getFeatureCopy(type) {
  const copy = {
    brand: "品牌詳情頁應包含品牌故事、門店規模、主要市場、招牌飲品、相關城市、相關新聞與 SEO FAQ。",
    city: "城市頁應包含市場概覽、平均價格、熱門品牌、熱門飲品、本地洞察、近期新聞與城市比較資料。",
    drink: "飲品頁應包含成分、甜度、熱量、咖啡因、口味輪廓、代表品牌、熱門城市與趨勢分數。",
    news: "新聞頁應包含摘要、來源、分類、發布日期、相關品牌、城市、飲品與 AI 摘要欄位。"
  };
  return copy[type];
}

function getRelationLabel(id) {
  const item = data.find((entry) => entry.id === id);
  const node = graphNodes.find((entry) => entry.id === id);
  return item?.title || node?.label || id;
}

function drawThumb(canvas, item) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#efe4d4";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = item.color;
  ctx.globalAlpha = 0.16;
  ctx.fillRect(0, height - 42, width, 42);
  ctx.globalAlpha = 1;

  if (item.type === "city") {
    ctx.fillStyle = item.color;
    [44, 86, 132, 178, 232, 286].forEach((x, index) => {
      const h = 30 + (index % 3) * 18;
      ctx.fillRect(x, height - h - 18, 24, h);
      ctx.fillRect(x + 5, height - h - 30, 14, 12);
    });
  } else if (item.type === "news") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(68, 22, 224, 76);
    ctx.fillStyle = item.color;
    ctx.fillRect(86, 38, 92, 10);
    ctx.fillRect(86, 58, 154, 8);
    ctx.fillRect(86, 74, 124, 8);
  } else {
    drawCup(ctx, width / 2, 18, item.color, item.type === "drink");
  }
}

function drawCup(ctx, x, y, color, withSteam) {
  ctx.strokeStyle = "#171717";
  ctx.lineWidth = 4;
  ctx.fillStyle = "#fff8ea";
  ctx.beginPath();
  ctx.moveTo(x - 44, y + 14);
  ctx.lineTo(x + 44, y + 14);
  ctx.lineTo(x + 30, y + 92);
  ctx.lineTo(x - 30, y + 92);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.78;
  ctx.fillRect(x - 34, y + 48, 68, 30);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#171717";
  [[-20, 80], [0, 86], [19, 80], [-8, 72], [11, 70]].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 5, 0, Math.PI * 2);
    ctx.fill();
  });
  if (withSteam) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    [-18, 0, 18].forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(x + dx, y + 4);
      ctx.quadraticCurveTo(x + dx - 10, y - 8, x + dx, y - 18);
      ctx.stroke();
    });
  }
}

function drawHeroCanvas() {
  const canvas = document.querySelector("#bobaCanvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = document.body.classList.contains("dark") ? "#312d28" : "#efe4d4";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = document.body.classList.contains("dark") ? "#76695c" : "#cdbda9";
  ctx.lineWidth = 2;
  graphEdges.forEach(([fromId, toId]) => {
    const from = graphNodes.find((node) => node.id === fromId);
    const to = graphNodes.find((node) => node.id === toId);
    if (!from || !to) return;
    ctx.beginPath();
    ctx.moveTo(from.x * 0.66 + 10, from.y * 0.56 + 12);
    ctx.lineTo(to.x * 0.66 + 10, to.y * 0.56 + 12);
    ctx.stroke();
  });

  graphNodes.forEach((node) => {
    const x = node.x * 0.66 + 10;
    const y = node.y * 0.56 + 12;
    ctx.fillStyle = typeColors[node.type];
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
  });

  drawCup(ctx, 410, 58, "#8a5a32", true);
  ctx.fillStyle = document.body.classList.contains("dark") ? "#f3eee6" : "#171717";
  ctx.font = "bold 24px Arial";
  ctx.fillText("Boba Graph", 34, 238);
  ctx.font = "15px Arial";
  ctx.fillText("Brands × Cities × Drinks × News", 34, 262);
}

function renderGraph(active = null) {
  const edgeGroup = document.querySelector(".edges");
  const nodeGroup = document.querySelector(".nodes");
  edgeGroup.innerHTML = "";
  nodeGroup.innerHTML = "";

  const activeIds = new Set();
  if (active) {
    activeIds.add(active.id);
    active.relations.forEach((relation) => activeIds.add(relation));
  }

  graphEdges.forEach(([fromId, toId]) => {
    const from = graphNodes.find((node) => node.id === fromId);
    const to = graphNodes.find((node) => node.id === toId);
    if (!from || !to) return;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", from.x);
    line.setAttribute("y1", from.y);
    line.setAttribute("x2", to.x);
    line.setAttribute("y2", to.y);
    line.classList.add("graph-edge");
    if (active && !(activeIds.has(fromId) && activeIds.has(toId))) line.classList.add("dim");
    edgeGroup.appendChild(line);
  });

  graphNodes.forEach((node) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("graph-node");
    if (active && !activeIds.has(node.id)) group.classList.add("dim");
    if (active && activeIds.has(node.id)) group.classList.add("active");
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", 32);
    circle.setAttribute("fill", typeColors[node.type]);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", node.x);
    text.setAttribute("y", node.y + 54);
    text.textContent = node.label;
    group.append(circle, text);
    nodeGroup.appendChild(group);
  });
}

document.querySelectorAll(".filter-tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter-tab").forEach((tab) => tab.classList.remove("active"));
    button.classList.add("active");
    activeType = button.dataset.type;
    renderCards();
  });
});

searchInput.addEventListener("input", renderCards);
clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  renderCards();
  searchInput.focus();
});

closeDialog.addEventListener("click", () => {
  detailDialog.close();
});

detailDialog.addEventListener("close", () => {
  activeEntity = null;
  renderGraph();
});

document.querySelector("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  drawHeroCanvas();
});

renderCards();
renderGraph();
drawHeroCanvas();

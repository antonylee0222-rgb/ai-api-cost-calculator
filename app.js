const presets = {
  starter: {
    mau: 1200,
    conversionRate: 6,
    requestsPerUser: 80,
    subscriptionPrice: 19,
    inputTokens: 900,
    outputTokens: 550,
    inputPrice: 0.15,
    outputPrice: 0.6,
    overheadMultiplier: 1.25,
    cacheSavings: 12,
    safetyBuffer: 30,
    paymentFee: 3.5,
    infraCost: 180,
    teamCost: 900,
    targetMargin: 70,
  },
  growth: {
    mau: 8500,
    conversionRate: 8.5,
    requestsPerUser: 120,
    subscriptionPrice: 29,
    inputTokens: 1200,
    outputTokens: 750,
    inputPrice: 0.25,
    outputPrice: 1.2,
    overheadMultiplier: 1.35,
    cacheSavings: 18,
    safetyBuffer: 35,
    paymentFee: 3.8,
    infraCost: 850,
    teamCost: 3200,
    targetMargin: 72,
  },
  power: {
    mau: 2400,
    conversionRate: 12,
    requestsPerUser: 420,
    subscriptionPrice: 49,
    inputTokens: 2400,
    outputTokens: 1600,
    inputPrice: 0.8,
    outputPrice: 3.2,
    overheadMultiplier: 1.55,
    cacheSavings: 10,
    safetyBuffer: 45,
    paymentFee: 4.2,
    infraCost: 1400,
    teamCost: 5200,
    targetMargin: 68,
  },
};

const modelScenarios = [
  { name: "便宜模型", input: 0.08, output: 0.3, note: "分類、摘要、草稿、低風險任務" },
  { name: "均衡模型", input: 0.25, output: 1.2, note: "多數 SaaS 預設選擇" },
  { name: "高階模型", input: 1.25, output: 5, note: "複雜推理、高價方案、人工審核前" },
];

const fields = [
  "mau",
  "conversionRate",
  "requestsPerUser",
  "subscriptionPrice",
  "inputTokens",
  "outputTokens",
  "inputPrice",
  "outputPrice",
  "overheadMultiplier",
  "cacheSavings",
  "safetyBuffer",
  "paymentFee",
  "infraCost",
  "teamCost",
  "targetMargin",
];

const $ = (id) => document.getElementById(id);

function value(id) {
  return Number($(id).value) || 0;
}

function currency(number) {
  const abs = Math.abs(number);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
  }).format(number);
}

function integer(number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(number);
}

function percent(number) {
  return `${number.toFixed(1)}%`;
}

function collectInputs() {
  return Object.fromEntries(fields.map((field) => [field, value(field)]));
}

function calculate(inputs, overridePrices) {
  const inputPrice = overridePrices?.input ?? inputs.inputPrice;
  const outputPrice = overridePrices?.output ?? inputs.outputPrice;
  const paidUsers = inputs.mau * (inputs.conversionRate / 100);
  const baseRequests = inputs.mau * inputs.requestsPerUser;
  const effectiveRequests = baseRequests * inputs.overheadMultiplier;
  const cacheMultiplier = 1 - inputs.cacheSavings / 100;
  const inputTokenTotal = effectiveRequests * inputs.inputTokens * cacheMultiplier;
  const outputTokenTotal = effectiveRequests * inputs.outputTokens * cacheMultiplier;
  const rawApiCost = (inputTokenTotal / 1_000_000) * inputPrice + (outputTokenTotal / 1_000_000) * outputPrice;
  const bufferedApiCost = rawApiCost * (1 + inputs.safetyBuffer / 100);
  const revenue = paidUsers * inputs.subscriptionPrice;
  const paymentCost = revenue * (inputs.paymentFee / 100);
  const variableCost = bufferedApiCost + paymentCost;
  const totalCost = variableCost + inputs.infraCost + inputs.teamCost;
  const grossProfit = revenue - variableCost;
  const netContribution = revenue - totalCost;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const costPerActiveUser = inputs.mau > 0 ? bufferedApiCost / inputs.mau : 0;
  const costPerPaidUser = paidUsers > 0 ? variableCost / paidUsers : 0;
  const contributionPerPaidUser = inputs.subscriptionPrice * (1 - inputs.paymentFee / 100) - costPerPaidUser;
  const breakEvenUsers = contributionPerPaidUser > 0 ? Math.ceil((inputs.infraCost + inputs.teamCost) / contributionPerPaidUser) : Infinity;
  const targetMarginDecimal = inputs.targetMargin / 100;
  const minimumPrice = costPerPaidUser / Math.max(0.01, 1 - targetMarginDecimal);

  return {
    paidUsers,
    inputTokenTotal,
    outputTokenTotal,
    tokenTotal: inputTokenTotal + outputTokenTotal,
    bufferedApiCost,
    revenue,
    paymentCost,
    variableCost,
    totalCost,
    grossMargin,
    netContribution,
    costPerActiveUser,
    costPerPaidUser,
    breakEvenUsers,
    minimumPrice,
  };
}

function updateRisk(result, inputs) {
  const chip = $("riskChip");
  const statusLabel = $("statusLabel");
  const statusNote = $("statusNote");
  const box = $("recommendationBox");
  const title = $("recommendationTitle");
  const text = $("recommendationText");

  chip.className = "scenario-chip";
  statusLabel.className = "";
  box.style.borderLeftColor = "var(--green)";
  box.style.background = "#f5fbf8";

  if (result.netContribution < 0 || result.grossMargin < 30) {
    chip.textContent = "高風險";
    chip.style.background = "#fff0ed";
    chip.style.color = "var(--coral)";
    statusLabel.textContent = "危險";
    statusLabel.className = "danger";
    statusNote.textContent = "用戶增加時可能越賣越虧";
    title.textContent = "需要調整價格或模型";
    text.textContent = `目前每月淨貢獻為 ${currency(result.netContribution)}，建議提高月費、限制免費用量，或把非核心任務切到便宜模型。`;
    box.style.borderLeftColor = "var(--coral)";
    box.style.background = "#fff7f5";
    return;
  }

  if (result.grossMargin < inputs.targetMargin || result.minimumPrice > inputs.subscriptionPrice) {
    chip.textContent = "需留意";
    chip.style.background = "#fff7e8";
    chip.style.color = "var(--amber)";
    statusLabel.textContent = "偏緊";
    statusLabel.className = "warning";
    statusNote.textContent = "毛利距離目標還有壓力";
    title.textContent = "價格可行但安全邊際不足";
    text.textContent = `若要達到 ${inputs.targetMargin}% 毛利，建議月費至少接近 ${currency(result.minimumPrice)}，或降低輸出長度與重試率。`;
    box.style.borderLeftColor = "var(--amber)";
    box.style.background = "#fffaf0";
    return;
  }

  chip.textContent = "低風險";
  chip.style.background = "#e8f4ef";
  chip.style.color = "var(--green)";
  statusLabel.textContent = "健康";
  statusNote.textContent = "價格仍有安全空間";
  title.textContent = "價格合理";
  text.textContent = "目前假設下，訂閱價格可支撐 API、付款與固定營運成本；下一步可測試更高用量情境。";
}

function renderModelRows(inputs) {
  const rows = modelScenarios
    .map((scenario) => {
      const result = calculate(inputs, scenario);
      const advice =
        result.grossMargin >= inputs.targetMargin
          ? "可作為預設"
          : result.grossMargin >= 45
            ? "適合高價方案"
            : "需限制用量";

      return `
        <tr>
          <td><span class="model-name">${scenario.name}</span><br><span class="tag">${scenario.note}</span></td>
          <td>${currency(scenario.input)} / ${currency(scenario.output)}</td>
          <td>${currency(result.bufferedApiCost)}</td>
          <td>${percent(result.grossMargin)}</td>
          <td>${advice}</td>
        </tr>
      `;
    })
    .join("");

  $("modelRows").innerHTML = rows;
}

function renderSensitivity(inputs) {
  const multipliers = [
    { label: "現在", multiplier: 1 },
    { label: "用量 +25%", multiplier: 1.25 },
    { label: "用量 +50%", multiplier: 1.5 },
    { label: "用量 x2", multiplier: 2 },
    { label: "輸出 x2", multiplier: 2, outputOnly: true },
  ];

  const rows = multipliers.map((item) => {
    const scenarioInputs = {
      ...inputs,
      requestsPerUser: item.outputOnly ? inputs.requestsPerUser : inputs.requestsPerUser * item.multiplier,
      outputTokens: item.outputOnly ? inputs.outputTokens * item.multiplier : inputs.outputTokens,
    };
    const result = calculate(scenarioInputs);
    const safeMargin = Math.max(-30, Math.min(90, result.grossMargin));
    const width = `${Math.max(4, ((safeMargin + 30) / 120) * 100)}%`;
    const color = result.grossMargin < 30 ? "var(--coral)" : result.grossMargin < inputs.targetMargin ? "var(--amber)" : "var(--teal)";

    return `
      <div class="sensitivity-row">
        <span>${item.label}</span>
        <div class="bar" aria-hidden="true"><span style="--width:${width}; --color:${color}"></span></div>
        <strong>${percent(result.grossMargin)}</strong>
      </div>
    `;
  });

  $("sensitivityList").innerHTML = rows.join("");
}

function render() {
  const inputs = collectInputs();
  const result = calculate(inputs);

  $("targetMarginValue").textContent = `${inputs.targetMargin}%`;
  $("monthlyApiCost").textContent = currency(result.bufferedApiCost);
  $("tokenVolume").textContent = `${(result.tokenTotal / 1_000_000).toFixed(1)}M tokens / month`;
  $("costPerActiveUser").textContent = currency(result.costPerActiveUser);
  $("costPerPaidUser").textContent = currency(result.costPerPaidUser);
  $("monthlyRevenue").textContent = currency(result.revenue);
  $("grossMargin").textContent = percent(result.grossMargin);
  $("netContribution").textContent = currency(result.netContribution);
  $("breakEvenUsers").textContent = Number.isFinite(result.breakEvenUsers) ? integer(result.breakEvenUsers) : "無法打平";
  $("minimumPrice").textContent = currency(result.minimumPrice);

  updateRisk(result, inputs);
  renderModelRows(inputs);
  renderSensitivity(inputs);
}

function applyPreset(name) {
  const preset = presets[name];
  if (!preset) return;
  Object.entries(preset).forEach(([key, presetValue]) => {
    $(key).value = presetValue;
  });
  render();
}

fields.forEach((field) => {
  $(field).addEventListener("input", render);
});

$("presetSelect").addEventListener("change", (event) => applyPreset(event.target.value));
$("resetButton").addEventListener("click", () => {
  $("presetSelect").value = "starter";
  applyPreset("starter");
});

render();

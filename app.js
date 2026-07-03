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

function value(id, sync = false) {
  const field = $(id);
  const rawValue = field.value.trim();
  let number = Number(field.value);
  if (!Number.isFinite(number)) number = 0;

  const min = field.min === "" ? -Infinity : Number(field.min);
  const max = field.max === "" ? Infinity : Number(field.max);
  const clamped = Math.min(max, Math.max(min, number));
  if (sync && rawValue !== "" && number !== clamped) field.value = clamped;
  return clamped;
}

function syncField(id) {
  const field = $(id);
  const nextValue = value(id);
  if (Number(field.value) !== nextValue) field.value = nextValue;
}

function currency(number) {
  if (!Number.isFinite(number)) return "無法計算";
  const abs = Math.abs(number);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
  }).format(number);
}

function integer(number) {
  if (!Number.isFinite(number)) return "無法打平";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(number);
}

function percent(number) {
  if (!Number.isFinite(number)) return "無收入";
  return `${number.toFixed(1)}%`;
}

function collectInputs() {
  return Object.fromEntries(fields.map((field) => [field, value(field, true)]));
}

function calculate(inputs, overridePrices) {
  const inputPrice = overridePrices?.input ?? inputs.inputPrice;
  const outputPrice = overridePrices?.output ?? inputs.outputPrice;
  const paymentFeeRate = inputs.paymentFee / 100;
  const targetMarginDecimal = inputs.targetMargin / 100;
  const paidUsers = inputs.mau * (inputs.conversionRate / 100);
  const baseRequests = inputs.mau * inputs.requestsPerUser;
  const effectiveRequests = baseRequests * inputs.overheadMultiplier;
  const cacheMultiplier = Math.max(0, Math.min(1, 1 - inputs.cacheSavings / 100));
  const inputTokenTotal = effectiveRequests * inputs.inputTokens * cacheMultiplier;
  const outputTokenTotal = effectiveRequests * inputs.outputTokens * cacheMultiplier;
  const rawApiCost = (inputTokenTotal / 1_000_000) * inputPrice + (outputTokenTotal / 1_000_000) * outputPrice;
  const bufferedApiCost = rawApiCost * (1 + inputs.safetyBuffer / 100);
  const revenue = paidUsers * inputs.subscriptionPrice;
  const paymentCost = revenue * paymentFeeRate;
  const variableCost = bufferedApiCost + paymentCost;
  const totalCost = variableCost + inputs.infraCost + inputs.teamCost;
  const grossProfit = revenue - variableCost;
  const netContribution = revenue - totalCost;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : Infinity;
  const costPerActiveUser = inputs.mau > 0 ? bufferedApiCost / inputs.mau : 0;
  const apiCostPerPaidUser = paidUsers > 0 ? bufferedApiCost / paidUsers : Infinity;
  const paymentCostPerPaidUser = inputs.subscriptionPrice * paymentFeeRate;
  const costPerPaidUser = paidUsers > 0 ? apiCostPerPaidUser + paymentCostPerPaidUser : Infinity;
  const netRevenuePerPaidUser = inputs.subscriptionPrice * (1 - paymentFeeRate);
  const breakEvenCost = bufferedApiCost + inputs.infraCost + inputs.teamCost;
  const breakEvenUsers = netRevenuePerPaidUser > 0 ? Math.ceil(breakEvenCost / netRevenuePerPaidUser) : Infinity;
  const minimumPriceDenominator = 1 - targetMarginDecimal - paymentFeeRate;
  const minimumPrice =
    paidUsers > 0 && minimumPriceDenominator > 0 ? apiCostPerPaidUser / minimumPriceDenominator : Infinity;

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
    apiCostPerPaidUser,
    costPerPaidUser,
    breakEvenUsers,
    minimumPrice,
    minimumPriceDenominator,
    targetMarginReachable: minimumPriceDenominator > 0,
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

  if (result.revenue <= 0) {
    chip.textContent = "高風險";
    chip.style.background = "#fff0ed";
    chip.style.color = "var(--coral)";
    statusLabel.textContent = "無收入";
    statusLabel.className = "danger";
    statusNote.textContent = "有使用成本但沒有付費收入";
    title.textContent = "目前沒有付費收入";
    text.textContent = "付費轉換率為 0% 時仍可能產生 API 與固定成本；請先估算合理轉換率或限制免費用量。";
    box.style.borderLeftColor = "var(--coral)";
    box.style.background = "#fff7f5";
    return;
  }

  if (!result.targetMarginReachable) {
    chip.textContent = "高風險";
    chip.style.background = "#fff0ed";
    chip.style.color = "var(--coral)";
    statusLabel.textContent = "無法達標";
    statusLabel.className = "danger";
    statusNote.textContent = "付款費率加目標毛利過高";
    title.textContent = "目前設定無法達成目標毛利";
    text.textContent = "目標毛利率加付款手續費已接近或超過 100%，需要降低目標、手續費，或調整商業模型。";
    box.style.borderLeftColor = "var(--coral)";
    box.style.background = "#fff7f5";
    return;
  }

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
        !Number.isFinite(result.grossMargin)
          ? "無收入"
          : result.grossMargin >= inputs.targetMargin
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
    { label: "壓力測試", multiplier: 2, stress: true },
  ];

  const rows = multipliers.map((item) => {
    const scenarioInputs = {
      ...inputs,
      conversionRate: item.stress ? inputs.conversionRate * 0.5 : inputs.conversionRate,
      requestsPerUser: item.outputOnly ? inputs.requestsPerUser : inputs.requestsPerUser * item.multiplier,
      outputTokens: item.outputOnly || item.stress ? inputs.outputTokens * item.multiplier : inputs.outputTokens,
      overheadMultiplier: item.stress ? inputs.overheadMultiplier * 1.5 : inputs.overheadMultiplier,
      cacheSavings: item.stress ? 0 : inputs.cacheSavings,
    };
    const result = calculate(scenarioInputs);
    const safeMargin = Math.max(-30, Math.min(90, Number.isFinite(result.grossMargin) ? result.grossMargin : -30));
    const width = `${Math.max(4, ((safeMargin + 30) / 120) * 100)}%`;
    const color = !Number.isFinite(result.grossMargin) || result.grossMargin < 30 ? "var(--coral)" : result.grossMargin < inputs.targetMargin ? "var(--amber)" : "var(--teal)";

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
  $("breakEvenUsers").textContent = integer(result.breakEvenUsers);
  $("minimumPrice").textContent = result.targetMarginReachable ? currency(result.minimumPrice) : "無法達成";

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
  $(field).addEventListener("change", () => {
    syncField(field);
    render();
  });
});

$("presetSelect").addEventListener("change", (event) => applyPreset(event.target.value));
$("resetButton").addEventListener("click", () => {
  $("presetSelect").value = "starter";
  applyPreset("starter");
});

render();

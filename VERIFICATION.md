# Verification

This document records the core formulas and baseline test case for independent review.

## Privacy

The app is a static browser calculator. It loads only local `styles.css`, `favicon.svg`, and `app.js`. It does not call `fetch`, XHR, `sendBeacon`, analytics scripts, or third-party JavaScript.

## Core Formulas

```text
paidUsers = mau * conversionRate / 100

baseRequests = mau * requestsPerUser
effectiveRequests = baseRequests * overheadMultiplier

costSavingsMultiplier = 1 - cacheSavings / 100

inputTokenTotal = effectiveRequests * inputTokens * costSavingsMultiplier
outputTokenTotal = effectiveRequests * outputTokens * costSavingsMultiplier

rawApiCost =
  inputTokenTotal / 1,000,000 * inputPrice
  + outputTokenTotal / 1,000,000 * outputPrice

bufferedApiCost = rawApiCost * (1 + safetyBuffer / 100)

revenue = paidUsers * subscriptionPrice
paymentCost = revenue * paymentFee / 100
variableCost = bufferedApiCost + paymentCost
totalCost = variableCost + infraCost + teamCost

grossMargin = (revenue - variableCost) / revenue * 100
netContribution = revenue - totalCost

costPerActiveUser = bufferedApiCost / mau
apiCostPerPaidUser = bufferedApiCost / paidUsers
paymentCostPerPaidUser = subscriptionPrice * paymentFee / 100
costPerPaidUser = apiCostPerPaidUser + paymentCostPerPaidUser

netRevenuePerPaidUser = subscriptionPrice * (1 - paymentFee / 100)
breakEvenUsers =
  ceil((bufferedApiCost + infraCost + teamCost) / netRevenuePerPaidUser)

minimumPrice =
  apiCostPerPaidUser / (1 - targetMargin / 100 - paymentFee / 100)
```

If revenue is zero, gross margin is shown as unavailable. If `targetMargin + paymentFee >= 100%`, the target margin cannot be reached and the minimum price is shown as unavailable.

## Baseline Case

Preset: `starter`

```text
mau = 1,200
conversionRate = 6%
requestsPerUser = 80
subscriptionPrice = $19
inputTokens = 900
outputTokens = 550
inputPrice = $0.15 / 1M tokens
outputPrice = $0.60 / 1M tokens
overheadMultiplier = 1.25
cacheSavings = 12%
safetyBuffer = 30%
paymentFee = 3.5%
infraCost = $180
teamCost = $900
targetMargin = 70%
```

Expected results:

```text
paidUsers = 72
tokenTotal = 153.12M
bufferedApiCost = $63.84
costPerActiveUser = $0.05
costPerPaidUser = $1.55
revenue = $1,368.00
grossMargin = 91.8%
netContribution = $176.28
breakEvenUsers = 63
minimumPrice = $3.35
```

## Known Assumptions

- The cost savings field is an overall token-cost savings estimate. It is not a provider-specific input-cache metric.
- Model comparison rows are sample pricing tiers, not official live model prices.
- Break-even users assume current total usage and API cost remain fixed while paid user count changes.
- The calculator is for directional planning. Real pricing should also model taxes, refunds, CAC, LTV, churn, support cost, plan limits, abuse controls, and current official model pricing.

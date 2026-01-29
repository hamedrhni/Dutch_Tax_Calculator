# dutch-tax-income-calculator

[![npm version](https://badge.fury.io/js/dutch-tax-income-calculator.svg)](https://badge.fury.io/js/dutch-tax-income-calculator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive NPM package for calculating Dutch income tax and VAT. Supports both employees and freelancers (ZZP'ers) with accurate calculations based on current Dutch tax laws.

## Features

- **Employee Tax Calculation**: Calculate net income from gross salary with support for holiday allowance, 30% ruling, and social security
- **Freelancer Tax Calculation**: Full support for self-employed individuals including:
  - Zelfstandigenaftrek (self-employed deduction)
  - Startersaftrek (starter's deduction)
  - MKB-winstvrijstelling (SME profit exemption)
  - ZVW bijdrage (health insurance contribution)
- **VAT Calculator**: Calculate BTW (Dutch VAT) with standard (21%), reduced (9%), and zero rates
- **Combined Income**: Calculate taxes for people with both employee and freelancer income
- **International Tax**: Tax treaty information for EU and non-EU countries
- **Report Generation**: Export calculations to JSON or CSV format
- **TypeScript Support**: Full TypeScript definitions included

## Installation

```bash
npm install dutch-tax-income-calculator
```

## Usage

### Employee Calculation

```javascript
import { SalaryPaycheck } from 'dutch-tax-income-calculator';

const paycheck = new SalaryPaycheck(
  {
    income: 60000,
    allowance: true,        // Include holiday allowance
    socialSecurity: true,
    older: false,           // 66 years or older
    hours: 40,
  },
  'Year',                   // Period: 'Year', 'Month', 'Week', 'Day', 'Hour'
  2026,                     // Tax year
  {
    checked: false,         // 30% ruling
    choice: 'normal',       // 'normal', 'young', 'research'
  }
);

console.log(paycheck.netMonth);  // Monthly net income
console.log(paycheck.netYear);   // Annual net income
```

### Freelancer Calculation

```javascript
import { FreelancerPaycheck } from 'dutch-tax-income-calculator';

const freelancer = new FreelancerPaycheck(
  {
    grossRevenue: 80000,      // Annual revenue excl. VAT
    businessExpenses: 15000,  // Deductible business expenses
    hoursWorked: 1500,        // Hours worked (min 1,225 for deductions)
    isStarter: false,         // First 3 years of business
    older: false,             // 66 years or older
    hasPartner: false,        // Fiscal partner
  },
  2026  // Tax year
);

console.log(freelancer.grossProfit);           // 65000
console.log(freelancer.zelfstandigenaftrek);   // 2470 (for 2026)
console.log(freelancer.mkbWinstvrijstelling);  // SME exemption
console.log(freelancer.netYear);               // Annual net income
console.log(freelancer.effectiveTaxRate);      // Tax rate as percentage
```

### International Freelancer

```javascript
import { FreelancerPaycheck } from 'dutch-tax-income-calculator';

const expat = new FreelancerPaycheck(
  {
    grossRevenue: 80000,
    businessExpenses: 15000,
    hoursWorked: 1500,
  },
  2026,
  {
    residenceCountry: 'Germany',
    isDutchResident: false,
  }
);

console.log(expat.treatyInfo);        // Tax treaty details
console.log(expat.withholdingRate);   // Withholding tax rate
console.log(expat.hasTreaty);         // true/false
```

### VAT Calculator

```javascript
import { VATCalculator } from 'dutch-tax-income-calculator';

const vat = new VATCalculator({
  revenueStandard: 50000,   // Revenue at 21%
  revenueReduced: 10000,    // Revenue at 9%
  revenueZero: 5000,        // Revenue at 0%
  expensesVAT: 3000,        // VAT paid on expenses (deductible)
  reverseChargeVAT: 500,    // Reverse charge VAT (EU services)
});

console.log(vat.totalVATCollected);  // VAT collected from customers
console.log(vat.vatOwed);            // Net VAT owed to tax authority

// Helper methods
const grossAmount = VATCalculator.addVAT(1000, 'standard');  // 1210
const vatAmount = VATCalculator.extractVAT(1210, 'standard'); // 210
const isKOR = VATCalculator.isKORApplicable(1500);  // true (under €1,800)
```

### Combined Income (Employee + Freelancer)

```javascript
import { CombinedPaycheck } from 'dutch-tax-income-calculator';

const combined = new CombinedPaycheck(
  {
    income: 40000,
    allowance: false,
    socialSecurity: true,
    older: false,
    hours: 32,
  },
  {
    grossRevenue: 30000,
    businessExpenses: 5000,
    hoursWorked: 800,
  },
  2026
);

console.log(combined.totalGrossIncome);     // Combined gross
console.log(combined.combinedNetIncomeTax); // Total tax after credits
console.log(combined.totalNetYear);         // Total net income
```

### Currency Conversion

```javascript
import { CurrencyConverter } from 'dutch-tax-income-calculator';

const converter = new CurrencyConverter();

const eurAmount = converter.toEUR(1000, 'USD');   // Convert to EUR
const usdAmount = converter.fromEUR(1000, 'USD'); // Convert from EUR

// Update exchange rate
converter.updateRate('USD', 0.95);
```

### Report Generation

```javascript
import { FreelancerPaycheck, ReportGenerator } from 'dutch-tax-income-calculator';

const paycheck = new FreelancerPaycheck({ /* ... */ }, 2026);
const report = ReportGenerator.generateReport(paycheck, 'freelancer');

// Export as JSON
console.log(JSON.stringify(report, null, 2));

// Export as CSV
const csv = ReportGenerator.toCSV(report);
```

## API Reference

### SalaryPaycheck

| Property | Description |
|----------|-------------|
| `grossYear` | Annual gross income |
| `grossMonth` | Monthly gross income |
| `taxableYear` | Taxable income after deductions |
| `payrollTax` | Payroll tax (loonbelasting) |
| `socialTax` | Social security contributions |
| `generalCredit` | General tax credit (algemene heffingskorting) |
| `labourCredit` | Labour tax credit (arbeidskorting) |
| `incomeTax` | Total income tax |
| `netYear` | Annual net income |
| `netMonth` | Monthly net income |

### FreelancerPaycheck

| Property | Description |
|----------|-------------|
| `grossProfit` | Revenue minus expenses |
| `meetsUrencriterium` | Whether 1,225 hours criterion is met |
| `zelfstandigenaftrek` | Self-employed deduction |
| `startersaftrek` | Starter's deduction (first 3 years) |
| `mkbWinstvrijstelling` | SME profit exemption (12.75% for 2026) |
| `taxableProfit` | Profit after all deductions |
| `zvwContribution` | Health insurance contribution |
| `netYear` | Annual net income |
| `effectiveTaxRate` | Total tax as percentage of profit |

### Static Methods

```javascript
// Get deduction rates for a year
FreelancerPaycheck.getDeductionRates(2026);

// Get tax treaty information
FreelancerPaycheck.getTreatyInfo('Germany');

// Get all countries with treaties
FreelancerPaycheck.getTreatyCountries();
```

## Tax Data (2026)

| Item | Value |
|------|-------|
| Zelfstandigenaftrek | €2,470 |
| Startersaftrek | €2,123 |
| MKB-winstvrijstelling | 12.75% |
| ZVW Rate | 5.5% (max €78,427) |
| Box 1 Rate (up to €38,441) | 36.97% |
| Box 1 Rate (above €38,441) | 49.5% |
| Urencriterium | 1,225 hours |

## Supported Years

- 2015-2026 for employee calculations
- 2020-2026 for freelancer calculations

## Official Sources

- [Belastingdienst](https://www.belastingdienst.nl/) - Dutch Tax Authority
- [KVK](https://www.kvk.nl/) - Chamber of Commerce

## Disclaimer

This calculator is for estimation purposes only. Please consult a qualified tax professional for accurate tax advice.

## License

ISC

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

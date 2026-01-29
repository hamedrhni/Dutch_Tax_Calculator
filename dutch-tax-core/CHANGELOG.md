# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-29

### Added

#### Freelancer Tax Calculations
- New `FreelancerPaycheck` class for self-employed (ZZP) tax calculations
- Support for zelfstandigenaftrek (self-employed deduction) - €2,470 for 2026
- Support for startersaftrek (starter's deduction) - €2,123 for 2026
- MKB-winstvrijstelling (SME profit exemption) - 12.75% for 2026
- Urencriterium validation (1,225 hours requirement)
- ZVW contribution calculation (5.5% up to €78,427 for 2026)
- Effective tax rate calculation
- Support for older freelancers (66+ years)
- Fiscal partner consideration

#### International Tax Support
- Tax treaty information for 26 EU countries
- Tax treaty information for 20+ non-EU countries
- Withholding tax rate calculations for non-residents
- `getTreatyInfo()` static method for country lookup
- `getTreatyCountries()` static method to list all supported countries

#### VAT Calculator
- New `VATCalculator` class for BTW calculations
- Support for standard (21%), reduced (9%), and zero (0%) VAT rates
- VAT owed calculation with expense deductions
- Reverse charge VAT handling for EU services
- KOR (Kleineondernemersregeling) applicability check
- Static helpers: `addVAT()`, `extractVAT()`, `isKORApplicable()`

#### Combined Income
- New `CombinedPaycheck` class for mixed employee/freelancer income
- Proper tax credit allocation between income types
- Combined net income calculation

#### Currency Conversion
- New `CurrencyConverter` class with EUR base
- Support for USD, GBP, CHF, PLN, SEK, NOK, DKK, CZK, HUF
- Configurable exchange rates

#### Report Generation
- New `ReportGenerator` class for export functionality
- JSON report generation with full calculation details
- CSV export format
- Automatic disclaimer and official source inclusion

#### Tax Data
- Added 2026 tax year data for all calculations
- Added freelancer deduction rates for 2020-2026
- Added ZVW contribution rates and caps for 2020-2026
- Added Box 1 tax brackets for 2024-2026

### Changed
- Renamed package to `dutch-tax-income-calculator`
- Updated README with comprehensive API documentation
- Added TypeScript type definitions for all new classes

### Technical
- ES Module format maintained
- Node.js 18+ required
- Full TypeScript support with `.d.ts` files
- Comprehensive test coverage

## [1.x.x] - Previous Versions

See the original repository history for changes prior to the freelancer feature addition.

---

## Migration Guide

### From 1.x to 2.0

The 2.0 release is backwards compatible for existing `SalaryPaycheck` usage. New features are additive:

```javascript
// Existing code continues to work
import { SalaryPaycheck } from 'dutch-tax-income-calculator';

// New freelancer features
import {
  FreelancerPaycheck,
  VATCalculator,
  CombinedPaycheck
} from 'dutch-tax-income-calculator';
```

No breaking changes to the existing API.

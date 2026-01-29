# Changelog

All notable changes to the Dutch Tax Income Calculator web application will be documented in this file.

## [2.0.0] - 2026-01-29

### Added

#### Freelancer Mode
- New calculator mode toggle: Employee / Freelancer / Combined
- Freelancer input fields:
  - Gross revenue (annual, excluding VAT)
  - Business expenses (deductible)
  - Hours worked per year
  - Starter status checkbox (first 3 years)
  - Fiscal partner checkbox

#### Freelancer Tax Display
- Urencriterium status indicator (met/not met)
- Deduction breakdown:
  - Zelfstandigenaftrek
  - Startersaftrek (when applicable)
  - MKB-winstvrijstelling
- ZVW contribution display
- Effective tax rate calculation
- Net annual and monthly income

#### VAT Calculator
- Optional BTW calculator section
- Revenue inputs by VAT rate (21%, 9%, 0%)
- Expense VAT deduction
- Reverse charge VAT for EU services
- KOR eligibility indicator
- VAT owed calculation

#### International Tax Support
- Dutch resident toggle
- Country of residence selector
- Tax treaty information display
- Withholding tax rate indication
- Treaty notes and recommendations

#### Combined Income Mode
- Calculate taxes for people with both employment and freelance income
- Proper tax credit allocation
- Combined net income display

#### Export Features
- Export to JSON button
- Export to CSV button
- Full calculation report with disclaimer

#### Multi-Language Support
- Language toggle button (EN/NL)
- Bilingual tooltips for Dutch tax terms:
  - Zelfstandigenaftrek
  - Startersaftrek
  - MKB-winstvrijstelling
  - Urencriterium
  - ZVW
  - BTW/VAT rates

#### UX Improvements
- Contextual tooltips with info icons
- Success/warning status boxes
- Deduction information panels
- Mobile-responsive freelancer sections
- Dark mode support for new components

#### Compliance
- Updated disclaimer text
- Links to official Belastingdienst and KVK sources
- Clear indication that calculations are estimates

### Changed
- Updated core calculation library to v2.0.0
- Added Angular Material modules: Tooltip, Tabs, Expansion
- Reorganized form structure for mode switching
- Enhanced mobile styles for new sections

### Technical
- Angular 20 compatibility maintained
- New reactive form groups for freelancer inputs
- Conditional rendering based on calculator mode
- Service worker caching for offline support

## [1.x.x] - Previous Versions

See the original repository history for changes prior to the freelancer feature addition.

---

## Usage

### Switching Modes

1. **Employee Mode**: Original salary calculator functionality
2. **Freelancer Mode**: Full ZZP/self-employed tax calculation
3. **Combined Mode**: For those with both employment and freelance income

### VAT Calculator

Enable the VAT calculator checkbox to:
- Calculate BTW owed to Belastingdienst
- Track revenue by VAT rate
- Deduct VAT on business expenses
- Check KOR eligibility

### Export

Click the export buttons to download:
- **JSON**: Full calculation data for integration
- **CSV**: Spreadsheet-compatible format

### Language

Toggle between English and Dutch using the language button in the toolbar.

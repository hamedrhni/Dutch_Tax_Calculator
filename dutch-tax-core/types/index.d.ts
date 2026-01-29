export interface SalaryInput {
  income: number;
  allowance: boolean;
  socialSecurity: boolean;
  older: boolean;
  hours: number;
}

export interface RulingInput {
  checked: boolean;
  choice?: 'normal' | 'young' | 'research';
  type?: 'researchWorker' | 'youngProfessional' | 'other';
}

export interface FreelancerInput {
  grossRevenue: number;
  businessExpenses: number;
  hoursWorked: number;
  isStarter?: boolean;
  older?: boolean;
  hasPartner?: boolean;
  employeeIncome?: number;
}

export interface InternationalOptions {
  residenceCountry?: string;
  isDutchResident?: boolean;
}

export interface VATInput {
  revenueStandard?: number;
  revenueReduced?: number;
  revenueZero?: number;
  expensesVAT?: number;
  reverseChargeVAT?: number;
}

export interface TreatyInfo {
  code: string;
  withholdingRate: number;
  hasTreaty: boolean;
  notes: string;
  region?: 'EU' | 'Non-EU';
}

export interface TreatyCountries {
  eu: string[];
  nonEu: string[];
}

export interface DeductionRates {
  zelfstandigenaftrek: number;
  startersaftrek: number;
  mkbWinstvrijstelling: number;
  urencriterium: number;
  zvwContribution: { rate: number; maxIncome: number } | null;
}

export interface Report {
  generatedAt: string;
  calculationType: 'employee' | 'freelancer' | 'combined';
  disclaimer: string;
  officialSource: string;
  data: Record<string, any>;
}

export class SalaryPaycheck {
  static getHolidayAllowance(amountYear: number): number;
  static getTaxFree(taxFreeYear: number, grossYear: number): number;
  static getAmountMonth(amountYear: number): number;
  static getAmountWeek(amountYear: number): number;
  static getAmountDay(amountYear: number): number;
  static getAmountHour(amountYear: number, hours: number): number;
  static getRulingIncome(year: string | number, ruling: string): number;
  static getPayrollTax(year: string | number, salary: number): number;
  static getSocialTax(year: string | number, salary: number, older?: boolean): number;
  static getGeneralCredit(
    year: string | number,
    salary: number,
    older: boolean,
    multiplier?: number
  ): number;
  static getLabourCredit(
    year: string | number,
    salary: number,
    multiplier?: number
  ): number;
  static getSocialCredit(
    year: string | number,
    older: boolean,
    socialSecurity: boolean
  ): number;
  static getRates(
    brackets: Array<Record<string, number>>,
    salary: number,
    kind: string,
    multiplier?: number
  ): number;

  constructor(
    salaryInput: SalaryInput,
    startFrom: 'Year' | 'Month' | 'Week' | 'Day' | 'Hour',
    year: number,
    ruling: RulingInput
  );

  grossYear: number;
  grossMonth: number;
  grossWeek: number;
  grossDay: number;
  grossHour: number;
  grossAllowance: number;
  taxFreeYear: number;
  taxableYear: number;
  taxFree: number;
  payrollTax: number;
  payrollTaxMonth: number;
  socialTax: number;
  socialTaxMonth: number;
  taxWithoutCredit: number;
  taxWithoutCreditMonth: number;
  labourCredit: number;
  labourCreditMonth: number;
  generalCredit: number;
  generalCreditMonth: number;
  taxCredit: number;
  taxCreditMonth: number;
  incomeTax: number;
  incomeTaxMonth: number;
  netYear: number;
  netAllowance: number;
  netMonth: number;
  netWeek: number;
  netDay: number;
  netHour: number;
}

export class FreelancerPaycheck {
  static getBox1Tax(year: number, income: number): number;
  static getTreatyInfo(country: string): TreatyInfo | null;
  static getTreatyCountries(): TreatyCountries;
  static getDeductionRates(year: number): DeductionRates;

  constructor(
    freelancerInput: FreelancerInput,
    year: number,
    internationalOptions?: InternationalOptions
  );

  // Input values
  year: number;
  grossRevenue: number;
  businessExpenses: number;
  hoursWorked: number;
  isStarter: boolean;
  older: boolean;
  hasPartner: boolean;
  employeeIncome: number;
  residenceCountry: string;
  isDutchResident: boolean;

  // Calculated values
  grossProfit: number;
  meetsUrencriterium: boolean;
  zelfstandigenaftrek: number;
  startersaftrek: number;
  totalEntrepreneurDeductions: number;
  profitAfterDeductions: number;
  mkbWinstvrijstelling: number;
  taxableProfit: number;
  totalTaxableIncome: number;
  incomeTax: number;
  labourCredit: number;
  generalCredit: number;
  totalTaxCredits: number;
  netIncomeTax: number;
  zvwContribution: number;
  zvwRate?: number;
  zvwMaxIncome?: number;
  netYear: number;
  netMonth: number;
  netWeek: number;
  effectiveTaxRate: number;

  // International (only if non-resident)
  treatyInfo?: TreatyInfo;
  withholdingRate?: number;
  withholdingAmount?: number;
  hasTreaty?: boolean;
  treatyNotes?: string;
}

export class VATCalculator {
  static extractVAT(grossAmount: number, rateType?: 'standard' | 'reduced' | 'zero'): number;
  static addVAT(netAmount: number, rateType?: 'standard' | 'reduced' | 'zero'): number;
  static isKORApplicable(annualVATOwed: number): boolean;

  constructor(vatInput: VATInput);

  revenueStandard: number;
  revenueReduced: number;
  revenueZero: number;
  expensesVAT: number;
  reverseChargeVAT: number;
  standardRate: number;
  reducedRate: number;
  zeroRate: number;
  vatStandard: number;
  vatReduced: number;
  vatZero: number;
  totalVATCollected: number;
  vatOwed: number;
  totalRevenueIncludingVAT: number;
  totalRevenueExcludingVAT: number;
}

export class CombinedPaycheck {
  constructor(
    salaryInput: SalaryInput,
    freelancerInput: FreelancerInput,
    year: number,
    ruling?: RulingInput
  );

  employeePaycheck: SalaryPaycheck;
  freelancerPaycheck: FreelancerPaycheck;
  totalGrossIncome: number;
  totalTaxableIncome: number;
  combinedIncomeTax: number;
  combinedLabourCredit: number;
  combinedGeneralCredit: number;
  combinedTaxCredits: number;
  combinedNetIncomeTax: number;
  combinedZVW: number;
  totalNetYear: number;
  totalNetMonth: number;
}

export class CurrencyConverter {
  constructor(rates?: Record<string, number>);

  rates: Record<string, number>;
  toEUR(amount: number, fromCurrency: string): number;
  fromEUR(amount: number, toCurrency: string): number;
  updateRate(currency: string, rate: number): void;
  getAvailableCurrencies(): string[];
}

export class ReportGenerator {
  static generateReport(
    paycheck: SalaryPaycheck | FreelancerPaycheck | CombinedPaycheck,
    type?: 'employee' | 'freelancer' | 'combined'
  ): Report;
  static employeeReport(paycheck: SalaryPaycheck): Record<string, any>;
  static freelancerReport(paycheck: FreelancerPaycheck): Record<string, any>;
  static combinedReport(paycheck: CombinedPaycheck): Record<string, any>;
  static toCSV(report: Report): string;
}

export interface RulingThreshold {
  normal: number;
  young: number;
  research: number;
}

export interface ZVWContribution {
  rate: number;
  maxIncome: number;
}

export interface FreelancerData {
  urencriterium: number;
  zelfstandigenaftrek: Record<string, number>;
  startersaftrek: Record<string, number>;
  mkbWinstvrijstelling: Record<string, number>;
  zvwContribution: Record<string, ZVWContribution>;
  inkomensafhankelijkeCombinatiekorting?: Record<string, { maxCredit: number; minIncome: number; rate: number }>;
}

export interface VATRates {
  standard: number;
  reduced: number;
  zero: number;
}

export interface TaxTreaties {
  eu: Record<string, TreatyInfo>;
  nonEu: Record<string, TreatyInfo>;
}

export interface Constants {
  currentYear: number;
  years: number[];
  defaultWorkingHours: number;
  workingWeeks: number;
  workingDays: number;
  rulingThreshold: Record<string, RulingThreshold>;
  rulingMaxSalary: Record<string, number>;
  lowWageThreshold: Record<string, number>;
  payrollTax: Record<string, Array<Record<string, number>>>;
  socialPercent: Record<string, Array<Record<string, number>>>;
  generalCredit: Record<string, Array<Record<string, number>>>;
  labourCredit: Record<string, Array<Record<string, number>>>;
  elderCredit: Record<string, Array<Record<string, number>>>;
  freelancer: FreelancerData;
  vatRates: VATRates;
  taxTreaties: TaxTreaties;
  box1Rates?: Record<string, Array<Record<string, number>>>;
}

export const constants: Constants;

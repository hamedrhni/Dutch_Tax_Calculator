import constants from './data.json' with { type: 'json' };

class SalaryPaycheck {
  /**
   * For calculation instructions:
   * https://www.belastingdienst.nl/wps/wcm/connect/nl/zoeken/zoeken?q=Rekenvoorschriften+voor+de+geautomatiseerde+loonadministratie
   *
   * @param {object} salaryInput Salary input information
   * @param {'Year'|'Month'|'Week'|'Day'|'Hour'} startFrom Salary input information
   * @param {number} year Year to perform calculation
   * @param {object} ruling Salary input information
   * @returns {object} Object with all calculated fields for the salary paycheck
   */
  constructor(salaryInput, startFrom, year, ruling) {
    const { income, allowance, socialSecurity, older, hours } = salaryInput;
    this.grossYear =
      this.grossMonth =
      this.grossWeek =
      this.grossDay =
      this.grossHour =
        0;
    this['gross' + startFrom] = income;
    let grossYear =
      this.grossYear +
      this.grossMonth * 12 +
      this.grossWeek * constants.workingWeeks;
    grossYear +=
      this.grossDay * constants.workingDays +
      this.grossHour * constants.workingWeeks * hours;
    if (!grossYear || grossYear < 0) {
      grossYear = 0;
    }

    this.grossAllowance = allowance
      ? SalaryPaycheck.getHolidayAllowance(grossYear)
      : 0;
    this.grossYear = roundNumber(grossYear, 2);
    this.grossMonth = SalaryPaycheck.getAmountMonth(grossYear);
    this.grossWeek = SalaryPaycheck.getAmountWeek(grossYear);
    this.grossDay = SalaryPaycheck.getAmountDay(grossYear);
    this.grossHour = SalaryPaycheck.getAmountHour(grossYear, hours);

    this.taxFreeYear = 0;
    this.taxableYear = grossYear - this.grossAllowance;

    if (ruling.checked) {
      let rulingIncome = SalaryPaycheck.getRulingIncome(year, ruling.choice);
      let rulingMaxSalary = constants.rulingMaxSalary[year];
      // 30% ruling only up to the salary cap
      let salaryEligibleForRuling = Math.min(this.taxableYear, rulingMaxSalary);
      let salaryAboveCap = Math.max(0, this.taxableYear - rulingMaxSalary);
      // Calculate the 30% on eligible salary only
      let effectiveSalary = salaryEligibleForRuling * 0.7 + salaryAboveCap;
      effectiveSalary = Math.max(effectiveSalary, rulingIncome);
      let reimbursement = this.taxableYear - effectiveSalary;
      if (reimbursement > 0) {
        this.taxFreeYear = reimbursement;
        this.taxableYear = this.taxableYear - reimbursement;
      }
    }

    this.taxFreeYear = roundNumber(this.taxFreeYear, 2);
    this.taxFree = SalaryPaycheck.getTaxFree(this.taxFreeYear, grossYear);
    this.taxableYear = roundNumber(this.taxableYear, 2);
    this.payrollTax = -1 * SalaryPaycheck.getPayrollTax(year, this.taxableYear);
    this.payrollTaxMonth = SalaryPaycheck.getAmountMonth(this.payrollTax);
    this.socialTax = socialSecurity
      ? -1 * SalaryPaycheck.getSocialTax(year, this.taxableYear, older)
      : 0;
    this.socialTaxMonth = SalaryPaycheck.getAmountMonth(this.socialTax);
    this.taxWithoutCredit = roundNumber(this.payrollTax + this.socialTax, 2);
    this.taxWithoutCreditMonth = SalaryPaycheck.getAmountMonth(
      this.taxWithoutCredit
    );
    let socialCredit = SalaryPaycheck.getSocialCredit(
      year,
      older,
      socialSecurity
    );
    this.labourCredit = SalaryPaycheck.getLabourCredit(
      year,
      this.taxableYear,
      socialCredit
    );
    this.labourCreditMonth = SalaryPaycheck.getAmountMonth(this.labourCredit);
    this.generalCredit = SalaryPaycheck.getGeneralCredit(
      year,
      this.taxableYear,
      older,
      socialCredit
    );
    if (
      this.taxWithoutCredit + this.labourCredit + this.generalCredit > 0 ||
      (older &&
        this.taxableYear < constants.lowWageThreshold[year] / socialCredit)
    ) {
      this.generalCredit = -1 * (this.taxWithoutCredit + this.labourCredit);
    }
    this.generalCreditMonth = SalaryPaycheck.getAmountMonth(this.generalCredit);
    this.taxCredit = roundNumber(this.labourCredit + this.generalCredit, 2);
    this.taxCreditMonth = SalaryPaycheck.getAmountMonth(this.taxCredit);
    this.incomeTax = roundNumber(this.taxWithoutCredit + this.taxCredit, 2);
    this.incomeTaxMonth = SalaryPaycheck.getAmountMonth(this.incomeTax);
    this.netYear = this.taxableYear + this.incomeTax + this.taxFreeYear;
    this.netAllowance = allowance
      ? SalaryPaycheck.getHolidayAllowance(this.netYear)
      : 0;
    this.netMonth = SalaryPaycheck.getAmountMonth(this.netYear);
    this.netWeek = SalaryPaycheck.getAmountWeek(this.netYear);
    this.netDay = SalaryPaycheck.getAmountDay(this.netYear);
    this.netHour = SalaryPaycheck.getAmountHour(this.netYear, hours);
  }

  static getHolidayAllowance(amountYear) {
    return roundNumber(amountYear * (0.08 / 1.08), 2); // Vakantiegeld (8%)
  }

  static getTaxFree(taxFreeYear, grossYear) {
    return roundNumber((taxFreeYear / grossYear) * 100, 2);
  }

  static getAmountMonth(amountYear) {
    return roundNumber(amountYear / 12, 2);
  }

  static getAmountWeek(amountYear) {
    return roundNumber(amountYear / constants.workingWeeks, 2);
  }

  static getAmountDay(amountYear) {
    return roundNumber(amountYear / constants.workingDays, 2);
  }

  static getAmountHour(amountYear, hours) {
    return roundNumber(amountYear / (constants.workingWeeks * hours), 2);
  }

  /**
   * 30% Ruling (30%-regeling)
   * https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/internationaal/werken_wonen/tijdelijk_in_een_ander_land_werken/u_komt_in_nederland_werken/30_procent_regeling/voorwaarden_30_procent_regeling/u-hebt-een-specifieke-deskundigheid
   *
   * @param {string} year Year to retrieve information from
   * @param {string} ruling Choice between scientific research workers, young professionals with Master's degree or others cases
   * @returns {number} The 30% Ruling minimum income
   */
  static getRulingIncome(year, ruling) {
    return constants.rulingThreshold[year][ruling];
  }

  /**
   * Payroll Tax Rates (Loonbelasting)
   * https://www.belastingdienst.nl/bibliotheek/handboeken/html/boeken/HL/stappenplan-stap_7_loonbelasting_premie_volksverzekeringen.html
   *
   * @param {string} year Year to retrieve information from
   * @param {number} salary Taxable wage that will be used for calculation
   * @returns {number} The Payroll Tax Rates after calculating proper bracket amount
   */
  static getPayrollTax(year, salary) {
    return SalaryPaycheck.getRates(constants.payrollTax[year], salary, 'rate');
  }

  /**
   * Social Security Contribution (Volksverzekeringen - AOW, Anw, Wlz)
   * https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/werk_en_inkomen/sociale_verzekeringen/premies_volks_en_werknemersverzekeringen/volksverzekeringen/volksverzekeringen
   *
   * @param {string} year Year to retrieve information from
   * @param {number} salary Taxable wage that will be used for calculation
   * @param {string} [older] Whether is after retirement age or not
   * @returns {number} The Social Security Contribution after calculating proper bracket amount
   */
  static getSocialTax(year, salary, older) {
    return SalaryPaycheck.getRates(
      constants.socialPercent[year],
      salary,
      older ? 'older' : 'social'
    );
  }

  /**
   * General Tax Credit (Algemene Heffingskorting)
   * https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/heffingskortingen/algemene_heffingskorting/
   *
   * @param {string} year Year to retrieve information from
   * @param {number} salary Taxable wage that will be used for calculation
   * @param {boolean} older Whether is after retirement age or not
   * @param {number} [multiplier] Scalar value to multiple against final result
   * @returns {number} The General Tax Credit after calculating proper bracket amount
   */
  static getGeneralCredit(year, salary, older, multiplier = 1) {
    let generalCredit = SalaryPaycheck.getRates(
      constants.generalCredit[year],
      salary,
      'rate',
      multiplier
    );
    // Additional credit for worker that reached retirement age
    if (older) {
      generalCredit += SalaryPaycheck.getRates(
        constants.elderCredit[year],
        salary,
        'rate'
      );
    }
    return generalCredit;
  }

  /**
   * Labour Tax Credit (Arbeidskorting)
   * https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/heffingskortingen/arbeidskorting/
   *
   * @param {string} year Year to retrieve information from
   * @param {number} salary Taxable wage that will be used for calculation
   * @param {number} [multiplier] Scalar value to multiple against final result
   * @returns {number} The Labour Tax Credit after calculating proper bracket amount
   */
  static getLabourCredit(year, salary, multiplier = 1) {
    if (salary < constants.lowWageThreshold[year] / multiplier) {
      return 0;
    }
    return SalaryPaycheck.getRates(
      constants.labourCredit[year],
      salary,
      'rate',
      multiplier
    );
  }

  /**
   * Social Security Contribution (Volksverzekeringen) Component of Tax Credit
   * https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/werk_en_inkomen/sociale_verzekeringen/premies_volks_en_werknemersverzekeringen/volksverzekeringen/hoeveel_moet_u_betalen
   *
   * @param {string} year Year to retrieve information from
   * @param {boolean} older Whether is after retirement age or not
   * @param {boolean} socialSecurity Whether social security will be considered or not
   * @returns {number} Social Security contribution percentage to apply to wage credit
   */
  static getSocialCredit(year, older, socialSecurity) {
    /*
     * JSON properties for socialPercent object
     * rate: Higher full rate including social contributions to be used to get proportion
     * social: Percentage of social contributions (AOW + Anw + Wlz)
     * older: Percentage for retirement age (Anw + Wlz, no contribution to AOW)
     */
    let bracket = constants.socialPercent[year][0],
      percentage = 1;
    if (!socialSecurity) {
      percentage = (bracket.rate - bracket.social) / bracket.rate; // Removing AOW + Anw + Wlz from total
    } else if (older) {
      percentage =
        (bracket.rate + bracket.older - bracket.social) / bracket.rate; // Removing only AOW from total
    }
    return percentage;
  }

  /**
   * Get right amount based on the rate brackets passed
   * https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/themaoverstijgend/brochures_en_publicaties/nieuwsbrief-loonheffingen-2020
   *
   * @param {object[]} brackets Rate brackets to extract information from
   * @param {number} salary Taxable wage that will be used for calculation
   * @param {string} kind Property name to be extracted from bracket
   * @param {number} [multiplier] Scalar value to multiple against final result
   * @returns {number} Accumulated tax/credit amount to be used to calculate the net income
   */
  static getRates(brackets, salary, kind, multiplier = 1) {
    let amount = 0,
      tax,
      delta,
      isPercent;

    brackets.some((bracket, _index) => {
      delta = bracket.max ? bracket.max - bracket.min : Infinity; // Consider infinity when no upper bound
      tax =
        Math.round(
          multiplier *
            (kind && bracket[kind] ? bracket[kind] : bracket['rate']) *
            100000
        ) / 100000;
      isPercent = tax != 0 && tax > -1 && tax < 1; // Check if rate is percentage or fixed
      if (salary <= delta) {
        if (isPercent) {
          amount += roundNumber(salary * tax, 2); // Round down at 2 decimal places
        } else {
          amount = tax;
        }
        amount = roundNumber(amount, 2);
        return true; // Break loop when reach last bracket
      } else {
        if (isPercent) {
          amount += roundNumber(delta * tax, 2);
        } else {
          amount = tax;
        }
        salary -= delta;
      }
    });
    return amount;
  }
}

/**
 * FreelancerPaycheck - Calculator for self-employed individuals (ZZP'ers)
 * Handles Dutch freelancer tax calculations including:
 * - Zelfstandigenaftrek (self-employed deduction)
 * - Startersaftrek (starter's deduction)
 * - MKB-winstvrijstelling (SME profit exemption)
 * - ZVW bijdrage (health insurance contribution)
 * - International tax considerations
 */
class FreelancerPaycheck {
  /**
   * @param {object} freelancerInput Freelancer input information
   * @param {number} freelancerInput.grossRevenue Annual gross revenue
   * @param {number} freelancerInput.businessExpenses Annual business expenses
   * @param {number} freelancerInput.hoursWorked Annual hours worked (for urencriterium)
   * @param {boolean} freelancerInput.isStarter Whether this is a starter (first 3 years)
   * @param {boolean} freelancerInput.older Whether person is retirement age
   * @param {boolean} freelancerInput.hasPartner Whether person has a fiscal partner
   * @param {number} freelancerInput.employeeIncome Additional employee income (if any)
   * @param {number} year Year to perform calculation
   * @param {object} [internationalOptions] International tax options
   * @param {string} [internationalOptions.residenceCountry] Country of residence
   * @param {boolean} [internationalOptions.isDutchResident] Whether a Dutch tax resident
   */
  constructor(freelancerInput, year, internationalOptions = {}) {
    const {
      grossRevenue = 0,
      businessExpenses = 0,
      hoursWorked = 0,
      isStarter = false,
      older = false,
      hasPartner = false,
      employeeIncome = 0,
    } = freelancerInput;

    const { residenceCountry = 'Netherlands', isDutchResident = true } =
      internationalOptions;

    // Store input values
    this.year = year;
    this.grossRevenue = roundNumber(grossRevenue, 2);
    this.businessExpenses = roundNumber(businessExpenses, 2);
    this.hoursWorked = hoursWorked;
    this.isStarter = isStarter;
    this.older = older;
    this.hasPartner = hasPartner;
    this.employeeIncome = roundNumber(employeeIncome, 2);
    this.residenceCountry = residenceCountry;
    this.isDutchResident = isDutchResident;

    // Calculate profit
    this.grossProfit = roundNumber(
      Math.max(0, this.grossRevenue - this.businessExpenses),
      2
    );

    // Check urencriterium (1,225 hours requirement)
    this.meetsUrencriterium =
      this.hoursWorked >= constants.freelancer.urencriterium;

    // Calculate deductions
    this.calculateDeductions();

    // Calculate taxable income
    this.calculateTaxableIncome();

    // Calculate taxes
    this.calculateTaxes();

    // Calculate ZVW contribution
    this.calculateZVW();

    // Calculate net income
    this.calculateNetIncome();

    // Calculate international withholding if applicable
    if (!this.isDutchResident) {
      this.calculateInternationalWithholding();
    }
  }

  calculateDeductions() {
    const freelancerData = constants.freelancer;

    // Zelfstandigenaftrek (self-employed deduction)
    // Only available if urencriterium is met
    this.zelfstandigenaftrek = this.meetsUrencriterium
      ? freelancerData.zelfstandigenaftrek[this.year] || 0
      : 0;

    // Startersaftrek (starter's deduction)
    // Available for first 3 years if urencriterium is met
    this.startersaftrek =
      this.meetsUrencriterium && this.isStarter
        ? freelancerData.startersaftrek[this.year] || 0
        : 0;

    // Total entrepreneur deductions (ondernemersaftrek)
    this.totalEntrepreneurDeductions = roundNumber(
      this.zelfstandigenaftrek + this.startersaftrek,
      2
    );

    // Profit after entrepreneur deductions
    this.profitAfterDeductions = roundNumber(
      Math.max(0, this.grossProfit - this.totalEntrepreneurDeductions),
      2
    );

    // MKB-winstvrijstelling (SME profit exemption)
    // Applied after entrepreneur deductions
    const mkbRate = freelancerData.mkbWinstvrijstelling[this.year] || 0.14;
    this.mkbWinstvrijstelling = roundNumber(
      this.profitAfterDeductions * mkbRate,
      2
    );
  }

  calculateTaxableIncome() {
    // Taxable profit from business
    this.taxableProfit = roundNumber(
      this.profitAfterDeductions - this.mkbWinstvrijstelling,
      2
    );

    // Total taxable income (including any employee income)
    this.totalTaxableIncome = roundNumber(
      this.taxableProfit + this.employeeIncome,
      2
    );
  }

  calculateTaxes() {
    // Calculate income tax using box 1 rates
    this.incomeTax = FreelancerPaycheck.getBox1Tax(
      this.year,
      this.totalTaxableIncome
    );

    // Calculate tax credits
    this.labourCredit = SalaryPaycheck.getLabourCredit(
      this.year,
      this.totalTaxableIncome
    );
    this.generalCredit = SalaryPaycheck.getGeneralCredit(
      this.year,
      this.totalTaxableIncome,
      this.older
    );

    // Total tax credits
    this.totalTaxCredits = roundNumber(
      this.labourCredit + this.generalCredit,
      2
    );

    // Ensure credits don't exceed tax
    if (this.totalTaxCredits > this.incomeTax) {
      this.totalTaxCredits = this.incomeTax;
    }

    // Net income tax
    this.netIncomeTax = roundNumber(this.incomeTax - this.totalTaxCredits, 2);
  }

  calculateZVW() {
    const zvwData = constants.freelancer.zvwContribution[this.year];
    if (!zvwData) {
      this.zvwContribution = 0;
      return;
    }

    // ZVW is calculated on the lower of taxable income or max income
    const zvwBase = Math.min(this.totalTaxableIncome, zvwData.maxIncome);
    this.zvwContribution = roundNumber(zvwBase * zvwData.rate, 2);
    this.zvwRate = zvwData.rate;
    this.zvwMaxIncome = zvwData.maxIncome;
  }

  calculateNetIncome() {
    // Net income after all taxes and contributions
    this.netYear = roundNumber(
      this.grossProfit - this.netIncomeTax - this.zvwContribution,
      2
    );

    // Monthly, weekly calculations
    this.netMonth = roundNumber(this.netYear / 12, 2);
    this.netWeek = roundNumber(this.netYear / constants.workingWeeks, 2);

    // Effective tax rate
    this.effectiveTaxRate =
      this.grossProfit > 0
        ? roundNumber(
            ((this.netIncomeTax + this.zvwContribution) / this.grossProfit) *
              100,
            2
          )
        : 0;
  }

  calculateInternationalWithholding() {
    // Get treaty information
    const treatyInfo = FreelancerPaycheck.getTreatyInfo(this.residenceCountry);
    this.treatyInfo = treatyInfo;

    if (treatyInfo) {
      this.withholdingRate = treatyInfo.withholdingRate;
      this.withholdingAmount = roundNumber(
        this.grossProfit * this.withholdingRate,
        2
      );
      this.hasTreaty = treatyInfo.hasTreaty;
      this.treatyNotes = treatyInfo.notes;
    } else {
      // No treaty - standard withholding rate
      this.withholdingRate = 0.25;
      this.withholdingAmount = roundNumber(
        this.grossProfit * this.withholdingRate,
        2
      );
      this.hasTreaty = false;
      this.treatyNotes =
        'No tax treaty found. Standard Dutch withholding rate applies.';
    }
  }

  /**
   * Calculate Box 1 income tax
   * @param {number} year Tax year
   * @param {number} income Taxable income
   * @returns {number} Income tax amount
   */
  static getBox1Tax(year, income) {
    // Use box1Rates if available, otherwise fall back to payrollTax
    const rates = constants.box1Rates?.[year] || constants.payrollTax[year];
    return SalaryPaycheck.getRates(rates, income, 'rate');
  }

  /**
   * Get tax treaty information for a country
   * @param {string} country Country name
   * @returns {object|null} Treaty information or null if not found
   */
  static getTreatyInfo(country) {
    const euTreaties = constants.taxTreaties?.eu || {};
    const nonEuTreaties = constants.taxTreaties?.nonEu || {};

    // Check EU treaties first
    if (euTreaties[country]) {
      return { ...euTreaties[country], region: 'EU' };
    }

    // Check non-EU treaties
    if (nonEuTreaties[country]) {
      return { ...nonEuTreaties[country], region: 'Non-EU' };
    }

    return null;
  }

  /**
   * Get list of all countries with tax treaties
   * @returns {object} Object with EU and non-EU country lists
   */
  static getTreatyCountries() {
    return {
      eu: Object.keys(constants.taxTreaties?.eu || {}),
      nonEu: Object.keys(constants.taxTreaties?.nonEu || {}),
    };
  }

  /**
   * Get freelancer-specific deduction rates for a year
   * @param {number} year Tax year
   * @returns {object} Deduction rates
   */
  static getDeductionRates(year) {
    const freelancerData = constants.freelancer;
    return {
      zelfstandigenaftrek: freelancerData.zelfstandigenaftrek[year] || 0,
      startersaftrek: freelancerData.startersaftrek[year] || 0,
      mkbWinstvrijstelling: freelancerData.mkbWinstvrijstelling[year] || 0,
      urencriterium: freelancerData.urencriterium,
      zvwContribution: freelancerData.zvwContribution[year] || null,
    };
  }
}

/**
 * VAT Calculator for freelancers
 * Handles Dutch BTW (Belasting Toegevoegde Waarde) calculations
 */
class VATCalculator {
  /**
   * @param {object} vatInput VAT calculation input
   * @param {number} vatInput.revenueStandard Revenue subject to standard rate (21%)
   * @param {number} vatInput.revenueReduced Revenue subject to reduced rate (9%)
   * @param {number} vatInput.revenueZero Revenue subject to zero rate (0%)
   * @param {number} vatInput.expensesVAT VAT paid on business expenses
   * @param {number} vatInput.reverseChargeVAT VAT on reverse charge services (EU)
   */
  constructor(vatInput) {
    const {
      revenueStandard = 0,
      revenueReduced = 0,
      revenueZero = 0,
      expensesVAT = 0,
      reverseChargeVAT = 0,
    } = vatInput;

    this.revenueStandard = roundNumber(revenueStandard, 2);
    this.revenueReduced = roundNumber(revenueReduced, 2);
    this.revenueZero = roundNumber(revenueZero, 2);
    this.expensesVAT = roundNumber(expensesVAT, 2);
    this.reverseChargeVAT = roundNumber(reverseChargeVAT, 2);

    // VAT rates
    this.standardRate = constants.vatRates.standard;
    this.reducedRate = constants.vatRates.reduced;
    this.zeroRate = constants.vatRates.zero;

    // Calculate VAT collected
    this.vatStandard = roundNumber(
      this.revenueStandard * this.standardRate,
      2
    );
    this.vatReduced = roundNumber(this.revenueReduced * this.reducedRate, 2);
    this.vatZero = roundNumber(this.revenueZero * this.zeroRate, 2);

    // Total VAT collected
    this.totalVATCollected = roundNumber(
      this.vatStandard + this.vatReduced + this.vatZero,
      2
    );

    // VAT owed to tax authority (collected minus deductible)
    this.vatOwed = roundNumber(
      this.totalVATCollected - this.expensesVAT + this.reverseChargeVAT,
      2
    );

    // Total revenue including VAT
    this.totalRevenueIncludingVAT = roundNumber(
      this.revenueStandard +
        this.vatStandard +
        this.revenueReduced +
        this.vatReduced +
        this.revenueZero,
      2
    );

    // Total revenue excluding VAT
    this.totalRevenueExcludingVAT = roundNumber(
      this.revenueStandard + this.revenueReduced + this.revenueZero,
      2
    );
  }

  /**
   * Calculate VAT amount from gross amount (including VAT)
   * @param {number} grossAmount Amount including VAT
   * @param {string} rateType 'standard', 'reduced', or 'zero'
   * @returns {number} VAT amount
   */
  static extractVAT(grossAmount, rateType = 'standard') {
    const rate = constants.vatRates[rateType] || constants.vatRates.standard;
    const netAmount = grossAmount / (1 + rate);
    return roundNumber(grossAmount - netAmount, 2);
  }

  /**
   * Calculate gross amount from net amount (excluding VAT)
   * @param {number} netAmount Amount excluding VAT
   * @param {string} rateType 'standard', 'reduced', or 'zero'
   * @returns {number} Gross amount including VAT
   */
  static addVAT(netAmount, rateType = 'standard') {
    const rate = constants.vatRates[rateType] || constants.vatRates.standard;
    return roundNumber(netAmount * (1 + rate), 2);
  }

  /**
   * Check if KOR (Kleine Ondernemersregeling) applies
   * Small business scheme: no VAT filing if VAT owed < €1,800/year
   * @param {number} annualVATOwed Annual VAT owed
   * @returns {boolean} Whether KOR applies
   */
  static isKORApplicable(annualVATOwed) {
    return annualVATOwed < 1800;
  }
}

/**
 * Combined Calculator for mixed income (employee + freelancer)
 */
class CombinedPaycheck {
  /**
   * @param {object} salaryInput Employee salary input
   * @param {object} freelancerInput Freelancer input
   * @param {number} year Tax year
   * @param {object} ruling 30% ruling options
   */
  constructor(salaryInput, freelancerInput, year, ruling = { checked: false }) {
    // Calculate employee paycheck
    this.employeePaycheck = new SalaryPaycheck(
      salaryInput,
      'Year',
      year,
      ruling
    );

    // Calculate freelancer paycheck with employee income
    const combinedFreelancerInput = {
      ...freelancerInput,
      employeeIncome: this.employeePaycheck.taxableYear,
    };

    this.freelancerPaycheck = new FreelancerPaycheck(
      combinedFreelancerInput,
      year
    );

    // Combined totals
    this.totalGrossIncome = roundNumber(
      this.employeePaycheck.grossYear + this.freelancerPaycheck.grossProfit,
      2
    );

    this.totalTaxableIncome = roundNumber(
      this.employeePaycheck.taxableYear + this.freelancerPaycheck.taxableProfit,
      2
    );

    // Recalculate combined tax (to avoid double-counting credits)
    this.combinedIncomeTax = FreelancerPaycheck.getBox1Tax(
      year,
      this.totalTaxableIncome
    );

    // Combined credits (only calculated once on total income)
    this.combinedLabourCredit = SalaryPaycheck.getLabourCredit(
      year,
      this.totalTaxableIncome
    );
    this.combinedGeneralCredit = SalaryPaycheck.getGeneralCredit(
      year,
      this.totalTaxableIncome,
      salaryInput.older || freelancerInput.older
    );
    this.combinedTaxCredits = roundNumber(
      this.combinedLabourCredit + this.combinedGeneralCredit,
      2
    );

    // Ensure credits don't exceed tax
    if (this.combinedTaxCredits > this.combinedIncomeTax) {
      this.combinedTaxCredits = this.combinedIncomeTax;
    }

    this.combinedNetIncomeTax = roundNumber(
      this.combinedIncomeTax - this.combinedTaxCredits,
      2
    );

    // ZVW only on freelance income (employee already has it deducted)
    this.combinedZVW = this.freelancerPaycheck.zvwContribution;

    // Total net income
    this.totalNetYear = roundNumber(
      this.totalGrossIncome -
        this.combinedNetIncomeTax -
        this.combinedZVW -
        Math.abs(this.employeePaycheck.socialTax),
      2
    );

    this.totalNetMonth = roundNumber(this.totalNetYear / 12, 2);
  }
}

/**
 * Currency converter for international freelancers
 */
class CurrencyConverter {
  /**
   * @param {object} rates Exchange rates (currency code to EUR rate)
   */
  constructor(rates = {}) {
    this.rates = {
      EUR: 1.0,
      USD: 0.92,
      GBP: 1.17,
      CHF: 1.05,
      JPY: 0.0061,
      AUD: 0.61,
      CAD: 0.69,
      INR: 0.011,
      CNY: 0.13,
      BRL: 0.18,
      ...rates,
    };
  }

  /**
   * Convert amount to EUR
   * @param {number} amount Amount in source currency
   * @param {string} fromCurrency Source currency code
   * @returns {number} Amount in EUR
   */
  toEUR(amount, fromCurrency) {
    const rate = this.rates[fromCurrency] || 1;
    return roundNumber(amount * rate, 2);
  }

  /**
   * Convert amount from EUR
   * @param {number} amount Amount in EUR
   * @param {string} toCurrency Target currency code
   * @returns {number} Amount in target currency
   */
  fromEUR(amount, toCurrency) {
    const rate = this.rates[toCurrency] || 1;
    return roundNumber(amount / rate, 2);
  }

  /**
   * Update exchange rate
   * @param {string} currency Currency code
   * @param {number} rate Rate to EUR
   */
  updateRate(currency, rate) {
    this.rates[currency] = rate;
  }

  /**
   * Get all available currencies
   * @returns {string[]} Currency codes
   */
  getAvailableCurrencies() {
    return Object.keys(this.rates);
  }
}

/**
 * Report generator for exporting calculations
 */
class ReportGenerator {
  /**
   * Generate a summary report from a paycheck
   * @param {SalaryPaycheck|FreelancerPaycheck|CombinedPaycheck} paycheck Calculated paycheck
   * @param {string} type 'employee', 'freelancer', or 'combined'
   * @returns {object} Report data
   */
  static generateReport(paycheck, type = 'employee') {
    const report = {
      generatedAt: new Date().toISOString(),
      calculationType: type,
      disclaimer:
        'This calculation is for estimation purposes only. Please consult a tax professional for accurate tax advice.',
      officialSource: 'https://www.belastingdienst.nl/',
    };

    if (type === 'employee') {
      report.data = ReportGenerator.employeeReport(paycheck);
    } else if (type === 'freelancer') {
      report.data = ReportGenerator.freelancerReport(paycheck);
    } else if (type === 'combined') {
      report.data = ReportGenerator.combinedReport(paycheck);
    }

    return report;
  }

  static employeeReport(paycheck) {
    return {
      income: {
        grossYear: paycheck.grossYear,
        grossMonth: paycheck.grossMonth,
        holidayAllowance: paycheck.grossAllowance,
        taxableIncome: paycheck.taxableYear,
        taxFreeAmount: paycheck.taxFreeYear,
      },
      taxes: {
        payrollTax: Math.abs(paycheck.payrollTax),
        socialTax: Math.abs(paycheck.socialTax),
        totalTaxBeforeCredits: Math.abs(paycheck.taxWithoutCredit),
      },
      credits: {
        labourCredit: paycheck.labourCredit,
        generalCredit: paycheck.generalCredit,
        totalCredits: paycheck.taxCredit,
      },
      netIncome: {
        incomeTax: Math.abs(paycheck.incomeTax),
        netYear: paycheck.netYear,
        netMonth: paycheck.netMonth,
        netWeek: paycheck.netWeek,
      },
    };
  }

  static freelancerReport(paycheck) {
    return {
      businessIncome: {
        grossRevenue: paycheck.grossRevenue,
        businessExpenses: paycheck.businessExpenses,
        grossProfit: paycheck.grossProfit,
        hoursWorked: paycheck.hoursWorked,
        meetsUrencriterium: paycheck.meetsUrencriterium,
      },
      deductions: {
        zelfstandigenaftrek: paycheck.zelfstandigenaftrek,
        startersaftrek: paycheck.startersaftrek,
        mkbWinstvrijstelling: paycheck.mkbWinstvrijstelling,
        totalDeductions:
          paycheck.totalEntrepreneurDeductions + paycheck.mkbWinstvrijstelling,
      },
      taxes: {
        taxableProfit: paycheck.taxableProfit,
        incomeTax: paycheck.incomeTax,
        zvwContribution: paycheck.zvwContribution,
      },
      credits: {
        labourCredit: paycheck.labourCredit,
        generalCredit: paycheck.generalCredit,
        totalCredits: paycheck.totalTaxCredits,
      },
      netIncome: {
        netIncomeTax: paycheck.netIncomeTax,
        netYear: paycheck.netYear,
        netMonth: paycheck.netMonth,
        effectiveTaxRate: paycheck.effectiveTaxRate + '%',
      },
      international: paycheck.treatyInfo
        ? {
            residenceCountry: paycheck.residenceCountry,
            hasTreaty: paycheck.hasTreaty,
            withholdingRate: (paycheck.withholdingRate * 100).toFixed(1) + '%',
            withholdingAmount: paycheck.withholdingAmount,
            notes: paycheck.treatyNotes,
          }
        : null,
    };
  }

  static combinedReport(paycheck) {
    return {
      employeeIncome: ReportGenerator.employeeReport(paycheck.employeePaycheck),
      freelancerIncome: ReportGenerator.freelancerReport(
        paycheck.freelancerPaycheck
      ),
      combined: {
        totalGrossIncome: paycheck.totalGrossIncome,
        totalTaxableIncome: paycheck.totalTaxableIncome,
        combinedIncomeTax: paycheck.combinedIncomeTax,
        combinedTaxCredits: paycheck.combinedTaxCredits,
        combinedNetIncomeTax: paycheck.combinedNetIncomeTax,
        combinedZVW: paycheck.combinedZVW,
        totalNetYear: paycheck.totalNetYear,
        totalNetMonth: paycheck.totalNetMonth,
      },
    };
  }

  /**
   * Convert report to CSV format
   * @param {object} report Report data
   * @returns {string} CSV string
   */
  static toCSV(report) {
    const rows = [];
    rows.push('Dutch Tax Calculator Report');
    rows.push(`Generated: ${report.generatedAt}`);
    rows.push(`Type: ${report.calculationType}`);
    rows.push('');

    const flattenObject = (obj, prefix = '') => {
      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          flattenObject(value, fullKey);
        } else if (value !== null) {
          rows.push(`${fullKey},${value}`);
        }
      });
    };

    flattenObject(report.data);

    rows.push('');
    rows.push(`Disclaimer: ${report.disclaimer}`);
    rows.push(`Official Source: ${report.officialSource}`);

    return rows.join('\n');
  }
}

/**
 * Round a number to the specified decimal places
 *
 * @param {number} value Amount to be rounded
 * @param {number} [places] Decimal places to rounded
 */
const roundNumber = (value, places = 2) => {
  return Number(value.toFixed(places));
};

export {
  SalaryPaycheck,
  FreelancerPaycheck,
  VATCalculator,
  CombinedPaycheck,
  CurrencyConverter,
  ReportGenerator,
  constants,
};

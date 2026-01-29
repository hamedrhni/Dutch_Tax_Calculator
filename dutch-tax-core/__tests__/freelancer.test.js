import {
  FreelancerPaycheck,
  VATCalculator,
  CombinedPaycheck,
  CurrencyConverter,
  ReportGenerator,
  constants,
} from '../index.js';

describe('FreelancerPaycheck', () => {
  describe('Basic Calculations', () => {
    test('should calculate gross profit correctly', () => {
      const paycheck = new FreelancerPaycheck(
        {
          grossRevenue: 100000,
          businessExpenses: 20000,
          hoursWorked: 1500,
        },
        2026
      );

      expect(paycheck.grossProfit).toBe(80000);
    });

    test('should detect urencriterium met', () => {
      const paycheck = new FreelancerPaycheck(
        {
          grossRevenue: 100000,
          businessExpenses: 20000,
          hoursWorked: 1500,
        },
        2026
      );

      expect(paycheck.meetsUrencriterium).toBe(true);
    });

    test('should detect urencriterium not met', () => {
      const paycheck = new FreelancerPaycheck(
        {
          grossRevenue: 50000,
          businessExpenses: 10000,
          hoursWorked: 1000,
        },
        2026
      );

      expect(paycheck.meetsUrencriterium).toBe(false);
    });

    test('should apply zelfstandigenaftrek when urencriterium is met', () => {
      const paycheck = new FreelancerPaycheck(
        {
          grossRevenue: 80000,
          businessExpenses: 10000,
          hoursWorked: 1500,
        },
        2026
      );

      expect(paycheck.zelfstandigenaftrek).toBe(
        constants.freelancer.zelfstandigenaftrek[2026]
      );
    });

    test('should not apply zelfstandigenaftrek when urencriterium is not met', () => {
      const paycheck = new FreelancerPaycheck(
        {
          grossRevenue: 80000,
          businessExpenses: 10000,
          hoursWorked: 1000,
        },
        2026
      );

      expect(paycheck.zelfstandigenaftrek).toBe(0);
    });

    test('should apply startersaftrek for starters', () => {
      const paycheck = new FreelancerPaycheck(
        {
          grossRevenue: 80000,
          businessExpenses: 10000,
          hoursWorked: 1500,
          isStarter: true,
        },
        2026
      );

      expect(paycheck.startersaftrek).toBe(
        constants.freelancer.startersaftrek[2026]
      );
    });

    test('should not apply startersaftrek for non-starters', () => {
      const paycheck = new FreelancerPaycheck(
        {
          grossRevenue: 80000,
          businessExpenses: 10000,
          hoursWorked: 1500,
          isStarter: false,
        },
        2026
      );

      expect(paycheck.startersaftrek).toBe(0);
    });

    test('should calculate MKB-winstvrijstelling correctly', () => {
      const paycheck = new FreelancerPaycheck(
        {
          grossRevenue: 100000,
          businessExpenses: 20000,
          hoursWorked: 1500,
        },
        2026
      );

      // Profit: 80000
      // Zelfstandigenaftrek: 2470
      // Profit after deductions: 77530
      // MKB: 77530 * 0.1275 = 9885.08
      const expectedMkb =
        paycheck.profitAfterDeductions *
        constants.freelancer.mkbWinstvrijstelling[2026];
      expect(paycheck.mkbWinstvrijstelling).toBeCloseTo(expectedMkb, 2);
    });

    test('should calculate ZVW contribution correctly', () => {
      const paycheck = new FreelancerPaycheck(
        {
          grossRevenue: 60000,
          businessExpenses: 10000,
          hoursWorked: 1500,
        },
        2026
      );

      expect(paycheck.zvwContribution).toBeGreaterThan(0);
      expect(paycheck.zvwRate).toBe(
        constants.freelancer.zvwContribution[2026].rate
      );
    });

    test('should calculate net income correctly', () => {
      const paycheck = new FreelancerPaycheck(
        {
          grossRevenue: 80000,
          businessExpenses: 15000,
          hoursWorked: 1500,
        },
        2026
      );

      // Net income should be less than gross profit
      expect(paycheck.netYear).toBeLessThan(paycheck.grossProfit);
      expect(paycheck.netYear).toBeGreaterThan(0);
    });

    test('should calculate effective tax rate', () => {
      const paycheck = new FreelancerPaycheck(
        {
          grossRevenue: 80000,
          businessExpenses: 15000,
          hoursWorked: 1500,
        },
        2026
      );

      expect(paycheck.effectiveTaxRate).toBeGreaterThan(0);
      expect(paycheck.effectiveTaxRate).toBeLessThan(100);
    });
  });

  describe('International Tax', () => {
    test('should get treaty info for EU country', () => {
      const treatyInfo = FreelancerPaycheck.getTreatyInfo('Germany');
      expect(treatyInfo).not.toBeNull();
      expect(treatyInfo.region).toBe('EU');
      expect(treatyInfo.hasTreaty).toBe(true);
    });

    test('should get treaty info for non-EU country', () => {
      const treatyInfo = FreelancerPaycheck.getTreatyInfo('United States');
      expect(treatyInfo).not.toBeNull();
      expect(treatyInfo.region).toBe('Non-EU');
      expect(treatyInfo.hasTreaty).toBe(true);
    });

    test('should return null for unknown country', () => {
      const treatyInfo = FreelancerPaycheck.getTreatyInfo('Unknown Country');
      expect(treatyInfo).toBeNull();
    });

    test('should calculate withholding for non-resident', () => {
      const paycheck = new FreelancerPaycheck(
        {
          grossRevenue: 80000,
          businessExpenses: 15000,
          hoursWorked: 1500,
        },
        2026,
        { residenceCountry: 'United States', isDutchResident: false }
      );

      expect(paycheck.isDutchResident).toBe(false);
      expect(paycheck.treatyInfo).not.toBeNull();
    });

    test('should get all treaty countries', () => {
      const countries = FreelancerPaycheck.getTreatyCountries();
      expect(countries.eu.length).toBeGreaterThan(0);
      expect(countries.nonEu.length).toBeGreaterThan(0);
      expect(countries.eu).toContain('Germany');
      expect(countries.nonEu).toContain('United States');
    });
  });

  describe('Static Methods', () => {
    test('should get deduction rates for a year', () => {
      const rates = FreelancerPaycheck.getDeductionRates(2026);

      expect(rates.zelfstandigenaftrek).toBe(
        constants.freelancer.zelfstandigenaftrek[2026]
      );
      expect(rates.startersaftrek).toBe(
        constants.freelancer.startersaftrek[2026]
      );
      expect(rates.mkbWinstvrijstelling).toBe(
        constants.freelancer.mkbWinstvrijstelling[2026]
      );
      expect(rates.urencriterium).toBe(constants.freelancer.urencriterium);
    });

    test('should calculate Box 1 tax', () => {
      const tax = FreelancerPaycheck.getBox1Tax(2026, 50000);
      expect(tax).toBeGreaterThan(0);
    });
  });
});

describe('VATCalculator', () => {
  test('should calculate VAT collected correctly', () => {
    const vat = new VATCalculator({
      revenueStandard: 10000,
      revenueReduced: 5000,
    });

    expect(vat.vatStandard).toBe(2100); // 10000 * 0.21
    expect(vat.vatReduced).toBe(450); // 5000 * 0.09
    expect(vat.totalVATCollected).toBe(2550);
  });

  test('should calculate VAT owed correctly', () => {
    const vat = new VATCalculator({
      revenueStandard: 10000,
      expensesVAT: 500,
    });

    // VAT collected: 2100, VAT deductible: 500
    expect(vat.vatOwed).toBe(1600);
  });

  test('should handle reverse charge VAT', () => {
    const vat = new VATCalculator({
      revenueStandard: 10000,
      expensesVAT: 500,
      reverseChargeVAT: 200,
    });

    // VAT collected: 2100, VAT deductible: 500, Reverse charge: 200
    // VAT owed: 2100 - 500 + 200 = 1800
    expect(vat.vatOwed).toBe(1800);
  });

  test('should extract VAT from gross amount', () => {
    const vatAmount = VATCalculator.extractVAT(12100, 'standard');
    expect(vatAmount).toBeCloseTo(2100, 2);
  });

  test('should add VAT to net amount', () => {
    const gross = VATCalculator.addVAT(10000, 'standard');
    expect(gross).toBe(12100);
  });

  test('should check KOR applicability', () => {
    expect(VATCalculator.isKORApplicable(1500)).toBe(true);
    expect(VATCalculator.isKORApplicable(2000)).toBe(false);
  });

  test('should calculate total revenue', () => {
    const vat = new VATCalculator({
      revenueStandard: 10000,
      revenueReduced: 5000,
      revenueZero: 2000,
    });

    expect(vat.totalRevenueExcludingVAT).toBe(17000);
    expect(vat.totalRevenueIncludingVAT).toBe(17000 + 2100 + 450);
  });
});

describe('CombinedPaycheck', () => {
  test('should calculate combined income correctly', () => {
    const combined = new CombinedPaycheck(
      {
        income: 50000,
        allowance: false,
        socialSecurity: true,
        older: false,
        hours: 40,
      },
      {
        grossRevenue: 30000,
        businessExpenses: 5000,
        hoursWorked: 800,
      },
      2026
    );

    expect(combined.employeePaycheck).toBeDefined();
    expect(combined.freelancerPaycheck).toBeDefined();
    expect(combined.totalGrossIncome).toBe(
      combined.employeePaycheck.grossYear +
        combined.freelancerPaycheck.grossProfit
    );
  });

  test('should calculate combined tax correctly', () => {
    const combined = new CombinedPaycheck(
      {
        income: 50000,
        allowance: false,
        socialSecurity: true,
        older: false,
        hours: 40,
      },
      {
        grossRevenue: 30000,
        businessExpenses: 5000,
        hoursWorked: 1500,
      },
      2026
    );

    expect(combined.combinedIncomeTax).toBeGreaterThan(0);
    expect(combined.combinedTaxCredits).toBeGreaterThan(0);
    expect(combined.combinedNetIncomeTax).toBeGreaterThan(0);
  });

  test('should calculate combined net income', () => {
    const combined = new CombinedPaycheck(
      {
        income: 50000,
        allowance: false,
        socialSecurity: true,
        older: false,
        hours: 40,
      },
      {
        grossRevenue: 30000,
        businessExpenses: 5000,
        hoursWorked: 1500,
      },
      2026
    );

    expect(combined.totalNetYear).toBeGreaterThan(0);
    expect(combined.totalNetYear).toBeLessThan(combined.totalGrossIncome);
  });
});

describe('CurrencyConverter', () => {
  test('should convert to EUR', () => {
    const converter = new CurrencyConverter();
    const eurAmount = converter.toEUR(100, 'USD');
    expect(eurAmount).toBeCloseTo(92, 0);
  });

  test('should convert from EUR', () => {
    const converter = new CurrencyConverter();
    const usdAmount = converter.fromEUR(92, 'USD');
    expect(usdAmount).toBe(100);
  });

  test('should update rates', () => {
    const converter = new CurrencyConverter();
    converter.updateRate('USD', 1.0);
    const eurAmount = converter.toEUR(100, 'USD');
    expect(eurAmount).toBe(100);
  });

  test('should get available currencies', () => {
    const converter = new CurrencyConverter();
    const currencies = converter.getAvailableCurrencies();
    expect(currencies).toContain('EUR');
    expect(currencies).toContain('USD');
    expect(currencies).toContain('GBP');
  });
});

describe('ReportGenerator', () => {
  test('should generate freelancer report', () => {
    const paycheck = new FreelancerPaycheck(
      {
        grossRevenue: 80000,
        businessExpenses: 15000,
        hoursWorked: 1500,
      },
      2026
    );

    const report = ReportGenerator.generateReport(paycheck, 'freelancer');

    expect(report.calculationType).toBe('freelancer');
    expect(report.disclaimer).toBeDefined();
    expect(report.officialSource).toContain('belastingdienst.nl');
    expect(report.data.businessIncome).toBeDefined();
    expect(report.data.deductions).toBeDefined();
    expect(report.data.netIncome).toBeDefined();
  });

  test('should convert report to CSV', () => {
    const paycheck = new FreelancerPaycheck(
      {
        grossRevenue: 80000,
        businessExpenses: 15000,
        hoursWorked: 1500,
      },
      2026
    );

    const report = ReportGenerator.generateReport(paycheck, 'freelancer');
    const csv = ReportGenerator.toCSV(report);

    expect(csv).toContain('Dutch Tax Calculator Report');
    expect(csv).toContain('Type: freelancer');
    expect(csv).toContain('Disclaimer');
  });

  test('should generate employee report', async () => {
    const { SalaryPaycheck } = await import('../index.js');
    const paycheck = new SalaryPaycheck(
      {
        income: 60000,
        allowance: false,
        socialSecurity: true,
        older: false,
        hours: 40,
      },
      'Year',
      2026,
      { checked: false }
    );

    const report = ReportGenerator.generateReport(paycheck, 'employee');

    expect(report.calculationType).toBe('employee');
    expect(report.data.income).toBeDefined();
    expect(report.data.taxes).toBeDefined();
    expect(report.data.netIncome).toBeDefined();
  });
});

describe('Data Validation', () => {
  test('freelancer data should exist for supported years', () => {
    const years = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

    years.forEach((year) => {
      expect(constants.freelancer.zelfstandigenaftrek[year]).toBeDefined();
      expect(constants.freelancer.startersaftrek[year]).toBeDefined();
      expect(constants.freelancer.mkbWinstvrijstelling[year]).toBeDefined();
      expect(constants.freelancer.zvwContribution[year]).toBeDefined();
    });
  });

  test('VAT rates should be correct', () => {
    expect(constants.vatRates.standard).toBe(0.21);
    expect(constants.vatRates.reduced).toBe(0.09);
    expect(constants.vatRates.zero).toBe(0.0);
  });

  test('urencriterium should be 1225', () => {
    expect(constants.freelancer.urencriterium).toBe(1225);
  });

  test('tax treaties should exist', () => {
    expect(Object.keys(constants.taxTreaties.eu).length).toBeGreaterThan(0);
    expect(Object.keys(constants.taxTreaties.nonEu).length).toBeGreaterThan(0);
  });
});

describe('Edge Cases', () => {
  test('should handle zero revenue', () => {
    const paycheck = new FreelancerPaycheck(
      {
        grossRevenue: 0,
        businessExpenses: 0,
        hoursWorked: 0,
      },
      2026
    );

    expect(paycheck.grossProfit).toBe(0);
    expect(paycheck.netYear).toBe(0);
  });

  test('should handle expenses greater than revenue', () => {
    const paycheck = new FreelancerPaycheck(
      {
        grossRevenue: 10000,
        businessExpenses: 15000,
        hoursWorked: 1500,
      },
      2026
    );

    expect(paycheck.grossProfit).toBe(0);
  });

  test('should handle very high income', () => {
    const paycheck = new FreelancerPaycheck(
      {
        grossRevenue: 500000,
        businessExpenses: 50000,
        hoursWorked: 2000,
      },
      2026
    );

    expect(paycheck.grossProfit).toBe(450000);
    expect(paycheck.effectiveTaxRate).toBeGreaterThan(30);
  });

  test('should handle older freelancer', () => {
    const paycheck = new FreelancerPaycheck(
      {
        grossRevenue: 80000,
        businessExpenses: 15000,
        hoursWorked: 1500,
        older: true,
      },
      2026
    );

    expect(paycheck.older).toBe(true);
    // Older freelancers get elder credit
    expect(paycheck.generalCredit).toBeGreaterThan(0);
  });
});

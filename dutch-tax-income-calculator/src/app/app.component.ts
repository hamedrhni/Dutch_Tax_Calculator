import { Component, OnInit, AfterViewChecked } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  constants,
  SalaryPaycheck,
  FreelancerPaycheck,
  VATCalculator,
  CombinedPaycheck,
  ReportGenerator,
} from 'dutch-tax-income-calculator';
import { merge, Subject } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';
import { debounceTime } from 'rxjs/operators';

// Tooltip definitions for Dutch tax terms
export const TAX_TOOLTIPS: Record<string, { en: string; nl: string }> = {
  zelfstandigenaftrek: {
    en: 'Self-employed deduction: A tax deduction for self-employed individuals who meet the hours criterion (1,225 hours/year). Amount decreases annually.',
    nl: 'Zelfstandigenaftrek: Een belastingaftrek voor zelfstandigen die voldoen aan het urencriterium (1.225 uur/jaar). Het bedrag neemt jaarlijks af.',
  },
  startersaftrek: {
    en: "Starter's deduction: Additional deduction available for the first 3 years of self-employment if you meet the hours criterion.",
    nl: 'Startersaftrek: Extra aftrek beschikbaar voor de eerste 3 jaar van zelfstandig ondernemerschap als u voldoet aan het urencriterium.',
  },
  mkbWinstvrijstelling: {
    en: 'SME profit exemption: A percentage of your profit (after deductions) that is exempt from tax. Currently 12.75% for 2026.',
    nl: 'MKB-winstvrijstelling: Een percentage van uw winst (na aftrekposten) dat vrijgesteld is van belasting. Momenteel 12,75% voor 2026.',
  },
  urencriterium: {
    en: 'Hours criterion: You must work at least 1,225 hours per year in your business to qualify for entrepreneur deductions.',
    nl: 'Urencriterium: U moet minimaal 1.225 uur per jaar in uw onderneming werken om in aanmerking te komen voor ondernemersaftrekken.',
  },
  zvw: {
    en: 'Health insurance contribution (ZVW): Self-employed pay their own health insurance contribution, calculated as a percentage of income up to a maximum.',
    nl: 'Zorgverzekeringswet bijdrage (ZVW): Zelfstandigen betalen zelf hun zorgverzekeringsbijdrage, berekend als percentage van inkomen tot een maximum.',
  },
  ruling30: {
    en: '30% Ruling: Tax benefit for highly skilled migrants allowing 30% of salary to be tax-free for up to 5 years.',
    nl: '30%-regeling: Belastingvoordeel voor kennismigranten waarbij 30% van het salaris tot 5 jaar lang belastingvrij is.',
  },
  arbeidskorting: {
    en: 'Labour tax credit: A tax credit for people who work and earn income from employment or self-employment.',
    nl: 'Arbeidskorting: Een heffingskorting voor mensen die werken en inkomen verdienen uit loondienst of zelfstandige arbeid.',
  },
  heffingskorting: {
    en: 'General tax credit: A basic tax credit that everyone is entitled to, which decreases as income rises.',
    nl: 'Algemene heffingskorting: Een basisheffingskorting waar iedereen recht op heeft, die afneemt naarmate het inkomen stijgt.',
  },
  btw: {
    en: 'VAT (BTW): Value Added Tax that freelancers must charge and remit. Standard rate 21%, reduced rate 9%.',
    nl: 'BTW: Belasting Toegevoegde Waarde die freelancers moeten berekenen en afdragen. Standaardtarief 21%, verlaagd tarief 9%.',
  },
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styles: [
    `
      .output-results-table {
        width: 600px;
      }

      @media (max-width: 600px) {
        :host ::ng-deep .mdc-data-table__cell {
          padding: 0 10px;
        }
      }

      @media (max-width: 960px) {
        :host ::ng-deep table {
          table-layout: fixed;
        }
        :host ::ng-deep td.mat-mdc-cell {
          word-break: break-word;
          white-space: normal;
        }
        :host ::ng-deep td.mat-mdc-cell.report-value {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .support-message {
          display: none !important;
        }
        .output-results-table {
          width: 100% !important;
        }

        .results-container {
          flex-direction: column;
        }
      }

      .mode-toggle {
        margin-bottom: 16px;
      }

      .freelancer-section {
        margin-top: 16px;
        padding: 16px;
        background: #f5f5f5;
        border-radius: 8px;
      }

      .info-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        vertical-align: middle;
        margin-left: 4px;
        color: #666;
        cursor: help;
      }

      .deduction-info {
        background: #e3f2fd;
        padding: 12px;
        border-radius: 4px;
        margin: 8px 0;
        font-size: 14px;
      }

      .warning-box {
        background: #fff3e0;
        padding: 12px;
        border-radius: 4px;
        margin: 8px 0;
        border-left: 4px solid #ff9800;
      }

      .success-box {
        background: #e8f5e9;
        padding: 12px;
        border-radius: 4px;
        margin: 8px 0;
        border-left: 4px solid #4caf50;
      }

      .vat-section {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #ddd;
      }

      .international-section {
        margin-top: 16px;
      }

      .country-select {
        width: 100%;
      }

      .export-buttons {
        margin-top: 16px;
        display: flex;
        gap: 8px;
      }

      .tab-content {
        padding: 16px 0;
      }
    `,
  ],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 })),
      ]),
    ]),
  ],
  standalone: false,
})
export class AppComponent implements OnInit, AfterViewChecked {
  showDonateButton = false;
  totalCalculations = 0;
  private calculationSubject = new Subject<void>();
  private meaningfulCalculations = 0;
  private readonly CALCULATION_DEBOUNCE_TIME = 2000;
  private readonly CALCULATIONS_BEFORE_DONATE = 2;
  readonly MINUTES_PER_CALCULATION = 23;
  title = 'dutch-tax-income-calculator';

  // Mode toggle
  calculatorMode = new FormControl<'employee' | 'freelancer' | 'combined'>(
    'employee'
  );

  // Common fields
  selectedYear = new FormControl(constants.currentYear.toString());
  years = constants.years.reverse().map((year: number) => year.toString());
  older = new FormControl(false);

  // Employee fields
  hoursAmount = new FormControl(constants.defaultWorkingHours);
  income = new FormControl(60000);
  startFrom = new FormControl<'Year' | 'Month' | 'Week' | 'Day' | 'Hour'>(
    'Year'
  );
  ruling = new FormControl(false);
  rulingChoice = new FormControl('normal');
  allowance = new FormControl(false);

  // Freelancer fields
  freelancerForm = new FormGroup({
    grossRevenue: new FormControl(80000),
    businessExpenses: new FormControl(15000),
    hoursWorked: new FormControl(1500),
    isStarter: new FormControl(false),
    hasPartner: new FormControl(false),
  });

  // International options
  isDutchResident = new FormControl(true);
  residenceCountry = new FormControl('Netherlands');
  euCountries: string[] = [];
  nonEuCountries: string[] = [];

  // VAT fields
  showVATCalculator = new FormControl(false);
  vatForm = new FormGroup({
    revenueStandard: new FormControl(50000),
    revenueReduced: new FormControl(0),
    revenueZero: new FormControl(0),
    expensesVAT: new FormControl(2000),
    reverseChargeVAT: new FormControl(0),
  });

  // Results
  paycheck!: any;
  freelancerPaycheck!: any;
  combinedPaycheck!: any;
  vatCalculation!: any;

  // Tooltips
  tooltips = TAX_TOOLTIPS;
  currentLanguage: 'en' | 'nl' = 'en';

  // Extra options for employee
  extraOptions = [
    {
      name: 'grossAllowance',
      sign: '',
      title: 'Year Gross Holiday Allowance',
      label: 'Gross Holiday Allowance per year',
      checked: false,
    },
    {
      name: 'grossYear',
      sign: '',
      title: 'Year Gross Income',
      label: 'Annual Gross Income',
      checked: false,
    },
    {
      name: 'grossMonth',
      sign: '',
      title: 'Month Gross Income',
      label: 'Monthly Gross Income',
      checked: false,
    },
    {
      name: 'grossWeek',
      sign: '',
      title: 'Week Gross Income',
      label: 'Gross Income per week',
      checked: false,
    },
    {
      name: 'grossDay',
      sign: '',
      title: 'Day Gross Income',
      label: 'Gross Income per day',
      checked: false,
    },
    {
      name: 'grossHour',
      sign: '',
      title: 'Hour Gross Income',
      label: 'Gross Income per hour',
      checked: false,
    },
    {
      name: 'taxFreeYear',
      sign: '-',
      title: 'Tax Free Income',
      label: 'Amount of income that goes tax free',
      checked: false,
    },
    {
      name: 'taxFree',
      sign: '',
      title: 'Ruling Real Percentage',
      label:
        'Absolute Percentage calculated from ruling income and non ruling',
      checked: false,
    },
    {
      name: 'taxableYear',
      sign: '',
      title: 'Taxable Income',
      label: 'Taxable Income Amount',
      checked: true,
    },
    {
      name: 'payrollTax',
      sign: '',
      title: 'Payroll Tax',
      label:
        'Payroll tax is tax imposed on employers or employees, and is calculated as a percentage of the salary that employer pay their staff',
      checked: true,
    },
    {
      name: 'socialTax',
      sign: '',
      title: 'Social Security Tax',
      label:
        'Social Security tax is the tax levied on both employers and employees to fund the Social Security program',
      checked: true,
    },
    {
      name: 'generalCredit',
      sign: '+',
      title: 'General Tax Credit',
      label:
        'General tax credit (algemene heffingskorting) that everyone is entitled',
      checked: true,
    },
    {
      name: 'labourCredit',
      sign: '+',
      title: 'Labour Tax Credit',
      label:
        'Labour tax credit (arbeidskorting) that is given to those that are still in the labour force',
      checked: true,
    },
    {
      name: 'incomeTax',
      sign: '-',
      title: 'Total Income Tax',
      label: 'Total Amount of Taxes',
      checked: false,
    },
    {
      name: 'incomeTaxMonth',
      sign: '-',
      title: 'Month Total Income Tax',
      label: 'Total Amount of Taxes per Month',
      checked: false,
    },
    {
      name: 'netAllowance',
      sign: '',
      title: 'Year Net Holiday Allowance',
      label: 'Year Net Holiday Allowance',
      checked: false,
    },
    {
      name: 'netYear',
      sign: '',
      title: 'Year Net Income',
      label: 'Annual Net Income',
      checked: true,
    },
    {
      name: 'netMonth',
      sign: '',
      title: 'Month Net Income',
      label: 'Monthly Net Income',
      checked: true,
    },
    {
      name: 'netWeek',
      sign: '',
      title: 'Week Net Income',
      label: 'Weekly Net Income',
      checked: false,
    },
    {
      name: 'netDay',
      sign: '',
      title: 'Day Net Income',
      label: 'Daily Net Income',
      checked: false,
    },
    {
      name: 'netHour',
      sign: '',
      title: 'Hour Net Income',
      label: 'Hourly Net Income',
      checked: false,
    },
  ];

  // Extra options for freelancer
  freelancerExtraOptions = [
    {
      name: 'grossRevenue',
      title: 'Gross Revenue',
      label: 'Total business revenue',
      checked: true,
    },
    {
      name: 'businessExpenses',
      title: 'Business Expenses',
      label: 'Deductible business costs',
      checked: true,
    },
    {
      name: 'grossProfit',
      title: 'Gross Profit',
      label: 'Revenue minus expenses',
      checked: true,
    },
    {
      name: 'zelfstandigenaftrek',
      title: 'Zelfstandigenaftrek',
      label: 'Self-employed deduction (requires 1,225+ hours)',
      checked: true,
    },
    {
      name: 'startersaftrek',
      title: 'Startersaftrek',
      label: "Starter's deduction (first 3 years)",
      checked: false,
    },
    {
      name: 'mkbWinstvrijstelling',
      title: 'MKB-winstvrijstelling',
      label: 'SME profit exemption (12.75%)',
      checked: true,
    },
    {
      name: 'taxableProfit',
      title: 'Taxable Profit',
      label: 'Profit after all deductions',
      checked: true,
    },
    {
      name: 'incomeTax',
      title: 'Income Tax (Box 1)',
      label: 'Gross income tax before credits',
      checked: false,
    },
    {
      name: 'labourCredit',
      title: 'Labour Tax Credit',
      label: 'Arbeidskorting',
      checked: true,
    },
    {
      name: 'generalCredit',
      title: 'General Tax Credit',
      label: 'Algemene heffingskorting',
      checked: true,
    },
    {
      name: 'netIncomeTax',
      title: 'Net Income Tax',
      label: 'Tax after credits',
      checked: true,
    },
    {
      name: 'zvwContribution',
      title: 'ZVW Contribution',
      label: 'Health insurance contribution',
      checked: true,
    },
    {
      name: 'netYear',
      title: 'Net Income (Year)',
      label: 'Annual net income after all taxes',
      checked: true,
    },
    {
      name: 'netMonth',
      title: 'Net Income (Month)',
      label: 'Monthly net income',
      checked: true,
    },
    {
      name: 'effectiveTaxRate',
      title: 'Effective Tax Rate',
      label: 'Total tax as percentage of profit',
      checked: true,
    },
  ];

  dataSource!: { name: string; value: number | string }[];
  displayedColumns: string[] = ['name', 'value'];

  tooltipCell: string | null = null;
  tooltipPosition: { x: number; y: number } | null = null;
  tooltipValue: string = '';

  cellsWithOverflow: Set<string> = new Set();

  screenWidth: number;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cookieService: CookieService
  ) {
    this.screenWidth = window.innerWidth;
    window.onresize = () => {
      this.screenWidth = window.innerWidth;
    };

    // Load treaty countries
    const treatyCountries = FreelancerPaycheck.getTreatyCountries();
    this.euCountries = treatyCountries.eu;
    this.nonEuCountries = treatyCountries.nonEu;

    this.route.queryParams.subscribe((queryParams) => {
      queryParams['income'] &&
        this.income.setValue(Number(queryParams['income']));
      queryParams['startFrom'] &&
        this.startFrom.setValue(queryParams['startFrom']);
      queryParams['selectedYear'] &&
        this.selectedYear.setValue(queryParams['selectedYear']);
      queryParams['older'] &&
        this.older.setValue(queryParams['older'] === 'true');
      queryParams['allowance'] &&
        this.allowance.setValue(queryParams['allowance'] === 'true');
      queryParams['hoursAmount'] &&
        this.hoursAmount.setValue(queryParams['hoursAmount']);
      queryParams['ruling'] &&
        this.ruling.setValue(queryParams['ruling'] === 'true');
      queryParams['mode'] && this.calculatorMode.setValue(queryParams['mode']);
    });

    // Subscribe to all form changes
    merge(
      this.calculatorMode.valueChanges,
      this.income.valueChanges,
      this.startFrom.valueChanges,
      this.selectedYear.valueChanges,
      this.older.valueChanges,
      this.allowance.valueChanges,
      this.hoursAmount.valueChanges,
      this.rulingChoice.valueChanges,
      this.ruling.valueChanges,
      this.freelancerForm.valueChanges,
      this.isDutchResident.valueChanges,
      this.residenceCountry.valueChanges,
      this.showVATCalculator.valueChanges,
      this.vatForm.valueChanges
    ).subscribe((_) => {
      this.updateRouter();
      this.recalculate();
    });
  }

  ngOnInit(): void {
    this.recalculate();

    const savedCalculations = this.cookieService.get('totalCalculations');
    this.totalCalculations = savedCalculations
      ? parseInt(savedCalculations, 10)
      : 0;

    this.calculationSubject
      .pipe(debounceTime(this.CALCULATION_DEBOUNCE_TIME))
      .subscribe(() => {
        this.meaningfulCalculations++;
        if (this.meaningfulCalculations >= this.CALCULATIONS_BEFORE_DONATE) {
          this.showDonateButton = true;
          this.totalCalculations++;
          this.cookieService.set(
            'totalCalculations',
            this.totalCalculations.toString(),
            365
          );
        }
      });
  }

  ngAfterViewChecked(): void {
    const isMobile = this.screenWidth <= 600;
    const hasData = this.dataSource && this.dataSource.length > 0;

    if (!isMobile || !hasData) {
      return;
    }

    requestAnimationFrame(() => {
      this.dataSource.forEach((element) => {
        const cellSelector = `td.report-value[data-cell-id="${element.name}"]`;
        const cell = document.querySelector(cellSelector) as HTMLElement;

        if (cell) {
          const hasOverflow = cell.scrollWidth > cell.clientWidth;
          if (hasOverflow) {
            this.cellsWithOverflow.add(element.name);
          } else {
            this.cellsWithOverflow.delete(element.name);
          }
        }
      });
    });
  }

  recalculate(): void {
    this.calculationSubject.next();
    const mode = this.calculatorMode.getRawValue();
    const year = +(this.selectedYear.getRawValue() ?? constants.currentYear);

    if (mode === 'employee' || mode === 'combined') {
      this.calculateEmployee(year);
    }

    if (mode === 'freelancer' || mode === 'combined') {
      this.calculateFreelancer(year);
    }

    if (mode === 'combined') {
      this.calculateCombined(year);
    }

    if (this.showVATCalculator.getRawValue()) {
      this.calculateVAT();
    }

    this.updateDataSource();
    this.cellsWithOverflow.clear();
  }

  private calculateEmployee(year: number): void {
    const salary = {
      income: this.income.getRawValue() ?? 0,
      allowance: this.allowance.getRawValue() ?? false,
      socialSecurity: true,
      older: this.older.getRawValue() ?? false,
      hours: this.hoursAmount.getRawValue() ?? 40,
    };

    this.paycheck = new SalaryPaycheck(
      salary,
      this.startFrom.getRawValue()!,
      year,
      {
        checked: this.ruling.getRawValue() ?? false,
        choice: this.rulingChoice.getRawValue() ?? 'normal',
      } as any
    );
  }

  private calculateFreelancer(year: number): void {
    const freelancerInput = {
      grossRevenue: this.freelancerForm.get('grossRevenue')?.value ?? 0,
      businessExpenses: this.freelancerForm.get('businessExpenses')?.value ?? 0,
      hoursWorked: this.freelancerForm.get('hoursWorked')?.value ?? 0,
      isStarter: this.freelancerForm.get('isStarter')?.value ?? false,
      older: this.older.getRawValue() ?? false,
      hasPartner: this.freelancerForm.get('hasPartner')?.value ?? false,
    };

    const internationalOptions = {
      residenceCountry: this.residenceCountry.getRawValue() ?? 'Netherlands',
      isDutchResident: this.isDutchResident.getRawValue() ?? true,
    };

    this.freelancerPaycheck = new FreelancerPaycheck(
      freelancerInput,
      year,
      internationalOptions
    );
  }

  private calculateCombined(year: number): void {
    const salaryInput = {
      income: this.income.getRawValue() ?? 0,
      allowance: this.allowance.getRawValue() ?? false,
      socialSecurity: true,
      older: this.older.getRawValue() ?? false,
      hours: this.hoursAmount.getRawValue() ?? 40,
    };

    const freelancerInput = {
      grossRevenue: this.freelancerForm.get('grossRevenue')?.value ?? 0,
      businessExpenses: this.freelancerForm.get('businessExpenses')?.value ?? 0,
      hoursWorked: this.freelancerForm.get('hoursWorked')?.value ?? 0,
      isStarter: this.freelancerForm.get('isStarter')?.value ?? false,
      older: this.older.getRawValue() ?? false,
      hasPartner: this.freelancerForm.get('hasPartner')?.value ?? false,
    };

    this.combinedPaycheck = new CombinedPaycheck(
      salaryInput,
      freelancerInput,
      year,
      {
        checked: this.ruling.getRawValue() ?? false,
        choice: this.rulingChoice.getRawValue() ?? 'normal',
      } as any
    );
  }

  private calculateVAT(): void {
    const vatInput = {
      revenueStandard: this.vatForm.get('revenueStandard')?.value ?? 0,
      revenueReduced: this.vatForm.get('revenueReduced')?.value ?? 0,
      revenueZero: this.vatForm.get('revenueZero')?.value ?? 0,
      expensesVAT: this.vatForm.get('expensesVAT')?.value ?? 0,
      reverseChargeVAT: this.vatForm.get('reverseChargeVAT')?.value ?? 0,
    };

    this.vatCalculation = new VATCalculator(vatInput);
  }

  private updateDataSource(): void {
    const mode = this.calculatorMode.getRawValue();

    if (mode === 'employee') {
      this.dataSource = this.extraOptions
        .filter((option) => option.checked)
        .map((option) => ({
          name: option.title,
          value: this.paycheck[option.name],
        }));
    } else if (mode === 'freelancer') {
      this.dataSource = this.freelancerExtraOptions
        .filter((option) => option.checked)
        .map((option) => ({
          name: option.title,
          value:
            option.name === 'effectiveTaxRate'
              ? `${this.freelancerPaycheck[option.name]}%`
              : this.freelancerPaycheck[option.name],
        }));
    } else if (mode === 'combined') {
      this.dataSource = [
        {
          name: 'Employee Gross',
          value: this.combinedPaycheck.employeePaycheck.grossYear,
        },
        {
          name: 'Freelancer Profit',
          value: this.combinedPaycheck.freelancerPaycheck.grossProfit,
        },
        {
          name: 'Total Gross Income',
          value: this.combinedPaycheck.totalGrossIncome,
        },
        {
          name: 'Total Taxable Income',
          value: this.combinedPaycheck.totalTaxableIncome,
        },
        {
          name: 'Combined Tax Credits',
          value: this.combinedPaycheck.combinedTaxCredits,
        },
        {
          name: 'Net Income Tax',
          value: this.combinedPaycheck.combinedNetIncomeTax,
        },
        { name: 'ZVW Contribution', value: this.combinedPaycheck.combinedZVW },
        { name: 'Total Net (Year)', value: this.combinedPaycheck.totalNetYear },
        {
          name: 'Total Net (Month)',
          value: this.combinedPaycheck.totalNetMonth,
        },
      ];
    }
  }

  getTooltip(key: string): string {
    const tooltip = this.tooltips[key];
    return tooltip ? tooltip[this.currentLanguage] : '';
  }

  toggleLanguage(): void {
    this.currentLanguage = this.currentLanguage === 'en' ? 'nl' : 'en';
  }

  exportReport(format: 'json' | 'csv'): void {
    const mode = this.calculatorMode.getRawValue();
    let paycheck: any;
    let type: 'employee' | 'freelancer' | 'combined' = 'employee';

    if (mode === 'employee') {
      paycheck = this.paycheck;
      type = 'employee';
    } else if (mode === 'freelancer') {
      paycheck = this.freelancerPaycheck;
      type = 'freelancer';
    } else {
      paycheck = this.combinedPaycheck;
      type = 'combined';
    }

    const report = ReportGenerator.generateReport(paycheck, type);

    if (format === 'json') {
      this.downloadFile(
        JSON.stringify(report, null, 2),
        'tax-calculation.json',
        'application/json'
      );
    } else {
      const csv = ReportGenerator.toCSV(report);
      this.downloadFile(csv, 'tax-calculation.csv', 'text/csv');
    }
  }

  private downloadFile(
    content: string,
    filename: string,
    mimeType: string
  ): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  showTooltip(
    cellId: string,
    element: { name: string; value: number | string },
    event: MouseEvent
  ): void {
    const isMobile = this.screenWidth <= 600;
    if (!isMobile) {
      return;
    }

    const cell = event.currentTarget as HTMLElement;
    const hasOverflow = cell.scrollWidth > cell.clientWidth;

    if (!hasOverflow) {
      return;
    }

    if (this.tooltipCell === cellId) {
      this.hideTooltip();
      return;
    }

    this.tooltipCell = cellId;
    this.tooltipValue = this.formatValueForTooltip(element);

    const cellRect = cell.getBoundingClientRect();
    this.tooltipPosition = {
      x: cellRect.left + cellRect.width / 2,
      y: cellRect.top - 10,
    };
  }

  private formatValueForTooltip(element: {
    name: string;
    value: number | string;
  }): string {
    if (
      element.name === 'Ruling Real Percentage' ||
      element.name === 'Effective Tax Rate'
    ) {
      return `${element.value}`;
    }

    if (typeof element.value === 'string') {
      return element.value;
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(element.value);
  }

  hideTooltip(): void {
    this.tooltipCell = null;
    this.tooltipPosition = null;
    this.tooltipValue = '';
  }

  updateRouter() {
    const params: any = {
      income: this.income.getRawValue(),
      startFrom: this.startFrom.getRawValue(),
      selectedYear: this.selectedYear.getRawValue(),
      older: this.older.getRawValue(),
      allowance: this.allowance.getRawValue(),
      socialSecurity: true,
      hoursAmount: this.hoursAmount.getRawValue(),
      ruling: this.ruling.getRawValue(),
      mode: this.calculatorMode.getRawValue(),
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }

  // Helper methods for template
  get meetsUrencriterium(): boolean {
    return this.freelancerPaycheck?.meetsUrencriterium ?? false;
  }

  get deductionRates(): any {
    const year = +(this.selectedYear.getRawValue() ?? constants.currentYear);
    return FreelancerPaycheck.getDeductionRates(year);
  }

  get isKORApplicable(): boolean {
    if (!this.vatCalculation) return false;
    return VATCalculator.isKORApplicable(this.vatCalculation.vatOwed);
  }
}

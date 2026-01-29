# Dutch Income Tax Calculator

A modern web application for calculating Dutch income tax for employees and freelancers (ZZP'ers). Built with Angular and powered by the [dutch-tax-income-calculator](https://www.npmjs.com/package/dutch-tax-income-calculator) NPM package.

![Screenshot](https://user-images.githubusercontent.com/1526680/210368913-41872b04-ca87-431d-ad65-1f22e26b7ec0.png)

## Features

- **Employee Tax Calculator**: Calculate net income from gross salary including holiday allowance, 30% ruling, and social security contributions
- **Freelancer Tax Calculator**: Full support for self-employed individuals with deductions like zelfstandigenaftrek, startersaftrek, and MKB-winstvrijstelling
- **VAT Calculator**: Calculate Dutch VAT (BTW) with different rates
- **Combined Income**: Handle scenarios with both employment and freelance income
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Calculations**: Instant results as you input data
- **Export Options**: Export calculations to JSON or CSV

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm start
```

The application will be available at `http://localhost:4200`.

### Build

```bash
npm run build
```

## Architecture

This application consists of two main parts:

- **UI Layer**: Angular application (this repository)
- **Core Logic**: NPM package with tax calculation logic ([dutch-tax-core](https://github.com/hamedrhni/Dutch_Tax_Calculator/tree/main/dutch-tax-core))

## Old Version

The previous version based on AngularJS can be found here: https://github.com/stevermeister/dutch-tax-income-calculator-old

## Contributing

This repository contains only the UI layer. The core tax calculation logic is maintained separately. Please see the [core package](https://github.com/hamedrhni/Dutch_Tax_Calculator/tree/main/dutch-tax-core) for contributions to the calculation engine.

## Contributors

[<img alt="stevermeister" src="https://avatars1.githubusercontent.com/u/1526680?v=4&s=117 width=117">](https://github.com/stevermeister) |[<img alt="eduardomourar" src="https://avatars0.githubusercontent.com/u/16357187?v=4&s=117 width=117">](https://github.com/eduardomourar) |[<img alt="israelroldan" src="https://avatars3.githubusercontent.com/u/159962?v=4&s=117 width=117">](https://github.com/israelroldan) |[<img alt="mzaferyahsi" src="https://avatars2.githubusercontent.com/u/4150565?v=4&s=117 width=117">](https://github.com/mzaferyahsi) |[<img alt="yevgeniyvaleyev" src="https://avatars0.githubusercontent.com/u/866248?v=4&s=117 width=117">](https://github.com/yevgeniyvaleyev) |[<img alt="shershen08" src="https://avatars3.githubusercontent.com/u/1363772?v=4&s=117 width=117">](https://github.com/shershen08) |[<img alt="toubou91" src="https://avatars2.githubusercontent.com/u/5684688?v=4&s=117 width=117">](https://github.com/toubou91) |
:---:|:---:|:---:|:---:|:---:|:---:|:---:|
[stevermeister](https://github.com/stevermeister)|[eduardomourar](https://github.com/eduardomourar)|[israelroldan](https://github.com/israelroldan)|[mzaferyahsi](https://github.com/mzaferyahsi)|[yevgeniyvaleyev](https://github.com/yevgeniyvaleyev)|[shershen08](https://github.com/shershen08)|[toubou91](https://github.com/toubou91)|

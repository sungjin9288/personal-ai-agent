import { refreshPortfolioPackage } from './refresh-portfolio-package.mjs';

const result = refreshPortfolioPackage({ check: true });

console.log(
  JSON.stringify(
    {
      ...result,
      mode: 'portfolio-package-refresh-smoke',
    },
    null,
    2,
  ),
);

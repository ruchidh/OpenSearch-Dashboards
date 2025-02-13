/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import '@cypress-audit/lighthouse/commands';

// --- Typed commands --

Cypress.Commands.add('getElementByTestId', (testId, options = {}) => {
  return cy.get(`[data-test-subj="${testId}"]`, options);
});

Cypress.Commands.add('getElementByTestIdLike', (testId, options = {}) => {
  return cy.get(`[data-test-subj*="${testId}"]`, options);
});

Cypress.Commands.add('getElementsByTestIds', (testIds, options = {}) => {
  const selectors = [testIds].flat(Infinity).map((testId) => `[data-test-subj="${testId}"]`);
  return cy.get(selectors.join(','), options);
});

Cypress.Commands.add(
  'findElementByTestIdLike',
  { prevSubject: true },
  (subject, partialTestId, options = {}) => {
    return cy.wrap(subject).find(`[data-test-subj*="${partialTestId}"]`, options);
  }
);

Cypress.Commands.add(
  'findElementByTestId',
  { prevSubject: true },
  (subject, testId, options = {}) => {
    return cy.wrap(subject).find(`[data-test-subj="${testId}"]`, options);
  }
);

Cypress.Commands.add('whenTestIdNotFound', (testIds, callbackFn, options = {}) => {
  const selectors = [testIds].flat(Infinity).map((testId) => `[data-test-subj="${testId}"]`);
  cy.get('body', options).then(($body) => {
    if ($body.find(selectors.join(',')).length === 0) callbackFn();
  });
});

Cypress.Commands.add('deleteWorkspace', (workspaceName) => {
  cy.wait(3000);
  cy.getElementByTestId('workspace-detail-delete-button').should('be.visible').click();
  cy.getElementByTestId('delete-workspace-modal-body').should('be.visible');
  cy.getElementByTestId('delete-workspace-modal-input').type(workspaceName);
  cy.getElementByTestId('delete-workspace-modal-confirm').click();
  cy.contains(/successfully/);
});

Cypress.Commands.add('openWorkspaceDashboard', (workspaceName) => {
  cy.getElementByTestId('workspace-select-button').should('exist').click();
  cy.getElementByTestId('workspace-menu-manage-button').should('exist').click();
  cy.get('.euiBasicTable')
    .find('tr')
    .filter((index, row) => {
      return Cypress.$(row).find('td').text().includes(workspaceName);
    })
    .find('a.euiLink')
    .click();
});

// Command to measure component performance and compare with baseline
// Example -  cy.measureComponentPerformance(
//   'workspace-initial-card-createWorkspace-button',
//   'table_render_time'
// );
Cypress.Commands.add('measureComponentPerformance', (pluginName, testId) => {
  cy.readFile('cypress/utils/performance_baselines.json').then((baselines) => {
    // Retrieve baseline for the given component (testId)
    const fieldName = `${pluginName}_${testId}`;
    const baseline = baselines[fieldName];

    if (baseline) {
      cy.window().then((win) => {
        const startTime = win.performance.now();

        // Measure render time
        cy.getElementByTestId(testId)
          .should('be.visible')
          .then(() => {
            const endTime = win.performance.now();
            const renderTime = endTime - startTime;

            cy.log(renderTime, baseline.render_time, 'renderTime baseline.render_time');
            // Compare Render Time with Baseline
            if (renderTime > baseline.render_time) {
              cy.task('logPerformance', {
                metric: `${fieldName}_render_time`,
                value: `exceeded: ${renderTime.toFixed(2)}ms > ${baseline.render_time}ms`,
              });
            }

            // Capture Layout Shift (CLS)
            cy.window().then((win) => {
              return new Cypress.Promise((resolve) => {
                let layoutShiftScore = 0;
                const observer = new win.PerformanceObserver((list) => {
                  for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                      layoutShiftScore += entry.value;
                    }
                  }
                });
                observer.observe({ type: 'layout-shift', buffered: true });

                setTimeout(() => {
                  observer.disconnect();
                  resolve(layoutShiftScore);
                }, 2000);
              }).then((layoutShiftScore) => {
                // Compare Layout Shift (CLS) with Baseline
                if (layoutShiftScore > baseline.layout_shift) {
                  cy.task('logPerformance', {
                    metric: `${fieldName}_layout_shift`,
                    value: `exceeded: ${layoutShiftScore.toFixed(2)} > ${
                      baseline.layout_shift
                    } (CLS)`,
                  });
                }
              });
            });

            // Capture Memory Usage
            cy.window().then((win) => {
              const memoryUsage = win.performance.memory.usedJSHeapSize / 1024 / 1024;

              // Compare Memory Usage with Baseline
              if (memoryUsage > baseline.memory_MB) {
                cy.task('logPerformance', {
                  metric: `${fieldName}_memory_MB`,
                  value: `exceeded: ${memoryUsage.toFixed(2)}MB > ${baseline.memory_MB}MB`,
                });
              }
            });
          });
      });
    } else {
      cy.log(`No baseline found for component: ${fieldName}`);
    }
  });
});

Cypress.Commands.add('runLighthouse', (pageKey) => {
  cy.config('defaultCommandTimeout', 240000);
  cy.config('taskTimeout', 240000);

  cy.lighthouse(
    {
      performance: 20,
    },
    {
      formFactor: 'desktop',
      screenEmulation: {
        mobile: false,
        disable: false,
        width: cy.config('viewportWidth'),
        height: cy.config('viewportHeight'),
        deviceScaleRatio: 1,
      },
      onlyCategories: ['performance'],
    }
  );

  cy.compareLighthouseReport(pageKey);
});

Cypress.Commands.add('compareLighthouseReport', (pageKey) => {
  const reportPath = `./cypress/lighthouse/lighthouse_report_${pageKey}.json`;
  const baselinePath = './cypress/utils/lighthouse_baselines.json';
  const metricsPath = './cypress/lighthouse_metrics.json';

  cy.config('defaultCommandTimeout', 180000);
  cy.config('taskTimeout', 200000);

  cy.readFile(reportPath, { log: false }).then((report) => {
    cy.readFile(baselinePath, { log: false }).then((baselines) => {
      const baseline = baselines[pageKey];

      if (!baseline) {
        cy.log(`⚠️ No baseline found for: ${pageKey}`);
        return;
      }

      const summary = {};
      const categories = ['performance', 'accessibility'];

      categories.forEach((category) => {
        if (baseline[category] !== undefined) {
          const actual = Math.round(report.lhr.categories[category].score * 100);
          const expected = baseline[category];

          if (actual < expected) {
            summary[`${pageKey}_${category}`] = `❌ ${actual} (Expected: ${expected})`;
          } else {
            summary[`${pageKey}_${category}`] = `✅ ${actual} (Expected: ${expected})`;
          }
        }
      });

      cy.readFile(metricsPath, { log: false })
        .then((existingMetrics) => {
          const updatedMetrics = { ...existingMetrics, ...summary };
          cy.writeFile(metricsPath, updatedMetrics, { log: false });
        })
        .catch(() => {
          cy.writeFile(metricsPath, summary, { log: false });
        });

      cy.log(`📊 Lighthouse comparison for ${pageKey} completed!`);
    });
  });
});

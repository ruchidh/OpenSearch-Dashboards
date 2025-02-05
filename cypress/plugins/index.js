/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
const { lighthouse, prepareAudit } = require('@cypress-audit/lighthouse');

module.exports = (on) => {
  on('before:browser:launch', (browser, launchOptions) => {
    prepareAudit(launchOptions);
  });

  on('task', {
    lighthouse: lighthouse(),
  });
};

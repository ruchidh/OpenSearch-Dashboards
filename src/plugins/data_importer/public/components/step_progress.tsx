/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';

export interface StepConfig {
  title: string;
  isComplete: boolean;
  isActive: boolean;
}

interface StepProgressProps {
  steps: StepConfig[];
  currentStep: number;
}

export const StepProgress: React.FC<StepProgressProps> = ({ steps, currentStep }) => {
  return (
    <div className={`step-progress-container step-${currentStep}`}>
      <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="l">
        {steps.map((step, index) => (
          <EuiFlexItem grow={false} key={index}>
            <div className={`step-indicator ${
              step.isComplete ? 'completed' : step.isActive ? 'active' : 'inactive'
            }`}>
              <div
                className={`step-circle ${
                  step.isComplete ? 'completed' : step.isActive ? 'active' : 'inactive'
                }`}
              >
                {step.isComplete ? '✓' : index + 1}
              </div>
              <div className={`step-title ${step.isActive ? 'active' : ''}`}>{step.title}</div>
            </div>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </div>
  );
};
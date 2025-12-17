/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiSpacer, EuiPageContent } from '@elastic/eui';
import { StepProgress } from './step_progress';

interface StepWrapperProps {
  currentStep: number;
  children: React.ReactNode;
}

export const StepWrapper: React.FC<StepWrapperProps> = ({ currentStep, children }) => {
  // Create step configuration - same logic as in main app
  const createStepConfiguration = (current: number) => {
    const baseSteps = [{ title: 'Upload' }, { title: 'Configure' }, { title: 'Complete' }];

    return baseSteps.map((step, index) => {
      const stepNumber = index + 1;
      return {
        ...step,
        isComplete: stepNumber < current,
        isActive: stepNumber === current,
      };
    });
  };

  const steps = createStepConfiguration(currentStep);

  return (
    <EuiPageContent className="wizard-step-container">
      <StepProgress steps={steps} currentStep={currentStep} />
      <EuiSpacer size="m" />
      {children}
    </EuiPageContent>
  );
};

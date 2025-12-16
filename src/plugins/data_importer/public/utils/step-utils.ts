/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StepConfiguration {
  title: string;
  isComplete: boolean;
  isActive: boolean;
}

export const createStepConfiguration = (currentStep: 1 | 2 | 3): StepConfiguration[] => [
  {
    title: 'Upload Data',
    isComplete: currentStep > 1,
    isActive: currentStep === 1,
  },
  {
    title: 'Settings and preview',
    isComplete: currentStep > 2,
    isActive: currentStep === 2,
  },
  {
    title: 'Complete',
    isComplete: currentStep === 3,
    isActive: currentStep === 3,
  },
];

export const createClearHandler = (
  setCurrentStep: (step: 1 | 2 | 3) => void,
  setIndexName: (name: string) => void,
  setFilePreviewData: (data: any) => void
) => () => {
  setCurrentStep(1);
  setIndexName('');
  setFilePreviewData({ documents: [], predictedMapping: {} });
};
/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';

export type UploadMethod = 'file' | 'manual';

interface UseUploadMethodProps {
  inputFile?: File;
  textInput: string;
}

export const useUploadMethod = ({ inputFile, textInput }: UseUploadMethodProps) => {
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>('file');
  const [isTextEditorInfoOpen, setIsTextEditorInfoOpen] = useState<boolean>(false);

  // Auto-update upload method based on content
  useEffect(() => {
    if (inputFile) {
      setUploadMethod('file');
    } else if (textInput.trim()) {
      setUploadMethod('manual');
    }
  }, [inputFile, textInput]);

  const uploadMethodOptions = [
    {
      id: 'file' as const,
      label: 'Upload by file',
    },
    {
      id: 'manual' as const,
      label: 'Enter manually',
    },
  ];

  return {
    uploadMethod,
    setUploadMethod,
    uploadMethodOptions,
    isTextEditorInfoOpen,
    setIsTextEditorInfoOpen,
  };
};
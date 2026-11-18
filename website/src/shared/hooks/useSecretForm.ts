import { useState } from 'react';
import { randomString } from '@shared/lib/random';
import { useConfig } from '@shared/hooks/useConfig';

export interface GeneratedLink {
  password: string;
  uuid: string;
  receiptToken?: string;
}

export interface SecretFormState {
  readReceipt: boolean;
  setReadReceipt: (value: boolean) => void;
  linkCount: number;
  setLinkCount: (value: number) => void;
  results: GeneratedLink[];
  setResults: (results: GeneratedLink[]) => void;
  getPassword: () => string;
}

export function useSecretForm(): SecretFormState {
  const config = useConfig();
  const [readReceipt, setReadReceipt] = useState(
    config.READ_RECEIPTS && config.DEFAULT_READ_RECEIPT,
  );
  const [linkCount, setLinkCount] = useState(1);
  const [results, setResults] = useState<GeneratedLink[]>([]);

  function getPassword() {
    return randomString();
  }

  return {
    readReceipt,
    setReadReceipt,
    linkCount,
    setLinkCount,
    results,
    setResults,
    getPassword,
  };
}

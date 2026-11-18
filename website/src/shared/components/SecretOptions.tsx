import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ExpirationSelector } from './ExpirationSelector';
import { useConfig } from '@shared/hooks/useConfig';

interface SecretOptionsProps {
  onExpirationChange: (value: string) => void;
  linkCount: number;
  setLinkCount: (value: number) => void;
  requireAuth: boolean;
  setRequireAuth: (value: boolean) => void;
  readReceipt?: boolean;
  setReadReceipt?: (value: boolean) => void;
  expirationLabel?: string;
  expiration: string;
}

export function SecretOptions({
  onExpirationChange,
  linkCount,
  setLinkCount,
  requireAuth,
  setRequireAuth,
  readReceipt,
  setReadReceipt,
  expirationLabel,
  expiration,
}: SecretOptionsProps) {
  const { t } = useTranslation();
  const config = useConfig();
  const linkCountHintId = useId();

  return (
    <>
      <ExpirationSelector
        value={expiration}
        onChange={onExpirationChange}
        legend={expirationLabel}
      />

      <label className="mt-6 flex items-center justify-between gap-4">
        <span className="font-medium">{t('create.linkCount')}</span>
        <select
          required
          aria-describedby={linkCountHintId}
          className="select select-bordered w-24 bg-base-100 text-base-content border-base-300"
          value={linkCount}
          onChange={event => setLinkCount(Number(event.target.value))}
        >
          {Array.from({ length: 10 }, (_, index) => index + 1).map(count => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </select>
      </label>
      <p id={linkCountHintId} className="mt-2 text-xs text-base-content/70">
        {t('create.linkCountHint')}
      </p>

      <div className="mt-6 space-y-3">
        {config?.OIDC_ENABLED && (
          <label className="cursor-pointer flex items-center space-x-3 p-2 rounded-field hover:bg-base-200 transition-colors">
            <input
              type="checkbox"
              className="checkbox checkbox-primary"
              checked={requireAuth}
              onChange={() => setRequireAuth(!requireAuth)}
            />
            <span className="label-text font-medium">
              {t('create.inputRequireAuthLabel')}
            </span>
          </label>
        )}
        {config?.READ_RECEIPTS && setReadReceipt && (
          <label className="cursor-pointer flex items-center space-x-3 p-2 rounded-field hover:bg-base-200 transition-colors">
            <input
              type="checkbox"
              className="checkbox checkbox-primary"
              checked={readReceipt}
              onChange={() => setReadReceipt(!readReceipt)}
            />
            <span className="label-text font-medium">
              {t('create.inputReadReceiptLabel')}
            </span>
          </label>
        )}
      </div>
    </>
  );
}

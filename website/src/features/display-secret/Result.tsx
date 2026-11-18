import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfig } from '@shared/hooks/useConfig';
import { useCopy } from '@shared/hooks/useCopy';
import {
  CheckCircleIcon,
  CheckIcon,
  CopyIcon,
  InfoIcon,
  KeyIcon,
  LinkIcon,
} from '@shared/components/icons';
import ReceiptStatus from '@features/display-secret/ReceiptStatus';
import ValueBox from '@shared/components/ValueBox';
import type { GeneratedLink } from '@shared/hooks/useSecretForm';

interface ResultProps {
  password: string;
  uuid: string;
  prefix: string;
  customPassword: boolean;
  oneTime: boolean;
  receiptToken?: string;
  additionalLinks?: GeneratedLink[];
}

function CopyButton({
  copied,
  onClick,
  title,
  copyLabel,
  copiedLabel,
}: {
  copied: boolean;
  onClick: () => void;
  title: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  return (
    <button
      className={`btn h-auto min-h-12 self-stretch w-28 px-3 text-sm font-medium transition-colors duration-200 shrink-0 ${copied ? 'btn-success' : 'btn-primary'}`}
      onClick={onClick}
      title={title}
    >
      {copied ? (
        <CheckIcon className="size-4" />
      ) : (
        <CopyIcon className="size-4" />
      )}
      {copied ? copiedLabel : copyLabel}
    </button>
  );
}

function SecretLink({
  password,
  uuid,
  prefix,
  baseURL,
  receiptToken,
}: GeneratedLink & { prefix: string; baseURL: string }) {
  const { t } = useTranslation();
  const [separateKey, setSeparateKey] = useState(false);
  const { copy, isCopied } = useCopy();
  const shortLink = `${baseURL}/#/${prefix}/${uuid}`;
  const displayedLink = separateKey ? shortLink : `${shortLink}/${password}`;

  return (
    <>
      <div className="space-y-4">
        <div className="font-semibold text-base">
          {t(
            separateKey
              ? 'result.rowLabelShortLink'
              : 'result.rowLabelOneClick',
          )}
        </div>
        <div
          className="flex items-stretch gap-3 min-w-0"
          data-testid="copy-value-row"
        >
          <CopyButton
            copied={isCopied(displayedLink)}
            onClick={() => copy(displayedLink, displayedLink)}
            title={t(
              separateKey
                ? 'result.rowLabelShortLink'
                : 'result.rowLabelOneClick',
            )}
            copyLabel={t('common.copy')}
            copiedLabel={t('common.copied')}
          />
          <ValueBox value={displayedLink} />
        </div>
        {separateKey && (
          <div className="space-y-3" data-testid="separate-decryption-key">
            <div className="font-semibold text-base">
              {t('result.rowLabelDecryptionKey')}
            </div>
            <div
              className="flex items-stretch gap-3 min-w-0"
              data-testid="copy-value-row"
            >
              <CopyButton
                copied={isCopied('key')}
                onClick={() => copy(password, 'key')}
                title={t('result.rowLabelDecryptionKey')}
                copyLabel={t('common.copy')}
                copiedLabel={t('common.copied')}
              />
              <ValueBox value={password} />
            </div>
          </div>
        )}
        <button
          type="button"
          className="btn btn-outline btn-primary h-auto min-h-10 max-w-full py-2 text-wrap"
          aria-pressed={separateKey}
          onClick={() => setSeparateKey(!separateKey)}
        >
          {separateKey ? (
            <LinkIcon className="size-4 shrink-0" />
          ) : (
            <KeyIcon className="size-4 shrink-0" />
          )}
          {t(
            separateKey ? 'result.buttonOneClick' : 'result.buttonSeparateKey',
          )}
        </button>
      </div>
      {receiptToken && <ReceiptStatus uuid={uuid} token={receiptToken} />}
    </>
  );
}

function Result({
  password,
  uuid,
  prefix,
  oneTime,
  receiptToken,
  additionalLinks = [],
}: ResultProps) {
  const { t } = useTranslation();
  const config = useConfig();
  const baseURL = config.PUBLIC_URL
    ? config.PUBLIC_URL.replace(/\/$/, '')
    : window.location.origin;

  return (
    <>
      <div
        className="flex items-center justify-center gap-3 mb-2"
        data-testid="result-heading"
      >
        <CheckCircleIcon className="h-7 w-7 shrink-0 text-success animate-result-icon" />
        <h2 className="bode-result-title text-2xl font-medium text-center tracking-tight animate-result-enter">
          {t('result.title')}
        </h2>
      </div>
      <p
        className="mb-6 text-base text-center animate-result-enter"
        style={{ animationDelay: '50ms' }}
      >
        {t('result.subtitle')}
      </p>
      {oneTime && (
        <div
          className="alert alert-warning mb-6 shadow-sm animate-result-enter"
          style={{ animationDelay: '100ms' }}
        >
          <InfoIcon className="w-6 h-6 shrink-0" />
          <div>
            <div className="font-semibold text-base mb-1">
              {t('result.reminderTitle')}
            </div>
            <div className="text-sm opacity-90">
              {t('result.subtitleDownloadOnce')}
            </div>
          </div>
        </div>
      )}
      {[{ uuid, password, receiptToken }, ...additionalLinks].map(
        (link, index) => (
          <section
            key={link.uuid}
            className="border-t border-base-300 py-6 space-y-4"
            data-testid="generated-link"
          >
            {additionalLinks.length > 0 && (
              <h3 className="font-semibold">
                {t('result.additionalLink', { number: index + 1 })}
              </h3>
            )}
            <SecretLink {...link} prefix={prefix} baseURL={baseURL} />
          </section>
        ),
      )}
      <div className="flex justify-center mt-8">
        <button
          className="btn btn-ghost btn-primary px-8 font-medium transition-all duration-200"
          onClick={() => {
            window.location.href = '/';
          }}
        >
          {t('result.buttonCreateAnother')}
        </button>
      </div>
    </>
  );
}

export default Result;

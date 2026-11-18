import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { encryptMessage } from '@shared/lib/crypto';
import { postSecret } from '@shared/lib/api';
import { saveNewReceipt } from '@shared/lib/receiptStore';
import {
  expirationForSubmission,
  initialExpiration,
  validExpiration,
} from '@shared/lib/expiration';
import { useConfig } from '@shared/hooks/useConfig';
import { useState } from 'react';
import { useSecretForm, type GeneratedLink } from '@shared/hooks/useSecretForm';
import { SecretOptions } from '@shared/components/SecretOptions';
import Result from '@features/display-secret/Result';

export default function CreateSecret() {
  const { t } = useTranslation();
  const config = useConfig();

  const [requireAuth, setRequireAuth] = useState(false);

  const {
    readReceipt,
    setReadReceipt,
    linkCount,
    setLinkCount,
    results,
    setResults,
    getPassword,
  } = useSecretForm();

  type Secret = {
    secret: string;
    expiration: string;
  };
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Secret>({
    defaultValues: {
      expiration: initialExpiration(config),
    },
  });

  const expiration = useWatch({ control, name: 'expiration' });

  async function onSubmit(form: Secret) {
    if (!Number.isInteger(linkCount) || linkCount < 1 || linkCount > 10) return;
    if (!validExpiration(form.expiration, config)) {
      setError('secret', {
        type: 'submit',
        message: t('expiration.invalid', {
          min: config.MIN_EXPIRATION + 's',
          max: config.MAX_EXPIRATION + 's',
        }),
      });
      return;
    }
    if (!form.secret) {
      return;
    }
    const created: GeneratedLink[] = [];
    try {
      for (let index = 0; index < linkCount; index++) {
      const pw = getPassword();
      const encryptedMessage = await encryptMessage(
        form.secret,
        pw,
        config.ARGON2,
      );
      const ttl = expirationForSubmission(form.expiration, config);
      if (ttl === undefined)
        throw new Error(
          t('expiration.invalid', {
            min: config.MIN_EXPIRATION + 's',
            max: config.MAX_EXPIRATION + 's',
          }),
        );
      const { data, status, message } = await postSecret(
        {
          expiration: ttl,
          message: encryptedMessage,
          one_time: true,
          require_auth: requireAuth,
          receipt: config.READ_RECEIPTS && readReceipt,
        },
        config.OIDC_ENABLED,
      );
      if (status !== 200 || !data) {
        throw new Error(message || `HTTP ${status}`);
      } else {
        if (data.receipt_token) {
          // Persist the receipt locally so it stays reachable from the
          // Receipts page after navigating away. The secret link and
          // decryption key are intentionally not stored.
          saveNewReceipt(
            data.message,
            data.receipt_token,
            true,
            ttl,
          );
        }
        created.push({
          password: pw,
          uuid: data.message,
          receiptToken: data.receipt_token,
        });
      }
      }
    } catch (error) {
      setError('secret', {
        type: 'submit',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setResults(created);
    }
  }

  if (results.length) {
    const [result, ...additionalLinks] = results;
    return (
      <>
      {errors.secret && <p role="alert" className="alert alert-error mb-4">{errors.secret.message}</p>}
      <Result
        password={result.password}
        uuid={result.uuid}
        prefix="s"
        customPassword={false}
        oneTime={true}
        receiptToken={result.receiptToken}
        additionalLinks={additionalLinks}
      />
      </>
    );
  }

  return (
    <>
      <h2 className="text-3xl font-medium tracking-tight mb-4">
        {t('create.title')}
      </h2>
      <form
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={event => {
          if (
            event.key !== 'Enter' ||
            !(event.ctrlKey || event.metaKey) ||
            event.altKey ||
            event.shiftKey ||
            event.nativeEvent.isComposing
          ) {
            return;
          }
          event.preventDefault();
          if (!event.repeat && !isSubmitting) {
            event.currentTarget.requestSubmit();
          }
        }}
      >
        {errors.secret && (
          <div
            role="alert"
            className="alert alert-error mb-4 animate-alert-enter"
          >
            <span>{errors.secret.message?.toString()}</span>
          </div>
        )}
        <div className="form-control">
          <label className="label" htmlFor="secret">
            <span className="label-text">{t('create.inputSecretLabel')}</span>
          </label>
          <textarea
            id="secret"
            dir="ltr"
            {...register('secret')}
            className="content-input textarea textarea-bordered w-full min-h-[140px] text-base p-4 resize-y focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-base-100"
            placeholder={t('create.inputSecretPlaceholder')}
            rows={4}
          />
        </div>

        <SecretOptions
          expiration={expiration}
          onExpirationChange={value => setValue('expiration', value)}
          linkCount={linkCount}
          setLinkCount={setLinkCount}
          requireAuth={requireAuth}
          setRequireAuth={setRequireAuth}
          readReceipt={readReceipt}
          setReadReceipt={setReadReceipt}
        />

        <div className="form-control mt-8">
          <button
            className="btn btn-primary w-full h-12 text-base font-semibold transition-all duration-200"
            type="submit"
            aria-keyshortcuts="Control+Enter Meta+Enter"
            disabled={isSubmitting}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 me-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            {t('create.buttonEncrypt')}
          </button>
        </div>
      </form>
    </>
  );
}

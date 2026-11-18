import { useEffect, useState } from 'react';
import { useConfig } from '../hooks/useConfig';
import { useAuth } from '../hooks/useAuth';
import SettingsMenu from './SettingsMenu';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useResponderPage } from '../hooks/useResponderPage';
import { backendDomain } from '../lib/api';
import { countFulfilledRequests } from '../lib/requestStatus';
import { REQUESTS_CHANGED_EVENT } from '../lib/requestStore';

export default function Navbar() {
  const {
    DISABLE_UPLOAD,
    READ_ONLY,
    APP_NAME,
    HIDE_APP_NAME,
    LOGO_URL,
    OIDC_ENABLED,
    SECRET_REQUESTS,
    SECRET_REQUESTS_DRAINING,
    READ_RECEIPTS,
  } = useConfig();
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const responderPage = useResponderPage();
  const [fulfilledCount, setFulfilledCount] = useState(0);

  // Badge with the number of requests whose secret is waiting to be
  // collected. Refreshes on navigation, whenever the local request store
  // changes, and on a slow poll for secrets provided while the tab is open.
  useEffect(() => {
    // The minimal responder header has no badge, so skip the polling there.
    if ((!SECRET_REQUESTS && !SECRET_REQUESTS_DRAINING) || responderPage)
      return;
    let cancelled = false;
    async function refresh() {
      const count = await countFulfilledRequests();
      if (!cancelled) setFulfilledCount(count);
    }
    refresh();
    window.addEventListener(REQUESTS_CHANGED_EVENT, refresh);
    const interval = setInterval(refresh, 30000);
    return () => {
      cancelled = true;
      window.removeEventListener(REQUESTS_CHANGED_EVENT, refresh);
      clearInterval(interval);
    };
  }, [
    SECRET_REQUESTS,
    SECRET_REQUESTS_DRAINING,
    responderPage,
    location.pathname,
  ]);

  const logo = (
    <a
      className="bode-brand flex items-center gap-3 text-xl font-semibold min-w-0"
      href="/"
    >
      <img
        src={LOGO_URL ?? '/bode.png'}
        alt={APP_NAME ?? 'Secret Share'}
        width={44}
        height={44}
        className="size-11 object-contain shrink-0"
      />
      {!HIDE_APP_NAME && (
        <span className="truncate">{APP_NAME ?? 'Secret Share'}</span>
      )}
    </a>
  );

  // The responder page of a secret request gets a minimal header: branding
  // and the settings menu (language, theme), no navigation links.
  if (responderPage) {
    return (
      <header className="bode-header sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center min-w-0">{logo}</div>
            <div className="shrink-0">
              <SettingsMenu />
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bode-header sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center min-w-0">{logo}</div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {!READ_ONLY && (
              <a
                className="bode-nav-link flex items-center gap-2 px-2 sm:px-3 py-2 text-sm font-medium rounded-field transition-colors duration-200"
                href="#/"
                aria-current={location.pathname === '/' ? 'page' : undefined}
                title={t('header.buttonText')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                  />
                </svg>
                <span className="hidden sm:inline">
                  {t('header.buttonText')}
                </span>
              </a>
            )}
            {!READ_ONLY && !DISABLE_UPLOAD && (
              <a
                className="bode-nav-link flex items-center gap-2 px-2 sm:px-3 py-2 text-sm font-medium rounded-field transition-colors duration-200"
                href="#/upload"
                aria-current={
                  location.pathname === '/upload' ? 'page' : undefined
                }
                title={t('header.buttonUpload')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                  />
                </svg>
                <span className="hidden sm:inline">
                  {t('header.buttonUpload')}
                </span>
              </a>
            )}

            {(SECRET_REQUESTS || SECRET_REQUESTS_DRAINING) && (
              <a
                className="bode-nav-link flex items-center gap-2 px-2 sm:px-3 py-2 text-sm font-medium rounded-field transition-colors duration-200"
                aria-current={
                  location.pathname.startsWith('/request') ? 'page' : undefined
                }
                href="#/requests"
                title={t('header.buttonRequests')}
              >
                <span className="indicator">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z"
                    />
                  </svg>
                  {fulfilledCount > 0 && (
                    <span
                      data-testid="requests-badge"
                      className="indicator-item badge badge-error badge-xs px-1.5 font-bold text-error-content"
                      aria-label={t('header.requestsWithCount', {
                        count: fulfilledCount,
                      })}
                    >
                      {fulfilledCount > 9 ? '9+' : fulfilledCount}
                    </span>
                  )}
                </span>
                <span className="hidden sm:inline">
                  {t('header.buttonRequests')}
                </span>
              </a>
            )}

            {READ_RECEIPTS && (
              <a
                className="bode-nav-link flex items-center gap-2 px-2 sm:px-3 py-2 text-sm font-medium rounded-field transition-colors duration-200"
                aria-current={
                  location.pathname.startsWith('/receipts') ? 'page' : undefined
                }
                href="#/receipts"
                title={t('header.buttonReceipts')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
                <span className="hidden sm:inline">
                  {t('header.buttonReceipts')}
                </span>
              </a>
            )}

            {OIDC_ENABLED &&
              (isAuthenticated ? (
                <form method="POST" action={`${backendDomain}/auth/logout`}>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-2 sm:px-3 py-2 text-sm font-medium text-base-content/70 hover:text-base-content hover:bg-base-200 rounded-field transition-all duration-200"
                    title={t('auth.logout')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5 rtl:-scale-x-100"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
                      />
                    </svg>
                    <span className="hidden sm:inline">{t('auth.logout')}</span>
                  </button>
                </form>
              ) : (
                <a
                  href={`${backendDomain}/auth/login`}
                  className="flex items-center gap-2 px-2 sm:px-3 py-2 text-sm font-medium text-base-content/70 hover:text-base-content hover:bg-base-200 rounded-field transition-all duration-200"
                  title={t('auth.login')}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5 rtl:-scale-x-100"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 15l3-3m0 0-3-3m3 3H3.75"
                    />
                  </svg>
                  <span className="hidden sm:inline">{t('auth.login')}</span>
                </a>
              ))}

            <a
              className="bode-home text-sm px-2 py-2"
              href="https://bode.one"
              title="Back to Bode.one"
            >
              <span className="hidden sm:inline">Bode.one</span>
              <span className="sm:hidden" aria-label="Bode.one">
                B.
              </span>
            </a>
            <SettingsMenu />
          </div>
        </div>
      </div>
    </header>
  );
}

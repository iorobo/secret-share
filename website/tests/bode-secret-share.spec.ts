import { test, expect } from '@playwright/test';
import { readMessage, decrypt } from 'openpgp';
import { MockAPI } from './helpers/mock-api';

test.beforeEach(async ({ page }) => {
  await new MockAPI(page).mockConfigEndpoint({
    FORCE_ONETIME_SECRETS: false,
    DEFAULT_ONETIME_SECRETS: false,
    DISABLE_FEATURES: true,
  });
});

test('uses Bode branding and fixed, safe creation options', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Secret Share - Bode.one');
  await expect(page.getByRole('img', { name: 'Secret Share' })).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(3);
  await expect(page.getByRole('radio', { name: 'Three Hours' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'One Day' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'One Week' })).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(
    page.getByRole('combobox', { name: 'Number of links' }),
  ).toHaveValue('1');
});

test('generates independent text links and random keys in the browser', async ({
  page,
}) => {
  const payloads: { message: string; expiration: number; one_time: boolean }[] =
    [];
  await page.route('**/create/secret', async route => {
    payloads.push(route.request().postDataJSON());
    await route.fulfill({ json: { message: `secret-${payloads.length}` } });
  });
  await page.goto('/');
  await page
    .getByRole('textbox', { name: 'Your Secret' })
    .fill('Bode confidential');
  await page
    .getByRole('combobox', { name: 'Number of links' })
    .selectOption('2');
  await page.getByRole('button', { name: 'Encrypt Message' }).click();
  await expect(
    page.getByRole('heading', { name: 'Secret stored securely' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Link 2' })).toBeVisible();
  const codes = await page.locator('code').allTextContents();
  const links = codes.filter(value => /\/#\/s\/secret-\d\//.test(value));
  expect(links).toHaveLength(2);
  const keys = links.map(link => link.split('/').at(-1)!);
  expect(new Set(keys).size).toBe(2);
  expect(payloads).toHaveLength(2);
  for (const [index, payload] of payloads.entries()) {
    expect(payload).toMatchObject({ one_time: true, expiration: 10800 });
    expect(JSON.stringify(payload)).not.toContain(keys[index]);
    const message = await readMessage({ armoredMessage: payload.message });
    const result = await decrypt({
      message,
      passwords: keys[index],
      format: 'utf8',
    });
    expect(result.data).toBe('Bode confidential');
  }
});

test('preserves links already created when a later creation fails', async ({
  page,
}) => {
  let requests = 0;
  await page.route('**/create/secret', async route => {
    requests++;
    await route.fulfill(
      requests === 1
        ? { json: { message: 'first-link' } }
        : { status: 503, json: { message: 'Storage unavailable' } },
    );
  });
  await page.goto('/');
  await page
    .getByRole('textbox', { name: 'Your Secret' })
    .fill('Keep the first link');
  await page
    .getByRole('combobox', { name: 'Number of links' })
    .selectOption('3');
  await page.getByRole('button', { name: 'Encrypt Message' }).click();
  await expect(page.getByRole('alert').first()).toContainText(
    'Storage unavailable',
  );
  await expect(page.locator('code').first()).toContainText('/s/first-link/');
  expect(requests).toBe(2);
});

test('generates independent encrypted file links', async ({ page }) => {
  const uploads: { data: Buffer; headers: Record<string, string> }[] = [];
  await page.route('**/create/file', async route => {
    uploads.push({
      data: route.request().postDataBuffer()!,
      headers: route.request().headers(),
    });
    await route.fulfill({ json: { message: `file-${uploads.length}` } });
  });
  await page.goto('/#/upload');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'bode.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Confidential file'),
  });
  await page
    .getByRole('combobox', { name: 'Number of links' })
    .selectOption('2');
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole('heading', { name: 'Link 2' })).toBeVisible();
  const links = (await page.locator('code').allTextContents()).filter(value =>
    /\/#\/f\/file-\d\//.test(value),
  );
  expect(links).toHaveLength(2);
  const keys = links.map(link => link.split('/').at(-1)!);
  expect(new Set(keys).size).toBe(2);
  for (const [index, upload] of uploads.entries()) {
    expect(upload.headers['x-yopass-onetime']).toBe('true');
    expect(upload.headers['x-yopass-expiration']).toBe('10800');
    const message = await readMessage({
      binaryMessage: new Uint8Array(upload.data),
    });
    const result = await decrypt({
      message,
      passwords: keys[index],
      format: 'utf8',
    });
    expect(result.data).toBe('Confidential file');
    expect(result.filename).toBe('bode.txt');
  }
});

test('offers only whole link counts from one to ten', async ({ page }) => {
  await page.goto('/');
  const selector = page.getByRole('combobox', { name: 'Number of links' });
  await expect(selector).toHaveAccessibleDescription(
    'Sharing the same secret with multiple people? Choose one link per person.',
  );
  await expect(page.getByRole('spinbutton')).toHaveCount(0);
  await expect(selector.locator('option')).toHaveText(
    Array.from({ length: 10 }, (_, index) => String(index + 1)),
  );
  await selector.selectOption('10');
  await expect(selector).toHaveValue('10');
});

for (const theme of ['emerald', 'dim']) {
  test(`uses square Bode buttons in ${theme} mode`, async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await page
      .locator('html')
      .evaluate(
        (element, value) => element.setAttribute('data-theme', value),
        theme,
      );
    const button = page.getByRole('button', { name: 'Encrypt Message' });
    await expect(button).toHaveCSS('border-radius', '0px');
    await expect(button).toHaveCSS(
      'background-color',
      theme === 'emerald' ? 'rgb(0, 43, 62)' : 'rgb(134, 199, 193)',
    );
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(button).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`bode-${theme}-${width}.png`),
        fullPage: true,
        animations: 'disabled',
      });
    }
  });
}

for (const theme of ['emerald', 'dim']) {
  test(`navigation and receipt statuses stay readable in ${theme}`, async ({
    page,
  }, testInfo) => {
    await new MockAPI(page).mockConfigEndpoint({
      READ_RECEIPTS: true,
      DISABLE_FEATURES: true,
    });
    await page.addInitScript(value => {
      localStorage.setItem('themeMode', value === 'dim' ? 'dark' : 'light');
      const now = Math.floor(Date.now() / 1000);
      localStorage.setItem(
        'yopass-read-receipts',
        JSON.stringify([
          {
            id: 'pending',
            token: 'pending-token',
            oneTime: true,
            createdAt: now,
            expiresAt: now + 10800,
            state: 'pending',
          },
          {
            id: 'viewed',
            token: 'viewed-token',
            oneTime: true,
            createdAt: now,
            expiresAt: now + 10800,
            state: 'viewed',
            viewedAt: now,
          },
          {
            id: 'expired',
            token: 'expired-token',
            oneTime: true,
            createdAt: now - 10800,
            expiresAt: now - 1,
            state: 'pending',
          },
        ]),
      );
    }, theme);
    await page.route('**/secret/pending/receipt', route =>
      route.fulfill({
        json: {
          state: 'pending',
          one_time: true,
          created_at: 1,
          expires_at: Math.floor(Date.now() / 1000) + 10800,
        },
      }),
    );
    for (const [path, name] of [
      ['/', 'Text'],
      ['/#/upload', 'Upload'],
      ['/#/receipts', 'Receipts'],
    ]) {
      await page.goto(path);
      const header = page.locator('header');
      for (const label of ['Text', 'Upload', 'Receipts']) {
        await expect(
          header.getByRole('link', { name: label, exact: true }),
        ).toBeVisible();
      }
      const active = header.getByRole('link', { name, exact: true });
      await expect(active).toHaveAttribute('aria-current', 'page');
      await expect(active).toHaveCSS('color', 'rgb(255, 255, 255)');
      await expect(active).toHaveCSS('background-color', 'rgb(18, 68, 84)');
    }
    for (const state of ['pending', 'viewed', 'expired']) {
      await expect(page.getByTestId(`receipt-badge-${state}`)).toBeVisible();
    }
    const contrasts = await page
      .locator('[data-testid^="receipt-badge-"]')
      .evaluateAll(elements =>
        elements.map(element => {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1;
          const context = canvas.getContext('2d')!;
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, 1, 1);
          const ancestors: Element[] = [];
          for (
            let ancestor: Element | null = element;
            ancestor;
            ancestor = ancestor.parentElement
          )
            ancestors.unshift(ancestor);
          for (const ancestor of ancestors) {
            context.fillStyle = getComputedStyle(ancestor).backgroundColor;
            context.fillRect(0, 0, 1, 1);
          }
          const background = context.getImageData(0, 0, 1, 1).data;
          context.fillStyle = getComputedStyle(element).color;
          context.fillRect(0, 0, 1, 1);
          const foreground = context.getImageData(0, 0, 1, 1).data;
          const luminance = (pixels: Uint8ClampedArray) =>
            [0.2126, 0.7152, 0.0722].reduce((sum, weight, index) => {
              const channel = pixels[index] / 255;
              return (
                sum +
                weight *
                  (channel <= 0.04045
                    ? channel / 12.92
                    : ((channel + 0.055) / 1.055) ** 2.4)
              );
            }, 0);
          const values = [luminance(background), luminance(foreground)].sort(
            (first, second) => first - second,
          );
          return (values[1] + 0.05) / (values[0] + 0.05);
        }),
      );
    for (const contrast of contrasts)
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`receipts-${theme}-${width}.png`),
        fullPage: true,
        animations: 'disabled',
      });
    }
  });
}

for (const kind of ['secret', 'file'] as const) {
  test(`switches ${kind} links between one-click and a separate key`, async ({
    page,
    context,
  }, testInfo) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await new MockAPI(page).mockConfigEndpoint({
      DISABLE_ONE_CLICK_LINK: true,
    });
    let created = 0;
    await page.route(`**/create/${kind}`, async route => {
      created++;
      await route.fulfill({ json: { message: `toggle-${created}` } });
    });
    await page.goto(kind === 'file' ? '/#/upload' : '/');
    if (kind === 'file') {
      await page.locator('input[type="file"]').setInputFiles({
        name: 'toggle.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Keep the same secret'),
      });
    } else {
      await page
        .getByRole('textbox', { name: 'Your Secret' })
        .fill('Keep the same secret');
    }
    await page
      .getByRole('combobox', { name: 'Number of links' })
      .selectOption('2');
    await page.locator('button[type="submit"]').click();
    const links = page.getByTestId('generated-link');
    await expect(links).toHaveCount(2);
    const first = links.first();
    const original = (await first.locator('code').textContent())!;
    const second = await links.nth(1).locator('code').textContent();
    const short = original.slice(0, original.lastIndexOf('/'));
    const key = original.slice(original.lastIndexOf('/') + 1);
    expect(new URL(original).hash.split('/')).toHaveLength(4);
    async function expectMatchingCopyHeights() {
      const dimensions = await first
        .getByTestId('copy-value-row')
        .evaluateAll(rows =>
          rows.map(row => {
            const button = row.querySelector('button')!.getBoundingClientRect();
            const box = row.lastElementChild!.getBoundingClientRect();
            return {
              buttonHeight: button.height,
              boxHeight: box.height,
              buttonTop: button.top,
              boxTop: box.top,
            };
          }),
        );
      for (const size of dimensions) {
        expect(Math.abs(size.buttonHeight - size.boxHeight)).toBeLessThan(1);
        expect(Math.abs(size.buttonTop - size.boxTop)).toBeLessThan(1);
      }
    }
    for (const theme of ['emerald', 'dim']) {
      await page
        .locator('html')
        .evaluate(
          (element, value) => element.setAttribute('data-theme', value),
          theme,
        );
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(page.getByTestId('separate-decryption-key')).toHaveCount(
          0,
        );
        await expectMatchingCopyHeights();
        await page.screenshot({
          path: testInfo.outputPath(`${kind}-${theme}-${width}-one-click.png`),
          fullPage: true,
          animations: 'disabled',
        });
        const heading = page.getByTestId('result-heading');
        const iconBox = (await heading.locator('svg').boundingBox())!;
        const titleBox = (await heading.getByRole('heading').boundingBox())!;
        expect(
          Math.abs(
            iconBox.y + iconBox.height / 2 - titleBox.y - titleBox.height / 2,
          ),
        ).toBeLessThan(1);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await first
          .getByRole('button', { name: 'Share decryption key separately' })
          .click();
        await expect(first.locator('code')).toHaveText([short, key]);
        await expect(links.nth(1).locator('code')).toHaveText(second!);
        await first
          .getByRole('button', { name: 'Copy', exact: true })
          .first()
          .click();
        await expect
          .poll(() => page.evaluate(() => navigator.clipboard.readText()))
          .toBe(short);
        await expectMatchingCopyHeights();
        await page.screenshot({
          path: testInfo.outputPath(`${kind}-${theme}-${width}-separate.png`),
          fullPage: true,
          animations: 'disabled',
        });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await first.getByRole('button', { name: 'Use one-click link' }).click();
        await expect(first.locator('code')).toHaveText(original);
        await first.getByRole('button', { name: 'Copy', exact: true }).click();
        await expect
          .poll(() => page.evaluate(() => navigator.clipboard.readText()))
          .toBe(original);
      }
    }
    expect(created).toBe(2);
  });

  test(`keeps independent receipts for generated ${kind} links`, async ({
    page,
  }) => {
    await new MockAPI(page).mockConfigEndpoint({
      READ_RECEIPTS: true,
      DEFAULT_READ_RECEIPT: true,
      DISABLE_FEATURES: true,
    });
    let created = 0;
    await page.route(`**/create/${kind}`, async route => {
      if (kind === 'file') {
        expect(route.request().headers()['x-yopass-receipt']).toBe('true');
      } else {
        expect(route.request().postDataJSON()).toMatchObject({
          receipt: true,
          one_time: true,
        });
      }
      created++;
      await route.fulfill({
        json: {
          message: `receipt-secret-${created}`,
          receipt_token: `token-${created}`,
        },
      });
    });
    await page.route('**/secret/*/receipt', async route => {
      const id = route.request().url().split('/').at(-2)!;
      expect(route.request().headers()['x-yopass-receipt-token']).toBe(
        `token-${id.split('-').at(-1)}`,
      );
      await route.fulfill({
        json: {
          state: 'pending',
          one_time: true,
          created_at: Math.floor(Date.now() / 1000),
          expires_at: Math.floor(Date.now() / 1000) + 10800,
        },
      });
    });
    await page.goto(kind === 'file' ? '/#/upload' : '/');
    await expect(
      page.getByRole('checkbox', { name: /Read receipt/ }),
    ).toBeChecked();
    await expect(
      page.getByRole('link', { name: 'Receipts', exact: true }),
    ).toBeVisible();
    if (kind === 'file') {
      await page.locator('input[type="file"]').setInputFiles({
        name: 'receipt.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Receipt test'),
      });
    } else {
      await page
        .getByRole('textbox', { name: 'Your Secret' })
        .fill('Receipt test');
    }
    await page
      .getByRole('combobox', { name: 'Number of links' })
      .selectOption('2');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByTestId('receipt-status-pending')).toHaveCount(2);
    await page.getByRole('link', { name: 'Receipts', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible();
    await expect(page.getByText('Not opened', { exact: true })).toHaveCount(2);
  });

  test(`live Memcached: independent one-time ${kind} links`, async ({
    page,
  }, testInfo) => {
    test.skip(
      process.env.BODE_LIVE !== '1',
      'Requires the Go and Memcached Compose stack',
    );
    await page.unrouteAll();
    for (const expiration of ['Three Hours', 'One Day', 'One Week']) {
      await page.goto(kind === 'file' ? '/#/upload' : '/');
      if (kind === 'file') {
        await page.locator('input[type="file"]').setInputFiles({
          name: 'bode-live.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('Bode live confidential'),
        });
      } else {
        await page
          .getByRole('textbox', { name: 'Your Secret' })
          .fill('Bode live confidential');
      }
      await page.getByRole('radio', { name: expiration }).check();
      await page
        .getByRole('combobox', { name: 'Number of links' })
        .selectOption('2');
      if (expiration === 'Three Hours') {
        for (const viewport of [
          { width: 1440, height: 900 },
          { width: 390, height: 844 },
        ]) {
          await page.setViewportSize(viewport);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          await page.screenshot({
            path: testInfo.outputPath(`${kind}-${viewport.width}.png`),
            fullPage: true,
          });
        }
      }
      await page.locator('button[type="submit"]').click();
      await expect(page.getByRole('heading', { name: 'Link 2' })).toBeVisible();
      const links = (await page.locator('code').allTextContents()).filter(
        value => /\/#\/[sf]\/[^/]+\/[^/]+$/.test(value),
      );
      expect(links).toHaveLength(2);
      const parts = links.map(link => new URL(link).hash.split('/'));
      expect(new Set(parts.map(part => part[2])).size).toBe(2);
      expect(new Set(parts.map(part => part[3])).size).toBe(2);
      for (const [, , id, key] of parts) {
        const status = await page.request.get(`/${kind}/${id}/status`);
        expect(status.ok()).toBe(true);
        expect(await status.json()).toMatchObject({ oneTime: true });
        const attempts = await Promise.all(
          Array.from({ length: 5 }, () => page.request.get(`/${kind}/${id}`)),
        );
        expect(attempts.map(response => response.status()).sort()).toEqual([
          200, 404, 404, 404, 404,
        ]);
        const response = attempts.find(attempt => attempt.status() === 200)!;
        const message =
          kind === 'file'
            ? await readMessage({
                binaryMessage: new Uint8Array(await response.body()),
              })
            : await readMessage({
                armoredMessage: (await response.json()).message,
              });
        const decrypted = await decrypt({
          message,
          passwords: key,
          format: 'utf8',
        });
        expect(decrypted.data).toBe('Bode live confidential');
      }
      await page.getByRole('button', { name: 'Create another secret' }).click();
    }
  });
}

import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('E2E-01 dashboard shows fleet summary and alerts from the API', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByTestId('stat-total')).toContainText('6');
  await expect(page.getByTestId('stat-online')).toContainText('4');
  await expect(page.getByTestId('alerts')).toContainText('Drone-Beta');
  await expect(page.getByTestId('api-status')).toHaveText('API connected');
});

test('E2E-02 register a new device end-to-end', async ({ page }) => {
  await page.goto('/#/devices');
  await page.getByRole('button', { name: '+ Register device' }).click();
  const dialog = page.getByRole('dialog', { name: 'Register new device' });
  await dialog.getByPlaceholder('e.g. Rover-Theta').fill('Rover-Theta');
  await dialog.getByPlaceholder('192.168.1.50').fill('999.1.1.1');
  await dialog.getByRole('button', { name: 'Register device' }).click();
  await expect(dialog.getByText('Enter a valid IPv4 address')).toBeVisible(); // client-side validation

  await dialog.getByPlaceholder('192.168.1.50').fill('192.168.1.10'); // already used by DEV-001
  await dialog.getByRole('button', { name: 'Register device' }).click();
  await expect(dialog.getByRole('alert')).toContainText('already assigned to DEV-001'); // server-side rule

  await dialog.getByPlaceholder('192.168.1.50').fill('192.168.1.77');
  await dialog.getByRole('button', { name: 'Register device' }).click();
  await expect(page.getByRole('status')).toContainText('Rover-Theta registered as DEV-007');
  await expect(page.getByTestId('device-table')).toContainText('Rover-Theta');
});

test('E2E-03 search and filter the device list', async ({ page }) => {
  await page.goto('/#/devices');
  const rows = page.getByTestId('device-table').locator('tbody tr');
  await expect(rows).toHaveCount(7);
  await page.getByLabel('Search devices').fill('rover');
  await expect(rows).toHaveCount(3);
  await page.getByLabel('Filter by status').selectOption('Offline');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('No devices match');
});

test('E2E-04 status change requires a reason for Maintenance and is audited', async ({ page }) => {
  await page.goto('/#/devices/DEV-001');
  await page.getByRole('button', { name: 'Update status' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByText('Maintenance').first().click();
  await dialog.getByRole('button', { name: 'Confirm change' }).click();
  await expect(dialog.getByRole('alert')).toContainText('reason is required');
  await dialog.getByPlaceholder('e.g. Scheduled firmware upgrade').fill('Wheel motor replacement');
  await dialog.getByRole('button', { name: 'Confirm change' }).click();
  await expect(page.getByRole('status')).toContainText('Rover-Alpha is now Maintenance');
  await expect(page.getByTestId('history')).toContainText('Online → Maintenance');
  await expect(page.getByTestId('history')).toContainText('Wheel motor replacement');
});

test('E2E-05 reboot is disabled for offline devices and works for others', async ({ page }) => {
  await page.goto('/#/devices/DEV-002');
  await expect(page.getByRole('button', { name: '↻ Reboot' })).toBeDisabled();
  await page.goto('/#/devices/DEV-001');
  await page.getByRole('button', { name: '↻ Reboot' }).click();
  await expect(page.getByRole('status')).toContainText('Reboot issued to Rover-Alpha');
  await expect(page.getByTestId('history')).toContainText('Reboot');
});

test('E2E-06 delete a device after confirmation', async ({ page }) => {
  await page.goto('/#/devices');
  const row = page.getByTestId('device-table').locator('tr', { hasText: 'Truck-Zeta' });
  await row.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remove device' }).click();
  await expect(page.getByRole('status')).toContainText('Truck-Zeta removed');
  await expect(page.getByTestId('device-table')).not.toContainText('Truck-Zeta');
});

test('E2E-07 settings: test connection and persist dark theme', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'Test connection' }).click();
  await expect(page.getByTestId('connection-check')).toHaveText(/^Connected · API v\d+\.\d+\.\d+$/);
  await page.getByRole('radio', { name: '☾ Dark' }).click();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

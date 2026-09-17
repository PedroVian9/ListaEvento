import { expect, test } from '@playwright/test'

test('valor do presente: cadastro, visual, edição e remoção', async ({ page }, testInfo) => {
  test.setTimeout(120000)
  const name = `Presente com valor ${testInfo.project.name}-${Date.now()}`
  await page.route('https://example.com/**', route => route.abort())
  await page.request.post('/api/admin/auth/login', { data: { username: 'browser-test', password: 'browser-test-only-password' } })
  const guestResponse = await page.request.post('/api/admin/convidados', { data: { nome: name } })
  expect(guestResponse.ok()).toBeTruthy()
  const guest = await guestResponse.json()
  await page.goto('/admin/presentes')
  await page.getByRole('button', { name: 'Novo presente', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel(/^Nome/).fill(name)
  await dialog.getByLabel(/^URL da imagem/).fill('https://example.com/presente.jpg')
  await dialog.getByLabel('Valor sugerido (opcional)').fill('129,90')
  await expect(dialog.getByText(/R\$\s*129,90/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Salvar presente' }).click()
  await expect(dialog).not.toBeVisible()
  const card = page.locator('.MuiCard-root').filter({ has: page.getByRole('heading', { name, exact: true }) })
  await expect(card.getByText(/R\$\s*129,90/)).toBeVisible()

  const openInvitation = async () => {
    await page.goto(`/convite/${guest.slug}`)
    await page.getByLabel('Buscar presente', { exact: true }).fill(name)
  }
  await openInvitation()
  await expect(card.getByText('Valor sugerido · unidade')).toBeVisible()
  await expect(card.getByText(/R\$\s*129,90/)).toBeVisible()
  await card.screenshot({ path: testInfo.outputPath('presente-valor.png') })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  for (const value of ['999999,99', '0', '']) {
    await page.goto('/admin/presentes')
    await card.getByRole('button', { name: 'Editar', exact: true }).click()
    if (value === '999999,99') await expect(dialog.getByLabel('Valor sugerido (opcional)')).toHaveValue('129,90')
    await dialog.getByLabel('Valor sugerido (opcional)').fill(value)
    await dialog.getByRole('button', { name: 'Salvar presente' }).click()
    await expect(dialog).not.toBeVisible()
    await openInvitation()
    if (value === '') await expect(card.getByText('Valor sugerido · unidade')).toHaveCount(0)
    else await expect(card.getByText(value === '0' ? /R\$\s*0,00/ : /R\$\s*999\.999,99/)).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
})

import { expect, test } from '@playwright/test'
import type { Gift } from '../src/types'

test('faixas de preço combinam com busca e disponibilidade', async ({ page }, testInfo) => {
  const values = ['0.00', '50.00', '50.01', '100.00', '100.01', '200.00', '200.01', '500.00', '500.01', null]
  const gifts: Gift[] = values.map((valor, id) => ({
    id, nome: `Presente ${id}`, valor, descricao: '', imagem_url: '', produto_url: '',
    quantidade_desejada: 1, quantidade_comprada: id === 1 ? 1 : 0, quantidade_restante: id === 1 ? 0 : 1,
    completo: id === 1, ativo: true, ordem: id,
  }))
  const event = await (await page.request.get('/api/evento')).json()
  await page.route('**/api/convites/precos', route => route.fulfill({ json: {
    nome: 'Convidado', status_presenca: 'PENDENTE', quantidade_acompanhantes: 0,
    evento: event, membros: [], convite_familiar: false, quantidade_confirmados: 0,
  } }))
  await page.route('**/api/convites/precos/presentes', route => route.fulfill({ json: gifts }))
  await page.goto('/convite/precos')
  const list = page.locator('#presentes')
  const titles = list.getByRole('heading', { level: 6 })
  await expect(titles).toHaveCount(10)
  const selectPrice = async (label: string) => {
    await page.getByRole('combobox', { name: 'Faixa de preço' }).click()
    await page.getByRole('option', { name: label, exact: true }).click()
  }
  await selectPrice('Até R$ 50')
  await expect(titles).toHaveText(['Presente 0', 'Presente 1'])
  await page.getByRole('tab', { name: 'Disponíveis', exact: true }).click()
  await expect(titles).toHaveText(['Presente 0'])
  await page.getByRole('tab', { name: 'Completos', exact: true }).click()
  await expect(titles).toHaveText(['Presente 1'])
  await page.getByLabel('Buscar presente', { exact: true }).fill('Presente 0')
  await expect(list.getByText('Nenhum presente encontrado')).toBeVisible()
  await list.getByRole('button', { name: 'Limpar filtros' }).click()
  await expect(titles).toHaveCount(10)
  await expect(page.getByLabel('Buscar presente', { exact: true })).toHaveValue('')
  await expect(page.getByRole('combobox', { name: 'Faixa de preço' })).toHaveText('Todos os preços')

  for (const [label, names] of [
    ['R$ 50,01 a R$ 100', ['Presente 2', 'Presente 3']],
    ['R$ 100,01 a R$ 200', ['Presente 4', 'Presente 5']],
    ['R$ 200,01 a R$ 500', ['Presente 6', 'Presente 7']],
    ['Acima de R$ 500', ['Presente 8']],
    ['Sem preço informado', ['Presente 9']],
  ] as const) {
    await selectPrice(label)
    await expect(titles).toHaveText([...names])
  }
  await selectPrice('R$ 50,01 a R$ 100')
  await page.getByLabel('Buscar presente', { exact: true }).fill('Presente 3')
  await expect(titles).toHaveText(['Presente 3'])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await list.screenshot({ path: testInfo.outputPath('filtro-preco.png') })
})

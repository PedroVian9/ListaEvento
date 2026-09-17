import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, InputAdornment, LinearProgress, Menu, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material'
import { Add, EditOutlined, MoreVert, Search } from '@mui/icons-material'
import { api, json, message, useResource } from '../api'
import { ConfirmDialog, Empty, ErrorState, Loading, ProductImage, useToast } from '../components'
import type { Gift, GiftInput } from '../types'
import { GiftValue } from '../GiftValue'

const blank: GiftInput = { nome: '', descricao: '', imagem_url: '', produto_url: '', valor: null, quantidade_desejada: 1, ordem: 0, ativo: true }
export function GiftsPage() {
  const { data, error, loading, refresh } = useResource<Gift[]>('/admin/presentes')
  const [editing, setEditing] = useState<Gift | 'new' | null>(null)
  const [form, setForm] = useState<GiftInput>(blank)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('todos')
  const [confirm, setConfirm] = useState<Gift | null>(null)
  const [menu, setMenu] = useState<{ anchor: HTMLElement; gift: Gift } | null>(null)
  const toast = useToast()
  function openForm(gift?: Gift) {
    setEditing(gift || 'new'); setForm(gift ? { nome: gift.nome, descricao: gift.descricao, imagem_url: gift.imagem_url, produto_url: gift.produto_url, valor: gift.valor?.replace('.', ',') ?? null, quantidade_desejada: gift.quantidade_desejada, ordem: gift.ordem, ativo: gift.ativo } : { ...blank }); setFormError('')
  }
  const valueText = form.valor?.trim() || ''
  const validValue = /^\d{1,6}([,.]\d{1,2})?$/.test(valueText)
  const value = validValue ? valueText.replace(',', '.') : null
  async function save(e: FormEvent) {
    e.preventDefault(); setFormError('')
    if (valueText && !validValue) { setFormError('Informe um valor de 0 a 999999,99, com até duas casas decimais e sem separador de milhar.'); return }
    setBusy(true)
    try { await api(`/admin/presentes${editing !== 'new' && editing ? `/${editing.id}` : ''}`, json(editing === 'new' ? 'POST' : 'PUT', { ...form, valor: value })); setEditing(null); refresh(); toast('Presente salvo com sucesso!') }
    catch (e) { setFormError(message(e)) } finally { setBusy(false) }
  }
  async function deactivate() {
    if (!confirm) return
    setBusy(true)
    try { await api(`/admin/presentes/${confirm.id}`, json('DELETE')); setConfirm(null); refresh(); toast('Presente desativado. O histórico foi preservado.') }
    catch (e) { toast(message(e), true) } finally { setBusy(false) }
  }
  const filtered = data?.filter(g => g.nome.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')) && (filter === 'todos' || (filter === 'ativos' ? g.ativo : !g.ativo))) || []
  const field = (key: keyof GiftInput, value: string | number | boolean) => setForm(f => ({ ...f, [key]: value }))
  return <Stack gap={3}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}><Box><Typography variant="h3">Presentes</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Sugestões para deixar a nova casa com a nossa cara.</Typography></Box><Button variant="contained" startIcon={<Add />} onClick={() => openForm()}>Novo presente</Button></Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><TextField label="Buscar presente" size="small" value={search} onChange={e => setSearch(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} /><TextField select size="small" label="Exibir" value={filter} onChange={e => setFilter(e.target.value)} sx={{ maxWidth: { sm: 190 } }}><MenuItem value="todos">Todos</MenuItem><MenuItem value="ativos">Ativos</MenuItem><MenuItem value="inativos">Inativos</MenuItem></TextField></Stack>
    {loading && !data ? <Loading /> : error ? <ErrorState error={error} retry={refresh} /> : !data?.length ? <Empty title="O começo da nossa casa" description="Adicione os presentes que vocês gostariam de ganhar. Os convidados também poderão escolher produtos similares." action={<Button startIcon={<Add />} onClick={() => openForm()}>Adicionar presente</Button>} /> : !filtered.length ? <Empty title="Nenhum presente encontrado" /> :
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 2.5 }}>{filtered.map(gift => <Card key={gift.id} sx={{ opacity: gift.ativo ? 1 : .7 }}><ProductImage url={gift.imagem_url} name={gift.nome} /><CardContent>
        <Stack direction="row" justifyContent="space-between" gap={1} alignItems="start"><Typography variant="h5">{gift.nome}</Typography><Chip size="small" label={!gift.ativo ? 'Inativo' : gift.completo ? 'Completo' : `Faltam ${gift.quantidade_restante}`} color={!gift.ativo ? 'default' : gift.completo ? 'success' : 'primary'} variant="outlined" /></Stack>
        <GiftValue value={gift.valor} />
        <Typography color="text.secondary" variant="body2" sx={{ mt: 2, mb: 1 }}>{gift.quantidade_comprada} de {gift.quantidade_desejada} comprados</Typography><LinearProgress variant="determinate" value={Math.min(100, gift.quantidade_comprada / gift.quantidade_desejada * 100)} />
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}><Typography variant="caption" color="text.secondary">Ordem: {gift.ordem}</Typography><Stack direction="row"><Button startIcon={<EditOutlined />} onClick={() => openForm(gift)}>Editar</Button><IconButton aria-label={`Mais ações para ${gift.nome}`} onClick={e => setMenu({ anchor: e.currentTarget, gift })}><MoreVert /></IconButton></Stack></Stack>
      </CardContent></Card>)}</Box>}
    <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}><MenuItem disabled={!menu?.gift.ativo} onClick={() => { if (menu) { setConfirm(menu.gift); setMenu(null) } }}>Desativar presente</MenuItem></Menu>
    <ConfirmDialog open={!!confirm} busy={busy} title="Desativar presente?" description="O presente deixará de aparecer no convite. As compras serão preservadas e você poderá reativá-lo ao editar." action="Desativar" onClose={() => setConfirm(null)} onConfirm={deactivate} />
    <Dialog open={!!editing} onClose={busy ? undefined : () => setEditing(null)}><Box component="form" onSubmit={save}><DialogTitle>{editing === 'new' ? 'Novo presente' : 'Editar presente'}</DialogTitle><DialogContent><Stack gap={2.5} sx={{ pt: 1 }}>
      {formError && <Alert severity="error">{formError}</Alert>}<TextField autoFocus required label="Nome" value={form.nome} onChange={e => field('nome', e.target.value)} inputProps={{ maxLength: 150 }} /><TextField label="Descrição" multiline minRows={2} value={form.descricao} onChange={e => field('descricao', e.target.value)} inputProps={{ maxLength: 2000 }} />
      <TextField label="Valor sugerido (opcional)" value={form.valor ?? ''} onChange={e => field('valor', e.target.value)} inputProps={{ inputMode: 'decimal', maxLength: 12 }} slotProps={{ input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> } }} helperText="Valor por unidade. Ex.: 129,90. Deixe vazio para não exibir preço na lista." />
      {value !== null && <Box><Typography variant="caption" color="text.secondary">Prévia na lista</Typography><GiftValue value={value} /></Box>}
      <TextField required type="url" label="URL da imagem" value={form.imagem_url} onChange={e => field('imagem_url', e.target.value)} helperText="Use um endereço público de imagem (http ou https)." inputProps={{ maxLength: 2048 }} />
      {/^https?:\/\//i.test(form.imagem_url) && <Box sx={{ width: 170, alignSelf: 'center', borderRadius: 2, overflow: 'hidden' }}><ProductImage url={form.imagem_url} name="Prévia da imagem" compact /></Box>}
      <TextField type="url" label="URL da sugestão de compra" value={form.produto_url} onChange={e => field('produto_url', e.target.value)} inputProps={{ maxLength: 2048 }} /><Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><TextField required type="number" label="Quantidade desejada" value={form.quantidade_desejada} inputProps={{ min: editing && editing !== 'new' ? Math.max(1, editing.quantidade_comprada) : 1, max: 10000, step: 1 }} onChange={e => field('quantidade_desejada', Number(e.target.value))} /><TextField required type="number" label="Ordem" value={form.ordem} inputProps={{ min: 0, max: 10000, step: 1 }} onChange={e => field('ordem', Number(e.target.value))} /></Stack>
      <FormControlLabel control={<Switch checked={form.ativo} onChange={e => field('ativo', e.target.checked)} />} label="Ativo na lista de presentes" />
    </Stack></DialogContent><DialogActions><Button onClick={() => setEditing(null)} disabled={busy}>Cancelar</Button><Button type="submit" variant="contained" disabled={busy}>{busy ? 'Salvando…' : 'Salvar presente'}</Button></DialogActions></Box></Dialog>
  </Stack>
}

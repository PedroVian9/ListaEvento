import { useRef, useState, type FormEvent, type PointerEvent } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, InputAdornment, LinearProgress, Menu, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material'
import { Add, DragIndicator, EditOutlined, MoreVert, Search } from '@mui/icons-material'
import { api, json, message, useResource } from '../api'
import { ConfirmDialog, Empty, ErrorState, Loading, ProductImage, useToast } from '../components'
import type { Gift, GiftInput } from '../types'

const blank: GiftInput = { nome: '', descricao: '', imagem_url: '', produto_url: '', quantidade_desejada: 1, ordem: 0, ativo: true }
export function GiftsPage() {
  const { data, setData, error, loading, refresh } = useResource<Gift[]>('/admin/presentes')
  const [ordering, setOrdering] = useState(false)
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  const dragged = useRef<number | null>(null)
  const orderPending = useRef(false)
  const [editing, setEditing] = useState<Gift | 'new' | null>(null)
  const [form, setForm] = useState<GiftInput>(blank)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('todos')
  const [confirm, setConfirm] = useState<Gift | null>(null)
  const [menu, setMenu] = useState<{ anchor: HTMLElement; gift: Gift } | null>(null)
  const toast = useToast()
  const canOrder = !ordering && !busy && !loading && !search && filter === 'todos'
  async function moveGift(from: number, to: number) {
    if (!data || !canOrder || orderPending.current || from === to) return
    const next = [...data]
    const source = next.findIndex(g => g.id === from)
    const target = next.findIndex(g => g.id === to)
    if (source < 0 || target < 0) return
    next.splice(target, 0, next.splice(source, 1)[0])
    orderPending.current = true
    setOrdering(true)
    try {
      setData(await api<Gift[]>('/admin/presentes/ordem', json('PUT', { ids: next.map(g => g.id) })))
      toast('Ordem dos presentes salva!')
    } catch (e) { toast(message(e), true); refresh() }
    finally { orderPending.current = false; setOrdering(false) }
  }
  function targetAt(e: PointerEvent<HTMLElement>) {
    const card = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-gift-id]')
    return card ? Number(card.getAttribute('data-gift-id')) : null
  }
  function openForm(gift?: Gift) {
    setEditing(gift || 'new'); setForm(gift ? { nome: gift.nome, descricao: gift.descricao, imagem_url: gift.imagem_url, produto_url: gift.produto_url, quantidade_desejada: gift.quantidade_desejada, ordem: gift.ordem, ativo: gift.ativo } : { ...blank }); setFormError('')
  }
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setFormError('')
    try { await api(`/admin/presentes${editing !== 'new' && editing ? `/${editing.id}` : ''}`, json(editing === 'new' ? 'POST' : 'PUT', form)); setEditing(null); refresh(); toast('Presente salvo com sucesso!') }
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
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}><Box><Typography variant="h3">Presentes</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Sugestões para deixar a nova casa com a nossa cara.</Typography></Box><Button variant="contained" startIcon={<Add />} disabled={ordering} onClick={() => openForm()}>Novo presente</Button></Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><TextField label="Buscar presente" size="small" value={search} onChange={e => setSearch(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} /><TextField select size="small" label="Exibir" value={filter} onChange={e => setFilter(e.target.value)} sx={{ maxWidth: { sm: 190 } }}><MenuItem value="todos">Todos</MenuItem><MenuItem value="ativos">Ativos</MenuItem><MenuItem value="inativos">Inativos</MenuItem></TextField></Stack>
    {loading && !data ? <Loading /> : error ? <ErrorState error={error} retry={refresh} /> : !data?.length ? <Empty title="O começo da nossa casa" description="Adicione os presentes que vocês gostariam de ganhar. Os convidados também poderão escolher produtos similares." action={<Button startIcon={<Add />} disabled={ordering} onClick={() => openForm()}>Adicionar presente</Button>} /> : !filtered.length ? <Empty title="Nenhum presente encontrado" /> :
      <Stack gap={2}>
      <Typography id="gift-order-help" variant="body2" color="text.secondary" role="status">{ordering ? 'Salvando ordem…' : search || filter !== 'todos' ? 'Limpe a busca e exiba todos os presentes para ordenar.' : 'Arraste pelo ícone para ordenar. No teclado, use as setas com o ícone selecionado.'}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 2.5 }}>{filtered.map((gift, index) => <Card key={gift.id} data-gift-id={gift.id} sx={{ opacity: gift.ativo ? 1 : .7, outline: dropTarget === gift.id ? '2px solid' : 'none', outlineColor: 'primary.main' }}>
        <Stack direction="row" alignItems="center" gap={1} sx={{ px: 1 }}>
          <IconButton aria-label={`Ordenar ${gift.nome}`} aria-describedby="gift-order-help" disabled={!canOrder} sx={{ touchAction: 'none', cursor: 'grab' }}
            onPointerDown={e => { if (!canOrder || e.button !== 0) return; dragged.current = gift.id; e.currentTarget.setPointerCapture(e.pointerId); setDropTarget(gift.id) }}
            onPointerMove={e => { if (dragged.current === null) return; setDropTarget(targetAt(e)); if (e.clientY < 80) window.scrollBy(0, -20); else if (e.clientY > window.innerHeight - 80) window.scrollBy(0, 20) }}
            onPointerUp={e => { const from = dragged.current; const to = targetAt(e); dragged.current = null; setDropTarget(null); if (from !== null && to !== null) void moveGift(from, to) }}
            onPointerCancel={() => { dragged.current = null; setDropTarget(null) }}
            onLostPointerCapture={() => { dragged.current = null; setDropTarget(null) }}
            onKeyDown={e => { const delta = ['ArrowUp', 'ArrowLeft'].includes(e.key) ? -1 : ['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : 0; if (!delta) return; e.preventDefault(); const target = filtered[index + delta]; if (target) void moveGift(gift.id, target.id) }}
          ><DragIndicator /></IconButton><Typography variant="caption" color="text.secondary">Posição {index + 1}</Typography>
        </Stack>
        <ProductImage url={gift.imagem_url} name={gift.nome} /><CardContent>
        <Stack direction="row" justifyContent="space-between" gap={1} alignItems="start"><Typography variant="h5">{gift.nome}</Typography><Chip size="small" label={!gift.ativo ? 'Inativo' : gift.completo ? 'Completo' : `Faltam ${gift.quantidade_restante}`} color={!gift.ativo ? 'default' : gift.completo ? 'success' : 'primary'} variant="outlined" /></Stack>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 2, mb: 1 }}>{gift.quantidade_comprada} de {gift.quantidade_desejada} comprados</Typography><LinearProgress variant="determinate" value={Math.min(100, gift.quantidade_comprada / gift.quantidade_desejada * 100)} />
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}><Typography variant="caption" color="text.secondary">Ordem: {gift.ordem}</Typography><Stack direction="row"><Button startIcon={<EditOutlined />} disabled={ordering} onClick={() => openForm(gift)}>Editar</Button><IconButton aria-label={`Mais ações para ${gift.nome}`} disabled={ordering} onClick={e => setMenu({ anchor: e.currentTarget, gift })}><MoreVert /></IconButton></Stack></Stack>
      </CardContent></Card>)}</Box></Stack>}
    <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}><MenuItem disabled={!menu?.gift.ativo} onClick={() => { if (menu) { setConfirm(menu.gift); setMenu(null) } }}>Desativar presente</MenuItem></Menu>
    <ConfirmDialog open={!!confirm} busy={busy} title="Desativar presente?" description="O presente deixará de aparecer no convite. As compras serão preservadas e você poderá reativá-lo ao editar." action="Desativar" onClose={() => setConfirm(null)} onConfirm={deactivate} />
    <Dialog open={!!editing} onClose={busy ? undefined : () => setEditing(null)}><Box component="form" onSubmit={save}><DialogTitle>{editing === 'new' ? 'Novo presente' : 'Editar presente'}</DialogTitle><DialogContent><Stack gap={2.5} sx={{ pt: 1 }}>
      {formError && <Alert severity="error">{formError}</Alert>}<TextField autoFocus required label="Nome" value={form.nome} onChange={e => field('nome', e.target.value)} inputProps={{ maxLength: 150 }} /><TextField label="Descrição" multiline minRows={2} value={form.descricao} onChange={e => field('descricao', e.target.value)} inputProps={{ maxLength: 2000 }} />
      <TextField required type="url" label="URL da imagem" value={form.imagem_url} onChange={e => field('imagem_url', e.target.value)} helperText="Use um endereço público de imagem (http ou https)." inputProps={{ maxLength: 2048 }} />
      {/^https?:\/\//i.test(form.imagem_url) && <Box sx={{ width: 170, alignSelf: 'center', borderRadius: 2, overflow: 'hidden' }}><ProductImage url={form.imagem_url} name="Prévia da imagem" compact /></Box>}
      <TextField type="url" label="URL da sugestão de compra" value={form.produto_url} onChange={e => field('produto_url', e.target.value)} inputProps={{ maxLength: 2048 }} /><Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><TextField required type="number" label="Quantidade desejada" value={form.quantidade_desejada} inputProps={{ min: editing && editing !== 'new' ? Math.max(1, editing.quantidade_comprada) : 1, max: 10000, step: 1 }} onChange={e => field('quantidade_desejada', Number(e.target.value))} />{editing !== 'new' && <TextField required type="number" label="Ordem" value={form.ordem} inputProps={{ min: 0, step: 1 }} onChange={e => field('ordem', Number(e.target.value))} />}</Stack>
      <FormControlLabel control={<Switch checked={form.ativo} onChange={e => field('ativo', e.target.checked)} />} label="Ativo na lista de presentes" />
    </Stack></DialogContent><DialogActions><Button onClick={() => setEditing(null)} disabled={busy}>Cancelar</Button><Button type="submit" variant="contained" disabled={busy}>{busy ? 'Salvando…' : 'Salvar presente'}</Button></DialogActions></Box></Dialog>
  </Stack>
}

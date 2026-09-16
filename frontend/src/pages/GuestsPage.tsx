import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, Menu, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { Add, ContentCopy, DeleteOutline, EditOutlined, MoreVert, Search } from '@mui/icons-material'
import { api, json, message, useResource } from '../api'
import { ConfirmDialog, Empty, ErrorState, Loading, StatusChip, statusLabels, useToast } from '../components'
import type { EventInfo, Guest, MemberInput, Status } from '../types'
import { invitationLink } from '../invitationLink'

type GuestInput = Pick<Guest, 'nome' | 'observacao' | 'status_presenca' | 'quantidade_acompanhantes'> & { membros: MemberInput[] }
const blank: GuestInput = { nome: '', observacao: '', status_presenca: 'PENDENTE', quantidade_acompanhantes: 0, membros: [] }
export function GuestsPage() {
  const { data, error, loading, refresh } = useResource<Guest[]>('/admin/convidados')
  const { data: event } = useResource<EventInfo>('/admin/configuracoes')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('TODOS')
  const [editing, setEditing] = useState<Guest | 'new' | null>(null)
  const [form, setForm] = useState<GuestInput>(blank)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState<{ anchor: HTMLElement; guest: Guest } | null>(null)
  const [confirm, setConfirm] = useState<{ guest: Guest; action: 'delete' | 'regenerate' } | null>(null)
  const [linkGuest, setLinkGuest] = useState<Guest | null>(null)
  const toast = useToast()
  const guestLink = invitationLink
  async function copy(guest: Guest) {
    try { await navigator.clipboard.writeText(guestLink(guest)); toast('Link copiado!') }
    catch { setLinkGuest(guest); toast('Selecione e copie o link abaixo.', true) }
  }
  function openForm(guest?: Guest) {
    setEditing(guest || 'new'); setForm(guest ? { nome: guest.nome, observacao: guest.observacao, status_presenca: guest.status_presenca, quantidade_acompanhantes: guest.quantidade_acompanhantes, membros: guest.convite_familiar ? guest.membros.map(m => ({ ...m })) : [] } : { ...blank, membros: [] }); setFormError(''); setMenu(null)
  }
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setFormError('')
    try {
      const created = await api<Guest>(`/admin/convidados${editing !== 'new' && editing ? `/${editing.id}` : ''}`, json(editing === 'new' ? 'POST' : 'PUT', form))
      if (editing === 'new') setLinkGuest(created)
      setEditing(null); refresh(); toast(editing === 'new' ? 'Convidado criado com sucesso!' : 'Convidado atualizado.')
    } catch (e) { setFormError(message(e)) } finally { setBusy(false) }
  }
  async function confirmAction() {
    if (!confirm) return
    setBusy(true)
    try {
      if (confirm.action === 'delete') await api(`/admin/convidados/${confirm.guest.id}`, json('DELETE'))
      else setLinkGuest(await api<Guest>(`/admin/convidados/${confirm.guest.id}/regenerar-token`, json('POST')))
      refresh(); setConfirm(null); toast(confirm.action === 'delete' ? 'Convidado excluído.' : 'Novo link gerado. O anterior deixou de funcionar.')
    } catch (e) { toast(message(e), true) } finally { setBusy(false) }
  }
  const filtered = data?.filter(g => [g.nome, ...g.membros.map(m => m.nome)].some(name => name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))) && (filter === 'TODOS' || g.status_presenca === filter)) || []
  return <Stack gap={3}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}><Box><Typography variant="h3">Convidados</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>As pessoas que fazem parte dessa história.</Typography></Box><Button startIcon={<Add />} variant="contained" onClick={() => openForm()}>Novo convidado</Button></Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><TextField label="Buscar convidado" size="small" value={search} onChange={e => setSearch(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} /><TextField select label="Presença" size="small" value={filter} onChange={e => setFilter(e.target.value)} sx={{ maxWidth: { sm: 210 } }}><MenuItem value="TODOS">Todos</MenuItem>{Object.entries(statusLabels).map(([key, value]) => <MenuItem key={key} value={key}>{value}</MenuItem>)}</TextField></Stack>
    {loading && !data ? <Loading /> : error ? <ErrorState error={error} retry={refresh} /> : !data?.length ? <Empty title="Toda história tem pessoas especiais" description="Adicione seu primeiro convidado para gerar um convite individual." action={<Button onClick={() => openForm()} startIcon={<Add />}>Adicionar convidado</Button>} /> : !filtered.length ? <Empty title="Nenhum convidado encontrado" description="Experimente outra busca ou filtro." /> :
      <Stack gap={1.5}>{filtered.map(guest => <Card key={guest.id}><CardContent sx={{ '&:last-child': { pb: 2 }, p: 2 }}><Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={2}>
        <Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>{guest.nome}</Typography><Stack direction="row" alignItems="center" flexWrap="wrap" gap={1} sx={{ mt: 1 }}><StatusChip status={guest.status_presenca} />{guest.convite_familiar ? <Typography variant="caption" color="text.secondary">{guest.quantidade_confirmados} de {guest.membros.length} pessoas confirmadas</Typography> : event?.acompanhantes_habilitados && <Typography variant="caption" color="text.secondary">{guest.quantidade_acompanhantes} acompanhante(s)</Typography>}</Stack>{guest.convite_familiar && <Stack gap={.75} sx={{ mt: 1.5 }}>{guest.membros.map(member => <Stack key={member.id} direction="row" alignItems="center" gap={1}><Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{member.nome}</Typography><StatusChip status={member.status_presenca} /></Stack>)}</Stack>}{guest.observacao && <Typography variant="body2" color="text.secondary" sx={{ mt: 1, overflowWrap: 'anywhere' }}>{guest.observacao}</Typography>}</Box>
        <Stack direction="row" gap={.5}><Button startIcon={<ContentCopy />} onClick={() => copy(guest)} sx={{ flex: 1 }}>Copiar link</Button><IconButton aria-label={`Editar ${guest.nome}`} onClick={() => openForm(guest)}><EditOutlined /></IconButton><IconButton aria-label={`Mais ações para ${guest.nome}`} onClick={e => setMenu({ anchor: e.currentTarget, guest })}><MoreVert /></IconButton></Stack>
      </Stack></CardContent></Card>)}</Stack>}
    <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}><MenuItem onClick={() => { if (menu) { setLinkGuest(menu.guest); setMenu(null) } }}>Ver link</MenuItem><MenuItem onClick={() => { if (menu) { setConfirm({ guest: menu.guest, action: 'regenerate' }); setMenu(null) } }}>Regenerar link</MenuItem><MenuItem sx={{ color: 'error.main' }} onClick={() => { if (menu) { setConfirm({ guest: menu.guest, action: 'delete' }); setMenu(null) } }}>Excluir convidado</MenuItem></Menu>
    <Dialog open={!!editing} onClose={busy ? undefined : () => setEditing(null)}><Box component="form" onSubmit={save} sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}><DialogTitle>{editing === 'new' ? 'Novo convidado' : 'Editar convidado'}</DialogTitle><DialogContent><Stack gap={2.5} sx={{ pt: 1 }}>{formError && <Alert severity="error">{formError}</Alert>}<TextField autoFocus required label="Nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} inputProps={{ maxLength: 150 }} helperText="Ex.: Madrinha Cláudia. Esse nome também aparece no endereço do convite." /><TextField label="Observação (opcional)" multiline minRows={2} value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} helperText="Visível apenas para o casal." inputProps={{ maxLength: 2000 }} />
      <Box><Typography variant="h6">Pessoas deste convite</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{form.membros.length ? 'Inclua todas as pessoas, inclusive quem receberá o link. A família selecionará quem vai.' : 'Para um convite individual, usamos o nome acima. Para uma família, cadastre os nomes abaixo.'}</Typography>
        <Stack gap={2}>{form.membros.map((member, index) => <Box key={member.id ?? `new-${index}`} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}><Stack direction="row" gap={1} alignItems="center"><TextField required label={`Pessoa ${index + 1}`} value={member.nome} inputProps={{ maxLength: 150 }} onChange={e => setForm({ ...form, membros: form.membros.map((m, i) => i === index ? { ...m, nome: e.target.value } : m) })} /><IconButton aria-label={`Remover pessoa ${index + 1}`} onClick={() => setForm({ ...form, membros: form.membros.filter((_, i) => i !== index) })}><DeleteOutline /></IconButton></Stack>
          {editing !== 'new' && <TextField select size="small" label={`Presença de ${member.nome || `pessoa ${index + 1}`}`} sx={{ mt: 2 }} value={member.status_presenca} onChange={e => setForm({ ...form, membros: form.membros.map((m, i) => i === index ? { ...m, status_presenca: e.target.value as Status } : m) })}>{Object.entries(statusLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}</TextField>}
        </Box>)}</Stack>
        <Button startIcon={<Add />} disabled={form.membros.length >= 50} sx={{ mt: 1 }} onClick={() => setForm({ ...form, quantidade_acompanhantes: 0, membros: form.membros.length ? [...form.membros, { nome: '', status_presenca: 'PENDENTE' }] : [{ nome: form.nome, status_presenca: form.status_presenca }, { nome: '', status_presenca: 'PENDENTE' }] })}>{form.membros.length ? 'Adicionar pessoa' : 'Adicionar família'}</Button>
      </Box>
      {editing !== 'new' && !form.membros.length && <><TextField label="Status de presença" select value={form.status_presenca} onChange={e => setForm({ ...form, status_presenca: e.target.value as Status, quantidade_acompanhantes: e.target.value === 'CONFIRMADO' ? form.quantidade_acompanhantes : 0 })}>{Object.entries(statusLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}</TextField>{event?.acompanhantes_habilitados && form.status_presenca === 'CONFIRMADO' && <TextField type="number" label="Quantidade de acompanhantes" inputProps={{ min: 0, max: 30, step: 1 }} value={form.quantidade_acompanhantes} onChange={e => setForm({ ...form, quantidade_acompanhantes: Number(e.target.value) })} />}</>}
    </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit" disabled={busy} variant="contained">{busy ? 'Salvando…' : 'Salvar convidado'}</Button></DialogActions></Box></Dialog>
    <ConfirmDialog open={!!confirm} busy={busy} title={confirm?.action === 'delete' ? 'Excluir convidado?' : 'Gerar um novo link?'} description={confirm?.action === 'delete' ? `O convite de ${confirm.guest.nome} deixará de funcionar. As compras registradas serão preservadas nos totais.` : 'O link anterior deixará de funcionar. Compartilhe o novo link com o convidado.'} action={confirm?.action === 'delete' ? 'Excluir' : 'Regenerar link'} onClose={() => setConfirm(null)} onConfirm={confirmAction} />
    <Dialog open={!!linkGuest} onClose={() => setLinkGuest(null)}><DialogTitle>Convite de {linkGuest?.nome}</DialogTitle><DialogContent><Typography color="text.secondary" sx={{ mb: 2 }}>Compartilhe este link individual com seu convidado.</Typography><TextField label="Link do convite" value={linkGuest ? guestLink(linkGuest) : ''} slotProps={{ input: { readOnly: true } }} onFocus={e => e.target.select()} /></DialogContent><DialogActions><Button onClick={() => setLinkGuest(null)}>Fechar</Button><Button variant="contained" startIcon={<ContentCopy />} onClick={() => linkGuest && copy(linkGuest)}>Copiar link</Button></DialogActions></Dialog>
  </Stack>
}

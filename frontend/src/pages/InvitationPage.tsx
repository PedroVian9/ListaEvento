import { useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { Alert, AppBar, Box, Button, Card, CardContent, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider, InputAdornment, Link, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { ArrowOutward, CalendarMonthOutlined, FavoriteBorder, LocationOnOutlined, LockOutlined, ScheduleOutlined, Search } from '@mui/icons-material'
import { api, json, message, useResource } from '../api'
import { Counter, Empty, ErrorState, Loading, TileBand, useToast } from '../components'
import type { EventInfo, Gift, Invitation } from '../types'
import { AttendanceDialog } from './AttendanceDialog'
import { GiftCard, GiftGrid } from '../GiftCard'

export function InvitationPage() {
  const { token } = useParams()
  const resource = useResource<Invitation | EventInfo>(token ? `/convites/${token}` : '/evento')
  const event = resource.data && ('evento' in resource.data ? resource.data.evento : resource.data)
  const invitation = resource.data && 'evento' in resource.data ? resource.data : null
  useEffect(() => { if (event) document.title = `${event.nome_evento} | ${event.nome_casal}` }, [event])
  return <Box>
    <AppBar position="sticky" elevation={0} color="transparent" sx={{ top: 0 }}>
      <TileBand />
    </AppBar>
    {resource.loading ? <Container maxWidth="md" sx={{ py: 8 }}><Loading /></Container> : resource.error ?
      <Container maxWidth="sm" sx={{ py: 10 }}><Typography variant="h2" sx={{ mb: 3 }}>Vamos encontrar seu convite?</Typography><ErrorState error={resource.error} retry={resource.refresh} /></Container> : event &&
      <EventContent key={token || 'home'} event={event} invitation={invitation} token={token} />}
    <Box component="footer" sx={{ mt: 5, textAlign: 'center' }}>
      <Container sx={{ py: 5 }}><FavoriteBorder sx={{ color: 'primary.main', mb: 1 }} /><Typography variant="h2" sx={{ fontSize: 27 }}>{event?.nome_casal || 'Com carinho'}</Typography><Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>O melhor presente é ter você por perto.</Typography>
        <Link component={RouterLink} to="/admin" color="text.secondary" underline="hover" sx={{ display: 'inline-block', mt: 4, fontSize: 11 }}>Área do casal</Link>
      </Container><TileBand small />
    </Box>
  </Box>
}

function EventContent({ event, invitation, token }: { event: EventInfo; invitation: Invitation | null; token?: string }) {
  const toast = useToast()
  const [answer, setAnswer] = useState(invitation)
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const status = answer?.status_presenca || 'PENDENTE'
  const dateText = event.data ? new Date(`${event.data}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Data a confirmar'
  const deadlineText = event.data_limite_confirmacao ? new Date(`${event.data_limite_confirmacao}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const today = new Date()
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const attendanceClosed = !!event.data_limite_confirmacao && event.data_limite_confirmacao < localToday
  return <>
    <Container maxWidth="lg" component="main">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, gap: { xs: 5, md: 10 }, alignItems: 'center', py: { xs: 6, md: 10 } }}>
        <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
          <Typography variant="overline" sx={{ letterSpacing: 3, color: 'primary.main', fontWeight: 600 }}>{event.nome_evento} · Nosso novo capítulo</Typography>
          <Typography variant="h1" sx={{ fontSize: { xs: 49, sm: 64, md: 76 }, lineHeight: 1.15, my: 3, letterSpacing: -2, overflowWrap: 'anywhere' }}>{event.nome_casal}</Typography>
          <Box sx={{ width: 50, height: 2, bgcolor: 'primary.main', mx: { xs: 'auto', md: 0 }, mb: 3 }} />
          <Typography variant="h5" sx={{ mb: 1.5 }}>{invitation ? `Olá, ${invitation.nome}!` : 'Uma casa começa com amor.'}</Typography>
          <Typography color="text.secondary" sx={{ fontSize: 16, maxWidth: 450, mx: { xs: 'auto', md: 0 }, whiteSpace: 'pre-line' }}>{event.texto_apresentacao}</Typography>
          {token && !attendanceClosed && (status === 'PENDENTE' ? <Button variant="contained" onClick={() => setAttendanceOpen(true)} sx={{ mt: 4, width: { xs: '100%', sm: 'auto' } }}>Confirmar presença</Button> : <Button variant="outlined" href="#presenca" sx={{ mt: 4, width: { xs: '100%', sm: 'auto' } }}>Ver minha resposta</Button>)}
          {!token && <Alert severity="info" icon={<FavoriteBorder fontSize="small" />} sx={{ mt: 4, textAlign: 'left', bgcolor: 'primary.light' }}>Recebeu nosso convite? Abra o link individual que enviamos para confirmar sua presença e ver a lista de presentes.</Alert>}
        </Box>
        <Box sx={{ p: { xs: 1, md: 1.5 }, border: '1px solid #B7CBE6', bgcolor: '#FAFCFF', borderRadius: '120px 120px 12px 12px', maxWidth: 440, width: '100%', mx: 'auto' }}>
          <Stack alignItems="center" sx={{ px: { xs: 3, md: 5 }, py: 5, border: '1px solid #D2DFF0', borderRadius: '110px 110px 5px 5px', textAlign: 'center' }}>
            <FavoriteBorder sx={{ fontSize: 31, color: 'primary.main', mb: 2 }} />
            <Typography sx={{ fontFamily: '"Playfair Display", serif', fontSize: 31, mb: 1 }}>Tem encontro marcado</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Um dia para guardar no coração.</Typography>
            <Divider sx={{ width: 55, mb: 3 }} />
            <Stack spacing={2.5} sx={{ width: '100%' }}>
              <Detail icon={<CalendarMonthOutlined />} title={dateText} />
              <Detail icon={<ScheduleOutlined />} title={event.hora ? `${event.hora.slice(0, 5).replace(':', 'h')}` : 'Horário a confirmar'} />
              <Detail icon={<LocationOnOutlined />} title={event.endereco || 'Local a confirmar'} />
            </Stack>
            {event.maps_url && <Button href={event.maps_url} target="_blank" rel="noopener noreferrer" variant="outlined" endIcon={<ArrowOutward />} fullWidth sx={{ mt: 4 }}>Ver localização</Button>}
          </Stack>
        </Box>
      </Box>
      {token && <>
        <Card id="presenca" sx={{ bgcolor: '#F4F8FF', borderColor: '#DAE5F4', mb: { xs: 7, md: 10 } }}>
          <CardContent sx={{ p: { xs: 3, md: 5 }, '&:last-child': { pb: { xs: 3, md: 5 } } }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, alignItems: 'center', gap: 4 }}>
              <Box><Chip icon={<FavoriteBorder />} label="Sua presença faz a diferença" size="small" sx={{ bgcolor: 'white', color: 'primary.main', mb: 2 }} /><Typography variant="h2" sx={{ fontSize: { xs: 30, md: 35 }, mb: 1.5 }}>{attendanceClosed ? 'Confirmações encerradas' : 'Você poderá participar?'}</Typography><Typography color="text.secondary">{attendanceClosed ? `O prazo para confirmar presença encerrou em ${deadlineText}.` : deadlineText ? <>Confirme sua presença até <Box component="strong" sx={{ fontWeight: 700 }}>{deadlineText}</Box>. Você poderá atualizar sua resposta até essa data.</> : 'Queremos preparar tudo com carinho para receber você. Pode mudar de ideia e atualizar sua resposta por aqui.'}</Typography></Box>
              <Stack gap={2}>
                {attendanceClosed && <Alert severity="info">{status === 'PENDENTE' ? 'O prazo de confirmação foi encerrado.' : 'Sua resposta continua disponível para consulta, mas não pode mais ser alterada.'}</Alert>}
                {status !== 'PENDENTE' && <>
                  <Alert severity={status === 'CONFIRMADO' ? 'success' : 'info'}>{status === 'CONFIRMADO' ? 'Presença confirmada! Estamos esperando você 💙' : answer?.convite_familiar ? 'Vocês informaram que não poderão ir. Sentiremos sua falta!' : 'Você informou que não poderá ir. Sentiremos sua falta!'}</Alert>
                  {status === 'CONFIRMADO' && <Box><Typography variant="body2" sx={{ mb: 1 }}>{answer?.quantidade_confirmados} pessoa(s) confirmada(s)</Typography><Stack direction="row" flexWrap="wrap" gap={1}>{answer?.membros.filter(m => m.status_presenca === 'CONFIRMADO').map(m => <Chip key={m.id} label={m.nome} size="small" color="success" variant="outlined" />)}</Stack>{!!answer?.quantidade_acompanhantes && <Typography variant="body2" sx={{ mt: 1 }}>E {answer.quantidade_acompanhantes} acompanhante(s).</Typography>}</Box>}
                </>}
                {!attendanceClosed && <Button variant={status === 'PENDENTE' ? 'contained' : 'outlined'} fullWidth onClick={() => setAttendanceOpen(true)}>{status === 'PENDENTE' ? 'Confirmar presença' : 'Alterar resposta'}</Button>}
              </Stack>
            </Box>
          </CardContent>
        </Card>
        <GiftList token={token} event={event} />
      </>}
    </Container>
    {token && attendanceOpen && <AttendanceDialog token={token} onClose={() => setAttendanceOpen(false)} onSaved={result => { setAnswer(result); setAttendanceOpen(false); toast('Resposta salva. Obrigado por nos avisar!') }} />}
  </>
}

function Detail({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <Stack direction="row" alignItems="center" gap={2} textAlign="left"><Box sx={{ color: 'primary.main', display: 'flex', bgcolor: '#EDF4FF', borderRadius: 2, p: 1.2 }}>{icon}</Box><Typography sx={{ fontSize: 14, fontWeight: 500, overflowWrap: 'anywhere' }}>{title}</Typography></Stack>
}

const priceRanges = [
  { id: 'ate50', label: 'Até R$ 50', min: 0, max: 50 },
  { id: '50a100', label: 'R$ 50,01 a R$ 100', min: 50.01, max: 100 },
  { id: '100a200', label: 'R$ 100,01 a R$ 200', min: 100.01, max: 200 },
  { id: '200a500', label: 'R$ 200,01 a R$ 500', min: 200.01, max: 500 },
  { id: 'acima500', label: 'Acima de R$ 500', min: 500.01, max: Infinity },
]

function GiftList({ token, event }: { token: string; event: EventInfo }) {
  const { data: gifts, error, loading, refresh } = useResource<Gift[]>(`/convites/${token}/presentes`)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('todos')
  const [priceFilter, setPriceFilter] = useState('todos')
  const [selected, setSelected] = useState<Gift | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [busy, setBusy] = useState(false)
  const [purchaseError, setPurchaseError] = useState('')
  const toast = useToast()
  const priceRange = priceRanges.find(range => range.id === priceFilter)
  const filtered = gifts?.filter(g => {
    if (!g.nome.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))) return false
    if (filter !== 'todos' && (filter === 'completos' ? !g.completo : g.completo)) return false
    if (priceFilter === 'semvalor') return g.valor == null
    if (priceRange) return g.valor != null && Number(g.valor) >= priceRange.min && Number(g.valor) <= priceRange.max
    return true
  }) || []
  function clearFilters() { setSearch(''); setFilter('todos'); setPriceFilter('todos') }
  async function purchase() {
    if (!selected) return
    setBusy(true); setPurchaseError('')
    try {
      await api(`/convites/${token}/presentes/${selected.id}/comprar`, json('POST', { quantidade: quantity }))
      setSelected(null); refresh(); toast('Presente registrado. Muito obrigado pelo carinho! 💙')
    } catch (e) { setPurchaseError(message(e)); refresh() } finally { setBusy(false) }
  }
  useEffect(() => {
    const reload = () => refresh()
    window.addEventListener('focus', reload)
    return () => window.removeEventListener('focus', reload)
  }, [refresh])
  const currentRemaining = gifts?.find(g => g.id === selected?.id)?.quantidade_restante ?? selected?.quantidade_restante ?? 0
  return <Box id="presentes" component="section">
    <Stack alignItems="center" textAlign="center" spacing={2} sx={{ mb: 4 }}>
      <Typography variant="overline" sx={{ letterSpacing: 3, color: 'primary.main' }}>Pequenos gestos, muito carinho</Typography>
      <Typography variant="h2" sx={{ fontSize: { xs: 32, md: 42 } }}>Sugestões de presentes</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 670, whiteSpace: 'pre-line' }}>{event.texto_presentes}</Typography>
      <Typography variant="body2" sx={{ color: 'primary.main' }}>Pode ser esse ou um similar. O carinho é o que importa. 💙</Typography>
    </Stack>
    {gifts && gifts.length > 0 && <>
      {gifts.every(g => g.completo) && <Alert severity="success" sx={{ mb: 3 }}>Nossa lista já está completa. Muito obrigado pelo carinho! 💙</Alert>}
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}>
        <Tabs value={filter} onChange={(_, v) => setFilter(v)} aria-label="Filtrar presentes"><Tab value="todos" label="Todos" /><Tab value="disponiveis" label="Disponíveis" /><Tab value="completos" label="Completos" /></Tabs>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} sx={{ width: { xs: '100%', md: 480 }, maxWidth: '100%' }}>
          <TextField size="small" label="Buscar presente" value={search} onChange={e => setSearch(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} />
          <TextField select size="small" label="Faixa de preço" value={priceFilter} onChange={e => setPriceFilter(e.target.value)}>
            <MenuItem value="todos">Todos os preços</MenuItem>
            {priceRanges.map(range => <MenuItem key={range.id} value={range.id}>{range.label}</MenuItem>)}
            <MenuItem value="semvalor">Sem preço informado</MenuItem>
          </TextField>
        </Stack>
      </Stack>
    </>}
    {error ? <ErrorState error={error} retry={refresh} /> : loading && !gifts ? <Loading /> : !gifts?.length ? <Empty title="Nossa lista está a caminho" description="Nossa lista de presentes será disponibilizada em breve." /> : !filtered.length ? <Empty title="Nenhum presente encontrado" description="Experimente outra busca ou faixa de preço." action={<Button onClick={clearFilters}>Limpar filtros</Button>} /> :
      <GiftGrid>
        {filtered.map(gift => <GiftCard key={gift.id} gift={gift}>
            {gift.produto_url && <Button href={gift.produto_url} target="_blank" rel="noopener noreferrer" fullWidth variant="outlined" endIcon={<ArrowOutward fontSize="small" />} size="small" sx={{ mt: .25, px: .5, fontSize: { xs: 11, sm: 13 } }}>Ver sugestão</Button>}
            <Button variant="contained" fullWidth size="small" disabled={gift.completo} onClick={() => { setSelected(gift); setQuantity(1); setPurchaseError('') }} sx={{ px: .5, fontSize: { xs: 11, sm: 13 } }}>{gift.completo ? 'Completo ✓' : 'Comprei esse ou similar'}</Button>
        </GiftCard>)}
      </GiftGrid>}
    <Stack direction="row" justifyContent="center" gap={1} sx={{ mt: 4, color: 'text.secondary' }}><LockOutlined sx={{ fontSize: 16, mt: .25 }} /><Typography variant="caption">Seu nome não aparece na lista de presentes.</Typography></Stack>
    <Dialog open={!!selected} onClose={busy ? undefined : () => setSelected(null)}><DialogTitle>Um carinho para nossa casa</DialogTitle><DialogContent>
      <Typography sx={{ mb: 1, fontWeight: 600 }}>{selected?.nome}</Typography><Typography color="text.secondary" sx={{ mb: 3 }}>Já comprou esse presente ou um similar? Registre a quantidade para mantermos a lista atualizada.</Typography>
      {purchaseError && <Alert severity="warning" sx={{ mb: 3 }}>{purchaseError}</Alert>}
      <Counter label="Quantas unidades você comprou?" value={quantity} onChange={setQuantity} min={1} max={currentRemaining} disabled={busy} />
    </DialogContent><DialogActions><Button onClick={() => setSelected(null)} disabled={busy}>Cancelar</Button><Button variant="contained" onClick={purchase} disabled={busy || quantity > currentRemaining}>{busy ? 'Registrando…' : 'Confirmar compra'}</Button></DialogActions></Dialog>
  </Box>
}

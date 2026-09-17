import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Box, Button, Card, CardContent, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material'
import { SaveOutlined } from '@mui/icons-material'
import { api, json, message, useResource } from '../api'
import { ErrorState, Loading, useToast } from '../components'
import type { EventInfo } from '../types'

export function SettingsPage() {
  const { data, error, loading, refresh } = useResource<EventInfo>('/admin/configuracoes')
  const [form, setForm] = useState<EventInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState('')
  const toast = useToast()
  useEffect(() => { if (data) setForm(data) }, [data])
  if (loading) return <Loading />
  if (error || !form) return <ErrorState error={error} retry={refresh} />
  const field = (key: keyof EventInfo, value: string | boolean | null) => setForm(f => f ? { ...f, [key]: value } : f)
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setSaveError('')
    try { await api('/admin/configuracoes', json('PUT', form)); toast('Detalhes do evento atualizados!') }
    catch (e) { setSaveError(message(e)) } finally { setBusy(false) }
  }
  return <Stack component="form" onSubmit={save} gap={3} sx={{ maxWidth: 850 }}><Box><Typography variant="h3">Configurações</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Os detalhes que tornam esse dia só de vocês.</Typography></Box>
    {saveError && <Alert severity="error">{saveError}</Alert>}
    <Card><CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}><Typography variant="h5" sx={{ mb: 3 }}>Sobre o evento</Typography><Stack spacing={3}>
      <TextField required label="Nome do casal" value={form.nome_casal} onChange={e => field('nome_casal', e.target.value)} inputProps={{ maxLength: 150 }} /><TextField required label="Nome do evento" value={form.nome_evento} onChange={e => field('nome_evento', e.target.value)} inputProps={{ maxLength: 150 }} />
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><TextField type="date" label="Data" value={form.data || ''} slotProps={{ inputLabel: { shrink: true } }} onChange={e => field('data', e.target.value || null)} /><TextField type="time" label="Hora" value={form.hora?.slice(0, 5) || ''} slotProps={{ inputLabel: { shrink: true } }} onChange={e => field('hora', e.target.value || null)} /></Stack>
      <TextField label="Endereço" value={form.endereco} onChange={e => field('endereco', e.target.value)} inputProps={{ maxLength: 500 }} /><TextField type="url" label="URL do Google Maps" value={form.maps_url} onChange={e => field('maps_url', e.target.value)} inputProps={{ maxLength: 2048 }} />
    </Stack></CardContent></Card>
    <Card><CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}><Typography variant="h5" sx={{ mb: 3 }}>Uma mensagem com a nossa cara</Typography><Stack spacing={3}><TextField label="Texto de apresentação" multiline minRows={3} value={form.texto_apresentacao} onChange={e => field('texto_apresentacao', e.target.value)} inputProps={{ maxLength: 3000 }} /><TextField label="Texto da lista de presentes" multiline minRows={3} value={form.texto_presentes} onChange={e => field('texto_presentes', e.target.value)} helperText="Lembre seus convidados de que produtos similares também são bem-vindos." inputProps={{ maxLength: 3000 }} /></Stack></CardContent></Card>
    <Card><CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}><Typography variant="h5" sx={{ mb: 2 }}>Confirmação de presença</Typography><Stack spacing={2.5}><TextField type="date" label="Data limite para confirmar presença" value={form.data_limite_confirmacao || ''} slotProps={{ inputLabel: { shrink: true } }} onChange={e => field('data_limite_confirmacao', e.target.value || null)} helperText="No dia informado, as confirmações ficam abertas até 23h59. Depois disso, os convidados só poderão consultar a resposta já registrada." /><FormControlLabel control={<Switch checked={form.acompanhantes_habilitados} onChange={e => field('acompanhantes_habilitados', e.target.checked)} />} label="Permitir acompanhantes" /><Typography variant="body2" color="text.secondary">Os convidados poderão informar quantas pessoas irão com eles (até 30). Ao desabilitar, as quantidades de acompanhantes registradas serão zeradas.</Typography></Stack></CardContent></Card>
    <Button type="submit" variant="contained" startIcon={<SaveOutlined />} disabled={busy} sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}>{busy ? 'Salvando…' : 'Salvar configurações'}</Button>
  </Stack>
}

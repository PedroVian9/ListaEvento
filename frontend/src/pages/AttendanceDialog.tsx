import { useEffect, useState } from 'react'
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, FormGroup, Stack, Typography } from '@mui/material'
import { api, ApiError, json, message, useResource } from '../api'
import { Counter, ErrorState, Loading } from '../components'
import type { Invitation } from '../types'

export function AttendanceDialog({ token, onClose, onSaved }: { token: string; onClose: () => void; onSaved: (response: Invitation) => void }) {
  const { data, error, loading, refresh } = useResource<Invitation>(`/convites/${token}`)
  const [selected, setSelected] = useState<number[]>([])
  const [companions, setCompanions] = useState(0)
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState('')
  useEffect(() => {
    if (!data) return
    setSelected(data.status_presenca === 'PENDENTE' && !data.convite_familiar ? [0] : data.membros.filter(m => m.status_presenca === 'CONFIRMADO').map(m => m.id))
    setCompanions(data.quantidade_acompanhantes)
  }, [data])

  async function save(attending: boolean) {
    if (!data) return
    setBusy(true); setSaveError('')
    try {
      const result = await api<Invitation>(`/convites/${token}/presenca`, json('PUT', {
        status: attending ? 'CONFIRMADO' : 'NAO_VAI',
        membros_confirmados: attending ? selected : [], membros_ids: data.membros.map(m => m.id),
        quantidade_acompanhantes: attending && !data.convite_familiar && data.evento.acompanhantes_habilitados ? companions : 0,
      }))
      onSaved({ ...data, ...result })
    } catch (e) {
      setSaveError(message(e))
      if (e instanceof ApiError && e.status === 409) refresh()
    } finally { setBusy(false) }
  }

  return <Dialog open onClose={busy ? undefined : onClose} aria-labelledby="attendance-title">
    <DialogTitle id="attendance-title">Quem vai participar?</DialogTitle>
    <DialogContent>
      {saveError && <Alert severity="warning" sx={{ mb: 2 }}>{saveError}</Alert>}
      {loading ? <Loading /> : error ? <ErrorState error={error} retry={refresh} /> : data && <Stack gap={2}>
        <Typography color="text.secondary">Marque os nomes de quem vai. As pessoas não selecionadas serão registradas como “não vão”.</Typography>
        <FormGroup>{data.membros.map(member => <FormControlLabel key={member.id} sx={{ m: 0, py: .75, pr: 1, borderBottom: '1px solid', borderColor: 'divider', '& .MuiFormControlLabel-label': { overflowWrap: 'anywhere', minWidth: 0 } }}
          control={<Checkbox disabled={busy} checked={selected.includes(member.id)} onChange={(_, checked) => setSelected(ids => checked ? [...ids, member.id] : ids.filter(id => id !== member.id))} />}
          label={member.nome} />)}</FormGroup>
        <Typography variant="body2" color="primary" aria-live="polite">{selected.length} de {data.membros.length} pessoa(s) selecionada(s)</Typography>
        {!data.convite_familiar && data.evento.acompanhantes_habilitados && selected.length > 0 && <Counter label="Quantas pessoas irão com você?" value={companions} onChange={setCompanions} disabled={busy} />}
      </Stack>}
    </DialogContent>
    <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <Button variant="contained" disabled={busy || loading || !!error || !selected.length} onClick={() => save(true)}>{busy ? 'Salvando…' : 'Confirmar presença'}</Button>
      <Button variant="outlined" disabled={busy || loading || !!error || !data} onClick={() => save(false)}>{data?.convite_familiar ? 'Ninguém poderá ir' : 'Não poderei ir'}</Button>
      <Box sx={{ textAlign: 'center' }}><Button disabled={busy} onClick={onClose}>Cancelar</Button></Box>
    </DialogActions>
  </Dialog>
}

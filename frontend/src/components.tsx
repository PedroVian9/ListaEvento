import { createContext, useContext, useState, type ReactNode } from 'react'
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, Skeleton, Snackbar, Stack, Typography } from '@mui/material'
import { Add, CardGiftcardOutlined, Remove } from '@mui/icons-material'
import type { Status } from './types'

const ToastContext = createContext<(message: string, error?: boolean) => void>(() => {})
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null)
  return <ToastContext.Provider value={(text, error = false) => setToast({ text, error })}>{children}
    <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert severity={toast?.error ? 'error' : 'success'} variant="filled" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast?.text}</Alert>
    </Snackbar>
  </ToastContext.Provider>
}
export const useToast = () => useContext(ToastContext)

export function TileBand({ small = false }: { small?: boolean }) {
  return <Box aria-hidden="true" className="tile-band" sx={{ height: small ? 16 : { xs: 36, md: 54 } }} />
}

export function ProductImage({ url, name, compact = false }: { url: string; name: string; compact?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  return <Box sx={{ height: compact ? { xs: 112, sm: 128 } : { xs: 132, sm: 156, md: 172 }, bgcolor: '#F3F6FA', overflow: 'hidden', display: 'grid', placeItems: 'center', width: '100%' }}>
    {url && failedUrl !== url ? <Box component="img" src={url} alt={name} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedUrl(url)} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
      <Stack alignItems="center" gap={1} sx={{ color: '#8196B4', p: 2 }}><CardGiftcardOutlined sx={{ fontSize: compact ? 28 : 44 }} />{!compact && <Typography variant="caption">Imagem indisponível</Typography>}</Stack>}
  </Box>
}

export const statusLabels: Record<Status, string> = { PENDENTE: 'Pendente', CONFIRMADO: 'Confirmado', NAO_VAI: 'Não irá' }
export function StatusChip({ status }: { status: Status }) {
  return <Chip size="small" label={statusLabels[status]} color={status === 'CONFIRMADO' ? 'success' : status === 'PENDENTE' ? 'warning' : 'default'} variant="outlined" />
}

export function Counter({ value, onChange, min = 0, max = 30, label, disabled = false }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string; disabled?: boolean }) {
  return <Stack alignItems="center" gap={1.5}>
    <Typography variant="body2">{label}</Typography>
    <Stack direction="row" alignItems="center" gap={2} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: .5 }}>
      <IconButton aria-label={`Diminuir ${label.toLowerCase()}`} disabled={disabled || value <= min} onClick={() => onChange(value - 1)}><Remove /></IconButton>
      <Typography aria-live="polite" sx={{ minWidth: 30, textAlign: 'center', fontSize: 20, fontWeight: 600 }}>{value}</Typography>
      <IconButton aria-label={`Aumentar ${label.toLowerCase()}`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}><Add /></IconButton>
    </Stack>
  </Stack>
}

export function Loading() {
  return <Stack gap={2} role="status" aria-label="Carregando"><Skeleton variant="rounded" height={110} /><Skeleton variant="rounded" height={230} /><Skeleton width="60%" /></Stack>
}
export function ErrorState({ error, retry }: { error: string; retry?: () => void }) {
  return <Alert severity="error" action={retry && <Button color="inherit" size="small" onClick={retry}>Tentar novamente</Button>}>{error}</Alert>
}
export function Empty({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <Stack alignItems="center" gap={1.5} sx={{ py: 7, px: 3, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 3 }}>
    <CardGiftcardOutlined sx={{ fontSize: 36, color: '#8196B4', mb: 1 }} /><Typography variant="h5">{title}</Typography>
    {description && <Typography color="text.secondary" sx={{ maxWidth: 420 }}>{description}</Typography>}{action}
  </Stack>
}
export function ConfirmDialog({ title, description, open, busy, onClose, onConfirm, action = 'Confirmar' }: { title: string; description: string; open: boolean; busy: boolean; onClose: () => void; onConfirm: () => void; action?: string }) {
  return <Dialog open={open} onClose={busy ? undefined : onClose}><DialogTitle>{title}</DialogTitle><DialogContent><DialogContentText>{description}</DialogContentText></DialogContent><DialogActions><Button disabled={busy} onClick={onClose}>Cancelar</Button><Button variant="contained" color="error" disabled={busy} onClick={onConfirm}>{busy ? 'Aguarde…' : action}</Button></DialogActions></Dialog>
}

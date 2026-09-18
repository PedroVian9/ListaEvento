import type { ReactNode } from 'react'
import { Box, Button, Card, CardContent, Chip, LinearProgress, Stack, Typography } from '@mui/material'
import { ContentCopy, Pix } from '@mui/icons-material'
import { ProductImage, useToast } from './components'
import { GiftValue } from './GiftValue'
import type { Gift } from './types'

export function GiftGrid({ children }: { children: ReactNode }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(auto-fill, minmax(220px, 1fr))' }, gap: { xs: 1.25, sm: 2 }, alignItems: 'stretch' }}>{children}</Box>
}

export function GiftCard({ gift, children, header, highlighted = false }: { gift: Gift; children: ReactNode; header?: ReactNode; highlighted?: boolean }) {
  return <Card data-gift-id={gift.id} sx={{ minWidth: 0, maxWidth: 300, display: 'flex', flexDirection: 'column', opacity: gift.ativo ? 1 : .7, outline: highlighted ? '2px solid' : 'none', outlineColor: 'primary.main' }}>
    {header}
    {gift.tipo === 'PIX' ? <PixContent gift={gift}>{children}</PixContent> : <>
    <ProductImage url={gift.imagem_url} name={gift.nome} compact />
    <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } }, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="h6" sx={{ fontSize: { xs: 15, sm: 17 }, lineHeight: 1.25, overflowWrap: 'anywhere', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{gift.nome}</Typography>
      {gift.descricao && <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: '-webkit-box' }, fontSize: 13, overflow: 'hidden', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{gift.descricao}</Typography>}
      <Box sx={{ mt: 'auto' }}><GiftValue value={gift.valor} /></Box>
      <Box sx={{ pt: .5 }}>
        <Stack direction="row" justifyContent="space-between" gap={.5} sx={{ mb: .75 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: 10, sm: 11 } }}>{gift.quantidade_comprada} de {gift.quantidade_desejada}</Typography>
          <Typography variant="caption" color={gift.completo ? 'success.main' : 'primary.main'} sx={{ fontSize: { xs: 10, sm: 11 }, textAlign: 'right' }}>{!gift.ativo ? 'Inativo' : gift.completo ? 'Completo ✓' : `Faltam ${gift.quantidade_restante}`}</Typography>
        </Stack>
        <LinearProgress variant="determinate" value={Math.min(100, gift.quantidade_comprada / gift.quantidade_desejada * 100)} color={gift.completo ? 'success' : 'primary'} />
      </Box>
      {children}
    </CardContent>
    </>}
  </Card>
}

function PixContent({ gift, children }: { gift: Gift; children: ReactNode }) {
  const toast = useToast()
  async function copy() {
    try { await navigator.clipboard.writeText(gift.chave_pix); toast('Chave Pix copiada!') }
    catch { toast('Não foi possível copiar. Selecione a chave abaixo e copie manualmente.', true) }
  }
  return <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5, p: { xs: 1.5, sm: 2 }, background: 'linear-gradient(160deg, #EDF9F6, #FFFFFF)' }}>
    <Box sx={{ py: 2, textAlign: 'center' }}><Pix sx={{ fontSize: 48, color: '#27745A' }} /></Box>
    <Chip label={gift.ativo ? 'Contribuição livre' : 'Inativo'} size="small" sx={{ alignSelf: 'start', bgcolor: '#DEF2E9', color: '#205B47', maxWidth: '100%' }} />
    <Typography variant="h6" sx={{ fontSize: { xs: 16, sm: 19 }, overflowWrap: 'anywhere' }}>{gift.nome}</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{gift.descricao || 'Um carinho para ajudar a construir nossa nova casa.'}</Typography>
    <Typography variant="body2" sx={{ color: '#27745A', fontWeight: 600 }}>Qualquer valor é bem-vindo 💙</Typography>
    <Box sx={{ mt: 'auto', p: 1.25, borderRadius: 1, bgcolor: 'white', border: '1px solid #CFE7DD' }}>
      <Typography variant="caption" color="text.secondary">Chave Pix</Typography>
      <Typography variant="body2" sx={{ overflowWrap: 'anywhere', userSelect: 'all' }}>{gift.chave_pix}</Typography>
    </Box>
    <Button variant="contained" fullWidth startIcon={<ContentCopy />} onClick={copy} sx={{ px: .5, fontSize: { xs: 11, sm: 13 } }}>Copiar chave Pix</Button>
    {children}
  </CardContent>
}

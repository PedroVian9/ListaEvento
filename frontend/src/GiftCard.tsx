import type { ReactNode } from 'react'
import { Box, Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material'
import { ProductImage } from './components'
import { GiftValue } from './GiftValue'
import type { Gift } from './types'

export function GiftGrid({ children }: { children: ReactNode }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(auto-fill, minmax(220px, 1fr))' }, gap: { xs: 1.25, sm: 2 }, alignItems: 'stretch' }}>{children}</Box>
}

export function GiftCard({ gift, children }: { gift: Gift; children: ReactNode }) {
  return <Card sx={{ minWidth: 0, maxWidth: 300, display: 'flex', flexDirection: 'column', opacity: gift.ativo ? 1 : .7 }}>
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
  </Card>
}

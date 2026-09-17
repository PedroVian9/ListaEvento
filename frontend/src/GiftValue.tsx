import { Box, Typography } from '@mui/material'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function GiftValue({ value }: { value: string | null }) {
  if (value == null) return null
  return <Box sx={{ bgcolor: 'primary.light', borderRadius: 1.5, px: 1.25, py: 1, my: .5 }}>
    <Typography component="span" sx={{ display: 'block', fontSize: 11, color: 'text.secondary' }}>Valor sugerido · unidade</Typography>
    <Typography component="span" sx={{ display: 'block', fontSize: { xs: 17, sm: 20 }, lineHeight: 1.4, fontWeight: 700, color: 'primary.dark', fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{currency.format(Number(value))}</Typography>
  </Box>
}

import { Typography } from '@mui/material'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function GiftValue({ value }: { value: string | null }) {
  if (value == null) return null
  return <Typography component="span" sx={{ display: 'block', fontSize: { xs: 16, sm: 18 }, lineHeight: 1.4, fontWeight: 700, color: 'primary.dark', fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{currency.format(Number(value))}</Typography>
}

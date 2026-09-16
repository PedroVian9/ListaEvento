import { Button, Container, Stack, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { TileBand } from '../components'

export function NotFoundPage() {
  return <><TileBand /><Container maxWidth="sm"><Stack spacing={3} sx={{ py: 10, textAlign: 'center' }}><Typography variant="h2">Este caminho não existe</Typography><Typography color="text.secondary">Confira o link do convite que você recebeu.</Typography><Button component={Link} to="/" variant="outlined">Voltar ao início</Button></Stack></Container></>
}

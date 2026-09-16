import { useEffect, useState, type FormEvent } from 'react'
import { Link as RouterLink, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Alert, AppBar, Avatar, Box, Button, Card, CardContent, Container, Divider, Drawer, IconButton, InputAdornment, List, ListItemButton, ListItemIcon, ListItemText, Stack, TextField, Toolbar, Typography } from '@mui/material'
import { ArrowBack, CardGiftcardOutlined, DashboardOutlined, FavoriteBorder, Logout, Menu, PeopleOutline, SettingsOutlined, Visibility, VisibilityOff } from '@mui/icons-material'
import { api, ApiError, json, message, useResource } from '../api'
import { ErrorState, Loading, TileBand, useToast } from '../components'

const navigation = [
  { to: '/admin', label: 'Visão geral', icon: <DashboardOutlined /> },
  { to: '/admin/convidados', label: 'Convidados', icon: <PeopleOutline /> },
  { to: '/admin/presentes', label: 'Presentes', icon: <CardGiftcardOutlined /> },
  { to: '/admin/configuracoes', label: 'Configurações', icon: <SettingsOutlined /> },
]

export function AdminLayout() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  function check() { setError(''); api('/admin/auth/me').then(() => setAuthenticated(true)).catch(e => { if (e instanceof ApiError && e.status === 401) setAuthenticated(false); else setError(message(e)) }) }
  useEffect(() => {
    check()
    const expired = () => setAuthenticated(false)
    window.addEventListener('session-expired', expired)
    return () => window.removeEventListener('session-expired', expired)
  }, [])
  async function logout() { setLoggingOut(true); try { await api('/admin/auth/logout', json('POST')); navigate('/admin/login', { replace: true }) } catch (e) { if (e instanceof ApiError && e.status === 401) navigate('/admin/login'); else toast(message(e), true) } finally { setLoggingOut(false) } }
  if (authenticated === false) return <Navigate to="/admin/login" replace />
  if (error) return <Container sx={{ py: 8 }}><ErrorState error={error} retry={check} /></Container>
  if (authenticated === null) return <Container sx={{ py: 8 }}><Loading /></Container>
  const sidebar = <Stack sx={{ height: '100%' }}>
    <Stack gap={1} sx={{ px: 3, py: 4 }}><FavoriteBorder color="primary" /><Typography sx={{ fontFamily: '"Playfair Display", serif', fontSize: 27 }}>Nosso Chá</Typography><Typography variant="caption" color="text.secondary">Cada detalhe, com carinho.</Typography></Stack><Divider />
    <List sx={{ p: 2, flex: 1 }}>{navigation.map(item => <ListItemButton key={item.to} component={NavLink} to={item.to} end={item.to === '/admin'} onClick={() => setOpen(false)} sx={{ mb: .75, borderRadius: 2, minHeight: 48, '&.active': { bgcolor: 'primary.light', color: 'primary.main', '& .MuiListItemIcon-root': { color: 'primary.main' } } }}><ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon><ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} /></ListItemButton>)}</List>
    <Box sx={{ p: 2 }}><Button component={RouterLink} to="/" fullWidth startIcon={<ArrowBack />} sx={{ mb: 1 }}>Ver página do evento</Button><Button color="inherit" fullWidth startIcon={<Logout />} disabled={loggingOut} onClick={logout}>Sair da conta</Button></Box>
  </Stack>
  return <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F7F9FC' }}>
    <Box component="nav" sx={{ width: { md: 246 }, flexShrink: { md: 0 } }}>
      <Drawer variant="temporary" open={open} onClose={() => setOpen(false)} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: 270 } }}>{sidebar}</Drawer>
      <Drawer variant="permanent" open sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: 246, boxSizing: 'border-box' } }}>{sidebar}</Drawer>
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}><AppBar position="static" elevation={0} color="inherit" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}><Toolbar sx={{ gap: 2, minHeight: 76 }}><IconButton aria-label="Abrir menu" onClick={() => setOpen(true)} sx={{ display: { md: 'none' } }}><Menu /></IconButton><Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>Um novo começo, bem organizado.</Typography><ChipAdmin /></Toolbar></AppBar>
      <Box component="main" sx={{ px: { xs: 2.5, sm: 4, lg: 5 }, pt: { xs: 2.5, sm: 4, lg: 5 }, pb: { xs: 12, sm: 5 }, maxWidth: 1440, mx: 'auto' }}><Outlet /></Box>
    </Box>
  </Box>
}
function ChipAdmin() { return <Stack direction="row" alignItems="center" gap={1}><Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 34, height: 34 }}><FavoriteBorder sx={{ fontSize: 17 }} /></Avatar><Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>Área do casal</Typography></Stack> }

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { data } = useResource<{ username: string }>('/admin/auth/me')
  useEffect(() => { document.title = 'Entrar | Nosso Chá' }, [])
  if (data) return <Navigate to="/admin" replace />
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try { await api('/admin/auth/login', json('POST', { username, password })); navigate('/admin', { replace: true }) }
    catch (e) { setError(message(e)) } finally { setBusy(false) }
  }
  return <Box sx={{ minHeight: '100vh', bgcolor: '#F7F9FC' }}><TileBand /><Container maxWidth="xs" sx={{ py: { xs: 6, md: 10 } }}>
    <Stack alignItems="center" gap={1} sx={{ mb: 4 }}><FavoriteBorder color="primary" /><Typography variant="h2">Nosso Chá</Typography><Typography color="text.secondary">Um cantinho para cuidar de cada detalhe.</Typography></Stack>
    <Card><CardContent sx={{ p: 3.5 }}><Typography variant="h4" sx={{ mb: 1 }}>Bem-vindos, casal!</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Entre para organizar o grande dia.</Typography>
      <Stack component="form" onSubmit={submit} spacing={2.5}>{error && <Alert severity="error">{error}</Alert>}<TextField label="Usuário" autoComplete="username" required value={username} onChange={e => setUsername(e.target.value)} inputProps={{ maxLength: 100 }} />
        <TextField label="Senha" type={visible ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setVisible(!visible)}>{visible ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> } }} />
        <Button type="submit" variant="contained" fullWidth disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</Button>
      </Stack></CardContent></Card><Button component={RouterLink} to="/" fullWidth startIcon={<ArrowBack />} sx={{ mt: 3 }}>Voltar ao evento</Button>
  </Container></Box>
}

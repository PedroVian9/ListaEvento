import { Link as RouterLink } from 'react-router-dom'
import { Box, Button, Card, CardContent, Divider, LinearProgress, Stack, Typography } from '@mui/material'
import { ArrowForward, CardGiftcardOutlined, CheckCircleOutline, GroupsOutlined, PeopleOutline, PersonOffOutlined, ScheduleOutlined } from '@mui/icons-material'
import { useResource } from '../api'
import { ErrorState, Loading } from '../components'
import type { DashboardData } from '../types'

export function DashboardPage() {
  const { data, error, loading, refresh } = useResource<DashboardData>('/admin/dashboard')
  if (loading) return <Loading />
  if (error || !data) return <ErrorState error={error} retry={refresh} />
  const stats = [
    { label: 'Convites cadastrados', value: data.total_convidados, icon: <PeopleOutline />, color: '#174EA6' },
    { label: 'Convites com presença', value: data.confirmados, icon: <CheckCircleOutline />, color: '#27745A' },
    { label: 'Convites pendentes', value: data.pendentes, icon: <ScheduleOutlined />, color: '#A47327' },
    { label: 'Convites sem presença', value: data.nao_vao, icon: <PersonOffOutlined />, color: '#728096' },
  ]
  return <Stack gap={4}>
    <Box><Typography variant="overline" color="primary" sx={{ letterSpacing: 2 }}>Tudo pronto para celebrar</Typography><Typography variant="h3" sx={{ mt: .5, mb: 1 }}>Visão geral</Typography><Typography color="text.secondary">Acompanhe quem vem e os carinhos para a nova casa.</Typography></Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>{stats.map(stat => <Card key={stat.label}><CardContent><Box sx={{ color: stat.color, mb: 2 }}>{stat.icon}</Box><Typography sx={{ fontSize: 34, fontWeight: 600 }}>{stat.value}</Typography><Typography variant="body2" color="text.secondary">{stat.label}</Typography></CardContent></Card>)}</Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
      <Card><CardContent sx={{ p: 3 }}><Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 3 }}><GroupsOutlined color="primary" /><Typography variant="h5">Uma mesa cheia de histórias</Typography></Stack>
        <Stack direction="row" alignItems="baseline" gap={1}><Typography sx={{ fontSize: 44, fontWeight: 600 }}>{data.pessoas_confirmadas}</Typography><Typography color="text.secondary">pessoas confirmadas</Typography></Stack><Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{data.pessoas_convidadas} pessoas nos convites. O total confirmado considera os nomes selecionados e os acompanhantes permitidos.</Typography>
        <LinearProgress variant="determinate" value={data.total_convidados ? data.confirmados / data.total_convidados * 100 : 0} /><Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 3 }}>{data.confirmados} de {data.total_convidados} convites com presença confirmada</Typography><Divider /><Button component={RouterLink} to="/admin/convidados" endIcon={<ArrowForward />} sx={{ mt: 2, px: 0 }}>Gerenciar convidados</Button>
      </CardContent></Card>
      <Card><CardContent sx={{ p: 3 }}><Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 3 }}><CardGiftcardOutlined color="primary" /><Typography variant="h5">Nossa casa ganhando vida</Typography></Stack>
        <Stack direction="row" alignItems="baseline" gap={1}><Typography sx={{ fontSize: 44, fontWeight: 600 }}>{data.presentes_completos}</Typography><Typography color="text.secondary">de {data.total_presentes} presentes completos</Typography></Stack><Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{data.unidades_compradas} de {data.unidades_desejadas} unidades compradas nos presentes ativos.</Typography>
        <LinearProgress variant="determinate" value={data.unidades_desejadas ? data.unidades_compradas / data.unidades_desejadas * 100 : 0} /><Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 3 }}>Cada presente é um carinho para esse novo capítulo.</Typography><Divider /><Button component={RouterLink} to="/admin/presentes" endIcon={<ArrowForward />} sx={{ mt: 2, px: 0 }}>Gerenciar presentes</Button>
      </CardContent></Card>
    </Box>
    {data.total_convidados === 0 && <Card sx={{ bgcolor: 'primary.light' }}><CardContent sx={{ p: 3 }}><Typography variant="h5" sx={{ mb: 1 }}>Vamos preparar o primeiro convite?</Typography><Typography color="text.secondary" sx={{ mb: 2 }}>Preencha os detalhes do evento, adicione seus convidados e compartilhe os links individuais.</Typography><Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><Button component={RouterLink} to="/admin/configuracoes" variant="contained">Configurar evento</Button><Button component={RouterLink} to="/admin/convidados" variant="outlined">Adicionar convidados</Button></Stack></CardContent></Card>}
  </Stack>
}

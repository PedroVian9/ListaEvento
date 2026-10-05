import { Link as RouterLink } from 'react-router-dom'
import { Box, Button, Card, CardContent, Divider, LinearProgress, Stack, Typography } from '@mui/material'
import { ArrowForward, CardGiftcardOutlined, CheckCircleOutline, GroupsOutlined, MailOutline, PeopleOutline, PersonOffOutlined, ScheduleOutlined } from '@mui/icons-material'
import { useResource } from '../api'
import { ErrorState, Loading } from '../components'
import type { DashboardData } from '../types'

const percentage = (value: number, total: number) => total ? Math.round(value / total * 100) : 0

export function DashboardPage() {
  const { data, error, loading, refresh } = useResource<DashboardData>('/admin/dashboard')
  if (loading) return <Loading />
  if (error || !data) return <ErrorState error={error} retry={refresh} />

  const answered = data.confirmados + data.nao_vao
  const responseRate = percentage(answered, data.total_convidados)
  const stats = [
    { label: 'Convites cadastrados', value: data.total_convidados, icon: <PeopleOutline />, color: '#174EA6', detail: `${data.pessoas_convidadas} pessoas` },
    { label: 'Vão ao evento', value: data.confirmados, icon: <CheckCircleOutline />, color: '#27745A', detail: `${data.pessoas_confirmadas} pessoas confirmadas` },
    { label: 'Não vão ao evento', value: data.nao_vao, icon: <PersonOffOutlined />, color: '#7A5C36', detail: `${data.pessoas_nao_vao} pessoas não irão` },
    { label: 'Aguardando resposta', value: data.pendentes, icon: <ScheduleOutlined />, color: '#A47327', detail: `${data.pessoas_pendentes} pessoas pendentes` },
  ]

  return <Stack gap={4}>
    <Box>
      <Typography variant="overline" color="primary" sx={{ letterSpacing: 2 }}>Tudo pronto para celebrar</Typography>
      <Typography variant="h3" sx={{ mt: .5, mb: 1 }}>Visão geral</Typography>
      <Typography color="text.secondary">Acompanhe as respostas, a presença esperada e os carinhos para a nova casa.</Typography>
    </Box>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
      {stats.map(stat => <Card key={stat.label}><CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Box sx={{ color: stat.color, mb: 1.5 }}>{stat.icon}</Box>
        <Typography sx={{ fontSize: 34, fontWeight: 600 }}>{stat.value}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{stat.label}</Typography>
        <Typography variant="caption" color="text.secondary">{stat.detail}</Typography>
      </CardContent></Card>)}
    </Box>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.15fr .85fr' }, gap: 3 }}>
      <Card><CardContent sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2.5 }}><GroupsOutlined color="primary" /><Typography variant="h5">Presença esperada</Typography></Stack>
        <Stack direction="row" alignItems="baseline" gap={1}><Typography sx={{ fontSize: 44, fontWeight: 600 }}>{data.pessoas_confirmadas}</Typography><Typography color="text.secondary">pessoas confirmadas</Typography></Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>de {data.pessoas_convidadas} pessoas nos convites{data.pessoas_confirmadas > 0 ? ', incluindo acompanhantes confirmados' : ''}.</Typography>
        <LinearProgress color="success" variant="determinate" value={percentage(data.pessoas_confirmadas, data.pessoas_convidadas)} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mt: 2.5 }}>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#FBF7F1' }}><Typography variant="h6">{data.pessoas_nao_vao}</Typography><Typography variant="caption" color="text.secondary">pessoas não vão</Typography></Box>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#FFFAEF' }}><Typography variant="h6">{data.pessoas_pendentes}</Typography><Typography variant="caption" color="text.secondary">pessoas pendentes</Typography></Box>
        </Box>
        <Divider sx={{ mt: 3 }} /><Button component={RouterLink} to="/admin/convidados" endIcon={<ArrowForward />} sx={{ mt: 2, px: 0 }}>Gerenciar convidados</Button>
      </CardContent></Card>

      <Card><CardContent sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2.5 }}><MailOutline color="primary" /><Typography variant="h5">Acompanhamento dos convites</Typography></Stack>
        <Stack direction="row" alignItems="baseline" gap={1}><Typography sx={{ fontSize: 44, fontWeight: 600 }}>{responseRate}%</Typography><Typography color="text.secondary">de respostas</Typography></Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>{answered} de {data.total_convidados} convites já responderam.</Typography>
        <LinearProgress variant="determinate" value={responseRate} />
        <Stack gap={1.25} sx={{ mt: 2.5 }}>
          <Stack direction="row" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Convites enviados</Typography><Typography variant="body2" fontWeight={600}>{data.convites_enviados} de {data.total_convidados}</Typography></Stack>
          <Stack direction="row" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Ainda sem resposta</Typography><Typography variant="body2" fontWeight={600}>{data.pendentes}</Typography></Stack>
          <Stack direction="row" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Recusaram o convite</Typography><Typography variant="body2" fontWeight={600}>{data.nao_vao}</Typography></Stack>
        </Stack>
        <Divider sx={{ mt: 3 }} /><Button component={RouterLink} to="/admin/convidados" endIcon={<ArrowForward />} sx={{ mt: 2, px: 0 }}>{data.pendentes ? 'Ver quem ainda não respondeu' : 'Ver convidados'}</Button>
      </CardContent></Card>
    </Box>

    <Card><CardContent sx={{ p: 3 }}><Typography variant="h5" sx={{ mb: 2 }}>Quem convidou</Typography><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>{([['PEDRO', 'Pedro'], ['MARIA', 'Maria'], ['AMBOS', 'Dos dois']] as const).map(([key, label]) => <Box key={key} sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default' }}><Typography color="text.secondary" variant="body2">{label}</Typography><Typography sx={{ fontSize: 30, fontWeight: 600 }}>{data.convites_por_origem[key]}</Typography><Typography variant="body2" color="text.secondary">{data.convites_por_origem[key] === 1 ? 'convite' : 'convites'} · {data.pessoas_por_origem[key]} {data.pessoas_por_origem[key] === 1 ? 'pessoa' : 'pessoas'}</Typography></Box>)}</Box></CardContent></Card>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
      <Card><CardContent sx={{ p: 3 }}><Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 3 }}><CardGiftcardOutlined color="primary" /><Typography variant="h5">Nossa casa ganhando vida</Typography></Stack>
        <Stack direction="row" alignItems="baseline" gap={1}><Typography sx={{ fontSize: 44, fontWeight: 600 }}>{data.presentes_completos}</Typography><Typography color="text.secondary">de {data.total_presentes} presentes completos</Typography></Stack><Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{data.unidades_compradas} de {data.unidades_desejadas} unidades compradas nos presentes ativos.</Typography>
        <LinearProgress variant="determinate" value={percentage(data.unidades_compradas, data.unidades_desejadas)} /><Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 3 }}>Cada presente é um carinho para esse novo capítulo.</Typography><Divider /><Button component={RouterLink} to="/admin/presentes" endIcon={<ArrowForward />} sx={{ mt: 2, px: 0 }}>Gerenciar presentes</Button>
      </CardContent></Card>
      <Card><CardContent sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Valor estimado arrecadado</Typography>
        <Typography sx={{ fontSize: { xs: 32, sm: 44 }, fontWeight: 600, color: 'primary.main', overflowWrap: 'anywhere' }}>{Number(data.valor_estimado_arrecadado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>Estimativa dos produtos: valor atual cadastrado × unidades marcadas como compradas, incluindo produtos desativados. Não representa dinheiro recebido e não inclui Pix.</Typography>
        {data.unidades_compradas_sem_valor > 0 && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{data.unidades_compradas_sem_valor} unidade(s) comprada(s) sem preço informado ficaram fora da estimativa.</Typography>}
      </CardContent></Card>
    </Box>

    {data.total_convidados === 0 && <Card sx={{ bgcolor: 'primary.light' }}><CardContent sx={{ p: 3 }}><Typography variant="h5" sx={{ mb: 1 }}>Vamos preparar o primeiro convite?</Typography><Typography color="text.secondary" sx={{ mb: 2 }}>Preencha os detalhes do evento, adicione seus convidados e compartilhe os links individuais.</Typography><Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><Button component={RouterLink} to="/admin/configuracoes" variant="contained">Configurar evento</Button><Button component={RouterLink} to="/admin/convidados" variant="outlined">Adicionar convidados</Button></Stack></CardContent></Card>}
  </Stack>
}

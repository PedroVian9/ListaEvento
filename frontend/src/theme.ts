import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: { primary: { main: '#174EA6', dark: '#0D2F6F', light: '#EDF4FF' }, background: { default: '#FFFFFF', paper: '#FFFFFF' }, text: { primary: '#16315A', secondary: '#475569' }, success: { main: '#27745A' }, divider: '#E0E8F2' },
  typography: {
    fontFamily: 'Inter, sans-serif', fontSize: 14,
    h1: { fontFamily: '"Playfair Display", serif', fontWeight: 500 },
    h2: { fontFamily: '"Playfair Display", serif', fontWeight: 500, fontSize: '2.4rem' },
    h3: { fontSize: '1.65rem', fontWeight: 600 }, h4: { fontSize: '1.35rem', fontWeight: 600 },
    h5: { fontSize: '1.15rem', fontWeight: 600 }, h6: { fontSize: '1rem', fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 }, body1: { lineHeight: 1.75 }, body2: { lineHeight: 1.65 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 46, paddingInline: 22, borderRadius: 8 }, outlined: { borderColor: '#C8D7EB' } } },
    MuiCard: { defaultProps: { variant: 'outlined' }, styleOverrides: { root: { borderColor: '#E0E8F2', boxShadow: '0 4px 20px rgba(13,47,111,.025)' } } },
    MuiTextField: { defaultProps: { fullWidth: true, variant: 'outlined' } },
    MuiChip: { styleOverrides: { root: { fontWeight: 500, fontSize: 12 } } },
    MuiDialog: { defaultProps: { fullWidth: true, maxWidth: 'sm' }, styleOverrides: { paper: { margin: 16, width: 'calc(100% - 32px)' } } },
    MuiDialogActions: { styleOverrides: { root: { padding: '16px 24px 24px', gap: 8 } } },
    MuiLinearProgress: { styleOverrides: { root: { height: 6, borderRadius: 8, backgroundColor: '#E8EEF7' }, bar: { borderRadius: 8 } } },
  },
})

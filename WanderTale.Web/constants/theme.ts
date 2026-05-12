export type ThemeTokens = {
  // Bakgrunder
  background: string
  surface: string
  surfaceAlt: string

  // Text
  textPrimary: string
  textSecondary: string
  textMuted: string
  textHandwritten: string

  // Accenter
  accent: string
  accentSoft: string
  accentDark: string

  // Feedback
  error: string
  success: string
  warning: string

  // Dekorativt (scrapbook-specifikt)
  tape: string
  shadow: string
  border: string
  borderLight: string

  // Temainformation
  isDark: boolean
}

export type ThemeName = 'diary' | 'summer' | 'nordic' | 'sunset' | 'night' | 'spring'

export type Theme = {
  name: ThemeName
  label: string
  tokens: ThemeTokens
}

export const themes: Record<ThemeName, Theme> = {
  diary: {
    name: 'diary',
    label: 'Dagbok',
    tokens: {
      background: '#FAF7F2',
      surface: '#FFFEF9',
      surfaceAlt: '#F5EFE2',
      textPrimary: '#2C1810',
      textSecondary: '#6B4C3B',
      textMuted: '#B09080',
      textHandwritten: '#3D2314',
      accent: '#d9efd8',
      accentSoft: '#ba849a',
      accentDark: '#813868',
      error: '#C0392B',
      success: '#6B8E23',
      warning: '#D4A017',
      tape: 'rgba(255, 230, 150, 0.6)',
      shadow: 'rgba(44, 24, 16, 0.15)',
      border: '#a8d2b0',
      borderLight: '#EDE5D8',
      isDark: false,
    },
  },
  summer: {
    name: 'summer',
    label: 'Sommar',
    tokens: {
      background: '#FFFBF0',
      surface: '#FFFFFF',
      surfaceAlt: '#FFF3D6',
      textPrimary: '#2D1B00',
      textSecondary: '#7A4F1A',
      textMuted: '#C4956A',
      textHandwritten: '#5C3000',
      accent: '#E8873A',
      accentSoft: '#FAC88A',
      accentDark: '#B35A1A',
      error: '#C0392B',
      success: '#5A8A1A',
      warning: '#E8A000',
      tape: 'rgba(255, 200, 100, 0.5)',
      shadow: 'rgba(45, 27, 0, 0.12)',
      border: '#F0C89A',
      borderLight: '#FAE8D0',
      isDark: false,
    },
  },
  nordic: {
    name: 'nordic',
    label: 'Nordic',
    tokens: {
      background: '#F4F6F8',
      surface: '#FFFFFF',
      surfaceAlt: '#EBF0F5',
      textPrimary: '#1A2535',
      textSecondary: '#4A5F75',
      textMuted: '#90A4B4',
      textHandwritten: '#253548',
      accent: '#3A7CA5',
      accentSoft: '#A8CBE0',
      accentDark: '#1E5070',
      error: '#C0392B',
      success: '#2E7D32',
      warning: '#E57C00',
      tape: 'rgba(180, 210, 230, 0.5)',
      shadow: 'rgba(26, 37, 53, 0.1)',
      border: '#C5D5E4',
      borderLight: '#DDE8F0',
      isDark: false,
    },
  },
  sunset: {
    name: 'sunset',
    label: 'Solnedgång',
    tokens: {
      background: '#FFF5F0',
      surface: '#FFFFFF',
      surfaceAlt: '#FFE8E0',
      textPrimary: '#2D0D1A',
      textSecondary: '#7A2D4A',
      textMuted: '#C47A8A',
      textHandwritten: '#4A1028',
      accent: '#D4567A',
      accentSoft: '#F0A0B8',
      accentDark: '#A02050',
      error: '#B02040',
      success: '#5A8A1A',
      warning: '#D4A017',
      tape: 'rgba(255, 180, 200, 0.5)',
      shadow: 'rgba(45, 13, 26, 0.12)',
      border: '#F0C0D0',
      borderLight: '#FAE0E8',
      isDark: false,
    },
  },
  night: {
    name: 'night',
    label: 'Natt',
    tokens: {
      background: '#12192A',
      surface: '#1C2740',
      surfaceAlt: '#243050',
      textPrimary: '#EDE8DC',
      textSecondary: '#A8B8C8',
      textMuted: '#5A6A7A',
      textHandwritten: '#F5DFA0',
      accent: '#D4AA50',
      accentSoft: '#597c8a',
      accentDark: '#F0C860',
      error: '#E07070',
      success: '#70B870',
      warning: '#E0A840',
      tape: 'rgba(200, 170, 80, 0.3)',
      shadow: 'rgba(0, 0, 0, 0.4)',
      border: '#2C3A50',
      borderLight: '#243048',
      isDark: true,
    },
  },
  spring: {
    name: 'spring',
    label: 'Vår',
    tokens: {
      background: '#F5EDE4',
      surface: '#FFFFFF',
      surfaceAlt: '#FFF8EB',
      textPrimary: '#2F2923',
      textSecondary: '#42301F',
      textMuted: '#8F8270',
      textHandwritten: '#2F2923',
      accent: '#5BC8BF',
      accentSoft: '#D5F7F4',
      accentDark: '#1A8F87',
      error: '#C0392B',
      success: '#6B8E23',
      warning: '#D4A017',
      tape: '#BFE5DD',
      shadow: 'rgba(0, 0, 0, 0.15)',
      border: '#D8CFBF',
      borderLight: 'rgba(0, 0, 0, 0.08)',
      isDark: false,
    },
  },
}

export const defaultTheme: ThemeName = 'diary'

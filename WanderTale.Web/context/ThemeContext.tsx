import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
    themes as staticThemes,
    defaultTheme,
    type Theme,
    type ThemeName,
    type ThemeTokens,
} from '@/constants/theme'

const STORAGE_KEY = 'wandertale_theme'

const legacyThemeNames: Record<string, ThemeName> = {
    dagbok: 'diary',
    sommar: 'summer',
    solnedgang: 'sunset',
    natt: 'night',
}

type ThemesMap = Record<string, Theme>

type ThemeContextValue = {
    theme: Theme
    themeName: string
    themes: ThemesMap
    setTheme: (name: string) => Promise<void>
    updateThemeToken: (name: string, token: keyof ThemeTokens, value: string | boolean) => void
    updateThemeLabel: (name: string, label: string) => void
    addTheme: (sourceName: string) => string
    deleteTheme: (name: string) => void
    setAllThemes: (next: ThemesMap) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function cloneThemes(src: Record<string, Theme>): ThemesMap {
    return Object.fromEntries(
        Object.entries(src).map(([k, v]) => [k, { ...v, tokens: { ...v.tokens } }])
    )
}

function resolveThemeName(name: string | null, available: ThemesMap): string {
    if (name && name in available) return name
    if (name && name in legacyThemeNames && legacyThemeNames[name] in available) {
        return legacyThemeNames[name]
    }
    return defaultTheme in available ? defaultTheme : Object.keys(available)[0]
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [themes, setThemes] = useState<ThemesMap>(() => cloneThemes(staticThemes))
    const [themeName, setThemeName] = useState<string>(defaultTheme)

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
            const next = resolveThemeName(saved, themes)
            setThemeName(next)
            if (saved !== next) {
                void AsyncStorage.setItem(STORAGE_KEY, next)
            }
        })
    }, [])

    const setTheme = useCallback(async (name: string) => {
        const next = resolveThemeName(name, themes)
        setThemeName(next)
        await AsyncStorage.setItem(STORAGE_KEY, next)
    }, [themes])

    const updateThemeToken = useCallback((name: string, token: keyof ThemeTokens, value: string | boolean) => {
        setThemes(prev => {
            if (!(name in prev)) return prev
            return {
                ...prev,
                [name]: { ...prev[name], tokens: { ...prev[name].tokens, [token]: value } },
            }
        })
    }, [])

    const updateThemeLabel = useCallback((name: string, label: string) => {
        setThemes(prev => {
            if (!(name in prev)) return prev
            return { ...prev, [name]: { ...prev[name], label } }
        })
    }, [])

    const addTheme = useCallback((sourceName: string) => {
        let newName = ''
        setThemes(prev => {
            const base = sourceName + '_kopia'
            let candidate = base
            let i = 2
            while (candidate in prev) candidate = base + i++
            newName = candidate
            const source = prev[sourceName] ?? Object.values(prev)[0]
            return {
                ...prev,
                [candidate]: { ...source, name: candidate as ThemeName, tokens: { ...source.tokens } },
            }
        })
        return newName
    }, [])

    const deleteTheme = useCallback((name: string) => {
        setThemes(prev => {
            if (!(name in prev) || Object.keys(prev).length <= 1) return prev
            const next = { ...prev }
            delete next[name]
            return next
        })
        setThemeName(prev => {
            if (prev !== name) return prev
            const remaining = Object.keys(themes).filter(n => n !== name)
            return remaining[0] ?? prev
        })
    }, [themes])

    const setAllThemes = useCallback((next: ThemesMap) => {
        setThemes(cloneThemes(next))
    }, [])

    const theme = themes[themeName] ?? themes[defaultTheme] ?? Object.values(themes)[0]

    const value = useMemo<ThemeContextValue>(() => ({
        theme,
        themeName,
        themes,
        setTheme,
        updateThemeToken,
        updateThemeLabel,
        addTheme,
        deleteTheme,
        setAllThemes,
    }), [theme, themeName, themes, setTheme, updateThemeToken, updateThemeLabel, addTheme, deleteTheme, setAllThemes])

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
    return ctx
}

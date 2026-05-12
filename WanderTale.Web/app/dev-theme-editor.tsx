import React, { useCallback, useState } from 'react'
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    Alert,
} from 'react-native'
import Slider from '@react-native-community/slider'
import type { Theme, ThemeTokens } from '@/constants/theme'
import { api_url } from '@/api/config'
import { useTheme } from '@/context/ThemeContext'

const TOKEN_LABELS: Record<keyof ThemeTokens, string> = {
    background: 'Bakgrund',
    surface: 'Yta',
    surfaceAlt: 'Alternativ yta',
    textPrimary: 'Text primär',
    textSecondary: 'Text sekundär',
    textMuted: 'Text dämpad',
    textHandwritten: 'Text handskriven',
    accent: 'Accent',
    accentSoft: 'Accent mjuk',
    accentDark: 'Accent mörk',
    error: 'Fel',
    success: 'Framgång',
    warning: 'Varning',
    tape: 'Tejp',
    shadow: 'Skugga',
    border: 'Kant',
    borderLight: 'Kant ljus',
    isDark: 'Mörkt tema',
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const clean = (hex ?? '').replace('#', '')
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return { r: 128, g: 128, b: 128 }
    return {
        r: parseInt(clean.slice(0, 2), 16),
        g: parseInt(clean.slice(2, 4), 16),
        b: parseInt(clean.slice(4, 6), 16),
    }
}

function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b]
        .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
        .join('')
}

const RGB_CHANNELS = [
    { channel: 'r', label: 'R', color: '#e05050' },
    { channel: 'g', label: 'G', color: '#40a840' },
    { channel: 'b', label: 'B', color: '#4488ee' },
] as const

type RgbChannel = 'r' | 'g' | 'b'

function ColorSliders({
    hex,
    onChange,
    mutedColor,
    borderColor,
}: {
    hex: string
    onChange: (hex: string) => void
    mutedColor: string
    borderColor: string
}) {
    const rgb = hexToRgb(hex)

    const update = (channel: RgbChannel, value: number) => {
        const next = { ...rgb, [channel]: Math.round(value) }
        onChange(rgbToHex(next.r, next.g, next.b))
    }

    return (
        <View style={sliderStyles.container}>
            {RGB_CHANNELS.map(({ channel, label, color }) => (
                <View key={channel} style={sliderStyles.row}>
                    <Text style={[sliderStyles.label, { color: mutedColor }]}>{label}</Text>
                    <Slider
                        style={sliderStyles.slider}
                        minimumValue={0}
                        maximumValue={255}
                        step={1}
                        value={rgb[channel]}
                        onValueChange={v => update(channel, v)}
                        minimumTrackTintColor={color}
                        maximumTrackTintColor={borderColor}
                        thumbTintColor={color}
                    />
                    <Text style={[sliderStyles.value, { color: mutedColor }]}>
                        {rgb[channel].toString().padStart(3, ' ')}
                    </Text>
                </View>
            ))}
            <Text style={[sliderStyles.hex, { color: mutedColor }]}>{hex.toUpperCase()}</Text>
        </View>
    )
}

const sliderStyles = StyleSheet.create({
    container: { paddingTop: 6, paddingBottom: 4, paddingLeft: 46 },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
    label: { width: 14, fontSize: 11, fontWeight: '600' },
    slider: { flex: 1, height: 30 },
    value: { width: 28, fontSize: 11, fontFamily: 'monospace', textAlign: 'right' },
    hex: { fontSize: 10, fontFamily: 'monospace', marginTop: 2 },
})

function generateThemeTs(themes: Record<string, Theme>): string {
    const themeNames = Object.keys(themes)
    const themeNameType = themeNames.map(n => `'${n}'`).join(' | ')

    let out = `export type ThemeTokens = {\n`
    out += `  // Bakgrunder\n`
    out += `  background: string\n`
    out += `  surface: string\n`
    out += `  surfaceAlt: string\n`
    out += `\n  // Text\n`
    out += `  textPrimary: string\n`
    out += `  textSecondary: string\n`
    out += `  textMuted: string\n`
    out += `  textHandwritten: string\n`
    out += `\n  // Accenter\n`
    out += `  accent: string\n`
    out += `  accentSoft: string\n`
    out += `  accentDark: string\n`
    out += `\n  // Feedback\n`
    out += `  error: string\n`
    out += `  success: string\n`
    out += `  warning: string\n`
    out += `\n  // Dekorativt (scrapbook-specifikt)\n`
    out += `  tape: string\n`
    out += `  shadow: string\n`
    out += `  border: string\n`
    out += `  borderLight: string\n`
    out += `\n  // Temainformation\n`
    out += `  isDark: boolean\n`
    out += `}\n\n`

    out += `export type ThemeName = ${themeNameType}\n\n`
    out += `export type Theme = {\n  name: ThemeName\n  label: string\n  tokens: ThemeTokens\n}\n\n`

    out += `export const themes: Record<ThemeName, Theme> = {\n`
    for (const [key, theme] of Object.entries(themes)) {
        out += `  ${key}: {\n`
        out += `    name: '${theme.name}',\n`
        out += `    label: '${theme.label}',\n`
        out += `    tokens: {\n`
        for (const [tok, val] of Object.entries(theme.tokens)) {
            if (typeof val === 'boolean') {
                out += `      ${tok}: ${val},\n`
            } else {
                out += `      ${tok}: '${val}',\n`
            }
        }
        out += `    },\n`
        out += `  },\n`
    }
    out += `}\n\n`
    out += `export const defaultTheme: ThemeName = '${themeNames[0]}'\n`

    return out
}

export function DevThemeEditorContent() {
    const {
        theme,
        themeName,
        themes,
        setTheme,
        updateThemeToken,
        updateThemeLabel,
        addTheme,
        deleteTheme,
    } = useTheme()
    const t = theme.tokens

    const [expandedToken, setExpandedToken] = useState<keyof ThemeTokens | null>(null)

    const onAdd = useCallback(() => {
        const newName = addTheme(themeName)
        if (newName) void setTheme(newName)
    }, [addTheme, themeName, setTheme])

    const onDelete = useCallback(() => {
        if (Object.keys(themes).length <= 1) {
            Alert.alert('Kan inte ta bort', 'Minst ett tema måste finnas kvar.')
            return
        }
        Alert.alert('Ta bort tema', `Ta bort "${theme.label}"?`, [
            { text: 'Avbryt', style: 'cancel' },
            { text: 'Ta bort', style: 'destructive', onPress: () => deleteTheme(themeName) },
        ])
    }, [themes, theme.label, themeName, deleteTheme])

    const onSave = useCallback(async () => {
        const code = generateThemeTs(themes)
        let ok = false
        try {
            const res = await fetch(`${api_url}/dev/save-theme`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: code,
            })
            ok = res.ok
        } catch {
            ok = false
        }
        if (!ok) Alert.alert('Fel', 'Kunde inte spara theme.ts. Är API:t igång?')
    }, [themes])

    return (
        <View>
            <View style={styles.header}>
                <Text style={[styles.title, { color: t.textPrimary }]}>Tema-editor</Text>
                <Text style={[styles.subtitle, { color: t.textSecondary }]}>Endast i dev-läge</Text>
            </View>

            <ScrollView
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.themeRow}
            >
                {Object.entries(themes).map(([name, th]) => {
                    const isActive = name === themeName
                    return (
                        <TouchableOpacity
                            key={name}
                            onPress={() => setTheme(name)}
                            style={[
                                styles.themeCard,
                                {
                                    backgroundColor: th.tokens.surface,
                                    borderColor: isActive ? t.accent : t.border,
                                    borderWidth: isActive ? 2 : 1,
                                },
                            ]}
                        >
                            <View style={[styles.miniPreviewArea, { backgroundColor: th.tokens.background }]}>
                                <View style={[styles.miniPolaroid, { backgroundColor: th.tokens.surface, borderColor: th.tokens.border, shadowColor: th.tokens.shadow }]}>
                                    <View style={[styles.miniTape, { backgroundColor: th.tokens.tape }]} />
                                    <View style={[styles.miniImg, { backgroundColor: th.tokens.surfaceAlt }]} />
                                    <Text style={[styles.miniCaption, { color: th.tokens.textHandwritten, fontStyle: 'italic' }]}>Rom, juli</Text>
                                </View>
                                <View style={styles.miniEntryCol}>
                                    <Text style={[styles.miniEntryTitle, { color: th.tokens.textPrimary }]}>Dag 3</Text>
                                    <Text style={[styles.miniEntryMeta, { color: th.tokens.textSecondary }]}>14 juli</Text>
                                    <View style={[styles.miniTag, { backgroundColor: th.tokens.accentSoft }]}>
                                        <Text style={[styles.miniTagText, { color: th.tokens.accentDark }]}>Italia</Text>
                                    </View>
                                    <View style={[styles.miniAccentBtn, { backgroundColor: th.tokens.accent }]}>
                                        <Text style={styles.miniAccentBtnText}>+</Text>
                                    </View>
                                </View>
                            </View>
                            <Text style={[styles.themeCardName, { color: th.tokens.textPrimary }]}>{th.label}</Text>
                            <Text style={[styles.themeCardKey, { color: th.tokens.textMuted }]}>{name}</Text>
                            <View style={[styles.themeCardStripe, { backgroundColor: th.tokens.accentDark }]} />
                        </TouchableOpacity>
                    )
                })}
            </ScrollView>

            <View style={styles.actionRow}>
                <TouchableOpacity onPress={onAdd} style={[styles.actionBtn, { backgroundColor: t.accentSoft }]}>
                    <Text style={[styles.actionBtnText, { color: t.accentDark }]}>+ Kopia</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onDelete} style={[styles.actionBtn, { backgroundColor: '#FFE0E0' }]}>
                    <Text style={[styles.actionBtnText, { color: '#B02020' }]}>Ta bort</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onSave} style={[styles.actionBtn, { backgroundColor: t.accent }]}>
                    <Text style={[styles.actionBtnText, { color: '#fff' }]}>Spara theme.ts</Text>
                </TouchableOpacity>
            </View>

            <View style={[styles.section, { backgroundColor: t.surface, borderColor: t.border }]}>
                <Text style={[styles.sectionTitle, { color: t.textSecondary }]}>Temaetikett</Text>
                <TextInput
                    style={[styles.labelInput, { color: t.textPrimary, borderColor: t.border, backgroundColor: t.background }]}
                    value={theme.label}
                    onChangeText={label => updateThemeLabel(themeName, label)}
                    placeholderTextColor={t.textMuted}
                />
                <View style={styles.darkToggleRow}>
                    <Text style={[styles.tokenLabel, { color: t.textPrimary }]}>Mörkt tema</Text>
                    <TouchableOpacity
                        onPress={() => updateThemeToken(themeName, 'isDark', !t.isDark)}
                        activeOpacity={0.8}
                        style={[styles.toggle, { backgroundColor: t.isDark ? t.accent : t.border }]}
                    >
                        <View style={[styles.toggleKnob, t.isDark ? styles.toggleKnobOn : styles.toggleKnobOff]} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.section, { backgroundColor: t.surface, borderColor: t.border }]}>
                <Text style={[styles.sectionTitle, { color: t.textSecondary }]}>Tokens</Text>
                {(Object.entries(t) as [keyof ThemeTokens, string | boolean][])
                    .filter(([key]) => key !== 'isDark')
                    .map(([key, value]) => {
                        const isExpanded = expandedToken === key
                        return (
                            <View key={key}>
                                <TouchableOpacity
                                    onPress={() => setExpandedToken(isExpanded ? null : key)}
                                    activeOpacity={0.7}
                                    style={styles.tokenRow}
                                >
                                    <View style={[styles.colorSwatch, { backgroundColor: value as string }]} />
                                    <View style={styles.tokenInfo}>
                                        <Text style={[styles.tokenLabel, { color: t.textSecondary }]}>
                                            {TOKEN_LABELS[key]}
                                        </Text>
                                        <Text style={[styles.tokenHex, { color: t.textMuted }]}>
                                            {(value as string).toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={[styles.chevron, { color: t.textMuted }]}>
                                        {isExpanded ? '▲' : '▼'}
                                    </Text>
                                </TouchableOpacity>
                                {isExpanded && (
                                    <ColorSliders
                                        hex={value as string}
                                        onChange={v => updateThemeToken(themeName, key, v)}
                                        mutedColor={t.textMuted}
                                        borderColor={t.borderLight}
                                    />
                                )}
                            </View>
                        )
                    })}
            </View>
        </View>
    )
}

export default function DevThemeEditor() {
    if (!__DEV__) return null
    return (
        <ScrollView keyboardShouldPersistTaps="handled">
            <DevThemeEditorContent />
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    title: { fontSize: 24, fontWeight: '600', marginBottom: 2 },
    subtitle: { fontSize: 13 },

    themeRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, paddingVertical: 12, gap: 10 },
    themeCard: { width: '48%', borderRadius: 10, overflow: 'hidden' },
    themeCardName: { fontSize: 12, fontWeight: '500', paddingHorizontal: 8, paddingTop: 6 },
    themeCardKey: { fontSize: 10, paddingHorizontal: 8, paddingBottom: 8 },
    themeCardStripe: { height: 3, width: '100%' },

    miniTag: {
        alignSelf: 'flex-start',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 6,
        marginBottom: 3,
    },
    miniTagText: { fontSize: 7, fontWeight: '600' },

    miniPreviewArea: {
        flexDirection: 'row',
        padding: 8,
        gap: 6,
        alignItems: 'flex-start',
        minHeight: 72,
    },
    miniPolaroid: {
        width: 44,
        padding: 3,
        paddingBottom: 12,
        borderWidth: 0.5,
        borderRadius: 2,
        position: 'relative',
        shadowOffset: { width: 1, height: 2 },
        shadowOpacity: 0.6,
        shadowRadius: 0,
        elevation: 2,
    },
    miniTape: {
        position: 'absolute',
        top: -4,
        alignSelf: 'center',
        width: 18,
        height: 7,
        borderRadius: 1,
        opacity: 0.8,
    },
    miniImg: { width: '100%', height: 28, borderRadius: 1 },
    miniCaption: { fontSize: 6, textAlign: 'center', marginTop: 2, fontStyle: 'italic' },
    miniEntryCol: { flex: 1, justifyContent: 'flex-start', paddingTop: 2 },
    miniEntryTitle: { fontSize: 8, fontWeight: '600', marginBottom: 2 },
    miniEntryMeta: { fontSize: 7, marginBottom: 5 },
    miniAccentBtn: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
    miniAccentBtnText: { color: '#fff', fontSize: 9, fontWeight: '600' },

    actionRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 8,
        marginBottom: 12,
        flexWrap: 'wrap',
    },
    actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
    actionBtnText: { fontSize: 13, fontWeight: '500' },

    section: {
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 12,
        borderWidth: 1,
        padding: 14,
    },
    sectionTitle: { fontSize: 11, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

    labelInput: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 15,
        marginBottom: 12,
    },
    darkToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    toggle: { width: 44, height: 26, borderRadius: 13, justifyContent: 'center' },
    toggleKnob: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#fff',
    },
    toggleKnobOn: { right: 3 },
    toggleKnobOff: { left: 3 },

    tokenRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
    colorSwatch: { width: 36, height: 36, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
    tokenInfo: { flex: 1 },
    tokenLabel: { fontSize: 11, marginBottom: 2 },
    tokenHex: { fontSize: 11, fontFamily: 'monospace' },
    chevron: { fontSize: 10, paddingHorizontal: 4 },
})

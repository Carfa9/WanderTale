import React from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native'
import { useTheme } from '@/context/ThemeContext'
import type { Theme, ThemeTokens } from '@/constants/theme'

const VIBES: Record<string, string> = {
    diary:  'Klassisk & varm',
    summer: 'Ljus & lekfull',
    nordic: 'Kylig & ren',
    sunset: 'Romantisk & rosa',
    night:  'Mörk & gyllene',
    spring: 'Ljus & färger',
}

const SWATCH_TOKENS: (keyof ThemeTokens)[] = ['background', 'surface', 'accent', 'accentSoft', 'textPrimary']

function swatchesFor(theme: Theme): string[] {
    return SWATCH_TOKENS.map(k => theme.tokens[k] as string)
}

export function ThemePicker() {
    const { theme, themeName, setTheme, themes } = useTheme()
    const t = theme.tokens
    const themeOrder = Object.keys(themes)

    return (
        <View style={[styles.container, { backgroundColor: t.background }]}>
            <Text style={[styles.heading, { color: t.textPrimary }]}>Välj tema</Text>
            <Text style={[styles.subheading, { color: t.textSecondary }]}>
                Temat sparas automatiskt
            </Text>

            <ScrollView
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.grid}
            >
                {themeOrder.map((key) => {
                    const th = themes[key]
                    if (!th) return null
                    const isActive = key === themeName
                    const swatchColors = swatchesFor(th)

                    return (
                        <TouchableOpacity
                            key={key}
                            onPress={() => setTheme(key)}
                            style={[
                                styles.card,
                                {
                                    backgroundColor: t.surface,
                                    borderColor: isActive ? t.accent : t.border,
                                    borderWidth: isActive ? 2 : 0.5,
                                },
                            ]}
                            accessibilityLabel={`Välj tema ${th.label}`}
                            accessibilityState={{ selected: isActive }}
                        >
                            {/* Färgpaletten */}
                            <View style={styles.swatchRow}>
                                {swatchColors.map((color, i) => (
                                    <View key={i} style={[styles.swatch, { backgroundColor: color }]} />
                                ))}
                            </View>

                            {/* Kortinfo */}
                            <View style={styles.cardInfo}>
                                <Text style={[styles.cardName, { color: t.textPrimary }]}>
                                    {th.label}
                                </Text>
                                <Text style={[styles.cardVibe, { color: t.textSecondary }]}>
                                    {VIBES[key]}
                                </Text>
                                {isActive && (
                                    <View style={[styles.activeBadge, { backgroundColor: t.accentSoft }]}>
                                        <Text style={[styles.activeBadgeText, { color: t.accentDark }]}>
                                            Aktivt
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    )
                })}
            </ScrollView>

        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    heading: {
        fontSize: 22,
        fontWeight: '500',
        marginBottom: 4,
    },
    subheading: {
        fontSize: 14,
        marginBottom: 20,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingBottom: 4,
    },
    card: {
        width: '48%',
        borderRadius: 12,
        overflow: 'hidden',
    },
    swatchRow: {
        flexDirection: 'row',
        height: 52,
    },
    swatch: {
        flex: 1,
    },
    cardInfo: {
        padding: 10,
    },
    cardName: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 2,
    },
    cardVibe: {
        fontSize: 11,
    },
    activeBadge: {
        marginTop: 6,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 20,
    },
    activeBadgeText: {
        fontSize: 10,
        fontWeight: '500',
    },
})

import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { ThemeTokens } from '@/constants/theme'

export function ThemePreview({ tokens }: { tokens: ThemeTokens }) {
    const t = tokens

    return (
        <View style={[styles.preview, { backgroundColor: t.surfaceAlt }]}>
            <Text style={[styles.previewLabel, { color: t.textSecondary }]}>
                Förhandsvisning
            </Text>

            <View
                style={[
                    styles.polaroid,
                    {
                        backgroundColor: t.surface,
                        borderColor: t.border,
                        shadowColor: t.shadow,
                    },
                ]}
            >
                <View style={[styles.tape, { backgroundColor: t.tape }]} />

                <View style={[styles.polaroidImg, { backgroundColor: t.surfaceAlt }]}>
                    <Text style={styles.polaroidEmoji}>🗺️</Text>
                </View>

                <Text style={[styles.polaroidCaption, { color: t.textHandwritten }]}>
                    Rom, juli
                </Text>
            </View>

            <View style={[styles.textBlock, { backgroundColor: t.background, borderColor: t.borderLight }]}>
                <Text style={[styles.previewTitle, { color: t.textPrimary }]}>
                    Dag 3 i Toscana
                </Text>
                <Text style={[styles.previewMeta, { color: t.textSecondary }]}>
                    14 juli · Sol & 28°
                </Text>
                <Text style={[styles.previewBody, { color: t.textPrimary }]}>
                    Vaknade tidigt och gick ner till marknaden. Doften av färskt bröd...
                </Text>

                <View style={styles.tagRow}>
                    {['Italia', 'Mat'].map((tag) => (
                        <View key={tag} style={[styles.tag, { backgroundColor: t.accentSoft }]}>
                            <Text style={[styles.tagText, { color: t.accentDark }]}>{tag}</Text>
                        </View>
                    ))}
                </View>

                <TouchableOpacity style={[styles.button, { backgroundColor: t.accent }]}>
                    <Text style={styles.buttonText}>Ny anteckning</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    preview: {
        marginTop: 24,
        borderRadius: 12,
        padding: 16,
    },
    previewLabel: {
        fontSize: 12,
        marginBottom: 14,
    },
    polaroid: {
        width: 140,
        padding: 8,
        paddingBottom: 24,
        borderRadius: 4,
        borderWidth: 1,
        marginBottom: 16,
        position: 'relative',
        shadowOffset: { width: 3, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 3,
    },
    tape: {
        position: 'absolute',
        top: -8,
        alignSelf: 'center',
        width: 36,
        height: 16,
        borderRadius: 2,
        opacity: 0.8,
    },
    polaroidImg: {
        width: '100%',
        height: 80,
        borderRadius: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    polaroidEmoji: {
        fontSize: 28,
    },
    polaroidCaption: {
        fontSize: 11,
        textAlign: 'center',
        marginTop: 6,
        fontStyle: 'italic',
    },
    textBlock: {
        borderRadius: 10,
        padding: 14,
        borderWidth: 0.5,
    },
    previewTitle: {
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 2,
    },
    previewMeta: {
        fontSize: 12,
        marginBottom: 8,
    },
    previewBody: {
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 10,
    },
    tagRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 12,
    },
    tag: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
    },
    tagText: {
        fontSize: 11,
        fontWeight: '500',
    },
    button: {
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignSelf: 'flex-start',
    },
    buttonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
})

import {View, StyleSheet} from "react-native";
import {AppText} from "@/components/app-text";

type Props = {
    label: string;
    value?: string | null;
    placeholder?: string;
    children?: React.ReactNode;
};


export default function FieldCard({
 label,
 value,
 placeholder = "Under planering",
 children,
  }: Props) {
    const text = value?.trim() ? value : placeholder;

    return (
        <View style={styles.fieldCard}>
            <AppText style={styles.fieldLabel}>{label}</AppText>

            <View style={styles.right}>
                {children ? (
                    children
                ) : (
                    <AppText style={styles.fieldValue}>{text}</AppText>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    fieldCard: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        maxWidth: 250,
        alignSelf: "center",
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: "rgba(213, 247, 244, 0.85)",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.08)",
        marginBottom: 12,

        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: {width: 0, height: 3},
        elevation: 2,
    },

    fieldLabel: {
        fontSize: 20,
        textAlign: "left",
    },

    fieldValue: {
        textAlign: "right",
    },

    right: {
        flex: 1,
        alignItems: "flex-end",
    },
})
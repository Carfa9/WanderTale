import {useState} from "react";
import {Modal, Platform, Pressable, StyleSheet, View} from "react-native";
import {InlineLabelInput} from "@/components/inline-label-input";
import DateTimePicker from "@react-native-community/datetimepicker";
import {useTheme} from "@/context/ThemeContext";

type DateInputProps = {
    label: string;
    value: Date | null;
    onChange: (date: Date) => void;
    minimumDate?: Date;
};

export default function DateInput({label, value, onChange, minimumDate}: DateInputProps) {
    const [open, setOpen] = useState(false);
    const {theme} = useTheme();
    const tokens = theme.tokens;
    const styles = createStyles(tokens);

    const getDefaultDate = () => {
        const today = new Date();
        return minimumDate && minimumDate > today ? minimumDate : today;
    };

    const [temp, setTemp] = useState<Date>(value ?? getDefaultDate());

    const openPicker = () => {
        setTemp(value ?? getDefaultDate());
        setOpen(true);
    };

    const closePicker = () => {
        setOpen(false);
    };

    const picker = (
        <DateTimePicker
            value={temp}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={minimumDate}
            textColor={tokens.textPrimary}
            accentColor={tokens.accent}
            themeVariant={tokens.isDark ? "dark" : "light"}
            positiveButton={{textColor: tokens.accent}}
            negativeButton={{textColor: tokens.textSecondary}}
            onChange={(event, selectedDate) => {
                if (Platform.OS === "android") {
                    setOpen(false);
                    if (selectedDate) onChange(selectedDate);
                    return;
                }

                if (selectedDate) {
                    setTemp(selectedDate);
                    onChange(selectedDate);
                }
            }}
        />
    );

    return (
        <View>
            <Pressable onPress={openPicker}>
                <InlineLabelInput label={label} value={value ? value.toLocaleDateString("sv-SE") : ""}
                                  placeholder="Välj datum"
                                  onChangeText={() => {
                                  }}
                                  inputProps={{
                                      editable: false,
                                      pointerEvents: "none",
                                  }}
                />
            </Pressable>

            {open && Platform.OS === "android" && picker}

            {Platform.OS === "ios" && (
                <Modal visible={open} transparent animationType="fade" onRequestClose={closePicker}>
                    <Pressable style={styles.backdrop} onPress={closePicker}>
                        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
                            {picker}
                        </Pressable>
                    </Pressable>
                </Modal>
            )}
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.35)",
    },
    sheet: {
        margin: 16,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.borderLight,
        shadowColor: theme.shadow,
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: {width: 0, height: 8},
        elevation: 8,
    },
});

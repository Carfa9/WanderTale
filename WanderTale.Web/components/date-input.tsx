import {useState} from "react";
import {Platform, Pressable, View} from "react-native";
import {InlineLabelInput} from "@/components/inline-label-input";
import DateTimePicker from "@react-native-community/datetimepicker";
import {AppText} from "./app-text";

type DateInputProps = {
    label: string;
    value: Date | null;
    onChange: (date: Date) => void;
    minimumDate?: Date;
};

export default function DateInput({label, value, onChange, minimumDate}: DateInputProps) {
    const [open, setOpen] = useState(false);
    const [temp, setTemp] = useState<Date>(value ?? new Date());

    const openPicker = () => {
        setTemp(value ?? new Date());
        setOpen(true);
    };

    const closeAndCommit = () => {
        setOpen(false);
        onChange(temp);
    };

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

            {open && (
                <View>
                    <DateTimePicker
                        value={temp}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        minimumDate={minimumDate}
                        onChange={(event, selectedDate) => {
                            if (Platform.OS === "android") {
                                setOpen(false);
                                if (selectedDate) onChange(selectedDate);
                                return;
                            }
                            if (selectedDate) setTemp(selectedDate);
                        }}
                    />

                    {Platform.OS === "ios" && (
                        <Pressable onPress={closeAndCommit} style={{alignSelf: "flex-end", padding: 8}}>
                            <AppText>Klar</AppText>
                        </Pressable>
                    )}
                </View>
            )}
        </View>
    );
}
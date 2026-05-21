import {fireEvent, render, screen} from "@testing-library/react-native";
import {InlineLabelInput} from "@/components/inline-label-input";

jest.mock("@/context/ThemeContext", () => ({
    useTheme: () => ({
        theme: {
            tokens: {
                surface: "#ffffff",
                shadow: "rgba(0,0,0,0.2)",
                textMuted: "#777777",
                textPrimary: "#111111",
            },
        },
    }),
}));

describe("InlineLabelInput", () => {
    it("renders label and calls onChangeText when text changes", () => {
        const onChangeText = jest.fn();

        render(
            <InlineLabelInput
                label="Destination:"
                value=""
                onChangeText={onChangeText}
                placeholder="Where to?"
            />
        );

        fireEvent.changeText(screen.getByPlaceholderText("Where to?"), "Tokyo");

        expect(screen.getByText("Destination:")).toBeTruthy();
        expect(onChangeText).toHaveBeenCalledWith("Tokyo");
    });
});

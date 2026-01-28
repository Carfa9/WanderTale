import { Text, TextProps } from "react-native";

type AppTextProps = TextProps & {
    size?: number;
};

export function AppText({ size = 19, style, ...props }: AppTextProps) {
    return (
        <Text
            {...props}
            style={[
                {
                    fontFamily: "IndieFlower",
                    fontSize: size,
                    lineHeight: size * 1.55,
                },
                style,
            ]}
        />
    );
}
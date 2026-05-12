import { Text, TextProps } from "react-native";
import {useTheme} from "@/context/ThemeContext";

type AppTextProps = TextProps & {
    size?: number;
};

export function AppText({ size = 19, style, ...props }: AppTextProps) {
    const {theme} = useTheme();
    const tokens = theme.tokens;
    
    return (
        <Text
            {...props}
            style={[
                {
                    color: tokens.textPrimary,
                    fontFamily: "IndieFlower",
                    fontSize: size,
                    lineHeight: size * 1.55,
                },
                style,
            ]}
        />
    );
}
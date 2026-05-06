import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

export async function convertToJpg(uri: string) {
    const context = ImageManipulator.manipulate(uri);
    const renderedImage = await context.renderAsync();

    const result = await renderedImage.saveAsync({
        compress: 0.8,
        format: SaveFormat.JPEG,
    });

    console.log("Converted image:", result.uri);
    return result.uri;
}
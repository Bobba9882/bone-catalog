// Prepares a captured or uploaded photo for both the model and storage:
//  - validates the file really is an image (basic sanitisation of user input);
//  - applies the EXIF orientation so rotated phone photos come out upright;
//  - downscales the longest edge so the image is light to store and quick to
//    embed (CLIP works from a small square internally, so 512px is plenty);
//  - re-encodes as JPEG, which also strips metadata such as GPS location.

const MAXIMUM_EDGE_PIXELS = 512;
const JPEG_QUALITY = 0.82;

export async function prepareImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Kies een geldig afbeeldingsbestand.");
  }

  // "from-image" bakes the EXIF orientation into the pixels so we never store a
  // sideways photo (phones commonly record rotation as metadata instead).
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  const downscaleFactor = Math.min(1, MAXIMUM_EDGE_PIXELS / Math.max(bitmap.width, bitmap.height));
  const targetWidth = Math.round(bitmap.width * downscaleFactor);
  const targetHeight = Math.round(bitmap.height * downscaleFactor);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Canvas is niet beschikbaar in deze browser.");
  }
  context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

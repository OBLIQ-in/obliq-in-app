export const acceptedMimeTypes = ["application/pdf", "image/jpeg", "image/png"];
export const acceptedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];

export function isAcceptedFileType(name: string, type: string): boolean {
  const ext = `.${name.split(".").pop()?.toLowerCase()}`;
  return acceptedMimeTypes.includes(type) || acceptedExtensions.includes(ext);
}

import React, { useRef, useState } from 'react';
import { Button } from '../shared/Button';

interface ListingImageUploaderProps {
  onUpload: (file: File, onProgress: (percent: number) => void) => Promise<void>;
  disabled?: boolean;
}

export const ListingImageUploader: React.FC<ListingImageUploaderProps> = ({
  onUpload,
  disabled = false,
}) => {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file || disabled || uploading) return;

    setError(null);
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setProgress(0);

    try {
      await onUpload(file, setProgress);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setSelectedFile(null);
    setProgress(0);
    setError(null);
    if (cameraRef.current) cameraRef.current.value = '';
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-lg font-semibold text-surface-900">Crop photo</h2>
      <p className="text-sm text-surface-600">
        Take a photo of the produce or choose one from your device.
      </p>

      {!preview && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            size="lg"
            className="flex-1 min-h-[48px]"
            disabled={disabled || uploading}
            onClick={() => cameraRef.current?.click()}
          >
            Take photo
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="flex-1 min-h-[48px]"
            disabled={disabled || uploading}
            onClick={() => fileRef.current?.click()}
          >
            Choose file
          </Button>
        </div>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {preview && (
        <div className="space-y-4">
          <img
            src={preview}
            alt="Crop preview"
            className="w-full max-h-64 object-cover rounded-lg border border-surface-200"
          />
          {selectedFile && (
            <p className="text-xs text-surface-500">{selectedFile.name}</p>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="h-3 bg-surface-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-surface-600 text-center">Uploading… {progress}%</p>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {!uploading && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                variant="secondary"
                className="flex-1"
                onClick={() => cameraRef.current?.click()}
              >
                Replace image
              </Button>
              <Button size="lg" variant="ghost" className="flex-1" onClick={handleRemove}>
                Remove image
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ListingImageUploader;

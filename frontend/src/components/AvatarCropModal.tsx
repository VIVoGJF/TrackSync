import { useState, useCallback } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { getCroppedImageBlob } from '../lib/cropImage';
import './AvatarCropModal.css';

interface AvatarCropModalProps {
    imageSrc: string;
    onCancel: () => void;
    onConfirm: (blob: Blob) => void;
    isSaving?: boolean;
}

export function AvatarCropModal({ imageSrc, onCancel, onConfirm, isSaving = false }: AvatarCropModalProps) {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const zoomPercent = ((zoom - 1) / (3 - 1)) * 100;

    const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    async function handleConfirm() {
        if (!croppedAreaPixels) return;
        const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
        onConfirm(blob);
    }

    return (
        <div className="avatar-crop-backdrop" role="dialog" aria-modal="true">
            <div className="avatar-crop-modal">
                <h2 className="avatar-crop-title">Adjust photo</h2>

                <div className="avatar-crop-stage">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                    />
                </div>

                <input
                    type="range"
                    className="avatar-crop-zoom"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    style={{
                        background: `linear-gradient(to right, var(--bg-card) ${zoomPercent}%, var(--text-secondary) ${zoomPercent}%)`,
                    }}
                    aria-label="Zoom"
                />

                <div className="avatar-crop-actions">
                    <button type="button" className="avatar-crop-cancel" onClick={onCancel} disabled={isSaving}>
                        Cancel
                    </button>
                    <button type="button" className="avatar-crop-save" onClick={handleConfirm} disabled={isSaving || !croppedAreaPixels}>
                        {isSaving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}